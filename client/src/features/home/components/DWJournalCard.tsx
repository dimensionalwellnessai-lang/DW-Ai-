/**
 * DWJournalCard – shows the most recent AI-generated journal entry.
 * Only rendered when the DW_INSIGHT_JOURNAL feature flag is on.
 * Empty state: prompts the user to have a conversation with DW.
 */

import { useLocation } from "wouter";
import { BookOpen, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface DWJournalCardProps {
  summary: Pick<HomeSummary, "latestJournalEntry" | "activeFollowUp">;
}

export function DWJournalCard({ summary }: DWJournalCardProps) {
  const [, navigate] = useLocation();
  const { latestJournalEntry, activeFollowUp } = summary;

  return (
    <DWCardContainer chatPrefill={
      activeFollowUp
        ? activeFollowUp.prompt
        : "I'd like to reflect on my recent conversations with you."
    }>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <BookOpen className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            DW Journal
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/journal")}
          aria-label="View journal entries"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {activeFollowUp && (
        <button
          type="button"
          onClick={() => {
            const params = new URLSearchParams();
            params.set("prefill", activeFollowUp.prompt);
            params.set("src", "followup_card");
            navigate(`/talk?${params.toString()}`);
          }}
          className="w-full text-left rounded-lg bg-primary/5 border border-primary/15 px-3 py-2 hover:bg-primary/10 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">
            DW wants to check in
          </p>
          <p className="text-sm leading-snug line-clamp-2">{activeFollowUp.prompt}</p>
        </button>
      )}

      {latestJournalEntry ? (
        <button
          type="button"
          onClick={() => navigate("/journal")}
          className="w-full text-left rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-sm font-medium leading-snug line-clamp-1">
            {latestJournalEntry.title}
          </p>
          {latestJournalEntry.story && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
              {latestJournalEntry.story}
            </p>
          )}
          <p className="text-[10px] font-semibold text-amber-600 dark:text-amber-400 mt-1.5">
            Read full entry →
          </p>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/talk")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">
            No journal entries yet — have a conversation with DW to generate your first entry
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
