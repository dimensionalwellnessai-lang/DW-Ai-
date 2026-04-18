/**
 * Web Push delivery + server-side reminder scheduler.
 *
 * VAPID keys are generated once on first boot and stored in the `vapid_keys`
 * table so subscriptions remain valid across server restarts.
 *
 * The scheduler scans every minute for upcoming pre-task and post-task
 * reminders that should fire in the next ~minute and pushes notification
 * payloads to all of the user's registered subscriptions. The service worker
 * (`client/public/sw.js`) renders the OS-level notification — meaning the
 * reminder is delivered even when the tab/PWA is closed.
 */

import webpush from "web-push";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, and, isNotNull, gt, lt, asc, sql as dsql } from "drizzle-orm";
import {
  pushSubscriptions,
  vapidKeys as vapidKeysTable,
  notificationPreferences,
  tasks as tasksTable,
  calendarEvents as calendarEventsTable,
  reminderLedger,
  schedulerLeases,
  type NotificationPreferences,
  type Task,
  type CalendarEvent,
  type SchedulerLease,
} from "@shared/schema";

const VAPID_ROW_ID = "default";
const SCHEDULER_INTERVAL_MS = 60 * 1000;
// Max number of users processed in parallel within a single tick. Bounded so
// the scheduler doesn't slam the DB / web-push providers with hundreds of
// concurrent requests, but high enough that the tick duration stays well
// under SCHEDULER_INTERVAL_MS even with hundreds of subscribed users.
const USER_TICK_CONCURRENCY = 10;

// ─────────────────────────────────────────────────────────────────────────────
// Horizontal sharding — plug-and-play, no env config
//
// When multiple app instances run in parallel, every instance would otherwise
// run the full reminder tick over every subscribed user — wasting work and
// risking duplicate sends if any de-dup marker race slips through. We let
// each instance own a deterministic slice of the user space by claiming a
// row in the `scheduler_leases` table:
//
//   - On boot, every process generates a random `instanceId` and tries to
//     INSERT into the lowest free slot (0, 1, 2, …). The PK on `slot_index`
//     guarantees uniqueness; ON CONFLICT lets us probe upward without races.
//   - Every LEASE_HEARTBEAT_MS we update `last_heartbeat_at`. A row whose
//     heartbeat is older than LEASE_STALE_MS is considered dead and any
//     surviving instance is allowed to delete it.
//   - We also "compact down": on each heartbeat we try to claim every lower
//     slot index. If we succeed, we drop our old higher row and adopt the
//     lower index — this keeps slots densely packed [0..N-1] as servers come
//     and go, so `hash(userId) % N` always covers every active slot.
//
// The shard config (this instance's `index` and the cluster `count`) is
// derived from live leases and refreshed at the start of every tick. With a
// single instance the count is 1 and every user is owned, preserving the
// previous behaviour. With N instances the work is divided ~evenly.
//
// SHARD_INDEX / SHARD_COUNT env vars are no longer read; if set, we log a
// one-time deprecation warning so old deploys notice.
// ─────────────────────────────────────────────────────────────────────────────

const LEASE_HEARTBEAT_MS = 30 * 1000;
const LEASE_STALE_MS = 90 * 1000;
// Hard cap on slot probing — protects against degenerate retry loops if
// something goes catastrophically wrong with the leases table. 64 instances
// is well beyond any realistic horizontal-scale-out for this workload.
const MAX_SLOT_PROBE = 64;

const INSTANCE_ID = randomUUID();

interface ShardConfig {
  index: number;
  count: number;
}

// Cached shard config kept in sync by the lease manager. {0,1} is the safe
// fallback meaning "I am the sole owner of every user" — the same behaviour
// we had before sharding existed.
let currentShard: ShardConfig = { index: 0, count: 1 };
let leaseManagerHandle: ReturnType<typeof setInterval> | null = null;
let leaseClaimed = false;

