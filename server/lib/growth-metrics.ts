/**
 * Growth metrics — the level-up progress model.
 *
 * One place computes how a user is trending toward their next role-map
 * level, blending: milestone completion (role map), habit consistency
 * (trailing 7 days of habit logs), goal progress (active goals), group
 * challenge check-ins (trailing 7 days) and, where available, wearable
 * averages (sleep, steps). The result feeds:
 *   - the /api/level-progress endpoints (My Level page),
 *   - daily growth_snapshots rows (trend charts), and
 *   - DW's guide context (advice grounded in the same numbers the user sees).
 */

import { and, desc, eq, gte, inArray, isNull, sql } from "drizzle-orm";
import { db } from "../db";
import {
  goals,
  groupChallengeCheckins,
  groupChallengeParticipants,
  growthSnapshots,
  habitLogs,
  habits,
  roleMaps,
  wearableData,
  type GrowthSnapshot,
  type RoleMapLevel,
} from "@shared/schema";

export interface GrowthContribution {
  key: "milestones" | "habits" | "goals" | "challenge" | "wearable";
  label: string;
  /** 0-100 where meaningful; challenge uses raw count in `detail`. */
  value: number;
  detail: string;
  route: string;
}

export interface GrowthMetrics {
  roleMap: {
    id: string;
    targetRole: string;
    currentLevel: number;
    maxLevel: number;
    currentLevelTitle?: string;
    nextLevelTitle?: string;
    milestonesDone: number;
    milestonesTotal: number;
    nextMilestones: Array<{ id: string; title: string; done: boolean }>;
    ladder: Array<{ level: number; title: string; milestonesDone: number; milestonesTotal: number }>;
  } | null;
  /** 0-100: % of next-level milestones completed (0 when no role map). */
  levelProgressPct: number;
  /** 0-100: habit completion rate over trailing 7 days. */
  habitConsistencyPct: number;
  activeHabitCount: number;
  /** 0-100: average progress across active goals. */
  goalProgressAvg: number;
  activeGoalCount: number;
  /** Group challenge check-ins in trailing 7 days. */
  challengeCheckins7d: number;
  wearable: { sleepMinutesAvg?: number; stepsAvg?: number } | null;
  contributions: GrowthContribution[];
}

const DAY_MS = 86_400_000;

