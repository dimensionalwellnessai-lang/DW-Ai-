/**
 * InsightSnapshotCard – shows the most recent DW-generated insight.
 * Empty state: prompt to start a conversation and capture an insight.
 */

import { useLocation } from "wouter";
import { Sparkles, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface InsightSnapshotCardProps {
  summary: Pick<HomeSummary, "latestInsight">;
}

export function InsightSnapshotCard({ summary }: InsightSnapshotCardProps) {
  const [, navigate] = useLocation();
  const { latestInsight } = summary;

  return (
    <DWCardContainer chatPrefill="What insights have you captured from our conversations so far?">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">DW Insights</p>
        </div>
        <button
          type="button"
          onClick={() => navigate("/insights")}
          aria-label="View all insights"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {latestInsight ? (
        <button
          type="button"
          onClick={() => {
            try {
              if (typeof window !== "undefined" && window.sessionStorage) {
                window.sessionStorage.setItem(
                  `dwInsight:${latestInsight.id}`,
                  JSON.stringify(latestInsight)
                );
              }
            } catch {
              // sessionStorage unavailable
            }
            const params = new URLSearchParams();
            params.set("insightId", latestInsight.id);
            navigate(`/talk?${params.toString()}`);
          }}
          className="w-full text-left rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            {latestInsight.category}
          </p>
          <p className="text-sm font-medium leading-snug line-clamp-2">{latestInsight.title}</p>
          {latestInsight.summary && (
            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{latestInsight.summary}</p>
          )}
          <p className="text-[10px] font-semibold text-primary mt-1.5">Continue with DW →</p>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/talk")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">
            No insights yet — start a conversation with DW to capture your first one
          </p>
        </button>
      )}
    </DWCardContainer>
  );
}