function hashUserId(userId: string): number {
  // FNV-1a 32-bit. Deterministic, fast, dependency-free, and well-distributed
  // for short string inputs like UUIDs / nanoids.
  let h = 0x811c9dc5;
  for (let i = 0; i < userId.length; i++) {
    h ^= userId.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

export function isUserInShard(
  userId: string,
  shard: ShardConfig = currentShard,
): boolean {
  if (shard.count <= 1) return true;
  return hashUserId(userId) % shard.count === shard.index;
}

export function getCurrentShard(): ShardConfig {
  return { ...currentShard };
}

export function getInstanceId(): string {
  return INSTANCE_ID;
}

/**
 * Return the live lease roster. Used by the admin endpoint so an operator can
 * see which instance currently owns which slot, and how recently it
 * heartbeated.
 */
export async function getActiveSchedulerLeases(): Promise<SchedulerLease[]> {
  try {
    const rows = await db
      .select()
      .from(schedulerLeases)
      .orderBy(asc(schedulerLeases.slotIndex));
    return rows;
  } catch (err) {
    console.error("[push] Failed to read scheduler_leases:", err);
    return [];
  }
}

async function pruneStaleLeases(now: number): Promise<void> {
  const cutoff = new Date(now - LEASE_STALE_MS);
  try {
    await db
      .delete(schedulerLeases)
      .where(
        and(
          lt(schedulerLeases.lastHeartbeatAt, cutoff),
          // Never reap our own row even if our wall clock just jumped — we
          // know we're alive.
          dsql`${schedulerLeases.instanceId} <> ${INSTANCE_ID}`,
        ),
      );
  } catch (err) {
    console.error("[push] Failed to prune stale scheduler leases:", err);
  }
}

/**
 * Try to INSERT a fresh lease row at `slotIndex`. Use only when this
 * instance does NOT already have a row (initial claim path) — otherwise the
 * unique constraint on instance_id will reject the second row.
 *
 * Returns:
 *   - "ok"          → row inserted, slot now ours
 *   - "taken"       → slot already held by another live instance
 *   - "infra_error" → DB is unreachable / table missing; caller should
 *                     stop probing rather than spam 64 failed inserts.
 */
async function tryInsertSlot(
  slotIndex: number,
): Promise<"ok" | "taken" | "infra_error"> {
  try {
    const result = await db
      .insert(schedulerLeases)
      .values({
        slotIndex,
        instanceId: INSTANCE_ID,
        lastHeartbeatAt: new Date(),
      })
      .onConflictDoNothing({ target: schedulerLeases.slotIndex });
    const rowCount = (result as { rowCount?: number | null }).rowCount ?? 0;
    return rowCount > 0 ? "ok" : "taken";
  } catch (err) {
    console.error(
      `[push] Slot-claim infrastructure error at slot ${slotIndex}:`,
      err,
    );
    return "infra_error";
  }
}

/**
 * Atomically migrate this instance's existing lease row from its current
 * slot down to `targetSlot`. Race-safe: a single SQL statement does both
 * "is targetSlot free?" and "move our row" so two instances trying to
 * compact into the same slot can't both succeed (the loser hits the PK
 * uniqueness check, raises a duplicate_key error which we surface as a
 * "taken" result).
 *
 * Returns true if we now own targetSlot.
 */
async function tryCompactDown(targetSlot: number): Promise<boolean> {
  try {
    const result = await db.execute(dsql`
      UPDATE scheduler_leases
      SET slot_index = ${targetSlot}, last_heartbeat_at = now()
      WHERE instance_id = ${INSTANCE_ID}
        AND NOT EXISTS (
          SELECT 1 FROM scheduler_leases WHERE slot_index = ${targetSlot}
        )
    `);
    const rowCount = (result as { rowCount?: number | null }).rowCount ?? 0;
    return rowCount > 0;
  } catch (err: any) {
    // 23505 = unique_violation. Two instances raced for the same lower slot
    // and the other one committed first; that's expected — try again next
    // heartbeat. Anything else is a real problem worth logging.
    if (err?.code !== "23505") {
      console.error(
        `[push] Failed to compact lease into slot ${targetSlot}:`,
        err,
      );
    }
    return false;
  }
}

async function findOurSlot(): Promise<number | null> {
  try {
    const [row] = await db
      .select({ slotIndex: schedulerLeases.slotIndex })
      .from(schedulerLeases)
      .where(eq(schedulerLeases.instanceId, INSTANCE_ID))
      .limit(1);
    return row?.slotIndex ?? null;
  } catch (err) {
    console.error("[push] Failed to look up our slot:", err);
    return null;
  }
}

async function countActiveLeases(): Promise<number> {
  try {
    const [row] = await db
      .select({ count: dsql<number>`count(*)::int` })
      .from(schedulerLeases);
    return row?.count ?? 1;
  } catch (err) {
    console.error("[push] Failed to count scheduler leases:", err);
    return 1;
  }
}

/**
 * Claim a slot if we don't have one, then try to compact downward. Returns
 * the slot we ended up holding, or null if we could not acquire one (e.g.
 * DB unreachable or all probe slots taken).
 */
async function claimAndCompactSlot(): Promise<number | null> {
  let ourSlot = await findOurSlot();
  if (ourSlot === null) {
    for (let i = 0; i < MAX_SLOT_PROBE; i++) {
      const outcome = await tryInsertSlot(i);
      if (outcome === "ok") {
        ourSlot = i;
        if (!leaseClaimed) {
          console.log(
            `[push] Instance ${INSTANCE_ID.slice(0, 8)} claimed scheduler slot ${i}.`,
          );
          leaseClaimed = true;
        }
        break;
      }
      if (outcome === "infra_error") {
        // DB unreachable / table missing — bail out instead of spamming 64
        // failed inserts. Caller will fall back to single-owner mode.
        return null;
      }
      // outcome === "taken": slot busy, probe the next one.
    }
    if (ourSlot === null) {
      console.error(
        `[push] Could not claim any scheduler slot (probed 0..${MAX_SLOT_PROBE - 1}).`,
      );
      return null;
    }
  }

  // Compact downward: try every lower slot in order via a single atomic
  // UPDATE that both checks the slot is free and migrates our existing row.
  // Only one migration per heartbeat — further compaction happens on later
  // heartbeats — to keep behaviour predictable and bounded.
  for (let i = 0; i < ourSlot; i++) {
    if (await tryCompactDown(i)) {
      console.log(
        `[push] Instance ${INSTANCE_ID.slice(0, 8)} compacted slot ${ourSlot} -> ${i}.`,
      );
      ourSlot = i;
      break;
    }
  }

  return ourSlot;
}

async function heartbeatLease(): Promise<void> {
  const now = Date.now();
  await pruneStaleLeases(now);
  const ourSlot = await claimAndCompactSlot();
  if (ourSlot === null) {
    // Fall back to single-owner mode so reminders still go out for everyone
    // until the DB recovers.
    currentShard = { index: 0, count: 1 };
    return;
  }
  // Refresh heartbeat — INSERT on a fresh claim already set it to now, but
  // for an existing lease this is the keep-alive.
  try {
    await db
      .update(schedulerLeases)
      .set({ lastHeartbeatAt: new Date() })
      .where(eq(schedulerLeases.instanceId, INSTANCE_ID));
  } catch (err) {
    console.error("[push] Failed to heartbeat scheduler lease:", err);
  }
  const count = await countActiveLeases();
  currentShard = { index: ourSlot, count: Math.max(count, ourSlot + 1) };
}

function startLeaseManager(): void {
  if (leaseManagerHandle) return;
  leaseManagerHandle = setInterval(() => {
    void heartbeatLease();
  }, LEASE_HEARTBEAT_MS);
}

async function shutdownLease(): Promise<void> {
  if (leaseManagerHandle) {
    clearInterval(leaseManagerHandle);
    leaseManagerHandle = null;
  }
  try {
    await db
      .delete(schedulerLeases)
      .where(eq(schedulerLeases.instanceId, INSTANCE_ID));
  } catch (err) {
    console.error("[push] Failed to release scheduler lease on shutdown:", err);
  }
}

// Best-effort lease release on graceful shutdown so a redeploy frees its slot
// immediately instead of waiting for the stale-prune window.
for (const sig of ["SIGTERM", "SIGINT"] as const) {
  process.once(sig, () => {
    void shutdownLease();
  });
}

if (process.env.SHARD_INDEX || process.env.SHARD_COUNT) {
  console.warn(
    "[push] SHARD_INDEX / SHARD_COUNT env vars are deprecated and ignored. " +
      "Slots are now claimed automatically via the scheduler_leases table.",
  );
}

let initialized = false;
let cachedPublicKey: string | null = null;

interface ReminderPayload {
  title: string;
  body: string;
  notificationType: "pre_task" | "post_task";
  url?: string;
  taskData: {
    taskId: string | null;
    calendarEventId: string | null;
    taskName: string;
    scheduledTime?: string;
    scheduledEndTime?: string;
  };
  tag: string;
}

async function loadOrCreateVapidKeys(): Promise<{
  publicKey: string;
  privateKey: string;
  subject: string;
}> {
  const [existing] = await db
    .select()
    .from(vapidKeysTable)
    .where(eq(vapidKeysTable.id, VAPID_ROW_ID))
    .limit(1);
  if (existing) {
    return {
      publicKey: existing.publicKey,
      privateKey: existing.privateKey,
      subject: existing.subject,
    };
  }
  const generated = webpush.generateVAPIDKeys();
  const subject =
    process.env.VAPID_SUBJECT ||
    `mailto:${process.env.SUPPORT_EMAIL || "support@example.com"}`;
  await db.insert(vapidKeysTable).values({
    id: VAPID_ROW_ID,
    publicKey: generated.publicKey,
    privateKey: generated.privateKey,
    subject,
  });
  console.log("[push] Generated and stored new VAPID key pair.");
  return { ...generated, subject };
}

export async function initPush(): Promise<void> {
  if (initialized) return;
  try {
    // Source of truth for VAPID keys: prefer the env-provided pair when BOTH
    // public and private keys are set (legacy/manual provisioning); otherwise
    // load or generate a pair in the DB. Whatever we end up using here is the
    // exact same key returned to clients via /api/push/vapid-key.
    const envPublic = process.env.VAPID_PUBLIC_KEY;
    const envPrivate = process.env.VAPID_PRIVATE_KEY;
    const envSubject =
      process.env.VAPID_SUBJECT ||
      `mailto:${process.env.SUPPORT_EMAIL || "support@example.com"}`;

    let publicKey: string;
    let privateKey: string;
    let subject: string;
    if (envPublic && envPrivate) {
      publicKey = envPublic;
      privateKey = envPrivate;
      subject = envSubject;
      console.log("[push] Using VAPID keys from environment.");
    } else {
      const stored = await loadOrCreateVapidKeys();
      publicKey = stored.publicKey;
      privateKey = stored.privateKey;
      subject = stored.subject;
    }
    webpush.setVapidDetails(subject, publicKey, privateKey);
    cachedPublicKey = publicKey;
    initialized = true;
    console.log(
      `[push] Web push initialized (public key fingerprint: ${publicKey.slice(0, 12)}…).`,
    );
  } catch (err) {
    console.error("[push] Failed to initialize web push:", err);
  }
}

export async function getVapidPublicKey(): Promise<string | null> {
  if (!initialized) await initPush();
  return cachedPublicKey;
}

export async function getUserSubscriptions(userId: string) {
  return db
    .select()
    .from(pushSubscriptions)
    .where(eq(pushSubscriptions.userId, userId));
}

async function deleteSubscriptionByEndpoint(endpoint: string): Promise<void> {
  try {
    await db
      .delete(pushSubscriptions)
      .where(eq(pushSubscriptions.endpoint, endpoint));
  } catch (err) {
    console.error("[push] Failed to delete dead subscription:", err);
  }
}

export async function sendPushToUser(
  userId: string,
  payload: ReminderPayload,
): Promise<{ sent: number; removed: number }> {
  if (!initialized) await initPush();
  if (!initialized) return { sent: 0, removed: 0 };
  const subs = await getUserSubscriptions(userId);
  let sent = 0;
  let removed = 0;
  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload),
          { TTL: 60 * 60 },
        );
        sent++;
      } catch (err: any) {
        const status = err?.statusCode;
        // 404 / 410 → subscription no longer valid; remove it.
        if (status === 404 || status === 410) {
          await deleteSubscriptionByEndpoint(sub.endpoint);
          removed++;
        } else {
          console.error(
            `[push] sendNotification failed (${status}):`,
            err?.body || err?.message || err,
          );
        }
      }
    }),
  );
  return { sent, removed };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder scheduler
