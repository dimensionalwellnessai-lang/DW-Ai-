import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dumbbell, Utensils, Brain, Moon, RefreshCw,
  ChevronRight, Flame, Heart, Leaf, Camera, Sparkles,
  Target, ArrowRight, Link2,
} from "lucide-react";
import { BodyScanDialog } from "@/components/body-scan-dialog";
import { hasCompletedBodyScan } from "@/lib/guest-storage";
import { DWContextPrompt } from "@/components/dw-context-prompt";
import { PlanHubNav } from "@/components/plan-hub-nav";

const DAY_COLORS: Record<string, string> = {
  Monday:    "from-violet-500/10 to-violet-500/5 border-violet-500/20",
  Tuesday:   "from-blue-500/10 to-blue-500/5 border-blue-500/20",
  Wednesday: "from-emerald-500/10 to-emerald-500/5 border-emerald-500/20",
  Thursday:  "from-amber-500/10 to-amber-500/5 border-amber-500/20",
  Friday:    "from-rose-500/10 to-rose-500/5 border-rose-500/20",
  Saturday:  "from-cyan-500/10 to-cyan-500/5 border-cyan-500/20",
  Sunday:    "from-purple-500/10 to-purple-500/5 border-purple-500/20",
};

const DAY_ACCENT: Record<string, string> = {
  Monday:    "text-violet-600 dark:text-violet-400",
  Tuesday:   "text-blue-600 dark:text-blue-400",
  Wednesday: "text-emerald-600 dark:text-emerald-400",
  Thursday:  "text-amber-600 dark:text-amber-400",
  Friday:    "text-rose-600 dark:text-rose-400",
  Saturday:  "text-cyan-600 dark:text-cyan-400",
  Sunday:    "text-purple-600 dark:text-purple-400",
};

const DAYS_OF_WEEK = ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"];
const today = DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];

function WorkoutCard({ workout }: { workout: any }) {
  const [, setLocation] = useLocation();
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => setLocation("/workout")}
      data-testid="card-plan-workout"
    >
      <div className="w-9 h-9 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
        <Dumbbell className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <p className="font-medium text-sm">{workout.type}</p>
          <Badge variant="outline" className="text-[10px]">{workout.duration}</Badge>
        </div>
        <p className="text-xs text-muted-foreground mb-1">{workout.focus}</p>
        {workout.exercises?.slice(0, 3).map((ex: string, i: number) => (
          <span key={i} className="text-xs text-muted-foreground mr-2">• {ex}</span>
        ))}
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </div>
  );
}

function NutritionCard({ nutrition, target }: { nutrition: any; target: any }) {
  const [, setLocation] = useLocation();
  return (
    <div
      className="flex items-start gap-3 p-3 rounded-lg bg-background/50 border cursor-pointer hover:bg-muted/30 transition-colors"
      onClick={() => setLocation("/meal-prep")}
      data-testid="card-plan-nutrition"
    >
      <div className="w-9 h-9 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
        <Utensils className="w-4 h-4 text-orange-600 dark:text-orange-400" />
      </div>
      <div className="flex-1 min-w-0">
        {target && (
          <div className="flex items-center gap-2 mb-1">
            <Badge variant="outline" className="text-[10px]">{target.calories} cal</Badge>
            <Badge variant="outline" className="text-[10px]">{target.protein} protein</Badge>
          </div>
        )}
        <div className="space-y-0.5">
          {nutrition.breakfast && <p className="text-xs text-muted-foreground">🌅 {nutrition.breakfast}</p>}
          {nutrition.lunch && <p className="text-xs text-muted-foreground">☀️ {nutrition.lunch}</p>}
          {nutrition.dinner && <p className="text-xs text-muted-foreground">🌙 {nutrition.dinner}</p>}
          {nutrition.snack && <p className="text-xs text-muted-foreground">🍎 {nutrition.snack}</p>}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0 mt-1" />
    </div>
  );
}

function QuickLinkCard({ label, Icon, route, color }: { label: string; Icon: any; route: string; color: string }) {
  const [, setLocation] = useLocation();
  return (
    <Card
      className="cursor-pointer hover:bg-muted/30 transition-colors border"
      onClick={() => setLocation(route)}
      data-testid={`card-quicklink-${label.toLowerCase().replace(" ", "-")}`}
    >
      <CardContent className="p-3 flex items-center gap-2">
        <Icon className={`w-4 h-4 ${color}`} />
        <span className="text-sm font-medium">{label}</span>
        <ArrowRight className="w-3 h-3 text-muted-foreground ml-auto" />
      </CardContent>
    </Card>
  );
}

