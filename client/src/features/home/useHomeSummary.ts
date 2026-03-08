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
import { getCalendarEvents } from "@/lib/guest-storage";
import { getQueryFn } from "@/lib/queryClient";
import { isFeatureEnabled } from "@/config/featureFlags";
import type { HomeSummary, NextCalendarEvent, ActiveGoal, ActiveHabit, LatestInsight, LatestJournalEntry, ActiveFollowUp } from "./types";
import type { Habit, Goal } from "@shared/schema";

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

  // DW Insight + Journal Intelligence System (flag-gated, auth only)
  const { data: latestDwJournal } = useQuery<Record<string, unknown> | null>({
    queryKey: ["/api/dw/latestJournal"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
  });

  const { data: dwFollowups = [] } = useQuery<Array<Record<string, unknown>>>({
    queryKey: ["/api/dw/followups"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && dwInsightJournalEnabled,
    retry: false,
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

  const isLoading = authLoading || eventsLoading || goalsLoading || habitsLoading;

  return {
    isLoading,
    userName: user?.firstName ?? user?.systemName ?? user?.email ?? null,
    nextEvent,
    activeGoals,
    activeHabits,
    latestInsight,
    latestJournalEntry,
    activeFollowUp,
    todayLabel: buildTodayLabel(),
  };
}

