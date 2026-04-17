/**
 * Accountability Scheduler
 *
 * Loads today's tasks and calendar events for the signed-in user and schedules
 * pre-task and post-task local notifications based on their notification
 * preferences. Quiet hours are respected: any reminder that would fire inside
 * the configured quiet window is silently skipped.
 *
 * The scheduler is idempotent — calling start() multiple times safely cancels
 * any previously scheduled timers and re-plans from the latest data.
 */

import { queryClient } from "@/lib/queryClient";
import {
  showPreTaskNotification,
  showPostTaskNotification,
  isNotificationSupported,
  getNotificationPermission,
} from "@/lib/notifications";
import { ensurePushSubscription, isWebPushSupported } from "@/lib/push-subscription";
import {
  isCapacitor,
  rescheduleNativeReminders,
  cancelNativeRemindersForItem,
  cancelSingleNativeReminder,
} from "@/lib/capacitor-notifications";
import { apiRequest } from "@/lib/queryClient";
import type {
  Task,
  CalendarEvent,
  NotificationPreferences,
} from "@shared/schema";

type TimerHandle = ReturnType<typeof setTimeout>;

interface ScheduleableItem {
  id: string;
  kind: "task" | "event";
  name: string;
  start: Date;
  end: Date | null;
}

const activeTimers = new Set<TimerHandle>();
let refreshInterval: TimerHandle | null = null;
let lastRunAt = 0;
let mutationReplanTimer: TimerHandle | null = null;
let suppressCacheReplan = false;
let unsubscribeQueryCache: (() => void) | null = null;
/**
 * Snapshot of the items planned in the most recent run, keyed by item id
 * (`task:<id>` / `event:<id>`). Used to diff against the current cache so we
 * can immediately cancel native notifications for items that disappear, get
 * completed, or have their start time edited — without waiting for the
 * debounced replan to finish.
 */
const lastPlannedItems = new Map<string, { startMs: number }>();

/**
 * Snapshot of every individual reminder (pre and post) currently planned for
 * today, keyed by `${kind}:${itemId}`. Powers the upcoming-reminders panel.
 */
export interface PlannedReminder {
  key: string;
  itemId: string;
  itemKind: "task" | "event";
  kind: "pre" | "post";
  name: string;
  fireAt: number;
  startMs: number;
}
const plannedReminders = new Map<string, PlannedReminder>();
/**
 * Snapshot of reminders the user has skipped but whose fire-time is still in
 * the future. Powers the "Skipped" sub-list with a Restore action so a
 * miss-tap can be undone before the reminder would have fired.
 */
const skippedReminders = new Map<string, PlannedReminder>();
const snapshotSubscribers = new Set<() => void>();
function notifySnapshot() {
  for (const cb of Array.from(snapshotSubscribers)) {
    try { cb(); } catch (err) { console.error("[accountability-scheduler] subscriber error:", err); }
  }
}

export function getPlannedReminders(): PlannedReminder[] {
  return Array.from(plannedReminders.values()).sort((a, b) => a.fireAt - b.fireAt);
}

export function getSkippedReminders(): PlannedReminder[] {
  return Array.from(skippedReminders.values()).sort((a, b) => a.fireAt - b.fireAt);
}

export function subscribeToPlannedReminders(cb: () => void): () => void {
  snapshotSubscribers.add(cb);
  return () => { snapshotSubscribers.delete(cb); };
}

// ─── Skipped reminders (persisted) ──────────────────────────────────────────
// Maps `${kind}:${itemId}` → the item's startMs at the time of the skip. If
// the item is later rescheduled (different startMs) or removed, the entry is
// dropped so a fresh slot will fire reminders again — matching the server's
// clearReminderCancellations behavior.
const SKIP_STORAGE_KEY = "dw_skipped_reminders";
type SkipMap = Record<string, number>;

function loadSkipped(): SkipMap {
  try {
    const raw = typeof localStorage !== "undefined" ? localStorage.getItem(SKIP_STORAGE_KEY) : null;
    return raw ? (JSON.parse(raw) as SkipMap) : {};
  } catch {
    return {};
  }
}
function saveSkipped(map: SkipMap): void {
  try {
    if (typeof localStorage !== "undefined") {
      localStorage.setItem(SKIP_STORAGE_KEY, JSON.stringify(map));
    }
  } catch { /* ignore */ }
}