// ─────────────────────────────────────────────────────────────────────────────

function parseTimeOfDay(value: string | null | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  const [h, m] = raw.split(":").map((n) => parseInt(n, 10));
  return { h: isFinite(h) ? h : 0, m: isFinite(m) ? m : 0 };
}

function isInQuietHours(when: Date, prefs: NotificationPreferences): boolean {
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
  return minutes >= startMin || minutes < endMin;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

interface PendingReminder {
  fireAt: number;
  payload: ReminderPayload;
}

// ─────────────────────────────────────────────────────────────────────────────
// Reminder ledger
//
// Two in-memory maps keep the scheduler honest across ticks and across
// task/event mutations:
//
//   - sentLedger:      keyed by `${userId}|${tag}|${minute}` to dedupe a single
//                      reminder so it cannot be dispatched twice (e.g. if a
//                      tick fires twice during the same wall-clock minute, or
//                      if a reschedule lands the new fireAt back inside the
//                      same scheduler window).
//   - cancelledLedger: keyed by `${userId}|${tag}` to suppress an upcoming
//                      reminder when the user completes / deletes a task or
//                      moves it out of today. Routes call markRemindersCancelled
//                      to populate this; the next scheduler tick skips them.
//
// Both maps act as a write-through cache backed by the `reminder_ledger`
// table so that markers survive a server restart. On startup (or on the first
// access) the cache is hydrated from rows newer than the TTL; every mutation
// is mirrored to Postgres. If the DB write fails we still keep the in-memory
// marker so the running process behaves correctly — the persistence is purely
// for restart-survival.
//
// Both ledgers self-prune older entries so they cannot grow without bound.
// Sent markers expire after ~25h (pre-task lead time + safety margin); cancel
// markers persist long enough to cover the upcoming-reminders preview horizon
// (see SENT_LEDGER_TTL_MS / CANCELLED_LEDGER_TTL_MS below).
// ─────────────────────────────────────────────────────────────────────────────

const sentLedger = new Map<string, number>();
const cancelledLedger = new Map<string, number>();
// Sent markers only need to outlive the longest plausible single reminder
// fire-window (pre-task lead time + safety margin) — 25h is plenty.
const SENT_LEDGER_TTL_MS = 25 * 60 * 60 * 1000;
// Cancellation markers must outlive the upcoming-reminders panel's preview
// horizon (up to 7 days ahead) so a skip placed today still suppresses the
// reminder when its day arrives. 9 days = 7-day preview + 2-day safety.
const CANCELLED_LEDGER_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const HYDRATE_LOOKBACK_MS = Math.max(SENT_LEDGER_TTL_MS, CANCELLED_LEDGER_TTL_MS);
const CANCELLED_BUCKET = 0;

let ledgerHydrated = false;
let hydratePromise: Promise<void> | null = null;

async function hydrateLedger(): Promise<void> {
  if (ledgerHydrated) return;
  if (hydratePromise) {
    await hydratePromise;
    return;
  }
  hydratePromise = (async () => {
    try {
      const cutoff = new Date(Date.now() - HYDRATE_LOOKBACK_MS);
      const rows = await db
        .select()
        .from(reminderLedger)
        .where(gt(reminderLedger.createdAt, cutoff));
      const sentCutoff = Date.now() - SENT_LEDGER_TTL_MS;
      const cancelledCutoff = Date.now() - CANCELLED_LEDGER_TTL_MS;
      for (const row of rows) {
        const ts = row.createdAt ? row.createdAt.getTime() : Date.now();
        if (row.kind === "sent") {
          if (ts < sentCutoff) continue;
          sentLedger.set(`${row.userId}|${row.tag}|${row.bucket}`, ts);
        } else if (row.kind === "cancelled") {
          if (ts < cancelledCutoff) continue;
          cancelledLedger.set(`${row.userId}|${row.tag}`, ts);
        }
      }
      ledgerHydrated = true;
      console.log(
        `[push] Hydrated reminder ledger (${rows.length} rows from DB).`,
      );
    } catch (err) {
      console.error("[push] Failed to hydrate reminder ledger:", err);
    } finally {
      hydratePromise = null;
    }
  })();
  await hydratePromise;
}

async function persistLedgerRow(
  userId: string,
  tag: string,
  kind: "sent" | "cancelled",
  bucket: number,
): Promise<void> {
  try {
    await db
      .insert(reminderLedger)
      .values({ userId, tag, kind, bucket })
      .onConflictDoNothing({
        target: [
          reminderLedger.userId,
          reminderLedger.tag,
          reminderLedger.kind,
          reminderLedger.bucket,
        ],
      });
  } catch (err) {
    console.error(
      `[push] Failed to persist reminder ledger row (${kind}, ${tag}):`,
      err,
    );
  }
}

async function deleteLedgerRowsForTag(
  userId: string,
  tag: string,
): Promise<void> {
  try {
    await db
      .delete(reminderLedger)
      .where(
        and(
          eq(reminderLedger.userId, userId),
          eq(reminderLedger.tag, tag),
        ),
      );
  } catch (err) {
    console.error(
      `[push] Failed to delete reminder ledger rows for ${tag}:`,
      err,
    );
  }
}

async function pruneLedgerDb(): Promise<void> {
  try {
    const sentCutoff = new Date(Date.now() - SENT_LEDGER_TTL_MS);
    const cancelledCutoff = new Date(Date.now() - CANCELLED_LEDGER_TTL_MS);
    await db
      .delete(reminderLedger)
      .where(
        and(
          eq(reminderLedger.kind, "sent"),
          lt(reminderLedger.createdAt, sentCutoff),
        ),
      );
    await db
      .delete(reminderLedger)
      .where(
        and(
          eq(reminderLedger.kind, "cancelled"),
          lt(reminderLedger.createdAt, cancelledCutoff),
        ),
      );
  } catch (err) {
    console.error("[push] Failed to prune reminder ledger rows:", err);
  }
}

function pruneLedger(map: Map<string, number>, ttlMs: number): void {
  const cutoff = Date.now() - ttlMs;
  for (const [k, ts] of Array.from(map.entries())) {
    if (ts < cutoff) map.delete(k);
  }
}

function sentBucket(fireAt: number): number {
  return Math.floor(fireAt / 60000);
}

function sentKey(userId: string, tag: string, fireAt: number): string {
  return `${userId}|${tag}|${sentBucket(fireAt)}`;
}

function cancelKey(userId: string, tag: string): string {
  return `${userId}|${tag}`;
}

function tagsForItem(opts: {
  taskId?: string | null;
  calendarEventId?: string | null;
}): string[] {
  const out: string[] = [];
  if (opts.taskId) {
    out.push(`pre-task-task:${opts.taskId}`);
    out.push(`post-task-task:${opts.taskId}`);
  }
  if (opts.calendarEventId) {
    out.push(`pre-task-event:${opts.calendarEventId}`);
    out.push(`post-task-event:${opts.calendarEventId}`);
  }
  return out;
}

/**
 * Mark a task / calendar event's upcoming reminders as cancelled. Called by
 * the routes when an item is completed, deleted, or moved out of today —
 * ensures the next scheduler tick will not push a stale reminder for it.
 */
export function markRemindersCancelled(
  userId: string,
  opts: { taskId?: string | null; calendarEventId?: string | null },
): void {
  const now = Date.now();
  for (const tag of tagsForItem(opts)) {
    cancelledLedger.set(cancelKey(userId, tag), now);
    void persistLedgerRow(userId, tag, "cancelled", CANCELLED_BUCKET);
  }
}

/**
 * Mark a single pre- or post-task reminder as cancelled. Used by the
 * upcoming-reminders panel so the user can skip just one ping for an item
 * without affecting its companion reminder.
 */
export function markSingleReminderCancelled(
  userId: string,
  kind: "pre" | "post",
  opts: { taskId?: string | null; calendarEventId?: string | null },
): void {
  const tag = opts.taskId
    ? `${kind}-task-task:${opts.taskId}`
    : opts.calendarEventId
      ? `${kind}-task-event:${opts.calendarEventId}`
      : null;
  if (!tag) return;
  cancelledLedger.set(cancelKey(userId, tag), Date.now());
  void persistLedgerRow(userId, tag, "cancelled", CANCELLED_BUCKET);
}

/**
 * Clear a single pre- or post-task reminder cancellation so the matching
 * reminder can fire again. Used when the user undoes a skip from the
 * upcoming-reminders panel.
 */
export function clearSingleReminderCancellation(
  userId: string,
  kind: "pre" | "post",
  opts: { taskId?: string | null; calendarEventId?: string | null },
): void {
  const tag = opts.taskId
    ? `${kind}-task-task:${opts.taskId}`
    : opts.calendarEventId
      ? `${kind}-task-event:${opts.calendarEventId}`
      : null;
  if (!tag) return;
  cancelledLedger.delete(cancelKey(userId, tag));
  // Also drop any sent-marker so a restored reminder whose fireAt lands in a
  // bucket the scheduler already wrote to can still dispatch.
  const prefix = `${userId}|${tag}|`;
  for (const k of Array.from(sentLedger.keys())) {
    if (k.startsWith(prefix)) sentLedger.delete(k);
  }
  void deleteLedgerRowsForTag(userId, tag);
}

/**
 * Clear a previous cancellation so reminders for this item can fire again
 * (e.g. when a completed task is uncompleted, or a task is rescheduled to a
 * fresh slot the user genuinely wants to be reminded about).
 */
export function clearReminderCancellations(
  userId: string,
  opts: { taskId?: string | null; calendarEventId?: string | null },
): void {
  for (const tag of tagsForItem(opts)) {
    cancelledLedger.delete(cancelKey(userId, tag));
    // Also drop any sent-marker for this tag in the last day so a freshly
    // rescheduled item that lands in the same minute bucket as the original
    // can fire again. Sent keys are `${userId}|${tag}|${minute}` so we strip
    // by prefix.
    const prefix = `${userId}|${tag}|`;
    for (const k of Array.from(sentLedger.keys())) {
      if (k.startsWith(prefix)) sentLedger.delete(k);
    }
    // Mirror the reset to the persisted ledger so a server restart cannot
    // resurrect a stale "cancelled" or "sent" marker.
    void deleteLedgerRowsForTag(userId, tag);
  }
}

/**
 * For the given user, build the list of reminders that should fire in the
 * window [windowStart, windowEnd). We rebuild from scratch each tick — the
 * 60-second cadence means each reminder is evaluated exactly once per minute
 * boundary, and the sw.js `tag` field deduplicates against any in-page timer.
 */
async function buildRemindersForUser(
  userId: string,
  prefs: NotificationPreferences,
  windowStart: number,
  windowEnd: number,
): Promise<PendingReminder[]> {
  const now = new Date(windowStart);
  const startOfDay = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    0,
    0,
    0,
    0,
  );
  const endOfDay = new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000);

  // Pull today's tasks + calendar events for this user.
  const [userTasks, userEvents] = (await Promise.all([
    db.select().from(tasksTable).where(eq(tasksTable.userId, userId)),
    db
      .select()
      .from(calendarEventsTable)
      .where(eq(calendarEventsTable.userId, userId)),
  ])) as [Task[], CalendarEvent[]];

  interface Item {
    id: string;
    kind: "task" | "event";
    name: string;
    start: Date;
    end: Date | null;
  }
  const toDate = (v: Date | string | null | undefined): Date | null => {
    if (!v) return null;
    const d = v instanceof Date ? v : new Date(v);
    return isNaN(d.getTime()) ? null : d;
  };

  const items: Item[] = [];
  for (const t of userTasks) {
    if (t.isCompleted) continue;
    const start = toDate(t.scheduledStart);
    if (!start) continue;
    if (start < startOfDay || start >= endOfDay) continue;
    items.push({
      id: `task:${t.id}`,
      kind: "task",
      name: t.title || "Task",
      start,
      end: toDate(t.scheduledEnd),
    });
  }
  for (const ev of userEvents) {
    const start = toDate(ev.startTime);
    if (!start) continue;
    if (start < startOfDay || start >= endOfDay) continue;
    items.push({
      id: `event:${ev.id}`,
      kind: "event",
      name: ev.title || "Event",
      start,
      end: toDate(ev.endTime),
    });
  }

  const minutesBefore = prefs.preTaskMinutes ?? 15;
  const out: PendingReminder[] = [];

  for (const item of items) {
    const taskId = item.kind === "task" ? item.id.slice(5) : null;
    const calendarEventId = item.kind === "event" ? item.id.slice(6) : null;

    const preTag = `pre-task-${item.id}`;
    const postTag = `post-task-${item.id}`;

    if (
      prefs.preTaskEnabled &&
      !cancelledLedger.has(cancelKey(userId, preTag))
    ) {
      const fireAt = item.start.getTime() - minutesBefore * 60 * 1000;
      if (
        fireAt >= windowStart &&
        fireAt < windowEnd &&
        !isInQuietHours(new Date(fireAt), prefs) &&
        !sentLedger.has(sentKey(userId, preTag, fireAt))
      ) {
        out.push({
          fireAt,
          payload: {
            title: `⏰ Coming Up: ${item.name}`,
            body: `Scheduled for ${formatTime(item.start)}. Will you be doing this?`,
            notificationType: "pre_task",
            url: "/accountability",
            tag: preTag,
            taskData: {
              taskId,
              calendarEventId,
              taskName: item.name,
              scheduledTime: item.start.toISOString(),
              scheduledEndTime: item.end?.toISOString(),
            },
          },
        });
      }
    }

    if (
      prefs.postTaskEnabled &&
      !cancelledLedger.has(cancelKey(userId, postTag))
    ) {
      const endRef = item.end ?? new Date(item.start.getTime() + 30 * 60 * 1000);
      const fireAt = endRef.getTime();
      if (
        fireAt >= windowStart &&
        fireAt < windowEnd &&
        !isInQuietHours(new Date(fireAt), prefs) &&
        !sentLedger.has(sentKey(userId, postTag, fireAt))
      ) {
        out.push({
          fireAt,
          payload: {
            title: `${item.name} - Time's Up!`,
            body: "Did you complete this task?",
            notificationType: "post_task",
            url: "/accountability",
            tag: postTag,
            taskData: {
              taskId,
              calendarEventId,
              taskName: item.name,
            },
          },
        });
      }
    }
  }
  return out;
}

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

