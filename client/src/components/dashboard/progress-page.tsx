import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import { TrendingUp, Zap, Heart, Brain, Target, CheckCircle2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import type { MoodLog, Goal, Habit } from "@shared/schema";

interface ProgressData {
  moodLogs: MoodLog[];
  goals: Goal[];
  habits: Habit[];
}

export function ProgressPage() {
  const { data, isLoading } = useQuery<ProgressData>({
    queryKey: ["/api/progress"],
  });

  if (isLoading) {
    return <ProgressSkeleton />;
  }

  const moodLogs = data?.moodLogs || [];
  const goals = data?.goals || [];
  const habits = data?.habits || [];

  const chartData = moodLogs.slice(-14).map((log, index) => ({
    day: `Day ${index + 1}`,
    energy: log.energyLevel,
    mood: log.moodLevel,
    clarity: log.clarityLevel || 0,
  }));

  const totalGoalProgress = goals.length > 0
    ? Math.round(goals.reduce((sum, g) => sum + (g.progress ?? 0), 0) / goals.length)
    : 0;

  const totalStreakDays = habits.reduce((sum, h) => sum + (h.streak ?? 0), 0);
  const activeHabits = habits.filter((h) => h.isActive).length;

  const avgEnergy = moodLogs.length > 0
    ? Math.round(moodLogs.reduce((sum, l) => sum + l.energyLevel, 0) / moodLogs.length * 10) / 10
    : 0;
  const avgMood = moodLogs.length > 0
    ? Math.round(moodLogs.reduce((sum, l) => sum + l.moodLevel, 0) / moodLogs.length * 10) / 10
    : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold" data-testid="text-progress-title">Progress</h1>
        <p className="text-muted-foreground">Track your wellness journey over time</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card data-testid="card-stat-energy">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Energy</p>
                <p className="text-3xl font-bold mt-1">{avgEnergy}/10</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-4/10 flex items-center justify-center">
                <Zap className="h-5 w-5 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-mood">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Avg. Mood</p>
                <p className="text-3xl font-bold mt-1">{avgMood}/10</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Heart className="h-5 w-5 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-goals">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Goal Progress</p>
                <p className="text-3xl font-bold mt-1">{totalGoalProgress}%</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-1/10 flex items-center justify-center">
                <Target className="h-5 w-5 text-chart-1" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-stat-streaks">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Total Streaks</p>
                <p className="text-3xl font-bold mt-1">{totalStreakDays} days</p>
              </div>
              <div className="w-10 h-10 rounded-md bg-chart-2/10 flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-chart-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-energy-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Energy & Mood Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Log your mood daily to see trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 10]} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.375rem",
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="energy"
                    stroke="hsl(var(--chart-4))"
                    strokeWidth={2}
                    dot={false}
                    name="Energy"
                  />
                  <Line
                    type="monotone"
                    dataKey="mood"
                    stroke="hsl(var(--chart-5))"
                    strokeWidth={2}
                    dot={false}
                    name="Mood"
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-clarity-chart">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              Mental Clarity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {chartData.length === 0 ? (
              <div className="h-64 flex items-center justify-center text-muted-foreground">
                <p>Log your mood daily to see clarity trends</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="day" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis domain={[0, 10]} className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      borderColor: "hsl(var(--border))",
                      borderRadius: "0.375rem",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="clarity"
                    stroke="hsl(var(--chart-3))"
                    fill="hsl(var(--chart-3))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    name="Clarity"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-0" data-testid="card-weekly-summary">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-chart-1" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">Weekly Summary</h3>
              <p className="text-muted-foreground font-serif leading-relaxed">
                {moodLogs.length > 0 ? (
                  <>
                    You've logged your mood {moodLogs.length} times. Your average energy is {avgEnergy}/10 
                    and mood is {avgMood}/10. You have {activeHabits} active habits with a combined 
                    streak of {totalStreakDays} days. Keep up the great work!
                  </>
                ) : (
                  "Start logging your daily mood to see insights and track your wellness journey over time."
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div>
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-5 w-48" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-20 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <Skeleton className="h-64 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
