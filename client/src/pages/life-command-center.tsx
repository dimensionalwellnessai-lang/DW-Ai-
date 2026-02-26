import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { motion } from "framer-motion";
import { PageHeader } from "@/components/page-header";
import {
  Sparkles,
  Calendar,
  Star,
  BookOpen,
  Dumbbell,
  Utensils,
  RefreshCw,
  Target,
  CheckCircle2,
  Circle,
  ChevronRight,
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  Plus,
  MessageCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { DWBriefingCard } from "@/components/dw-briefing-card";

// ─── Life dimension definitions ──────────────────────────────────────────────

const DIMENSIONS = [
  { id: "body", label: "Body", icon: Zap, color: "text-red-400", bg: "bg-red-500/10" },
  { id: "mind", label: "Mind", icon: Brain, color: "text-purple-400", bg: "bg-purple-500/10" },
  { id: "time", label: "Time", icon: Clock, color: "text-blue-400", bg: "bg-blue-500/10" },
  { id: "purpose", label: "Purpose", icon: Compass, color: "text-amber-400", bg: "bg-amber-500/10" },
  { id: "money", label: "Money", icon: Wallet, color: "text-green-400", bg: "bg-green-500/10" },
  { id: "relationships", label: "Relationships", icon: Users, color: "text-pink-400", bg: "bg-pink-500/10" },
  { id: "environment", label: "Environment", icon: Home, color: "text-cyan-400", bg: "bg-cyan-500/10" },
  { id: "identity", label: "Identity", icon: Sprout, color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

// ─── Daily cosmic insights pool ──────────────────────────────────────────────

const DAILY_INSIGHTS = [
  "Your energy flows best when aligned with your natural rhythms. Trust your body's wisdom today.",
  "New beginnings are stirring. A small, intentional action today creates tomorrow's momentum.",
  "Reflection brings clarity. Pause to notice what's working before chasing what's next.",
  "Relationships flourish with presence. One genuine connection today feeds your spirit.",
  "Your purpose is unfolding, even in the quiet moments. Stay open to subtle signs.",
  "Abundance starts with gratitude. Name three things that are already good.",
  "Your environment shapes your mindset. A small space reset can shift your entire day.",
  "Growth lives at the edge of comfort. One brave step forward today matters.",
  "Balance is dynamic, not static. Honor your need for rest as much as action.",
  "Your identity is evolving. Let go of who you were to become who you're becoming.",
  "Creativity is a form of self-care. Allow play and expression today.",
  "Deep work follows deep rest. Protect your recovery as fiercely as your productivity.",
  "Clarity comes from commitment. Choose one thing and go all in, even briefly.",
  "You are more resilient than you realize. Today's challenges build tomorrow's strength.",
  "Simplicity is power. What can you remove to make space for what truly matters?",
];

function getDailyInsight(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 1);
  const dayOfYear = Math.floor((now.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return DAILY_INSIGHTS[dayOfYear % DAILY_INSIGHTS.length];
}

function getTimeOfDay(): "morning" | "afternoon" | "evening" {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function getTimeBasedGreeting(name?: string): string {
  const tod = getTimeOfDay();
  const prefix = `Good ${tod}`;
  return name ? `${prefix}, ${name}` : prefix;
}

// ─── Section header component ─────────────────────────────────────────────────

function SectionHeader({
  title,
  href,
  icon: Icon,
}: {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  const [, navigate] = useLocation();
  return (
    <div className="flex items-center justify-between mb-3">
      <button
        onClick={() => navigate(href)}
        className="flex items-center gap-2 group focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-label={`Go to ${title}`}
      >
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <span className="font-semibold text-base group-hover:text-primary transition-colors">{title}</span>
      </button>
      <button
        onClick={() => navigate(href)}
        className="text-xs text-muted-foreground hover:text-primary transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
        aria-label={`See all ${title}`}
      >
        See all <ChevronRight className="h-3 w-3" />
      </button>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function LifeCommandCenter() {
  const [, navigate] = useLocation();
  const [energyLevel, setEnergyLevel] = useState<"low" | "medium" | "high" | null>(() => {
    const today = new Date().toDateString();
    const stored = localStorage.getItem("dw_energy_checkin");
    if (stored) {
      try {
        const { date, level } = JSON.parse(stored);
        if (date === today) return level;
      } catch {}
    }
    return null;
  });

  const todayDate = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // ── Data fetching ──────────────────────────────────────────────────────────

  const { data: authData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const user = authData?.user;

  const { data: calendarEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/calendar"],
  });

  const { data: blueprints = [] } = useQuery<any[]>({
    queryKey: ["/api/dimension-blueprints"],
  });

  const { data: goals = [] } = useQuery<any[]>({
    queryKey: ["/api/goals"],
  });

  const { data: habits = [] } = useQuery<any[]>({
    queryKey: ["/api/habits"],
  });

  // ── Derived data ───────────────────────────────────────────────────────────

  const activeGoals = goals.filter((g: any) => g.status !== "completed" && g.status !== "archived");

  const activeHabits = habits.filter((h: any) => h.isActive !== false);

  const filledDimensionIds = new Set(
    blueprints.filter((b: any) => b.dimension && (b.vision || b.values?.length)).map((b: any) => b.dimension)
  );
  const completedDimensions = DIMENSIONS.filter((d) => filledDimensionIds.has(d.id));
  const incompleteDimensions = DIMENSIONS.filter((d) => !filledDimensionIds.has(d.id));
  const blueprintProgress = Math.round((completedDimensions.length / DIMENSIONS.length) * 100);

  // Quick suggestion for DW panel — sort ascending so we pick the *next* event
  const getQuickSuggestion = () => {
    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    const upcomingEvent = [...calendarEvents]
      .filter((e: any) => {
        const t = e.startTime ? new Date(e.startTime) : null;
        return t && t > now && t < twoHoursFromNow;
      })
      .sort((a: any, b: any) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    if (upcomingEvent) return { text: `"${upcomingEvent.title}" is coming up soon`, action: () => navigate("/calendar") };

    const incompleteHabit = activeHabits.find((h: any) => !h.completedToday);
    if (incompleteHabit) return { text: `Complete "${incompleteHabit.title}" to keep your streak`, action: () => navigate("/habits") };

    const lowestGoal = [...activeGoals].sort((a: any, b: any) => (a.progress || 0) - (b.progress || 0))[0];
    if (lowestGoal) return { text: `Make progress on "${lowestGoal.title}"`, action: () => navigate("/goals") };

    if (incompleteDimensions.length > 0)
      return { text: `Define your ${incompleteDimensions[0].label} blueprint with DW`, action: () => navigate("/talk") };

    return { text: "Check your cosmic insight for today", action: () => navigate("/cosmic") };
  };

  const quickSuggestion = getQuickSuggestion();

  // Save energy check-in
  const handleEnergyCheckin = (level: "low" | "medium" | "high") => {
    setEnergyLevel(level);
    localStorage.setItem("dw_energy_checkin", JSON.stringify({ date: new Date().toDateString(), level }));
  };

  // Check if cosmic birth data is configured
  const hasBirthData = !!localStorage.getItem("dw_birth_chart");
  const dailyInsight = getDailyInsight();

  // Today's events (filter to today, sorted chronologically with all-day first)
  const todayStr = new Date().toDateString();
  const todayEvents = calendarEvents
    .filter((e: any) => {
      if (!e.startTime) return new Date(e.date || e.createdAt || Date.now()).toDateString() === todayStr;
      return new Date(e.startTime).toDateString() === todayStr;
    })
    .sort((a: any, b: any) => {
      const aAllDay = !a.startTime;
      const bAllDay = !b.startTime;
      if (aAllDay && !bAllDay) return -1;
      if (!aAllDay && bAllDay) return 1;
      const aTime = a.startTime ? new Date(a.startTime).getTime() : 0;
      const bTime = b.startTime ? new Date(b.startTime).getTime() : 0;
      return aTime - bTime;
    })
    .slice(0, 4);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="Home" showBack={false} />
      <div className="flex-1 overflow-auto">
        <div className="container max-w-2xl mx-auto p-4 space-y-6 pb-8">

          {/* ── DW Avatar Panel ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }}>
            <Card className="border-primary/20 bg-primary/5">
              <CardContent className="p-4 space-y-3">
                {/* Greeting row */}
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-lg leading-tight">
                      {getTimeBasedGreeting(user?.firstName || user?.systemName)}
                    </p>
                    <p className="text-xs text-muted-foreground">{todayDate}</p>
                  </div>
                </div>

                {/* Quick suggestion */}
                <button
                  onClick={quickSuggestion.action}
                  aria-label={`Suggested focus: ${quickSuggestion.text}`}
                  className="w-full text-left p-3 rounded-lg bg-background/70 border border-border/50 hover:border-primary/40 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-0.5 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> Suggested focus
                  </p>
                  <p className="text-sm font-medium">{quickSuggestion.text}</p>
                </button>

                {/* Energy check-in */}
                {!energyLevel ? (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {getTimeOfDay() === "morning"
                        ? "How's your energy this morning?"
                        : getTimeOfDay() === "afternoon"
                        ? "How's your energy right now?"
                        : "How has your energy been today?"}
                    </p>
                    <div className="flex gap-2">
                      {(["low", "medium", "high"] as const).map((level) => (
                        <button
                          key={level}
                          onClick={() => handleEnergyCheckin(level)}
                          aria-label={`Mark energy as ${level}`}
                          className="flex-1 py-1.5 text-xs rounded-md border border-border hover:bg-primary/10 hover:border-primary/40 transition-all capitalize focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          {level === "low" ? "🌙 Low" : level === "medium" ? "⚡ Medium" : "🔥 High"}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Energy today:{" "}
                      <span className="font-medium capitalize text-foreground">
                        {energyLevel === "low" ? "🌙 Low" : energyLevel === "medium" ? "⚡ Medium" : "🔥 High"}
                      </span>
                    </p>
                    <button
                      onClick={() => {
                        setEnergyLevel(null);
                        localStorage.removeItem("dw_energy_checkin");
                      }}
                      aria-label="Change energy check-in"
                      className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                    >
                      Change
                    </button>
                  </div>
                )}

                {/* Chat with DW */}
                <Button size="sm" className="w-full" onClick={() => navigate("/talk")}>
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Chat with DW
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* ── DW Briefing Card ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <DWBriefingCard nextStep={quickSuggestion.text} />
          </motion.div>

          {/* ── Icon Tiles Row ───────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
            <nav aria-label="Quick navigation" className="grid grid-cols-3 gap-2 sm:grid-cols-6">
              {[
                { label: "Calendar", icon: Calendar, href: "/calendar", color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "Cosmic", icon: Star, href: "/cosmic", color: "text-purple-500", bg: "bg-purple-500/10" },
                { label: "Blueprint", icon: BookOpen, href: "/life-blueprint", color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "Workout", icon: Dumbbell, href: "/workout", color: "text-red-500", bg: "bg-red-500/10" },
                { label: "Meals", icon: Utensils, href: "/meal-prep", color: "text-orange-500", bg: "bg-orange-500/10" },
                { label: "Routines", icon: RefreshCw, href: "/routines", color: "text-green-500", bg: "bg-green-500/10" },
              ].map(({ label, icon: Icon, href, color, bg }) => (
                <button
                  key={label}
                  onClick={() => navigate(href)}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl border border-border/50",
                    "hover:border-primary/30 hover:bg-muted/60 transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  )}
                  aria-label={`Go to ${label}`}
                >
                  <div className={cn("p-2 rounded-lg", bg)}>
                    <Icon className={cn("h-5 w-5", color)} />
                  </div>
                  <span className="text-[10px] font-medium text-muted-foreground">{label}</span>
                </button>
              ))}
            </nav>
          </motion.div>

          {/* ── Today's Schedule ─────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
            <SectionHeader title="Today" href="/calendar" icon={Calendar} />
            <Card>
              <CardContent className="p-4">
                {eventsLoading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-12 w-full" />
                    <Skeleton className="h-12 w-full" />
                  </div>
                ) : todayEvents.length === 0 ? (
                  <div className="text-center py-4 space-y-3">
                    <p className="text-sm text-muted-foreground">Your day is wide open.</p>
                    <p className="text-xs text-muted-foreground">
                      Want DW to help structure it with a schedule built around your energy?
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="sm" onClick={() => navigate("/calendar")}>
                        <Plus className="h-4 w-4 mr-1" /> Add Event
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/talk")}>
                        <Sparkles className="h-4 w-4 mr-1" /> Ask DW to plan
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {todayEvents.map((event: any) => (
                      <button
                        key={event.id}
                        onClick={() => navigate("/calendar")}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="text-xs font-semibold text-muted-foreground min-w-[50px]">
                          {event.startTime
                            ? new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                            : "All day"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{event.title}</p>
                          {event.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{event.description}</p>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      </button>
                    ))}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="w-full mt-1"
                      onClick={() => navigate("/calendar")}
                    >
                      View full schedule
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Cosmic Insights ──────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <SectionHeader title="Cosmic Insights" href="/cosmic" icon={Star} />
            <button
              onClick={() => navigate("/cosmic")}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
            >
              <Card className="hover:border-purple-400/40 transition-colors">
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0 p-2 rounded-lg bg-purple-500/10">
                      <Star className="h-5 w-5 text-purple-500" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
                        Today's Insight
                      </p>
                      <p className="text-sm leading-relaxed">{dailyInsight}</p>
                      {!hasBirthData && (
                        <p className="text-xs text-muted-foreground mt-2 italic">
                          Set up your cosmic profile for personalized guidance →
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* ── Life Blueprint ───────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <SectionHeader title="Life Blueprint" href="/life-blueprint" icon={BookOpen} />
            <Card>
              <CardContent className="p-4 space-y-3">
                {/* Progress bar */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-muted-foreground">
                      {completedDimensions.length} of {DIMENSIONS.length} dimensions defined
                    </span>
                    <Badge variant="secondary" className="text-xs">{blueprintProgress}%</Badge>
                  </div>
                  <Progress value={blueprintProgress} className="h-2" />
                </div>

                {blueprints.length === 0 ? (
                  <div className="text-center py-3 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Your Life Blueprint maps your values and vision across 8 dimensions.
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="sm" onClick={() => navigate("/life-blueprint")}>
                        Start Blueprint
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/talk")}>
                        <Sparkles className="h-4 w-4 mr-1" /> Do it with DW
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {DIMENSIONS.map((dim) => {
                      const filled = filledDimensionIds.has(dim.id);
                      return (
                        <button
                          key={dim.id}
                          onClick={() =>
                            filled ? navigate("/life-blueprint") : navigate("/talk")
                          }
                          className={cn(
                            "flex items-center gap-2 p-2.5 rounded-lg border text-left transition-all",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                            filled
                              ? "border-border/50 bg-muted/30 hover:bg-muted/60"
                              : "border-dashed border-border hover:border-primary/40 hover:bg-muted/30"
                          )}
                          aria-label={
                            filled
                              ? `View ${dim.label} blueprint`
                              : `Complete ${dim.label} dimension with DW`
                          }
                        >
                          <div className={cn("p-1 rounded", dim.bg)}>
                            <dim.icon className={cn("h-3.5 w-3.5", dim.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium truncate">{dim.label}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {filled ? "✓ Defined" : "Complete with DW"}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Goals ────────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <SectionHeader title="Goals" href="/goals" icon={Target} />
            <Card>
              <CardContent className="p-4">
                {activeGoals.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">Define what matters to you most right now.</p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="sm" onClick={() => navigate("/goals")}>
                        <Plus className="h-4 w-4 mr-1" /> Create a Goal
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/talk")}>
                        <Sparkles className="h-4 w-4 mr-1" /> Ask DW for ideas
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeGoals.slice(0, 3).map((goal: any) => (
                      <button
                        key={goal.id}
                        onClick={() => navigate("/goals")}
                        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-sm font-medium">{goal.title}</p>
                          <Badge variant="secondary" className="text-xs">{goal.progress ?? 0}%</Badge>
                        </div>
                        <Progress value={goal.progress ?? 0} className="h-1.5" />
                      </button>
                    ))}
                    {activeGoals.length > 3 && (
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate("/goals")}>
                        +{activeGoals.length - 3} more goals
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

          {/* ── Habits ───────────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <SectionHeader title="Habits" href="/habits" icon={CheckCircle2} />
            <Card>
              <CardContent className="p-4">
                {activeHabits.length === 0 ? (
                  <div className="text-center py-4 space-y-2">
                    <p className="text-sm text-muted-foreground">
                      Build daily practices that shape who you're becoming.
                    </p>
                    <div className="flex gap-2 justify-center flex-wrap">
                      <Button size="sm" onClick={() => navigate("/habits")}>
                        <Plus className="h-4 w-4 mr-1" /> Add a Habit
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => navigate("/browse")}>
                        Browse suggestions
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {activeHabits.slice(0, 5).map((habit: any) => (
                      <button
                        key={habit.id}
                        onClick={() => navigate("/habits")}
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        {habit.completedToday ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500 flex-shrink-0" />
                        ) : (
                          <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{habit.title}</p>
                          <p className="text-xs text-muted-foreground">
                            {(habit.streak ?? 0) > 0 ? `${habit.streak} day streak 🔥` : "Start today!"}
                          </p>
                        </div>
                      </button>
                    ))}
                    {activeHabits.length > 5 && (
                      <Button size="sm" variant="ghost" className="w-full" onClick={() => navigate("/habits")}>
                        +{activeHabits.length - 5} more habits
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
