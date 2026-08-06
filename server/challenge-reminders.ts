/**
 * Group-challenge check-in reminders
 *
 * Group challenge participants only progress if they remember to check in
 * daily. This module runs a periodic sweep and, in the evening, sends one
 * gentle reminder (inbox card + best-effort web push) to each participant of
 * an active challenge who hasn't checked in yet for the current day,
 * deep-linked back to the challenge hub.
 *
 * Scope decisions (mirrors relationship-nudges.ts / guide-checkins.ts):
 *   - At most one reminder per user per day, regardless of how many active
 *     challenges they're in. Dedupe is the `notifications` row tagged
 *     metadata.kind = "challenge_reminder" + metadata.date = YYYY-MM-DD,
 *     inserted atomically (INSERT ... WHERE NOT EXISTS) so overlapping ticks
 *     or a second instance can't double-send. It survives restarts and shard
 *     moves without a separate ledger.
 *   - Evening only: the reminder window opens at 18:00 and closes at 22:00
 *     (server-local wall clock — the same convention every other scheduler
 *     in this codebase uses for "local time"). Late enough that the user has
 *     had the whole day to check in on their own; closed before the default
 *     quiet-hours start so we never ping near midnight even for users who
 *     haven't enabled quiet hours.
 *   - Check-in state is compared on `dateKey` (the user's local calendar
 *     day, as written by the check-in route). We test both UTC-today and
 *     UTC-yesterday keys so a user west of UTC whose local day lags the
 *     server's isn't reminded right after they checked in.
 *   - Skips entirely once the challenge has ended, after the user completed
 *     it (badge earned), or after they left. Honors quiet hours, the global
 *     accountability switch, and a dedicated `challengeRemindersEnabled`
 *     toggle (default true) so it's easy to mute without disabling other
 *     reminders.
 */

import { and, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  groupChallengeCheckins,
  groupChallengeParticipants,
  groupChallenges,
  notifications,
  type NotificationPreferences,
} from "@shared/schema";
import { isUserInShard, sendPushToUser } from "./push";
import { getNotificationPreferences } from "./accountability";

// Sweep every 30 minutes. The per-user daily dedupe row keeps that frequency
// safe — at most one reminder lands per day even if many ticks see the same
// eligible participant.
const TICK_INTERVAL_MS = 30 * 60 * 1000;

/** Reminder window (inclusive start hour, exclusive end hour), wall clock. */
export const REMINDER_WINDOW_START_HOUR = 18;
export const REMINDER_WINDOW_END_HOUR = 22;

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

export function isInReminderWindow(now: Date): boolean {
  const hour = now.getHours();
  return hour >= REMINDER_WINDOW_START_HOUR && hour < REMINDER_WINDOW_END_HOUR;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export interface ChallengeReminderCandidate {
  challengeId: string;
  challengeTitle: string;
  /** Distinct check-in days so far. */
  daysDone: number;
  targetCheckins: number;
}

/**
 * Find the challenge (if any) this user should be reminded about today:
 * an active published challenge they're still in, haven't completed, and
 * haven't checked into for the current day. When the user is in several
 * eligible challenges we pick the one closest to its badge so the reminder
 * carries the most motivating progress line.
 */
export async function pickChallengeReminderCandidate(
  userId: string,
  now: Date = new Date(),
): Promise<ChallengeReminderCandidate | null> {
  const rows = await db
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
    );
  if (!rows.length) return null;

  // `dateKey` is the user's local calendar day. Treat either UTC-today or
  // UTC-yesterday as "already checked in today" so a user west of UTC whose
  // local day lags the server's isn't pinged minutes after checking in.
  const todayKey = dayKey(now);
  const yesterdayKey = dayKey(new Date(now.getTime() - 86_400_000));

  const challengeIds = rows.map((r) => r.challenge.id);
  const checkins = await db
    .select({
      challengeId: groupChallengeCheckins.challengeId,
      dateKey: groupChallengeCheckins.dateKey,
    })
    .from(groupChallengeCheckins)
    .where(
      and(
        eq(groupChallengeCheckins.userId, userId),
        inArray(groupChallengeCheckins.challengeId, challengeIds),
      ),
    );

  const daysByChallenge = new Map<string, Set<string>>();
  for (const c of checkins) {
    let set = daysByChallenge.get(c.challengeId);
    if (!set) daysByChallenge.set(c.challengeId, (set = new Set()));
    set.add(c.dateKey);
  }

  let best: ChallengeReminderCandidate | null = null;
  let bestRemaining = Infinity;
  for (const { challenge } of rows) {
    const days = daysByChallenge.get(challenge.id) ?? new Set<string>();
    if (days.has(todayKey) || days.has(yesterdayKey)) continue;
    const remaining = challenge.targetCheckins - days.size;
    if (remaining <= 0) continue; // badge award pending; nothing to nag about
    if (remaining < bestRemaining) {
      bestRemaining = remaining;
      best = {
        challengeId: challenge.id,
        challengeTitle: challenge.title,
        daysDone: days.size,
        targetCheckins: challenge.targetCheckins,
      };
    }
  }
  return best;
}

