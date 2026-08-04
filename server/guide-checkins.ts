/**
 * Guide check-ins — proactive level-up coaching nudges
 *
 * DW's guide behavior lives in chat/voice, but it only helps if the user
 * shows up. This module watches each user's level-up surfaces (active Role
 * Map and current group challenge) and sends one gentle "guide check-in"
 * when progress has stalled or a milestone is within reach, deep-linking
 * into a DW chat so the guide can pick it up from there.
 *
 * Scope decisions (mirrors relationship-nudges.ts):
 *   - At most one guide check-in per user per 3 days. Dedupe via the
 *     `notifications` row tagged metadata.kind = "guide_checkin", so it
 *     survives restarts and shard moves without a separate ledger.
 *   - Signals, in priority order:
 *       a) near-challenge: active challenge within 2 check-ins of the badge
 *          and not completed — the finish line is visible.
 *       b) challenge-stall: joined an in-progress challenge but no check-in
 *          in the last 3 days (and not completed).
 *       c) near-milestone: exactly 1 milestone left before the next role-map
 *          level.
 *       d) rolemap-stall: active role map untouched for 14+ days with
 *          undone milestones.
 *   - Honors quiet hours, the global accountability switch, and a dedicated
 *     `guideCheckinsEnabled` toggle (default true) so users can mute these
 *     without disabling other reminders.
 *   - In-app inbox card first (also the dedupe row), then best-effort push.
 */

import { and, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  groupChallengeCheckins,
  groupChallengeParticipants,
  groupChallenges,
  notifications,
  roleMaps,
  type NotificationPreferences,
  type RoleMapLevel,
} from "@shared/schema";
import { isUserInShard, sendPushToUser } from "./push";
import { getNotificationPreferences } from "./accountability";

const TICK_INTERVAL_MS = 30 * 60 * 1000;
/** Minimum gap between guide check-ins for the same user. */
const MIN_GAP_DAYS = 3;
/** No challenge check-in for this many days counts as a stall. */
const CHALLENGE_STALL_DAYS = 3;
/** Role map untouched for this many days counts as a stall. */
const ROLEMAP_STALL_DAYS = 14;

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

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
  if (startMin < endMin) return minutes >= startMin && minutes < endMin;
  return minutes >= startMin || minutes < endMin;
}

export type GuideSignal =
  | { kind: "near_challenge"; title: string; remaining: number }
  | { kind: "challenge_stall"; title: string; daysSince: number }
  | { kind: "near_milestone"; targetRole: string; milestone: string; nextLevelTitle?: string }
  | { kind: "rolemap_stall"; targetRole: string; days: number; milestone?: string };

/**
 * Pick the single most compelling guide signal for a user, or null when
 * everything is on track (or there's nothing to guide toward).
 */
