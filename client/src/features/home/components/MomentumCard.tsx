/**
 * MomentumCard – a quick motivational nudge based on today's real data.
 * Shows habit completion ratio and a contextual message.
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
  completedHabits: number,
  totalHabits: number,
  totalGoals: number
): string {
  if (totalHabits === 0 && totalGoals === 0) {
    return "Every journey starts with one step. What will yours be today?";
  }
  if (totalHabits > 0 && completedHabits === totalHabits) {
    return "All habits done — you're building real momentum today.";
  }
  if (totalHabits > 0 && completedHabits > 0) {
    return `${completedHabits} of ${totalHabits} habits done — keep going!`;
  }
  if (totalGoals > 0) {
    return `You have ${totalGoals} active goal${totalGoals > 1 ? "s" : ""} in motion. Small actions add up.`;
  }
  return "Your day is open. What one thing would move the needle?";
}

export function MomentumCard({ summary }: MomentumCardProps) {
  const [, navigate] = useLocation();
  const { activeHabits, activeGoals } = summary;

  const completedToday = activeHabits.filter((h) => h.completedToday).length;
  const totalHabits = activeHabits.length;
  const totalGoals = activeGoals.length;
  const hasData = totalHabits > 0 || totalGoals > 0;

  const message = getMomentumMessage(completedToday, totalHabits, totalGoals);

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