export async function computeGrowthMetrics(userId: string): Promise<GrowthMetrics> {
  const now = new Date();
  const since7d = new Date(now.getTime() - 7 * DAY_MS);
  const since7dKey = since7d.toISOString().slice(0, 10);

  const [rmRows, activeHabits, activeGoals, checkinRows, wearRows] = await Promise.all([
    db
      .select()
      .from(roleMaps)
      .where(and(eq(roleMaps.userId, userId), eq(roleMaps.status, "active")))
      .limit(1),
    db
      .select()
      .from(habits)
      .where(and(eq(habits.userId, userId), eq(habits.isActive, true))),
    db
      .select()
      .from(goals)
      .where(and(eq(goals.userId, userId), eq(goals.isActive, true))),
    db
      .select({ dateKey: groupChallengeCheckins.dateKey })
      .from(groupChallengeCheckins)
      .innerJoin(
        groupChallengeParticipants,
        and(
          eq(groupChallengeParticipants.challengeId, groupChallengeCheckins.challengeId),
          eq(groupChallengeParticipants.userId, groupChallengeCheckins.userId),
        ),
      )
      .where(
        and(
          eq(groupChallengeCheckins.userId, userId),
          isNull(groupChallengeParticipants.leftAt),
          gte(groupChallengeCheckins.dateKey, since7dKey),
        ),
      ),
    db
      .select({
        metricKind: wearableData.metricKind,
        avg: sql<number>`avg(${wearableData.metricValue})`,
      })
      .from(wearableData)
      .where(
        and(
          eq(wearableData.userId, userId),
          inArray(wearableData.metricKind, ["sleep_minutes", "steps"]),
          gte(wearableData.recordedAt, since7d),
        ),
      )
      .groupBy(wearableData.metricKind),
  ]);

  // ── Habit consistency: completed logs / (active habits × 7 days) ──
  let habitConsistencyPct = 0;
  if (activeHabits.length) {
    const habitIds = activeHabits.map((h) => h.id);
    // Count unique (habit, day) completions so duplicate same-day logs
    // can't inflate the consistency score.
    const [logCount] = await db
      .select({
        count: sql<number>`count(DISTINCT (${habitLogs.habitId}, date_trunc('day', ${habitLogs.completedAt})))::int`,
      })
      .from(habitLogs)
      .where(and(inArray(habitLogs.habitId, habitIds), gte(habitLogs.completedAt, since7d)));
    const possible = activeHabits.length * 7;
    habitConsistencyPct = Math.min(
      100,
      Math.round(((logCount?.count ?? 0) / possible) * 100),
    );
  }

  // ── Goal progress ──
  const goalProgressAvg = activeGoals.length
    ? Math.round(
        activeGoals.reduce((sum, g) => {
          const target = g.targetValue || 100;
          return sum + Math.min(100, ((g.progress ?? 0) / target) * 100);
        }, 0) / activeGoals.length,
      )
    : 0;

  // ── Role map / milestones ──
  const rm = rmRows[0] ?? null;
  let roleMapCtx: GrowthMetrics["roleMap"] = null;
  let levelProgressPct = 0;
  if (rm) {
    const levels = (Array.isArray(rm.levels) ? rm.levels : []) as RoleMapLevel[];
    const maxLevel = levels.length ? Math.max(...levels.map((l) => l.level)) : rm.currentLevel;
    const currentDef = levels.find((l) => l.level === rm.currentLevel);
    const nextDef = levels.find((l) => l.level === rm.currentLevel + 1) ?? currentDef;
    const ms = nextDef?.milestones ?? [];
    const done = ms.filter((m) => m.done).length;
    levelProgressPct = ms.length ? Math.round((done / ms.length) * 100) : 0;
    roleMapCtx = {
      id: rm.id,
      targetRole: rm.targetRole,
      currentLevel: rm.currentLevel,
      maxLevel,
      currentLevelTitle: currentDef?.title,
      nextLevelTitle: nextDef?.title,
      milestonesDone: done,
      milestonesTotal: ms.length,
      nextMilestones: ms.map((m) => ({ id: m.id, title: m.title, done: !!m.done })),
      ladder: levels
        .slice()
        .sort((a, b) => a.level - b.level)
        .map((l) => ({
          level: l.level,
          title: l.title,
          milestonesDone: (l.milestones ?? []).filter((m) => m.done).length,
          milestonesTotal: (l.milestones ?? []).length,
        })),
    };
  }

  // ── Wearable averages ──
  let wearable: GrowthMetrics["wearable"] = null;
  for (const row of wearRows) {
    const avg = row.avg == null ? null : Math.round(Number(row.avg));
    if (avg == null) continue;
    wearable = wearable ?? {};
    if (row.metricKind === "sleep_minutes") wearable.sleepMinutesAvg = avg;
    if (row.metricKind === "steps") wearable.stepsAvg = avg;
  }

  const challengeCheckins7d = new Set(checkinRows.map((c) => c.dateKey)).size;

  const contributions: GrowthContribution[] = [];
  if (roleMapCtx) {
    contributions.push({
      key: "milestones",
      label: "Next-level milestones",
      value: levelProgressPct,
      detail: `${roleMapCtx.milestonesDone}/${roleMapCtx.milestonesTotal} done toward ${roleMapCtx.nextLevelTitle ?? "your next level"}`,
      route: "/role-map",
    });
  }
  contributions.push({
    key: "habits",
    label: "Habit consistency (7d)",
    value: habitConsistencyPct,
    detail: activeHabits.length
      ? `${activeHabits.length} active habit${activeHabits.length === 1 ? "" : "s"}, ${habitConsistencyPct}% of possible completions`
      : "No active habits yet",
    route: "/life-blueprint",
  });
  contributions.push({
    key: "goals",
    label: "Goal progress",
    value: goalProgressAvg,
    detail: activeGoals.length
      ? `${activeGoals.length} active goal${activeGoals.length === 1 ? "" : "s"}, avg ${goalProgressAvg}%`
      : "No active goals yet",
    route: "/life-blueprint",
  });
  contributions.push({
    key: "challenge",
    label: "Challenge check-ins (7d)",
    value: Math.min(100, Math.round((challengeCheckins7d / 7) * 100)),
    detail: `${challengeCheckins7d} check-in${challengeCheckins7d === 1 ? "" : "s"} this week`,
    route: "/group-challenges",
  });
  if (wearable) {
    const bits: string[] = [];
    if (wearable.sleepMinutesAvg != null)
      bits.push(`sleep ${Math.round(wearable.sleepMinutesAvg / 60 * 10) / 10}h avg`);
    if (wearable.stepsAvg != null) bits.push(`${wearable.stepsAvg.toLocaleString()} steps avg`);
    contributions.push({
      key: "wearable",
      label: "Body signals (7d)",
      value: 0,
      detail: bits.join(" • "),
      route: "/wearable-manager",
    });
  }

  return {
    roleMap: roleMapCtx,
    levelProgressPct,
    habitConsistencyPct,
    activeHabitCount: activeHabits.length,
    goalProgressAvg,
    activeGoalCount: activeGoals.length,
    challengeCheckins7d,
    wearable,
    contributions,
  };
}