export async function pickGuideSignal(
  userId: string,
  now: Date = new Date(),
): Promise<GuideSignal | null> {
  // ── Challenge signals ──
  const challengeRows = await db
    .select({ challenge: groupChallenges, participant: groupChallengeParticipants })
    .from(groupChallengeParticipants)
    .innerJoin(
      groupChallenges,
      eq(groupChallengeParticipants.challengeId, groupChallenges.id),
    )
    .where(
      and(
        eq(groupChallengeParticipants.userId, userId),
        isNull(groupChallengeParticipants.leftAt),
        isNull(groupChallengeParticipants.completedAt),
        eq(groupChallenges.status, "published"),
        lte(groupChallenges.startDate, now),
        gte(groupChallenges.endDate, now),
      ),
    )
    .orderBy(desc(groupChallenges.startDate))
    .limit(1);

  if (challengeRows.length) {
    const { challenge } = challengeRows[0];
    const checkins = await db
      .select({ dateKey: groupChallengeCheckins.dateKey })
      .from(groupChallengeCheckins)
      .where(
        and(
          eq(groupChallengeCheckins.challengeId, challenge.id),
          eq(groupChallengeCheckins.userId, userId),
        ),
      );
    const count = checkins.length;
    const remaining = challenge.targetCheckins - count;
    if (remaining > 0 && remaining <= 2 && count > 0) {
      return { kind: "near_challenge", title: challenge.title, remaining };
    }
    // dateKey is the user's *local* calendar day, so compare day-keys to
    // day-keys (never wall-clock ms to a coerced UTC midnight): compute the
    // gap between UTC-today's key and the latest check-in key at pure day
    // granularity. Off by at most one day for extreme timezones, which the
    // 3-day stall threshold absorbs.
    const todayKey = now.toISOString().slice(0, 10);
    const dayDiff = (aKey: string, bKey: string): number =>
      Math.floor((Date.parse(`${aKey}T00:00:00Z`) - Date.parse(`${bKey}T00:00:00Z`)) / 86_400_000);
    const latestKey = checkins.map((c) => c.dateKey).sort().pop() ?? null;
    const daysSince = latestKey
      ? Math.max(0, dayDiff(todayKey, latestKey))
      : Math.max(
          0,
          dayDiff(todayKey, new Date(challenge.startDate).toISOString().slice(0, 10)),
        );
    if (daysSince >= CHALLENGE_STALL_DAYS) {
      return { kind: "challenge_stall", title: challenge.title, daysSince };
    }
  }

  // ── Role map signals ──
  const [rm] = await db
    .select()
    .from(roleMaps)
    .where(and(eq(roleMaps.userId, userId), eq(roleMaps.status, "active")))
    .limit(1);
  if (!rm) return null;

  const levels = (Array.isArray(rm.levels) ? rm.levels : []) as RoleMapLevel[];
  const nextDef =
    levels.find((l) => l.level === rm.currentLevel + 1) ??
    levels.find((l) => l.level === rm.currentLevel);
  const undone = (nextDef?.milestones ?? []).filter((m) => !m.done);
  const total = nextDef?.milestones?.length ?? 0;

  if (undone.length === 1 && total > 1) {
    return {
      kind: "near_milestone",
      targetRole: rm.targetRole,
      milestone: undone[0].title,
      nextLevelTitle: nextDef?.title,
    };
  }

  const touchedAt = rm.updatedAt ?? rm.createdAt;
  if (undone.length > 0 && touchedAt) {
    const days = Math.floor((now.getTime() - new Date(touchedAt).getTime()) / 86_400_000);
    if (days >= ROLEMAP_STALL_DAYS) {
      return {
        kind: "rolemap_stall",
        targetRole: rm.targetRole,
        days,
        milestone: undone[0]?.title,
      };
    }
  }
  return null;
}

export function buildGuideMessage(s: GuideSignal): { title: string; body: string } {
  switch (s.kind) {
    case "near_challenge":
      return {
        title: "You're almost there",
        body: `${s.remaining} more check-in${s.remaining === 1 ? "" : "s"} and "${s.title}" is done. Want to lock one in today?`,
      };
    case "challenge_stall":
      return {
        title: "Your challenge misses you",
        body: `No check-in on "${s.title}" in ${s.daysSince} days. One small check-in today keeps you in the game.`,
      };
    case "near_milestone":
      return {
        title: "One milestone from leveling up",
        body: `"${s.milestone}" is the last thing between you and ${s.nextLevelTitle ? `"${s.nextLevelTitle}"` : "your next level"} as ${s.targetRole}. Want to talk through the first step?`,
      };
    case "rolemap_stall":
      return {
        title: "Quick guide check-in?",
        body: `It's been ${s.days} days since you touched your ${s.targetRole} map.${s.milestone ? ` "${s.milestone}" is still waiting.` : ""} Want to pick one small next step together?`,
      };
  }
}

async function recentlyNudged(userId: string, now: Date): Promise<boolean> {
  const since = new Date(now.getTime() - MIN_GAP_DAYS * 86_400_000);
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, "system"),
        sql`${notifications.metadata}->>'kind' = 'guide_checkin'`,
        gte(notifications.createdAt, since),
      ),
    )
    .limit(1);
  return !!row;
}

