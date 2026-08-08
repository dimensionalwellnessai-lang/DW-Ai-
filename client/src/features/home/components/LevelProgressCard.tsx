import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Progress } from "@/components/ui/progress";
import { CarouselItem } from "@/components/ui/carousel";
import { ChevronRight, Trophy, Compass } from "lucide-react";

interface LevelProgressSummary {
  roleMap: {
    targetRole: string;
    currentLevel: number;
    maxLevel: number;
    currentLevelTitle?: string;
    nextLevelTitle?: string;
  } | null;
  levelProgressPct: number;
}

interface GrowthReviewSummary {
  period: string;
  focus: { title: string; reason: string; route: string } | null;
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
}

/**
 * Compact "My Level" card for the home dashboard deck.
 * Shows current level, % to next, and this week's growth-review focus.
 * Tapping opens the full /my-level page. When the user has no role map,
 * it renders a gentle "build your role map" nudge instead.
 *
 * Renders its own CarouselItem so the slide disappears entirely while
 * loading or when the API fails (no blank slot in the deck).
 */
export function LevelProgressCardSlide() {
  const [, navigate] = useLocation();

  const { data: progress, isLoading, isError } = useQuery<LevelProgressSummary>({
    queryKey: ["level-progress"],
    queryFn: () => getJson("/api/level-progress"),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  const { data: review } = useQuery<GrowthReviewSummary>({
    queryKey: ["level-progress", "review", "week"],
    queryFn: () => getJson("/api/level-progress/review?period=week"),
    retry: false,
    staleTime: 5 * 60 * 1000,
    enabled: !!progress?.roleMap,
  });

  // Hide gracefully while loading or when the API fails.
  if (isLoading || isError || !progress) return null;

  const rm = progress.roleMap;

  if (!rm) {
    // No role map yet — nudge toward building one.
    return (
      <CarouselItem className="pl-2 basis-[85%] h-full">
        <button
          type="button"
          onClick={() => navigate("/my-level")}
          data-testid="card-level-progress-nudge"
          className="w-full h-full text-left rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10 px-4 py-3.5 flex items-center gap-3 hover:border-purple-500/50 transition-colors"
        >
          <div className="h-9 w-9 rounded-full bg-purple-500/15 flex items-center justify-center shrink-0">
            <Compass className="h-4 w-4 text-purple-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-400">My Level</p>
            <p className="text-sm font-semibold leading-snug mt-0.5">Build your role map</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Level tracking starts with a ladder — set it up in minutes.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </button>
      </CarouselItem>
    );
  }

  return (
    <CarouselItem className="pl-2 basis-[85%] h-full">
      <button
        type="button"
        onClick={() => navigate("/my-level")}
        data-testid="card-level-progress"
        className="w-full h-full text-left rounded-2xl border border-purple-500/30 bg-gradient-to-br from-purple-500/5 to-purple-500/10 px-4 py-3.5 flex flex-col gap-2 hover:border-purple-500/50 transition-colors"
      >
        <div className="flex items-start gap-3">
          <div className="h-9 w-9 rounded-full bg-amber-500/15 flex items-center justify-center shrink-0">
            <Trophy className="h-4 w-4 text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-purple-400">My Level</p>
            <p className="text-sm font-semibold leading-snug mt-0.5 truncate" data-testid="text-level-card-title">
              Level {rm.currentLevel} of {rm.maxLevel}
              {rm.currentLevelTitle ? ` — ${rm.currentLevelTitle}` : ""}
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        </div>
        <div className="pl-12 space-y-1.5 w-full">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground truncate">
              {rm.nextLevelTitle && rm.currentLevel < rm.maxLevel ? `Next: ${rm.nextLevelTitle}` : rm.targetRole}
            </span>
            <span className="text-purple-300 font-medium shrink-0 ml-2" data-testid="text-level-card-pct">
              {progress.levelProgressPct}% to next
            </span>
          </div>
          <Progress value={progress.levelProgressPct} className="h-1.5" />
          {review?.focus && (
            <p className="text-xs text-muted-foreground truncate" data-testid="text-level-card-focus">
              This week's focus: <span className="text-foreground">{review.focus.title}</span>
            </p>
          )}
        </div>
      </button>
    </CarouselItem>
  );
}