/** Upsert today's (UTC) growth snapshot from computed metrics. */
export async function upsertTodayGrowthSnapshot(
  userId: string,
  m: GrowthMetrics,
): Promise<void> {
  const dateKey = new Date().toISOString().slice(0, 10);
  await db
    .insert(growthSnapshots)
    .values({
      userId,
      dateKey,
      roleMapId: m.roleMap?.id ?? null,
      currentLevel: m.roleMap?.currentLevel ?? null,
      milestonesDone: m.roleMap?.milestonesDone ?? 0,
      milestonesTotal: m.roleMap?.milestonesTotal ?? 0,
      levelProgressPct: m.levelProgressPct,
      habitConsistencyPct: m.habitConsistencyPct,
      goalProgressAvg: m.goalProgressAvg,
      challengeCheckins7d: m.challengeCheckins7d,
      wearable: m.wearable,
    })
    .onConflictDoUpdate({
      target: [growthSnapshots.userId, growthSnapshots.dateKey],
      set: {
        roleMapId: m.roleMap?.id ?? null,
        currentLevel: m.roleMap?.currentLevel ?? null,
        milestonesDone: m.roleMap?.milestonesDone ?? 0,
        milestonesTotal: m.roleMap?.milestonesTotal ?? 0,
        levelProgressPct: m.levelProgressPct,
        habitConsistencyPct: m.habitConsistencyPct,
        goalProgressAvg: m.goalProgressAvg,
        challengeCheckins7d: m.challengeCheckins7d,
        wearable: m.wearable,
      },
    });
}

export async function getGrowthTrends(
  userId: string,
  days: number,
): Promise<GrowthSnapshot[]> {
  const sinceKey = new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
  return db
    .select()
    .from(growthSnapshots)
    .where(and(eq(growthSnapshots.userId, userId), gte(growthSnapshots.dateKey, sinceKey)))
    .orderBy(growthSnapshots.dateKey);
}

export interface GrowthReview {
  period: "week" | "month";
  from: string | null;
  to: string | null;
  wins: string[];
  deltas: {
    levelProgressPct: number;
    habitConsistencyPct: number;
    goalProgressAvg: number;
    challengeCheckins7d: number;
  } | null;
  /** The single highest-leverage next action. */
  focus: { title: string; reason: string; route: string } | null;
}