export async function runGuideCheckinForUser(
  userId: string,
  prefs: NotificationPreferences | null,
  now: Date = new Date(),
): Promise<{ sent: boolean; reason?: string; signal?: GuideSignal }> {
  const accountabilityEnabled = prefs?.accountabilityEnabled ?? true;
  const guideCheckinsEnabled = prefs?.guideCheckinsEnabled ?? true;
  if (!accountabilityEnabled || !guideCheckinsEnabled) {
    return { sent: false, reason: "muted" };
  }
  if (prefs && isInQuietHours(now, prefs)) {
    return { sent: false, reason: "quiet_hours" };
  }
  if (await recentlyNudged(userId, now)) {
    return { sent: false, reason: "recently_sent" };
  }

  const signal = await pickGuideSignal(userId, now);
  if (!signal) return { sent: false, reason: "no_signal" };

  const { title, body } = buildGuideMessage(signal);
  const actionUrl =
    signal.kind === "near_challenge" || signal.kind === "challenge_stall"
      ? "/group-challenges"
      : "/talk-it-out";

  // Inbox card first — it doubles as the dedupe row even if push fails.
  // The insert is guarded atomically (INSERT ... WHERE NOT EXISTS) so
  // overlapping ticks or a second instance can't double-send: whichever
  // insert loses the race writes zero rows and we bail before pushing.
  const since = new Date(now.getTime() - MIN_GAP_DAYS * 86_400_000);
  const metadata = JSON.stringify({
    kind: "guide_checkin",
    date: now.toISOString().slice(0, 10),
    signal: signal.kind,
  });
  const inserted = await db.execute(sql`
    INSERT INTO notifications (user_id, type, title, body, action_url, metadata)
    SELECT ${userId}, 'system', ${title}, ${body}, ${actionUrl}, ${metadata}::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = ${userId}
        AND type = 'system'
        AND metadata->>'kind' = 'guide_checkin'
        AND created_at >= ${since.toISOString()}::timestamptz
    )
    RETURNING id
  `);
  if ((inserted.rows?.length ?? 0) === 0) {
    return { sent: false, reason: "recently_sent" };
  }

  try {
    await sendPushToUser(userId, {
      title,
      body,
      notificationType: "guide_checkin",
      url: actionUrl,
      tag: `guide-checkin:${now.toISOString().slice(0, 10)}`,
    });
  } catch (err) {
    console.error("[guide-checkins] push send failed:", err);
  }

  return { sent: true, signal };
}

/**
 * Sweep every user with an active role map or active challenge membership,
 * respecting shard ownership.
 */
export async function runGuideCheckinsTick(
  now: Date = new Date(),
): Promise<{ scanned: number; sent: number }> {
  let scanned = 0;
  let sent = 0;
  try {
    const [rmUsers, gcUsers] = await Promise.all([
      db
        .selectDistinct({ userId: roleMaps.userId })
        .from(roleMaps)
        .where(eq(roleMaps.status, "active")),
      db
        .selectDistinct({ userId: groupChallengeParticipants.userId })
        .from(groupChallengeParticipants)
        .where(isNull(groupChallengeParticipants.leftAt)),
    ]);
    const userIds = Array.from(
      new Set(
        [...rmUsers, ...gcUsers]
          .map((r) => r.userId)
          .filter((id): id is string => !!id),
      ),
    ).filter((id) => isUserInShard(id));
    for (const userId of userIds) {
      scanned++;
      try {
        const prefs = await getNotificationPreferences(userId);
        const result = await runGuideCheckinForUser(userId, prefs, now);
        if (result.sent) sent++;
      } catch (perUserErr) {
        console.error(`[guide-checkins] tick failed for user ${userId}:`, perUserErr);
      }
    }
  } catch (err) {
    console.error("[guide-checkins] tick top-level error:", err);
  }
  return { scanned, sent };
}

export function startGuideCheckinsScheduler(): void {
  if (schedulerHandle) return;
  setTimeout(() => {
    void runGuideCheckinsTick();
    schedulerHandle = setInterval(() => {
      void runGuideCheckinsTick();
    }, TICK_INTERVAL_MS);
  }, 75 * 1000);
  console.log("[guide-checkins] guide check-in scheduler started.");
}