async function processUserTick(
  userId: string,
  windowStart: number,
  windowEnd: number,
): Promise<void> {
  try {
    const [prefs] = await db
      .select()
      .from(notificationPreferences)
      .where(eq(notificationPreferences.userId, userId))
      .limit(1);
    if (!prefs || !prefs.accountabilityEnabled) return;
    const reminders = await buildRemindersForUser(
      userId,
      prefs,
      windowStart,
      windowEnd,
    );
    for (const reminder of reminders) {
      const key = sentKey(userId, reminder.payload.tag, reminder.fireAt);
      if (sentLedger.has(key)) continue;
      // Mark before dispatch so a slow send cannot be doubled-up by a
      // subsequent tick that arrives before the await resolves. The
      // persisted write also prevents a server restart in the same minute
      // bucket from re-sending this reminder.
      sentLedger.set(key, Date.now());
      void persistLedgerRow(
        userId,
        reminder.payload.tag,
        "sent",
        sentBucket(reminder.fireAt),
      );
      await sendPushToUser(userId, reminder.payload);
    }
  } catch (err) {
    console.error(`[push] reminder tick failed for user ${userId}:`, err);
  }
}

async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<void>,
): Promise<void> {
  if (items.length === 0) return;
  const effectiveLimit = Math.max(1, Math.min(limit, items.length));
  let cursor = 0;
  const runners = Array.from({ length: effectiveLimit }, async () => {
    while (true) {
      const idx = cursor++;
      if (idx >= items.length) return;
      await worker(items[idx]);
    }
  });
  await Promise.all(runners);
}

