/**
 * daily-checkin-signals – utility for PR3 momentum/stagnation detection.
 *
 * Exposes a small hook and helper that PR3 can consume to incorporate
 * daily check-in data as signals. Returns an empty array when no check-ins
 * exist — never fabricates values.
 */

import { useRecentCheckins } from "@/hooks/use-daily-checkin";

export interface CheckinSignal {
  date: string;
  moodScore: number; // 1–5
  constraintType: string;
}

/**
 * Returns recent daily check-in signals for momentum/elevation plan use.
 * If no check-ins exist the array will be empty — callers should handle that.
 */
export function useCheckinSignals(days = 14): { signals: CheckinSignal[]; isLoading: boolean } {
  const { checkins, isLoading } = useRecentCheckins(days);

  const signals: CheckinSignal[] = checkins.map((c) => ({
    date: c.date,
    moodScore: c.moodScore,
    constraintType: c.constraintType,
  }));

  return { signals, isLoading };
}

/**
 * Derives a simple momentum hint from recent signals.
 * Returns null if there are no signals to avoid fabricating insights.
 */
export function deriveMomentumHint(signals: CheckinSignal[]): string | null {
  if (signals.length === 0) return null;

  // Sort descending so we always operate on the most recent days first
  const sortedByDateDesc = [...signals].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  const recent = sortedByDateDesc.slice(0, 7); // most recent 7 days
  const avgMood = recent.reduce((sum, s) => sum + s.moodScore, 0) / recent.length;

  const constraintCounts: Record<string, number> = {};
  for (const s of recent) {
    if (s.constraintType !== "Nothing major") {
      constraintCounts[s.constraintType] = (constraintCounts[s.constraintType] ?? 0) + 1;
    }
  }
  const topConstraint = Object.entries(constraintCounts).sort((a, b) => b[1] - a[1])[0]?.[0];

  if (avgMood >= 4) {
    return topConstraint
      ? `Energy has been high lately. Main friction: ${topConstraint}.`
      : "Energy has been high lately — good time to take on a stretch goal.";
  }
  if (avgMood <= 2) {
    return topConstraint
      ? `Energy has been low. Top constraint: ${topConstraint}. Consider lighter tasks.`
      : "Energy has been low recently. Protect recovery time.";
  }
  return topConstraint
    ? `Energy is steady. Watch for ${topConstraint} as a recurring friction.`
    : "Energy is steady. No major recurring constraints are showing up.";
}
