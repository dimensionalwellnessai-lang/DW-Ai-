/**
 * Cross-Dimensional Insights — correlation engine (Roadmap §15.5).
 *
 * Runs scheduled correlation passes across pre-defined cross-domain pairs
 * (mood × sleep, mood × exercise, finances × stress, etc.) and persists
 * human-readable findings.
 *
 * This module can be called:
 *   1. On-demand via GET /api/insights/cross-dimensional
 *   2. By a future scheduler (lease-coordinated via scheduler_leases)
 */

import { storage } from "../storage";
import { db } from "../db";
import { moodLogs, wearableData, workoutSessions } from "@shared/schema";
import { and, desc, eq, gte } from "drizzle-orm";

export interface CrossDimensionalInsight {
  id: string;
  dimensionA: string;
  dimensionB: string;
  correlation: "positive" | "negative" | "none";
  confidence: "low" | "medium" | "high";
  humanText: string;
  dataPoints: number;
  computedAt: string;
}

interface DataPoint {
  date: string;
  valueA: number;
  valueB: number;
}

/**
 * Compute Pearson correlation coefficient for two arrays of values.
 */
function pearsonCorrelation(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 3) return 0;

  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;

  let num = 0;
  let denX = 0;
  let denY = 0;
  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    num += dx * dy;
    denX += dx * dx;
    denY += dy * dy;
  }

  const den = Math.sqrt(denX * denY);
  return den === 0 ? 0 : num / den;
}

function correlationDirection(r: number): "positive" | "negative" | "none" {
  if (r > 0.3) return "positive";
  if (r < -0.3) return "negative";
  return "none";
}

function correlationConfidence(r: number, n: number): "low" | "medium" | "high" {
  const absR = Math.abs(r);
  if (n < 7 || absR < 0.3) return "low";
  if (n >= 14 && absR >= 0.5) return "high";
  return "medium";
}

/**
 * Generate cross-dimensional insights for a user based on their last 30 days.
 */
