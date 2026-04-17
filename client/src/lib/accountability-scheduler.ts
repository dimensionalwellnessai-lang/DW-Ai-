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

const RUN_THROTTLE_MS = 60 * 1000;
const REFRESH_INTERVAL_MS = 15 * 60 * 1000;

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
    queryClient.setQueryData([url], data);
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
 */
export async function planReminders(): Promise<{
  scheduled: number;
  skipped: number;
}> {
  clearAllTimers();

  if (!isNotificationSupported() || getNotificationPermission() !== "granted") {
    return { scheduled: 0, skipped: 0 };
  }

  const prefs = await loadPreferences();
  if (!prefs || !prefs.accountabilityEnabled) {
    return { scheduled: 0, skipped: 0 };
  }

  const items = await loadTodayItems();
  const now = Date.now();
  const minutesBefore = prefs.preTaskMinutes ?? 15;
  let scheduled = 0;
  let skipped = 0;

  for (const item of items) {
    // Pre-task reminder
    if (prefs.preTaskEnabled) {
      const fireAt = new Date(item.start.getTime() - minutesBefore * 60 * 1000);
      const delay = fireAt.getTime() - now;
      if (delay > 0) {
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
      if (delay > 0) {
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
 * Start the scheduler. Re-plans on a 15-minute cadence and whenever the tab
 * becomes visible again (covers laptops waking from sleep).
 */
export function startAccountabilityScheduler(): () => void {
  const run = async () => {
    if (Date.now() - lastRunAt < RUN_THROTTLE_MS) return;
    lastRunAt = Date.now();
    try {
      await planReminders();
    } catch (err) {
      console.error("[accountability-scheduler] planReminders failed:", err);
    }
  };

  void run();

  if (refreshInterval) clearInterval(refreshInterval);
  refreshInterval = setInterval(run, REFRESH_INTERVAL_MS);

  const onVisibility = () => {
    if (document.visibilityState === "visible") void run();
  };
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
      refreshInterval = null;
    }
    document.removeEventListener("visibilitychange", onVisibility);
    clearAllTimers();
  };
}

export function stopAccountabilityScheduler(): void {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
  clearAllTimers();
}
