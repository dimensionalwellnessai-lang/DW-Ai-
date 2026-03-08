/**
 * MomentumCard – a quick motivational nudge based on today's real data.
 * Shows habit count and streak data; does NOT use completedToday (unavailable
 * from /api/habits — see useHomeSummary for details).
 * Empty state: a gentle prompt to take one action.
 */

import { useLocation } from "wouter";
import { Zap, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface MomentumCardProps {
  summary: Pick<HomeSummary, "activeHabits" | "activeGoals">;
}

function getMomentumMessage(
  totalHabits: number,
  topStreak: number,
  totalGoals: number
): string {
  if (totalHabits === 0 && totalGoals === 0) {
    return "Every journey starts with one step. What will yours be today?";
  }
  if (topStreak >= 7) {
    return `${topStreak}-day streak — consistency is your superpower. Keep it going.`;
  }
  if (topStreak > 0) {
    return `You're on a ${topStreak}-day streak. One more day builds the habit.`;
  }
  if (totalHabits > 0 && totalGoals > 0) {
    return `${totalHabits} habit${totalHabits !== 1 ? "s" : ""} and ${totalGoals} goal${totalGoals !== 1 ? "s" : ""} in motion. Small actions compound.`;
  }
  if (totalGoals > 0) {
    return `You have ${totalGoals} active goal${totalGoals > 1 ? "s" : ""} in motion. Small actions add up.`;
  }
  return `${totalHabits} active habit${totalHabits !== 1 ? "s" : ""}. Stay consistent — it compounds over time.`;
}

export function MomentumCard({ summary }: MomentumCardProps) {
  const [, navigate] = useLocation();
  const { activeHabits, activeGoals } = summary;

  const totalHabits = activeHabits.length;
  const totalGoals = activeGoals.length;
  const topStreak = activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
  const hasData = totalHabits > 0 || totalGoals > 0;

  const message = getMomentumMessage(totalHabits, topStreak, totalGoals);

  return (
    <DWCardContainer chatPrefill="I want to talk about my momentum and what's driving (or blocking) my progress">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-purple-500/10">
            <Zap className="h-4 w-4 text-purple-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Momentum</p>
        </div>
        {hasData && (
          <button
            type="button"
            onClick={() => navigate("/habits")}
            aria-label="View habits"
            className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </button>
        )}
      </div>

      <p className="text-sm leading-relaxed text-foreground/80">{message}</p>

      {!hasData && (
        <button
          type="button"
          onClick={() => navigate("/habits")}
          className="mt-1 text-xs font-medium text-primary hover:underline focus:outline-none"
        >
          Set up your first habit →
        </button>
      )}
    </DWCardContainer>
  );
}
