/**
 * My Life — the user's core life system.
 *
 * Spec 13 structure:
 *   Focus Points  — high-priority areas that matter most right now
 *   Paths         — ongoing directions of growth
 *   Systems       — repeatable operating structures
 *   Plans         — structured sequences with milestones and pacing
 *   Projects      — bounded initiatives with a defined outcome
 *
 * Route: /my-life
 */

import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Target,
  TrendingUp,
  Repeat,
  FileText,
  FolderOpen,
  ChevronRight,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import type { Project } from "@shared/schema";

// ─── Section definitions ──────────────────────────────────────────────────────

interface SectionDef {
  id: string;
  label: string;
  description: string;
  icon: typeof Target;
  iconColor: string;
  href: string;
  badge?: string;
}

const SECTIONS: SectionDef[] = [
  {
    id: "focus-points",
    label: "Focus Points",
    description: "The few high-priority areas that matter most right now.",
    icon: Target,
    iconColor: "text-rose-500",
    href: "/goals",
  },
  {
    id: "paths",
    label: "Paths",
    description: "Ongoing directions of growth — health, stability, clarity.",
    icon: TrendingUp,
    iconColor: "text-emerald-500",
    href: "/life-blueprint",
  },
  {
    id: "systems",
    label: "Systems",
    description: "Repeatable structures that make follow-through easier.",
    icon: Repeat,
    iconColor: "text-blue-500",
    href: "/systems",
  },
  {
    id: "plans",
    label: "Plans",
    description: "Structured sequences with milestones and adaptive pacing.",
    icon: FileText,
    iconColor: "text-violet-500",
    href: "/plans",
  },
  {
    id: "projects",
    label: "Projects",
    description: "Bounded initiatives with a defined outcome and finish state.",
    icon: FolderOpen,
    iconColor: "text-amber-500",
    href: "/projects",
  },
];

// ─── Stat strip ───────────────────────────────────────────────────────────────

interface LifeStats {
  goalsCount?: number;
  plansCount?: number;
  habitsCount?: number;
}

function StatPill({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center gap-0.5 min-w-[56px]">
      <span className="text-lg font-semibold text-foreground leading-none">
        {value}
      </span>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none">
        {label}
      </span>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────

function SectionCard({ section }: { section: SectionDef }) {
  const Icon = section.icon;
  return (
    <Link href={section.href}>
      <Card
        className="cursor-pointer transition-all duration-200 hover:shadow-md active:scale-[0.98]"
        data-testid={`my-life-section-${section.id}`}
      >
        <CardContent className="flex items-center gap-4 p-4">
          <div
            className={cn(
              "flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center bg-muted",
            )}
          >
            <Icon className={cn("h-5 w-5", section.iconColor)} aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-foreground">{section.label}</p>
              {section.badge && (
                <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
                  {section.badge}
                </Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {section.description}
            </p>
          </div>
          <ChevronRight className="flex-shrink-0 h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </CardContent>
      </Card>
    </Link>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyLifePage() {
  usePageMeta("My Life", "Your core life system — focus points, paths, systems, plans, and projects.");
  const [, setLocation] = useLocation();

  const { data: goals = [] } = useQuery<{ status?: string }[]>({
    queryKey: ["/api/goals"],
    staleTime: 60_000,
  });

  const { data: habits = [] } = useQuery<{ isActive?: boolean }[]>({
    queryKey: ["/api/habits"],
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
    staleTime: 60_000,
  });

  const { data: onboardingData } = useQuery<{ profile: any | null }>({
    queryKey: ["/api/onboarding/profile"],
    staleTime: 300_000,
  });

  const onboardingProfile = onboardingData?.profile ?? null;
  const pendingSuggestions = (onboardingProfile?.suggestedStructure ?? []) as Array<{
    id: string; type: string; title: string; status: string;
  }>;
  const hasPendingSuggestions = pendingSuggestions.some((s) => s.status === "pending");
  const hasOnlyDeferredSuggestions =
    !hasPendingSuggestions && pendingSuggestions.some((s) => s.status === "deferred");

  const activeGoals = goals.filter((g) => g.status !== "completed").length;
  const activeHabits = habits.filter((h) => h.isActive !== false).length;
  const activeProjects = projects.filter((p) => p.status === "active").length;

  return (
    <div className="pb-28">
      <PageHeader title="My Life" showBack={false} />

      <div className="px-4 space-y-5">
        {/* Intro line */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Your Life Blueprint — built from your patterns and shaped by your choices.
          </p>
        </div>

        {/* AI suggestions pending banner */}
        {hasPendingSuggestions && (
          <Card className="border-primary/25 bg-primary/5" data-testid="onboarding-suggestions-banner">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">DW has suggestions for you</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Based on your onboarding conversation, DW generated{" "}
                    {pendingSuggestions.filter((s) => s.status === "pending").length} suggestions for your Life Blueprint.
                    Review and accept what fits.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                className="w-full text-xs"
                onClick={() => setLocation("/voice-onboarding?review=1")}
                data-testid="button-review-suggestions"
              >
                Review suggestions
                <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Set-aside suggestions banner */}
        {hasOnlyDeferredSuggestions && (
          <Card className="border-border bg-muted/40" data-testid="onboarding-deferred-banner">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-foreground">Your suggestions are saved</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    You set aside the suggestions DW built from your conversation. They're here whenever
                    you're ready to review them.
                  </p>
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setLocation("/voice-onboarding?review=1")}
                data-testid="button-review-deferred-suggestions"
              >
                Review suggestions
                <ArrowRight className="h-3 w-3 ml-1.5" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Stat strip */}
        <Card>
          <CardContent className="py-4 px-4">
            <div className="flex items-center justify-around">
              <StatPill label="Focus" value={activeGoals} />
              <div className="w-px h-8 bg-border" />
              <StatPill label="Projects" value={activeProjects} />
              <div className="w-px h-8 bg-border" />
              <StatPill label="Habits" value={activeHabits} />
            </div>
          </CardContent>
        </Card>

        {/* Section cards */}
        <div className="space-y-3">
          {SECTIONS.map((section) => (
            <SectionCard key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
