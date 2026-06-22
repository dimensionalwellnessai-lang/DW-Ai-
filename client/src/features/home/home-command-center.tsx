import { useState, useRef, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AllFeaturesView } from "@/components/all-features-view";
import { ProactiveCard } from "@/components/proactive-card";
import type { ProactiveCardProps } from "@/components/proactive-card";
import { DWReadingCard } from "@/components/dw-reading-card";
import { InsightSnapshotCard } from "./components/InsightSnapshotCard";
import { useNavigationStore } from "@/stores/useNavigationStore";
import { useHomeSummary } from "./useHomeSummary";
import { isE2ETestMode } from "@/lib/e2e-mode";
import { isFeatureEnabled } from "@/config/featureFlags";
import { CommandCenterOrbit } from "@/components/home/command-center-orbit";
import type { HomeSummary } from "./types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  type CarouselApi,
} from "@/components/ui/carousel";
import {
  ChevronRight,
  Menu,
  Sparkles,
  Pencil,
  Check,
  X,
  LifeBuoy,
  MessageCircle,
  RefreshCw,
  Clock,
  Compass,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TriggerProtocolSheet } from "@/components/triggers/trigger-protocol-sheet";
import type { TriggerEventListResponse } from "@/lib/triggers";
import { JournalPromptSheet } from "@/components/mood/journal-prompt-sheet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

// localStorage keys shared with voice-onboarding.tsx
const LS_VOICE_ONBOARDING_COMPLETED = "dw_voice_onboarding_completed";
const LS_VOICE_ONBOARDING_SKIPPED = "dw_voice_onboarding_skipped";

/** Returns true when the user has fully completed the Spec 13 conversational onboarding session. */
function isConversationalOnboardingDone(): boolean {
  try {
    return localStorage.getItem(LS_VOICE_ONBOARDING_COMPLETED) === "true";
  } catch {
    return false;
  }
}

/** Returns true when the user explicitly skipped the conversational session (so we don't keep nudging). */
function isConversationalOnboardingSkipped(): boolean {
  try {
    return localStorage.getItem(LS_VOICE_ONBOARDING_SKIPPED) === "true";
  } catch {
    return false;
  }
}

