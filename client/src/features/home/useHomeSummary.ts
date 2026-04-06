/**
 * useHomeSummary – client-side aggregator for the DW Home Command Center.
 *
 * Pulls data from existing app sources (calendar API, goals API, habits API,
 * insights hook, auth) and returns a single HomeSummary object so card
 * components don't have to fetch from many places directly.
 *
 * Real data only – no fake or mock values.
 */

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { useInsights } from "@/hooks/use-insights";
import { useDwIntelligence } from "@/hooks/use-dw-intelligence";
import { useElevationEngine } from "@/hooks/use-elevation-engine";
import { getCalendarEvents } from "@/lib/guest-storage";
import { getQueryFn, STALE_TIME } from "@/lib/queryClient";
import { isFeatureEnabled } from "@/config/featureFlags";
import type { HomeSummary, NextCalendarEvent, ActiveGoal, ActiveHabit, LatestInsight, LatestJournalEntry, ActiveFollowUp, NutritionSnapshot, ScheduleBlockItem, CalendarEventItem, RoutineItem, ProactiveCardData } from "./types";
import type { Habit, Goal, MoodLog, ScheduleBlock, Routine } from "@shared/schema";
import { COPY } from "@/copy/en";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function findNextEvent(events: Array<Record<string, unknown>>): NextCalendarEvent | null {
  if (!Array.isArray(events) || events.length === 0) return null;

  const now = Date.now();

  // Only consider events that have a startTime so we can sort and compare them
  // to find the next upcoming timed event.
  const timedEvents = events.filter((e) => e.startTime);
  const upcoming = timedEvents
    .map((e) => ({ e, t: new Date(e.startTime as string).getTime() }))
    .filter(({ t }) => t >= now)
    .sort((a, b) => a.t - b.t);

  if (upcoming.length === 0) return null;

  const { e } = upcoming[0];
  return {
    id: String(e.id ?? e.localId ?? ""),
    title: String(e.title ?? "Untitled event"),
    startTime: new Date(e.startTime as string),
    isAllDay: Boolean(e.isAllDay),
  };
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useHomeSummary(): HomeSummary {
  // Auth user info — uses returnNull on 401 so guests don't cause an error state.
  const { user, isLoading: authLoading } = useAuth();
  const isLoggedIn = Boolean(user);
  const dwInsightJournalEnabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");

  // Calendar events – auth users use the API; guests fall back to localStorage.
  const { data: dbEvents = [], isLoading: eventsLoading } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/api/calendar"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
  });

  // Goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<Goal[]>({
    queryKey: ["/api/goals"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
  });

  // Habits – NOTE: /api/habits returns plain Habit rows (no completedToday field).
  // Completion is recorded separately via POST /api/habits/:id/log; we intentionally
  // do NOT map a completedToday field to avoid always-false values in the UI.
  const { data: habits = [], isLoading: habitsLoading } = useQuery<Habit[]>({
    queryKey: ["/api/habits"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
  });

  // Insights (works for both auth + guest)
  const { insights } = useInsights();

  // Elevation Engine (flag-gated, auth only)
  const elevation = useElevationEngine();

  const { data: mealLogs = [] } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/api/meal-logs"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  const { data: latestDwJournal } = useQuery<Record<string, unknown> | null>({
    queryKey: ["/api/dw/latestJournal"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  const { data: dwFollowups = [] } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/api/dw/followups"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  const { data: moodData } = useQuery<MoodLog | null>({
    queryKey: ["/api/mood/today"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  const { data: scheduleBlocks = [] } = useQuery<ScheduleBlock[]>({
    queryKey: ["/api/schedule"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  const { data: routines = [] } = useQuery<Routine[]>({
    queryKey: ["/api/routines"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn,
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  // ── Derived values ─────────────────────────────────────────────────────────

  const allEvents: Array<Record<string, unknown>> = useMemo(() => {
    if (isLoggedIn) return dbEvents;
    // Guest: use localStorage calendar events
    try {
      // Cast to the generic record shape used by findNextEvent
      return getCalendarEvents() as Array<Record<string, unknown>>;
    } catch {
      return [];
    }
  }, [isLoggedIn, dbEvents]);

  const nextEvent = useMemo(() => findNextEvent(allEvents), [allEvents]);

  const activeGoals: ActiveGoal[] = useMemo(() => {
    return goals
      .filter((g) => g.isActive !== false)
      .map((g) => ({
        id: String(g.id ?? ""),
        title: String(g.title ?? ""),
        progress: typeof (g as Record<string, unknown>).progress === "number"
          ? (g as Record<string, unknown>).progress as number
          : undefined,
      }));
  }, [goals]);

  const activeHabits: ActiveHabit[] = useMemo(() => {
    return habits
      .filter((h) => h.isActive !== false)
      .map((h) => ({
        id: String(h.id ?? ""),
        title: String(h.title ?? ""),
        streak: typeof h.streak === "number" ? h.streak : undefined,
      }));
  }, [habits]);

  const latestInsight: LatestInsight | null = useMemo(() => {
    if (!insights || insights.length === 0) return null;
    // Most recent first
    const sorted = [...insights].sort((a, b) => b.createdAt - a.createdAt);
    const top = sorted[0];
    return {
      id: top.id,
      title: top.title,
      summary: top.summary,
      category: String(top.category ?? ""),
    };
  }, [insights]);

  const latestJournalEntry: LatestJournalEntry | null = useMemo(() => {
    if (!dwInsightJournalEnabled || !latestDwJournal) return null;
    return {
      id: String(latestDwJournal.id ?? ""),
      title: String(latestDwJournal.title ?? ""),
      story: String(latestDwJournal.story ?? ""),
      tags: Array.isArray(latestDwJournal.tags) ? (latestDwJournal.tags as string[]) : [],
      createdAt: String(latestDwJournal.createdAt ?? new Date().toISOString()),
    };
  }, [dwInsightJournalEnabled, latestDwJournal]);

  const activeFollowUp: ActiveFollowUp | null = useMemo(() => {
    if (!dwInsightJournalEnabled || !Array.isArray(dwFollowups) || dwFollowups.length === 0) return null;
    const first = dwFollowups[0];
    return {
      id: String(first.id ?? ""),
      prompt: String(first.prompt ?? ""),
    };
  }, [dwInsightJournalEnabled, dwFollowups]);

  const nutritionSnapshot: NutritionSnapshot | null = useMemo(() => {
    if (!Array.isArray(mealLogs) || mealLogs.length === 0) return null;
    const today = new Date().toISOString().slice(0, 10);
    const todayLogs = mealLogs.filter((m) => {
      const d = String(m.date ?? m.createdAt ?? "").slice(0, 10);
      return d === today;
    });
    if (todayLogs.length === 0) return null;
    let cal = 0;
    let pro = 0;
    for (const m of todayLogs) {
      cal += Number(m.calories ?? 0);
      pro += Number(m.protein ?? 0);
    }
    return { caloriesConsumed: cal, caloriesTarget: 2100, proteinConsumed: pro, proteinTarget: 150 }; // defaults until user sets targets
  }, [mealLogs]);

  const lastConversationTopic: string | null = useMemo(() => {
    if (latestJournalEntry) return latestJournalEntry.title;
    if (latestInsight) return latestInsight.title;
    if (activeFollowUp) return activeFollowUp.prompt;
    return null;
  }, [latestJournalEntry, latestInsight, activeFollowUp]);

  const energyLevel = (moodData as Record<string, unknown> | null | undefined)?.energyLevel as number | null ?? null;
  const moodLevel = (moodData as Record<string, unknown> | null | undefined)?.moodLevel as number | null ?? null;

  const todayScheduleBlocks: ScheduleBlockItem[] = useMemo(() => {
    const dayOfWeek = new Date().getDay();
    return (scheduleBlocks as Array<Record<string, unknown>>)
      .filter((b) => b.dayOfWeek === dayOfWeek)
      .map((b) => ({
        id: b.id as number | string,
        title: String(b.title ?? ""),
        startTime: String(b.startTime ?? ""),
        endTime: b.endTime ? String(b.endTime) : undefined,
        dayOfWeek: b.dayOfWeek as number,
      }));
  }, [scheduleBlocks]);

  const todayCalendarEvents: CalendarEventItem[] = useMemo(() => {
    const now = new Date();
    const localTodayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    return allEvents
      .filter((e) => {
        const st = String(e.startTime ?? "");
        if (st.includes("T") || st.includes("-")) {
          const d = new Date(st);
          if (isNaN(d.getTime())) return false;
          const localStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
          return localStr === localTodayStr;
        }
        return true;
      })
      .map((e) => ({
        id: e.id as number | string ?? "",
        title: String(e.title ?? ""),
        startTime: String(e.startTime ?? ""),
        endTime: e.endTime ? String(e.endTime) : undefined,
        isAllDay: Boolean(e.isAllDay),
        eventType: e.eventType ? String(e.eventType) : undefined,
      }));
  }, [allEvents]);

  const morningRoutinesList: RoutineItem[] = useMemo(() => {
    return (routines as Array<Record<string, unknown>>)
      .filter((r) => {
        const tags = (r.dimensionTags as string[]) || [];
        const name = String(r.name ?? "").toLowerCase();
        return r.isActive !== false && (tags.includes("morning") || name.includes("morning"));
      })
      .map((r) => ({
        id: r.id as number | string,
        name: String(r.name ?? ""),
        isActive: r.isActive as boolean,
        dimensionTags: r.dimensionTags as string[],
      }));
  }, [routines]);

  const eveningRoutinesList: RoutineItem[] = useMemo(() => {
    return (routines as Array<Record<string, unknown>>)
      .filter((r) => {
        const tags = (r.dimensionTags as string[]) || [];
        const name = String(r.name ?? "").toLowerCase();
        return r.isActive !== false && (tags.includes("evening") || tags.includes("wind-down") || name.includes("wind") || name.includes("evening"));
      })
      .map((r) => ({
        id: r.id as number | string,
        name: String(r.name ?? ""),
        isActive: r.isActive as boolean,
        dimensionTags: r.dimensionTags as string[],
      }));
  }, [routines]);

  const proactiveCards: ProactiveCardData[] = useMemo(() => {
    const cards: ProactiveCardData[] = [];
    const hour = new Date().getHours();
    const hasLifeSystem = allEvents.length > 5;

    if (hour >= 5 && hour < 12 && !moodData) {
      cards.push({
        type: "morning-briefing",
        title: COPY.proactiveCards.morningTitle,
        message: COPY.proactiveCards.morningMessage,
        why: COPY.proactiveCards.morningWhy,
        actionLabel: "Check in",
        actionPath: "/weekly-checkin",
        priority: "high",
      });
    }

    if (energyLevel !== null && energyLevel <= 4) {
      cards.push({
        type: "energy-suggestion",
        title: COPY.proactiveCards.energyTitle,
        message: COPY.proactiveCards.energyMessage,
        why: COPY.proactiveCards.energyWhy,
        actionLabel: "See options",
        actionPath: "/recovery",
      });
    }

    // Life-system aware: if user has imported their schedule, offer to discuss body goals
    if (hasLifeSystem && activeGoals.length === 0) {
      cards.push({
        type: "goal-reminder",
        title: "Your life system is ready",
        message: "You have a full week imported — ready to set some goals around your body, workouts, or nutrition?",
        why: "Having clear goals connected to your schedule makes them much easier to stick to.",
        actionLabel: "Talk about body goals",
        actionPath: "/talk?topic=Help+me+set+goals+based+on+my+life+system",
        priority: "medium",
      });
    } else if (activeGoals.length > 0 && todayScheduleBlocks.length === 0 && todayCalendarEvents.length === 0) {
      cards.push({
        type: "goal-reminder",
        title: COPY.proactiveCards.goalTitle,
        message: COPY.proactiveCards.goalMessage,
        why: COPY.proactiveCards.goalWhy,
        actionLabel: "Get suggestions",
        actionPath: "/talk",
      });
    }

    // Meal time suggestions
    if (hour >= 6 && hour < 9) {
      cards.push({
        type: "meal-suggestion",
        title: "Breakfast time",
        message: hasLifeSystem
          ? "Your life system has breakfast planned — check your calendar for today's meal."
          : "Start your day right. Get a quick breakfast idea that fits your goals.",
        actionLabel: hasLifeSystem ? "View calendar" : "Get breakfast idea",
        actionPath: hasLifeSystem ? "/calendar" : "/meal-prep",
      });
    } else if (hour >= 11 && hour < 13) {
      cards.push({
        type: "meal-suggestion",
        title: "Almost lunch",
        message: "See what you have planned for lunch today, or get a quick idea from DW.",
        actionLabel: "View meal plans",
        actionPath: "/meal-prep",
      });
    }

    // Workout reminder based on time of day
    if (hour >= 17 && hour < 19 && hasLifeSystem) {
      cards.push({
        type: "workout-suggestion",
        title: "Workout window",
        message: "Your life system puts your workout around this time. Ready to get started?",
        actionLabel: "Open Workout Hub",
        actionPath: "/workout",
      });
    }

    if (hour >= 18 && hour < 22) {
      cards.push({
        type: "wind-down",
        title: COPY.proactiveCards.windDownTitle,
        message: COPY.proactiveCards.windDownMessage,
        why: COPY.proactiveCards.windDownWhy,
        actionLabel: "Wind down",
        actionPath: "/routines",
      });
    }

    return cards;
  }, [moodData, energyLevel, activeGoals.length, todayScheduleBlocks.length, todayCalendarEvents.length, allEvents.length]);

  const isLoading = authLoading || eventsLoading || goalsLoading || habitsLoading;

  return {
    isLoading,
    userName: user?.firstName ?? user?.systemName ?? user?.username ?? null,
    nextEvent,
    activeGoals,
    activeHabits,
    latestInsight,
    latestJournalEntry,
    activeFollowUp,
    todayLabel: buildTodayLabel(),
    nutritionSnapshot,
    lastConversationTopic,
    momentumData: elevation.enabled && isLoggedIn
      ? {
          status: elevation.status,
          reasons: elevation.reasons,
          suggestedFocus: elevation.suggestedFocus,
          isLoading: elevation.isLoading,
          checkNow: elevation.checkNow,
        }
      : null,
    energyLevel,
    moodLevel,
    todayScheduleBlocks,
    todayEvents: todayCalendarEvents,
    proactiveCards,
    morningRoutines: morningRoutinesList,
    eveningRoutines: eveningRoutinesList,
  };
}

