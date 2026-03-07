import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
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
  ChevronRight,
  Zap,
  Brain,
  Clock,
  Compass,
  Wallet,
  Users,
  Home,
  Sprout,
  MessageCircle,
  Palette,
  Pin,
  PinOff,
  Trash2,
  Pencil,
  ThumbsDown,
  Check,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getInsights,
  pinInsight,
  unpinInsight,
  deleteInsight,
  updateInsight,
  recordNotHelpful,
  getInsightFrequency,
  setInsightFrequency,
  type Insight,
  type InsightFrequency,
} from "@/core/conversationInsights";
import { isFeatureEnabled } from "@/config/featureFlags";

// ─── Life dimension definitions ──────────────────────────────────────────────

const DIMENSIONS = [
  { id: "body",          label: "Body",          icon: Zap,     color: "text-red-400",     bg: "bg-red-500/10"     },
  { id: "mind",          label: "Mind",          icon: Brain,   color: "text-purple-400",  bg: "bg-purple-500/10"  },
  { id: "time",          label: "Time",          icon: Clock,   color: "text-blue-400",    bg: "bg-blue-500/10"    },
  { id: "purpose",       label: "Purpose",       icon: Compass, color: "text-amber-400",   bg: "bg-amber-500/10"   },
  { id: "money",         label: "Money",         icon: Wallet,  color: "text-green-400",   bg: "bg-green-500/10"   },
  { id: "relationships", label: "Relationships", icon: Users,   color: "text-pink-400",    bg: "bg-pink-500/10"    },
  { id: "environment",   label: "Environment",   icon: Home,    color: "text-cyan-400",    bg: "bg-cyan-500/10"    },
  { id: "identity",      label: "Identity",      icon: Sprout,  color: "text-emerald-400", bg: "bg-emerald-500/10" },
];

// ─── Vibe / background presets ───────────────────────────────────────────────

const VIBE_PRESETS = [
  { id: "dawn",     label: "Dawn",     gradient: "linear-gradient(135deg,#fda085 0%,#f6d365 100%)"             },
  { id: "cosmic",   label: "Cosmic",   gradient: "linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)" },
  { id: "forest",   label: "Forest",   gradient: "linear-gradient(135deg,#11998e 0%,#38ef7d 100%)"             },
  { id: "ocean",    label: "Ocean",    gradient: "linear-gradient(135deg,#2193b0 0%,#6dd5ed 100%)"             },
  { id: "golden",   label: "Golden",   gradient: "linear-gradient(135deg,#f7971e 0%,#ffd200 100%)"             },
  { id: "midnight", label: "Midnight", gradient: "linear-gradient(135deg,#232526 0%,#414345 100%)"             },
];

// ─── Orbit shortcut destinations ─────────────────────────────────────────────

const ORBIT_SHORTCUTS = [
  { label: "Calendar",  icon: Calendar,  href: "/calendar",       color: "text-blue-500",   bg: "bg-blue-500/10"   },
  { label: "Cosmic",    icon: Star,      href: "/cosmic",         color: "text-purple-500", bg: "bg-purple-500/10" },
  { label: "Blueprint", icon: BookOpen,  href: "/life-blueprint", color: "text-amber-500",  bg: "bg-amber-500/10"  },
  { label: "Workout",   icon: Dumbbell,  href: "/workout",        color: "text-red-500",    bg: "bg-red-500/10"    },
  { label: "Meals",     icon: Utensils,  href: "/meal-prep",      color: "text-orange-500", bg: "bg-orange-500/10" },
  { label: "Routines",  icon: RefreshCw, href: "/routines",       color: "text-green-500",  bg: "bg-green-500/10"  },
];

// Scores used in the Life Balance meter (blueprint-based approximation only).
// Filled dimensions get a 75% baseline; unfilled get 15% to show they're not empty but incomplete.
// Enhancement note: these scores are intentionally limited to Blueprint data for now and are planned
// to be extended with per-dimension goals and habits data in a future iteration (tracked in product planning).
const BALANCE_SCORE_FILLED = 75;
const BALANCE_SCORE_EMPTY = 15;

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

