/**
 * FollowUpCard – shows the AI-generated follow-up prompt when available,
 * or falls back to a context-aware prompt from the DW Prompt Kit.
 */

import { useLocation } from "wouter";
import { MessageCircle, ListChecks } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { getDailyPrompt } from "@/lib/prompt-kit";
import { getSwitchStatuses } from "@/lib/switch-storage";
import { getCurrentEnergyContext } from "@/lib/energy-context";
import type { HomeSummary } from "../types";

interface FollowUpCardProps {
  summary: Pick<HomeSummary, "latestInsight" | "activeGoals" | "nextEvent" | "activeFollowUp">;
}

export function buildFollowUpPrefill(
  summary: FollowUpCardProps["summary"],
  contextPromptFallback?: string,
): string {
  if (summary.activeFollowUp) {
    return summary.activeFollowUp.prompt;
  }
  if (summary.latestInsight) {
    return `I want to follow up on something — "${summary.latestInsight.title}". What would you suggest I do next?`;
  }
  if (summary.activeGoals.length > 0) {
    return `I want to check in on my goal: "${summary.activeGoals[0].title}". How am I doing and what's my next step?`;
  }
  if (summary.nextEvent) {
    return `I have "${summary.nextEvent.title}" coming up. Help me prepare or set intentions for it.`;
  }
  return contextPromptFallback ?? "I want to check in with you today. Where should I focus my energy?";
}

export function FollowUpCard({ summary }: FollowUpCardProps) {
  const [, navigate] = useLocation();
  const hasAiFollowUp = Boolean(summary.activeFollowUp);

  let contextPrompt: ReturnType<typeof getDailyPrompt> | null = null;
  try {
    const statuses = getSwitchStatuses();
    const { energy } = getCurrentEnergyContext();
    contextPrompt = getDailyPrompt(statuses, energy);
  } catch {
    // localStorage unavailable – fall through to null
  }

  const prefill = buildFollowUpPrefill(summary, contextPrompt?.text);

  function handleOpenChat() {
    const params = new URLSearchParams();
    params.set("prefill", prefill);
    params.set("src", "home_followup_chat");
    navigate(`/talk?${params.toString()}`);
  }

  function handleActionCenter() {
    navigate("/action-center");
  }

  return (
    <DWCardContainer>
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-pink-500/10">
          <MessageCircle className="h-4 w-4 text-pink-500" />
        </div>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {hasAiFollowUp ? "DW Follow-up" : "DW check-in"}
        </p>
      </div>

      {hasAiFollowUp ? (
        <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3">
          {summary.activeFollowUp?.prompt}
        </p>
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed">
          {contextPrompt?.text ?? "Ready when you are. No agenda, no pressure — just a space to think out loud."}
        </p>
      )}

      {hasAiFollowUp ? (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleActionCenter}
            className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-2 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <ListChecks className="h-3.5 w-3.5" />
            Take action
          </button>
          <button
            type="button"
            onClick={handleOpenChat}
            className="flex-1 text-center rounded-lg bg-muted/50 text-foreground/70 text-sm font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            Talk to DW
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleOpenChat}
          className="w-full text-center rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-2 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Start a conversation →
        </button>
      )}
    </DWCardContainer>
  );
}
