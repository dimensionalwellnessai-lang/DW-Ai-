import { useState, useMemo, useRef } from "react";
import { useLocation, Link } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { DWOrb } from "@/components/dw-orb";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AllFeaturesView } from "@/components/all-features-view";
import { ProactiveCard } from "@/components/proactive-card";
import type { ProactiveCardProps } from "@/components/proactive-card";
import { useNavigationStore } from "@/stores/useNavigationStore";
import { useHomeSummary } from "./useHomeSummary";
import type { ScheduleBlockItem, CalendarEventItem } from "./types";
import { COPY } from "@/copy/en";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
  DrawerFooter,
} from "@/components/ui/drawer";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  CalendarDays,
  Lightbulb,
  Target,
  UtensilsCrossed,
  TrendingUp,
  MessageCircle,
  BookOpen,
  ChevronRight,
  Menu,
  Sparkles,
  Moon,
  Compass,
  Zap,
  Heart,
  Brain,
  Clock,
  Sun,
  Circle,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

const AFFIRMATIONS = [
  "You are exactly where you need to be.",
  "Today is yours to shape, not survive.",
  "Progress isn't always visible — but it's happening.",
  "Your energy matters. Protect it.",
  "Small steps still move you forward.",
  "You don't need to have it all figured out.",
  "Rest is productive. Stillness is growth.",
  "You are building something meaningful.",
  "Trust the process you're creating.",
  "Your calm is your power.",
];

interface OrbitModule {
  id: string;
  label: string;
  icon: LucideIcon;
  color: string;
  bgClass: string;
  path: string;
  dwTopic: string;
  badge?: string;
  snippet?: string;
}

function getTimeOfDayClass(): string {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 8) return "cc-time--dawn";
  if (hour >= 8 && hour < 12) return "cc-time--morning";
  if (hour >= 12 && hour < 17) return "cc-time--afternoon";
  if (hour >= 17 && hour < 20) return "cc-time--evening";
  return "cc-time--night";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function getDailyAffirmation(): string {
  const dayIndex = Math.floor(Date.now() / 86400000) % AFFIRMATIONS.length;
  return AFFIRMATIONS[dayIndex];
}

function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

