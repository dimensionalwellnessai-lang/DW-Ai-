import { useState } from "react";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { Link } from "wouter";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Legend,
} from "recharts";
import {
  Trophy,
  TrendingUp,
  Target,
  Flame,
  ChevronRight,
  Sparkles,
  Check,
  Circle,
  Compass,
} from "lucide-react";

interface Contribution {
  key: string;
  label: string;
  value: number;
  detail: string;
  route: string;
}

interface LevelProgress {
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
  levelProgressPct: number;
  habitConsistencyPct: number;
  activeHabitCount: number;
  goalProgressAvg: number;
  activeGoalCount: number;
  challengeCheckins7d: number;
  wearable: { sleepMinutesAvg?: number; stepsAvg?: number } | null;
  contributions: Contribution[];
}

interface TrendPoint {
  dateKey: string;
  levelProgressPct: number;
  habitConsistencyPct: number;
  goalProgressAvg: number;
  challengeCheckins7d: number;
}

interface GrowthReview {
  period: string;
  from: string | null;
  to: string | null;
  wins: string[];
  deltas: {
    levelProgressPct: number;
    habitConsistencyPct: number;
    goalProgressAvg: number;
    challengeCheckins7d: number;
  } | null;
  focus: { title: string; reason: string; route: string } | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

export default function MyLevelPage() {
  usePageMeta("My Level", "Track your level-up progress with real metrics.");
  const [reviewPeriod, setReviewPeriod] = useState<"week" | "month">("week");

  const { data: progress, isLoading } = useQuery<LevelProgress>({
    queryKey: ["level-progress"],
    queryFn: () => getJson("/api/level-progress"),
    retry: false,
  });

  const { data: trends } = useQuery<{ series: TrendPoint[] }>({
    queryKey: ["level-progress", "trends"],
    queryFn: () => getJson("/api/level-progress/trends?days=30"),
    retry: false,
  });

  const { data: review } = useQuery<GrowthReview>({
    queryKey: ["level-progress", "review", reviewPeriod],
    queryFn: () => getJson(`/api/level-progress/review?period=${reviewPeriod}`),
    retry: false,
  });

  const rm = progress?.roleMap ?? null;
  const chartData = (trends?.series ?? []).map((p) => ({
    day: p.dateKey.slice(5),
    Milestones: p.levelProgressPct,
    Habits: p.habitConsistencyPct,
    Goals: p.goalProgressAvg,
  }));

  return (
    <div className="bg-background">
      <PageHeader title="My Level" />
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="p-4 pb-24 space-y-6 max-w-lg mx-auto">
          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-40" />
              <Skeleton className="h-32" />
            </div>
          ) : !rm ? (
            <Card className="card-modern">
              <CardContent className="p-6 text-center space-y-3">
                <Compass className="h-8 w-8 mx-auto text-purple-400" />
                <h2 className="font-semibold text-foreground">No role map yet</h2>
                <p className="text-sm text-muted-foreground">
                  Level tracking starts with a ladder. Build your role map with DW in a few minutes.
                </p>
                <Link href="/role-map">
                  <Button size="sm" data-testid="button-create-role-map">
                    Build my role map
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Level status */}
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="card-modern border-purple-500/30 bg-gradient-to-br from-purple-900/20 to-slate-900">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-amber-400" />
                      Becoming: {rm.targetRole}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        Level {rm.currentLevel} of {rm.maxLevel}
                        {rm.currentLevelTitle ? ` — ${rm.currentLevelTitle}` : ""}
                      </p>
                      <Badge variant="secondary" data-testid="level-progress-pct">
                        {progress!.levelProgressPct}% to next
                      </Badge>
                    </div>
                    <Progress value={progress!.levelProgressPct} className="h-2.5" />
                    {rm.nextLevelTitle && rm.currentLevel < rm.maxLevel && (
                      <p className="text-xs text-muted-foreground">
                        Next: <span className="text-foreground">{rm.nextLevelTitle}</span> —{" "}
                        {rm.milestonesDone}/{rm.milestonesTotal} milestones done
                      </p>
                    )}
                    {/* Ladder */}
                    <div className="flex gap-1.5 pt-1" data-testid="level-ladder">
                      {rm.ladder.map((l) => (
                        <div
                          key={l.level}
                          title={`L${l.level}: ${l.title}`}
                          className={`h-2 flex-1 rounded-full ${
                            l.level < rm.currentLevel
                              ? "bg-emerald-500"
                              : l.level === rm.currentLevel
                                ? "bg-purple-500"
                                : "bg-muted"
                          }`}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>

              {/* Next milestones */}
              {rm.nextMilestones.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                  <Card className="card-modern">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="h-4 w-4 text-blue-400" />
                        Milestones for {rm.nextLevelTitle ?? "next level"}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {rm.nextMilestones.map((m) => (
                        <div key={m.id} className="flex items-center gap-2 text-sm" data-testid={`milestone-${m.id}`}>
                          {m.done ? (
                            <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          )}
                          <span className={m.done ? "text-muted-foreground line-through" : "text-foreground"}>
                            {m.title}
                          </span>
                        </div>
                      ))}
                      <Link href="/role-map">
                        <Button variant="ghost" size="sm" className="w-full mt-1 text-muted-foreground">
                          Open role map
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </>
          )}

          {/* What's driving it */}
          {progress && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Flame className="h-4 w-4 text-orange-400" />
                    What's driving it
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {progress.contributions.map((c) => (
                    <Link key={c.key} href={c.route}>
                      <div
                        className="space-y-1 py-1 cursor-pointer hover:opacity-80"
                        data-testid={`contribution-${c.key}`}
                      >
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{c.label}</span>
                          {c.key !== "wearable" && (
                            <span className="text-muted-foreground">{c.value}%</span>
                          )}
                        </div>
                        {c.key !== "wearable" && <Progress value={c.value} className="h-1.5" />}
                        <p className="text-xs text-muted-foreground">{c.detail}</p>
                      </div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Trends */}
          {chartData.length >= 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-green-400" />
                    30-day trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-52" data-testid="trend-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} width={28} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" dataKey="Milestones" stroke="#a78bfa" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Habits" stroke="#34d399" dot={false} strokeWidth={2} />
                        <Line type="monotone" dataKey="Goals" stroke="#60a5fa" dot={false} strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
          {chartData.length < 2 && progress && (
            <p className="text-xs text-muted-foreground text-center">
              Trend charts fill in as you show up — come back tomorrow.
            </p>
          )}

          {/* Growth review */}
          {review && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
              <Card className="card-modern">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-400" />
                      Growth review
                    </CardTitle>
                    <div className="flex gap-1">
                      {(["week", "month"] as const).map((p) => (
                        <Button
                          key={p}
                          size="sm"
                          variant={reviewPeriod === p ? "secondary" : "ghost"}
                          className="h-7 px-2 text-xs capitalize"
                          onClick={() => setReviewPeriod(p)}
                          data-testid={`review-period-${p}`}
                        >
                          {p}
                        </Button>
                      ))}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {review.wins.length > 0 ? (
                    <div className="space-y-1.5" data-testid="review-wins">
                      {review.wins.map((w, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="h-4 w-4 text-emerald-400 shrink-0" />
                          <span className="text-foreground">{w}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      Not enough history yet — wins show up here as your snapshots build.
                    </p>
                  )}
                  {review.focus && (
                    <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 space-y-1" data-testid="review-focus">
                      <p className="text-xs uppercase tracking-wide text-purple-300">This {review.period}'s focus</p>
                      <p className="text-sm font-medium text-foreground">{review.focus.title}</p>
                      <p className="text-xs text-muted-foreground">{review.focus.reason}</p>
                      <Link href={review.focus.route}>
                        <Button size="sm" variant="outline" className="mt-1">
                          Go
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
