/**
 * DwInsightCard – shows the latest AI-generated DW Insight.
 * Gated on the JOURNAL_AUTOGEN feature flag; renders nothing when flag is off.
 */

import { useLocation } from "wouter";
import { Brain, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface DwInsightCardProps {
  summary: Pick<HomeSummary, "latestDwInsight">;
}

export function DwInsightCard({ summary }: DwInsightCardProps) {
  const [, navigate] = useLocation();
  const { latestDwInsight } = summary;

  return (
    <DWCardContainer chatPrefill={latestDwInsight ? `Tell me more about this insight: "${latestDwInsight.title}"` : undefined}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-500/10">
            <Brain className="h-4 w-4 text-violet-500" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">DW Insight</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/insights")}
          aria-label="View all DW insights"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {latestDwInsight ? (
        <div className="rounded-lg bg-muted/40 px-3 py-2 space-y-0.5">
          {latestDwInsight.theme && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-500/80 mb-0.5">
              {latestDwInsight.theme}
            </p>
          )}
          <p className="text-sm font-medium leading-snug line-clamp-2">{latestDwInsight.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-3">{latestDwInsight.summary}</p>
          {latestDwInsight.tags && latestDwInsight.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {latestDwInsight.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600 dark:text-violet-400"
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
            No insights yet — chat with DW and insights will be generated automatically
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