async function tick(): Promise<void> {
  const tickStart = Date.now();
  const windowEnd = tickStart + SCHEDULER_INTERVAL_MS;
  // First tick after boot loads any sent/cancelled markers that were written
  // before the previous process exited. Subsequent ticks just hit the cache.
  await hydrateLedger();
  pruneLedger(sentLedger, SENT_LEDGER_TTL_MS);
  pruneLedger(cancelledLedger, CANCELLED_LEDGER_TTL_MS);
  void pruneLedgerDb();
  try {
    // Find every user with at least one push subscription. Joining keeps the
    // workload bounded: only users who have actually opted-in are scanned.
    const subs = await db
      .select({ userId: pushSubscriptions.userId })
      .from(pushSubscriptions);
    const allUserIds = Array.from(new Set(subs.map((s) => s.userId)));
    // Only process users that hash into this instance's shard. With a single
    // active lease (cluster size 1) this is a no-op pass-through.
    const shard = currentShard;
    const userIds =
      shard.count <= 1
        ? allUserIds
        : allUserIds.filter((id) => isUserInShard(id, shard));
    if (userIds.length === 0) return;

    // Fan out per-user work with a bounded concurrency pool so a growing
    // subscriber base doesn't cause a single tick to run longer than the
    // 60s scheduler interval.
    await runWithConcurrency(userIds, USER_TICK_CONCURRENCY, (userId) =>
      processUserTick(userId, tickStart, windowEnd),
    );
  } catch (err) {
    console.error("[push] reminder tick top-level error:", err);
  } finally {
    const duration = Date.now() - tickStart;
    if (duration > SCHEDULER_INTERVAL_MS) {
      console.warn(
        `[push] reminder tick exceeded interval: ${duration}ms > ${SCHEDULER_INTERVAL_MS}ms. ` +
          `Consider raising USER_TICK_CONCURRENCY or sharding work across processes.`,
      );
    }
  }
}

export async function startReminderScheduler(): Promise<void> {
  if (schedulerHandle) return;
  // Claim our scheduler slot synchronously before the first tick so the
  // initial pass already filters to this instance's user slice.
  await heartbeatLease();
  startLeaseManager();
  // Align to the next minute boundary so reminders fire close to wall-clock
  // minutes (less drift relative to user-perceived schedule times).
  const now = new Date();
  const msToNextMinute =
    1000 - now.getMilliseconds() + (60 - now.getSeconds() - 1) * 1000;
  setTimeout(() => {
    void tick();
    schedulerHandle = setInterval(() => {
      void tick();
    }, SCHEDULER_INTERVAL_MS);
  }, Math.max(msToNextMinute, 0));
  console.log(
    `[push] Reminder scheduler started (instance ${INSTANCE_ID.slice(0, 8)}, ` +
      `slot ${currentShard.index}/${currentShard.count}).`,
  );
}

export function stopReminderScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