const RUN_THROTTLE_MS = 60 * 1000;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;
/**
 * Small debounce so a single user action that invalidates several queries
 * (e.g. completing a task that touches both /api/tasks and /api/calendar)
 * only triggers one re-plan instead of one per cache event.
 */
const MUTATION_REPLAN_DEBOUNCE_MS = 250;

/**
 * Query keys whose cache updates should immediately re-plan reminders so
 * cancelled/edited/completed items stop firing stale notifications without
 * waiting for the next 15-minute refresh.
 */
const REPLAN_TRIGGER_KEYS = new Set<string>([
  "/api/tasks",
  "/api/calendar",
  "/api/accountability/preferences",
]);

function clearAllTimers(): void {
  activeTimers.forEach((t) => clearTimeout(t));
  activeTimers.clear();
}

function safeSetTimeout(fn: () => void, delay: number): void {
  // setTimeout has a max signed-int32 delay
  const clamped = Math.min(Math.max(delay, 0), 2147483647);
  const handle = setTimeout(() => {
    activeTimers.delete(handle);
    try {
      fn();
    } catch (err) {
      console.error("[accountability-scheduler] timer error:", err);
    }
  }, clamped);
  activeTimers.add(handle);
}

function parseTimeOfDay(value: string | null | undefined, fallback: string): { h: number; m: number } {
  const raw = (value || fallback).trim();
  const [h, m] = raw.split(":").map((n) => parseInt(n, 10));
  return { h: isFinite(h) ? h : 0, m: isFinite(m) ? m : 0 };
}

/**
 * Returns true if the given Date falls inside the user's quiet hours window.
 * Handles wraparound (e.g. 22:00 → 08:00).
 */
export function isInQuietHours(when: Date, prefs: NotificationPreferences): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = parseTimeOfDay(prefs.quietHoursStart, "22:00");
  const end = parseTimeOfDay(prefs.quietHoursEnd, "08:00");
  const minutes = when.getHours() * 60 + when.getMinutes();
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  if (startMin === endMin) return false;
  if (startMin < endMin) {
    return minutes >= startMin && minutes < endMin;
  }
  // Wraparound window (e.g. 22:00 → 08:00)
  return minutes >= startMin || minutes < endMin;
}

