/**
 * Mood Tracker Correlation Engine
 *
 * Computes "X is correlated with your mood" insights for the Correlations tab.
 *
 * Math: per-day Pearson correlation between a binary/numeric daily factor (did
 * the user meditate? log a habit? did a trigger event happen yesterday? hours
 * slept) and the user's average mood that day (1–10). We also compute an
 * **effect size** = (mean mood on factor=ON days) − (mean mood on factor=OFF
 * days) so the user sees "+1.3" rather than an abstract r value.
 *
 * Pearson r for paired (x, y) points:
 *   r = Σ((x − x̄)(y − ȳ)) / √(Σ(x − x̄)² · Σ(y − ȳ)²)
 *
 * Confidence is a coarse bucket from |r| and sample size:
 *   high   → n ≥ 14 AND |r| ≥ 0.4
 *   medium → n ≥ 7  AND |r| ≥ 0.25
 *   low    → otherwise
 *
 * Only factors with sample size ≥ 5 days AND at least 2 days in each bucket
 * (factor present / absent) are returned; the top 5 by |effect| are persisted.
 *
 * This is intentionally a v1 — simple, transparent, computed locally with no
 * external dependencies. Future versions could add lag terms, partial
 * correlations, or proper p-values.
 */
import { storage } from "./storage";
import type { InsertMoodInsight } from "@shared/schema";

type DayKey = string; // "YYYY-MM-DD"

function dayKey(d: Date): DayKey {
  return new Date(d).toISOString().slice(0, 10);
}

