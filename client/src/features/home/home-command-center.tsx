import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DWOrb } from "@/components/dw-orb";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AllFeaturesView } from "@/components/all-features-view";
import { ProactiveCard } from "@/components/proactive-card";
import type { ProactiveCardProps } from "@/components/proactive-card";
import { DWReadingCard } from "@/components/dw-reading-card";
import { InsightSnapshotCard } from "./components/InsightSnapshotCard";
import { useNavigationStore } from "@/stores/useNavigationStore";
import { useHomeSummary } from "./useHomeSummary";
import { isFeatureEnabled } from "@/config/featureFlags";
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
  type LucideIcon,
} from "lucide-react";

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

export default function HomeCommandCenter() {
  const summary = useHomeSummary();
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState<OrbitModule | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
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

  if (summary.isLoading) {
    return (
      <div className="flex flex-col h-full cosmic-bg">
        <header className="flex items-center px-4 shrink-0" style={{ height: 68 }}>
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Open menu"
            data-testid="btn-menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex-1 text-center pr-7">
            <p className="text-base font-semibold text-foreground font-display" data-testid="text-greeting">
              {getGreeting()}
            </p>
          </div>
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
      <header className="flex items-center px-4 shrink-0" style={{ height: 68 }}>
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="p-2 -ml-2 rounded-lg text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Open menu"
          data-testid="btn-menu"
        >
          <Menu className="h-5 w-5" />
        </button>
        <div className="flex-1 text-center pr-7">
          <p className="text-base font-semibold text-foreground font-display" data-testid="text-greeting">
            {getGreeting()}{firstName ? `, ${firstName}` : ""}
          </p>
          <p className="text-[11px] text-muted-foreground/70 italic leading-tight" data-testid="text-affirmation">
            {getDailyAffirmation()}
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative flex items-center justify-center w-full max-w-[420px] mx-auto aspect-square" style={{ maxHeight: "min(340px, 50vh)" }}>
            <div className="orbit-ring absolute rounded-full border border-border/20" style={{ width: "66.7%", height: "66.7%" }} data-testid="orbit-ring" />

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
              const radius = 115;
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

        <div className="shrink-0 px-4 pb-1 pt-0 w-full max-w-lg mx-auto" data-testid="section-cards">
          <Carousel opts={{ align: "start", dragFree: true }}>
            <CarouselContent className="-ml-2">
              {isFeatureEnabled("DW_READING_CARD") && (
                <CarouselItem className="pl-2 basis-[85%]">
                  <DWReadingCard energyLevel={summary.energyLevel} />
                </CarouselItem>
              )}

              <CarouselItem className="pl-2 basis-[85%]">
                <InsightSnapshotCard summary={summary} />
              </CarouselItem>

              {visibleProactiveCards.map((card) => (
                <CarouselItem key={card.type} className="pl-2 basis-[85%]">
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
                </CarouselItem>
              ))}
            </CarouselContent>
          </Carousel>
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
                navigate(activeCard.path);
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
