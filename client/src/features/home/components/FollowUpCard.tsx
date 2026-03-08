/**
 * FollowUpCard – shows the AI-generated follow-up prompt when available,
 * or falls back to a generic CTA inviting the user to check in with DW.
 */

import { useLocation } from "wouter";
import { MessageCircle } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface FollowUpCardProps {
  summary: Pick<HomeSummary, "latestInsight" | "activeGoals" | "nextEvent" | "dwFollowUp">;
}

function buildFollowUpPrefill(summary: FollowUpCardProps["summary"]): string {
  if (summary.dwFollowUp) {
    return summary.dwFollowUp.prompt;
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
  return "I want to check in with you today. Where should I focus my energy?";
}

export function FollowUpCard({ summary }: FollowUpCardProps) {
  const [, navigate] = useLocation();
  const prefill = buildFollowUpPrefill(summary);
  const hasAiFollowUp = Boolean(summary.dwFollowUp);

  function handleOpenChat() {
    const params = new URLSearchParams();
    params.set("prefill", prefill);
    params.set("src", "home_card");
    navigate(`/talk?${params.toString()}`);
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
        <p className="text-sm text-foreground/80 leading-relaxed">
          {summary.dwFollowUp?.prompt}
        </p>
      ) : (
        <p className="text-sm text-foreground/80 leading-relaxed">
          Ready when you are. No agenda, no pressure — just a space to think out loud.
        </p>
      )}

      <button
        type="button"
        onClick={handleOpenChat}
        className="w-full text-center rounded-lg bg-primary/10 text-primary text-sm font-medium px-3 py-2 hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {hasAiFollowUp ? "Explore this with DW →" : "Start a conversation →"}
      </button>
    </DWCardContainer>
  );
}
