/**
 * Energy Score — the primary metric in DWAI (Roadmap §15.8).
 *
 * Computes a 0–100 score from recent mood logs, wearable data (HRV, sleep),
 * and self-reported pulse check-ins. The score gates AI recommendations:
 *   • low  (0–33)  → recovery, spiritual, journal
 *   • steady (34–66) → goals, habits
 *   • high (67–100) → stretch tasks, workouts
 */

import { storage } from "../storage";
import { safeGetWearablesYesterday } from "../routes/wearables";

export type EnergyBand = "low" | "steady" | "high";

export interface EnergyScoreResult {
  /** 0–100 composite energy score. */
  score: number;
  /** Coarse band: low / steady / high. */
  band: EnergyBand;
  /** Contributing factors with their individual weight. */
  factors: EnergyFactor[];
  /** ISO timestamp when this was computed. */
  computedAt: string;
}

export interface EnergyFactor {
  source: "mood" | "sleep" | "hrv" | "activity" | "self_report";
  label: string;
  /** Normalized 0–100 contribution from this source. */
  value: number;
  /** How much weight this factor carried (0–1, sums to ~1). */
  weight: number;
}

/**
 * Compute the live energy score for a user.
 * Pulls mood logs, wearable data, and activity signals.
 */
export async function computeEnergyScore(userId: string): Promise<EnergyScoreResult> {
  const [moodLogs, wearablesYesterday] = await Promise.all([
    storage.getMoodLogs(userId).catch(() => []),
    safeGetWearablesYesterday(userId),
  ]);

  const factors: EnergyFactor[] = [];
  let weightedSum = 0;
  let totalWeight = 0;

  // ── Mood-based energy (latest self-reported energy level, 1–10 scale) ──
  const latestMood = moodLogs?.[0];
  if (latestMood) {
    const moodEnergy = Math.min(10, Math.max(1, latestMood.energyLevel ?? 5));
    const normalized = ((moodEnergy - 1) / 9) * 100;
    const weight = 0.4;
    factors.push({
      source: "self_report",
      label: "Self-reported energy",
      value: Math.round(normalized),
      weight,
    });
    weightedSum += normalized * weight;
    totalWeight += weight;

    // Mood level also contributes (low mood drags energy perception)
    const moodLevel = Math.min(10, Math.max(1, latestMood.moodLevel ?? 5));
    const moodNorm = ((moodLevel - 1) / 9) * 100;
    const moodWeight = 0.15;
    factors.push({
      source: "mood",
      label: "Mood level",
      value: Math.round(moodNorm),
      weight: moodWeight,
    });
    weightedSum += moodNorm * moodWeight;
    totalWeight += moodWeight;
  }

  // ── Sleep (from wearables) ──
  if (wearablesYesterday) {
    const sleepMinutes = (wearablesYesterday as any).sleepMinutes ??
      (wearablesYesterday as any).sleep_minutes ?? null;
    if (sleepMinutes != null && sleepMinutes > 0) {
      // Optimal 420–480 min (7–8h). Below 360 or above 600 is suboptimal.
      const optimal = 450;
      const deviation = Math.abs(sleepMinutes - optimal);
      const sleepScore = Math.max(0, 100 - (deviation / optimal) * 100);
      const weight = 0.2;
      factors.push({
        source: "sleep",
        label: `${Math.round(sleepMinutes / 60)}h sleep`,
        value: Math.round(sleepScore),
        weight,
      });
      weightedSum += sleepScore * weight;
      totalWeight += weight;
    }

    // ── HRV (higher is generally better recovery) ──
    const hrv = (wearablesYesterday as any).hrv ?? null;
    if (hrv != null && hrv > 0) {
      // Normalize: assume range 20–100 ms. Clamp and scale.
      const clamped = Math.min(100, Math.max(20, hrv));
      const hrvScore = ((clamped - 20) / 80) * 100;
      const weight = 0.15;
      factors.push({
        source: "hrv",
        label: `HRV ${hrv}ms`,
        value: Math.round(hrvScore),
        weight,
      });
      weightedSum += hrvScore * weight;
      totalWeight += weight;
    }

    // ── Activity (steps) ──
    const steps = (wearablesYesterday as any).steps ?? null;
    if (steps != null && steps > 0) {
      // 10000 steps = full score. Anything above caps at 100.
      const actScore = Math.min(100, (steps / 10000) * 100);
      const weight = 0.1;
      factors.push({
        source: "activity",
        label: `${steps.toLocaleString()} steps`,
        value: Math.round(actScore),
        weight,
      });
      weightedSum += actScore * weight;
      totalWeight += weight;
    }
  }

  // If no data at all, default to 50 (neutral)
  let score: number;
  if (totalWeight === 0) {
    score = 50;
  } else {
    score = Math.round(weightedSum / totalWeight);
  }

  score = Math.min(100, Math.max(0, score));

  const band: EnergyBand = score <= 33 ? "low" : score <= 66 ? "steady" : "high";

  return {
    score,
    band,
    factors,
    computedAt: new Date().toISOString(),
  };
}

/**
 * Returns a brief text description of energy state for injection into AI prompts.
 */
export function energyToPromptContext(result: EnergyScoreResult): string {
  const factorText = result.factors
    .map((f) => `${f.label}: ${f.value}/100`)
    .join(", ");
  return `Energy: ${result.score}/100 (${result.band}). Factors: ${factorText || "no data yet"}.`;
}
