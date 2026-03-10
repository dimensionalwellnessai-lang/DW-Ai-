/**
 * HomeFocusSheet – bottom sheet with a swipeable module carousel.
 *
 * Opens from the Module Icon Dock on the Home screen.
 * Supports three snap states: collapsed (handle only), half, full.
 * A horizontal Embla carousel lets the user swipe between modules.
 *
 * Swiping the carousel updates the active dock icon via onModuleChange.
 */

import { useState, useCallback, useEffect, useRef } from "react";
import useEmblaCarousel from "embla-carousel-react";
import { useLocation } from "wouter";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { MODULES, type ModuleId } from "./HomeModuleDock";
import type { HomeSummary } from "./types";
import { MOCK_HOME_DATA } from "./homeData";

// ── Snap heights ─────────────────────────────────────────────────────────────
// "collapsed": only the handle bar is visible
// "half": ~50 vh
// "full": ~90 vh

type SnapState = "collapsed" | "half" | "full";

const SNAP_HEIGHTS: Record<SnapState, string> = {
  collapsed: "h-10",
  half: "h-[52vh]",
  full: "h-[88vh]",
};

// ── Module card renderers ────────────────────────────────────────────────────

interface ModuleCardProps {
  summary: HomeSummary;
  navigate: (path: string) => void;
}

function InsightView({ summary, navigate }: ModuleCardProps) {
  const insight = summary.latestInsight;
  const mockInsight = MOCK_HOME_DATA.insight;

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", insight
      ? `Let's explore this insight: "${insight.title}"`
      : "What insights have you captured from our conversations so far?");
    params.set("src", "home_dock_insight");
    params.set("context", "insight");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {insight ? insight.category : mockInsight.tag}
      </p>
      <p className="text-sm leading-relaxed text-foreground/80 line-clamp-3 italic">
        "{insight ? insight.title : mockInsight.text}"
      </p>
      {insight?.summary && (
        <p className="text-xs text-muted-foreground line-clamp-2">{insight.summary}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate("/insights")}
          className="flex-1 text-center rounded-lg bg-primary/10 text-primary text-xs font-medium px-3 py-2 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Open Insights
        </button>
        <button
          type="button"
          onClick={handleChatWithDW}
          className="flex-1 text-center rounded-lg bg-muted/60 text-foreground/70 text-xs font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Chat with DW
        </button>
      </div>
    </div>
  );
}

function PlanView({ summary, navigate }: ModuleCardProps) {
  const goal = summary.activeGoals[0] ?? null;
  const mockPlan = MOCK_HOME_DATA.plan;

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", goal
      ? `Help me with my plan: "${goal.title}"`
      : "Help me define or refine a plan I'm working toward");
    params.set("src", "home_dock_plan");
    params.set("context", "plan");
    navigate(`/talk?${params.toString()}`);
  }

  const title = goal?.title ?? mockPlan.title;
  const progress = goal?.progress ?? mockPlan.progress;
  const nextStep = mockPlan.nextStep;

  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold line-clamp-1">{title}</p>
      {typeof progress === "number" && (
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-muted overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-500 transition-all"
              style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
            />
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground line-clamp-1">Next: {nextStep}</p>
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate("/goals")}
          className="flex-1 text-center rounded-lg bg-amber-500/10 text-amber-700 dark:text-amber-400 text-xs font-medium px-3 py-2 hover:bg-amber-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
        >
          Open Plan
        </button>
        <button
          type="button"
          onClick={handleChatWithDW}
          className="flex-1 text-center rounded-lg bg-muted/60 text-foreground/70 text-xs font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Chat with DW
        </button>
      </div>
    </div>
  );
}

