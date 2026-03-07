/**
 * TodayCard – shows today's date and the next upcoming calendar event.
 * Empty state: prompt to add an event or chat with DW.
 */

import { useLocation } from "wouter";
import { CalendarDays, ChevronRight } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import type { HomeSummary } from "../types";

interface TodayCardProps {
  summary: Pick<HomeSummary, "todayLabel" | "nextEvent">;
}

export function TodayCard({ summary }: TodayCardProps) {
  const [, navigate] = useLocation();
  const { todayLabel, nextEvent } = summary;

  function formatEventTime(startTime: Date | null, isAllDay: boolean): string {
    if (isAllDay || !startTime) return "All day";
    return startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  return (
    <DWCardContainer chatPrefill="Help me plan my day today">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-500/10">
            <CalendarDays className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
            <p className="text-sm font-medium">{todayLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate("/calendar")}
          aria-label="Open calendar"
          className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </div>

      {nextEvent ? (
        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="w-full text-left rounded-lg bg-muted/40 px-3 py-2 hover:bg-muted/70 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            Next up
          </p>
          <p className="text-sm font-medium leading-snug line-clamp-1">{nextEvent.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {formatEventTime(nextEvent.startTime, nextEvent.isAllDay)}
          </p>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="w-full text-left rounded-lg border border-dashed border-border/60 px-3 py-2 hover:bg-muted/30 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <p className="text-xs text-muted-foreground">No upcoming events — tap to add one</p>
        </button>
      )}
    </DWCardContainer>
  );
}
