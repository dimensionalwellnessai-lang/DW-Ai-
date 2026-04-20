import { useState, useMemo, useRef, useEffect } from "react";
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
import { isFeatureEnabled } from "@/config/featureFlags";
import { ThreeRingOrbit } from "@/components/life-system/three-ring-orbit";
import {
  useLifeSystem,
  findPillarRow,
  type LifeSystemPillarId,
} from "@/lib/life-system";
import { PILLARS_BY_LEVEL } from "@shared/lifeSystemTaxonomy";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "@/components/ui/carousel";
import {
  ChevronRight,
  Menu,
  Sparkles,
  Pencil,
  Check,
  X,
  LifeBuoy,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TriggerProtocolSheet } from "@/components/triggers/trigger-protocol-sheet";
import type { TriggerEventListResponse } from "@/lib/triggers";
import { ProjectsListSheet } from "@/components/life-system/projects-list-sheet";
import { useToast } from "@/hooks/use-toast";

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

export default function HomeCommandCenter() {
  usePageMeta(
    "Home",
    "Your Life System at a glance — Core, Expression, and Creation in one orbit.",
  );
  const summary = useHomeSummary();
  const lifeSystem = useLifeSystem();
  const [, navigate] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dismissedCards, setDismissedCards] = useState<Set<string>>(new Set());
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const nameInputRef = useRef<HTMLInputElement>(null);
  const { allFeaturesOpen, closeAllFeatures } = useNavigationStore();
  const [triggerOpen, setTriggerOpen] = useState(false);
  const [projectsSheetOpen, setProjectsSheetOpen] = useState(false);
  const { toast } = useToast();
  const triggersQ = useQuery<TriggerEventListResponse>({
    queryKey: ["/api/trigger-events"],
  });
  const weekStats = triggersQ.data?.week;

  const moodChipMutation = useMutation({
    mutationFn: (label: keyof typeof FEELING_CHIPS) =>
      apiRequest("POST", "/api/mood", FEELING_CHIPS[label]),
    onSuccess: (_data, label) => {
      queryClient.invalidateQueries({ queryKey: ["/api/mood"] });
      queryClient.invalidateQueries({ queryKey: ["/api/mood/today"] });
      toast({
        title: `Logged: ${label}`,
        description: "DW will use this to shape today's check-ins.",
      });
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

  const visibleProactiveCards = summary.proactiveCards.filter(c => !dismissedCards.has(c.type));

  // ── Build orbit data from the user's actual Life System ────────────────
  // Lit set = Core/Expression pillars the user has enabled. Falls back to
  // pillar `defaultOn` when the user has any pillars saved at all.
  const lifeData = lifeSystem.data;
  const { litPillars, orbitProjects, litProjects } = useMemo(() => {
    const lit = new Set<LifeSystemPillarId>();
    const allDefs = [
      ...PILLARS_BY_LEVEL.core,
      ...PILLARS_BY_LEVEL.expression,
      ...PILLARS_BY_LEVEL.creation,
    ];
    const isEmpty = (lifeData?.pillars ?? []).length === 0;
    for (const def of allDefs) {
      const row = findPillarRow(lifeData, def.id);
      const enabled = row ? row.enabled !== false : !isEmpty && def.defaultOn;
      if (enabled) lit.add(def.id);
    }
    const active = (lifeData?.projects ?? []).filter(p => p.status === "active");
    return {
      litPillars: lit,
      orbitProjects: active.map(p => ({ id: p.id, name: p.name })),
      litProjects: new Set(active.map(p => p.id)),
    };
  }, [lifeData]);

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
        {/* ── Quick "How are you feeling?" chip row ─────────────────────── */}
        <div className="px-4 pt-1 pb-2 max-w-lg mx-auto w-full" data-testid="section-feeling-chips">
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

        {/* ── Hero: the user's three-ring orbit ─────────────────────────── */}
        <div
          className="flex flex-col items-center justify-center px-4 pt-2 pb-4 shrink-0"
          data-testid="section-orbit-hero"
        >
          <div
            className="relative flex items-center justify-center w-full max-w-[360px] mx-auto aspect-square"
            style={{ maxHeight: "min(360px, 52vh)" }}
          >
            {/* Atmospheric background glow */}
            <div className="absolute rounded-full bg-primary/5 blur-3xl" style={{ width: "80%", height: "80%" }} aria-hidden="true" />
            <div className="absolute rounded-full bg-primary/10 blur-2xl" style={{ width: "40%", height: "40%" }} aria-hidden="true" />

            <ThreeRingOrbit
              litPillars={litPillars}
              projects={orbitProjects}
              litProjects={litProjects}
              size={340}
              className="relative z-10"
              collapseProjects
              onPillarClick={(id) => navigate(`/life-system/pillar/${id}`)}
              onProjectsClick={() => setProjectsSheetOpen(true)}
              onCenterClick={() => navigate("/life-system/document")}
            />
          </div>
        </div>

        {/* ── Existing command-center widgets, unchanged ────────────────── */}
        <div className="shrink-0 px-4 pb-4 pt-0 w-full max-w-lg mx-auto" data-testid="section-cards">
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
            </CarouselContent>
          </Carousel>
        </div>
      </div>

      <HamburgerMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
      <AllFeaturesView open={allFeaturesOpen} onClose={closeAllFeatures} />
      <TriggerProtocolSheet open={triggerOpen} onOpenChange={setTriggerOpen} />
      <ProjectsListSheet open={projectsSheetOpen} onOpenChange={setProjectsSheetOpen} />
    </div>
  );
}
