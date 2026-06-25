/**
 * DailyBriefCard — displays the structured 4-section daily brief (Roadmap §15.4).
 *
 * Sections:
 *   1. How You're Doing (7-day trend)
 *   2. Needs Attention (highest-signal alert)
 *   3. What's Improving (positive trend)
 *   4. One Thing Today (recommended action)
 */

import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { TrendingUp, AlertCircle, Sparkles, ArrowRight } from "lucide-react";

interface BriefSections {
  howYoureDoing: string | null;
  needsAttention: string | null;
  whatsImproving: string | null;
  oneThingToday: { text: string; route: string } | null;
}

interface TodayBriefResponse {
  dateKey: string;
  variant: string;
  summaryText: string;
  bullets: unknown[];
  sections?: BriefSections;
  generatedAt: string;
  cached: boolean;
}

interface DailyBriefCardProps {
  className?: string;
}

export function DailyBriefCard({ className }: DailyBriefCardProps) {
  const [, navigate] = useLocation();
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

  const { data: brief } = useQuery<TodayBriefResponse>({
    queryKey: ["/api/today", tz],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 5 * 60 * 1000,
  });

  const sections = brief?.sections;
  if (!sections) return null;

  // Only show if at least one section has content
  const hasContent = sections.howYoureDoing || sections.needsAttention ||
    sections.whatsImproving || sections.oneThingToday;
  if (!hasContent) return null;

  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-border bg-card px-4 py-3.5 space-y-2.5",
        className,
      )}
      data-testid="card-daily-brief-sections"
    >
      {sections.howYoureDoing && (
        <div className="flex items-start gap-2">
          <TrendingUp className="h-3.5 w-3.5 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {sections.howYoureDoing}
          </p>
        </div>
      )}

      {sections.needsAttention && (
        <div className="flex items-start gap-2">
          <AlertCircle className="h-3.5 w-3.5 text-orange-500 mt-0.5 shrink-0" />
          <p className="text-xs text-foreground font-medium leading-relaxed">
            {sections.needsAttention}
          </p>
        </div>
      )}

      {sections.whatsImproving && (
        <div className="flex items-start gap-2">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground leading-relaxed">
            {sections.whatsImproving}
          </p>
        </div>
      )}

      {sections.oneThingToday && (
        <button
          type="button"
          onClick={() => navigate(sections.oneThingToday!.route)}
          className="flex items-center gap-2 w-full text-left mt-1 px-2.5 py-1.5 rounded-lg bg-primary/5 border border-primary/20 hover:border-primary/40 transition-colors"
          data-testid="btn-one-thing-today"
        >
          <ArrowRight className="h-3.5 w-3.5 text-primary shrink-0" />
          <span className="text-xs font-medium text-primary leading-snug">
            {sections.oneThingToday.text}
          </span>
        </button>
      )}
    </div>
  );
}
