/**
 * MomentumCard – a quick motivational nudge based on today's real data.
 *
 * When ELEVATION_ENGINE is ON: shows momentum status (green/yellow/red),
 * up to 2 reason strings, and a "Check my momentum" button.
 * When ELEVATION_ENGINE is OFF: falls back to the original habit-streak message.
 *
 * Uses completedToday: NOT available from /api/habits — see useHomeSummary.
 * Empty state: a gentle prompt to take one action.
 */

import { useLocation } from "wouter";
import { Zap, ChevronRight, RefreshCw } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary, MomentumStatus } from "../types";

interface MomentumCardProps {
  summary: Pick<HomeSummary, "activeHabits" | "activeGoals" | "momentumData">;
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

const STATUS_CONFIG: Record<MomentumStatus, { label: string; dotClass: string; textClass: string }> = {
  green: {
    label: "On track",
    dotClass: "bg-green-500",
    textClass: "text-green-600 dark:text-green-400",
  },
  yellow: {
    label: "Slowing down",
    dotClass: "bg-yellow-500",
    textClass: "text-yellow-600 dark:text-yellow-400",
  },
  red: {
    label: "Stalled",
    dotClass: "bg-red-500",
    textClass: "text-red-600 dark:text-red-400",
  },
};

export function MomentumCard({ summary }: MomentumCardProps) {
  const [, navigate] = useLocation();
  const { activeHabits, activeGoals, momentumData } = summary;

  const totalHabits = activeHabits.length;
  const totalGoals = activeGoals.length;
  const topStreak = activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
  const hasData = totalHabits > 0 || totalGoals > 0;

  const legacyMessage = getMomentumMessage(totalHabits, topStreak, totalGoals);

  // ── Elevation Engine mode ────────────────────────────────────────────────
  if (momentumData) {
    const { status, reasons, suggestedFocus, isLoading, checkNow } = momentumData;
    const config = status ? STATUS_CONFIG[status] : null;

    const chatPrefill = status && (status === "yellow" || status === "red") && reasons.length > 0
      ? `You mentioned you want momentum. Based on the last few days, I'm noticing: ${reasons.join("; ")}. Want me to propose a simple 7-day elevation plan?`
      : "I want to talk about my momentum and what's driving (or blocking) my progress";

    return (
      <DWCardContainer chatPrefill={chatPrefill}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-purple-500/10">
              <Zap className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Momentum
            </p>
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

        {isLoading ? (
          <p className="text-sm text-muted-foreground animate-pulse">Checking momentum…</p>
        ) : config ? (
          <div className="space-y-2">
            {/* Status badge */}
            <div className="flex items-center gap-2">
              <span className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${config.dotClass}`} aria-hidden="true" />
              <span className={`text-sm font-medium ${config.textClass}`}>{config.label}</span>
            </div>

            {/* Reasons */}
            {reasons.length > 0 && (
              <ul className="space-y-0.5">
                {reasons.map((reason, i) => (
                  <li key={i} className="text-xs text-muted-foreground leading-relaxed">
                    • {reason}
                  </li>
                ))}
              </ul>
            )}

            {/* Suggested focus */}
            {suggestedFocus && (
              <p className="text-xs text-foreground/70 italic">{suggestedFocus}</p>
            )}
          </div>
        ) : (
          <p className="text-sm leading-relaxed text-foreground/80">{legacyMessage}</p>
        )}

        {/* On-demand check button */}
        <button
          type="button"
          onClick={checkNow}
          disabled={isLoading}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded disabled:opacity-50"
          aria-label="Recalculate momentum"
        >
          <RefreshCw className="h-3.5 w-3.5 flex-shrink-0" aria-hidden="true" />
          <span>Check my momentum</span>
        </button>
      </DWCardContainer>
    );
  }

  // ── Legacy mode (flag off) ───────────────────────────────────────────────
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

      <p className="text-sm leading-relaxed text-foreground/80">{legacyMessage}</p>

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