function formatTime12Hour(timeStr: string): string {
  if (!timeStr) return "";
  if (timeStr.includes("T") || timeStr.includes("-")) {
    const d = new Date(timeStr);
    if (isNaN(d.getTime())) return "";
    return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  const [hours, minutes] = timeStr.split(":").map(Number);
  if (isNaN(hours) || isNaN(minutes)) return "";
  const period = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;
  return `${hours12}:${minutes.toString().padStart(2, "0")} ${period}`;
}

function getEnergyColor(level: number | null) {
  if (level === null) return "text-muted-foreground";
  if (level >= 7) return "text-emerald-500";
  if (level >= 4) return "text-amber-500";
  return "text-rose-500";
}

function getEnergyBgColor(level: number | null) {
  if (level === null) return "bg-muted/50";
  if (level >= 7) return "bg-emerald-500/10";
  if (level >= 4) return "bg-amber-500/10";
  return "bg-rose-500/10";
}

export default function HomeCommandCenter() {
  const summary = useHomeSummary();
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState<OrbitModule | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const scheduleRef = useRef<HTMLDivElement>(null);
  const { allFeaturesOpen, closeAllFeatures } = useNavigationStore();

  const dismissCard = (type: string) => {
    setDismissedCards(prev => new Set(Array.from(prev).concat(type)));
  };

  const visibleProactiveCards = summary.proactiveCards.filter(c => !dismissedCards.has(c.type));

  const firstName = summary.userName ? summary.userName.split(" ")[0] : null;
  const topStreak = summary.activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);

  const calRemaining = summary.nutritionSnapshot
    ? summary.nutritionSnapshot.caloriesTarget - summary.nutritionSnapshot.caloriesConsumed
    : null;

  const momentumSnippet = summary.momentumData?.suggestedFocus
    ?? summary.momentumData?.reasons?.[0]
    ?? null;

  const modules: OrbitModule[] = useMemo(() => [
    {
      id: "today",
      label: "Today",
      icon: CalendarDays,
      color: "text-blue-400",
      bgClass: "bg-blue-500/15",
      path: "/today",
      dwTopic: "Talk about my day",
      badge: summary.nextEvent ? "1" : undefined,
      snippet: summary.nextEvent ? truncate(summary.nextEvent.title, 30) : "No events",
    },
    {
      id: "insight",
      label: "Insight",
      icon: Lightbulb,
      color: "text-amber-400",
      bgClass: "bg-amber-500/15",
      path: "/insights",
      dwTopic: "Break this insight down",
      badge: summary.latestInsight ? "•" : undefined,
      snippet: summary.latestInsight ? truncate(summary.latestInsight.summary, 30) : "No new insights",
    },
    {
      id: "plan",
      label: "Plan",
      icon: Target,
      color: "text-violet-400",
      bgClass: "bg-violet-500/15",
      path: "/goals",
      dwTopic: "Help me with my plan",
      badge: summary.activeGoals[0]?.progress != null ? `${summary.activeGoals[0].progress}%` : undefined,
      snippet: summary.activeGoals[0]?.title ? truncate(summary.activeGoals[0].title, 30) : "Set a goal",
    },
    {
      id: "nutrition",
      label: "Nutrition",
      icon: UtensilsCrossed,
      color: "text-emerald-400",
      bgClass: "bg-emerald-500/15",
      path: "/tracking",
      dwTopic: "Adjust my nutrition plan",
      snippet: calRemaining != null ? `${calRemaining} cal left` : "Log a meal",
    },
    {
      id: "momentum",
      label: "Momentum",
      icon: TrendingUp,
      color: "text-rose-400",
      bgClass: "bg-rose-500/15",
      path: "/habits",
      dwTopic: "Help me stay on track",
      badge: topStreak > 0 ? `${topStreak}` : undefined,
      snippet: momentumSnippet ? truncate(momentumSnippet, 30) : "Check in",
    },
    {
      id: "followup",
      label: "Follow-Up",
      icon: MessageCircle,
      color: "text-indigo-400",
      bgClass: "bg-indigo-500/15",
      path: "/talk",
      dwTopic: "Continue our conversation",
      snippet: summary.activeFollowUp
        ? truncate(summary.activeFollowUp.prompt, 30)
        : summary.lastConversationTopic
          ? truncate(summary.lastConversationTopic, 30)
          : "Start a conversation",
    },
    {
      id: "journal",
      label: "Journal",
      icon: BookOpen,
      color: "text-teal-400",
      bgClass: "bg-teal-500/15",
      path: "/journal",
      dwTopic: "Help me reflect",
      snippet: summary.latestJournalEntry
        ? truncate(summary.latestJournalEntry.title, 30)
        : "Write or reflect",
    },
    {
      id: "cosmic",
      label: "Cosmic",
      icon: Moon,
      color: "text-violet-400",
      bgClass: "bg-violet-500/15",
      path: "/cosmic-insights",
      dwTopic: "What does the cosmos say today",
      snippet: "Moon & transits",
    },
    {
      id: "foryou",
      label: "For You",
      icon: Compass,
      color: "text-sky-400",
      bgClass: "bg-sky-500/15",
      path: "/browse",
      dwTopic: "Suggest something for me",
      snippet: "Curated for you",
    },
  ], [summary, topStreak, calRemaining, momentumSnippet]);

  const timeClass = getTimeOfDayClass();
  const affirmation = getDailyAffirmation();

  if (summary.isLoading) {
    return (
      <div className="flex flex-col h-full cosmic-bg">
        <header className="flex items-center px-4 shrink-0" style={{ height: 56 }}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open menu"
            data-testid="btn-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="flex-1 text-center text-base font-semibold text-foreground font-display pr-7" data-testid="text-command-center-title">
            Command Center
          </h1>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <Skeleton className="h-24 w-24 rounded-full" />
        </div>
        <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
        <AllFeaturesView open={allFeaturesOpen} onClose={closeAllFeatures} />
      </div>
    );
  }

  return (
    <div className={`flex flex-col h-full cc-time-bg ${timeClass}`}>
      <header className="flex items-center px-4 shrink-0" style={{ height: 56 }}>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open menu"
          data-testid="btn-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-foreground font-display pr-7" data-testid="text-command-center-title">
          Command Center
        </h1>
      </header>

      <div className="flex-1 overflow-auto">
        <div className="flex flex-col items-center">
          <div className="w-full max-w-lg px-4 pt-1">
            <p className="text-lg font-semibold text-foreground font-display text-center" data-testid="text-greeting">
              {getGreeting()}{firstName ? `, ${firstName}` : ""}
            </p>
            <p className="text-xs text-muted-foreground text-center mt-0.5" data-testid="text-today-label">
              {summary.todayLabel}
            </p>
          </div>

          <div className="relative flex items-center justify-center w-full max-w-[420px] mx-auto" style={{ height: 340 }}>
            <div className="orbit-ring absolute rounded-full border border-border/20" style={{ width: 280, height: 280 }} />

            <div className="relative z-10">
              <DWOrb
                size={68}
                state="idle"
                onTap={() => navigate("/talk")}
                label="Talk with DW"
              />
            </div>

            {modules.map((mod, i) => {
              const angle = (i * 360) / modules.length - 90;
              const radius = 140;
              const x = Math.cos((angle * Math.PI) / 180) * radius;
              const y = Math.sin((angle * Math.PI) / 180) * radius;

              return (
                <OrbitIcon
                  key={mod.id}
                  module={mod}
                  x={x}
                  y={y}
                  onTap={() => setActiveCard(mod)}
                />
              );
            })}
          </div>
        </div>

        <div className="w-full max-w-lg mx-auto px-4 space-y-5 pb-6">

          {visibleProactiveCards.length > 0 && (
            <section data-testid="section-proactive">
              <div className="space-y-3">
                {visibleProactiveCards.map((card, index) => (
                  <div
                    key={card.type}
                    className="animate-fade-in-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <ProactiveCard
                      type={card.type as ProactiveCardProps["type"]}
                      title={card.title}
                      message={card.message}
                      why={card.why}
                      actionLabel={card.actionLabel}
                      onAction={card.actionPath ? () => navigate(card.actionPath!) : undefined}
                      onDismiss={() => dismissCard(card.type)}
                      priority={card.priority}
                    />
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="grid grid-cols-3 gap-3" data-testid="section-vitals">
            <Link href="/mood-tracker">
              <Card className="cursor-pointer h-full border-border/30 bg-card/50 backdrop-blur-sm" data-testid="card-energy">
                <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                  <div className={`w-10 h-10 rounded-full mx-auto flex items-center justify-center ${getEnergyBgColor(summary.energyLevel)}`}>
                    <Zap className={`h-5 w-5 ${getEnergyColor(summary.energyLevel)}`} />
                  </div>
                  <p className={`text-lg font-bold mt-2 ${getEnergyColor(summary.energyLevel)}`}>
                    {summary.energyLevel !== null ? summary.energyLevel : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground">Energy</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/mood-tracker">
              <Card className="cursor-pointer h-full border-border/30 bg-card/50 backdrop-blur-sm" data-testid="card-mood">
                <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-rose-500/10">
                    <Heart className="h-5 w-5 text-rose-500" />
                  </div>
                  <p className="text-lg font-bold mt-2">
                    {summary.moodLevel !== null ? summary.moodLevel : "--"}
                  </p>
                  <p className="text-xs text-muted-foreground">Mood</p>
                </CardContent>
              </Card>
            </Link>

            <Link href="/weekly-checkin">
              <Card className="cursor-pointer h-full border-border/30 bg-card/50 backdrop-blur-sm" data-testid="card-checkin">
                <CardContent className="p-3 text-center flex flex-col items-center justify-center h-full">
                  <div className="w-10 h-10 rounded-full mx-auto flex items-center justify-center bg-primary/10">
                    <Brain className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs font-medium mt-2 text-primary">Check in</p>
                </CardContent>
              </Card>
            </Link>
          </section>

          <section ref={scheduleRef} data-testid="section-schedule">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold flex items-center gap-2 text-foreground text-sm">
                <CalendarDays className="h-4 w-4" />
                Today's Schedule
              </h2>
              <Link href="/calendar/schedule">
                <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-view-calendar">
                  View all
                  <ChevronRight className="h-3 w-3 ml-1" />
                </Button>
              </Link>
            </div>

            {summary.todayScheduleBlocks.length === 0 && summary.todayEvents.length === 0 ? (
              <Card className="border-dashed border-border/30 bg-card/50 backdrop-blur-sm">
                <CardContent className="py-8 text-center">
                  <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                  <p className="text-sm font-medium text-foreground mb-1">{COPY.emptyStates.schedule.title}</p>
                  <p className="text-xs text-muted-foreground mb-3">{COPY.emptyStates.schedule.body}</p>
                  <Link href="/talk?topic=Help%20me%20plan%20my%20day">
                    <Button variant="outline" size="sm" data-testid="button-ask-dw">
                      <Sparkles className="h-3 w-3 mr-2" />
                      Ask DW to plan my day
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <ScheduleFeed blocks={summary.todayScheduleBlocks} events={summary.todayEvents} />
            )}
          </section>

          {summary.activeGoals.length > 0 && (
            <section data-testid="section-goals">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold flex items-center gap-2 text-foreground text-sm">
                  <Target className="h-4 w-4" />
                  Active Goals
                </h2>
                <Link href="/goals">
                  <Button variant="ghost" size="sm" className="text-xs h-7" data-testid="button-view-goals">
                    View all
                    <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                {summary.activeGoals.slice(0, 3).map((goal) => (
                  <Card key={goal.id} className="border-border/30 bg-card/50 backdrop-blur-sm" data-testid={`goal-card-${goal.id}`}>
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <p className="text-sm font-medium text-foreground">{goal.title}</p>
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
            <Card className="border-border/30 bg-card/50 backdrop-blur-sm" data-testid="card-morning-routine">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Sun className="h-4 w-4 text-amber-500" />
                  <span className="text-sm font-medium text-foreground">Morning</span>
                </div>
                {summary.morningRoutines.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Not set up yet</p>
                ) : (
                  <div className="space-y-1.5">
                    {summary.morningRoutines.slice(0, 2).map((routine) => (
                      <div key={routine.id} className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs truncate">{routine.name}</span>
                      </div>
                    ))}
                    {summary.morningRoutines.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{summary.morningRoutines.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/30 bg-card/50 backdrop-blur-sm" data-testid="card-evening-routine">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Moon className="h-4 w-4 text-indigo-500" />
                  <span className="text-sm font-medium text-foreground">Wind Down</span>
                </div>
                {summary.eveningRoutines.length === 0 ? (
                  <Link href="/routines">
                    <Button variant="ghost" size="sm" className="w-full text-xs h-8" data-testid="button-setup-routine">
                      Set up routine
                    </Button>
                  </Link>
                ) : (
                  <div className="space-y-1.5">
                    {summary.eveningRoutines.slice(0, 2).map((routine) => (
                      <div key={routine.id} className="flex items-center gap-2">
                        <Circle className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs truncate">{routine.name}</span>
                      </div>
                    ))}
                    {summary.eveningRoutines.length > 2 && (
                      <p className="text-xs text-muted-foreground">
                        +{summary.eveningRoutines.length - 2} more
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </section>

          <section data-testid="section-talk-cta">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10 border-primary/20">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <DWOrb size={40} state="idle" />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm text-foreground">Talk to DW</h3>
                    <p className="text-xs text-muted-foreground">
                      Process thoughts, plan your day, or just check in.
                    </p>
                  </div>
                  <Link href="/talk">
                    <Button size="sm" data-testid="button-talk-to-dw">
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </section>

          <div className="w-full max-w-sm mx-auto px-2 pb-4 text-center">
            <p className="text-sm text-foreground/70 italic font-body leading-relaxed" data-testid="text-affirmation">
              "{affirmation}"
            </p>
          </div>
        </div>
      </div>

      <Drawer open={!!activeCard} onOpenChange={(open) => { if (!open) setActiveCard(null); }}>
        <DrawerContent data-testid="card-drawer">
          {activeCard && (
            <CardPreview
              module={activeCard}
              summary={summary}
              onMore={() => {
                setActiveCard(null);
                if (activeCard.id === "today" && scheduleRef.current) {
                  setTimeout(() => {
                    scheduleRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }, 300);
                } else {
                  navigate(activeCard.path);
                }
              }}
              onDW={(topic) => { setActiveCard(null); navigate(`/talk?topic=${encodeURIComponent(topic)}`); }}
            />
          )}
        </DrawerContent>
      </Drawer>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AllFeaturesView open={allFeaturesOpen} onClose={closeAllFeatures} />
    </div>
  );
}

function CardPreview({
  module,
  summary,
  onMore,
  onDW,
}: {
  module: OrbitModule;
  summary: ReturnType<typeof useHomeSummary>;
  onMore: () => void;
  onDW: (topic: string) => void;
}) {
  const Icon = module.icon;

  return (
    <div className="pb-6">
      <DrawerHeader className="text-left">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl ${module.bgClass}`}>
            <Icon className={`h-5 w-5 ${module.color}`} />
          </div>
          <DrawerTitle>{module.label}</DrawerTitle>
        </div>
        <DrawerDescription className="sr-only">{module.label} details</DrawerDescription>
      </DrawerHeader>

      <div className="px-4 min-h-[80px]">
        {module.id === "today" && <TodayPreview summary={summary} />}
        {module.id === "insight" && <InsightPreview summary={summary} />}
        {module.id === "plan" && <PlanPreview summary={summary} />}
        {module.id === "nutrition" && <NutritionPreview summary={summary} />}
        {module.id === "momentum" && <MomentumPreview summary={summary} />}
        {module.id === "followup" && <FollowUpPreview summary={summary} />}
        {module.id === "journal" && <JournalPreview summary={summary} />}
        {module.id === "cosmic" && <CosmicPreview />}
        {module.id === "foryou" && <ForYouPreview />}
      </div>

      <DrawerFooter className="flex-row gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onMore}
          data-testid="btn-card-more"
        >
          More <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
        <Button
          variant="default"
          className="flex-1 gap-2"
          onClick={() => onDW(module.dwTopic)}
          data-testid="btn-card-dw"
        >
          <DWOrb size={20} state="idle" />
          Chat with DW
        </Button>
      </DrawerFooter>
    </div>
  );
}

function TodayPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const items = [
    summary.nextEvent && { label: summary.nextEvent.title, sub: summary.nextEvent.isAllDay ? "All day" : summary.nextEvent.startTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) },
    summary.activeGoals[0] && { label: `Priority: ${summary.activeGoals[0].title}`, sub: summary.activeGoals[0].progress != null ? `${summary.activeGoals[0].progress}% done` : undefined },
    summary.momentumData?.suggestedFocus && { label: summary.momentumData.suggestedFocus, sub: "Suggested focus" },
  ].filter(Boolean) as { label: string; sub?: string }[];

  if (items.length === 0) {
    items.push(
      { label: "No events or priorities today", sub: "Enjoy the space" },
      { label: "Start a conversation with DW", sub: "Get personalized guidance for your day" },
    );
  }

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {items.map((item, i) => (
          <CarouselItem key={i} className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">{item.label}</p>
              {item.sub && <p className="text-xs text-muted-foreground mt-0.5">{item.sub}</p>}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function InsightPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const insights = [
    summary.latestInsight && { title: summary.latestInsight.title, body: summary.latestInsight.summary, cat: summary.latestInsight.category },
    summary.latestJournalEntry && { title: summary.latestJournalEntry.title, body: summary.latestJournalEntry.story.slice(0, 120), cat: "Journal" },
  ].filter(Boolean) as { title: string; body: string; cat: string }[];

  if (insights.length === 0) {
    insights.push(
      { title: "No insights yet", body: "Keep talking with DW — patterns will emerge", cat: "Getting Started" },
      { title: "How insights work", body: "DW analyzes your conversations to surface patterns across 8 life dimensions", cat: "Info" },
    );
  }

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {insights.map((ins, i) => (
          <CarouselItem key={i} className="pl-2 basis-[85%]">
            <div className="cc-card">
              <Badge variant="secondary" className="text-[10px] mb-1">{ins.cat}</Badge>
              <p className="text-sm font-medium text-foreground">{ins.title}</p>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ins.body}</p>
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function PlanPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  if (summary.activeGoals.length === 0) {
    return (
      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2">
          <CarouselItem className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">No active plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap "More" to create one</p>
            </div>
          </CarouselItem>
          <CarouselItem className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">Plans adapt to you</p>
              <p className="text-xs text-muted-foreground mt-0.5">DW helps break goals into manageable steps</p>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    );
  }

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {summary.activeGoals.slice(0, 3).map((goal) => (
          <CarouselItem key={goal.id} className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">{goal.title}</p>
              {goal.progress != null && (
                <div className="mt-2">
                  <div className="flex justify-between text-xs text-muted-foreground mb-1">
                    <span>Progress</span>
                    <span>{goal.progress}%</span>
                  </div>
                  <Progress value={goal.progress} className="h-2" />
                </div>
              )}
            </div>
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function NutritionPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const snap = summary.nutritionSnapshot;
  if (!snap) {
    return (
      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2">
          <CarouselItem className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">No meals logged today</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap "More" to start tracking</p>
            </div>
          </CarouselItem>
          <CarouselItem className="pl-2 basis-[85%]">
            <div className="cc-card">
              <p className="text-sm font-medium text-foreground">Track calories & protein</p>
              <p className="text-xs text-muted-foreground mt-0.5">Stay on top of your nutrition goals</p>
            </div>
          </CarouselItem>
        </CarouselContent>
      </Carousel>
    );
  }

  const calPct = Math.min(100, Math.round((snap.caloriesConsumed / snap.caloriesTarget) * 100));
  const proPct = Math.min(100, Math.round((snap.proteinConsumed / snap.proteinTarget) * 100));
  const calRemaining = snap.caloriesTarget - snap.caloriesConsumed;

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-foreground">Calories</span>
              <span className="text-xs text-muted-foreground">{snap.caloriesConsumed} / {snap.caloriesTarget}</span>
            </div>
            <Progress value={calPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{calRemaining > 0 ? `${calRemaining} remaining` : "Target reached"}</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-foreground">Protein</span>
              <span className="text-xs text-muted-foreground">{snap.proteinConsumed}g / {snap.proteinTarget}g</span>
            </div>
            <Progress value={proPct} className="h-2" />
            {proPct < 50 && <p className="text-xs text-rose-400 mt-1">Protein low today</p>}
            {proPct >= 50 && <p className="text-xs text-muted-foreground mt-1">On track</p>}
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <p className="text-sm font-medium text-foreground">Daily Summary</p>
            <p className="text-xs text-muted-foreground mt-1">{calPct}% of calories, {proPct}% of protein consumed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Swipe for details or tap "More"</p>
          </div>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

function MomentumPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const streakHabits = summary.activeHabits.filter((h) => (h.streak ?? 0) > 0);

  const slides: { content: JSX.Element }[] = [];

  if (summary.momentumData) {
    slides.push({
      content: (
        <div className="cc-card">
          <div className="flex items-center gap-2 mb-1">
            <div className={`h-2 w-2 rounded-full ${
              summary.momentumData.status === "green" ? "bg-emerald-500" :
              summary.momentumData.status === "yellow" ? "bg-amber-500" : "bg-rose-500"
            }`} />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Momentum Status</span>
          </div>
          {summary.momentumData.reasons.slice(0, 2).map((r, i) => (
            <p key={i} className="text-xs text-muted-foreground">{r}</p>
          ))}
        </div>
      ),
    });
  }

  streakHabits.forEach((h) => {
    slides.push({
      content: (
        <div className="cc-card flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">{h.title}</span>
          <Badge variant="secondary">{h.streak} day streak</Badge>
        </div>
      ),
    });
  });

  if (slides.length === 0) {
    slides.push({
      content: (
        <div className="cc-card">
          <p className="text-sm font-medium text-foreground">No active streaks yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Build momentum one day at a time</p>
        </div>
      ),
    });
  }

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {slides.map((slide, i) => (
          <CarouselItem key={i} className="pl-2 basis-[85%]">
            {slide.content}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function FollowUpPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const slides: { content: JSX.Element }[] = [];

  if (summary.activeFollowUp) {
    slides.push({
      content: (
        <div className="cc-card">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">DW wants to know</p>
          <p className="text-sm font-medium text-foreground">{summary.activeFollowUp.prompt}</p>
        </div>
      ),
    });
  }

  if (summary.lastConversationTopic) {
    slides.push({
      content: (
        <div className="cc-card">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Last conversation</p>
          <p className="text-sm font-medium text-foreground">{summary.lastConversationTopic}</p>
          <p className="text-xs text-muted-foreground mt-1">Tap "Chat with DW" to continue</p>
        </div>
      ),
    });
  }

  if (slides.length === 0) {
    slides.push({
      content: (
        <div className="cc-card">
          <p className="text-sm font-medium text-foreground">No follow-ups yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Start talking with DW to get personalized follow-ups</p>
        </div>
      ),
    });
  }

  slides.push({
    content: (
      <div className="cc-card">
        <p className="text-sm font-medium text-foreground">Stay connected</p>
        <p className="text-xs text-muted-foreground mt-0.5">DW checks in based on your conversations and energy</p>
      </div>
    ),
  });

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {slides.map((slide, i) => (
          <CarouselItem key={i} className="pl-2 basis-[85%]">
            {slide.content}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function JournalPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const slides: { content: JSX.Element }[] = [];

  if (summary.latestJournalEntry) {
    const entry = summary.latestJournalEntry;
    slides.push({
      content: (
        <div className="cc-card">
          <p className="text-sm font-semibold text-foreground">{entry.title}</p>
          <p className="text-xs text-muted-foreground mt-1 line-clamp-3">{entry.story}</p>
          {entry.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {entry.tags.slice(0, 4).map((tag) => (
                <Badge key={tag} variant="outline" className="text-[9px]">{tag}</Badge>
              ))}
            </div>
          )}
        </div>
      ),
    });
  }

  slides.push({
    content: (
      <div className="cc-card">
        <p className="text-sm font-medium text-foreground">{summary.latestJournalEntry ? "Your journal grows with you" : "No journal entries yet"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">DW creates journal entries from your conversations</p>
      </div>
    ),
  });

  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        {slides.map((slide, i) => (
          <CarouselItem key={i} className="pl-2 basis-[85%]">
            {slide.content}
          </CarouselItem>
        ))}
      </CarouselContent>
    </Carousel>
  );
}

function CosmicPreview() {
  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Moon Phase</span>
            </div>
            <p className="text-sm font-medium text-foreground">View today's lunar guidance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Personalized to your chart</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Transits</span>
            </div>
            <p className="text-sm font-medium text-foreground">Today's cosmic energy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Alignments & retrogrades</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-indigo-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Numerology</span>
            </div>
            <p className="text-sm font-medium text-foreground">Your personal day number</p>
            <p className="text-xs text-muted-foreground mt-0.5">Life path & cycles</p>
          </div>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

function ForYouPreview() {
  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <Compass className="h-4 w-4 text-teal-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Wellness</span>
            </div>
            <p className="text-sm font-medium text-foreground">Explore curated content</p>
            <p className="text-xs text-muted-foreground mt-0.5">Workouts, meditations & more</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Community</span>
            </div>
            <p className="text-sm font-medium text-foreground">Connect & grow together</p>
            <p className="text-xs text-muted-foreground mt-0.5">Groups, challenges & support</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div className="cc-card">
            <div className="flex items-center gap-2 mb-1">
              <BookOpen className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Resources</span>
            </div>
            <p className="text-sm font-medium text-foreground">Articles & guides</p>
            <p className="text-xs text-muted-foreground mt-0.5">Learn at your own pace</p>
          </div>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

function ScheduleFeed({ blocks, events }: { blocks: ScheduleBlockItem[]; events: CalendarEventItem[] }) {
  type FeedItem = { id: string; title: string; time: string; type: "block" | "event"; sortKey: string };

  const items: FeedItem[] = useMemo(() => {
    const feed: FeedItem[] = [];
    for (const b of blocks) {
      feed.push({ id: `b-${b.id}`, title: b.title, time: b.startTime, type: "block", sortKey: b.startTime });
    }
    for (const e of events) {
      feed.push({ id: `e-${e.id}`, title: e.title, time: e.startTime, type: "event", sortKey: e.startTime });
    }
    feed.sort((a, b) => a.sortKey.localeCompare(b.sortKey));
    return feed;
  }, [blocks, events]);

  const visible = items.slice(0, 4);
  const hiddenCount = items.length - visible.length;

  return (
    <div className="space-y-2">
      {visible.map((item) => (
        <Card key={item.id} className="border-border/30 bg-card/50 backdrop-blur-sm" data-testid={`schedule-item-${item.id}`}>
          <CardContent className="p-3 flex items-center gap-3">
            <div className="text-xs text-muted-foreground w-16 flex-shrink-0">
              {formatTime12Hour(item.time)}
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">{item.title}</p>
            </div>
            {item.type === "event" ? (
              <Badge variant="secondary" className="text-xs">Event</Badge>
            ) : (
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            )}
          </CardContent>
        </Card>
      ))}
      {hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground text-center py-2">
          +{hiddenCount} more items
        </p>
      )}
    </div>
  );
}

function OrbitIcon({
  module,
  x,
  y,
  onTap,
}: {
  module: OrbitModule;
  x: number;
  y: number;
  onTap: () => void;
}) {
  const Icon = module.icon;

  return (
    <button
      type="button"
      onClick={onTap}
      className="absolute flex flex-col items-center gap-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl transition-transform duration-200 active:scale-90"
      style={{
        transform: `translate(${x}px, ${y}px)`,
        left: "50%",
        top: "50%",
        marginLeft: -24,
        marginTop: -24,
        width: 48,
      }}
      aria-label={`${module.label}${module.snippet ? `: ${module.snippet}` : ""}`}
      data-testid={`orbit-icon-${module.id}`}
    >
      <div className={`relative p-2 rounded-2xl ${module.bgClass} backdrop-blur-sm border border-white/5`}>
        <Icon className={`h-[18px] w-[18px] ${module.color}`} />
        {module.badge && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 flex items-center justify-center rounded-full bg-primary text-primary-foreground text-[9px] font-bold leading-none">
            {module.badge}
          </span>
        )}
      </div>
      <span className="text-[11px] font-semibold text-foreground/80 leading-tight text-center">{module.label}</span>
    </button>
  );
}
