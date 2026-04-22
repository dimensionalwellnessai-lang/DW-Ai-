/**
 * Daily relationship nudges
 *
 * The Relationships page already surfaces overdue contacts and open repair
 * items the moment a user opens it, but those signals only land if the user
 * happens to look. This module runs once a day per user, picks the single
 * most urgent signal across their tracked people, and pushes a gentle nudge
 * (web push + inbox card) that deep-links straight into the right person's
 * sheet.
 *
 * Scope decisions:
 *   - One nudge per user per local day (UTC day on the server). We dedupe by
 *     looking up today's `notifications` row tagged with metadata.kind =
 *     "relationship_nudge". This survives restarts and shard moves without a
 *     separate ledger.
 *   - "Most urgent" is whichever of (a) the most-overdue tracked contact or
 *     (b) the oldest open repair item has the higher urgency score. Ties go
 *     to the open-repair signal because unresolved tension tends to weigh on
 *     people more than a missed catch-up.
 *   - We honour the user's quiet hours and skip the tick entirely if the
 *     wall clock is currently inside that window — better to wait an hour
 *     than to ping someone at midnight.
 *   - Mute is a single boolean on `notification_preferences`
 *     (`relationshipNudgesEnabled`, default true) so users can silence these
 *     without disabling all accountability notifications.
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "./db";
import {
  notifications,
  people,
  peopleInteractions,
  relationshipRepairs,
  type NotificationPreferences,
} from "@shared/schema";
import { isUserInShard, sendPushToUser } from "./push";
import { getNotificationPreferences } from "./accountability";

// Run the nudge sweep every 30 minutes. Per-user dedupe via the inbox row
// keeps that frequency safe — at most one nudge lands per day even if many
// ticks see the same eligible signal.
const NUDGE_TICK_INTERVAL_MS = 30 * 60 * 1000;

let schedulerHandle: ReturnType<typeof setInterval> | null = null;

function localDayKey(now: Date): string {
  return now.toISOString().slice(0, 10);
}

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

interface OverdueCandidate {
  kind: "overdue";
  personId: string;
  personName: string;
  daysSince: number;
  target: number;
  daysOverdue: number;
}

interface RepairCandidate {
  kind: "repair";
  personId: string;
  personName: string;
  ageDays: number;
  issue: string;
}

type Candidate = OverdueCandidate | RepairCandidate;

/**
 * Decide which signal — overdue contact or open repair — most deserves a
 * single nudge today. Returns null when there's nothing worth surfacing.
 *
 * The thresholds mirror `relationships.ts` insights so the page and the
 * background nudge agree on what counts as "needing attention":
 *   - Overdue: days since last contact > target * 1.3 AND >= 14 days. Target
 *     defaults to 14 for aligned/growth people, 30 otherwise, unless
 *     `contactFrequencyDays` is set explicitly.
 *   - Repair: any open repair item is eligible. We pick the oldest.
 */