export function buildReminderMessage(c: ChallengeReminderCandidate): {
  title: string;
  body: string;
} {
  const remaining = c.targetCheckins - c.daysDone;
  if (c.daysDone === 0) {
    return {
      title: `Start your streak in "${c.challengeTitle}"`,
      body: `No check-ins yet — today's a great day for your first one. ${c.targetCheckins} days earns the badge.`,
    };
  }
  if (remaining <= 3) {
    return {
      title: `So close — check in today?`,
      body: `Just ${remaining} more day${remaining === 1 ? "" : "s"} of "${c.challengeTitle}" and the badge is yours. Don't let today slip by.`,
    };
  }
  return {
    title: `Don't lose your momentum`,
    body: `You haven't checked in to "${c.challengeTitle}" today. ${c.daysDone} day${c.daysDone === 1 ? "" : "s"} down, ${remaining} to go — a quick check-in keeps you on track.`,
  };
}

export async function runChallengeReminderForUser(
  userId: string,
  prefs: NotificationPreferences | null,
  now: Date = new Date(),
): Promise<{ sent: boolean; reason?: string; candidate?: ChallengeReminderCandidate }> {
  // Missing prefs row behaves like the on-by-default schema values.
  const accountabilityEnabled = prefs?.accountabilityEnabled ?? true;
  const challengeRemindersEnabled = prefs?.challengeRemindersEnabled ?? true;
  if (!accountabilityEnabled || !challengeRemindersEnabled) {
    return { sent: false, reason: "muted" };
  }
  if (!isInReminderWindow(now)) {
    return { sent: false, reason: "outside_window" };
  }
  if (prefs && isInQuietHours(now, prefs)) {
    return { sent: false, reason: "quiet_hours" };
  }

  const todayKey = dayKey(now);
  const candidate = await pickChallengeReminderCandidate(userId, now);
  if (!candidate) return { sent: false, reason: "no_signal" };

  const { title, body } = buildReminderMessage(candidate);
  const actionUrl = "/group-challenges";

  // Inbox card first — it doubles as the daily dedupe row even if push
  // fails. The insert is guarded atomically so overlapping ticks or a second
  // instance can't double-send.
  const metadata = JSON.stringify({
    kind: "challenge_reminder",
    date: todayKey,
    challengeId: candidate.challengeId,
  });
  const inserted = await db.execute(sql`
    INSERT INTO notifications (user_id, type, title, body, action_url, metadata)
    SELECT ${userId}, 'system', ${title}, ${body}, ${actionUrl}, ${metadata}::jsonb
    WHERE NOT EXISTS (
      SELECT 1 FROM notifications
      WHERE user_id = ${userId}
        AND type = 'system'
        AND metadata->>'kind' = 'challenge_reminder'
        AND metadata->>'date' = ${todayKey}
    )
    RETURNING id
  `);
  if ((inserted.rows?.length ?? 0) === 0) {
    return { sent: false, reason: "already_sent_today" };
  }

  // Best-effort push; the inbox card remains the source of truth.
  try {
    await sendPushToUser(userId, {
      title,
      body,
      notificationType: "challenge_reminder",
      url: actionUrl,
      tag: `challenge-reminder:${todayKey}`,
    });
  } catch (err) {
    console.error("[challenge-reminders] push send failed:", err);
  }

  return { sent: true, candidate };
}

/**
 * Sweep every active (not-left, not-completed) participant of a currently
 * running published challenge, respecting shard ownership. Eligibility is
 * independent of push enrollment — users without a push subscription still
 * get the inbox card.
 */
export async function runChallengeRemindersTick(
  now: Date = new Date(),
): Promise<{ scanned: number; sent: number }> {
  let scanned = 0;
  let sent = 0;
  // Cheap early-out: outside the evening window nobody is eligible, so skip
  // the participant scan entirely.
  if (!isInReminderWindow(now)) return { scanned, sent };
  try {
    const rows = await db
      .selectDistinct({ userId: groupChallengeParticipants.userId })
      .from(groupChallengeParticipants)
      .innerJoin(
        groupChallenges,
        eq(groupChallengeParticipants.challengeId, groupChallenges.id),
      )
      .where(
        and(
          isNull(groupChallengeParticipants.leftAt),
          isNull(groupChallengeParticipants.completedAt),
          eq(groupChallenges.status, "published"),
          lte(groupChallenges.startDate, now),
          gte(groupChallenges.endDate, now),
        ),
      );
    const userIds = rows
      .map((r) => r.userId)
      .filter((id): id is string => !!id && isUserInShard(id));
    for (const userId of userIds) {
      scanned++;
      try {
        const prefs = await getNotificationPreferences(userId);
        const result = await runChallengeReminderForUser(userId, prefs, now);
        if (result.sent) sent++;
      } catch (perUserErr) {
        console.error(
          `[challenge-reminders] tick failed for user ${userId}:`,
          perUserErr,
        );
      }
    }
  } catch (err) {
    console.error("[challenge-reminders] tick top-level error:", err);
  }
  return { scanned, sent };
}

export function startChallengeRemindersScheduler(): void {
  if (schedulerHandle) return;
  // Stagger the first tick so we don't pile on top of the other schedulers'
  // boot sequence and give the lease manager time to settle the shard config.
  setTimeout(() => {
    void runChallengeRemindersTick();
    schedulerHandle = setInterval(() => {
      void runChallengeRemindersTick();
    }, TICK_INTERVAL_MS);
  }, 90 * 1000);
  console.log("[challenge-reminders] challenge check-in reminder scheduler started.");
}

export function stopChallengeRemindersScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
