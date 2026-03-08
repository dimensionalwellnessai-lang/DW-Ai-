/**
 * DwJournalCard – shows the latest AI-generated DW Journal entry.
 * Gated on the JOURNAL_AUTOGEN feature flag; renders nothing when flag is off.
 */

import { useLocation } from "wouter";
import { BookOpen, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface DwJournalCardProps {
  summary: Pick<HomeSummary, "latestDwJournal">;
}

export function DwJournalCard({ summary }: DwJournalCardProps) {
  const [, navigate] = useLocation();
  const { latestDwJournal } = summary;

  return (
    <DWCardContainer chatPrefill={latestDwJournal ? `I'd like to reflect on this journal entry: "${latestDwJournal.title}"` : undefined}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-500/10">
            <BookOpen className="h-4 w-4 text-amber-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">DW Journal</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/journal")}
          aria-label="View journal"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {latestDwJournal ? (
        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-0.5">
          <p className="text-sm font-medium leading-snug line-clamp-2">{latestDwJournal.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-4 italic">{latestDwJournal.story}</p>
          {latestDwJournal.tags && latestDwJournal.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {latestDwJournal.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/talk")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">
            No journal entries yet — chat with DW and a personal journal entry will be created automatically
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
