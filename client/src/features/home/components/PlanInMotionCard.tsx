/**
 * PlanInMotionCard – shows active goals.
 * Empty state: prompt to create a goal or chat with DW to define one.
 */

import { useLocation } from "wouter";
import { Target, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface PlanInMotionCardProps {
  summary: Pick<HomeSummary, "activeGoals">;
}

export function PlanInMotionCard({ summary }: PlanInMotionCardProps) {
  const [, navigate] = useLocation();
  const { activeGoals } = summary;
  const displayGoals = activeGoals.slice(0, 3);

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
