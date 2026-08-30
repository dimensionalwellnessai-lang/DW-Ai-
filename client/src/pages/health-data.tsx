import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { Activity, Moon, Heart, Scale, Plus, Trash2, Target, TrendingDown, TrendingUp, Watch, Smartphone, Zap, SlidersHorizontal } from "lucide-react";
import { DWLearnCard } from "@/components/dw-learn-card";
import { Link } from "wouter";

interface HealthMetric {
  id: string;
  loggedDate: string;
  steps: number | null;
  sleepHours: number | null;
  heartRate: number | null;
  weightKg: number | null;
  notes: string | null;
}

interface LogForm {
  loggedDate: string;
  steps: string;
  sleepHours: string;
  heartRate: string;
  weightKg: string;
  notes: string;
}

function fmt(d: string) {
  return new Date(d + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function Stat({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-2">
      <div className="text-sm font-bold leading-tight" data-testid={testid}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

const METRIC_CONFIG = [
  { key: "steps", label: "Steps", icon: Activity, color: "#6366f1", unit: "", chart: "bar" },
  { key: "sleepHours", label: "Sleep", icon: Moon, color: "#8b5cf6", unit: "hrs", chart: "area" },
  { key: "heartRate", label: "Heart Rate", icon: Heart, color: "#ef4444", unit: "bpm", chart: "area" },
  { key: "weightKg", label: "Weight", icon: Scale, color: "#f59e0b", unit: "kg", chart: "area" },
] as const;

type TrendMetricKey = "hrv" | "restingHr" | "sleepHours" | "steps" | "screenTime";
type TrendVisibility = Record<TrendMetricKey, boolean>;
const DEFAULT_TREND_VISIBILITY: TrendVisibility = {
  hrv: true,
  restingHr: true,
  sleepHours: true,
  steps: true,
  screenTime: true,
};

function trendVisibilityStorageKey(userId: string | null | undefined): string {
  return `dw:wearable-trend-visibility:${userId || "guest"}`;
}

function loadTrendVisibility(userId: string | null | undefined): TrendVisibility {
  if (typeof window === "undefined") return DEFAULT_TREND_VISIBILITY;
  try {
    const raw = window.localStorage.getItem(trendVisibilityStorageKey(userId));
    if (!raw) return DEFAULT_TREND_VISIBILITY;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return DEFAULT_TREND_VISIBILITY;
    // Only accept boolean values for known keys; ignore anything else so a
    // malformed localStorage entry can't poison the visibility state.
    const sanitized: TrendVisibility = { ...DEFAULT_TREND_VISIBILITY };
    for (const key of Object.keys(DEFAULT_TREND_VISIBILITY) as TrendMetricKey[]) {
      const v = (parsed as Record<string, unknown>)[key];
      if (typeof v === "boolean") sanitized[key] = v;
    }
    return sanitized;
  } catch {
    return DEFAULT_TREND_VISIBILITY;
  }
}

export default function HealthDataPage() {
  usePageMeta({ title: "Health Data | DW Wellness AI" });
  const { toast } = useToast();
  const { user } = useAuth();
  const [showForm, setShowForm] = useState(false);

  // Per-user visibility for the wearable trend charts. Persisted to
  // localStorage so the choice carries across sessions on this device.
  const userId = user?.id ?? null;
  const [trendVisibility, setTrendVisibility] = useState<TrendVisibility>(() =>
    loadTrendVisibility(userId),
  );
  // Reload prefs whenever the signed-in user changes (e.g. logout/login on
  // the same device): otherwise the previous user's selections persist.
  useEffect(() => {
    setTrendVisibility(loadTrendVisibility(userId));
  }, [userId]);
  const setTrendVisible = (key: TrendMetricKey, visible: boolean) => {
    setTrendVisibility((prev) => {
      const next = { ...prev, [key]: visible };
      try {
        window.localStorage.setItem(
          trendVisibilityStorageKey(userId),
          JSON.stringify(next),
        );
      } catch {
        // localStorage may be unavailable (private browsing) — silently keep
        // the in-memory state and continue.
      }
      return next;
    });
  };

  const form = useForm<LogForm>({
    defaultValues: {
      loggedDate: new Date().toISOString().slice(0, 10),
      steps: "", sleepHours: "", heartRate: "", weightKg: "", notes: "",
    },
  });

  const { data: metrics = [], isLoading } = useQuery<HealthMetric[]>({
    queryKey: ["/api/health-metrics"],
    staleTime: 30000,
  });

  const { data: goals = [] } = useQuery<any[]>({ queryKey: ["/api/goals"] });

  // Wearable Manager — recent metrics from Apple Health / Whoop / Oura / Garmin.
  const [trendWindow, setTrendWindow] = useState<7 | 30>(7);
  const { data: wearables } = useQuery<{
    data: Array<{ id: string; metricKind: string | null; metricValue: number | null; recordedAt: string | null; source: string | null }>;
    screenTime: Array<{ dateKey: string; totalMinutes: number }>;
    insights: {
      yesterday: {
        dateKey: string;
        totalMinutes: number;
        topCategory: { name: string; minutes: number } | null;
        topCategories: Array<{ name: string; minutes: number }>;
      };
    } | null;
  }>({
    queryKey: ["/api/wearables/data", { days: 30 }],
    queryFn: async () => {
      const r = await fetch("/api/wearables/data?days=30", { credentials: "include" });
      if (!r.ok) throw new Error("Failed to load wearables");
      return r.json();
    },
    staleTime: 60_000,
  });

  // Headline metrics from the past 24h.
  // For cumulative metrics (steps, sleep_minutes), several connected
  // wearables (e.g. Whoop + Apple Watch + Oura) may all report the same
  // calendar day. Naively summing across sources causes obviously broken
  // numbers like "20+ hours of sleep last night". Instead, sum within each
  // source over the window and then take the MAX across sources, which
  // gives the most complete view from a single device without
  // double-counting. HRV / resting HR keep "latest reading" semantics.
  const wearableSummary = (() => {
    const rows = wearables?.data ?? [];
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recent = rows.filter((r) => r.recordedAt && new Date(r.recordedAt).getTime() >= since);
    const maxAcrossSources = (k: string) => {
      const bySource = new Map<string, number>();
      for (const r of recent) {
        if (r.metricKind !== k) continue;
        const src = r.source ?? "_unknown";
        bySource.set(src, (bySource.get(src) ?? 0) + (r.metricValue ?? 0));
      }
      let max = 0;
      bySource.forEach((v) => { if (v > max) max = v; });
      return max;
    };
    const lastKind = (k: string) => recent
      .filter((r) => r.metricKind === k)
      .sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime())[0]?.metricValue ?? null;
    return {
      hasAny: rows.length > 0 || (wearables?.screenTime?.length ?? 0) > 0,
      sleepMinutes: maxAcrossSources("sleep_minutes"),
      steps: maxAcrossSources("steps"),
      hrv: lastKind("hrv"),
      restingHr: lastKind("resting_hr"),
      screenTimeMinutes: wearables?.screenTime?.[0]?.totalMinutes ?? null,
    };
  })();

  const logMutation = useMutation({
    mutationFn: (vals: LogForm) => apiRequest("POST", "/api/health-metrics", {
      loggedDate: vals.loggedDate,
      steps: vals.steps ? Number(vals.steps) : null,
      sleepHours: vals.sleepHours ? Number(vals.sleepHours) : null,
      heartRate: vals.heartRate ? Number(vals.heartRate) : null,
      weight: vals.weightKg ? Number(vals.weightKg) : null,
      notes: vals.notes || null,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] });
      toast({ title: "Health data logged!" });
      setShowForm(false);
      form.reset({ loggedDate: new Date().toISOString().slice(0, 10), steps: "", sleepHours: "", heartRate: "", weightKg: "", notes: "" });
    },
    onError: () => toast({ title: "Failed to log", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/health-metrics/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/health-metrics"] }),
  });

  // 7d-vs-prior-7d delta per metric over the last 14 *completed* days.
  // Always "last week vs the week before", independent of `trendWindow`.
  // Returns null unless both windows have a full 7 days of data.
  // (UTC day-keys match the adjacent `wearableTrends` bucketing — moving
  // to local dates is tracked as a separate follow-up.)
  const MIN_DAYS_PER_WINDOW = 7;
  const wearableDeltas: Record<TrendMetricKey, { pct: number; favorable: boolean } | null> = (() => {
    const rows = wearables?.data ?? [];
    const screen = wearables?.screenTime ?? [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    // 14 ordered date keys for COMPLETED days: yesterday back 14 days.
    // Index [0..6] = prior week, [7..13] = current week (i.e. last 7 full days).
    const dateKeys: string[] = [];
    for (let i = 14; i >= 1; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().slice(0, 10));
    }
    const earliest = new Date(today);
    earliest.setDate(earliest.getDate() - 14);
    const recent = rows.filter((r) => {
      if (!r.recordedAt) return false;
      const ts = new Date(r.recordedAt);
      return ts >= earliest && ts < today;
    });
    // Steps and sleep_minutes are bucketed per (day, source) and then
    // reconciled across sources via MAX (see `wearableSummary` above for the
    // full rationale) so a user with two wearables tracking the same night
    // doesn't show 16 hours of sleep.
    const byDay: Record<string, { hrvVals: number[]; rhrVals: number[]; sleepBySrc: Map<string, number>; stepsBySrc: Map<string, number> }> = {};
    for (const k of dateKeys) byDay[k] = { hrvVals: [], rhrVals: [], sleepBySrc: new Map(), stepsBySrc: new Map() };
    for (const r of recent) {
      const k = new Date(r.recordedAt!).toISOString().slice(0, 10);
      if (!byDay[k]) continue;
      const v = r.metricValue ?? 0;
      const src = r.source ?? "_unknown";
      if (r.metricKind === "hrv" && v > 0) byDay[k].hrvVals.push(v);
      else if (r.metricKind === "resting_hr" && v > 0) byDay[k].rhrVals.push(v);
      else if (r.metricKind === "sleep_minutes") byDay[k].sleepBySrc.set(src, (byDay[k].sleepBySrc.get(src) ?? 0) + v);
      else if (r.metricKind === "steps") byDay[k].stepsBySrc.set(src, (byDay[k].stepsBySrc.get(src) ?? 0) + v);
    }
    const maxBySource = (m: Map<string, number>): number => {
      let max = 0;
      m.forEach((v) => { if (v > max) max = v; });
      return max;
    };
    const screenByDay: Record<string, number> = {};
    for (const s of screen) screenByDay[s.dateKey] = s.totalMinutes;

    // Zero-handling rationale (kept consistent across all wearable bucketing
    // in this file): wearables (Apple Watch, Whoop, Oura, Garmin) do NOT
    // emit explicit zero-valued rows for HRV / resting HR / sleep_minutes /
    // steps — a zero in those buckets always means "no reading captured /
    // device not worn", so we exclude them from the average. Screen time is
    // different: the phone reports 0 minutes for genuine phone-free days,
    // so a present row with value 0 is a real, meaningful datapoint.
    const valuesFor = (key: TrendMetricKey, keys: string[]): number[] => {
      const out: number[] = [];
      for (const k of keys) {
        const d = byDay[k];
        if (key === "hrv" && d.hrvVals.length) {
          out.push(d.hrvVals.reduce((a, b) => a + b, 0) / d.hrvVals.length);
        } else if (key === "restingHr" && d.rhrVals.length) {
          out.push(d.rhrVals.reduce((a, b) => a + b, 0) / d.rhrVals.length);
        } else if (key === "sleepHours") {
          const sleepMin = maxBySource(d.sleepBySrc);
          if (sleepMin > 0) out.push(sleepMin / 60);
        } else if (key === "steps") {
          const steps = maxBySource(d.stepsBySrc);
          if (steps > 0) out.push(steps);
        } else if (key === "screenTime") {
          // Use hasOwnProperty so a present row with value 0 is counted.
          if (Object.prototype.hasOwnProperty.call(screenByDay, k)) {
            out.push(screenByDay[k]);
          }
        }
      }
      return out;
    };

    // For these metrics LOWER values are better; for everything else HIGHER is better.
    const lowerIsBetter: Record<TrendMetricKey, boolean> = {
      hrv: false,
      restingHr: true,
      sleepHours: false,
      steps: false,
      screenTime: true,
    };
    const priorKeys = dateKeys.slice(0, 7);
    const currentKeys = dateKeys.slice(7, 14);
    const compute = (key: TrendMetricKey) => {
      const prior = valuesFor(key, priorKeys);
      const curr = valuesFor(key, currentKeys);
      if (prior.length < MIN_DAYS_PER_WINDOW || curr.length < MIN_DAYS_PER_WINDOW) {
        return null; // not enough history for a meaningful comparison
      }
      const priorAvg = prior.reduce((a, b) => a + b, 0) / prior.length;
      const currAvg = curr.reduce((a, b) => a + b, 0) / curr.length;
      if (priorAvg === 0) return null; // can't compute % change off zero
      const pct = ((currAvg - priorAvg) / priorAvg) * 100;
      const favorable = lowerIsBetter[key] ? currAvg < priorAvg : currAvg > priorAvg;
      return { pct, favorable };
    };
    return {
      hrv: compute("hrv"),
      restingHr: compute("restingHr"),
      sleepHours: compute("sleepHours"),
      steps: compute("steps"),
      screenTime: compute("screenTime"),
    };
  })();

  // Build per-day wearable trend rows for the last `trendWindow` days.
  const wearableTrends = (() => {
    const rows = wearables?.data ?? [];
    const screen = wearables?.screenTime ?? [];
    const days = trendWindow;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dateKeys: string[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      dateKeys.push(d.toISOString().slice(0, 10));
    }
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() - (days - 1));
    const recent = rows.filter((r) => r.recordedAt && new Date(r.recordedAt) >= cutoff);
    // See `wearableSummary` for the rationale: cumulative metrics (steps,
    // sleep_minutes) are bucketed per (day, source) and reconciled with MAX
    // across sources so two wearables tracking the same day don't double-count.
    const byDay: Record<string, { hrvVals: number[]; rhrVals: number[]; sleepBySrc: Map<string, number>; stepsBySrc: Map<string, number> }> = {};
    for (const k of dateKeys) byDay[k] = { hrvVals: [], rhrVals: [], sleepBySrc: new Map(), stepsBySrc: new Map() };
    for (const r of recent) {
      const k = new Date(r.recordedAt!).toISOString().slice(0, 10);
      if (!byDay[k]) continue;
      const v = r.metricValue ?? 0;
      const src = r.source ?? "_unknown";
      if (r.metricKind === "hrv" && v > 0) byDay[k].hrvVals.push(v);
      else if (r.metricKind === "resting_hr" && v > 0) byDay[k].rhrVals.push(v);
      else if (r.metricKind === "sleep_minutes") byDay[k].sleepBySrc.set(src, (byDay[k].sleepBySrc.get(src) ?? 0) + v);
      else if (r.metricKind === "steps") byDay[k].stepsBySrc.set(src, (byDay[k].stepsBySrc.get(src) ?? 0) + v);
    }
    const maxBySource = (m: Map<string, number>): number => {
      let max = 0;
      m.forEach((v) => { if (v > max) max = v; });
      return max;
    };
    const screenByDay: Record<string, number> = {};
    for (const s of screen) screenByDay[s.dateKey] = s.totalMinutes;
    const labelOf = (k: string) =>
      new Date(k + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const series = dateKeys.map((k) => {
      const d = byDay[k];
      const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);
      const sleepMin = maxBySource(d.sleepBySrc);
      const steps = maxBySource(d.stepsBySrc);
      return {
        date: labelOf(k),
        hrv: avg(d.hrvVals),
        restingHr: avg(d.rhrVals),
        sleepHours: sleepMin > 0 ? +(sleepMin / 60).toFixed(2) : null,
        steps: steps > 0 ? steps : null,
        screenTime: screenByDay[k] ?? null,
      };
    });
    const has = (key: TrendMetricKey) =>
      series.some((p) => typeof p[key] === "number" && p[key] !== null);
    return { series, hasAny: has("hrv") || has("restingHr") || has("sleepHours") || has("steps") || has("screenTime"), has };
  })();

  const TREND_CHARTS: ReadonlyArray<{
    key: TrendMetricKey;
    label: string;
    icon: typeof Activity;
    color: string;
    unit: string;
    chart: "area" | "bar";
  }> = [
    { key: "hrv", label: "HRV", icon: Zap, color: "#10b981", unit: " ms", chart: "area" },
    { key: "restingHr", label: "Resting HR", icon: Heart, color: "#ef4444", unit: " bpm", chart: "area" },
    { key: "sleepHours", label: "Sleep", icon: Moon, color: "#8b5cf6", unit: "h", chart: "bar" },
    { key: "steps", label: "Steps", icon: Activity, color: "#6366f1", unit: "", chart: "bar" },
    { key: "screenTime", label: "Screen Time", icon: Smartphone, color: "#f59e0b", unit: "m", chart: "bar" },
  ];

  const sorted = [...metrics].sort((a, b) => a.loggedDate.localeCompare(b.loggedDate));
  const chartData = sorted.map(m => ({
    date: fmt(m.loggedDate),
    steps: m.steps,
    sleepHours: m.sleepHours,
    heartRate: m.heartRate,
    weightKg: m.weightKg,
  }));

  const latest = sorted[sorted.length - 1];

  const weightGoals = (goals as any[]).filter(g =>
    g.isActive !== false &&
    (g.title?.toLowerCase().includes("weight") || g.title?.toLowerCase().includes("lose") || g.title?.toLowerCase().includes("kg"))
  );

  const weightDelta = (() => {
    if (sorted.length < 2) return null;
    const first = sorted[0].weightKg;
    const last = sorted[sorted.length - 1].weightKg;
    if (first == null || last == null) return null;
    return (last - first).toFixed(1);
  })();

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Health Data" subtitle="Track daily metrics and spot trends" />

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-2 page-enter">
        {/* Wearable / Screen Time strip */}
        {wearableSummary.hasAny ? (
          <Card data-testid="card-wearable-summary">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Watch className="w-4 h-4 text-primary" /> From your wearables (last 24h)
                <Link href="/wearable-manager" className="ml-auto text-xs underline text-muted-foreground" data-testid="link-wearable-manager">Manage</Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-center">
                <Stat label="Sleep" value={wearableSummary.sleepMinutes ? `${(wearableSummary.sleepMinutes / 60).toFixed(1)}h` : "—"} testid="stat-wearable-sleep" />
                <Stat label="Steps" value={wearableSummary.steps ? wearableSummary.steps.toLocaleString() : "—"} testid="stat-wearable-steps" />
                <Stat label="HRV" value={wearableSummary.hrv != null ? `${Math.round(wearableSummary.hrv)} ms` : "—"} testid="stat-wearable-hrv" />
                <Stat label="Resting HR" value={wearableSummary.restingHr != null ? `${Math.round(wearableSummary.restingHr)} bpm` : "—"} testid="stat-wearable-rhr" />
                <Stat label="Screen Time" value={wearableSummary.screenTimeMinutes != null ? `${Math.floor(wearableSummary.screenTimeMinutes / 60)}h ${wearableSummary.screenTimeMinutes % 60}m` : "—"} testid="stat-wearable-screentime" />
              </div>
              {wearables?.insights?.yesterday?.topCategory && (
                <p className="text-xs text-muted-foreground mt-2" data-testid="text-screentime-insight">
                  Yesterday you spent{" "}
                  <span className="font-medium text-foreground">
                    {Math.floor(wearables.insights.yesterday.topCategory.minutes / 60)}h{" "}
                    {wearables.insights.yesterday.topCategory.minutes % 60}m
                  </span>{" "}
                  on {wearables.insights.yesterday.topCategory.name}.
                </p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed" data-testid="card-wearable-empty">
            <CardContent className="p-3 flex items-center gap-3">
              <Watch className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 text-xs">
                <p className="font-semibold">No wearable connected</p>
                <p className="text-muted-foreground">Connect Apple Health, Screen Time, Whoop, Oura or Garmin to surface real metrics here.</p>
              </div>
              <Link href="/wearable-manager">
                <Button size="sm" data-testid="button-connect-wearable">Connect</Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Wearable trends */}
        {wearableSummary.hasAny && (
          wearableTrends.hasAny ? (
            <Card data-testid="card-wearable-trends">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-primary" /> Wearable trends
                  <div className="ml-auto flex items-center gap-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          className="text-muted-foreground hover-elevate rounded p-1 mr-1"
                          aria-label="Choose which trends to show"
                          data-testid="button-trend-visibility"
                        >
                          <SlidersHorizontal className="w-3.5 h-3.5" />
                        </button>
                      </PopoverTrigger>
                      <PopoverContent align="end" className="w-56 p-3" data-testid="popover-trend-visibility">
                        <p className="text-xs font-semibold mb-2">Show trends for</p>
                        <div className="space-y-2">
                          {TREND_CHARTS.map(({ key, label, icon: Icon, color }) => {
                            const hasData = wearableTrends.has(key);
                            return (
                              <label
                                key={key}
                                className={`flex items-center gap-2 text-xs ${hasData ? "" : "opacity-50"}`}
                                data-testid={`option-trend-${key}`}
                              >
                                <Checkbox
                                  checked={trendVisibility[key]}
                                  onCheckedChange={(v) => setTrendVisible(key, v === true)}
                                  disabled={!hasData}
                                  data-testid={`checkbox-trend-${key}`}
                                />
                                <Icon className="w-3 h-3" style={{ color }} />
                                <span className="flex-1">{label}</span>
                                {!hasData && (
                                  <span className="text-xs text-muted-foreground">no data</span>
                                )}
                              </label>
                            );
                          })}
                        </div>
                      </PopoverContent>
                    </Popover>
                    <button
                      onClick={() => setTrendWindow(7)}
                      className={`text-xs px-2 py-0.5 rounded ${trendWindow === 7 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
                      data-testid="button-trend-window-7"
                    >7d</button>
                    <button
                      onClick={() => setTrendWindow(30)}
                      className={`text-xs px-2 py-0.5 rounded ${trendWindow === 30 ? "bg-primary text-primary-foreground" : "text-muted-foreground hover-elevate"}`}
                      data-testid="button-trend-window-30"
                    >30d</button>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0 space-y-3">
                {TREND_CHARTS.filter(m => wearableTrends.has(m.key) && trendVisibility[m.key]).length === 0 && (
                  <p className="text-xs text-muted-foreground py-2 text-center" data-testid="text-trends-all-hidden">
                    All trends hidden — use the filter to pick what to show.
                  </p>
                )}
                {TREND_CHARTS.filter(m => wearableTrends.has(m.key) && trendVisibility[m.key]).map(({ key, label, icon: Icon, color, unit, chart }) => {
                  const delta = wearableDeltas[key];
                  return (
                  <div key={key} data-testid={`chart-wearable-${key}`}>
                    <div className="flex items-center gap-1.5 mb-1 text-xs text-muted-foreground">
                      <Icon className="w-3 h-3" style={{ color }} />
                      <span className="font-medium text-foreground">{label}</span>
                      {delta && (
                        <span
                          className={`ml-1 px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            delta.favorable
                              ? "bg-green-500/15 text-green-700 dark:text-green-400"
                              : "bg-amber-500/15 text-amber-700 dark:text-amber-500"
                          }`}
                          title="Last 7 days vs the 7 days before that"
                          aria-label={
                            Math.round(delta.pct) === 0
                              ? "No change versus the previous 7 days"
                              : `${delta.pct > 0 ? "Up" : "Down"} ${Math.abs(Math.round(delta.pct))} percent versus the previous 7 days`
                          }
                          data-testid={`badge-trend-delta-${key}`}
                        >
                          {delta.pct > 0 ? "+" : ""}{Math.round(delta.pct)}%
                        </span>
                      )}
                    </div>
                    <ResponsiveContainer width="100%" height={90}>
                      {chart === "bar" ? (
                        <BarChart data={wearableTrends.series} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} width={32} />
                          <Tooltip formatter={(v: number) => [`${typeof v === "number" ? v.toLocaleString() : v}${unit}`, label]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <Bar dataKey={key} fill={color} radius={[3, 3, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={wearableTrends.series} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 9 }} interval="preserveStartEnd" />
                          <YAxis tick={{ fontSize: 9 }} width={32} domain={["auto", "auto"]} />
                          <Tooltip formatter={(v: number) => [`${typeof v === "number" ? Math.round(v) : v}${unit}`, label]} contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                          <Area type="monotone" dataKey={key} stroke={color} fill={color} fillOpacity={0.18} strokeWidth={2} dot={false} connectNulls />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </div>
                  );
                })}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed" data-testid="card-wearable-trends-empty">
              <CardContent className="p-3 text-xs flex items-center gap-3">
                <TrendingUp className="w-4 h-4 text-muted-foreground shrink-0" />
                <p className="flex-1 text-muted-foreground">Not enough wearable history yet to show trends. Import a few days from Apple Health, Whoop, Oura, or Garmin.</p>
                <Link href="/wearable-manager">
                  <Button size="sm" variant="outline" data-testid="button-trends-import">Import</Button>
                </Link>
              </CardContent>
            </Card>
          )
        )}

        {/* Goal impact panel */}
        {weightGoals.length > 0 && weightDelta !== null && (
          <Card className="border-amber-500/20 bg-amber-500/5" data-testid="card-health-goal-impact">
            <CardContent className="p-3 flex items-center gap-3">
              <Target className="h-5 w-5 text-amber-600 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">Weight Goal Progress</p>
                <p className="text-xs text-muted-foreground truncate">{weightGoals[0].title}</p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                {Number(weightDelta) < 0
                  ? <TrendingDown className="h-4 w-4 text-green-500" />
                  : <TrendingUp className="h-4 w-4 text-amber-500" />
                }
                <span className={`text-sm font-bold ${Number(weightDelta) < 0 ? "text-green-600" : "text-amber-600"}`}>
                  {Number(weightDelta) >= 0 ? "+" : ""}{weightDelta} kg
                </span>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Latest snapshot */}
        {latest && (
          <div className="grid grid-cols-4 gap-2">
            {METRIC_CONFIG.map(({ key, label, icon: Icon, color, unit }) => {
              const val = latest[key as keyof HealthMetric];
              return (
                <Card key={key} className="text-center">
                  <CardContent className="pt-3 pb-2 px-1">
                    <Icon className="w-4 h-4 mx-auto mb-1" style={{ color }} />
                    <div className="text-lg font-bold leading-tight">
                      {val != null ? `${val}${unit}` : "—"}
                    </div>
                    <div className="text-xs text-muted-foreground">{label}</div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* DW explains macros and why health metrics matter */}
        <DWLearnCard
          topic="What are macros (protein, carbs, fat) and why do people count calories? I don't fully understand what these numbers actually mean for my body and whether I actually need to track them."
          question="What are macros and do you actually need to count them?"
          teaser="DW explains calories, protein, carbs, and fat in plain English."
          accent="emerald"
        />

        {/* Log button */}
        <Button
          className="w-full"
          onClick={() => setShowForm(!showForm)}
          data-testid="button-log-health"
        >
          <Plus className="w-4 h-4 mr-2" />
          {showForm ? "Cancel" : "Log Today's Metrics"}
        </Button>

        {/* Log form */}
        {showForm && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Log Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(v => logMutation.mutate(v))} className="space-y-3">
                  <FormField control={form.control} name="loggedDate" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Date</FormLabel>
                      <FormControl><Input type="date" {...field} data-testid="input-log-date" /></FormControl>
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-3">
                    <FormField control={form.control} name="steps" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1"><Activity className="w-3 h-3 text-indigo-500" />Steps</FormLabel>
                        <FormControl><Input type="number" placeholder="8000" {...field} data-testid="input-log-steps" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="sleepHours" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1"><Moon className="w-3 h-3 text-violet-500" />Sleep (hrs)</FormLabel>
                        <FormControl><Input type="number" step="0.5" placeholder="7.5" {...field} data-testid="input-log-sleep" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="heartRate" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1"><Heart className="w-3 h-3 text-red-500" />Resting HR</FormLabel>
                        <FormControl><Input type="number" placeholder="62" {...field} data-testid="input-log-hr" /></FormControl>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="weightKg" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs flex items-center gap-1"><Scale className="w-3 h-3 text-amber-500" />Weight (kg)</FormLabel>
                        <FormControl><Input type="number" step="0.1" placeholder="75.0" {...field} data-testid="input-log-weight" /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <Button type="submit" disabled={logMutation.isPending} className="w-full" data-testid="button-submit-health">
                    {logMutation.isPending ? "Saving…" : "Save"}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        )}

        {/* Charts */}
        {isLoading ? (
          <div className="space-y-4">{[1, 2].map(i => <Skeleton key={i} className="h-44 w-full" />)}</div>
        ) : chartData.length < 2 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground text-sm">
              <Activity className="w-10 h-10 opacity-30 mx-auto mb-2" />
              Log at least 2 days to see trend charts.
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="steps">
            <TabsList className="w-full grid grid-cols-4">
              {METRIC_CONFIG.map(m => (
                <TabsTrigger key={m.key} value={m.key} className="text-xs" data-testid={`tab-metric-${m.key}`}>
                  {m.label}
                </TabsTrigger>
              ))}
            </TabsList>
            {METRIC_CONFIG.map(({ key, label, color, unit, chart }) => (
              <TabsContent key={key} value={key}>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">{label} Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={160}>
                      {chart === "bar" ? (
                        <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [`${v}${unit}`, label]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Bar dataKey={key} fill={color} radius={[4, 4, 0, 0]} />
                        </BarChart>
                      ) : (
                        <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip formatter={(v: number) => [`${v}${unit}`, label]} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                          <Area type="monotone" dataKey={key} stroke={color} fill={color} fillOpacity={0.15} strokeWidth={2} dot={false} />
                        </AreaChart>
                      )}
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </TabsContent>
            ))}
          </Tabs>
        )}

        {/* History list */}
        {metrics.length > 0 && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {[...metrics].sort((a, b) => b.loggedDate.localeCompare(a.loggedDate)).map(m => (
                  <div key={m.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/40">
                    <div className="text-xs text-muted-foreground w-16 shrink-0">{fmt(m.loggedDate)}</div>
                    <div className="flex flex-wrap gap-1.5 flex-1">
                      {m.steps != null && <Badge variant="outline" className="text-[10px]">{m.steps.toLocaleString()} steps</Badge>}
                      {m.sleepHours != null && <Badge variant="outline" className="text-[10px]">{m.sleepHours}h sleep</Badge>}
                      {m.heartRate != null && <Badge variant="outline" className="text-[10px]">{m.heartRate} bpm</Badge>}
                      {m.weightKg != null && <Badge variant="outline" className="text-[10px]">{m.weightKg} kg</Badge>}
                    </div>
                    <button
                      className="text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => deleteMutation.mutate(m.id)}
                      data-testid={`button-delete-metric-${m.id}`}
                      aria-label="Delete entry"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
