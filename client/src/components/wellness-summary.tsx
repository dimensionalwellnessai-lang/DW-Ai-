import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Heart,
  Brain,
  Target,
  CheckCircle2,
  Calendar,
  Sparkles,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts";

interface WellnessSummaryData {
  period: string;
  moodTrends: {
    averageEnergy: number;
    averageMood: number;
    averageClarity: number;
    totalLogs: number;
  };
  progress: {
    activeGoals: number;
    completedGoals: number;
    activeHabits: number;
    activeRoutines: number;
  };
  insights: string[];
}

interface WellnessSummaryProps {
  days?: number;
  className?: string;
}

function TrendIcon({ current, previous }: { current: number; previous?: number }) {
  if (!previous || current === previous) {
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  }
  if (current > previous) {
    return <TrendingUp className="h-4 w-4 text-emerald-500" />;
  }
  return <TrendingDown className="h-4 w-4 text-rose-500" />;
}

function MetricCard({
  icon: Icon,
  label,
  value,
  suffix = "",
  color,
  trend,
}: {
  icon: typeof Zap;
  label: string;
  value: number;
  suffix?: string;
  color: string;
  trend?: { current: number; previous?: number };
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
      <div className={`p-2 rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <div className="flex items-baseline gap-2 mt-1">
          <p className="text-2xl font-bold">
            {value.toFixed(1)}
            <span className="text-sm font-normal text-muted-foreground">{suffix}</span>
          </p>
          {trend && <TrendIcon current={trend.current} previous={trend.previous} />}
        </div>
      </div>
    </div>
  );
}

export function WellnessSummary({ days = 7, className = "" }: WellnessSummaryProps) {
  const { data, isLoading, error } = useQuery<WellnessSummaryData>({
    queryKey: ["/api/summary", { days }],
    queryFn: async () => {
      const response = await fetch(`/api/summary?days=${days}`, {
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to fetch summary");
      return response.json();
    },
  });

  if (isLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Skeleton className="h-48 w-full" />
        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center text-muted-foreground">
          <p className="text-sm">Unable to load wellness summary</p>
        </CardContent>
      </Card>
    );
  }

  const { moodTrends, progress, insights } = data;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Mood Trends Overview */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-semibold">Wellness Overview</CardTitle>
            <Badge variant="outline" className="text-xs">
              Last {days} days
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <MetricCard
              icon={Zap}
              label="Avg Energy"
              value={moodTrends.averageEnergy}
              suffix="/10"
              color="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            />
            <MetricCard
              icon={Heart}
              label="Avg Mood"
              value={moodTrends.averageMood}
              suffix="/10"
              color="bg-rose-500/10 text-rose-600 dark:text-rose-400"
            />
            <MetricCard
              icon={Brain}
              label="Avg Clarity"
              value={moodTrends.averageClarity}
              suffix="/10"
              color="bg-blue-500/10 text-blue-600 dark:text-blue-400"
            />
          </div>

          {moodTrends.totalLogs > 0 && (
            <div className="pt-2">
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <CheckCircle2 className="h-3 w-3" />
                {moodTrends.totalLogs} check-in{moodTrends.totalLogs !== 1 ? "s" : ""} logged
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Progress Summary */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Target className="h-4 w-4" />
            Active Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Goals</p>
                <p className="text-sm font-semibold">{progress.activeGoals}</p>
              </div>
              <Progress value={(progress.activeGoals / Math.max(progress.activeGoals + progress.completedGoals, 1)) * 100} className="h-1.5" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Habits</p>
                <p className="text-sm font-semibold">{progress.activeHabits}</p>
              </div>
              <Progress value={progress.activeHabits > 0 ? 100 : 0} className="h-1.5" />
            </div>
            
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Routines</p>
                <p className="text-sm font-semibold">{progress.activeRoutines}</p>
              </div>
              <Progress value={progress.activeRoutines > 0 ? 100 : 0} className="h-1.5" />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">Completed</p>
                <p className="text-sm font-semibold">{progress.completedGoals}</p>
              </div>
              <Progress value={100} className="h-1.5" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Insights */}
      {insights.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {insights.map((insight, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2.5 rounded-lg bg-primary/5 border border-primary/10"
                >
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
                  <p className="text-xs text-muted-foreground leading-relaxed">{insight}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
