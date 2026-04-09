/**
 * Life Dimensions Page
 *
 * A visual switchboard of all 8 life dimensions. Tap any dimension to
 * explore its insights, advice, friction points, opportunities, and micro-journeys.
 * The "Blend" section at the bottom surfaces cross-dimensional patterns.
 */

import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import {
  Zap, Brain, Clock, Compass, Wallet, Users, Home, Sprout,
  ChevronRight, Sparkles, TrendingUp, AlertCircle, CheckCircle2,
  Activity, ArrowRight, Layers,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { cn } from "@/lib/utils";
import { getSwitchData, type SwitchId, type SwitchStatus } from "@/lib/switch-storage";
import { usePageMeta } from "@/hooks/use-page-meta";

// ── Dimension definitions ──────────────────────────────────────────────────────

interface DimensionMeta {
  id: SwitchId;
  name: string;
  subtitle: string;
  icon: typeof Zap;
  color: string;
  bgColor: string;
  borderColor: string;
  glowColor: string;
  tagline: string;
  subDimensions: SubDimension[];
}

interface SubDimension {
  label: string;
  description: string;
}

const DIMENSIONS: DimensionMeta[] = [
  {
    id: "body",
    name: "Body",
    subtitle: "Physical Energy",
    icon: Zap,
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    borderColor: "border-red-500/30",
    glowColor: "shadow-red-500/20",
    tagline: "The battery your life runs on",
    subDimensions: [
      { label: "Movement", description: "Daily activity, workouts, and consistency" },
      { label: "Recovery", description: "Sleep quality, rest, and stress relief" },
      { label: "Nourishment", description: "Fueling your body with intention" },
      { label: "Resilience", description: "Bouncing back from illness and fatigue" },
    ],
  },
  {
    id: "mind",
    name: "Mind",
    subtitle: "Mental & Emotional Clarity",
    icon: Brain,
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    borderColor: "border-purple-500/30",
    glowColor: "shadow-purple-500/20",
    tagline: "Not every thought is true",
    subDimensions: [
      { label: "Emotional Awareness", description: "Recognizing and processing feelings" },
      { label: "Stress Response", description: "How you handle pressure and overwhelm" },
      { label: "Mental Filtering", description: "Separating facts from stories" },
      { label: "Focus & Clarity", description: "Being present and sharp" },
    ],
  },
  {
    id: "time",
    name: "Time",
    subtitle: "Structure & Flow",
    icon: Clock,
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    borderColor: "border-blue-500/30",
    glowColor: "shadow-blue-500/20",
    tagline: "Structure is the real issue, not time",
    subDimensions: [
      { label: "Planning", description: "Designing your day with intention" },
      { label: "Focus Blocks", description: "Deep work without distraction" },
      { label: "Follow-Through", description: "Starting and finishing what matters" },
      { label: "Balance", description: "Work, rest, and play in rhythm" },
    ],
  },
  {
    id: "purpose",
    name: "Purpose",
    subtitle: "Direction & Meaning",
    icon: Compass,
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    borderColor: "border-amber-500/30",
    glowColor: "shadow-amber-500/20",
    tagline: "Knowing why makes the how easier",
    subDimensions: [
      { label: "Values", description: "What you stand for and live by" },
      { label: "Vision", description: "Where you're heading and why" },
      { label: "Motivation", description: "What keeps you moving forward" },
      { label: "Contribution", description: "How you make a difference" },
    ],
  },
  {
    id: "money",
    name: "Money",
    subtitle: "Financial Stability & Choice",
    icon: Wallet,
    color: "text-emerald-400",
    bgColor: "bg-emerald-500/10",
    borderColor: "border-emerald-500/30",
    glowColor: "shadow-emerald-500/20",
    tagline: "Security gives you options",
    subDimensions: [
      { label: "Awareness", description: "Knowing where your money goes" },
      { label: "Saving", description: "Building a cushion and future" },
      { label: "Spending", description: "Aligning spend with values" },
      { label: "Growth", description: "Investing in your financial future" },
    ],
  },
  {
    id: "relationships",
    name: "Relationships",
    subtitle: "Connection & Support",
    icon: Users,
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    borderColor: "border-pink-500/30",
    glowColor: "shadow-pink-500/20",
    tagline: "You become who you spend time with",
    subDimensions: [
      { label: "Intimacy", description: "Depth and vulnerability with close others" },
      { label: "Support Network", description: "People who have your back" },
      { label: "Communication", description: "Expressing and listening well" },
      { label: "Boundaries", description: "Protecting your energy with love" },
    ],
  },
  {
    id: "environment",
    name: "Environment",
    subtitle: "Space & Surroundings",
    icon: Home,
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    borderColor: "border-cyan-500/30",
    glowColor: "shadow-cyan-500/20",
    tagline: "Your space shapes your state",
    subDimensions: [
      { label: "Home Space", description: "Order, calm, and comfort at home" },
      { label: "Digital Environment", description: "What you consume and how often" },
      { label: "Nature & Light", description: "Connection to the natural world" },
      { label: "Workspace", description: "Focus-enabling setup for work" },
    ],
  },
  {
    id: "identity",
    name: "Identity",
    subtitle: "Growth & Evolution",
    icon: Sprout,
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    borderColor: "border-violet-500/30",
    glowColor: "shadow-violet-500/20",
    tagline: "You are always becoming",
    subDimensions: [
      { label: "Self-Concept", description: "How you see and speak about yourself" },
      { label: "Learning", description: "Curiosity and continuous growth" },
      { label: "Authenticity", description: "Living true to who you are" },
      { label: "Spiritual Connection", description: "Meaning beyond the material" },
    ],
  },
];

// ── Cross-dimensional blend patterns ─────────────────────────────────────────

interface BlendPattern {
  dimensions: SwitchId[];
  title: string;
  insight: string;
  icon: typeof Layers;
}

const BLEND_PATTERNS: BlendPattern[] = [
  {
    dimensions: ["body", "mind"],
    title: "Energy & Clarity",
    insight: "Physical energy directly powers mental clarity. When your body is depleted, your mind struggles to filter out noise and stay present.",
    icon: Zap,
  },
  {
    dimensions: ["purpose", "time"],
    title: "Direction & Structure",
    insight: "Knowing your 'why' makes it easier to protect your time. Without purpose, structure feels like a cage — with it, structure becomes your engine.",
    icon: Compass,
  },
  {
    dimensions: ["relationships", "identity"],
    title: "Connection & Self",
    insight: "The people around you reflect and shape who you're becoming. Strong identity makes you a better partner, friend, and collaborator.",
    icon: Users,
  },
  {
    dimensions: ["money", "environment"],
    title: "Stability & Space",
    insight: "Financial stability creates room to invest in your surroundings. A calming, organized space in turn reduces stress and improves financial decisions.",
    icon: Wallet,
  },
];

// ── Status helpers ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<SwitchStatus, { label: string; color: string; dot: string; progress: number }> = {
  powered: { label: "Powered", color: "text-green-400", dot: "bg-green-400", progress: 90 },
  stable:  { label: "Stable",  color: "text-blue-400",  dot: "bg-blue-400",  progress: 65 },
  flickering: { label: "Building", color: "text-amber-400", dot: "bg-amber-400", progress: 35 },
  off:     { label: "Needs Attention", color: "text-red-400", dot: "bg-red-400", progress: 10 },
};

