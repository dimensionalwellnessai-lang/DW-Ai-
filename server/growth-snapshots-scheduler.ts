/**
 * Growth snapshots scheduler — keeps My Level trend lines continuous.
 *
 * growth_snapshots rows were previously written only lazily when a user hit
 * GET /api/level-progress, so anyone who skipped a few days got gaps in
 * their trend charts. This job upserts a snapshot for every recently-active
 * user once per UTC day, whether or not they open the app.
 *
 * Conventions (mirrors mood-insights-scheduler.ts / guide-checkins.ts):
 *   - "Active" = any usage_meters row in the last ACTIVE_USER_LOOKBACK_DAYS
 *     days (usage meters are bumped by chat/voice/dashboard/etc, so they're
 *     the broadest cheap proxy for "still uses the app").
 *   - Respects the horizontal shard config from server/push.ts, so
 *     multi-instance deploys don't double-compute.
 *   - Ticks every few hours but skips users who already have today's
 *     snapshot (whether written by us or lazily by /api/level-progress),
 *     so in steady state each user is computed at most once per day. The
 *     (user_id, date_key) unique index + upsert make overlapping ticks
 *     harmless anyway.
 *   - Quiet hours are intentionally NOT consulted: this job is a silent DB
 *     write, never a notification, so the quiet-hours preference (which
 *     gates pushes/nudges) does not apply.
 *   - Best-effort: per-user failures are logged and swallowed so one bad
 *     row can't stall the sweep.
 */

import { and, eq, gte } from "drizzle-orm";
import { db } from "./db";
import { growthSnapshots, usageMeters } from "@shared/schema";
import { isUserInShard } from "./push";
import {
  computeGrowthMetrics,
  upsertTodayGrowthSnapshot,
} from "./lib/growth-metrics";

/** How often the sweep runs. 6h gives ~4 chances per UTC day per user. */
const TICK_INTERVAL_MS = 6 * 60 * 60 * 1000;
/** Delay after boot so we don't compete with other startup work. */
const STARTUP_DELAY_MS = 2 * 60 * 1000;
/** Users with any usage in this window count as active. */
const ACTIVE_USER_LOOKBACK_DAYS = 30;

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

async function findActiveUserIds(sinceKey: string): Promise<string[]> {
  const rows = await db
    .selectDistinct({ userId: usageMeters.userId })
    .from(usageMeters)
    .where(gte(usageMeters.dateKey, sinceKey));
  return rows.map((r) => r.userId).filter((id): id is string => !!id);
}

async function hasSnapshotForDay(userId: string, dateKey: string): Promise<boolean> {
  const [row] = await db
    .select({ id: growthSnapshots.id })
    .from(growthSnapshots)
    .where(and(eq(growthSnapshots.userId, userId), eq(growthSnapshots.dateKey, dateKey)))
    .limit(1);
  return !!row;
}

/**
 * One sweep: snapshot every shard-owned active user who doesn't already
 * have a growth snapshot for today (UTC).
 */
export async function runGrowthSnapshotsTick(
  now: Date = new Date(),
): Promise<{ scanned: number; written: number; skipped: number }> {
  let scanned = 0;
  let written = 0;
  let skipped = 0;
  try {
    const todayKey = now.toISOString().slice(0, 10);
    const sinceKey = new Date(now.getTime() - ACTIVE_USER_LOOKBACK_DAYS * 86_400_000)
      .toISOString()
      .slice(0, 10);
    const userIds = (await findActiveUserIds(sinceKey)).filter((id) => isUserInShard(id));
    for (const userId of userIds) {
      scanned++;
      try {
        if (await hasSnapshotForDay(userId, todayKey)) {
          skipped++;
          continue;
        }
        const metrics = await computeGrowthMetrics(userId);
        await upsertTodayGrowthSnapshot(userId, metrics);
        written++;
      } catch (perUserErr) {
        console.error(`[growth-snapshots] tick failed for user ${userId}:`, perUserErr);
      }
    }
  } catch (err) {
    console.error("[growth-snapshots] tick top-level error:", err);
  }
  return { scanned, written, skipped };
}

export function startGrowthSnapshotsScheduler(): void {
  if (schedulerHandle) return;
  setTimeout(() => {
    void runGrowthSnapshotsTick();
    schedulerHandle = setInterval(() => {
      void runGrowthSnapshotsTick();
    }, TICK_INTERVAL_MS);
  }, STARTUP_DELAY_MS);
  console.log("[growth-snapshots] daily growth snapshot scheduler started.");
}
