/**
 * PlanInMotionCard – shows active goals.
 *
 * When ELEVATION_ENGINE is ON and status is yellow/red with no active goals:
 * shows a "Want a 7-day elevation plan?" CTA that opens /talk with a prefill.
 *
 * Empty state (flag off): prompt to create a goal or chat with DW to define one.
 */

import { useLocation } from "wouter";
import { Target, ChevronRight, TrendingUp } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface PlanInMotionCardProps {
  summary: Pick<HomeSummary, "activeGoals" | "momentumData">;
}

export function PlanInMotionCard({ summary }: PlanInMotionCardProps) {
  const [, navigate] = useLocation();
  const { activeGoals, momentumData } = summary;
  const displayGoals = activeGoals.slice(0, 3);

  // Elevation Engine: show a 7-day plan CTA when yellow/red and no active goals
  const elevationStatus = momentumData?.status ?? null;
  const showElevationCTA =
    momentumData !== null &&
    activeGoals.length === 0 &&
    (elevationStatus === "yellow" || elevationStatus === "red");

  function buildElevationPrefill(): string {
    const reasons = momentumData?.reasons ?? [];
    const reasonPart =
      reasons.length > 0
        ? `I'm noticing: ${reasons.join("; ")}. `
        : "";
    return `You mentioned you want momentum. Based on the last few days, ${reasonPart}Want me to propose a simple 7-day elevation plan?`;
  }

  function handleElevationCTA() {
    const params = new URLSearchParams();
    params.set("prefill", buildElevationPrefill());
    params.set("src", "elevation_prompt");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <DWCardContainer chatPrefill="Help me define or refine a goal I'm working toward">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <Target className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Goals in motion
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/goals")}
          aria-label="View all goals"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {displayGoals.length > 0 ? (
        <div className="space-y-2">
          {displayGoals.map((goal) => (
            <button
              key={goal.id}
              type="button"
              onClick={() => navigate("/goals")}
              className="w-full text-left rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-sm font-medium line-clamp-1 flex-1">{goal.title}</p>
                {typeof goal.progress === "number" && (
                  <span className="text-xs text-muted-foreground flex-shrink-0">{goal.progress}%</span>
                )}
              </div>
              {typeof goal.progress === "number" && (
                <div className="mt-1.5 h-1 rounded-full bg-muted overflow-hidden">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all"
                    style={{ width: `${Math.min(100, Math.max(0, goal.progress))}%` }}
                  />
                </div>
              )}
            </button>
          ))}
          {activeGoals.length > 3 && (
            <button
              type="button"
              onClick={() => navigate("/goals")}
              className="text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none"
            >
              +{activeGoals.length - 3} more goals
            </button>
          )}
        </div>
      ) : showElevationCTA ? (
        /* Elevation Plan CTA – shown when yellow/red and no active goals */
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            No active goals right now.
          </p>
          <button
            type="button"
            onClick={handleElevationCTA}
            className="w-full flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/30 px-3 py-2.5 hover:bg-amber-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 text-left"
          >
            <TrendingUp className="h-4 w-4 text-amber-500 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm font-medium text-amber-700 dark:text-amber-400">
              Want a 7-day elevation plan?
            </span>
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/goals")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">
            No active goals — tap to set one or ask DW to help
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
