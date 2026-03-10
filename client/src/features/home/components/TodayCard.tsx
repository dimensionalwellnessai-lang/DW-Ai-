/**
 * TodayCard – always-expanded anchor card on the Home Command Center.
 *
 * Shows today's date, the next calendar event (or mock placeholder),
 * and two primary CTAs: "Open Calendar" and "Chat with DW".
 *
 * This card is NEVER collapsed; it is always the top card on Home.
 */

import { useLocation } from "wouter";
import { CalendarDays } from "lucide-react";
import { DWCardContainer } from "./DWCardContainer";
import { MOCK_HOME_DATA } from "../homeData";
import type { HomeSummary } from "../types";

interface TodayCardProps {
  summary: Pick<HomeSummary, "todayLabel" | "nextEvent">;
}

export function TodayCard({ summary }: TodayCardProps) {
  const [, navigate] = useLocation();
  const { todayLabel, nextEvent } = summary;

  const mock = MOCK_HOME_DATA.today;

  // Prefer real event; fall back to mock for non-empty display
  const displayEvent = nextEvent
    ? { title: nextEvent.title, time: formatEventTime(nextEvent.startTime, nextEvent.isAllDay) }
    : { title: mock.nextEvent.title, time: mock.nextEvent.time };

  function formatEventTime(startTime: Date | null, isAllDay: boolean): string {
    if (isAllDay || !startTime) return "All day";
    return startTime.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }

  function handleChatWithDW() {
    const params = new URLSearchParams();
    params.set("prefill", "Help me plan my day today");
    params.set("src", "home_today_card");
    params.set("context", "today");
    navigate(`/talk?${params.toString()}`);
  }

  return (
    <DWCardContainer>
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-blue-500/10">
          <CalendarDays className="h-4 w-4 text-blue-500" aria-hidden="true" />
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Today</p>
          <p className="text-sm font-medium">{todayLabel}</p>
        </div>
      </div>

      {/* Key details */}
      <div className="space-y-1.5">
        <div className="rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-0.5">
            Next up
          </p>
          <p className="text-sm font-medium leading-snug line-clamp-1">{displayEvent.title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{displayEvent.time}</p>
        </div>

        {/* Priority and workout: derived from mock data in this PR.
            TODO: source from HomeSummary once API fields are available. */}
        <div className="rounded-lg bg-muted/30 px-3 py-1.5">
          <p className="text-xs text-foreground/70 line-clamp-1">
            <span className="font-medium">Priority:</span> {mock.priority}
          </p>
        </div>

        {mock.workoutStatus && (
          <div className="rounded-lg bg-muted/30 px-3 py-1.5">
            <p className="text-xs text-foreground/70">{mock.workoutStatus}</p>
          </div>
        )}
      </div>

      {/* CTAs */}
      <div className="flex gap-2 pt-0.5">
        <button
          type="button"
          onClick={() => navigate("/calendar")}
          className="flex-1 text-center rounded-lg bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs font-medium px-3 py-2 hover:bg-blue-500/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          Open Calendar
        </button>
        <button
          type="button"
          onClick={handleChatWithDW}
          className="flex-1 text-center rounded-lg bg-muted/60 text-foreground/70 text-xs font-medium px-3 py-2 hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Chat with DW
        </button>
      </div>
    </DWCardContainer>
  );
}
