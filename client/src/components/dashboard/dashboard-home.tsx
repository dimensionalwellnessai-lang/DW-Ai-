import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Zap,
  Heart,
  Brain,
  Target,
  Plus,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import type { Goal, Habit, MoodLog, LifeSystem } from "@shared/schema";

interface DashboardData {
  lifeSystem: LifeSystem | null;
  goals: Goal[];
  habits: Habit[];
  todaysMood: MoodLog | null;
  systemName: string;
}

interface InsightData {
  insight: string;
}

export function DashboardHome() {
  const { data, isLoading } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
  });

  const { data: insightData, isLoading: insightLoading } = useQuery<InsightData>({
    queryKey: ["/api/insight"],
    staleTime: 1000 * 60 * 5,
  });

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  const systemName = data?.systemName || "Your Life System";
  const goals = data?.goals || [];
  const habits = data?.habits || [];
  const todaysMood = data?.todaysMood;

  const completedHabitsToday = habits.filter((h) => (h.streak ?? 0) > 0).length;
  const totalHabits = habits.length;
  const habitProgress = totalHabits > 0 ? (completedHabitsToday / totalHabits) * 100 : 0;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold" data-testid="text-dashboard-title">
            Welcome to <span className="text-chart-1">{systemName}</span>
          </h1>
          <p className="text-muted-foreground mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/dashboard/checkin">
            <Button data-testid="button-quick-checkin">
              <MessageSquare className="mr-2 h-4 w-4" />
              Daily Check-in
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card data-testid="card-energy">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Energy Level</p>
                <p className="text-3xl font-bold mt-1">
                  {todaysMood?.energyLevel ?? "--"}/10
                </p>
              </div>
              <div className="w-12 h-12 rounded-md bg-chart-4/10 flex items-center justify-center">
                <Zap className="h-6 w-6 text-chart-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-mood">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Mood Level</p>
                <p className="text-3xl font-bold mt-1">
                  {todaysMood?.moodLevel ?? "--"}/10
                </p>
              </div>
              <div className="w-12 h-12 rounded-md bg-chart-5/10 flex items-center justify-center">
                <Heart className="h-6 w-6 text-chart-5" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card data-testid="card-clarity">
          <CardContent className="p-6">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm text-muted-foreground">Mental Clarity</p>
                <p className="text-3xl font-bold mt-1">
                  {todaysMood?.clarityLevel ?? "--"}/10
                </p>
              </div>
              <div className="w-12 h-12 rounded-md bg-chart-3/10 flex items-center justify-center">
                <Brain className="h-6 w-6 text-chart-3" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card data-testid="card-habits-today">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-xl">Today's Habits</CardTitle>
            <Link href="/dashboard/habits">
              <Button variant="ghost" size="sm" data-testid="button-view-all-habits">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <Progress value={habitProgress} className="flex-1" />
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                {completedHabitsToday}/{totalHabits} done
              </span>
            </div>
            {habits.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No habits yet. Start building healthy routines!</p>
                <Link href="/dashboard/habits">
                  <Button variant="outline" data-testid="button-add-first-habit">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Habit
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {habits.slice(0, 5).map((habit) => (
                  <div
                    key={habit.id}
                    className="flex items-center gap-3 p-3 rounded-md bg-muted/50"
                    data-testid={`habit-item-${habit.id}`}
                  >
                    <div className="w-8 h-8 rounded-md bg-chart-2/10 flex items-center justify-center">
                      <CheckCircle2 className="h-4 w-4 text-chart-2" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{habit.title}</p>
                      <p className="text-sm text-muted-foreground">{habit.streak} day streak</p>
                    </div>
                    <Badge variant="secondary" className="shrink-0">{habit.frequency}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card data-testid="card-active-goals">
          <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
            <CardTitle className="text-xl">Active Goals</CardTitle>
            <Link href="/dashboard/goals">
              <Button variant="ghost" size="sm" data-testid="button-view-all-goals">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-4">
            {goals.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No goals yet. Set meaningful targets!</p>
                <Link href="/dashboard/goals">
                  <Button variant="outline" data-testid="button-add-first-goal">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Your First Goal
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {goals.slice(0, 4).map((goal) => (
                  <div key={goal.id} className="space-y-2" data-testid={`goal-item-${goal.id}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <Target className="h-4 w-4 text-chart-1 shrink-0" />
                        <span className="font-medium truncate">{goal.title}</span>
                      </div>
                      <span className="text-sm text-muted-foreground shrink-0">{goal.progress}%</span>
                    </div>
                    <Progress value={goal.progress ?? 0} className="h-2" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="card-today-schedule">
        <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
          <CardTitle className="text-xl">Today's Schedule</CardTitle>
          <Link href="/dashboard/schedule">
            <Button variant="ghost" size="sm" data-testid="button-view-schedule">
              View Full Schedule
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-md bg-muted/50">
            <div className="w-12 h-12 rounded-md bg-chart-1/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-chart-1" />
            </div>
            <div>
              <p className="font-medium">Your schedule is being prepared</p>
              <p className="text-sm text-muted-foreground">
                Check your schedule page to view and customize time blocks
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-to-r from-chart-1/10 to-chart-2/10 border-0" data-testid="card-ai-insight">
        <CardContent className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-background flex items-center justify-center shrink-0">
              <TrendingUp className="h-6 w-6 text-chart-1" />
            </div>
            <div>
              <h3 className="font-semibold text-lg mb-1">AI Insight</h3>
              {insightLoading ? (
                <Skeleton className="h-12 w-full" />
              ) : (
                <p className="text-muted-foreground font-serif leading-relaxed" data-testid="text-ai-insight">
                  {insightData?.insight || "Start tracking your wellness journey to receive personalized insights!"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </div>
        <Skeleton className="h-10 w-36" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <Skeleton className="h-4 w-24 mb-2" />
                  <Skeleton className="h-8 w-16" />
                </div>
                <Skeleton className="h-12 w-12 rounded-md" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2].map((i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent className="space-y-4">
              {[1, 2, 3].map((j) => (
                <Skeleton key={j} className="h-16 w-full" />
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
