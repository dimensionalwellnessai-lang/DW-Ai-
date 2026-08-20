import { useState, useRef, useEffect, useCallback, type ReactNode } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { ProactiveCard } from "@/components/proactive-card";
import type { ProactiveCardProps } from "@/components/proactive-card";
import { DWReadingCard } from "@/components/dw-reading-card";
import { InsightSnapshotCard } from "./components/InsightSnapshotCard";
import { useHomeSummary } from "./useHomeSummary";
import { isE2ETestMode } from "@/lib/e2e-mode";
import { isFeatureEnabled } from "@/config/featureFlags";
import type { HomeSummary } from "./types";
import {
  Brain,
  Check,
  ChevronRight,
  Clock,
  Compass,
  Import,
  LifeBuoy,
  Menu,
  MessageCircle,
  Pencil,
  RefreshCw,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { TriggerProtocolSheet } from "@/components/triggers/trigger-protocol-sheet";
import type { TriggerEventListResponse } from "@/lib/triggers";
import { JournalPromptSheet } from "@/components/mood/journal-prompt-sheet";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";

const LS_VOICE_ONBOARDING_COMPLETED = "dw_voice_onboarding_completed";
const LS_VOICE_ONBOARDING_SKIPPED = "dw_voice_onboarding_skipped";

function isConversationalOnboardingDone(): boolean {
  try {
    return localStorage.getItem(LS_VOICE_ONBOARDING_COMPLETED) === "true";
  } catch {
    return false;
  }
}

function isConversationalOnboardingSkipped(): boolean {
  try {
    return localStorage.getItem(LS_VOICE_ONBOARDING_SKIPPED) === "true";
  } catch {
    return false;
  }
}

const LS_FINISH_SETUP_DISMISSED_PREFIX = "dw_finish_setup_dismissed_";
const LS_LIFE_REFRESH_DISMISSED_AT = "dw_life_refresh_dismissed_at";
const STALE_PROFILE_DAYS = 60;
const LIFE_REFRESH_SNOOZE_DAYS = 14;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayDateKey(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function isFinishSetupDismissedToday(): boolean {
  try {
    return localStorage.getItem(LS_FINISH_SETUP_DISMISSED_PREFIX + todayDateKey()) === "1";
  } catch {
    return false;
  }
}

function isLifeRefreshSnoozed(): boolean {
  try {
    const raw = localStorage.getItem(LS_LIFE_REFRESH_DISMISSED_AT);
    if (!raw) return false;
    const ts = Number(raw);
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts < LIFE_REFRESH_SNOOZE_DAYS * DAY_MS;
  } catch {
    return false;
  }
}

const FEELING_CHIPS = {
  Calm: { energyLevel: 7, moodLevel: 8, clarityLevel: 8, notes: "feeling calm" },
  Off: { energyLevel: 5, moodLevel: 5, clarityLevel: 5, notes: "feeling off" },
  Stressed: { energyLevel: 4, moodLevel: 3, clarityLevel: 4, notes: "feeling stressed" },
} as const;

const AFFIRMATIONS = {
  morning: {
    low: ["Start slow — you still get to show up.", "Gentle mornings count too.", "You don't have to rush into this day.", "Even a quiet start is a start."],
    mid: ["Today is already in motion.", "You woke up — that's the first win.", "This morning is yours to shape.", "Step by step, the day opens."],
    high: ["Morning energy is yours — use it well.", "Today has good things in it.", "You're already ahead just by beginning.", "Rise and build something real."],
  },
  afternoon: {
    low: ["The afternoon doesn't need your best — just your presence.", "One thing at a time is enough.", "You've made it this far today.", "Pace yourself. There's still time."],
    mid: ["Progress isn't always visible, but it's happening.", "Stay with it — you're doing more than you know.", "Midday is a good place to reset.", "Keep going. Steady is enough."],
    high: ["You're in the middle of something good.", "The afternoon is yours to finish strong.", "You've got momentum — ride it.", "Trust what you've built so far today."],
  },
  evening: {
    low: ["You made it through. That's real.", "Let the day be enough.", "Rest is your next right move.", "Evening is permission to soften."],
    mid: ["Whatever today held, you were in it.", "Wind down gently — you earned it.", "Reflect, release, rest.", "Evenings are for coming back to yourself."],
    high: ["What a day you've built.", "Finish strong, then let go.", "Celebrate what moved forward today.", "Tonight is yours — you've earned it."],
  },
  night: {
    low: ["Tomorrow starts fresh.", "Sleep is the kindest thing you can give yourself.", "Rest now. Tomorrow is a new canvas.", "You did enough. Let it be."],
    mid: ["The night is good for letting go.", "Tomorrow's version of you will be grateful for the rest.", "Peace is productive.", "You are allowed to stop."],
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

function getNowOrNext(summary: HomeSummary): { kind: "now" | "next"; time: string; title: string } | null {
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
    .map((e) => ({ e, t: new Date(e.startTime).getTime() }))
    .filter((x) => !Number.isNaN(x.t) && x.t > now)
    .sort((a, b) => a.t - b.t)[0];
  if (upcoming) {
    return { kind: "next", time: formatClock(upcoming.e.startTime), title: upcoming.e.title };
  }
  if (summary.nextEvent?.startTime) {
    return { kind: "next", time: formatClock(summary.nextEvent.startTime), title: summary.nextEvent.title };
  }
  return null;
}

function truncateDirection(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}…` : trimmed;
}

export default function HomeCommandCenter() {
  usePageMeta("Today", "Your day at a glance with DW.");
  const summary = useHomeSummary();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);
  const [journalMoodLogId, setJournalMoodLogId] = useState<string | null>(null);
  const { toast } = useToast();

  const refreshQueryKeys = [
    "/api/trigger-events",
    "/api/onboarding/next-prompt",
    "/api/onboarding/profile",
    "/api/profile/lifestyle-preferences",
    "/api/schedule",
    "/api/calendar",
    "/api/today",
    "/api/dw/followups",
    "/api/dw/latestJournal",
    "/api/mood/today",
    "/api/routines",
  ] as const;

  const invalidateHomeQueries = useCallback(() => {
    for (const key of refreshQueryKeys) {
      queryClient.invalidateQueries({ queryKey: [key] });
    }
  }, []);

  useEffect(() => {
    invalidateHomeQueries();
    const handleFocus = () => invalidateHomeQueries();
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        invalidateHomeQueries();
      }
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [invalidateHomeQueries]);

  const triggersQ = useQuery<TriggerEventListResponse>({
    queryKey: ["/api/trigger-events"],
  });
  const weekStats = triggersQ.data?.week;

  const nowItem = getNowOrNext(summary);
  const showOnboardingCard = !isConversationalOnboardingDone() && !isConversationalOnboardingSkipped() && !isE2ETestMode();

  const [finishSetupDismissed, setFinishSetupDismissed] = useState(() => isFinishSetupDismissedToday());
  const [lifeRefreshDismissed, setLifeRefreshDismissed] = useState(() => isLifeRefreshSnoozed());

  const onboardingProfileQ = useQuery<{ profile: { completedAt?: string | null; generatedDirection?: string | null } | null }>({
    queryKey: ["/api/onboarding/profile"],
    enabled: !isE2ETestMode(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const lifestylePreferencesQ = useQuery<Record<string, string>>({
    queryKey: ["/api/profile/lifestyle-preferences"],
    enabled: !isE2ETestMode(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
  const onboardingProfile = onboardingProfileQ.data?.profile ?? null;
  const directionLine = truncateDirection(
    onboardingProfile?.generatedDirection ?? lifestylePreferencesQ.data?.identityVision,
  );

  const showFinishSetupCard =
    !isE2ETestMode() &&
    isConversationalOnboardingSkipped() &&
    !isConversationalOnboardingDone() &&
    !finishSetupDismissed;

  const profileIsStale = (() => {
    const completedAt = onboardingProfile?.completedAt;
    if (!completedAt) return false;
    const ts = new Date(completedAt).getTime();
    if (!Number.isFinite(ts)) return false;
    return Date.now() - ts > STALE_PROFILE_DAYS * DAY_MS;
  })();
  const showLifeRefreshCard =
    !isE2ETestMode() && !showFinishSetupCard && profileIsStale && !lifeRefreshDismissed;

  const handleDismissFinishSetup = () => {
    try {
      localStorage.setItem(LS_FINISH_SETUP_DISMISSED_PREFIX + todayDateKey(), "1");
    } catch {
      // Ignore storage errors
    }
    setFinishSetupDismissed(true);
  };

  const handleDismissLifeRefresh = () => {
    try {
      localStorage.setItem(LS_LIFE_REFRESH_DISMISSED_AT, String(Date.now()));
    } catch {
      // Ignore storage errors
    }
    setLifeRefreshDismissed(true);
  };

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
    setDismissedCards((prev) => new Set(Array.from(prev).concat(type)));
  };

  const updateNameMutation = useMutation({
    mutationFn: (firstName: string) => apiRequest("PATCH", "/api/users/me", { firstName }),
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

  const visibleProactiveCards = isE2ETestMode()
    ? []
    : summary.proactiveCards.filter((c) => !dismissedCards.has(c.type));

  const todayRows = [
    {
      id: "smart-import",
      label: "Smart Import",
      path: "/life-system-import",
      icon: Import,
      testId: "row-today-smart-import",
    },
    {
      id: "explore",
      label: summary.lastConversationTopic ? `Explore ${summary.lastConversationTopic}` : "Explore & Browse",
      path: "/browse",
      icon: Compass,
      testId: "row-today-explore",
    },
    {
      id: "insights",
      label: "Insights",
      path: "/insights",
      icon: Brain,
      testId: "row-today-insights",
    },
    {
      id: "progress",
      label: "My Progress",
      path: "/profile/progress",
      icon: TrendingUp,
      testId: "row-today-progress",
    },
  ] as const;

  const renderPriorityCard = (): ReactNode => {
    if (showOnboardingCard) {
      return (
        <button
          onClick={() => navigate("/voice-onboarding")}
          data-testid="card-start-first-session"
          className="w-full text-left rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/8 to-primary/15 px-4 py-3.5 flex items-center gap-3 hover:border-primary/60 transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
            <MessageCircle className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold leading-snug">Start your first session</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              A short life coaching conversation shapes your life system.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      );
    }

    if (showFinishSetupCard) {
      return (
        <div
          data-testid="card-finish-setup"
          className="w-full rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/8 to-primary/15 px-4 py-3.5 flex flex-col gap-2"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <Compass className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">Finish setting up your Life Blueprint</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                A short conversation with DW shapes your life system.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissFinishSetup}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Dismiss for today"
              data-testid="btn-dismiss-finish-setup"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2 pl-12 mt-1">
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => navigate("/voice-onboarding?resume=1")}
              data-testid="button-finish-setup"
            >
              Finish setup
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        </div>
      );
    }

    if (showLifeRefreshCard) {
      return (
        <div
          data-testid="card-life-refresh"
          className="w-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3.5 flex flex-col gap-2"
        >
          <div className="flex items-start gap-3">
            <div className="h-9 w-9 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <RefreshCw className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold leading-snug">Time for a life check-in?</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                It&apos;s been a while — keep DW in sync with what&apos;s changed.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDismissLifeRefresh}
              className="shrink-0 p-1 rounded hover:bg-muted text-muted-foreground"
              aria-label="Dismiss life check-in"
              data-testid="btn-dismiss-life-refresh"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="flex gap-2 pl-12 mt-1">
            <Button
              size="sm"
              className="h-7 text-xs px-3"
              onClick={() => navigate("/voice-onboarding?review=1")}
              data-testid="button-life-checkin-quick"
            >
              Quick update
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs px-3 text-muted-foreground"
              onClick={() => navigate("/voice-onboarding?refresh=1")}
              data-testid="button-life-checkin-refresh"
            >
              Full refresh
            </Button>
          </div>
        </div>
      );
    }

    if (nextPrompt) {
      return (
        <div
          data-testid="card-progressive-prompt"
          className="w-full rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10 px-4 py-3.5 flex flex-col gap-2"
        >
          <div className="flex items-start gap-2">
            <div className="h-7 w-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
            </div>
            <p className="text-sm font-medium leading-snug flex-1">{nextPrompt.prompt}</p>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed pl-9">{nextPrompt.context}</p>
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
      );
    }

    const proactiveCard = visibleProactiveCards[0];
    if (proactiveCard) {
      return (
        <ProactiveCard
          type={proactiveCard.type as ProactiveCardProps["type"]}
          title={proactiveCard.title}
          message={proactiveCard.message}
          why={proactiveCard.why}
          actionLabel={proactiveCard.actionLabel}
          onAction={proactiveCard.actionPath ? () => navigate(proactiveCard.actionPath!) : undefined}
          onDismiss={() => dismissCard(proactiveCard.type)}
          priority={proactiveCard.priority}
        />
      );
    }

    if (weekStats && weekStats.total > 0) {
      return (
        <button
          type="button"
          onClick={() => navigate("/life-system/pillar/emotional_regulation")}
          className="w-full text-left rounded-2xl border border-border bg-card px-4 py-3.5 flex items-center gap-3 hover:border-primary/40 transition-colors"
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
      );
    }

    if (isFeatureEnabled("DW_READING_CARD")) {
      return <DWReadingCard energyLevel={summary.energyLevel} />;
    }

    return <InsightSnapshotCard summary={summary} />;
  };

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
          <Skeleton className="h-24 w-full max-w-lg rounded-3xl mx-4" />
        </div>
        <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
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
                onChange={(e) => setNameInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveName();
                  if (e.key === "Escape") setEditingName(false);
                }}
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
          {directionLine && (
            <p className="text-[11px] text-muted-foreground italic leading-tight mt-1" data-testid="text-direction-line">
              {directionLine}
            </p>
          )}
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="w-full max-w-lg mx-auto px-4 pb-8 pt-3 space-y-4">
          <section className="w-full rounded-2xl border border-border bg-card px-4 py-3.5 flex flex-col" data-testid="card-now-schedule">
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
              {(["day", "week", "month"] as const).map((v) => (
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
          </section>

          <section data-testid="section-priority-card">
            {renderPriorityCard()}
          </section>

          <section className="w-full" data-testid="section-feeling-chips">
            <p className="text-[11px] text-muted-foreground/70 text-center mb-2">How are you feeling right now?</p>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              {(Object.keys(FEELING_CHIPS) as Array<keyof typeof FEELING_CHIPS>).map((label) => (
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
          </section>

          <section className="rounded-2xl border border-border bg-card" data-testid="section-today-actions">
            <div className="px-4 pt-3 pb-2 border-b border-border/60">
              <p className="text-sm font-semibold font-display">Today</p>
            </div>
            <div>
              {todayRows.map((row, index) => {
                const Icon = row.icon;
                return (
                  <button
                    key={row.id}
                    type="button"
                    onClick={() => navigate(row.path)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-muted/40 transition-colors"
                    data-testid={row.testId}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span className="text-sm text-foreground flex-1 truncate">{row.label}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                    {index < todayRows.length - 1 && <span className="sr-only" />}
                  </button>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
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