function DayCard({ day, isToday, physicalGoals }: { day: any; isToday: boolean; physicalGoals?: any[] }) {
  const [expanded, setExpanded] = useState(isToday);
  const colorClass = DAY_COLORS[day.day] || DAY_COLORS.Monday;
  const accentClass = DAY_ACCENT[day.day] || DAY_ACCENT.Monday;

  return (
    <Card
      className={`overflow-hidden border bg-gradient-to-br ${colorClass} ${isToday ? "ring-2 ring-primary/30" : ""}`}
      data-testid={`card-plan-day-${day.day.toLowerCase()}`}
    >
      <button
        className="w-full text-left"
        onClick={() => setExpanded(!expanded)}
        data-testid={`button-expand-day-${day.day.toLowerCase()}`}
      >
        <CardHeader className="pb-2 pt-3 px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`font-display font-bold text-base ${accentClass}`}>{day.day}</span>
              {isToday && <Badge className="text-[10px] bg-primary text-primary-foreground">Today</Badge>}
            </div>
            <div className="flex items-center gap-2">
              {day.workout && (
                <div className="flex items-center gap-1">
                  <Dumbbell className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{day.workout.duration}</span>
                </div>
              )}
              <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${expanded ? "rotate-90" : ""}`} />
            </div>
          </div>
          {day.intention && (
            <p className="text-xs text-muted-foreground italic mt-1">"{day.intention}"</p>
          )}
        </CardHeader>
      </button>

      {expanded && (
        <CardContent className="px-4 pb-4 space-y-3">
          {day.workout && (
            <div>
              <WorkoutCard workout={day.workout} />
              {physicalGoals && physicalGoals.length > 0 && (
                <div className="flex items-center gap-1 mt-1.5 flex-wrap px-1">
                  <Link2 className="h-3 w-3 text-muted-foreground shrink-0" />
                  {physicalGoals.slice(0, 2).map((g: any) => (
                    <span key={g.id} className="text-[10px] bg-primary/10 text-primary rounded-full px-2 py-0.5">
                      → {g.title.length > 22 ? g.title.slice(0, 22) + "…" : g.title}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
          {day.nutrition && <NutritionCard nutrition={day.nutrition} target={null} />}
          {day.habits?.length > 0 && (
            <div className="p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-4 h-4 text-violet-500" />
                <span className="text-sm font-medium">Habit Focus</span>
              </div>
              <div className="flex flex-wrap gap-1">
                {day.habits.map((h: string, i: number) => (
                  <Badge key={i} variant="outline" className="text-xs">{h}</Badge>
                ))}
              </div>
            </div>
          )}
          {day.recovery && (
            <div className="p-3 rounded-lg bg-background/50 border">
              <div className="flex items-center gap-2 mb-1">
                <Moon className="w-4 h-4 text-indigo-500" />
                <span className="text-sm font-medium">Recovery</span>
              </div>
              <p className="text-xs text-muted-foreground">{day.recovery}</p>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function PlanSkeleton() {
  return (
    <div className="space-y-4 px-4 pb-32">
      <Skeleton className="h-24 w-full rounded-xl" />
      <Skeleton className="h-16 w-full rounded-xl" />
      {[...Array(7)].map((_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function MyPlanPage() {
  usePageMeta("My Plan", "Your unified weekly system.");
  const [, setLocation] = useLocation();
  const [bodyScanOpen, setBodyScanOpen] = useState(false);
  const [bodyScanDone, setBodyScanDone] = useState(hasCompletedBodyScan());

  const { data: plan, isLoading, refetch, isFetching } = useQuery<any>({
    queryKey: ["/api/my-plan"],
    staleTime: 1000 * 60 * 30,
  });

  const { data: goals = [] } = useQuery<any[]>({ queryKey: ["/api/goals"] });
  const { data: habits = [] } = useQuery<any[]>({ queryKey: ["/api/habits"] });

  const activeGoals = (goals as any[]).filter((g: any) => g.isActive !== false && (g.progress ?? 0) < 100);
  const todayHabits = (habits as any[]).filter((h: any) => h.isActive !== false);
  const completedHabits = todayHabits.filter((h: any) => h.completedToday);

  const handleRegenerate = () => {
    queryClient.removeQueries({ queryKey: ["/api/my-plan"] });
    refetch();
  };

  const handleBodyScanComplete = () => {
    setBodyScanDone(true);
    setBodyScanOpen(false);
    handleRegenerate();
  };

  const hasPlan = plan && plan.days && Array.isArray(plan.days);

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader
        title="My Plan"
        rightContent={
          hasPlan ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleRegenerate}
              disabled={isFetching}
              data-testid="button-regenerate-plan"
            >
              {isFetching ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
            </Button>
          ) : undefined
        }
      />

      <PlanHubNav />

      <ScrollArea className="flex-1">
        <div className="px-4 pt-4">
          <DWContextPrompt
            topic="Help me optimize my weekly plan"
            placeholder="Help me optimize my plan or adjust my schedule"
            context="page:my-plan"
          />
        </div>
        {isLoading ? (
          <PlanSkeleton />
        ) : plan?.error ? (
          <div className="px-4 py-12 text-center">
            <Sparkles className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground mb-4">Couldn't generate your plan right now.</p>
            <Button onClick={handleRegenerate} data-testid="button-retry-plan">Try again</Button>
          </div>
        ) : (
          <div className="space-y-4 px-4 pt-4 pb-32">

            {/* Body scan prompt if not done */}
            {!bodyScanDone && (
              <Card className="border-primary/20 bg-primary/5" data-testid="card-body-scan-prompt">
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Camera className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">Complete your Body Profile</p>
                    <p className="text-xs text-muted-foreground">Personalizes every workout and meal in your plan</p>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => setBodyScanOpen(true)}
                    data-testid="button-open-body-scan"
                  >
                    Start
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Week theme + insight */}
            {hasPlan && (
              <>
                <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-display font-semibold text-base mb-1">{plan.weekTheme}</p>
                        {plan.weeklyInsight && (
                          <p className="text-sm text-muted-foreground">{plan.weeklyInsight}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Goals This Week */}
                {activeGoals.length > 0 && (
                  <Card className="border-primary/20" data-testid="card-plan-goals">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-xs font-semibold flex items-center gap-1.5 text-primary">
                          <Target className="h-3.5 w-3.5" />
                          Goals This Week
                        </p>
                        <button
                          onClick={() => setLocation("/goals")}
                          className="text-[10px] text-muted-foreground hover:text-primary transition-colors"
                        >
                          View all →
                        </button>
                      </div>
                      <div className="space-y-1.5">
                        {activeGoals.slice(0, 3).map((g: any) => (
                          <div key={g.id} className="flex items-center gap-2">
                            <div
                              className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden cursor-pointer"
                              onClick={() => setLocation("/goals")}
                            >
                              <div
                                className="h-full bg-primary/70 rounded-full"
                                style={{ width: `${g.progress ?? 0}%` }}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground truncate max-w-[120px]">{g.title}</span>
                            <span className="text-[10px] text-primary font-medium shrink-0">{g.progress ?? 0}%</span>
                          </div>
                        ))}
                      </div>
                      {todayHabits.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-dashed flex items-center justify-between">
                          <span className="text-[10px] text-muted-foreground">Habits today</span>
                          <span className="text-[10px] font-medium text-primary">{completedHabits.length}/{todayHabits.length} done</span>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Body goal + nutrition summary */}
                <div className="grid grid-cols-2 gap-3">
                  {plan.bodyGoalFocus && (
                    <Card className="border-rose-500/20 bg-rose-500/5">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Target className="w-4 h-4 text-rose-500" />
                          <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">Body Goal</span>
                        </div>
                        <p className="text-xs text-muted-foreground leading-snug">{plan.bodyGoalFocus}</p>
                      </CardContent>
                    </Card>
                  )}
                  {plan.nutritionTarget && (
                    <Card className="border-orange-500/20 bg-orange-500/5">
                      <CardContent className="p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <Flame className="w-4 h-4 text-orange-500" />
                          <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">Daily Target</span>
                        </div>
                        <p className="text-xs font-medium">{plan.nutritionTarget.calories} cal</p>
                        <p className="text-xs text-muted-foreground">{plan.nutritionTarget.protein} protein</p>
                      </CardContent>
                    </Card>
                  )}
                </div>

                {/* 7-day cards */}
                <div className="space-y-3">
                  {plan.days.map((day: any) => (
                    <DayCard
                      key={day.day}
                      day={day}
                      isToday={day.day === today}
                      physicalGoals={activeGoals.filter((g: any) => g.wellnessDimension === "physical" || !g.wellnessDimension)}
                    />
                  ))}
                </div>

                {/* Quick links */}
                <div className="grid grid-cols-2 gap-3 pt-2">
                  {[
                    { label: "Workout", icon: Dumbbell, route: "/workout", color: "text-emerald-500" },
                    { label: "Meal Prep", icon: Utensils, route: "/meal-prep", color: "text-orange-500" },
                    { label: "Habits", icon: Heart, route: "/habits", color: "text-violet-500" },
                    { label: "Spiritual", icon: Leaf, route: "/spiritual", color: "text-indigo-500" },
                  ].map(({ label, icon: Icon, route, color }) => (
                    <QuickLinkCard
                      key={route}
                      label={label}
                      Icon={Icon}
                      route={route}
                      color={color}
                    />
                  ))}
                </div>
              </>
            )}

            {/* Empty state */}
            {!hasPlan && !isLoading && (
              <div className="text-center py-16">
                <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-display font-semibold text-lg mb-2">Building your plan…</h3>
                <p className="text-muted-foreground text-sm mb-6">DW is putting together a unified weekly system just for you.</p>
                <Button onClick={handleRegenerate} data-testid="button-generate-plan">
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate My Plan
                </Button>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      <BodyScanDialog
        open={bodyScanOpen}
        onClose={() => setBodyScanOpen(false)}
        onComplete={handleBodyScanComplete}
      />
    </div>
  );
}
