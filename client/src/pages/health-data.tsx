import { useState } from "react";
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
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  BarChart, Bar,
} from "recharts";
import { Activity, Moon, Heart, Scale, Plus, Trash2, Target, TrendingDown, TrendingUp, Watch } from "lucide-react";
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
      <div className="text-[10px] text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}

const METRIC_CONFIG = [
  { key: "steps", label: "Steps", icon: Activity, color: "#6366f1", unit: "", chart: "bar" },
  { key: "sleepHours", label: "Sleep", icon: Moon, color: "#8b5cf6", unit: "hrs", chart: "area" },
  { key: "heartRate", label: "Heart Rate", icon: Heart, color: "#ef4444", unit: "bpm", chart: "area" },
  { key: "weightKg", label: "Weight", icon: Scale, color: "#f59e0b", unit: "kg", chart: "area" },
] as const;

export default function HealthDataPage() {
  usePageMeta({ title: "Health Data | DW Wellness AI" });
  const { toast } = useToast();
  const [showForm, setShowForm] = useState(false);

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
    queryKey: ["/api/wearables/data"],
    staleTime: 60_000,
  });

  // Headline metrics from the past 24h: sum/last across all sources.
  const wearableSummary = (() => {
    const rows = wearables?.data ?? [];
    const since = Date.now() - 24 * 60 * 60 * 1000;
    const recent = rows.filter((r) => r.recordedAt && new Date(r.recordedAt).getTime() >= since);
    const sumKind = (k: string) => recent.filter((r) => r.metricKind === k).reduce((s, r) => s + (r.metricValue ?? 0), 0);
    const lastKind = (k: string) => recent
      .filter((r) => r.metricKind === k)
      .sort((a, b) => new Date(b.recordedAt!).getTime() - new Date(a.recordedAt!).getTime())[0]?.metricValue ?? null;
    return {
      hasAny: rows.length > 0 || (wearables?.screenTime?.length ?? 0) > 0,
      sleepMinutes: sumKind("sleep_minutes"),
      steps: sumKind("steps"),
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
                <p className="text-[11px] text-muted-foreground mt-2" data-testid="text-screentime-insight">
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
                    <div className="text-[10px] text-muted-foreground">{label}</div>
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