export async function pickNudgeCandidate(userId: string): Promise<Candidate | null> {
  const allPeople = await db
    .select()
    .from(people)
    .where(and(eq(people.userId, userId), eq(people.isActive, true)));
  if (allPeople.length === 0) return null;

  const now = Date.now();
  const since = new Date(now - 90 * 24 * 60 * 60 * 1000);

  const [recentInter, openRepairs] = await Promise.all([
    db
      .select()
      .from(peopleInteractions)
      .where(
        and(
          eq(peopleInteractions.userId, userId),
          gte(peopleInteractions.occurredAt, since),
        ),
      ),
    db
      .select()
      .from(relationshipRepairs)
      .where(
        and(
          eq(relationshipRepairs.userId, userId),
          eq(relationshipRepairs.status, "open"),
        ),
      ),
  ]);

  // Index latest interaction per person from the recent window; fall back to
  // person.lastInteractionAt if nothing has happened in 90 days.
  const latestInter = new Map<string, Date>();
  for (const i of recentInter) {
    const ts = i.occurredAt ? new Date(i.occurredAt) : null;
    if (!ts) continue;
    const prev = latestInter.get(i.personId);
    if (!prev || ts > prev) latestInter.set(i.personId, ts);
  }

  let topOverdue: OverdueCandidate | null = null;
  for (const p of allPeople) {
    const last = latestInter.get(p.id) ?? (p.lastInteractionAt ? new Date(p.lastInteractionAt) : null);
    if (!last) continue;
    const daysSince = Math.floor((now - last.getTime()) / (1000 * 60 * 60 * 24));
    const target =
      p.contactFrequencyDays ??
      (p.category === "aligned" || p.category === "growth" ? 14 : 30);
    if (daysSince <= target * 1.3 || daysSince < 14) continue;
    const daysOverdue = daysSince - target;
    if (!topOverdue || daysOverdue > topOverdue.daysOverdue) {
      topOverdue = {
        kind: "overdue",
        personId: p.id,
        personName: p.name,
        daysSince,
        target,
        daysOverdue,
      };
    }
  }

  let topRepair: RepairCandidate | null = null;
  const peopleById = new Map(allPeople.map((p) => [p.id, p]));
  for (const r of openRepairs) {
    const owner = peopleById.get(r.personId);
    if (!owner) continue;
    const created = r.createdAt ? new Date(r.createdAt).getTime() : now;
    const ageDays = Math.max(0, Math.floor((now - created) / (1000 * 60 * 60 * 24)));
    if (!topRepair || ageDays > topRepair.ageDays) {
      topRepair = {
        kind: "repair",
        personId: r.personId,
        personName: owner.name,
        ageDays,
        issue: r.issue,
      };
    }
  }

  if (!topOverdue && !topRepair) return null;
  if (!topOverdue) return topRepair;
  if (!topRepair) return topOverdue;
  // Compare urgency scores. Repairs feel heavier so they win ties.
  const overdueScore = topOverdue.daysOverdue;
  const repairScore = topRepair.ageDays;
  return repairScore >= overdueScore ? topRepair : topOverdue;
}

function buildMessage(c: Candidate): { title: string; body: string } {
  if (c.kind === "overdue") {
    return {
      title: `Reach out to ${c.personName}?`,
      body:
        c.daysSince <= 30
          ? `It's been ${c.daysSince} days since you last connected. A short check-in could feel good for both of you.`
          : `It's been about ${c.daysSince} days. Even a quick "thinking of you" goes a long way.`,
    };
  }
  return {
    title: `Open repair with ${c.personName}`,
    body:
      c.ageDays === 0
        ? `You logged something to work through with ${c.personName}. Want to take a small step today?`
        : `You logged something to work through ${c.ageDays} day${c.ageDays === 1 ? "" : "s"} ago. A small step today could lighten the load.`,
  };
}

async function alreadyNudgedToday(userId: string, dayKey: string): Promise<boolean> {
  // We tag every nudge inbox row with metadata.kind = "relationship_nudge"
  // and metadata.date = YYYY-MM-DD so the dedupe survives restarts and
  // works without an extra ledger table.
  const [row] = await db
    .select({ id: notifications.id })
    .from(notifications)
    .where(
      and(
        eq(notifications.userId, userId),
        eq(notifications.type, "system"),
        sql`${notifications.metadata}->>'kind' = 'relationship_nudge'`,
        sql`${notifications.metadata}->>'date' = ${dayKey}`,
      ),
    )
    .limit(1);
  return !!row;
}

