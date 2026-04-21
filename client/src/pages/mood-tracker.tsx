import { useMemo, useState } from "react";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";
import { JournalPromptSheet } from "@/components/mood/journal-prompt-sheet";
import {
  Activity, BarChart3, Brain, Calendar, CalendarDays, Clock, Heart,
  Loader2, RefreshCw, Sparkles, TrendingUp, LifeBuoy, Moon,
} from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  BarChart, Bar, Cell,
} from "recharts";
import { cn } from "@/lib/utils";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface TimelinePoint {
  id: string;
  createdAt: string;
  dateKey: string;
  energyLevel: number;
  moodLevel: number;
  clarityLevel: number | null;
  notes: string | null;
  context: {
    habits: { id: string; name: string }[];
    triggerCount: number;
    sleepHours: number | null;
  };
}
interface TimelineResponse { days: number; points: TimelinePoint[]; }

interface MoodInsight {
  id: string;
  factor: string;
  label: string;
  effect: number;
  sampleSize: number;
  correlation: number | null;
  confidence: "low" | "medium" | "high";
  description: string | null;
  computedAt: string;
}

interface PatternsResponse {
  byHour: { hour: number; avgMood: number | null; sampleSize: number }[];
  byDayOfWeek: { day: number; avgMood: number | null; sampleSize: number }[];
  totalLogs: number;
}

function formatDay(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ── Quick Log Card ─────────────────────────────────────────────────────────
function QuickLogCard({
  onLogged,
}: {
  onLogged: (logId: string, moodLevel: number) => void;
}) {
  const { toast } = useToast();
  const [energy, setEnergy] = useState(5);
  const [mood, setMood] = useState(5);
  const [clarity, setClarity] = useState(5);
  const [notes, setNotes] = useState("");

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mood", {
        energyLevel: energy,
        moodLevel: mood,
        clarityLevel: clarity,
        notes: notes || undefined,
      });
      return res.json() as Promise<{ id: string; moodLevel: number }>;
    },
    onSuccess: (log) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/timeline"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/patterns"] });
      toast({ title: "Mood logged", description: `Mood ${mood}/10` });
      setNotes("");
      onLogged(log.id, log.moodLevel);
    },
    onError: () => {
      toast({ title: "Couldn't save mood", variant: "destructive" });
    },
  });

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3 text-lg">
          <div className="rounded-full bg-rose-500/15 p-2">
            <Heart className="h-5 w-5 text-rose-500" />
          </div>
          Quick log
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Slide each from 1 (low) to 10 (high). Note is optional.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {[
          { label: "Energy", value: energy, set: setEnergy, testId: "slider-energy" },
          { label: "Mood",   value: mood,   set: setMood,   testId: "slider-mood" },
          { label: "Clarity", value: clarity, set: setClarity, testId: "slider-clarity" },
        ].map(row => (
          <div key={row.label} className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">{row.label}</span>
              <span className="text-sm font-mono text-muted-foreground" data-testid={`text-${row.label.toLowerCase()}-value`}>
                {row.value}/10
              </span>
            </div>
            <Slider
              min={1} max={10} step={1}
              value={[row.value]}
              onValueChange={(v) => row.set(v[0])}
              data-testid={row.testId}
            />
          </div>
        ))}

        <Textarea
          placeholder="What's on your mind? (optional)"
          rows={2}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          data-testid="input-mood-notes"
        />

        <Button
          className="w-full"
          disabled={mutation.isPending}
          onClick={() => mutation.mutate()}
          data-testid="button-save-mood"
        >
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save entry
        </Button>
      </CardContent>
    </Card>
  );
}

