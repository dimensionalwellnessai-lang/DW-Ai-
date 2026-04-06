/** Shared types for the DW Home Command Center feature. */

import type { MomentumStatus, ElevationCheckResult } from "@/hooks/use-elevation-engine";

export type { MomentumStatus, ElevationCheckResult };

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

export interface LatestJournalEntry {
  id: string;
  title: string;
  story: string;
  tags: string[];
  createdAt: string | Date;
}

export interface ActiveFollowUp {
  id: string;
  prompt: string;
}

export interface NutritionSnapshot {
  caloriesConsumed: number;
  caloriesTarget: number;
  proteinConsumed: number;
  proteinTarget: number;
}

export interface ScheduleBlockItem {
  id: number | string;
  title: string;
  startTime: string;
  endTime?: string;
  dayOfWeek?: number;
}

export interface CalendarEventItem {
  id: number | string;
  title: string;
  startTime: string;
  endTime?: string;
  isAllDay?: boolean;
  eventType?: string;
}

export interface RoutineItem {
  id: number | string;
  name: string;
  isActive?: boolean;
  dimensionTags?: string[];
}

export interface ProactiveCardData {
  type: string;
  title: string;
  message: string;
  why?: string;
  actionLabel?: string;
  actionPath?: string;
  priority?: "high" | "medium" | "low";
}

export interface HomeSummary {
  isLoading: boolean;
  userName: string | null;
  nextEvent: NextCalendarEvent | null;
  activeGoals: ActiveGoal[];
  activeHabits: ActiveHabit[];
  latestInsight: LatestInsight | null;
  latestJournalEntry: LatestJournalEntry | null;
  activeFollowUp: ActiveFollowUp | null;
  todayLabel: string;
  nutritionSnapshot: NutritionSnapshot | null;
  lastConversationTopic: string | null;
  momentumData: {
    status: MomentumStatus | null;
    reasons: string[];
    suggestedFocus: string | null;
    isLoading: boolean;
    checkNow: () => void;
  } | null;
  energyLevel: number | null;
  moodLevel: number | null;
  todayScheduleBlocks: ScheduleBlockItem[];
  todayEvents: CalendarEventItem[];
  proactiveCards: ProactiveCardData[];
  morningRoutines: RoutineItem[];
  eveningRoutines: RoutineItem[];
}