/**
 * Rule-based growth review: compare the oldest and newest snapshot in the
 * period, name the wins, and pick ONE recommended focus — the weakest lever
 * that would most move level progress.
 */
export function buildGrowthReview(
  period: "week" | "month",
  series: GrowthSnapshot[],
  current: GrowthMetrics,
): GrowthReview {
  const first = series[0] ?? null;
  const last = series[series.length - 1] ?? null;
  const deltas =
    first && last && first.id !== last.id
      ? {
          levelProgressPct: last.levelProgressPct - first.levelProgressPct,
          habitConsistencyPct: last.habitConsistencyPct - first.habitConsistencyPct,
          goalProgressAvg: last.goalProgressAvg - first.goalProgressAvg,
          challengeCheckins7d: last.challengeCheckins7d - first.challengeCheckins7d,
        }
      : null;

  const wins: string[] = [];
  if (deltas) {
    if (deltas.levelProgressPct > 0)
      wins.push(`Milestone progress up ${deltas.levelProgressPct} points`);
    if (deltas.habitConsistencyPct > 0)
      wins.push(`Habit consistency up ${deltas.habitConsistencyPct} points`);
    if (deltas.goalProgressAvg > 0)
      wins.push(`Goal progress up ${deltas.goalProgressAvg} points`);
    if (deltas.challengeCheckins7d > 0)
      wins.push(`${deltas.challengeCheckins7d} more challenge check-ins per week`);
  }
  if (!wins.length) {
    if (current.habitConsistencyPct >= 70) wins.push(`Strong habit consistency (${current.habitConsistencyPct}%)`);
    if (current.challengeCheckins7d >= 5) wins.push(`${current.challengeCheckins7d} challenge check-ins this week`);
    if (current.levelProgressPct >= 50 && current.roleMap)
      wins.push(`Over halfway to ${current.roleMap.nextLevelTitle ?? "your next level"}`);
  }

  // Single focus: the weakest meaningful lever.
  let focus: GrowthReview["focus"] = null;
  if (current.roleMap && current.roleMap.milestonesTotal > 0 && current.levelProgressPct < 100) {
    const nextUndone = current.roleMap.nextMilestones.find((m) => !m.done);
    if (current.habitConsistencyPct < 40 && current.activeHabitCount > 0) {
      focus = {
        title: "Rebuild your daily habit rhythm",
        reason: `Habit consistency is at ${current.habitConsistencyPct}% — steady reps are what move your milestones.`,
        route: "/life-blueprint",
      };
    } else if (nextUndone) {
      focus = {
        title: `Finish "${nextUndone.title}"`,
        reason: `It's your next milestone toward ${current.roleMap.nextLevelTitle ?? "the next level"} (${current.roleMap.milestonesDone}/${current.roleMap.milestonesTotal} done).`,
        route: "/role-map",
      };
    }
  } else if (!current.roleMap) {
    focus = {
      title: "Create your role map",
      reason: "Level tracking starts with a ladder — build one with DW in a few minutes.",
      route: "/role-map",
    };
  } else if (current.habitConsistencyPct < 60 && current.activeHabitCount > 0) {
    focus = {
      title: "Tighten habit consistency",
      reason: `You're at ${current.habitConsistencyPct}% this week — one more completed habit per day changes the trend.`,
      route: "/life-blueprint",
    };
  } else if (current.challengeCheckins7d < 3) {
    focus = {
      title: "Check in on your group challenge",
      reason: "Challenge check-ins are your easiest daily win right now.",
      route: "/group-challenges",
    };
  }

  return {
    period,
    from: first?.dateKey ?? null,
    to: last?.dateKey ?? null,
    wins: wins.slice(0, 5),
    deltas,
    focus,
  };
}
