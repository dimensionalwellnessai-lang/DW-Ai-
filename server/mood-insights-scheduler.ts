/**
 * Background refresh for mood-insight correlations.
 *
 * Two complementary triggers keep the cached insights on the Correlations tab
 * fresh without requiring the user to tap "Recompute":
 *
 *   1. Periodic scheduler — every MOOD_INSIGHTS_INTERVAL_MS we scan every
 *      user who has logged a mood in the last ACTIVE_USER_LOOKBACK_DAYS days
 *      and recompute insights for the ones whose cached row is older than
 *      STALE_AFTER_MS. With the 6h interval and 24h staleness window this
 *      adds up to a "nightly-ish" refresh per active user without needing
 *      cron.
 *
 *   2. Post-log trigger — `maybeRefreshAfterMoodLog` is called after every
 *      successful POST /api/mood. It checks how many mood logs have landed
 *      since the last computedAt and recomputes when the count crosses
 *      POST_LOG_REFRESH_THRESHOLD. This is what keeps the insights "alive"
 *      for daily loggers between scheduler ticks.
 *
 * Both paths share an in-flight set so concurrent recomputes for the same
 * user collapse into one. They also respect the existing horizontal-shard
 * config from server/push.ts, so multi-instance deploys don't double-compute.
 *
 * Failures are logged and swallowed: this is best-effort cache warming, not
 * something the request path or other schedulers should ever block on.
 */

import { db } from "./db";
import { moodLogs, moodInsights } from "@shared/schema";
import { and, desc, eq, gte, sql as dsql } from "drizzle-orm";
import { isUserInShard } from "./push";
import { computeMoodInsights } from "./mood-insights";

// How often the scheduler scans for users needing a refresh. 6h means an
// active user gets roughly four chances per day to be picked up — combined
// with the 24h staleness gate that's a once-a-day refresh in steady state.
const MOOD_INSIGHTS_INTERVAL_MS = 6 * 60 * 60 * 1000;
// Wait a bit after boot before the first run so we don't compete with other
// startup work (push scheduler claim, plaid sync, vite dev server warmup).
const STARTUP_DELAY_MS = 90 * 1000;
// Skip a user if their cached insights were computed less than this long
// ago. Protects against repeated work during the same tick window or right
// after a post-log trigger already refreshed.
const STALE_AFTER_MS = 24 * 60 * 60 * 1000;
// Only consider users who logged a mood in this window as "active". Anyone
// quieter than that won't be paying attention to the Correlations tab and
// can wait for their next mood log to trigger a refresh.
const ACTIVE_USER_LOOKBACK_DAYS = 30;
// Recompute after every Nth new mood log per user. Tuned so daily loggers
// see fresh insights every ~5 days even if the scheduler somehow misses
// them, while one-off loggers don't kick off churn after a single entry.
const POST_LOG_REFRESH_THRESHOLD = 5;

// Per-user in-flight tracking so a slow recompute can't be doubled-up by a
// scheduler tick that runs while a post-log trigger is mid-flight.
const inFlight = new Set<string>();

async function findActiveUserIds(): Promise<string[]> {
  const since = new Date();
  since.setDate(since.getDate() - ACTIVE_USER_LOOKBACK_DAYS);
  try {
    const rows = await db
      .select({ userId: moodLogs.userId })
      .from(moodLogs)
      .where(gte(moodLogs.createdAt, since))
      .groupBy(moodLogs.userId);
    return rows.map((r) => r.userId);
  } catch (err) {
    console.error("[mood-insights] failed to list active users:", err);
    return [];
  }
}

async function getLatestComputedAt(userId: string): Promise<Date | null> {
  try {
    const [row] = await db
      .select({ computedAt: moodInsights.computedAt })
      .from(moodInsights)
      .where(eq(moodInsights.userId, userId))
      .orderBy(desc(moodInsights.computedAt))
      .limit(1);
    return row?.computedAt ?? null;
  } catch (err) {
    console.error(
      `[mood-insights] failed to read latest computedAt for ${userId}:`,
      err,
    );
    return null;
  }
}

async function refreshOne(userId: string): Promise<boolean> {
  if (inFlight.has(userId)) return false;
  inFlight.add(userId);
  try {
    await computeMoodInsights(userId);
    return true;
  } catch (err) {
    console.error(`[mood-insights] refresh failed for ${userId}:`, err);
    return false;
  } finally {
    inFlight.delete(userId);
  }
}

/**
 * Walk every active user owned by this instance's shard and recompute their
 * insights when the cache is older than STALE_AFTER_MS. Logs (but never
 * throws) per-user errors so one broken user can't block the rest.
 */
export async function runScheduledMoodInsightsRefresh(): Promise<void> {
  const userIds = await findActiveUserIds();
  if (userIds.length === 0) return;

  const owned = userIds.filter((id) => isUserInShard(id));
  if (owned.length === 0) return;

  const cutoff = Date.now() - STALE_AFTER_MS;
  let refreshed = 0;
  let skipped = 0;
  let failed = 0;
  for (const userId of owned) {
    try {
      const last = await getLatestComputedAt(userId);
      if (last && last.getTime() >= cutoff) {
        skipped++;
        continue;
      }
      const ok = await refreshOne(userId);
      if (ok) refreshed++;
      else failed++;
    } catch (err) {
      failed++;
      console.error(`[mood-insights] tick error for ${userId}:`, err);
    }
  }
  console.log(
    `[mood-insights] scheduler tick: scanned=${owned.length} refreshed=${refreshed} skipped=${skipped} failed=${failed}`,
  );
}

/**
 * Trigger a recompute after a mood log was just created, but only when
 * enough new logs have accumulated since the last cached computation.
 * Fires-and-forgets — never blocks the calling request, never throws.
 */
export function maybeRefreshAfterMoodLog(userId: string): void {
  void (async () => {
    try {
      const last = await getLatestComputedAt(userId);
      // No prior computation → first log triggers a fresh compute so the
      // user gets something on the Correlations tab as soon as they have
      // enough data (computeMoodInsights itself enforces the 5-day floor).
      if (!last) {
        await refreshOne(userId);
        return;
      }
      const [row] = await db
        .select({ count: dsql<number>`count(*)::int` })
        .from(moodLogs)
        .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, last)));
      const newLogs = row?.count ?? 0;
      if (newLogs < POST_LOG_REFRESH_THRESHOLD) return;
      await refreshOne(userId);
    } catch (err) {
      console.error(
        `[mood-insights] post-log refresh failed for ${userId}:`,
        err,
      );
    }
  })();
}

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

export function startMoodInsightsScheduler(): void {
  if (schedulerHandle) return;
  setTimeout(() => {
    void runScheduledMoodInsightsRefresh();
  }, STARTUP_DELAY_MS);
  schedulerHandle = setInterval(() => {
    void runScheduledMoodInsightsRefresh();
  }, MOOD_INSIGHTS_INTERVAL_MS);
  console.log(
    `[mood-insights] scheduler started (interval ${
      MOOD_INSIGHTS_INTERVAL_MS / 1000 / 60
    }m, stale-after ${STALE_AFTER_MS / 1000 / 60 / 60}h).`,
  );
}

export function stopMoodInsightsScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