function pearson(xs: number[], ys: number[]): number {
  const n = xs.length;
  if (n < 2) return 0;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const a = xs[i] - mx;
    const b = ys[i] - my;
    num += a * b;
    dx += a * a;
    dy += b * b;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

function bucketConfidence(r: number, n: number): "low" | "medium" | "high" {
  const a = Math.abs(r);
  if (n >= 14 && a >= 0.4) return "high";
  if (n >= 7 && a >= 0.25) return "medium";
  return "low";
}

interface FactorBuilder {
  factor: string;
  label: string;
  /** Map of dayKey → numeric value (e.g. 0/1, sleep hours). */
  values: Map<DayKey, number>;
  /** True if this is a binary on/off factor (changes the description text). */
  binary: boolean;
}

function describeBinary(label: string, effect: number): string {
  const sign = effect >= 0 ? "+" : "";
  const direction = effect >= 0 ? "higher" : "lower";
  return `Your mood is ${sign}${effect.toFixed(1)} ${direction} on days you ${label.toLowerCase()}.`;
}

function describeNumeric(label: string, effect: number): string {
  const sign = effect >= 0 ? "+" : "";
  const direction = effect >= 0 ? "higher" : "lower";
  return `Above-average ${label.toLowerCase()} → ${sign}${effect.toFixed(1)} ${direction} mood.`;
}

/**
 * Build the per-day mood average over the last `days` days for a user.
 * Returns a Map keyed by YYYY-MM-DD with values in 1..10.
 */
async function getDailyMood(userId: string, days: number): Promise<Map<DayKey, number>> {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { logs } = await storage.getRecentMoodLogs(userId, since);
  const buckets = new Map<DayKey, { sum: number; n: number }>();
  for (const log of logs) {
    if (!log.createdAt) continue;
    const k = dayKey(log.createdAt);
    const b = buckets.get(k) ?? { sum: 0, n: 0 };
    b.sum += log.moodLevel;
    b.n += 1;
    buckets.set(k, b);
  }
  const result = new Map<DayKey, number>();
  Array.from(buckets.entries()).forEach(([k, { sum, n }]) => {
    result.set(k, sum / n);
  });
  return result;
}

/**
 * Compute and persist correlation insights for a single user. Returns the
 * resulting rows. Designed to be safe to re-run (uses upsert by user+factor).
 */
export async function computeMoodInsights(userId: string, days = 90): Promise<void> {
  const moodByDay = await getDailyMood(userId, days);
  // Need at least 5 days of mood data to bother.
  if (moodByDay.size < 5) {
    await storage.replaceMoodInsights(userId, []);
    return;
  }

  const factors: FactorBuilder[] = [];

  // ── Habits: one factor per habit (binary did/didn't log) ──────────────
  const habits = await storage.getHabits(userId);
  for (const habit of habits) {
    const logs = await storage.getHabitLogs(habit.id);
    const values = new Map<DayKey, number>();
    Array.from(moodByDay.keys()).forEach(k => values.set(k, 0));
    for (const log of logs) {
      if (!log.completedAt) continue;
      const k = dayKey(log.completedAt);
      if (values.has(k)) values.set(k, 1);
    }
    factors.push({
      factor: `habit:${habit.id}`,
      label: habit.title ?? "habit",
      values,
      binary: true,
    });
  }

  // Combined "any habit" factor (helpful when individual habits are sparse).
  if (habits.length > 0) {
    const values = new Map<DayKey, number>();
    Array.from(moodByDay.keys()).forEach(k => values.set(k, 0));
    for (const h of habits) {
      for (const log of await storage.getHabitLogs(h.id)) {
        if (!log.completedAt) continue;
        const k = dayKey(log.completedAt);
        if (values.has(k)) {
          values.set(k, (values.get(k) ?? 0) + 1);
        }
      }
    }
    factors.push({
      factor: "habit_count",
      label: "Habits completed",
      values,
      binary: false,
    });
  }

  // ── Trigger events: did a trigger fire today? ────────────────────────
  const triggers = await storage.listTriggerEvents(userId, 500);
  if (triggers.length > 0) {
    const sameDay = new Map<DayKey, number>();
    const nextDay = new Map<DayKey, number>();
    Array.from(moodByDay.keys()).forEach(k => {
      sameDay.set(k, 0);
      nextDay.set(k, 0);
    });
    for (const t of triggers) {
      if (!t.createdAt) continue;
      const k = dayKey(t.createdAt);
      if (sameDay.has(k)) sameDay.set(k, 1);
      const next = new Date(t.createdAt);
      next.setDate(next.getDate() + 1);
      const nk = dayKey(next);
      if (nextDay.has(nk)) nextDay.set(nk, 1);
    }
    factors.push({ factor: "trigger_event", label: "Logged a trigger event", values: sameDay, binary: true });
    factors.push({ factor: "trigger_event_prev_day", label: "Day after a trigger event", values: nextDay, binary: true });
  }

  // ── Meditation sessions ──────────────────────────────────────────────
  const meditationByDay = new Map<DayKey, number>();
  try {
    // Spiritual page may not be backed yet for everyone; storage may not have
    // this method on every deploy. Guard with optional chaining via cast.
    const getSessions = (storage as unknown as {
      getMeditationSessions?: (uid: string) => Promise<Array<{ completedAt: Date | null }>>;
    }).getMeditationSessions;
    if (typeof getSessions === "function") {
      const sessions = await getSessions.call(storage, userId);
      Array.from(moodByDay.keys()).forEach(k => meditationByDay.set(k, 0));
      for (const s of sessions) {
        if (!s.completedAt) continue;
        const k = dayKey(s.completedAt);
        if (meditationByDay.has(k)) meditationByDay.set(k, 1);
      }
      factors.push({ factor: "meditation", label: "Meditated", values: meditationByDay, binary: true });
    }
  } catch {
    // ignore — gracefully omit if not available
  }

  // ── Wearable sleep ───────────────────────────────────────────────────
  try {
    const wearable = await storage.getWearableData(userId, 1000);
    const sleepByDay = new Map<DayKey, { sum: number; n: number }>();
    for (const w of wearable) {
      const ts = w.recordedAt ?? w.timestamp;
      if (!ts) continue;
      let hours: number | null = null;
      if (w.metricKind === "sleep_minutes" && typeof w.metricValue === "number") {
        hours = w.metricValue / 60;
      } else if (typeof w.sleepQuality === "number") {
        // Fall back to 0–100 sleepQuality scaled to 0–10 hours equivalent so
        // the correlation is computable. Documented imperfectly here as a
        // proxy when no minute-level sleep data exists.
        hours = (w.sleepQuality / 100) * 10;
      }
      if (hours == null) continue;
      const k = dayKey(ts);
      const b = sleepByDay.get(k) ?? { sum: 0, n: 0 };
      b.sum += hours;
      b.n += 1;
      sleepByDay.set(k, b);
    }
    if (sleepByDay.size > 0) {
      const values = new Map<DayKey, number>();
      Array.from(sleepByDay.entries()).forEach(([k, { sum, n }]) => {
        values.set(k, sum / n);
      });
      factors.push({ factor: "sleep_hours", label: "Sleep hours", values, binary: false });
    }
  } catch {
    // ignore — wearables optional
  }

  // ── Compute effect + correlation per factor ──────────────────────────
  type Computed = InsertMoodInsight & { absEffect: number };
  const results: Computed[] = [];

  for (const f of factors) {
    const xs: number[] = [];
    const ys: number[] = [];
    for (const [k, mood] of Array.from(moodByDay.entries())) {
      const v = f.values.get(k);
      if (v === undefined) continue;
      xs.push(v);
      ys.push(mood);
    }
    const n = xs.length;
    if (n < 5) continue;

    let effect = 0;
    if (f.binary) {
      const onMoods = ys.filter((_, i) => xs[i] > 0);
      const offMoods = ys.filter((_, i) => xs[i] === 0);
      if (onMoods.length < 2 || offMoods.length < 2) continue;
      const meanOn = onMoods.reduce((a, b) => a + b, 0) / onMoods.length;
      const meanOff = offMoods.reduce((a, b) => a + b, 0) / offMoods.length;
      effect = meanOn - meanOff;
    } else {
      // For numeric factors compute mean(mood | x>median) - mean(mood | x≤median)
      const sorted = [...xs].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      const high = ys.filter((_, i) => xs[i] > median);
      const low = ys.filter((_, i) => xs[i] <= median);
      if (high.length < 2 || low.length < 2) continue;
      effect = (high.reduce((a, b) => a + b, 0) / high.length)
             - (low.reduce((a, b) => a + b, 0) / low.length);
    }

    const r = pearson(xs, ys);
    // Skip noise: tiny effects we won't bother surfacing.
    if (Math.abs(effect) < 0.2) continue;

    results.push({
      userId,
      factor: f.factor,
      label: f.label,
      effect: Number(effect.toFixed(2)),
      sampleSize: n,
      correlation: Number(r.toFixed(3)),
      confidence: bucketConfidence(r, n),
      description: f.binary ? describeBinary(f.label, effect) : describeNumeric(f.label, effect),
      absEffect: Math.abs(effect),
    });
  }

  // Top 5 by absolute effect, sorted with strongest first.
  results.sort((a, b) => b.absEffect - a.absEffect);
  const top: InsertMoodInsight[] = results.slice(0, 5).map(({ absEffect: _omit, ...row }) => row);

  await storage.replaceMoodInsights(userId, top);
}
