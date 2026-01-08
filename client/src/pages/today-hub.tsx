import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProactiveCard, ProactiveCardProps } from "@/components/proactive-card";
import {
  Zap,
  Heart,
  MessageSquare,
  Sun,
  Moon,
  Calendar,
  Clock,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Circle,
  ChevronRight,
  Brain,
  Target,
  Layers,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import type { MoodLog, CalendarEvent, Routine, ScheduleBlock, Goal } from "@shared/schema";

function formatTime12Hour(time24: string): string {
  if (!time24) return "";
  const [hours, minutes] = time24.split(":").map(Number);
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function TodayHubSkeleton() {
  return (
    <div className="space-y-6 p-4 md:p-6 max-w-4xl mx-auto">
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-24 w-full rounded-2xl" />
      <div className="grid grid-cols-3 gap-3">
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
        <Skeleton className="h-20" />
      </div>
      <Skeleton className="h-48" />
    </div>
  );
}

export default function TodayHubPage() {
  const [, navigate] = useLocation();
  const today = new Date();
  const dayOfWeek = today.getDay();
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [showLifeSystemExplainer, setShowLifeSystemExplainer] = useState(false);

  const { data: moodData } = useQuery<MoodLog | null>({
    queryKey: ["/api/mood/today"],
  });

  const { data: calendarEvents = [] } = useQuery<CalendarEvent[]>({
    queryKey: ["/api/calendar"],
  });

  const { data: scheduleBlocks = [] } = useQuery<ScheduleBlock[]>({
    queryKey: ["/api/schedule"],
  });

  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["/api/routines"],
  });

  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
  });

  const { data: user } = useQuery<{ displayName?: string; username?: string }>({
    queryKey: ["/api/user"],
  });

  const { isLoading } = useQuery<{ systemName: string }>({
    queryKey: ["/api/dashboard"],
  });

  const energyLevel = moodData?.energyLevel ?? null;
  const moodLevel = moodData?.moodLevel ?? null;

  const todaysBlocks = scheduleBlocks.filter((block) => block.dayOfWeek === dayOfWeek);

  const todaysEvents = calendarEvents.filter((event) => {
    const todayStr = today.toISOString().split("T")[0];
    if (event.startTime.includes("T") || event.startTime.includes("-")) {
      return event.startTime.startsWith(todayStr);
    }
    return true;
  });

  const morningRoutines = routines.filter((r) => {
    const tags = r.dimensionTags || [];
    return r.isActive && (tags.includes("morning") || r.name.toLowerCase().includes("morning"));
  });

  const activeGoals = goals.filter(g => g.isActive).slice(0, 3);

  const proactiveCards = useMemo(() => {
    const cards: ProactiveCardProps[] = [];
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12 && !moodData) {
      cards.push({
        type: "morning-briefing",
        title: "Start your day with intention",
        message: "A quick check-in helps me personalize your day. How are you feeling right now?",
        actionLabel: "Check in",
        onAction: () => navigate("/weekly-checkin"),
        priority: "high",
      });
    }

    if (energyLevel !== null && energyLevel <= 4) {
      cards.push({
        type: "energy-suggestion",
        title: "Your energy is running low",
        message: "Based on your check-in, a short walk or 5-minute stretch might help restore some energy.",
        actionLabel: "See options",
        onAction: () => navigate("/recovery"),
      });
    }

    if (hour >= 18 && hour < 22) {
      cards.push({
        type: "wind-down",
        title: "Time to wind down",
        message: "Evening is approaching. Would you like to review today and prepare for tomorrow?",
        actionLabel: "Wind down",
        onAction: () => navigate("/"),
      });
    }

    if (activeGoals.length > 0 && todaysBlocks.length === 0 && todaysEvents.length === 0) {
      cards.push({
        type: "goal-reminder",
        title: "Nothing scheduled today",
        message: `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}. Want me to suggest some actions?`,
        actionLabel: "Get suggestions",
        onAction: () => navigate("/"),
      });
    }

    return cards.filter(c => !dismissedCards.has(c.type));
  }, [moodData, energyLevel, dismissedCards, navigate, activeGoals.length, todaysBlocks.length, todaysEvents.length]);

  const dismissCard = (type: string) => {
    setDismissedCards(prev => new Set(Array.from(prev).concat(type)));
  };

  const getEnergyColor = (level: number | null) => {
    if (level === null) return "text-muted-foreground";
    if (level >= 7) return "text-emerald-500";
    if (level >= 4) return "text-amber-500";
    return "text-rose-500";
  };

  const getEnergyBgColor = (level: number | null) => {
    if (level === null) return "bg-muted";
    if (level >= 7) return "bg-emerald-500/10";
    if (level >= 4) return "bg-amber-500/10";
    return "bg-rose-500/10";
  };

  const userName = user?.displayName || user?.username || "";

  if (isLoading) {
    return <TodayHubSkeleton />;
  }

  return (
    <div className="min-h-screen">
      <div className="space-y-5 p-4 md:p-6 max-w-2xl mx-auto">
        <header className="pt-2">
          <p className="text-sm text-muted-foreground">
            {today.toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
            })}
          </p>
          <h1 className="text-2xl font-bold mt-1" data-testid="text-greeting">
            {getGreeting()}{userName ? `, ${userName}` : ""}
          </h1>
        </header>

        {!showLifeSystemExplainer && (
          <section data-testid="section-build-system">
            <Card className="bg-gradient-to-br from-primary/5 via-primary/8 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm mb-1">Build Your Life System</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Not just wellness — how everything in your life works together.
                    </p>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-3"
                  onClick={() => setShowLifeSystemExplainer(true)}
                  data-testid="button-learn-life-system"
                >
                  Learn how this works
                </Button>
              </CardContent>
            </Card>
          </section>
        )}

        {showLifeSystemExplainer && (
          <section data-testid="section-life-system-explainer">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center flex-shrink-0">
                    <Layers className="h-5 w-5 text-primary" />
                  </div>
                  <h3 className="font-semibold">Your Life System</h3>
                </div>
                
                <div className="space-y-3 text-sm text-muted-foreground leading-relaxed">
                  <p>
                    A life system is the way all parts of your life support — or drain — each other.
                  </p>
                  <p>
                    Wellness is part of it, but not the whole thing.
                  </p>
                  <p>
                    Your energy, schedule, relationships, environment, money, habits, and purpose all interact.
                  </p>
                  <p>
                    DW helps you organize those pieces so your life works with you, not against you.
                  </p>
                </div>

                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground mb-3">
                    Life dimensions help regulate your system. Your life system is how everything connects.
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Body & energy</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Emotions & mental state</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Relationships & social life</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Environment & routines</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Work, money & responsibilities</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Circle className="h-2 w-2 text-primary" />
                      <span>Meaning & direction</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 pt-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setShowLifeSystemExplainer(false);
                      navigate("/chat");
                    }}
                    data-testid="button-start-where-i-am"
                  >
                    Help me start where I am
                  </Button>
                  <Button 
                    size="sm" 
                    className="flex-1"
                    onClick={() => {
                      setShowLifeSystemExplainer(false);
                      navigate("/chat");
                    }}
                    data-testid="button-show-connections"
                  >
                    Show me how this connects
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>
        )}

        {proactiveCards.length > 0 && (
          <section className="space-y-3" data-testid="section-proactive">
            {proactiveCards.map((card, index) => (
              <div 
                key={card.type}
                className="animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <ProactiveCard 
                  {...card} 
                  onDismiss={() => dismissCard(card.type)}
                />
              </div>
            ))}
          </section>
        )}

        <section className="grid grid-cols-3 gap-3" data-testid="section-vitals">
          <Card className="hover-elevate" data-testid="card-energy">
            <CardContent className="p-3 text-center">
              <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${getEnergyBgColor(energyLevel)}`}>
                <Zap className={`h-5 w-5 ${getEnergyColor(energyLevel)}`} />
              </div>
              <p className={`text-lg font-bold mt-2 ${getEnergyColor(energyLevel)}`}>
                {energyLevel !== null ? energyLevel : "--"}
              </p>
              <p className="text-xs text-muted-foreground">Energy</p>
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-mood">
            <CardContent className="p-3 text-center">
              <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-rose-500/10">
                <Heart className="h-5 w-5 text-rose-500" />
              </div>
              <p className="text-lg font-bold mt-2">
                {moodLevel !== null ? moodLevel : "--"}
              </p>
              <p className="text-xs text-muted-foreground">Mood</p>
            </CardContent>
          </Card>

          <Link href="/weekly-checkin">
            <Card className="hover-elevate cursor-pointer h-full" data-testid="card-checkin">
              <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <p className="text-xs font-medium mt-2 text-primary">Check in</p>
              </CardContent>
            </Card>
          </Link>
        </section>

        <section data-testid="section-schedule">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Today's Schedule
            </h2>
            <Link href="/calendar/schedule">
              <Button variant="ghost" size="sm" className="text-xs" data-testid="button-view-calendar">
                View all
                <ChevronRight className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>

          {todaysBlocks.length === 0 && todaysEvents.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="py-8 text-center">
                <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground mb-3">Nothing scheduled for today</p>
                <Link href="/chat">
                  <Button variant="outline" size="sm" data-testid="button-ask-dw">
                    <Sparkles className="h-3 w-3 mr-2" />
                    Ask DW to plan my day
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              {todaysBlocks.slice(0, 4).map((block) => (
                <Card key={block.id} className="hover-elevate" data-testid={`schedule-block-${block.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-16 flex-shrink-0">
                      {formatTime12Hour(block.startTime)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{block.title}</p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </CardContent>
                </Card>
              ))}
              {todaysEvents.slice(0, 4).map((event) => (
                <Card key={event.id} className="hover-elevate" data-testid={`calendar-event-${event.id}`}>
                  <CardContent className="p-3 flex items-center gap-3">
                    <div className="text-xs text-muted-foreground w-16 flex-shrink-0">
                      {formatTime12Hour(event.startTime)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium">{event.title}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">Event</Badge>
                  </CardContent>
                </Card>
              ))}
              {(todaysBlocks.length + todaysEvents.length) > 4 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  +{todaysBlocks.length + todaysEvents.length - 4} more items
                </p>
              )}
            </div>
          )}
        </section>

        {activeGoals.length > 0 && (
          <section data-testid="section-goals">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2">
                <Target className="h-4 w-4" />
                Active Goals
              </h2>
              <Link href="/plans">
                <Button variant="ghost" size="sm" className="text-xs" data-testid="button-view-goals">
                  View all
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>
            <div className="space-y-2">
              {activeGoals.map((goal) => (
                <Card key={goal.id} className="hover-elevate" data-testid={`goal-card-${goal.id}`}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium">{goal.title}</p>
                      <Badge variant="outline" className="text-xs">
                        {goal.progress || 0}%
                      </Badge>
                    </div>
                    <Progress value={goal.progress || 0} className="h-1.5" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section className="grid grid-cols-2 gap-3" data-testid="section-routines">
          <Card className="hover-elevate" data-testid="card-morning-routine">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Sun className="h-4 w-4 text-amber-500" />
                <span className="text-sm font-medium">Morning</span>
              </div>
              {morningRoutines.length === 0 ? (
                <p className="text-xs text-muted-foreground">No routine set</p>
              ) : (
                <div className="space-y-1.5">
                  {morningRoutines.slice(0, 2).map((routine) => (
                    <div key={routine.id} className="flex items-center gap-2">
                      <Circle className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs truncate">{routine.name}</span>
                    </div>
                  ))}
                  {morningRoutines.length > 2 && (
                    <p className="text-xs text-muted-foreground">
                      +{morningRoutines.length - 2} more
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="hover-elevate" data-testid="card-evening-routine">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Moon className="h-4 w-4 text-indigo-500" />
                <span className="text-sm font-medium">Wind Down</span>
              </div>
              <Link href="/routines">
                <Button variant="ghost" size="sm" className="w-full text-xs h-8" data-testid="button-setup-routine">
                  Set up routine
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>

        <section data-testid="section-talk">
          <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <MessageSquare className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-sm">Talk to DW</h3>
                  <p className="text-xs text-muted-foreground">
                    Process thoughts, plan your day, or just chat
                  </p>
                </div>
                <Link href="/chat">
                  <Button size="sm" data-testid="button-talk-to-dw">
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
