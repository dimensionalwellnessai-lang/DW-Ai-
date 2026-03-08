/**
 * Insights Dashboard - PR #3: Replaces old Life Dashboard
 * Shows analytics across all 8 life dimensions with goals, streaks, and weekly summaries
 */
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  Flame,
  Target,
  Calendar,
  CheckCircle2,
  Sparkles,
  BookOpen,
  Tag,
} from "lucide-react";
import { LIFE_DIMENSIONS, getDimensionById } from "@/lib/life-dimensions";
import { format, startOfWeek, endOfWeek } from "date-fns";
import { useTrackFeature } from "@/hooks/use-ai-learning";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useAuth } from "@/hooks/use-auth";
import { getQueryFn } from "@/lib/queryClient";

interface DimensionAssessment {
  dimension: string;
  score: number;
  assessedAt: string;
}

interface Goal {
  id: string;
  title: string;
  progress: number;
  targetValue: number;
  wellnessDimension?: string;
  isActive: boolean;
}

interface Habit {
  id: string;
  title: string;
  streak: number;
}

interface Streak {
  id: string;
  streakType: string;
  currentStreak: number;
  longestStreak: number;
}

interface DwInsightItem {
  id: string;
  title: string;
  summary: string;
  insightLine?: string;
  quotes?: string[];
  theme?: string;
  tags?: string[];
  switchTag?: string;
  createdAt: string;
}

