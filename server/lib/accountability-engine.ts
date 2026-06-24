/**
 * Accountability Engine — gentle challenge system (Roadmap §15.7).
 *
 * Joins stated intent (goals, chat declarations) → measured action
 * (habit_logs, activity_completions, tasks) → blockers (journal, mood)
 * and emits structured "gentle challenge" prompts.
 *
 * Key principle: NEVER shaming, always optional, always tied to the
 * user's own stated goals.
 */

import { storage } from "../storage";

export interface AccountabilityChallenge {
  id: string;
  type: "gap" | "stall" | "pattern";
  /** What the user said they wanted. */
  statedIntent: string;
  /** What actually happened. */
  measuredAction: string;
  /** Gentle challenge prompt for DW to deliver. */
  prompt: string;
  /** Suggested route to take action. */
  actionRoute: string;
  /** Priority for scheduling delivery. */
  priority: "high" | "medium" | "low";
  /** ISO timestamp of when this was generated. */
  generatedAt: string;
}

/**
 * Analyze the gap between what a user stated they want and what they've done.
 * Returns structured challenges that DW can deliver through notifications or chat.
 */
export async function generateAccountabilityChallenges(
  userId: string,
): Promise<AccountabilityChallenge[]> {
  const challenges: AccountabilityChallenge[] = [];
  const now = Date.now();

  const [goals, habits] = await Promise.all([
    storage.getGoals(userId).catch(() => []),
    storage.getHabits(userId).catch(() => []),
  ]);

  // ── Habit gaps: active habits with no logs in the last 3+ days ──
  const activeHabits = habits.filter((h) => h.isActive);
  const threeDaysAgo = new Date(now - 3 * 24 * 60 * 60 * 1000);

  // Fetch logs for each active habit (limited to avoid excessive queries)
  const habitsToCheck = activeHabits.slice(0, 10);
  const allHabitLogs = await Promise.all(
    habitsToCheck.map((h) => storage.getHabitLogs(h.id).catch(() => [])),
  );

  for (let i = 0; i < habitsToCheck.length; i++) {
    const habit = habitsToCheck[i];
    const habitLogs = allHabitLogs[i];

    const recentLogs = habitLogs.filter(
      (l) => l.completedAt && new Date(l.completedAt) >= threeDaysAgo,
    );

    if (recentLogs.length === 0) {
      // Find when last completed
      const sortedLogs = habitLogs
        .filter((l) => l.completedAt)
        .sort((a, b) => new Date(b.completedAt!).getTime() - new Date(a.completedAt!).getTime());

      const lastDone = sortedLogs[0];
      const daysSince = lastDone?.completedAt
        ? Math.floor((now - new Date(lastDone.completedAt).getTime()) / (24 * 60 * 60 * 1000))
        : null;

      if (daysSince != null && daysSince >= 3) {
        challenges.push({
          id: `habit-gap-${habit.id}`,
          type: "gap",
          statedIntent: `You set up "${habit.title}" as a ${habit.frequency ?? "daily"} habit.`,
          measuredAction: `It's been ${daysSince} days since you last did it.`,
          prompt: `"${habit.title}" hasn't happened in ${daysSince} days. Want to talk about what's getting in the way — or should we adjust the frequency?`,
          actionRoute: "/habits",
          priority: daysSince >= 7 ? "high" : "medium",
          generatedAt: new Date().toISOString(),
        });
      }
    }
  }

  // ── Goal stalls: active goals with no progress signals ──
  const activeGoals = goals.filter((g) => g.isActive);
  const twoWeeksAgo = new Date(now - 14 * 24 * 60 * 60 * 1000);

  // Build a set of habit IDs with recent activity (from already-fetched logs)
  const habitsWithRecentActivity = new Set<string>();
  for (let i = 0; i < habitsToCheck.length; i++) {
    const logs = allHabitLogs[i];
    const hasRecent = logs.some((l) => l.completedAt && new Date(l.completedAt) >= twoWeeksAgo);
    if (hasRecent) habitsWithRecentActivity.add(habitsToCheck[i].id);
  }

  for (const goal of activeGoals) {
    const goalCreated = goal.createdAt ? new Date(goal.createdAt) : null;
    if (!goalCreated || goalCreated > twoWeeksAgo) continue;

    // Check if the goal has related habits with activity
    const relatedHabits = activeHabits.filter(
      (h) => h.title.toLowerCase().includes(goal.title.toLowerCase().split(" ")[0]),
    );
    const hasRecentActivity = relatedHabits.some((rh) => habitsWithRecentActivity.has(rh.id));

    if (!hasRecentActivity && relatedHabits.length === 0) {
      challenges.push({
        id: `goal-stall-${goal.id}`,
        type: "stall",
        statedIntent: `You set a goal: "${goal.title}".`,
        measuredAction: "No connected habits or recent activity toward this goal.",
        prompt: `You said "${goal.title}" matters to you. It's been quiet on that front — would a small daily habit help move it forward?`,
        actionRoute: "/goals",
        priority: "medium",
        generatedAt: new Date().toISOString(),
      });
    }
  }

  // Limit to top 3 challenges to avoid overwhelming
  return challenges
    .sort((a, b) => {
      const pri = { high: 0, medium: 1, low: 2 };
      return pri[a.priority] - pri[b.priority];
    })
    .slice(0, 3);
}