function parseDateMaybe(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function isToday(d: Date): boolean {
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function tasksToItems(tasks: Task[]): ScheduleableItem[] {
  const out: ScheduleableItem[] = [];
  for (const t of tasks) {
    if (t.isCompleted) continue;
    const start = parseDateMaybe(t.scheduledStart);
    if (!start || !isToday(start)) continue;
    const end = parseDateMaybe(t.scheduledEnd);
    out.push({ id: `task:${t.id}`, kind: "task", name: t.title, start, end });
  }
  return out;
}

function eventsToItems(events: CalendarEvent[]): ScheduleableItem[] {
  const out: ScheduleableItem[] = [];
  for (const ev of events) {
    const start = parseDateMaybe(ev.startTime);
    if (!start || !isToday(start)) continue;
    const end = parseDateMaybe(ev.endTime);
    out.push({ id: `event:${ev.id}`, kind: "event", name: ev.title, start, end });
  }
  return out;
}

async function fetchJson<T>(url: string): Promise<T | null> {
  // Always hit the network. The app's React Query default is `staleTime:
  // Infinity`, so reading from the cache here would cause the scheduler to
  // re-plan from stale data and miss task/event/preference edits between
  // refresh cycles. We do still publish the fresh payload back to the cache
  // so other consumers benefit.
  try {
    const res = await fetch(url, {
      credentials: "include",
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as T;
    // Republish to the cache without re-triggering our own cache subscription
    // (otherwise planReminders → setQueryData → subscriber → planReminders).
    suppressCacheReplan = true;
    try {
      queryClient.setQueryData([url], data);
    } finally {
      suppressCacheReplan = false;
    }
    return data;
  } catch (err) {
    console.error(`[accountability-scheduler] fetch ${url} failed:`, err);
    return null;
  }
}

async function loadPreferences(): Promise<NotificationPreferences | null> {
  return fetchJson<NotificationPreferences>("/api/accountability/preferences");
}

async function loadTodayItems(): Promise<ScheduleableItem[]> {
  const [tasks, events] = await Promise.all([
    fetchJson<Task[]>("/api/tasks"),
    fetchJson<CalendarEvent[]>("/api/calendar"),
  ]);
  const items: ScheduleableItem[] = [];
  if (Array.isArray(tasks)) items.push(...tasksToItems(tasks));
  if (Array.isArray(events)) items.push(...eventsToItems(events));
  return items;
}

/**
 * Plan all reminders for the next ~24 hours given the current preferences and
 * today's schedule. Existing timers are cleared first.
 *
 * Delivery channels (in priority order):
 *   1. **Native (Capacitor iOS/Android)** — schedules with @capacitor/local-
 *      notifications so the OS fires reminders even when the app is closed.
 *   2. **Web Push (server-driven)** — registers a push subscription with the
 *      server. The server's reminder scheduler (see server/push.ts) delivers
 *      the same payloads through the OS push service even when the tab/PWA
 *      is closed.
 *   3. **In-page setTimeout** — kept as a low-latency fallback while the tab
 *      is foregrounded. The service worker's notification `tag` deduplicates
 *      visually if both an in-page timer and a push arrive.
 */
export async function planReminders(): Promise<{
  scheduled: number;
  skipped: number;
}> {
  clearAllTimers();

  const prefs = await loadPreferences();
  if (!prefs || !prefs.accountabilityEnabled) {
    // No reminders should appear in the upcoming-reminders panel when
    // accountability is off (or prefs are unavailable). Clear any leftover
    // snapshot from a previous run before returning.
    if (plannedReminders.size > 0) {
      plannedReminders.clear();
      notifySnapshot();
    }
    return { scheduled: 0, skipped: 0 };
  }

  const items = await loadTodayItems();

  // Refresh the planned-items snapshot so the cache subscriber can diff
  // against the latest plan when subsequent mutations arrive.
  lastPlannedItems.clear();
  for (const it of items) {
    lastPlannedItems.set(it.id, { startMs: it.start.getTime() });
  }

  // Reconcile the persisted skip set against the latest items: drop any skip
  // whose underlying item has disappeared or been rescheduled (matches the
  // server's clearReminderCancellations behaviour). What remains will then
  // suppress matching reminders below.
  const skips = loadSkipped();
  const itemStartById = new Map<string, number>();
  for (const it of items) itemStartById.set(it.id, it.start.getTime());
  let skipsChanged = false;
  for (const key of Object.keys(skips)) {
    const colon = key.indexOf(":");
    const itemId = colon >= 0 ? key.slice(colon + 1) : "";
    const currentStart = itemStartById.get(itemId);
    if (currentStart === undefined || currentStart !== skips[key]) {
      delete skips[key];
      skipsChanged = true;
    }
  }
  if (skipsChanged) saveSkipped(skips);
  const isSkipped = (key: string, startMs: number) =>
    skips[key] !== undefined && skips[key] === startMs;

  // Build the planned-reminders snapshot regardless of delivery channel so
  // the upcoming-reminders UI can display them. We only include reminders
  // that haven't been individually skipped and aren't already in the past.
  // Skipped-but-still-upcoming reminders are tracked in a parallel snapshot
  // so the UI can offer a Restore action.
  const minutesBefore = prefs.preTaskMinutes ?? 15;
  plannedReminders.clear();
  skippedReminders.clear();
  const now = Date.now();
  const recordSkipped = (
    key: string,
    item: ScheduleableItem,
    kind: "pre" | "post",
    fireAt: number,
  ) => {
    // Only surface a Restore option while the reminder would still be in the
    // future and isn't suppressed by quiet hours — otherwise restoring it
    // wouldn't actually re-arm a ping.
    if (fireAt > now && !isInQuietHours(new Date(fireAt), prefs)) {
      skippedReminders.set(key, {
        key,
        itemId: item.id,
        itemKind: item.kind,
        kind,
        name: item.name,
        fireAt,
        startMs: item.start.getTime(),
      });
    }
  };
  for (const item of items) {
    const itemKind: "task" | "event" = item.kind;
    if (prefs.preTaskEnabled) {
      const key = `pre:${item.id}`;
      const fireAt = item.start.getTime() - minutesBefore * 60 * 1000;
      // Mirror the actual delivery filters here so the panel only lists
      // reminders that would genuinely fire: not in the past, not skipped,
      // and not silently suppressed by quiet hours.
      if (isSkipped(key, item.start.getTime())) {
        recordSkipped(key, item, "pre", fireAt);
      } else if (fireAt > now && !isInQuietHours(new Date(fireAt), prefs)) {
        plannedReminders.set(key, {
          key,
          itemId: item.id,
          itemKind,
          kind: "pre",
          name: item.name,
          fireAt,
          startMs: item.start.getTime(),
        });
      }
    }
    if (prefs.postTaskEnabled) {
      const key = `post:${item.id}`;
      const endRef = item.end ?? new Date(item.start.getTime() + 30 * 60 * 1000);
      const fireAt = endRef.getTime();
      if (isSkipped(key, item.start.getTime())) {
        recordSkipped(key, item, "post", fireAt);
      } else if (fireAt > now && !isInQuietHours(new Date(fireAt), prefs)) {
        plannedReminders.set(key, {
          key,
          itemId: item.id,
          itemKind,
          kind: "post",
          name: item.name,
          fireAt,
          startMs: item.start.getTime(),
        });
      }
    }
  }
  notifySnapshot();

  let scheduled = 0;
  let skipped = 0;

  // Native Capacitor path — schedule with the OS so reminders fire even when
  // the app is killed. The browser Notification API and its permission state
  // do not apply here; @capacitor/local-notifications uses its own native
  // permission flow handled inside rescheduleNativeReminders(). To honour
  // individual skips, we filter out skipped pre/post reminders item-by-item
  // before handing off.
  if (isCapacitor()) {
    try {
      const nativeItems = items.map((it) => {
        const preKey = `pre:${it.id}`;
        const postKey = `post:${it.id}`;
        // Treat a skipped pre as having no scheduled start in the past for
        // pre-task purposes; skipped post as having no end. The native
        // helper uses both so we preserve them with split clones.
        return {
          base: it,
          skipPre: isSkipped(preKey, it.start.getTime()),
          skipPost: isSkipped(postKey, it.start.getTime()),
        };
      });
      // Schedule pre-only and post-only batches independently using the
      // existing helper by toggling the prefs flags per pass. This avoids
      // changing the native helper's contract.
      const baseNativePrefs = {
        preTaskEnabled: !!prefs.preTaskEnabled,
        postTaskEnabled: !!prefs.postTaskEnabled,
        preTaskMinutes: prefs.preTaskMinutes ?? 15,
        quietHoursEnabled: !!prefs.quietHoursEnabled,
        quietHoursStart: prefs.quietHoursStart ?? "22:00",
        quietHoursEnd: prefs.quietHoursEnd ?? "08:00",
      };
      const native = await rescheduleNativeReminders(
        nativeItems
          .filter((n) => !(n.skipPre && n.skipPost))
          .map((n) => n.base),
        baseNativePrefs,
      );
      // Cancel any pre/post that the user individually skipped, since the
      // helper above re-scheduled both. Cheap and idempotent.
      for (const n of nativeItems) {
        if (n.skipPre) await cancelSingleNativeReminder(n.base.id, "pre");
        if (n.skipPost) await cancelSingleNativeReminder(n.base.id, "post");
      }
      return native;
    } catch (err) {
      console.error("[accountability-scheduler] native schedule failed:", err);
      // Fall through to in-page timers as a safety net.
    }
  }

  // Web path — in-page setTimeout fallback requires Notification permission.
  if (!isNotificationSupported() || getNotificationPermission() !== "granted") {
    return { scheduled: 0, skipped: 0 };
  }

  // Make sure the server can push to this browser when the tab closes.
  if (isWebPushSupported()) {
    void ensurePushSubscription();
  }

  for (const item of items) {
    // Pre-task reminder
    if (prefs.preTaskEnabled) {
      const fireAt = new Date(item.start.getTime() - minutesBefore * 60 * 1000);
      const delay = fireAt.getTime() - now;
      if (delay > 0 && !isSkipped(`pre:${item.id}`, item.start.getTime())) {
        if (isInQuietHours(fireAt, prefs)) {
          skipped++;
        } else {
          const { id, name, start } = item;
          safeSetTimeout(() => {
            void showPreTaskNotification(id, name, start);
          }, delay);
          scheduled++;
        }
      }
    }

    // Post-task reminder (uses end time when present, otherwise start + 30min)
    if (prefs.postTaskEnabled) {
      const endRef = item.end ?? new Date(item.start.getTime() + 30 * 60 * 1000);
      const delay = endRef.getTime() - now;
      if (delay > 0 && !isSkipped(`post:${item.id}`, item.start.getTime())) {
        if (isInQuietHours(endRef, prefs)) {
          skipped++;
        } else {
          const { id, name } = item;
          safeSetTimeout(() => {
            void showPostTaskNotification(id, name);
          }, delay);
          scheduled++;
        }
      }
    }
  }

  return { scheduled, skipped };
}

/**
 * Skip a single upcoming pre- or post-task reminder. Persists the skip in
 * localStorage (so re-plans don't re-add it), cancels any native OS
 * notification already queued for it, and asks the server to suppress the
 * matching push so the reminder also won't arrive when the tab is closed.
 *
 * The skip is automatically cleared by planReminders() the next time the
 * underlying item is rescheduled or removed.
 */
export interface SkipReminderResult {
  /** The local-state changes always succeed — the reminder is removed
   *  from the snapshot and persisted in the skip ledger. */
  localPersisted: true;
  /** True if the native (Capacitor) OS notification was cancelled, or
   *  not applicable on this platform. */
  nativeCancelled: boolean;
  /** True if the server accepted the cancellation (cancelled-ledger
   *  updated so the push scheduler will suppress the reminder too). */
  serverCancelled: boolean;
}

export async function skipReminder(
  reminder: PlannedReminder,
): Promise<SkipReminderResult> {
  const skips = loadSkipped();
  skips[reminder.key] = reminder.startMs;
  saveSkipped(skips);

  plannedReminders.delete(reminder.key);
  // Mirror the skip into the skipped snapshot immediately so the UI's
  // "Skipped" sub-list and any in-flight Undo affordance can refer to it
  // before the asynchronous replan finishes.
  skippedReminders.set(reminder.key, reminder);
  notifySnapshot();

  // Native: cancel just this one OS notification.
  let nativeCancelled = true;
  if (isCapacitor()) {
    try {
      await cancelSingleNativeReminder(reminder.itemId, reminder.kind);
    } catch (err) {
      nativeCancelled = false;
      console.error("[accountability-scheduler] cancelSingleNative failed:", err);
    }
  }

  // Server: add to cancelled ledger so the push scheduler skips it too.
  let serverCancelled = false;
  try {
    await apiRequest("POST", "/api/accountability/reminders/skip", {
      itemId: reminder.itemId,
      kind: reminder.kind,
    });
    serverCancelled = true;
  } catch (err) {
    console.error("[accountability-scheduler] server skip failed:", err);
  }

  // Web in-page timers were already armed by the previous planReminders()
  // run and are not individually cancellable from here. Re-plan now so the
  // freshly-persisted skip causes the matching setTimeout to be cleared and
  // not re-scheduled. Errors are non-fatal — server + native cancellations
  // above still take effect.
  try {
    await planReminders();
  } catch (err) {
    console.error("[accountability-scheduler] replan after skip failed:", err);
  }

  return { localPersisted: true, nativeCancelled, serverCancelled };
}

/**
 * Restore a previously-skipped reminder so it will fire again. Reverses the
 * three-channel state changes performed by skipReminder():
 *   - drops the localStorage skip entry
 *   - clears the server's cancelled-ledger entry for this single tag
 *   - re-plans, which re-arms the in-page timer and (on Capacitor) the OS
 *     notification.
 */
export interface RestoreReminderResult {
  localPersisted: true;
  serverCleared: boolean;
}

export async function restoreReminder(
  reminder: PlannedReminder,
): Promise<RestoreReminderResult> {
  const skips = loadSkipped();
  if (skips[reminder.key] !== undefined) {
    delete skips[reminder.key];
    saveSkipped(skips);
  }
  skippedReminders.delete(reminder.key);
  notifySnapshot();

  let serverCleared = false;
  try {
    await apiRequest("POST", "/api/accountability/reminders/restore", {
      itemId: reminder.itemId,
      kind: reminder.kind,
    });
    serverCleared = true;
  } catch (err) {
    console.error("[accountability-scheduler] server restore failed:", err);
  }

  // Re-plan to re-arm the in-page timer (and native OS notification on
  // Capacitor). The replan will also rebuild plannedReminders so the panel
  // shows the restored entry in its upcoming list.
  try {
    await planReminders();
  } catch (err) {
    console.error("[accountability-scheduler] replan after restore failed:", err);
  }

  return { localPersisted: true, serverCleared };
}

/**
 * Start the scheduler. Re-plans on a 15-minute cadence and whenever the tab
 * becomes visible again (covers laptops waking from sleep).
 */
export function startAccountabilityScheduler(): () => void {
  const run = async (force = false) => {
    if (!force && Date.now() - lastRunAt < RUN_THROTTLE_MS) return;
    lastRunAt = Date.now();
    try {
      await planReminders();
    } catch (err) {
      console.error("[accountability-scheduler] planReminders failed:", err);
    }
  };

  /**
   * Compare the latest tasks/calendar caches against the previously-planned
   * snapshot and immediately cancel native (Capacitor) reminders for any
   * items that have been completed, deleted, moved out of today, or whose
   * scheduled start has shifted. This closes the window between a user's
   * mutation and the debounced full-replan finishing.
   */
  const cancelRemovedNativeReminders = () => {
    if (!isCapacitor() || lastPlannedItems.size === 0) return;
    const tasks = queryClient.getQueryData<Task[]>(["/api/tasks"]) ?? [];
    const events = queryClient.getQueryData<CalendarEvent[]>(["/api/calendar"]) ?? [];
    const current = new Map<string, number>();
    for (const it of tasksToItems(tasks)) current.set(it.id, it.start.getTime());
    for (const it of eventsToItems(events)) current.set(it.id, it.start.getTime());

    for (const [id, prev] of Array.from(lastPlannedItems.entries())) {
      const next = current.get(id);
      if (next === undefined || next !== prev.startMs) {
        // Removed, completed, moved out of today, or rescheduled — cancel
        // the previously-scheduled OS notifications now.
        void cancelNativeRemindersForItem(id);
        lastPlannedItems.delete(id);
      }
    }
  };

  const scheduleMutationReplan = () => {
    cancelRemovedNativeReminders();
    if (mutationReplanTimer) clearTimeout(mutationReplanTimer);
    mutationReplanTimer = setTimeout(() => {
      mutationReplanTimer = null;
      void run(true);
    }, MUTATION_REPLAN_DEBOUNCE_MS);
  };

  void run();

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(run, REFRESH_INTERVAL_MS);

  const onVisibility = () => {
    if (document.visibilityState === "visible") void run();
  };
  document.addEventListener("visibilitychange", onVisibility);

  // React in real time to task / event / preference mutations. Any time one of
  // these queries is invalidated, updated, or removed, re-plan reminders so a
  // freshly completed/moved/deleted item stops firing stale notifications
  // before the next 15-minute refresh cycle.
  if (unsubscribeQueryCache) unsubscribeQueryCache();
  unsubscribeQueryCache = queryClient.getQueryCache().subscribe((event) => {
    if (!event || suppressCacheReplan) return;
    const firstKey = event.query?.queryKey?.[0];
    if (typeof firstKey !== "string" || !REPLAN_TRIGGER_KEYS.has(firstKey)) {
      return;
    }
    if (
      event.type === "updated" ||
      event.type === "added" ||
      event.type === "removed"
    ) {
      scheduleMutationReplan();
    }
  });

  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    if (mutationReplanTimer) {
      clearTimeout(mutationReplanTimer);
      mutationReplanTimer = null;
    }
    document.removeEventListener("visibilitychange", onVisibility);
    if (unsubscribeQueryCache) {
      unsubscribeQueryCache();
      unsubscribeQueryCache = null;
    }
    clearAllTimers();
  };
}

export function stopAccountabilityScheduler(): void {
  if (mutationReplanTimer) {
    clearTimeout(mutationReplanTimer);
    mutationReplanTimer = null;
  }
  if (unsubscribeQueryCache) {
    unsubscribeQueryCache();
    unsubscribeQueryCache = null;
  }
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  lastPlannedItems.clear();
  plannedReminders.clear();
  notifySnapshot();
  clearAllTimers();
}