export async function generateCrossInsights(userId: string): Promise<CrossDimensionalInsight[]> {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const insights: CrossDimensionalInsight[] = [];

  // Fetch mood logs
  const moods = await db
    .select()
    .from(moodLogs)
    .where(and(eq(moodLogs.userId, userId), gte(moodLogs.createdAt, thirtyDaysAgo)))
    .orderBy(desc(moodLogs.createdAt))
    .limit(90)
    .catch(() => []);

  // Build a date -> mood map
  const moodByDate = new Map<string, { energy: number; mood: number }>();
  for (const m of moods) {
    const date = m.createdAt ? new Date(m.createdAt).toISOString().slice(0, 10) : null;
    if (!date) continue;
    if (!moodByDate.has(date)) {
      moodByDate.set(date, { energy: m.energyLevel, mood: m.moodLevel });
    }
  }

  // Fetch wearable data for sleep correlation
  let wearables: any[] = [];
  try {
    wearables = await db
      .select()
      .from(wearableData)
      .where(and(eq(wearableData.userId, userId), gte(wearableData.recordedAt, thirtyDaysAgo)))
      .orderBy(desc(wearableData.recordedAt))
      .limit(90);
  } catch { /* table may not have data */ }

  // Wearable data uses metricKind (sleep_minutes, hrv, steps) with metricValue,
  // plus dedicated columns (hrvScore, sleepQuality) as fallback.
  const sleepByDate = new Map<string, number>();
  const hrvByDate = new Map<string, number>();

  for (const w of wearables) {
    const date = w.recordedAt ? new Date(w.recordedAt).toISOString().slice(0, 10) : null;
    if (!date) continue;
    if (w.metricKind === "sleep_minutes" && w.metricValue != null) sleepByDate.set(date, w.metricValue);
    else if (w.metricKind === "hrv" && w.metricValue != null) hrvByDate.set(date, w.metricValue);
    // Fallback: dedicated columns
    if (!sleepByDate.has(date) && w.sleepQuality != null) sleepByDate.set(date, w.sleepQuality * 4.8);
    if (!hrvByDate.has(date) && w.hrvScore != null) hrvByDate.set(date, w.hrvScore);
  }

  // Sleep × Mood correlation
  const sleepMoodPoints: DataPoint[] = [];
  for (const [date, sleepVal] of sleepByDate) {
    const moodEntry = moodByDate.get(date);
    if (moodEntry) {
      sleepMoodPoints.push({ date, valueA: sleepVal / 60, valueB: moodEntry.mood });
    }
  }

  if (sleepMoodPoints.length >= 5) {
    const r = pearsonCorrelation(
      sleepMoodPoints.map((p) => p.valueA),
      sleepMoodPoints.map((p) => p.valueB),
    );
    const dir = correlationDirection(r);
    const conf = correlationConfidence(r, sleepMoodPoints.length);
    if (dir !== "none") {
      const avgSleep = sleepMoodPoints.reduce((s, p) => s + p.valueA, 0) / sleepMoodPoints.length;
      insights.push({
        id: `sleep-mood-${userId}`,
        dimensionA: "sleep",
        dimensionB: "mood",
        correlation: dir,
        confidence: conf,
        humanText: dir === "positive"
          ? `Your mood improves on days you sleep more. Averaging ${avgSleep.toFixed(1)}h — even 30 more minutes could help.`
          : `Interestingly, your mood dips on longer-sleep days. This could indicate oversleeping on low-mood days.`,
        dataPoints: sleepMoodPoints.length,
        computedAt: new Date().toISOString(),
      });
    }
  }

  // Sleep × Energy correlation
  const sleepEnergyPoints: DataPoint[] = [];
  for (const [date, sleepVal] of sleepByDate) {
    const moodEntry = moodByDate.get(date);
    if (moodEntry) {
      sleepEnergyPoints.push({ date, valueA: sleepVal / 60, valueB: moodEntry.energy });
    }
  }

  if (sleepEnergyPoints.length >= 5) {
    const r = pearsonCorrelation(
      sleepEnergyPoints.map((p) => p.valueA),
      sleepEnergyPoints.map((p) => p.valueB),
    );
    const dir = correlationDirection(r);
    const conf = correlationConfidence(r, sleepEnergyPoints.length);
    if (dir !== "none") {
      insights.push({
        id: `sleep-energy-${userId}`,
        dimensionA: "sleep",
        dimensionB: "energy",
        correlation: dir,
        confidence: conf,
        humanText: dir === "positive"
          ? `Your energy levels rise with better sleep — prioritizing sleep directly powers your day.`
          : `Your energy seems disconnected from sleep length. Quality might matter more than quantity.`,
        dataPoints: sleepEnergyPoints.length,
        computedAt: new Date().toISOString(),
      });
    }
  }

  // Exercise × Mood (workout sessions)
  let workouts: any[] = [];
  try {
    workouts = await db
      .select()
      .from(workoutSessions)
      .where(and(eq(workoutSessions.userId, userId), gte(workoutSessions.startedAt, thirtyDaysAgo)))
      .limit(90);
  } catch { /* table may not have data */ }

  const workoutDates = new Set(
    workouts
      .filter((w) => w.startedAt)
      .map((w) => new Date(w.startedAt!).toISOString().slice(0, 10)),
  );

  // Compare mood on workout days vs non-workout days
  const workoutDayMoods: number[] = [];
  const nonWorkoutDayMoods: number[] = [];
  for (const [date, m] of moodByDate) {
    if (workoutDates.has(date)) {
      workoutDayMoods.push(m.mood);
    } else {
      nonWorkoutDayMoods.push(m.mood);
    }
  }

  if (workoutDayMoods.length >= 3 && nonWorkoutDayMoods.length >= 3) {
    const avgWorkout = workoutDayMoods.reduce((a, b) => a + b, 0) / workoutDayMoods.length;
    const avgNon = nonWorkoutDayMoods.reduce((a, b) => a + b, 0) / nonWorkoutDayMoods.length;
    const diff = avgWorkout - avgNon;

    if (Math.abs(diff) > 0.5) {
      insights.push({
        id: `exercise-mood-${userId}`,
        dimensionA: "exercise",
        dimensionB: "mood",
        correlation: diff > 0 ? "positive" : "negative",
        confidence: workoutDayMoods.length >= 7 ? "high" : "medium",
        humanText: diff > 0
          ? `Your mood averages ${avgWorkout.toFixed(1)}/10 on workout days vs ${avgNon.toFixed(1)}/10 on rest days. Movement lifts you.`
          : `Your mood is actually lower on workout days. You might be pushing too hard — try lighter sessions.`,
        dataPoints: workoutDayMoods.length + nonWorkoutDayMoods.length,
        computedAt: new Date().toISOString(),
      });
    }
  }

  return insights;
}
