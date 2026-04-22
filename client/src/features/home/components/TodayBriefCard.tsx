/**
 * TodayBriefCard – the unified daily brief at the top of the home command center.
 *
 * Reads `GET /api/today` (server-cached per local-day + variant), shows DW's
 * 2–3 sentence summary plus 3–5 typed bullets that route to the relevant
 * surface. A manual refresh button forces regeneration via POST /api/today/refresh.
 */

import { useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import {
  RefreshCw,
  Sparkles,
  Heart,
  Moon,
  DollarSign,
  Users,
  Compass,
  CalendarClock,
  LifeBuoy,
  type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface BriefBullet {
  kind: "mood" | "sleep" | "finance" | "relationship" | "spirit" | "plan" | "trigger";
  text: string;
  route: string;
  importance: 1 | 2 | 3;
}

interface TodayBriefResponse {
  dateKey: string;
  variant: "morning" | "tonight";
  hour: number;
  summaryText: string;
  bullets: BriefBullet[];
  generatedAt: string;
  cached: boolean;
}

const BULLET_ICONS: Record<BriefBullet["kind"], LucideIcon> = {
  mood: Heart,
  sleep: Moon,
  finance: DollarSign,
  relationship: Users,
  spirit: Compass,
  plan: CalendarClock,
  trigger: LifeBuoy,
};

function getTimezone(): string | undefined {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return undefined;
  }
}

function isSameLocalDay(generatedAt: string): boolean {
  try {
    const gen = new Date(generatedAt);
    const now = new Date();
    return gen.toDateString() === now.toDateString();
  } catch {
    return true;
  }
}

interface TodayBriefCardProps {
  className?: string;
}

export function TodayBriefCard({ className = "" }: TodayBriefCardProps) {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const tz = useMemo(() => getTimezone(), []);

  const queryKey = useMemo(() => ["/api/today", tz ?? "utc"] as const, [tz]);

  const briefQ = useQuery<TodayBriefResponse | null>({
    queryKey,
    queryFn: async () => {
      const url = tz ? `/api/today?tz=${encodeURIComponent(tz)}` : "/api/today";
      const res = await fetch(url, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error(`${res.status}: ${await res.text()}`);
      return (await res.json()) as TodayBriefResponse;
    },
    staleTime: 15 * 60 * 1000,
    retry: false,
  });

  const refreshMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/today/refresh", { tz });
      return (await res.json()) as TodayBriefResponse;
    },
    onSuccess: (fresh) => {
      queryClient.setQueryData(queryKey, fresh);
      toast({ title: "Today's brief refreshed", description: "DW pulled in the latest signals." });
    },
    onError: () => {
      toast({
        title: "Couldn't refresh just now",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  if (briefQ.isLoading) {
    return (
      <div
        className={`rounded-2xl border border-border bg-card p-4 space-y-3 ${className}`}
        data-testid="card-today-brief-loading"
      >
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-7 w-7 rounded-md" />
        </div>
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <div className="space-y-2 pt-1">
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-full" />
          <Skeleton className="h-9 w-3/4" />
        </div>
      </div>
    );
  }

  const brief = briefQ.data;
  if (!brief) {
    // Brand-new user with no signals yet, or guest. Show a soft empty state.
    return (
      <div
        className={`rounded-2xl border border-border bg-card p-4 ${className}`}
        data-testid="card-today-brief-empty"
      >
        <div className="flex items-center gap-2 mb-1.5">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Today
          </p>
        </div>
        <p className="text-sm text-foreground/80">
          Once DW knows a little about your day, you'll see a unified brief here every morning.
        </p>
      </div>
    );
  }

  const variantLabel = brief.variant === "tonight" ? "Tonight" : "Today";
  const isStale = !isSameLocalDay(brief.generatedAt);

  return (
    <div
      className={`rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/5 to-card p-4 space-y-3 ${className}`}
      data-testid="card-today-brief"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
          <p
            className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
            data-testid="text-today-brief-variant"
          >
            {variantLabel}
            {isStale && (
              <span className="ml-1.5 normal-case font-normal text-muted-foreground/70">
                · tap refresh
              </span>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={() => refreshMutation.mutate()}
          disabled={refreshMutation.isPending}
          className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label="Regenerate today's brief"
          data-testid="btn-today-brief-refresh"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${refreshMutation.isPending ? "animate-spin" : ""}`} />
        </button>
      </div>

      <p
        className="text-sm leading-snug text-foreground/90"
        data-testid="text-today-brief-summary"
      >
        {brief.summaryText}
      </p>

      {brief.bullets.length > 0 && (
        <ul className="space-y-1.5" data-testid="list-today-brief-bullets">
          {brief.bullets.map((b, i) => {
            const Icon = BULLET_ICONS[b.kind] ?? Sparkles;
            return (
              <li key={`${b.kind}-${i}`}>
                <button
                  type="button"
                  onClick={() => navigate(b.route)}
                  className="w-full text-left flex items-start gap-2 rounded-lg px-2.5 py-2 hover:bg-muted/60 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid={`btn-today-brief-bullet-${b.kind}-${i}`}
                >
                  <span
                    className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                      b.importance === 1
                        ? "bg-primary/15 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                    aria-hidden="true"
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <span className="text-xs leading-snug text-foreground/85 min-w-0">
                    {b.text}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
