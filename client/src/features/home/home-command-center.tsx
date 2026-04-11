import { useState, useMemo, useRef, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
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
  Pencil,
  Check,
  X,
  Clock,
  Play,
  Dumbbell,
  Utensils,
  Brain,
  Heart,
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

const AFFIRMATIONS = {
  morning: {
    low:  ["Start slow — you still get to show up.", "Gentle mornings count too.", "You don't have to rush into this day.", "Even a quiet start is a start."],
    mid:  ["Today is already in motion.", "You woke up — that's the first win.", "This morning is yours to shape.", "Step by step, the day opens."],
    high: ["Morning energy is yours — use it well.", "Today has good things in it.", "You're already ahead just by beginning.", "Rise and build something real."],
  },
  afternoon: {
    low:  ["The afternoon doesn't need your best — just your presence.", "One thing at a time is enough.", "You've made it this far today.", "Pace yourself. There's still time."],
    mid:  ["Progress isn't always visible, but it's happening.", "Stay with it — you're doing more than you know.", "Midday is a good place to reset.", "Keep going. Steady is enough."],
    high: ["You're in the middle of something good.", "The afternoon is yours to finish strong.", "You've got momentum — ride it.", "Trust what you've built so far today."],
  },
  evening: {
    low:  ["You made it through. That's real.", "Let the day be enough.", "Rest is your next right move.", "Evening is permission to soften."],
    mid:  ["Whatever today held, you were in it.", "Wind down gently — you earned it.", "Reflect, release, rest.", "Evenings are for coming back to yourself."],
    high: ["What a day you've built.", "Finish strong, then let go.", "Celebrate what moved forward today.", "Tonight is yours — you've earned it."],
  },
  night: {
    low:  ["Tomorrow starts fresh.", "Sleep is the kindest thing you can give yourself.", "Rest now. Tomorrow is a new canvas.", "You did enough. Let it be."],
    mid:  ["The night is good for letting go.", "Tomorrow's version of you will be grateful for the rest.", "Peace is productive.", "You are allowed to stop."],
    high: ["End the night as well as you started it.", "Rest well — tomorrow needs you.", "A good night's sleep is part of the plan.", "Close today knowing you showed up."],
  },
};

function getDynamicAffirmation(energyLevel: number | null, moodLevel: number | null): string {
  const hour = new Date().getHours();
  const minuteSlot = Math.floor(new Date().getMinutes() / 15);

  const timeKey: keyof typeof AFFIRMATIONS =
    hour >= 5 && hour < 12 ? "morning" :
    hour >= 12 && hour < 18 ? "afternoon" :
    hour >= 18 && hour < 22 ? "evening" : "night";

  const combined = energyLevel ?? moodLevel ?? null;
  const moodKey: "low" | "mid" | "high" =
    combined === null ? "mid" :
    combined <= 4 ? "low" :
    combined >= 7 ? "high" : "mid";

  const pool = AFFIRMATIONS[timeKey][moodKey];
  const idx = (Math.floor(Date.now() / 3600000) + minuteSlot) % pool.length;
  return pool[idx];
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


function truncate(str: string, max: number): string {
  return str.length > max ? str.slice(0, max - 1) + "…" : str;
}

export default function HomeCommandCenter() {
  usePageMeta("Home", "Your personal wellness command center — today's overview, habits, goals, and momentum.");
  const summary = useHomeSummary();
  const [, navigate] = useLocation();
  const [activeCard, setActiveCard] = useState<OrbitModule | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { allFeaturesOpen, closeAllFeatures } = useNavigationStore();

  const dismissCard = (type: string) => {
    setDismissedCards(prev => new Set(Array.from(prev).concat(type)));
  };

  const updateNameMutation = useMutation({
    mutationFn: (firstName: string) =>
      apiRequest("PATCH", "/api/users/me", { firstName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setEditingName(false);
    },
  });

  const startEditingName = () => {
    setNameInput(firstName ?? "");
    setEditingName(true);
    setTimeout(() => nameInputRef.current?.focus(), 50);
  };

  const saveName = () => {
    const trimmed = nameInput.trim();
    if (trimmed) updateNameMutation.mutate(trimmed);
    else setEditingName(false);
  };

  useEffect(() => {
    if (editingName) nameInputRef.current?.focus();
  }, [editingName]);

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
      label: "My Time",
      icon: CalendarDays,
      color: "text-blue-400",
      bgClass: "bg-blue-500/15",
      path: "/calendar?view=day",
      dwTopic: "Help me plan my time today",
      badge: summary.todayEvents.length > 0 ? `${summary.todayEvents.length}` : undefined,
      snippet: (() => {
        const nowMs = Date.now();
        const current = summary.todayEvents.find(e => {
          const s = parseEventTime(e.startTime, new Date());
          const end = e.endTime ? parseEventTime(e.endTime, new Date()) : null;
          return s && end && s.getTime() <= nowMs && end.getTime() >= nowMs;
        });
        if (current) return `Now: ${truncate(current.title, 22)}`;
        const next = summary.todayEvents
          .map(e => ({ e, t: parseEventTime(e.startTime, new Date()) }))
          .filter(x => x.t && x.t.getTime() > nowMs)
          .sort((a, b) => a.t!.getTime() - b.t!.getTime())[0];
        if (next) return `Next: ${truncate(next.e.title, 22)}`;
        return summary.nextEvent ? truncate(summary.nextEvent.title, 30) : "No events today";
      })(),
    },
    {
      id: "insight",
      label: "My Mind",
      icon: Lightbulb,
      color: "text-amber-400",
      bgClass: "bg-amber-500/15",
      path: "/insights",
      dwTopic: "What patterns do you see in my thinking?",
      badge: summary.latestInsight ? "•" : undefined,
      snippet: summary.latestInsight ? truncate(summary.latestInsight.summary, 30) : "No new insights",
    },
    {
      id: "plan",
      label: "My Purpose",
      icon: Target,
      color: "text-violet-400",
      bgClass: "bg-violet-500/15",
      path: "/goals",
      dwTopic: "Help me clarify my purpose and goals",
      badge: summary.activeGoals[0]?.progress != null ? `${summary.activeGoals[0].progress}%` : undefined,
      snippet: summary.activeGoals[0]?.title ? truncate(summary.activeGoals[0].title, 30) : "Set a goal",
    },
    {
      id: "nutrition",
      label: "My Body",
      icon: UtensilsCrossed,
      color: "text-emerald-400",
      bgClass: "bg-emerald-500/15",
      path: "/meal-prep?category=meal-plans",
      dwTopic: "How am I doing with my physical health?",
      snippet: calRemaining != null ? `${calRemaining} cal left` : "Track nutrition",
    },
    {
      id: "momentum",
      label: "My Habits",
      icon: TrendingUp,
      color: "text-rose-400",
      bgClass: "bg-rose-500/15",
      path: "/habits",
      dwTopic: "Help me build better habits and stay consistent",
      badge: topStreak > 0 ? `${topStreak}` : undefined,
      snippet: momentumSnippet ? truncate(momentumSnippet, 30) : "Build momentum",
    },
    {
      id: "followup",
      label: "DW",
      icon: MessageCircle,
      color: "text-indigo-400",
      bgClass: "bg-indigo-500/15",
      path: "/talk",
      dwTopic: "Continue our conversation",
      snippet: summary.activeFollowUp
        ? truncate(summary.activeFollowUp.prompt, 30)
        : summary.lastConversationTopic
          ? truncate(summary.lastConversationTopic, 30)
          : "Ask me anything",
    },
    {
      id: "journal",
      label: "My Story",
      icon: BookOpen,
      color: "text-teal-400",
      bgClass: "bg-teal-500/15",
      path: "/journal",
      dwTopic: "Help me reflect on my life story",
      snippet: summary.latestJournalEntry
        ? truncate(summary.latestJournalEntry.title, 30)
        : "Write or reflect",
    },
    {
      id: "cosmic",
      label: "My Identity",
      icon: Moon,
      color: "text-violet-400",
      bgClass: "bg-violet-500/15",
      path: "/cosmic",
      dwTopic: "What does my birth chart say about me?",
      snippet: "Cosmic & astrology",
    },
    {
      id: "foryou",
      label: "My World",
      icon: Compass,
      color: "text-sky-400",
      bgClass: "bg-sky-500/15",
      path: "/browse",
      dwTopic: "What should I explore or learn about right now?",
      snippet: "Curated for you",
    },
  ], [summary, topStreak, calRemaining, momentumSnippet]);

  const timeClass = getTimeOfDayClass();

  if (summary.isLoading) {
    return (
      <div className="flex flex-col h-full bg-background">
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
    <div className="flex flex-col h-full bg-background">
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
          {editingName ? (
            <div className="flex items-center justify-center gap-1.5">
              <Input
                ref={nameInputRef}
                value={nameInput}
                onChange={e => setNameInput(e.target.value)}
                onKeyDown={e => { if (e.key === "Enter") saveName(); if (e.key === "Escape") setEditingName(false); }}
                placeholder="Your preferred name"
                className="h-7 text-sm text-center w-36 px-2"
                data-testid="input-preferred-name"
              />
              <button
                onClick={saveName}
                disabled={updateNameMutation.isPending}
                className="p-1 rounded text-green-500 hover:text-green-600 transition-colors"
                aria-label="Save name"
                data-testid="btn-save-name"
              >
                <Check className="h-4 w-4" />
              </button>
              <button
                onClick={() => setEditingName(false)}
                className="p-1 rounded text-muted-foreground hover:text-foreground transition-colors"
                aria-label="Cancel"
                data-testid="btn-cancel-name"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-1">
              <p className="text-base font-semibold text-foreground font-display" data-testid="text-greeting">
                {getGreeting()}{firstName ? `, ${firstName}` : ""}
              </p>
              <button
                onClick={startEditingName}
                className="p-0.5 rounded text-muted-foreground/50 hover:text-muted-foreground transition-colors"
                aria-label="Edit preferred name"
                data-testid="btn-edit-name"
              >
                <Pencil className="h-3 w-3" />
              </button>
            </div>
          )}
          <p className="text-[11px] text-muted-foreground/70 italic leading-tight mt-0.5" data-testid="text-affirmation">
            {getDynamicAffirmation(summary.energyLevel, summary.moodLevel)}
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 flex flex-col items-center justify-center min-h-0">
          <div className="relative flex items-center justify-center w-full max-w-[420px] mx-auto aspect-square" style={{ maxHeight: "min(340px, 50vh)" }}>
            {/* Atmospheric background glow layers */}
            <div className="absolute rounded-full bg-primary/5 blur-3xl" style={{ width: "80%", height: "80%" }} aria-hidden="true" />
            <div className="absolute rounded-full bg-primary/8 blur-2xl" style={{ width: "54%", height: "54%" }} aria-hidden="true" />

            {/* Outer orbit ring — subtle */}
            <div className="orbit-ring absolute rounded-full border border-border/10" style={{ width: "80%", height: "80%" }} aria-hidden="true" />
            {/* Inner orbit ring — main */}
            <div className="orbit-ring absolute rounded-full border border-border/20" style={{ width: "66.7%", height: "66.7%" }} data-testid="orbit-ring" />
            {/* Innermost ring — tight halo */}
            <div className="absolute rounded-full border border-primary/10" style={{ width: "28%", height: "28%" }} aria-hidden="true" />

            <div className="relative z-10">
              {/* Orb glow halo */}
              <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl scale-150 pointer-events-none" aria-hidden="true" />
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
            <CarouselContent className="-ml-2 items-stretch">
              {isFeatureEnabled("DW_READING_CARD") && (
                <CarouselItem className="pl-2 basis-[85%] h-full">
                  <DWReadingCard energyLevel={summary.energyLevel} className="h-full" />
                </CarouselItem>
              )}

              <CarouselItem className="pl-2 basis-[85%] h-full">
                <InsightSnapshotCard summary={summary} className="h-full" />
              </CarouselItem>

              {visibleProactiveCards.map((card) => (
                <CarouselItem key={card.type} className="pl-2 basis-[85%] h-full">
                  <ProactiveCard
                    type={card.type as ProactiveCardProps["type"]}
                    title={card.title}
                    message={card.message}
                    why={card.why}
                    actionLabel={card.actionLabel}
                    onAction={card.actionPath ? () => navigate(card.actionPath!) : undefined}
                    onDismiss={() => dismissCard(card.type)}
                    priority={card.priority}
                    className="h-full"
                  />
                </CarouselItem>
              ))}

              <CarouselItem className="pl-2 basis-[85%] h-full">
                <button
                  onClick={() => navigate("/life-system-import")}
                  data-testid="card-build-life-system"
                  className="w-full h-full text-left rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3.5 flex items-center gap-3 hover:border-primary/50 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold leading-snug">DW Smart Import</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Paste anything — DW reads and saves it</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </CarouselItem>
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
              onNavTo={(path) => { setActiveCard(null); navigate(path); }}
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
  onNavTo,
}: {
  module: OrbitModule;
  summary: ReturnType<typeof useHomeSummary>;
  onMore: () => void;
  onDW: (topic: string) => void;
  onNavTo?: (path: string) => void;
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
        {module.id === "cosmic" && <CosmicPreview onNavigate={onNavTo} />}
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

// Helper: parse a stored startTime string into a Date for today
function parseEventTime(timeStr: string, today: Date): Date | null {
  if (!timeStr) return null;
  // Full ISO datetime
  if (timeStr.includes("T")) {
    const d = new Date(timeStr);
    if (!isNaN(d.getTime())) return d;
  }
  // HH:MM or HH:MM:SS (24-hr)
  const hhmm = timeStr.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmm) {
    const d = new Date(today);
    d.setHours(parseInt(hhmm[1]), parseInt(hhmm[2]), parseInt(hhmm[3] ?? "0"), 0);
    return d;
  }
  // "6:05 AM" / "10:30 PM"
  const ampm = timeStr.match(/^(\d{1,2}):(\d{2})\s*(am|pm)/i);
  if (ampm) {
    let h = parseInt(ampm[1]);
    const m = parseInt(ampm[2]);
    const isPm = ampm[3].toLowerCase() === "pm";
    if (isPm && h !== 12) h += 12;
    if (!isPm && h === 12) h = 0;
    const d = new Date(today);
    d.setHours(h, m, 0, 0);
    return d;
  }
  return null;
}

const EVENT_TYPE_ICON: Record<string, LucideIcon> = {
  workout: Dumbbell,
  meal:    Utensils,
  work:    Brain,
  health:  Heart,
  event:   CalendarDays,
};

function formatTimeRange(start: Date, end: Date | null): string {
  const fmt = (d: Date) => d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return end ? `${fmt(start)} – ${fmt(end)}` : fmt(start);
}

function TodayPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const [, setLocation] = useLocation();
  const now = new Date();

  // Build timed event list sorted by start
  const timedEvents = summary.todayEvents
    .filter(e => !e.isAllDay && e.startTime)
    .map(e => {
      const startDate = parseEventTime(e.startTime, now);
      const endDate   = e.endTime ? parseEventTime(e.endTime, now) : (startDate ? new Date(startDate.getTime() + 60 * 60 * 1000) : null);
      return { ...e, startDate, endDate };
    })
    .filter(e => e.startDate != null)
    .sort((a, b) => a.startDate!.getTime() - b.startDate!.getTime());

  // Classify every event by its time relation to now
  type TodayCard = { slot: "now" | "next" | "later" | "past" | "fallback"; title: string; sub: string; Icon: LucideIcon; path?: string; };
  const cards: TodayCard[] = timedEvents.map((e) => {
    const Icon = EVENT_TYPE_ICON[e.eventType ?? ""] ?? CalendarDays;
    const isPast   = e.endDate! < now;
    const isNow    = e.startDate! <= now && e.endDate! >= now;
    const upcomingIdx = timedEvents.filter(x => x.startDate! > now).indexOf(e);
    const slot: TodayCard["slot"] =
      isNow              ? "now"  :
      isPast             ? "past" :
      upcomingIdx === 0  ? "next" : "later";
    return {
      slot,
      title: e.title,
      sub:   formatTimeRange(e.startDate!, e.endDate),
      Icon,
      path: "/calendar?view=day",
    };
  });

  // Fallbacks when no timed events
  if (cards.length === 0) {
    if (summary.nextEvent) {
      cards.push({
        slot: "fallback",
        title: summary.nextEvent.title,
        sub: summary.nextEvent.isAllDay ? "All day" : (summary.nextEvent.startTime?.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) ?? ""),
        Icon: CalendarDays,
        path: "/calendar",
      });
    }
    if (summary.activeGoals[0]) {
      cards.push({
        slot: "fallback",
        title: `Priority: ${summary.activeGoals[0].title}`,
        sub: summary.activeGoals[0].progress != null ? `${summary.activeGoals[0].progress}% done` : "Active goal",
        Icon: Target,
        path: "/goals",
      });
    }
    if (summary.momentumData?.suggestedFocus) {
      cards.push({
        slot: "fallback",
        title: summary.momentumData.suggestedFocus,
        sub: "Suggested focus",
        Icon: Sparkles,
        path: "/talk",
      });
    }
    if (cards.length === 0) {
      cards.push(
        { slot: "fallback", title: "Nothing scheduled yet today", sub: "Enjoy the open space", Icon: Moon },
        { slot: "fallback", title: "Talk with DW", sub: "Get personalized guidance for your day", Icon: MessageCircle, path: "/talk" },
      );
    }
  }

  const slotLabel: Record<TodayCard["slot"], string> = {
    now:      "Now",
    next:     "Next",
    later:    "Later",
    past:     "Done",
    fallback: "",
  };
  const slotPill: Record<TodayCard["slot"], string> = {
    now:      "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30",
    next:     "bg-blue-500/15 text-blue-700 dark:text-blue-400 border border-blue-500/30",
    later:    "bg-muted/60 text-muted-foreground border border-border/60",
    past:     "bg-muted/40 text-muted-foreground/60 border border-border/40",
    fallback: "bg-muted/60 text-muted-foreground border border-border/60",
  };
  const dotColor: Record<TodayCard["slot"], string> = {
    now:      "bg-emerald-500 animate-pulse",
    next:     "bg-blue-500",
    later:    "bg-muted-foreground/40",
    past:     "bg-muted-foreground/20",
    fallback: "bg-muted-foreground/20",
  };

  const aheadCount = cards.filter(c => c.slot !== "past").length;
  const nowLabel = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex flex-col" data-testid="today-timeline">
      <p className="text-[11px] text-muted-foreground px-1 pb-2">
        {nowLabel} · {aheadCount > 0 ? `${aheadCount} event${aheadCount !== 1 ? "s" : ""} ahead` : "All done for today"}
      </p>

      {/* Scrollable full-day event list */}
      <div className="overflow-y-auto max-h-[52vh] space-y-1.5 pr-0.5" style={{ WebkitOverflowScrolling: "touch" }}>
        {cards.map((card, i) => (
          <button
            key={i}
            className={`w-full text-left flex items-center gap-3 px-3 py-2.5 rounded-xl border active:scale-[0.98] transition-all ${
              card.slot === "past"
                ? "bg-muted/20 border-border/30 opacity-50"
                : "bg-card border-border/50 hover:border-border"
            }`}
            onClick={() => card.path && setLocation(card.path)}
            data-testid={`today-card-${card.slot}-${i}`}
          >
            {/* slot badge */}
            {card.slot !== "fallback" ? (
              <div className="flex flex-col items-center gap-0.5 shrink-0 w-12">
                <span className={`w-1.5 h-1.5 rounded-full ${dotColor[card.slot]}`} />
                <span className={`text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-full ${slotPill[card.slot]}`}>
                  {slotLabel[card.slot]}
                </span>
              </div>
            ) : (
              <div className="w-12 shrink-0" />
            )}

            <card.Icon className={`w-4 h-4 shrink-0 ${card.slot === "now" ? "text-emerald-500" : "text-muted-foreground"}`} />

            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium truncate leading-tight ${card.slot === "past" ? "text-muted-foreground" : "text-foreground"}`}>
                {card.title}
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{card.sub}</p>
            </div>

            <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
          </button>
        ))}
      </div>
    </div>
  );
}

function InsightPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const [, nav] = useLocation();
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
            <div
              className="cc-card cursor-pointer hover:ring-1 hover:ring-amber-400/40 transition-all"
              onClick={() => nav("/insights")}
              data-testid={`insight-card-${i}`}
            >
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
  const [, nav] = useLocation();
  if (summary.activeGoals.length === 0) {
    return (
      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2">
          <CarouselItem className="pl-2 basis-[85%]">
            <div
              className="cc-card cursor-pointer hover:ring-1 hover:ring-violet-400/40 transition-all"
              onClick={() => nav("/goals")}
              data-testid="plan-card-empty"
            >
              <p className="text-sm font-medium text-foreground">No active plan</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to set your first goal</p>
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
            <div
              className="cc-card cursor-pointer hover:ring-1 hover:ring-violet-400/40 transition-all"
              onClick={() => nav("/goals")}
              data-testid={`plan-card-goal-${goal.id}`}
            >
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
  const [, nav] = useLocation();
  const snap = summary.nutritionSnapshot;
  if (!snap) {
    return (
      <Carousel opts={{ align: "start", dragFree: true }}>
        <CarouselContent className="-ml-2">
          <CarouselItem className="pl-2 basis-[85%]">
            <div
              className="cc-card cursor-pointer hover:ring-1 hover:ring-emerald-400/40 transition-all"
              onClick={() => nav("/meal-prep")}
              data-testid="nutrition-card-empty"
            >
              <p className="text-sm font-medium text-foreground">No meals logged today</p>
              <p className="text-xs text-muted-foreground mt-0.5">Tap to log your first meal</p>
            </div>
          </CarouselItem>
          <CarouselItem className="pl-2 basis-[85%]">
            <div
              className="cc-card cursor-pointer hover:ring-1 hover:ring-emerald-400/40 transition-all"
              onClick={() => nav("/meal-prep")}
              data-testid="nutrition-card-track"
            >
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
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-emerald-400/40 transition-all"
            onClick={() => nav("/meal-prep")}
            data-testid="nutrition-card-calories"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm font-medium text-foreground">Calories</span>
              <span className="text-xs text-muted-foreground">{snap.caloriesConsumed} / {snap.caloriesTarget}</span>
            </div>
            <Progress value={calPct} className="h-2" />
            <p className="text-xs text-muted-foreground mt-1">{calRemaining > 0 ? `${calRemaining} remaining` : "Target reached"}</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-emerald-400/40 transition-all"
            onClick={() => nav("/meal-prep")}
            data-testid="nutrition-card-protein"
          >
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
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-emerald-400/40 transition-all"
            onClick={() => nav("/meal-prep")}
            data-testid="nutrition-card-summary"
          >
            <p className="text-sm font-medium text-foreground">Daily Summary</p>
            <p className="text-xs text-muted-foreground mt-1">{calPct}% of calories, {proPct}% of protein consumed</p>
            <p className="text-xs text-muted-foreground mt-0.5">Tap to log or adjust meals</p>
          </div>
        </CarouselItem>
      </CarouselContent>
    </Carousel>
  );
}

function MomentumPreview({ summary }: { summary: ReturnType<typeof useHomeSummary> }) {
  const [, nav] = useLocation();
  const streakHabits = summary.activeHabits.filter((h) => (h.streak ?? 0) > 0);
  const activeGoals = summary.activeGoals.filter((g) => (g.progress ?? 0) < 100);

  const { data: progressData = [] } = useQuery<any[]>({
    queryKey: ["/api/goals/progress-data"],
    staleTime: 60000,
  });
  const progressByGoalId = progressData.reduce((acc: Record<string, any>, g: any) => {
    acc[g.id] = g.contributingData;
    return acc;
  }, {});

  const slides: { content: JSX.Element }[] = [];

  if (summary.momentumData) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-rose-400/40 transition-all"
          onClick={() => nav("/habits")}
          data-testid="momentum-card-status"
        >
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

  if (activeGoals.length > 0) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-primary/40 transition-all"
          onClick={() => nav("/goals")}
          data-testid="momentum-card-goals-pulse"
        >
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goals Pulse</span>
          </div>
          <div className="space-y-1.5">
            {activeGoals.slice(0, 2).map((g) => {
              const cd = progressByGoalId[g.id];
              return (
                <div key={g.id} className="space-y-0.5">
                  <div className="flex justify-between text-xs">
                    <span className="truncate max-w-[130px]">{g.title}</span>
                    <span className="text-primary font-medium ml-1 shrink-0">{g.progress ?? 0}%</span>
                  </div>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/60 rounded-full" style={{ width: `${g.progress ?? 0}%` }} />
                  </div>
                  {cd && cd.type !== "none" && (
                    <p className="text-[10px] text-muted-foreground">
                      {cd.label}: <span className="text-foreground">{cd.value}</span>
                      {cd.delta && <span className="text-green-600 ml-1">{cd.delta}</span>}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
          {activeGoals.length > 2 && (
            <p className="text-[10px] text-muted-foreground mt-1.5">+{activeGoals.length - 2} more goals →</p>
          )}
        </div>
      ),
    });
  }

  streakHabits.forEach((h) => {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-rose-400/40 transition-all flex items-center justify-between"
          onClick={() => nav("/habits")}
          data-testid={`momentum-card-habit-${h.id}`}
        >
          <span className="text-sm font-medium text-foreground">{h.title}</span>
          <Badge variant="secondary">{h.streak} day streak</Badge>
        </div>
      ),
    });
  });

  if (slides.length === 0) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-rose-400/40 transition-all"
          onClick={() => nav("/habits")}
          data-testid="momentum-card-empty"
        >
          <p className="text-sm font-medium text-foreground">No active streaks yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tap to start building momentum</p>
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
  const [, nav] = useLocation();
  const slides: { content: JSX.Element }[] = [];

  if (summary.activeFollowUp) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
          onClick={() => nav("/talk")}
          data-testid="followup-card-active"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">DW wants to know</p>
          <p className="text-sm font-medium text-foreground">{summary.activeFollowUp.prompt}</p>
          <p className="text-xs text-muted-foreground mt-1">Tap to respond</p>
        </div>
      ),
    });
  }

  if (summary.lastConversationTopic) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
          onClick={() => nav("/talk")}
          data-testid="followup-card-last-convo"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-1">Last conversation</p>
          <p className="text-sm font-medium text-foreground">{summary.lastConversationTopic}</p>
          <p className="text-xs text-muted-foreground mt-1">Tap to continue</p>
        </div>
      ),
    });
  }

  if (slides.length === 0) {
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
          onClick={() => nav("/talk")}
          data-testid="followup-card-empty"
        >
          <p className="text-sm font-medium text-foreground">No follow-ups yet</p>
          <p className="text-xs text-muted-foreground mt-0.5">Tap to start talking with DW</p>
        </div>
      ),
    });
  }

  slides.push({
    content: (
      <div
        className="cc-card cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
        onClick={() => nav("/talk")}
        data-testid="followup-card-stay-connected"
      >
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
  const [, nav] = useLocation();
  const slides: { content: JSX.Element }[] = [];

  if (summary.latestJournalEntry) {
    const entry = summary.latestJournalEntry;
    slides.push({
      content: (
        <div
          className="cc-card cursor-pointer hover:ring-1 hover:ring-teal-400/40 transition-all"
          onClick={() => nav("/journal")}
          data-testid="journal-card-latest"
        >
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
      <div
        className="cc-card cursor-pointer hover:ring-1 hover:ring-teal-400/40 transition-all"
        onClick={() => nav("/journal")}
        data-testid="journal-card-info"
      >
        <p className="text-sm font-medium text-foreground">{summary.latestJournalEntry ? "Your journal grows with you" : "No journal entries yet"}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{summary.latestJournalEntry ? "Tap to read your entries" : "Tap to start writing"}</p>
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

function CosmicPreview({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const [, nav] = useLocation();
  const go = (path: string) => (onNavigate ? onNavigate(path) : nav(path));
  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-violet-400/40 transition-all"
            onClick={() => go("/cosmic?tab=calendar")}
            data-testid="cosmic-card-moon-phase"
          >
            <div className="flex items-center gap-2 mb-1">
              <Moon className="h-4 w-4 text-violet-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Moon Phase</span>
            </div>
            <p className="text-sm font-medium text-foreground">View today's lunar guidance</p>
            <p className="text-xs text-muted-foreground mt-0.5">Personalized to your chart</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-amber-400/40 transition-all"
            onClick={() => go("/cosmic?tab=readings")}
            data-testid="cosmic-card-transits"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Readings</span>
            </div>
            <p className="text-sm font-medium text-foreground">Today's cosmic energy</p>
            <p className="text-xs text-muted-foreground mt-0.5">Deep readings & insights</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-indigo-400/40 transition-all"
            onClick={() => go("/cosmic?tab=numerology")}
            data-testid="cosmic-card-numerology"
          >
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
  const [, nav] = useLocation();
  return (
    <Carousel opts={{ align: "start", dragFree: true }}>
      <CarouselContent className="-ml-2">
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-sky-400/40 transition-all"
            onClick={() => nav("/browse")}
            data-testid="foryou-card-wellness"
          >
            <div className="flex items-center gap-2 mb-1">
              <Compass className="h-4 w-4 text-teal-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Wellness</span>
            </div>
            <p className="text-sm font-medium text-foreground">Explore curated content</p>
            <p className="text-xs text-muted-foreground mt-0.5">Workouts, meditations & more</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-sky-400/40 transition-all"
            onClick={() => nav("/browse")}
            data-testid="foryou-card-community"
          >
            <div className="flex items-center gap-2 mb-1">
              <MessageCircle className="h-4 w-4 text-blue-400" />
              <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Community</span>
            </div>
            <p className="text-sm font-medium text-foreground">Connect & grow together</p>
            <p className="text-xs text-muted-foreground mt-0.5">Groups, challenges & support</p>
          </div>
        </CarouselItem>
        <CarouselItem className="pl-2 basis-[85%]">
          <div
            className="cc-card cursor-pointer hover:ring-1 hover:ring-sky-400/40 transition-all"
            onClick={() => nav("/browse")}
            data-testid="foryou-card-resources"
          >
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