export async function runRelationshipNudgeForUser(
  userId: string,
  prefs: NotificationPreferences | null,
  now: Date = new Date(),
): Promise<{ sent: boolean; reason?: string; candidate?: Candidate }> {
  // Treat a missing prefs row the same as the on-by-default values so a user
  // who has tracked people but never opened Accountability Settings is still
  // eligible. The defaults match the schema column defaults.
  const accountabilityEnabled = prefs?.accountabilityEnabled ?? true;
  const relationshipNudgesEnabled = prefs?.relationshipNudgesEnabled ?? true;
  if (!accountabilityEnabled || !relationshipNudgesEnabled) {
    return { sent: false, reason: "muted" };
  }
  if (prefs && isInQuietHours(now, prefs)) {
    return { sent: false, reason: "quiet_hours" };
  }

  const dayKey = localDayKey(now);
  if (await alreadyNudgedToday(userId, dayKey)) {
    return { sent: false, reason: "already_sent_today" };
  }

  const candidate = await pickNudgeCandidate(userId);
  if (!candidate) return { sent: false, reason: "no_signal" };

  const { title, body } = buildMessage(candidate);
  const actionUrl = `/relationships?personId=${candidate.personId}`;

  // Always create the inbox card first so the dedupe row exists even if the
  // push transport is offline. The page UX still wins ("you have a nudge
  // about X") even when the device push fails.
  await db.insert(notifications).values({
    userId,
    type: "system",
    title,
    body,
    actionUrl,
    metadata: {
      kind: "relationship_nudge",
      date: dayKey,
      personId: candidate.personId,
      signal: candidate.kind,
    },
  });

  // Best-effort push. Failures are logged inside sendPushToUser; any thrown
  // exception is swallowed so the inbox card remains the source of truth.
  try {
    await sendPushToUser(userId, {
      title,
      body,
      notificationType: "relationship_nudge",
      url: actionUrl,
      tag: `relationship-nudge:${dayKey}`,
    });
  } catch (err) {
    console.error("[relationship-nudges] push send failed:", err);
  }

  return { sent: true, candidate };
}

/**
 * Sweep every user with at least one tracked person, respecting shard
 * ownership. Eligibility is independent of push enrollment — users without
 * a push subscription still receive the inbox card, and the push step is
 * best-effort inside `runRelationshipNudgeForUser`. Returns the per-user
 * outcomes for tests / observability.
 */
export async function runRelationshipNudgesTick(
  now: Date = new Date(),
): Promise<{ scanned: number; sent: number }> {
  let scanned = 0;
  let sent = 0;
  try {
    const rows = await db
      .selectDistinct({ userId: people.userId })
      .from(people);
    const userIds = rows
      .map((r) => r.userId)
      .filter((id): id is string => !!id && isUserInShard(id));
    for (const userId of userIds) {
      scanned++;
      try {
        // `getNotificationPreferences` lazily inserts a defaults row when one
        // doesn't exist, so users who've never opened settings still get
        // sensible behavior rather than being silently skipped.
        const prefs = await getNotificationPreferences(userId);
        const result = await runRelationshipNudgeForUser(userId, prefs, now);
        if (result.sent) sent++;
      } catch (perUserErr) {
        console.error(
          `[relationship-nudges] tick failed for user ${userId}:`,
          perUserErr,
        );
      }
    }
  } catch (err) {
    console.error("[relationship-nudges] tick top-level error:", err);
  }
  return { scanned, sent };
}

export function startRelationshipNudgesScheduler(): void {
  if (schedulerHandle) return;
  // Stagger the first tick by ~1 minute so we don't pile on top of the
  // reminder-scheduler boot sequence and give the lease manager a chance to
  // settle the shard config.
  setTimeout(() => {
    void runRelationshipNudgesTick();
    schedulerHandle = setInterval(() => {
      void runRelationshipNudgesTick();
    }, NUDGE_TICK_INTERVAL_MS);
  }, 60 * 1000);
  console.log("[relationship-nudges] daily nudge scheduler started.");
}

export function stopRelationshipNudgesScheduler(): void {
  if (schedulerHandle) {
    clearInterval(schedulerHandle);
    schedulerHandle = null;
  }
}