// ─── DwInsightCard ────────────────────────────────────────────────────────────

interface DwInsightCardProps {
  insight: Insight;
  onNavigate: () => void;
  onJumpToMoment?: () => void;
  onPin: () => void;
  onDelete: () => void;
  onEdit: () => void;
  onNotHelpful: () => void;
}

function DwInsightCard({ insight, onNavigate, onJumpToMoment, onPin, onDelete, onEdit, onNotHelpful }: DwInsightCardProps) {
  return (
    <div className="flex-shrink-0 w-52 snap-start relative group">
      <button
        onClick={() => {
          try {
            if (typeof window !== "undefined" && window.sessionStorage) {
              window.sessionStorage.setItem(`dwInsight:${insight.id}`, JSON.stringify(insight));
            }
          } catch {
            // sessionStorage unavailable – fail silently
          }
          onNavigate();
        }}
        aria-label={`DW insight: ${insight.title}`}
        className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
      >
        <Card className={cn("h-full border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors", insight.pinned && "border-amber-400/40 bg-amber-50/5")}>
          <CardContent className="p-3 space-y-1.5">
            <div className="flex items-center gap-1.5">
              <div className="p-1 rounded bg-primary/10">
                <MessageCircle className="h-3.5 w-3.5 text-primary" />
              </div>
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground truncate">{insight.category}</span>
              {insight.pinned && <Pin className="h-3 w-3 text-amber-500 ml-auto flex-shrink-0" />}
            </div>
            <p className="text-xs font-medium leading-snug line-clamp-2">{insight.title}</p>
            <p className="text-xs leading-relaxed line-clamp-2 text-muted-foreground">{insight.summary}</p>
            <div className="flex items-center justify-between mt-1">
              <p className="text-[10px] font-semibold text-primary">Continue with DW →</p>
            </div>
          </CardContent>
        </Card>
      </button>
      {insight.source?.messageIndex !== undefined && onJumpToMoment && (
        <button
          type="button"
          onClick={onJumpToMoment}
          aria-label="Jump to conversation moment"
          className="mt-1 text-[10px] font-semibold text-muted-foreground hover:text-primary underline underline-offset-2 focus:outline-none focus-visible:ring-1 focus-visible:ring-primary rounded"
        >
          Jump to moment
        </button>
      )}
      {/* Action buttons – visible on hover/focus-within */}
      <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
        <button
          onClick={(e) => { e.stopPropagation(); onEdit(); }}
          aria-label="Edit insight"
          className="p-1 rounded bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          <Pencil className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onPin(); }}
          aria-label={insight.pinned ? "Unpin insight" : "Pin insight"}
          className="p-1 rounded bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        >
          {insight.pinned ? <PinOff className="h-3 w-3 text-amber-500" /> : <Pin className="h-3 w-3 text-muted-foreground" />}
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onNotHelpful(); }}
          aria-label="Mark insight as not helpful"
          className="p-1 rounded bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
          title="Not helpful"
        >
          <ThumbsDown className="h-3 w-3 text-muted-foreground" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          aria-label="Delete insight"
          className="p-1 rounded bg-background/80 backdrop-blur-sm border border-border/50 hover:bg-destructive/10 hover:text-destructive transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-destructive"
        >
          <Trash2 className="h-3 w-3 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
}

// ─── Page component ───────────────────────────────────────────────────────────