function statusScore(s: SwitchStatus) {
  return { powered: 4, stable: 3, flickering: 2, off: 1 }[s];
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LifeDimensionsPage() {
  usePageMeta("Life Dimensions", "Your 8 life dimensions — explore insights, track progress, and get personalized advice.");
  const [, navigate] = useLocation();
  const [activeBlend, setActiveBlend] = useState<number | null>(null);

  const switchData = useMemo(() => getSwitchData(), []);

  const dimensionsWithStatus = useMemo(() =>
    DIMENSIONS.map((d) => ({
      ...d,
      status: switchData[d.id]?.status ?? "off" as SwitchStatus,
      streakDays: switchData[d.id]?.streakDays ?? 0,
    })),
    [switchData]
  );

  const overallScore = useMemo(() => {
    const total = dimensionsWithStatus.reduce((sum, d) => sum + statusScore(d.status), 0);
    return Math.round((total / (DIMENSIONS.length * 4)) * 100);
  }, [dimensionsWithStatus]);

  const topNeeds = useMemo(() =>
    [...dimensionsWithStatus]
      .sort((a, b) => statusScore(a.status) - statusScore(b.status))
      .slice(0, 2),
    [dimensionsWithStatus]
  );

  const topStrengths = useMemo(() =>
    [...dimensionsWithStatus]
      .sort((a, b) => statusScore(b.status) - statusScore(a.status))
      .slice(0, 2),
    [dimensionsWithStatus]
  );

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <PageHeader title="Life Dimensions" />

      <div className="flex-1 overflow-y-auto pb-24">

        {/* Overall score banner */}
        <div className="mx-4 mt-4 mb-2 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wider mb-0.5">Overall Alignment</p>
              <p className="text-2xl font-bold text-foreground">{overallScore}%</p>
            </div>
            <div className="flex gap-2">
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Leading</p>
                {topStrengths.map((d) => (
                  <div key={d.id} className="flex items-center gap-1 justify-end">
                    <d.icon className={cn("h-3 w-3", d.color)} />
                    <span className="text-xs font-medium">{d.name}</span>
                  </div>
                ))}
              </div>
              <div className="text-right">
                <p className="text-xs text-muted-foreground mb-0.5">Needs focus</p>
                {topNeeds.map((d) => (
                  <div key={d.id} className="flex items-center gap-1 justify-end">
                    <d.icon className={cn("h-3 w-3", d.color)} />
                    <span className="text-xs font-medium">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <Progress value={overallScore} className="h-1.5" />
        </div>

        {/* Dimension grid */}
        <div className="px-4 mt-4 mb-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">Your Dimensions</p>
          <div className="grid grid-cols-2 gap-3">
            {dimensionsWithStatus.map((dim) => {
              const statusCfg = STATUS_CONFIG[dim.status];
              return (
                <button
                  key={dim.id}
                  data-testid={`card-dimension-${dim.id}`}
                  onClick={() => navigate(`/dimension/${dim.id}`)}
                  className={cn(
                    "text-left rounded-2xl border p-4 transition-all active:scale-95",
                    dim.bgColor, dim.borderColor,
                    "hover:brightness-110 shadow-sm"
                  )}
                >
                  {/* Icon + status dot */}
                  <div className="flex items-start justify-between mb-3">
                    <div className={cn("p-2 rounded-xl", dim.bgColor)}>
                      <dim.icon className={cn("h-5 w-5", dim.color)} />
                    </div>
                    <span className={cn("flex items-center gap-1 text-xs font-medium", statusCfg.color)}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", statusCfg.dot)} />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Name & subtitle */}
                  <p className="font-semibold text-foreground text-sm leading-tight">{dim.name}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 mb-3 leading-tight">{dim.subtitle}</p>

                  {/* Progress bar */}
                  <Progress value={statusCfg.progress} className="h-1 mb-2" />

                  {/* Sub-dimensions preview */}
                  <div className="flex flex-wrap gap-1 mt-2">
                    {dim.subDimensions.slice(0, 2).map((sub) => (
                      <span
                        key={sub.label}
                        className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/50 text-muted-foreground"
                      >
                        {sub.label}
                      </span>
                    ))}
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-background/50 text-muted-foreground">
                      +{dim.subDimensions.length - 2} more
                    </span>
                  </div>

                  {/* Navigate hint */}
                  <div className="flex items-center gap-1 mt-3">
                    <span className="text-xs text-muted-foreground">Explore</span>
                    <ChevronRight className="h-3 w-3 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Quick-focus section */}
        <div className="px-4 mt-6 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="h-4 w-4 text-amber-400" />
            <p className="text-sm font-semibold text-foreground">Where to Focus Now</p>
          </div>
          <div className="flex flex-col gap-2">
            {topNeeds.map((dim) => (
              <button
                key={dim.id}
                data-testid={`button-focus-${dim.id}`}
                onClick={() => navigate(`/dimension/${dim.id}`)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-xl border text-left transition-all active:scale-95",
                  dim.bgColor, dim.borderColor
                )}
              >
                <div className={cn("p-1.5 rounded-lg shrink-0", dim.bgColor)}>
                  <dim.icon className={cn("h-4 w-4", dim.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{dim.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{dim.tagline}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <span className="text-xs text-muted-foreground">Get advice</span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground" />
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Strengths */}
        <div className="px-4 mt-4 mb-2">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="h-4 w-4 text-green-400" />
            <p className="text-sm font-semibold text-foreground">Your Strengths</p>
          </div>
          <div className="flex gap-2">
            {topStrengths.map((dim) => (
              <button
                key={dim.id}
                data-testid={`button-strength-${dim.id}`}
                onClick={() => navigate(`/dimension/${dim.id}`)}
                className={cn(
                  "flex-1 flex items-center gap-2 p-3 rounded-xl border text-left transition-all active:scale-95",
                  dim.bgColor, dim.borderColor
                )}
              >
                <dim.icon className={cn("h-4 w-4 shrink-0", dim.color)} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{dim.name}</p>
                  <p className="text-[10px] text-muted-foreground">{STATUS_CONFIG[dim.status].label}</p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* The Blend — cross-dimensional section */}
        <div className="px-4 mt-6 mb-2">
          <div className="flex items-center gap-2 mb-1">
            <Layers className="h-4 w-4 text-primary" />
            <p className="text-sm font-semibold text-foreground">The Blend</p>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            How your dimensions work together — and where they overlap
          </p>

          <div className="flex flex-col gap-3">
            {BLEND_PATTERNS.map((pattern, i) => {
              const dims = pattern.dimensions.map((id) => DIMENSIONS.find((d) => d.id === id)!);
              const isOpen = activeBlend === i;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl border border-border bg-muted/30 overflow-hidden transition-all"
                  )}
                >
                  <button
                    data-testid={`button-blend-${i}`}
                    className="w-full flex items-center gap-3 p-4 text-left"
                    onClick={() => setActiveBlend(isOpen ? null : i)}
                  >
                    {/* Dimension icons */}
                    <div className="flex -space-x-2 shrink-0">
                      {dims.map((d) => (
                        <div key={d.id} className={cn("h-8 w-8 rounded-full border-2 border-background flex items-center justify-center", d.bgColor)}>
                          <d.icon className={cn("h-3.5 w-3.5", d.color)} />
                        </div>
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground">{pattern.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {dims.map((d) => d.name).join(" + ")}
                      </p>
                    </div>
                    <ChevronRight className={cn("h-4 w-4 text-muted-foreground shrink-0 transition-transform", isOpen && "rotate-90")} />
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4">
                      <div className="border-t border-border pt-3">
                        <p className="text-sm text-foreground leading-relaxed mb-3">
                          {pattern.insight}
                        </p>
                        <div className="flex gap-2">
                          {dims.map((d) => (
                            <Button
                              key={d.id}
                              variant="outline"
                              size="sm"
                              className={cn("flex-1 gap-1.5 text-xs", d.borderColor)}
                              onClick={() => navigate(`/dimension/${d.id}`)}
                              data-testid={`button-blend-dim-${d.id}`}
                            >
                              <d.icon className={cn("h-3.5 w-3.5", d.color)} />
                              {d.name}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Ask DW about everything */}
        <div className="px-4 mt-6 mb-4">
          <button
            data-testid="button-ask-dw-dimensions"
            onClick={() => navigate("/talk?topic=Give me a full picture of all my life dimensions and what to focus on")}
            className="w-full flex items-center justify-between p-4 rounded-2xl bg-primary/10 border border-primary/20 transition-all active:scale-95"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-primary/20">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-foreground">Ask DW about my full picture</p>
                <p className="text-xs text-muted-foreground">Get a unified read across all 8 dimensions</p>
              </div>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
          </button>
        </div>

        {/* All dimensions list — quick access */}
        <div className="px-4 mt-2 mb-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-3">All Dimensions</p>
          <div className="flex flex-col gap-1.5">
            {dimensionsWithStatus.map((dim) => {
              const statusCfg = STATUS_CONFIG[dim.status];
              return (
                <button
                  key={dim.id}
                  data-testid={`button-list-dim-${dim.id}`}
                  onClick={() => navigate(`/dimension/${dim.id}`)}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-all active:scale-95 text-left"
                >
                  <div className={cn("p-1.5 rounded-lg", dim.bgColor)}>
                    <dim.icon className={cn("h-4 w-4", dim.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{dim.name}</p>
                    <p className="text-xs text-muted-foreground">{dim.subtitle}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={cn("text-xs font-medium", statusCfg.color)}>{statusCfg.label}</span>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

      </div>
    </div>
  );
}
