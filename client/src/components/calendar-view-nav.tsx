import { useLocation } from "wouter";

/**
 * Shared Day | Week | Month segmented switcher so the three calendar
 * surfaces (/daily-schedule, /week-schedule, /calendar) feel like one
 * unified calendar experience.
 *
 * Each surface keeps its own distinct feature set:
 * - Day  → /daily-schedule (full add/edit/delete + system-linked events)
 * - Week → /week-schedule  (7-day overview grid)
 * - Month→ /calendar       (month grid; also has its own internal views)
 *
 * A redirect-based merge would drop the daily-schedule editing features,
 * so instead we render this consistent nav on all three to tie them
 * together while preserving every page's functionality.
 */
export type CalendarViewMode = "day" | "week" | "month";

const VIEW_ROUTES: Record<CalendarViewMode, string> = {
  day: "/daily-schedule",
  week: "/week-schedule",
  month: "/calendar",
};

export function CalendarViewNav({ active }: { active: CalendarViewMode }) {
  const [, setLocation] = useLocation();

  return (
    <div
      className="flex bg-muted rounded-lg p-0.5 gap-0.5"
      role="tablist"
      aria-label="Calendar view"
      data-testid="calendar-view-nav"
    >
      {(["day", "week", "month"] as CalendarViewMode[]).map((mode) => (
        <button
          key={mode}
          role="tab"
          aria-selected={active === mode}
          onClick={() => {
            if (active !== mode) setLocation(VIEW_ROUTES[mode]);
          }}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            active === mode
              ? "bg-background shadow-sm text-foreground"
              : "text-muted-foreground hover:text-foreground"
          }`}
          data-testid={`calendar-view-${mode}`}
        >
          {mode.charAt(0).toUpperCase() + mode.slice(1)}
        </button>
      ))}
    </div>
  );
}