// ── Timeline Tab ───────────────────────────────────────────────────────────
function TimelineTab({ onPromptJournal }: { onPromptJournal: (logId: string) => void }) {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [selected, setSelected] = useState<TimelinePoint | null>(null);

  const q = useQuery<TimelineResponse>({
    queryKey: ["/api/mood/timeline", { days }],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/mood/timeline?days=${days}`);
      return res.json();
    },
  });

  const chartData = useMemo(() => {
    if (!q.data) return [];
    // Reverse so oldest → newest left to right.
    return [...q.data.points].reverse().map(p => ({
      ...p,
      dateLabel: formatDay(p.createdAt),
    }));
  }, [q.data]);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        {([7, 30, 90] as const).map(n => (
          <Button
            key={n}
            size="sm"
            variant={days === n ? "default" : "outline"}
            onClick={() => setDays(n)}
            data-testid={`button-range-${n}`}
          >
            {n}d
          </Button>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-4 w-4" /> Mood / Energy / Clarity
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-[260px] w-full" />
          ) : chartData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-12 text-center">
              No mood logs in this window yet. Tap <strong>Log</strong> to add one.
            </p>
          ) : (
            <div className="h-[260px]" data-testid="chart-timeline">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} onClick={(e: any) => {
                  const p = e?.activePayload?.[0]?.payload as TimelinePoint | undefined;
                  if (p) setSelected(p);
                }}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="dateLabel" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Line type="monotone" dataKey="moodLevel" name="Mood" stroke="#ec4899" strokeWidth={2} dot={{ r: 3 }} activeDot={{ r: 5 }} />
                  <Line type="monotone" dataKey="energyLevel" name="Energy" stroke="#f59e0b" strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="clarityLevel" name="Clarity" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent entries</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {chartData.slice().reverse().slice(0, 8).map(p => (
              <button
                key={p.id}
                type="button"
                onClick={() => setSelected(p)}
                className="w-full flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3 text-left hover-elevate"
                data-testid={`row-mood-${p.id}`}
              >
                <div className="flex flex-col items-center justify-center w-12 shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDay(p.createdAt)}</span>
                  <span className="text-lg font-semibold">{p.moodLevel}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary">E {p.energyLevel}</Badge>
                    {p.clarityLevel != null && <Badge variant="secondary">C {p.clarityLevel}</Badge>}
                    {p.context.triggerCount > 0 && (
                      <Badge variant="destructive" className="gap-1">
                        <LifeBuoy className="h-3 w-3" /> {p.context.triggerCount}
                      </Badge>
                    )}
                    {p.context.habits.length > 0 && (
                      <Badge variant="outline">{p.context.habits.length} habit{p.context.habits.length === 1 ? "" : "s"}</Badge>
                    )}
                    {p.context.sleepHours != null && (
                      <Badge variant="outline" className="gap-1"><Moon className="h-3 w-3" /> {p.context.sleepHours.toFixed(1)}h</Badge>
                    )}
                  </div>
                  {p.notes && (
                    <p className="mt-1 text-sm text-muted-foreground truncate">{p.notes}</p>
                  )}
                </div>
              </button>
            ))}
          </CardContent>
        </Card>
      )}

      <Sheet open={!!selected} onOpenChange={o => !o && setSelected(null)}>
        <SheetContent side="bottom" className="max-h-[80vh] overflow-y-auto" data-testid="sheet-day-context">
          {selected && (
            <>
              <SheetHeader>
                <SheetTitle>{new Date(selected.createdAt).toLocaleString()}</SheetTitle>
                <SheetDescription>
                  Mood {selected.moodLevel}/10 · Energy {selected.energyLevel}/10
                  {selected.clarityLevel != null && ` · Clarity ${selected.clarityLevel}/10`}
                </SheetDescription>
              </SheetHeader>
              <div className="mt-4 space-y-4">
                {selected.notes && (
                  <div className="rounded-lg border bg-muted/30 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1">Note</p>
                    <p className="text-sm">{selected.notes}</p>
                  </div>
                )}
                <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Context that day</p>
                  <p className="text-sm">
                    Habits: {selected.context.habits.length === 0 ? "none logged" : selected.context.habits.map(h => h.name).join(", ")}
                  </p>
                  <p className="text-sm">
                    Triggers: {selected.context.triggerCount}
                  </p>
                  <p className="text-sm">
                    Sleep: {selected.context.sleepHours != null ? `${selected.context.sleepHours.toFixed(1)}h` : "no wearable data"}
                  </p>
                </div>
                {selected.moodLevel <= 4 && (
                  <Button
                    className="w-full"
                    onClick={() => { onPromptJournal(selected.id); setSelected(null); }}
                    data-testid="button-journal-on-mood"
                  >
                    <Heart className="mr-2 h-4 w-4" />
                    Reflect on this entry
                  </Button>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

// ── Correlations Tab ───────────────────────────────────────────────────────
function CorrelationsTab() {
  const { toast } = useToast();
  const q = useQuery<MoodInsight[]>({ queryKey: ["/api/mood/insights"] });

  const refresh = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/mood/insights/refresh");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood/insights"] });
      toast({ title: "Insights recomputed" });
    },
    onError: () => toast({ title: "Couldn't refresh insights", variant: "destructive" }),
  });

  const insights = q.data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          What lines up with how you feel.
        </p>
        <Button
          size="sm"
          variant="outline"
          disabled={refresh.isPending}
          onClick={() => refresh.mutate()}
          data-testid="button-refresh-insights"
        >
          {refresh.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Recompute
        </Button>
      </div>

      {q.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : insights.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center space-y-3">
            <Sparkles className="h-8 w-8 text-muted-foreground mx-auto" />
            <p className="text-sm text-muted-foreground">
              No insights yet. Log mood for at least 5 days, then tap Recompute.
            </p>
          </CardContent>
        </Card>
      ) : (
        insights.map(i => (
          <Card key={i.id} data-testid={`card-insight-${i.factor}`}>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{i.label}</p>
                  {i.description && (
                    <p className="text-sm text-muted-foreground mt-1">{i.description}</p>
                  )}
                </div>
                <div
                  className={cn(
                    "shrink-0 rounded-full px-3 py-1 text-sm font-mono font-semibold",
                    i.effect >= 0 ? "bg-emerald-500/15 text-emerald-600" : "bg-rose-500/15 text-rose-600",
                  )}
                  data-testid={`text-effect-${i.factor}`}
                >
                  {i.effect >= 0 ? "+" : ""}{i.effect.toFixed(1)}
                </div>
              </div>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Badge variant="outline">{i.confidence} confidence</Badge>
                <span>n={i.sampleSize} days</span>
                {i.correlation != null && <span>· r={i.correlation.toFixed(2)}</span>}
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}

// ── Patterns Tab ───────────────────────────────────────────────────────────
function PatternsTab() {
  const q = useQuery<PatternsResponse>({ queryKey: ["/api/mood/patterns"] });

  const hourData = (q.data?.byHour ?? []).map(h => ({
    label: `${h.hour}`,
    mood: h.avgMood ?? 0,
    n: h.sampleSize,
  }));
  const dowData = (q.data?.byDayOfWeek ?? []).map(d => ({
    label: DAY_NAMES[d.day],
    mood: d.avgMood ?? 0,
    n: d.sampleSize,
  }));

  function colorFor(mood: number, n: number) {
    if (n === 0) return "hsl(var(--muted))";
    if (mood >= 7) return "#10b981";
    if (mood >= 5) return "#f59e0b";
    return "#ef4444";
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" /> Mood by hour of day
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (q.data?.totalLogs ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Log a few entries across different times to see patterns.
            </p>
          ) : (
            <div className="h-[200px]" data-testid="chart-hour">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="mood">
                    {hourData.map((d, i) => (
                      <Cell key={i} fill={colorFor(d.mood, d.n)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarDays className="h-4 w-4" /> Mood by day of week
          </CardTitle>
        </CardHeader>
        <CardContent>
          {q.isLoading ? (
            <Skeleton className="h-[200px] w-full" />
          ) : (q.data?.totalLogs ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">
              Not enough data yet.
            </p>
          ) : (
            <div className="h-[200px]" data-testid="chart-dow">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dowData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                  <YAxis domain={[0, 10]} tick={{ fontSize: 11 }} width={28} />
                  <Tooltip
                    contentStyle={{ background: "hsl(var(--popover))", border: "1px solid hsl(var(--border))", borderRadius: 8 }}
                  />
                  <Bar dataKey="mood">
                    {dowData.map((d, i) => (
                      <Cell key={i} fill={colorFor(d.mood, d.n)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ── Page shell ─────────────────────────────────────────────────────────────
export default function MoodTrackerPage() {
  usePageMeta("Mood Tracker", "Log and track your daily mood, see correlations and patterns.");
  useTutorialStart("mood-tracker", 1000);
  const [tab, setTab] = useState("timeline");
  const [journalOpen, setJournalOpen] = useState(false);
  const [pendingMoodLogId, setPendingMoodLogId] = useState<string | null>(null);

  const promptJournal = (logId: string) => {
    setPendingMoodLogId(logId);
    setJournalOpen(true);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Mood Tracker" showBack backPath="/command-center" />

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-2xl space-y-4 p-4 pb-24" data-tour="mood-tracker">
          <Tabs value={tab} onValueChange={setTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="timeline" data-testid="tab-timeline">
                <TrendingUp className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Timeline</span>
              </TabsTrigger>
              <TabsTrigger value="correlations" data-testid="tab-correlations">
                <Brain className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Correlations</span>
              </TabsTrigger>
              <TabsTrigger value="patterns" data-testid="tab-patterns">
                <BarChart3 className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Patterns</span>
              </TabsTrigger>
              <TabsTrigger value="log" data-testid="tab-log">
                <Heart className="mr-1 h-4 w-4" />
                <span className="hidden sm:inline">Log</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="timeline" className="mt-4">
              <TimelineTab onPromptJournal={promptJournal} />
            </TabsContent>
            <TabsContent value="correlations" className="mt-4">
              <CorrelationsTab />
            </TabsContent>
            <TabsContent value="patterns" className="mt-4">
              <PatternsTab />
            </TabsContent>
            <TabsContent value="log" className="mt-4">
              <QuickLogCard
                onLogged={(logId, moodLevel) => {
                  if (moodLevel <= 4) promptJournal(logId);
                }}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <JournalPromptSheet
        open={journalOpen}
        onOpenChange={setJournalOpen}
        moodLogId={pendingMoodLogId}
        intro="That's a heavy entry. A small reflection can help. Skip any prompt."
      />
    </div>
  );
}
