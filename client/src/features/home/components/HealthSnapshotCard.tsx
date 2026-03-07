/**
 * HealthSnapshotCard – shows active habits with today's completion status.
 * Empty state: prompt to build a habit or chat with DW.
 */

import { useLocation } from "wouter";
import { Activity, ChevronRight, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface HealthSnapshotCardProps {
  summary: Pick<HomeSummary, "activeHabits">;
}

export function HealthSnapshotCard({ summary }: HealthSnapshotCardProps) {
  const [, navigate] = useLocation();
  const { activeHabits } = summary;
  const displayHabits = activeHabits.slice(0, 4);
  const completedCount = activeHabits.filter((h) => h.completedToday).length;

  return (
    <DWCardContainer chatPrefill="Let's talk about building healthy habits that fit my lifestyle">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-green-500/10">
            <Activity className="h-4 w-4 text-green-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Habits today
            </p>
            {activeHabits.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {completedCount} / {activeHabits.length} done
              </p>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/habits")}
          aria-label="View all habits"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {displayHabits.length > 0 ? (
        <div className="space-y-1.5">
          {displayHabits.map((habit) => (
            <button
              key={habit.id}
              type="button"
              onClick={() => navigate("/habits")}
              className="w-full flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {habit.completedToday ? (
                <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              ) : (
                <Circle className="h-4 w-4 text-muted-foreground/50 flex-shrink-0" />
              )}
              <span className={cn("text-sm line-clamp-1 flex-1 text-left", habit.completedToday && "line-through text-muted-foreground")}>
                {habit.title}
              </span>
              {typeof habit.streak === "number" && habit.streak > 0 && (
                <span className="text-[10px] text-amber-500 font-semibold flex-shrink-0">{habit.streak}🔥</span>
              )}
            </button>
          ))}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/habits")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">
            No habits set up — tap to start building your daily foundation
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
