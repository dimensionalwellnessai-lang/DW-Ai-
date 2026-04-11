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
import { Activity, Moon, Heart, Scale, Plus, Trash2 } from "lucide-react";

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

  return (
    <div className="min-h-screen pb-24">
      <PageHeader title="Health Data" subtitle="Track daily metrics and spot trends" />

      <div className="max-w-2xl mx-auto px-4 space-y-5 pt-2">
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
