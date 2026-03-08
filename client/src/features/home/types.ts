/** Shared types for the DW Home Command Center feature. */

export interface NextCalendarEvent {
  id: string;
  title: string;
  startTime: Date | null;
  isAllDay: boolean;
}

export interface ActiveGoal {
  id: string;
  title: string;
  progress?: number; // 0–100
}

export interface ActiveHabit {
  id: string;
  title: string;
  /** streak is a real field on the Habit DB row; completedToday is NOT — omitted intentionally. */
  streak?: number;
}

export interface LatestInsight {
  id: string;
  title: string;
  summary: string;
  category: string;
}

/**
 * Aggregated summary consumed by Home Command Center cards.
 * Fields are null/undefined when data is unavailable (empty state).
 */
export interface HomeSummary {
  /** Whether any data is still loading */
  isLoading: boolean;

  /** Authenticated user display name (null for guests) */
  userName: string | null;

  /** Next upcoming calendar event (null = none or loading) */
  nextEvent: NextCalendarEvent | null;

  /** Active goals from /api/goals */
  activeGoals: ActiveGoal[];

  /** Active habits from /api/habits */
  activeHabits: ActiveHabit[];

  /** Most-recent DW-generated insight */
  latestInsight: LatestInsight | null;

  /** Today's date as a friendly string */
  todayLabel: string;
}