export default function LifeCommandCenter() {
  const [, navigate] = useLocation();
  const insightsScrollRef = useRef<HTMLDivElement>(null);

  // Builds the onJumpToMoment handler for a DwInsightCard – navigates to /talk
  // with query params so the page can scroll to the originating message.
  const makeJumpToMomentHandler = useCallback(
    (insight: Insight): (() => void) | undefined => {
      if (insight.source?.messageIndex === undefined) return undefined;
      return () => {
        const params = new URLSearchParams();
        params.set("jumpToMessageIndex", String(insight.source.messageIndex!));
        if (insight.source.conversationId) params.set("conversationId", insight.source.conversationId);
        navigate(`/talk?${params.toString()}`);
      };
    },
    [navigate]
  );

  // ── Vibe state ──────────────────────────────────────────────────────────────
  const [vibeId, setVibeId] = useState<string>(() => localStorage.getItem("dw_home_vibe") || "dawn");
  const [showVibePicker, setShowVibePicker] = useState(false);
  const vibePickerRef = useRef<HTMLDivElement>(null);
  const selectedVibe = VIBE_PRESETS.find((v) => v.id === vibeId) ?? VIBE_PRESETS[0];

  // Close vibe picker when clicking outside of it
  useEffect(() => {
    if (!showVibePicker) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (vibePickerRef.current && !vibePickerRef.current.contains(e.target as Node)) {
        setShowVibePicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showVibePicker]);

  const handleVibeSelect = (id: string) => {
    setVibeId(id);
    localStorage.setItem("dw_home_vibe", id);
    setShowVibePicker(false);
  };

  // ── Energy check-in state ───────────────────────────────────────────────────
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

  const handleEnergyCheckin = (level: "low" | "medium" | "high") => {
    setEnergyLevel(level);
    localStorage.setItem("dw_energy_checkin", JSON.stringify({ date: new Date().toDateString(), level }));
  };

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

  const activeGoals = goals.filter((g: any) => g.isActive !== false);
  const activeHabits = habits.filter((h: any) => h.isActive !== false);

  const filledDimensionIds = new Set(
    blueprints.filter((b: any) => b.dimension && (b.vision || b.values?.length)).map((b: any) => b.dimension)
  );
  const completedDimensions = DIMENSIONS.filter((d) => filledDimensionIds.has(d.id));
  const incompleteDimensions = DIMENSIONS.filter((d) => !filledDimensionIds.has(d.id));

  // Quick suggestion
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

  const hasBirthData = !!localStorage.getItem("dw_birth_chart");
  const dailyInsight = getDailyInsight();

  // Today events (up to 3)
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
      return (a.startTime ? new Date(a.startTime).getTime() : 0) - (b.startTime ? new Date(b.startTime).getTime() : 0);
    })
    .slice(0, 3);

  // Insights carousel items (mixed life / body / mind / money / cosmic)
  const insightItems = [
    { id: "life",   label: "Life",   icon: Sparkles, color: "text-purple-500", bg: "bg-purple-500/10", text: dailyInsight,                                                                                                          href: "/cosmic"   },
    { id: "body",   label: "Body",   icon: Zap,      color: "text-red-500",    bg: "bg-red-500/10",    text: "Movement is medicine. Even 10 minutes counts today.",                                                                   href: "/workout"  },
    { id: "mind",   label: "Mind",   icon: Brain,    color: "text-blue-500",   bg: "bg-blue-500/10",   text: "Clarity arrives after rest. What's taking up space in your mind?",                                                     href: "/journal"  },
    { id: "money",  label: "Money",  icon: Wallet,   color: "text-green-500",  bg: "bg-green-500/10",  text: "Small consistent actions compound. Review one financial habit.",                                                        href: "/finances" },
    { id: "cosmic", label: "Cosmic", icon: Star,     color: "text-amber-500",  bg: "bg-amber-500/10",  text: hasBirthData ? "Your chart holds subtle clues for today." : "Set up your cosmic profile for personalized guidance.",    href: "/cosmic"   },
  ];

  // DW-generated insight cards (feature-flagged)
  const [dwInsightsRaw, setDwInsightsRaw] = useState<Insight[]>(() =>
    isFeatureEnabled("CONVERSATION_INSIGHTS") ? getInsights() : []
  );
  const [insightFrequency, setInsightFrequencyState] = useState<InsightFrequency>(() => getInsightFrequency());

  // ── Edit insight modal state ─────────────────────────────────────────────
  const [editingInsight, setEditingInsight] = useState<Insight | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editSummary, setEditSummary] = useState("");

  const TITLE_MAX = 80;
  const SUMMARY_MAX = 300;

  const refreshInsights = useCallback(() => {
    if (isFeatureEnabled("CONVERSATION_INSIGHTS")) {
      setDwInsightsRaw(getInsights());
    }
  }, []);

  const openEditModal = useCallback((insight: Insight) => {
    setEditingInsight(insight);
    setEditTitle(insight.title);
    setEditSummary(insight.summary);
  }, []);

  const closeEditModal = useCallback(() => {
    setEditingInsight(null);
    setEditTitle("");
    setEditSummary("");
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editingInsight) return;
    const trimmedTitle = editTitle.trim().slice(0, TITLE_MAX);
    const trimmedSummary = editSummary.trim().slice(0, SUMMARY_MAX);
    if (!trimmedTitle) return; // require non-empty title
    updateInsight(editingInsight.id, { title: trimmedTitle, summary: trimmedSummary });
    refreshInsights();
    closeEditModal();
  }, [editingInsight, editTitle, editSummary, refreshInsights, closeEditModal]);

  const handlePinInsight = useCallback((id: string, currentlyPinned: boolean) => {
    if (currentlyPinned) unpinInsight(id); else pinInsight(id);
    refreshInsights();
  }, [refreshInsights]);

  const handleDeleteInsight = useCallback((id: string) => {
    deleteInsight(id);
    refreshInsights();
  }, [refreshInsights]);

  const handleNotHelpful = useCallback((insight: Insight) => {
    recordNotHelpful(insight);
    refreshInsights();
  }, [refreshInsights]);

  const handleFrequencyChange = useCallback((freq: InsightFrequency) => {
    setInsightFrequency(freq);
    setInsightFrequencyState(freq);
  }, []);

  const pinnedInsights = dwInsightsRaw
    .filter((i) => i.pinned)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0));
  const recentInsights = dwInsightsRaw
    .filter((i) => !i.pinned)
    .slice(0, 5);

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Home" showBack={false} />

      {/* ── Edit Insight Modal ─────────────────────────────────────────── */}
      {editingInsight && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Edit insight"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
          onClick={(e) => { if (e.target === e.currentTarget) closeEditModal(); }}
        >
          <div className="w-full max-w-sm bg-background border border-border rounded-xl shadow-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Edit insight</h2>
              <button
                onClick={closeEditModal}
                aria-label="Close edit modal"
                className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-insight-title" className="text-xs font-medium text-muted-foreground">
                Title <span className="text-[10px]">({editTitle.length}/{TITLE_MAX})</span>
              </label>
              <input
                id="edit-insight-title"
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value.slice(0, TITLE_MAX))}
                maxLength={TITLE_MAX}
                className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="edit-insight-summary" className="text-xs font-medium text-muted-foreground">
                Summary <span className="text-[10px]">({editSummary.length}/{SUMMARY_MAX})</span>
              </label>
              <textarea
                id="edit-insight-summary"
                value={editSummary}
                onChange={(e) => setEditSummary(e.target.value.slice(0, SUMMARY_MAX))}
                maxLength={SUMMARY_MAX}
                rows={3}
                className="w-full text-sm bg-muted/40 border border-border rounded-lg px-3 py-2 resize-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={closeEditModal}
                className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-muted transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={!editTitle.trim()}
                className="flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Check className="h-3 w-3" />
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-auto">

        {/* ── Avatar Zone ───────────────────────────────────────────────── */}
        <div className="relative" style={{ background: selectedVibe.gradient }}>
          {/* Vibe picker toggle */}
          <button
            onClick={() => setShowVibePicker((v) => !v)}
            aria-label="Change background vibe"
            className="absolute top-3 right-3 p-1.5 rounded-full bg-black/20 hover:bg-black/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
          >
            <Palette className="h-4 w-4 text-white" />
          </button>

          {/* Vibe picker popover */}
          {showVibePicker && (
            <div ref={vibePickerRef} className="absolute top-11 right-3 z-10 bg-background/95 backdrop-blur border border-border rounded-xl p-3 shadow-lg">
              <p className="text-xs font-semibold text-muted-foreground mb-2">Choose vibe</p>
              <div className="grid grid-cols-3 gap-2">
                {VIBE_PRESETS.map((vibe) => (
                  <button
                    key={vibe.id}
                    onClick={() => handleVibeSelect(vibe.id)}
                    aria-label={`Set vibe to ${vibe.label}`}
                    className={cn(
                      "flex flex-col items-center gap-1 p-2 rounded-lg border-2 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                      vibeId === vibe.id ? "border-primary" : "border-transparent hover:border-border"
                    )}
                  >
                    <div className="w-8 h-8 rounded-full" style={{ background: vibe.gradient }} />
                    <span className="text-[10px] text-muted-foreground">{vibe.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Centered avatar + greeting */}
          <div className="flex flex-col items-center pt-8 pb-6 px-4">
            {/* DW Avatar */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="w-20 h-20 rounded-full bg-white/25 backdrop-blur-sm flex items-center justify-center shadow-lg ring-2 ring-white/40"
            >
              <Sparkles className="h-8 w-8 text-white" />
            </motion.div>

            {/* Greeting bubble — anchored to avatar */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-3 px-4 py-1.5 bg-black/25 backdrop-blur-sm rounded-full"
            >
              <p className="text-white font-bold text-base">
                {getTimeBasedGreeting(user?.firstName || user?.systemName)}
              </p>
            </motion.div>

            {/* Date */}
            <p className="text-white/75 text-xs mt-1">{todayDate}</p>

            {/* Suggested focus — short attached line */}
            <motion.button
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25 }}
              onClick={quickSuggestion.action}
              aria-label={`Suggested focus: ${quickSuggestion.text}`}
              className="mt-3 max-w-xs text-center text-sm text-white/90 font-medium leading-snug focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
            >
              <span className="opacity-60">✦ </span>{quickSuggestion.text}
            </motion.button>

            {/* Energy check-in */}
            <div className="mt-4 w-full max-w-xs">
              {!energyLevel ? (
                <div>
                  <p className="text-xs text-white/75 text-center mb-2">
                    {getTimeOfDay() === "morning" ? "How's your energy?" : getTimeOfDay() === "afternoon" ? "Energy right now?" : "Energy today?"}
                  </p>
                  <div className="flex gap-2">
                    {(["low", "medium", "high"] as const).map((level) => (
                      <button
                        key={level}
                        onClick={() => handleEnergyCheckin(level)}
                        aria-label={`Mark energy as ${level}`}
                        className="flex-1 py-1 text-xs rounded-full bg-white/20 hover:bg-white/30 text-white transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
                      >
                        {level === "low" ? "🌙 Low" : level === "medium" ? "⚡ Med" : "🔥 High"}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2">
                  <span className="text-xs text-white/80">
                    Energy: <span className="font-semibold text-white">
                      {energyLevel === "low" ? "🌙 Low" : energyLevel === "medium" ? "⚡ Medium" : "🔥 High"}
                    </span>
                  </span>
                  <button
                    onClick={() => { setEnergyLevel(null); localStorage.removeItem("dw_energy_checkin"); }}
                    aria-label="Change energy check-in"
                    className="text-xs text-white/60 hover:text-white transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-white rounded"
                  >
                    change
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Orbit shortcuts ───────────────────────────────────────────── */}
        <motion.nav
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          aria-label="Quick navigation"
          className="grid grid-cols-6 gap-1 px-3 py-3 bg-background border-b border-border/50"
        >
          {ORBIT_SHORTCUTS.map(({ label, icon: Icon, href, color, bg }) => (
            <button
              key={label}
              onClick={() => navigate(href)}
              aria-label={`Go to ${label}`}
              className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl hover:bg-muted transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className={cn("p-2 rounded-lg", bg)}>
                <Icon className={cn("h-4 w-4", color)} />
              </div>
              <span className="text-[9px] font-medium text-muted-foreground leading-none">{label}</span>
            </button>
          ))}
        </motion.nav>

        {/* ── Compact content cards ─────────────────────────────────────── */}
        <div className="container max-w-2xl mx-auto px-4 py-4 space-y-3 pb-8">

          {/* ── Today card ────────────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
            <button
              onClick={() => navigate("/calendar")}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              aria-label="Open calendar"
            >
              <Card className="hover:border-blue-400/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-semibold">Today</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  {eventsLoading ? (
                    <div className="space-y-1.5">
                      <Skeleton className="h-7 w-full" />
                      <Skeleton className="h-7 w-3/4" />
                    </div>
                  ) : todayEvents.length === 0 ? (
                    <p className="text-sm text-muted-foreground">Today is wide open. ✨</p>
                  ) : (
                    <div className="space-y-1">
                      {todayEvents.map((event: any) => (
                        <div key={event.id} className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground min-w-[44px]">
                            {event.startTime
                              ? new Date(event.startTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
                              : "All day"}
                          </span>
                          <span className="text-sm font-medium truncate">{event.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* ── Insights carousel ─────────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-1.5">
                <Star className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-semibold">Insights</span>
              </div>
              {isFeatureEnabled("CONVERSATION_INSIGHTS") && (
                <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span>Capture:</span>
                  <button
                    onClick={() => handleFrequencyChange("rare")}
                    aria-label="Set capture frequency to rare"
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                      insightFrequency === "rare" ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted"
                    )}
                  >
                    Rare
                  </button>
                  <button
                    onClick={() => handleFrequencyChange("normal")}
                    aria-label="Set capture frequency to normal"
                    className={cn(
                      "px-1.5 py-0.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-primary",
                      insightFrequency === "normal" ? "bg-primary/15 text-primary font-semibold" : "hover:bg-muted"
                    )}
                  >
                    Normal
                  </button>
                </div>
              )}
            </div>
            <div
              ref={insightsScrollRef}
              className="flex gap-3 overflow-x-auto pb-1 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
              aria-label="Insights carousel"
            >
              {/* Pinned DW insights group */}
              {pinnedInsights.length > 0 && (
                <>
                  <div className="flex-shrink-0 flex items-center self-center">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-amber-500 whitespace-nowrap">
                      <Pin className="h-3 w-3" aria-hidden />
                      Pinned
                    </span>
                  </div>
                  {pinnedInsights.map((insight) => (
                    <DwInsightCard
                      key={insight.id}
                      insight={insight}
                      onNavigate={() => navigate(`/talk?insightId=${encodeURIComponent(insight.id)}`)}
                      onJumpToMoment={makeJumpToMomentHandler(insight)}
                      onPin={() => handlePinInsight(insight.id, true)}
                      onDelete={() => handleDeleteInsight(insight.id)}
                      onEdit={() => openEditModal(insight)}
                      onNotHelpful={() => handleNotHelpful(insight)}
                    />
                  ))}
                  <div className="flex-shrink-0 w-px self-stretch bg-border/50 mx-1" aria-hidden />
                </>
              )}

              {/* Static insight tiles */}
              {insightItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  aria-label={`${item.label} insight`}
                  className="flex-shrink-0 w-52 snap-start text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
                >
                  <Card className="h-full hover:border-primary/30 transition-colors">
                    <CardContent className="p-3 space-y-1.5">
                      <div className="flex items-center gap-1.5">
                        <div className={cn("p-1 rounded", item.bg)}>
                          <item.icon className={cn("h-3.5 w-3.5", item.color)} />
                        </div>
                        <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{item.label}</span>
                      </div>
                      <p className="text-xs leading-relaxed line-clamp-3">{item.text}</p>
                    </CardContent>
                  </Card>
                </button>
              ))}

              {/* Recent (unpinned) DW insights */}
              {recentInsights.map((insight) => (
                <DwInsightCard
                  key={insight.id}
                  insight={insight}
                  onNavigate={() => navigate(`/talk?insightId=${encodeURIComponent(insight.id)}`)}
                  onJumpToMoment={makeJumpToMomentHandler(insight)}
                  onPin={() => handlePinInsight(insight.id, false)}
                  onDelete={() => handleDeleteInsight(insight.id)}
                  onEdit={() => openEditModal(insight)}
                  onNotHelpful={() => handleNotHelpful(insight)}
                />
              ))}
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">Swipe to see more insights →</p>
          </motion.div>

          {/* ── DW Briefing snapshot ──────────────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}>
            <button
              onClick={() => navigate("/talk")}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              aria-label="Open DW Briefing in Talk It Out"
            >
              <Card className="border-primary/20 bg-primary/5 hover:border-primary/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-primary uppercase tracking-wide">DW Briefing</p>
                        <p className="text-xs text-muted-foreground truncate">{quickSuggestion.text}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      <MessageCircle className="h-4 w-4 text-muted-foreground" />
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* ── Blueprint + Goals + Habits snapshot ──────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <button
              onClick={() => navigate("/life-blueprint")}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              aria-label="Open Blueprint, Goals and Habits"
            >
              <Card className="hover:border-amber-400/40 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <BookOpen className="h-4 w-4 text-amber-500" />
                      <span className="text-sm font-semibold">Blueprint · Goals · Habits</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div className="text-center p-2 rounded-lg bg-muted/40" aria-label={`${completedDimensions.length} of ${DIMENSIONS.length} dimensions filled`}>
                      <p className="text-lg font-bold leading-none">{completedDimensions.length}<span className="text-xs text-muted-foreground font-normal">/{DIMENSIONS.length}</span></p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Dimensions</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/40" aria-label={`${activeGoals.length} active goals`}>
                      <p className="text-lg font-bold leading-none">{activeGoals.length}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Active Goals</p>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/40" aria-label={`${activeHabits.length} active habits`}>
                      <p className="text-lg font-bold leading-none">{activeHabits.length}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Habits Active</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          </motion.div>

          {/* ── Life Balance / Palaces meter ──────────────────────────── */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}>
            <button
              onClick={() => navigate("/tracking")}
              className="w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-xl"
              aria-label="View life balance breakdown"
            >
              <Card className="hover:border-primary/30 transition-colors">
                <CardContent className="p-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-semibold">Life Balance</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                    {DIMENSIONS.map((dim) => {
                      // Blueprint-based score; TODO: enrich with per-dimension goals/habits data
                      const score = filledDimensionIds.has(dim.id) ? BALANCE_SCORE_FILLED : BALANCE_SCORE_EMPTY;
                      return (
                        <div key={dim.id} className="flex items-center gap-2">
                          <dim.icon className={cn("h-3 w-3 flex-shrink-0", dim.color)} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-0.5">
                              <span className="text-[10px] text-muted-foreground truncate">{dim.label}</span>
                              <span className="text-[10px] text-muted-foreground ml-1">{score}%</span>
                            </div>
                            <Progress value={score} className="h-1" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 text-center">Based on Blueprint · Tap for full breakdown</p>
                </CardContent>
              </Card>
            </button>
          </motion.div>

        </div>
      </div>
    </div>
  );
}