function HealthView({ summary, navigate }: ModuleCardProps) {
  const habits = summary.activeHabits.slice(0, 2);
  const mockHealth = MOCK_HOME_DATA.health;

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", "Let's talk about building healthy habits that fit my lifestyle");
    params.set("src", "home_dock_health");
    params.set("context", "health");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      {habits.length > 0 ? (
        <div className="space-y-1.5">
          {habits.map((h) => (
            <div key={h.id} className="flex items-center justify-between">
              <p className="text-sm text-foreground/80 line-clamp-1">{h.title}</p>
              {typeof h.streak === "number" && h.streak > 0 && (
                <span className="text-[10px] text-amber-500 font-semibold flex-shrink-0 ml-2">
                  {h.streak}🔥
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          <p className="text-sm text-foreground/80">Calories remaining: {mockHealth.caloriesRemaining}</p>
          <p className="text-xs text-muted-foreground">{mockHealth.proteinStatus}</p>
        </div>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate("/habits")}
          className="flex-1 text-center rounded-lg bg-green-500/10 text-green-700 dark:text-green-400 text-xs font-medium px-3 py-2 hover:bg-green-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
        >
          Open Health
        </button>
        <button
          type="button"
          onClick={handleChatWithDW}
          className="flex-1 text-center rounded-lg bg-muted/60 text-foreground/70 text-xs font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Chat with DW
        </button>
      </div>
    </div>
  );
}

function MomentumView({ summary, navigate }: ModuleCardProps) {
  const mockMomentum = MOCK_HOME_DATA.momentum;
  const topStreak = summary.activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
  const streakLabel = topStreak > 0
    ? `Streak: ${topStreak} day${topStreak !== 1 ? "s" : ""}`
    : mockMomentum.streakLabel;

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", "I want to talk about my momentum and what's driving (or blocking) my progress");
    params.set("src", "home_dock_momentum");
    params.set("context", "momentum");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground/80">{streakLabel}</p>
      {mockMomentum.brokenNote && (
        <p className="text-xs text-muted-foreground">{mockMomentum.brokenNote}</p>
      )}
      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={() => navigate("/habits")}
          className="flex-1 text-center rounded-lg bg-purple-500/10 text-purple-700 dark:text-purple-400 text-xs font-medium px-3 py-2 hover:bg-purple-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-500"
        >
          Open Tracker
        </button>
        <button
          type="button"
          onClick={handleChatWithDW}
          className="flex-1 text-center rounded-lg bg-muted/60 text-foreground/70 text-xs font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Chat with DW
        </button>
      </div>
    </div>
  );
}

function FollowUpView({ summary, navigate }: ModuleCardProps) {
  const followUp = summary.activeFollowUp;
  const mockFollowUp = MOCK_HOME_DATA.followUp;

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", followUp?.prompt ?? mockFollowUp.prompt);
    params.set("src", "home_dock_followup");
    params.set("context", "followup");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">
        Last topic: {followUp ? "DW Follow-up" : mockFollowUp.lastTopic}
      </p>
      <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
        {followUp?.prompt ?? mockFollowUp.prompt}
      </p>
      <div className="pt-1">
        <button
          type="button"
          onClick={handleChatWithDW}
          className="w-full text-center rounded-lg bg-pink-500/10 text-pink-700 dark:text-pink-400 text-xs font-medium px-3 py-2 hover:bg-pink-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-500"
        >
          Continue Chat
        </button>
      </div>
    </div>
  );
}

// ── Module index map ──────────────────────────────────────────────────────────

const MODULE_INDEX: Record<ModuleId, number> = {
  insight: 0,
  plan: 1,
  health: 2,
  momentum: 3,
  followup: 4,
};

// ── HomeFocusSheet ────────────────────────────────────────────────────────────

interface HomeFocusSheetProps {
  /** Which module is currently selected (null = sheet collapsed) */
  activeModule: ModuleId | null;
  /** Summary data from useHomeSummary */
  summary: HomeSummary;
  /** Called when the user swipes to a different module */
  onModuleChange: (id: ModuleId) => void;
  /** Called when the sheet should close */
  onClose: () => void;
}

export function HomeFocusSheet({ activeModule, summary, onModuleChange, onClose }: HomeFocusSheetProps) {
  const [, navigate] = useLocation();
  const [snapState, setSnapState] = useState<SnapState>("collapsed");
  const prevActiveModule = useRef<ModuleId | null>(null);

  const [emblaRef, emblaApi] = useEmblaCarousel({
    loop: false,
    // startIndex sets the initial slide on mount only.
    // Dynamic updates when activeModule changes are handled by the scrollTo useEffect below.
    startIndex: activeModule ? MODULE_INDEX[activeModule] : 0,
    watchDrag: true,
    align: "start",
  });

  // Open to "half" when a module is selected; collapse when deselected
  useEffect(() => {
    if (activeModule && !prevActiveModule.current) {
      setSnapState("half");
    } else if (!activeModule) {
      setSnapState("collapsed");
    }
    prevActiveModule.current = activeModule;
  }, [activeModule]);

  // Scroll embla to the correct slide when activeModule changes externally (dock tap)
  useEffect(() => {
    if (!emblaApi || activeModule === null) return;
    const targetIndex = MODULE_INDEX[activeModule];
    if (emblaApi.selectedScrollSnap() !== targetIndex) {
      // Pass `false` as the second argument to skip animation (instant snap on dock tap)
      emblaApi.scrollTo(targetIndex, false);
    }
  }, [emblaApi, activeModule]);

  // Sync dock icon when user swipes the carousel
  const onCarouselSelect = useCallback(() => {
    if (!emblaApi) return;
    const idx = emblaApi.selectedScrollSnap();
    const mod = MODULES[idx];
    if (mod) onModuleChange(mod.id);
  }, [emblaApi, onModuleChange]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", onCarouselSelect);
    emblaApi.on("reInit", onCarouselSelect);
    return () => {
      emblaApi.off("select", onCarouselSelect);
      emblaApi.off("reInit", onCarouselSelect);
    };
  }, [emblaApi, onCarouselSelect]);

  const isOpen = activeModule !== null;
  const activeMeta = activeModule ? MODULES.find((m) => m.id === activeModule) : null;
  const ActiveIcon = activeMeta?.icon;

  function cycleSnap() {
    setSnapState((s) => {
      if (s === "collapsed") return "half";
      if (s === "half") return "full";
      return "half";
    });
  }

  function handleClose() {
    setSnapState("collapsed");
    onClose();
  }

  const MODULE_VIEWS: Record<ModuleId, React.ReactNode> = {
    insight: <InsightView summary={summary} navigate={navigate} />,
    plan: <PlanView summary={summary} navigate={navigate} />,
    health: <HealthView summary={summary} navigate={navigate} />,
    momentum: <MomentumView summary={summary} navigate={navigate} />,
    followup: <FollowUpView summary={summary} navigate={navigate} />,
  };

  return (
    <div
      className={cn(
        "fixed bottom-0 inset-x-0 z-40 flex flex-col",
        "bg-card border-t border-border/60 rounded-t-2xl shadow-2xl",
        "transition-[height] duration-300 ease-in-out",
        isOpen ? SNAP_HEIGHTS[snapState] : SNAP_HEIGHTS["collapsed"],
      )}
      role="dialog"
      aria-modal="false"
      aria-label={activeModule ? `${activeMeta?.label} focus panel` : "Module focus panel"}
    >
      {/* Handle bar */}
      <div className="flex items-center justify-between px-4 pt-2 pb-1 flex-shrink-0">
        <button
          type="button"
          onClick={cycleSnap}
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded px-1"
          aria-label={snapState === "full" ? "Collapse panel" : "Expand panel"}
        >
          <div className="w-8 h-1 rounded-full bg-muted-foreground/30 mx-auto" aria-hidden="true" />
          {snapState === "full"
            ? <ChevronDown className="h-3.5 w-3.5 ml-2" aria-hidden="true" />
            : <ChevronUp className="h-3.5 w-3.5 ml-2" aria-hidden="true" />
          }
        </button>

        {isOpen && activeMeta && ActiveIcon && (
          <div className={cn("flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide", activeMeta.colorClass)}>
            <ActiveIcon className="h-3.5 w-3.5" aria-hidden="true" />
            {activeMeta.label}
          </div>
        )}

        <button
          type="button"
          onClick={handleClose}
          aria-label="Close focus panel"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary text-muted-foreground"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Carousel content – only rendered when open */}
      {isOpen && snapState !== "collapsed" && (
        <div
          ref={emblaRef}
          className="flex-1 overflow-hidden"
          role="region"
          aria-roledescription="carousel"
          aria-label="Module views — swipe to navigate"
        >
          <div className="flex h-full">
            {MODULES.map((mod, idx) => (
              <div
                key={mod.id}
                className="flex-[0_0_100%] min-w-0 px-4 py-3 overflow-y-auto"
                role="group"
                aria-roledescription="slide"
                aria-label={`${mod.label} (${idx + 1} of ${MODULES.length})`}
              >
                {MODULE_VIEWS[mod.id]}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Dot indicators */}
      {isOpen && snapState !== "collapsed" && (
        <div className="flex items-center justify-center gap-1.5 pb-3 flex-shrink-0" aria-hidden="true">
          {MODULES.map((mod) => (
            <span
              key={mod.id}
              className={cn(
                "h-1.5 rounded-full transition-all",
                activeModule === mod.id ? "w-3 bg-foreground" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
}
