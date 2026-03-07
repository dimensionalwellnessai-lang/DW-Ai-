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
import { useInsights } from "@/hooks/use-insights";
import { getCalendarEvents } from "@/lib/guest-storage";
import type { HomeSummary, NextCalendarEvent, ActiveGoal, ActiveHabit, LatestInsight } from "./types";

// ─── helpers ─────────────────────────────────────────────────────────────────

function buildTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function findNextEvent(events: any[]): NextCalendarEvent | null {
  if (!Array.isArray(events) || events.length === 0) return null;

  const now = Date.now();

  // Local guest events (from localStorage) don't have startTime; skip them for
  // "next event" because they have no time to sort/compare with.
  const timedEvents = events.filter((e: any) => e.startTime);
  const upcoming = timedEvents
    .map((e: any) => ({ e, t: new Date(e.startTime).getTime() }))
    .filter(({ t }) => t >= now)
    .sort((a, b) => a.t - b.t);

  if (upcoming.length === 0) return null;

  const { e } = upcoming[0];
  return {
    id: String(e.id ?? e.localId ?? ""),
    title: String(e.title ?? "Untitled event"),
    startTime: new Date(e.startTime),
    isAllDay: Boolean(e.isAllDay),
  };
}

// ─── hook ─────────────────────────────────────────────────────────────────────

export function useHomeSummary(): HomeSummary {
  // Auth user info
  const { data: authData, isLoading: authLoading } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const user = authData?.user ?? null;
  const isLoggedIn = Boolean(user);

  // Calendar events – auth users use the API; guests fall back to localStorage.
  const { data: dbEvents = [], isLoading: eventsLoading } = useQuery<any[]>({
    queryKey: ["/api/calendar"],
    // Disable network fetch for guests; we'll merge with local below.
    enabled: isLoggedIn,
    retry: false,
  });

  // Goals
  const { data: goals = [], isLoading: goalsLoading } = useQuery<any[]>({
    queryKey: ["/api/goals"],
    enabled: isLoggedIn,
    retry: false,
  });

  // Habits
  const { data: habits = [], isLoading: habitsLoading } = useQuery<any[]>({
    queryKey: ["/api/habits"],
    enabled: isLoggedIn,
    retry: false,
  });

  // Insights (works for both auth + guest)
  const { insights } = useInsights();

  // ── Derived values ─────────────────────────────────────────────────────────

  const allEvents: any[] = useMemo(() => {
    if (isLoggedIn) return dbEvents;
    // Guest: use localStorage calendar events
    try {
      return getCalendarEvents();
    } catch {
      return [];
    }
  }, [isLoggedIn, dbEvents]);

  const nextEvent = useMemo(() => findNextEvent(allEvents), [allEvents]);

  const activeGoals: ActiveGoal[] = useMemo(() => {
    return (goals as any[])
      .filter((g: any) => g.isActive !== false)
      .map((g: any) => ({
        id: String(g.id ?? ""),
        title: String(g.title ?? ""),
        progress: typeof g.progress === "number" ? g.progress : undefined,
      }));
  }, [goals]);

  const activeHabits: ActiveHabit[] = useMemo(() => {
    return (habits as any[])
      .filter((h: any) => h.isActive !== false)
      .map((h: any) => ({
        id: String(h.id ?? ""),
        title: String(h.title ?? ""),
        completedToday: Boolean(h.completedToday),
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

  const isLoading = authLoading || eventsLoading || goalsLoading || habitsLoading;

  return {
    isLoading,
    userName: user?.name ?? user?.email ?? null,
    nextEvent,
    activeGoals,
    activeHabits,
    latestInsight,
    todayLabel: buildTodayLabel(),
  };
}