// Map a quick "how I feel right now" chip to a mood-log payload. The shape
// matches POST /api/mood (energy/mood/clarity 1-10) so the chip taps feed
// the same insight pipeline as the full mood tracker.
const FEELING_CHIPS = {
  Calm:     { energyLevel: 7, moodLevel: 8, clarityLevel: 8, notes: "feeling calm" },
  Off:      { energyLevel: 5, moodLevel: 5, clarityLevel: 5, notes: "feeling off" },
  Stressed: { energyLevel: 4, moodLevel: 3, clarityLevel: 4, notes: "feeling stressed" },
} as const;

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

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatClock(value: string | Date): string {
  const d = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** Pick the schedule item happening now, else the next upcoming one today, for the "Now" card. */
function getNowOrNext(
  summary: HomeSummary,
): { kind: "now" | "next"; time: string; title: string } | null {
  const now = Date.now();
  const events = summary.todayEvents ?? [];
  for (const e of events) {
    const start = new Date(e.startTime).getTime();
    if (Number.isNaN(start)) continue;
    const end = e.endTime ? new Date(e.endTime).getTime() : start + 60 * 60 * 1000;
    if (now >= start && now <= end) {
      return { kind: "now", time: formatClock(e.startTime), title: e.title };
    }
  }
  const upcoming = events
    .map(e => ({ e, t: new Date(e.startTime).getTime() }))
    .filter(x => !Number.isNaN(x.t) && x.t > now)
    .sort((a, b) => a.t - b.t)[0];
  if (upcoming) return { kind: "next", time: formatClock(upcoming.e.startTime), title: upcoming.e.title };
  if (summary.nextEvent?.startTime) {
    return { kind: "next", time: formatClock(summary.nextEvent.startTime), title: summary.nextEvent.title };
  }
  return null;
}

export default function HomeCommandCenter() {
  usePageMeta(
    "Home",
    "Your Life System at a glance — Core, Expression, and Creation in one orbit.",
  );
  const summary = useHomeSummary();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { allFeaturesOpen, closeAllFeatures } = useNavigationStore();
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMoodLogId, setJournalMoodLogId] = useState<string | null>(null);
  const { toast } = useToast();
  const triggersQ = useQuery<TriggerEventListResponse>({
    queryKey: ["/api/trigger-events"],
  });
  const weekStats = triggersQ.data?.week;

  const [carouselApi, setCarouselApi] = useState<CarouselApi>();
  const [selectedSnap, setSelectedSnap] = useState(0);
  const [snapCount, setSnapCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!carouselApi) return;
    const update = () => {
      setSnapCount(carouselApi.scrollSnapList().length);
      setSelectedSnap(carouselApi.selectedScrollSnap());
    };
    update();
    carouselApi.on("select", update);
    carouselApi.on("reInit", update);
    return () => {
      carouselApi.off("select", update);
      carouselApi.off("reInit", update);
    };
  }, [carouselApi]);

  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => () => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
  }, []);

  const handleRefreshDeck = () => {
    setRefreshing(true);
    for (const key of [
      "/api/trigger-events",
      "/api/onboarding/next-prompt",
      "/api/schedule",
      "/api/calendar",
      "/api/today",
      "/api/dw/followups",
      "/api/dw/latestJournal",
      "/api/mood/today",
    ]) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => setRefreshing(false), 700);
  };

  const nowItem = getNowOrNext(summary);

  // Show the conversational onboarding card when the Spec 13 first-session hasn't been completed or skipped
  const showOnboardingCard = !isConversationalOnboardingDone() && !isConversationalOnboardingSkipped() && !isE2ETestMode();

  // Progressive onboarding follow-up card — shown after first session is complete
  interface ProgressivePrompt { id: string; prompt: string; context: string; }
  const [dismissedPromptId, setDismissedPromptId] = useState<string | null>(null);
  const progressivePromptQ = useQuery<{ prompt: ProgressivePrompt | null }>({
    queryKey: ["/api/onboarding/next-prompt"],
    enabled: isConversationalOnboardingDone() && !isE2ETestMode(),
    staleTime: 5 * 60 * 1000,
  });
  const fetchedPrompt = progressivePromptQ.data?.prompt ?? null;
  const nextPrompt = fetchedPrompt && dismissedPromptId === fetchedPrompt.id ? null : fetchedPrompt;

  const dismissProgressivePromptMutation = useMutation({
    mutationFn: (promptId: string) =>
      apiRequest("POST", "/api/onboarding/dismiss-prompt", { promptId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/onboarding/next-prompt"] });
    },
  });

  const handleDismissProgressivePrompt = (promptId: string) => {
    setDismissedPromptId(promptId);
    dismissProgressivePromptMutation.mutate(promptId);
  };

  const moodChipMutation = useMutation({
    mutationFn: async (label: keyof typeof FEELING_CHIPS) => {
      const res = await apiRequest("POST", "/api/mood", FEELING_CHIPS[label]);
      const log = (await res.json()) as { id: string; moodLevel: number };
      return { label, log };
    },
    onSuccess: ({ label, log }) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/timeline"] });
      toast({
        title: `Logged: ${label}`,
        description: "DW will use this to shape today's check-ins.",
      });
      // Journal-on-mood: low chips immediately offer a 3-prompt reflection.
      if (label === "Stressed" || label === "Off") {
        setJournalMoodLogId(log.id);
        setJournalOpen(true);
      }
    },
    onError: () => {
      toast({
        title: "Couldn't save that just now",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

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

  const firstName = summary.userName ? summary.userName.split(" ")[0] : null;

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

  // Hide all proactive accountability cards in automated test runs so the
  // test runner doesn't have to dismiss them mid-flow. Real users still
  // see them as before.
  const visibleProactiveCards = isE2ETestMode()
    ? []
    : summary.proactiveCards.filter(c => !dismissedCards.has(c.type));

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

      <div className="flex-1 flex flex-col overflow-y-auto">
        {/* ── Hero: calm command-center orb ─────────────────────────────── */}
        <div
          className="flex flex-col items-center justify-center px-4 pt-4 pb-4 shrink-0"
          data-testid="section-orbit-hero"
        >
          <div className="relative flex items-center justify-center">
            <div className="absolute rounded-full bg-primary/5 blur-3xl" style={{ width: 240, height: 240 }} aria-hidden="true" />
            <div className="absolute rounded-full bg-primary/10 blur-2xl" style={{ width: 120, height: 120 }} aria-hidden="true" />
            <CommandCenterOrbit size={280} className="relative z-10" />
          </div>
          <p className="text-[11px] text-muted-foreground tracking-wide mt-2" data-testid="text-protocol-hint">
            Pause · Name · Flip · Choose
          </p>
        </div>

        {/* ── Gentle feeling check ──────────────────────────────────────── */}
        <div className="px-4 pt-1 pb-3 max-w-lg mx-auto w-full" data-testid="section-feeling-chips">
          <p className="text-[11px] text-muted-foreground/70 text-center mb-2">How are you feeling right now?</p>
          <div className="flex items-center justify-center gap-2 flex-wrap">
            {(Object.keys(FEELING_CHIPS) as Array<keyof typeof FEELING_CHIPS>).map(label => (
              <button
                key={label}
                type="button"
                disabled={moodChipMutation.isPending}
                onClick={() => moodChipMutation.mutate(label)}
                className="text-xs px-3 py-1 rounded-full border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors disabled:opacity-50"
                data-testid={`chip-feeling-${label.toLowerCase()}`}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setTriggerOpen(true)}
              className="text-xs px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/30 hover:bg-primary/15 transition-colors flex items-center gap-1"
              data-testid="chip-feeling-triggered"
            >
              <LifeBuoy className="h-3 w-3" />
              I feel triggered
            </button>
          </div>
        </div>

        {/* ── Curated card deck ─────────────────────────────────────────── */}
        <div className="shrink-0 px-4 pb-4 pt-0 w-full max-w-lg mx-auto" data-testid="section-cards">
          <div className="flex items-center justify-between px-1 mb-2">
            <div className="flex items-baseline gap-1.5">
              <p className="text-sm font-semibold font-display" data-testid="text-deck-title">For you</p>
              <span className="text-[11px] text-muted-foreground/70">· curated by DW</span>
            </div>
            <button
              type="button"
              onClick={handleRefreshDeck}
              className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground border border-border rounded-full px-2.5 py-1 transition-colors"
              data-testid="btn-refresh-deck"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
          <Carousel setApi={setCarouselApi} opts={{ align: "start", dragFree: true }}>
            <CarouselContent className="-ml-2 items-stretch">
              {/* ── "Now" schedule card ─────────────────────────────── */}
              <CarouselItem className="pl-2 basis-[85%] h-full">
                <div className="w-full h-full rounded-2xl border border-border bg-card px-4 py-3.5 flex flex-col" data-testid="card-now-schedule">
                  <button
                    type="button"
                    onClick={() => navigate("/calendar?view=day")}
                    className="text-left flex items-start gap-3"
                  >
                    <div className="h-9 w-9 rounded-full bg-emerald-500/15 flex items-center justify-center shrink-0">
                      <Clock className="h-4 w-4 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-400" data-testid="text-now-label">
                        {nowItem ? (nowItem.kind === "now" ? `Now · ${nowItem.time}` : `Next · ${nowItem.time}`) : "Today"}
                      </p>
                      <p className="text-sm font-semibold leading-snug mt-0.5 truncate" data-testid="text-now-title">
                        {nowItem ? nowItem.title : "Your day is open"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {nowItem ? "On your schedule. Tap to open." : "Tap to plan something gentle."}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                  <div className="flex items-center gap-2 mt-3 pl-12">
                    {(["day", "week", "month"] as const).map(v => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => navigate(`/calendar?view=${v}`)}
                        className="text-[11px] capitalize px-2.5 py-1 rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                        data-testid={`btn-now-${v}`}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                </div>
              </CarouselItem>
              {/* Spec 13 progressive onboarding card — shown until the first session is completed */}
              {showOnboardingCard && (
                <CarouselItem className="pl-2 basis-[85%] h-full">
                  <button
                    onClick={() => navigate("/voice-onboarding")}
                    data-testid="card-start-first-session"
                    className="w-full h-full text-left rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/8 to-primary/15 px-4 py-3.5 flex items-center gap-3 hover:border-primary/60 transition-colors"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                      <MessageCircle className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug">Start your first session</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        A short life coaching conversation shapes your life system
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </CarouselItem>
              )}

              {/* Spec 13 PR B — Progressive follow-up card (after first session) */}
              {nextPrompt && (
                <CarouselItem className="pl-2 basis-[85%] h-full">
                  <div
                    data-testid="card-progressive-prompt"
                    className="w-full h-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3.5 flex flex-col gap-2"
                  >
                    <div className="flex items-start gap-2">
                      <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <p className="text-sm font-medium leading-snug flex-1">
                        {nextPrompt.prompt}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed pl-9">
                      {nextPrompt.context}
                    </p>
                    <div className="flex gap-2 pl-9 mt-1">
                      <Button
                        size="sm"
                        className="h-7 text-xs px-3"
                        onClick={() => navigate(`/talk?prefill=${encodeURIComponent(nextPrompt.prompt)}`)}
                        data-testid="btn-answer-progressive-prompt"
                      >
                        Answer
                        <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs px-3 text-muted-foreground"
                        onClick={() => handleDismissProgressivePrompt(nextPrompt.id)}
                        data-testid="btn-skip-progressive-prompt"
                      >
                        Not now
                      </Button>
                    </div>
                  </div>
                </CarouselItem>
              )}

              {isFeatureEnabled("DW_READING_CARD") && (
                <CarouselItem className="pl-2 basis-[85%] h-full">
                  <DWReadingCard energyLevel={summary.energyLevel} className="h-full" />
                </CarouselItem>
              )}

              <CarouselItem className="pl-2 basis-[85%] h-full">
                <InsightSnapshotCard summary={summary} className="h-full" />
              </CarouselItem>

              {weekStats && weekStats.total > 0 && (
                <CarouselItem className="pl-2 basis-[85%] h-full">
                  <button
                    type="button"
                    onClick={() => navigate("/life-system/pillar/emotional_regulation")}
                    className="w-full h-full text-left rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
                    data-testid="card-trigger-week"
                  >
                    <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <LifeBuoy className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold leading-snug" data-testid="text-trigger-week-title">
                        {weekStats.total} trigger{weekStats.total === 1 ? "" : "s"} this week
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {weekStats.noProof > 0
                          ? `${weekStats.noProof} had no confirmed issue.`
                          : "Tap to review your patterns."}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </button>
                </CarouselItem>
              )}

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

              {/* ── Explore / topics curated from DW chats ──────────── */}
              <CarouselItem className="pl-2 basis-[85%] h-full">
                <button
                  type="button"
                  onClick={() => navigate("/browse")}
                  data-testid="card-explore"
                  className="w-full h-full text-left rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
                >
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Compass className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-primary">Explore</p>
                    <p className="text-sm font-semibold leading-snug mt-0.5 truncate">
                      {summary.lastConversationTopic ? `More on ${summary.lastConversationTopic}` : "Something new for you"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">Articles, videos &amp; ideas DW picked for you</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              </CarouselItem>
            </CarouselContent>
          </Carousel>
          {snapCount > 1 && (
            <div className="flex items-center justify-center gap-1.5 mt-3" data-testid="carousel-dots">
              {Array.from({ length: snapCount }).map((_, i) => (
                <div
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${i === selectedSnap ? "w-4 bg-primary" : "w-1.5 bg-border"}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AllFeaturesView open={allFeaturesOpen} onClose={closeAllFeatures} />
      <TriggerProtocolSheet open={triggerOpen} onOpenChange={setTriggerOpen} />
      <JournalPromptSheet
        open={journalOpen}
        onOpenChange={setJournalOpen}
        moodLogId={journalMoodLogId}
        intro="That entry was on the heavier side. Want to add a small reflection? Skip any prompt."
      />
    </div>
  );
}