export default function InsightsDashboard() {
  useTrackFeature("insights");
  const dwInsightJournalEnabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);

  // Fetch dimension assessments
  const { data: assessments = [] } = useQuery<DimensionAssessment[]>({
    queryKey: ['/api/life-dimension-assessments'],
  });

  // Fetch goals
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ['/api/goals'],
  });

  // Fetch habits
  const { data: habits = [] } = useQuery<Habit[]>({
    queryKey: ['/api/habits'],
  });

  // Fetch streaks
  const { data: streaks = [] } = useQuery<Streak[]>({
    queryKey: ['/api/streaks'],
  });

  // DW Intelligence Insights (flag-gated, auth only)
  const { data: dwInsightsData } = useQuery<DwInsightItem[] | null>({
    queryKey: ['/api/dw/insights'],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
  });
  const dwInsights = dwInsightsData ?? [];

  // Calculate overall balance
  const getLatestAssessmentByDimension = () => {
    const latestByDimension: Record<string, DimensionAssessment> = {};
    assessments.forEach(assessment => {
      if (!latestByDimension[assessment.dimension] ||
          new Date(assessment.assessedAt) > new Date(latestByDimension[assessment.dimension].assessedAt)) {
        latestByDimension[assessment.dimension] = assessment;
      }
    });
    return latestByDimension;
  };

  const latestAssessments = getLatestAssessmentByDimension();
  const assessedDimensions = Object.keys(latestAssessments);
  const overallBalance = assessedDimensions.length > 0
    ? Math.round((assessedDimensions.reduce((sum, dim) => sum + latestAssessments[dim].score, 0) / assessedDimensions.length) * 20)
    : 0;

  // Calculate trend (compare to previous assessment)
  const getTrend = () => {
    // Simple implementation - check if more dimensions improved than declined
    let improved = 0;
    let declined = 0;
    
    LIFE_DIMENSIONS.forEach(dim => {
      const dimAssessments = assessments.filter(a => a.dimension === dim.id).sort((a, b) => 
        new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime()
      );
      
      if (dimAssessments.length >= 2) {
        if (dimAssessments[0].score > dimAssessments[1].score) improved++;
        else if (dimAssessments[0].score < dimAssessments[1].score) declined++;
      }
    });
    
    if (improved > declined) return { direction: "up", percentage: 5 };
    if (declined > improved) return { direction: "down", percentage: -3 };
    return { direction: "neutral", percentage: 0 };
  };

  const trend = getTrend();

  // Get active goals
  const activeGoals = goals.filter(g => g.isActive);

  // Get top streaks
  const topStreaks = [...streaks].sort((a, b) => b.currentStreak - a.currentStreak).slice(0, 3);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Insights" />
      
      <div className="flex-1 overflow-auto">
        <div className="container max-w-6xl mx-auto p-4 space-y-6">
        {/* Overview Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-primary" />
                  Life Balance
                </CardTitle>
                <CardDescription>Your overall wellness across all dimensions</CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold">{overallBalance}%</div>
                <div className={`flex items-center justify-end gap-1 text-sm ${
                  trend.direction === "up" ? "text-green-500" : 
                  trend.direction === "down" ? "text-red-500" : "text-muted-foreground"
                }`}>
                  {trend.direction === "up" && <TrendingUp className="h-4 w-4" />}
                  {trend.direction === "down" && <TrendingDown className="h-4 w-4" />}
                  {trend.percentage !== 0 && `${trend.percentage > 0 ? "+" : ""}${trend.percentage}% this week`}
                  {trend.percentage === 0 && "No change"}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Progress value={overallBalance} className="h-3" />
          </CardContent>
        </Card>

        {/* Dimensions Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {LIFE_DIMENSIONS.map(dimension => {
            const assessment = latestAssessments[dimension.id];
            const score = assessment ? assessment.score : 0;
            const Icon = dimension.icon;
            const percentage = Math.round(score * 20);

            return (
              <Card key={dimension.id} className="relative overflow-hidden">
                <CardContent className="pt-6">
                  <div className="flex flex-col items-center text-center gap-2">
                    <div className={`p-3 rounded-lg ${dimension.bg}`}>
                      <Icon className={`h-6 w-6 ${dimension.color}`} />
                    </div>
                    <p className="font-medium text-sm">{dimension.label}</p>
                    <div className="text-2xl font-bold">{percentage}%</div>
                    <Progress value={percentage} className="h-2 w-full" />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Tabs for detailed views */}
        <Tabs defaultValue={dwInsightJournalEnabled ? "dw-insights" : "goals"} className="w-full">
          <TabsList className={`grid w-full ${dwInsightJournalEnabled ? "grid-cols-4" : "grid-cols-3"}`}>
            {dwInsightJournalEnabled && (
              <TabsTrigger value="dw-insights">DW Insights</TabsTrigger>
            )}
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="streaks">Streaks</TabsTrigger>
            <TabsTrigger value="weekly">Weekly Summary</TabsTrigger>
          </TabsList>

          {/* DW Intelligence Insights Feed */}
          {dwInsightJournalEnabled && (
            <TabsContent value="dw-insights" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    DW Insight Feed
                  </CardTitle>
                  <CardDescription>
                    AI-generated insights captured from your conversations
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {!isLoggedIn ? (
                    <p className="text-muted-foreground text-center py-8">
                      Sign in to see your DW insights
                    </p>
                  ) : dwInsights.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No DW insights yet — have a conversation and use <strong>Process Conversation</strong> to generate your first insight
                    </p>
                  ) : (
                    dwInsights.map((insight) => (
                      <div key={insight.id} className="border rounded-lg p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-medium text-sm leading-snug">{insight.title}</p>
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            {format(new Date(insight.createdAt), "MMM d")}
                          </span>
                        </div>
                        {insight.insightLine && (
                          <p className="text-xs font-medium text-primary italic">
                            "{insight.insightLine}"
                          </p>
                        )}
                        <p className="text-xs text-muted-foreground">{insight.summary}</p>
                        {Array.isArray(insight.quotes) && insight.quotes.length > 0 && (
                          <div className="space-y-1">
                            {insight.quotes.slice(0, 2).map((q, i) => (
                              <p key={i} className="text-xs border-l-2 border-primary/30 pl-2 text-muted-foreground italic">
                                "{q}"
                              </p>
                            ))}
                          </div>
                        )}
                        {Array.isArray(insight.tags) && insight.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {insight.tags.map((tag) => (
                              <Badge key={tag} variant="secondary" className="text-[10px] py-0">
                                <Tag className="h-2.5 w-2.5 mr-1" />
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          )}

          <TabsContent value="goals" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Active Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {activeGoals.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No active goals yet. Create your first goal to get started!
                  </p>
                ) : (
                  activeGoals.map(goal => {
                    const dimension = goal.wellnessDimension ? getDimensionById(goal.wellnessDimension) : null;
                    const progress = Math.round((goal.progress / goal.targetValue) * 100);
                    
                    return (
                      <div key={goal.id} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{goal.title}</span>
                            {dimension && (
                              <Badge variant="outline" className={dimension.color}>
                                {dimension.label}
                              </Badge>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-muted-foreground">
                              {progress}%
                            </span>
                            {progress > 50 && <TrendingUp className="h-4 w-4 text-green-500" />}
                          </div>
                        </div>
                        <Progress value={progress} className="h-2" />
                      </div>
                    );
                  })
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="streaks" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flame className="h-5 w-5 text-orange-500" />
                  Current Streaks
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {topStreaks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">
                    No streaks yet. Complete habits consistently to build streaks!
                  </p>
                ) : (
                  topStreaks.map(streak => (
                    <div key={streak.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Flame className="h-6 w-6 text-orange-500" />
                        <div>
                          <p className="font-medium capitalize">{streak.streakType.replace("_", " ")}</p>
                          <p className="text-sm text-muted-foreground">
                            Longest: {streak.longestStreak} days
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{streak.currentStreak}</p>
                        <p className="text-sm text-muted-foreground">days</p>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  This Week's Summary
                </CardTitle>
                <CardDescription>
                  {format(startOfWeek(new Date()), "MMM d")} - {format(endOfWeek(new Date()), "MMM d, yyyy")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Assessments</p>
                    <p className="text-2xl font-bold">{assessedDimensions.length}/8</p>
                    <p className="text-xs text-muted-foreground">dimensions assessed</p>
                  </div>
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-muted-foreground">Goals Progress</p>
                    <p className="text-2xl font-bold">{activeGoals.length}</p>
                    <p className="text-xs text-muted-foreground">active goals</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <p className="font-medium mb-2">Quick Stats</p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{habits.filter(h => h.streak > 0).length} habits with active streaks</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Target className="h-4 w-4 text-blue-500" />
                      <span>{activeGoals.filter(g => g.progress > 50).length} goals over 50% complete</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <span>Overall balance: {overallBalance}%</span>
                    </li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
      </div>
    </div>
  );
}
