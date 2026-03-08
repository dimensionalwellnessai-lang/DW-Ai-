/**
 * use-reminder-integrations.ts
 *
 * Wires the REMINDERS feature (PR #7) into the existing check-in and
 * elevation-plan flows.
 *
 * Mount this once (e.g., in ReminderBanner) with the enabled flag.
 * It handles:
 *   1. Daily check-in reminder – fires if no check-in by the user's configured time.
 *   2. Elevation plan daily reminder – fires at the user's configured morning time.
 */

import { useEffect, useRef } from "react";
import { useReminders } from "@/hooks/use-reminders";
import { useAuth } from "@/hooks/use-auth";
import type { CreateReminderInput } from "@/hooks/use-reminders";

const CHECKIN_REMINDER_TIME_KEY = "dw_checkin_reminder_time";
const PLAN_REMINDER_TIME_KEY = "dw_plan_reminder_time";
const LAST_CHECKIN_REMINDER_DATE_KEY = "dw_last_checkin_reminder_date";
const LAST_PLAN_REMINDER_DATE_KEY = "dw_last_plan_reminder_date";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build a Date for HH:MM today (or tomorrow if time has passed today). */
function buildTimeToday(hhmm: string): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (d <= new Date()) {
    // Already passed – schedule for tomorrow
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/**
 * Read whether today's check-in already happened.
 * - Guests: check dw_guest_data.moodCheckins in localStorage.
 * - Auth users: GET /api/mood/today (async fetch, no UI blocking).
 */
async function hasCheckinToday(isLoggedIn: boolean): Promise<boolean> {
  const today = todayIso();

  // 1) Guest mode: localStorage-based check
  try {
    const raw = localStorage.getItem("dw_guest_data");
    if (raw) {
      const data = JSON.parse(raw);
      const checkins: Array<{ date: string }> = data?.moodCheckins ?? [];
      if (checkins.some((c) => c.date === today)) return true;
    }
  } catch {
    // Ignore localStorage/JSON errors
  }

  // 2) Auth users: async server check
  if (isLoggedIn) {
    try {
      const res = await fetch("/api/mood/today", { credentials: "include" });
      if (res.ok) return true;
    } catch {
      // Network error – treat as "not checked in"
    }
  }

  return false;
}

/**
 * Read whether there's an active elevation plan.
 * - Guests: check localStorage.
 * - Auth users: GET /api/elevation-plans/active (async fetch, no UI blocking).
 */
async function hasActiveElevationPlan(isLoggedIn: boolean): Promise<boolean> {
  // Guest path
  try {
    const raw = localStorage.getItem("dw_elevation_plans");
    if (raw) {
      const plans: Array<{ status: string }> = JSON.parse(raw);
      if (plans.some((p) => p.status === "active")) return true;
    }
  } catch {
    // ignore
  }

  // Auth path
  if (isLoggedIn) {
    try {
      const res = await fetch("/api/elevation-plans/active", { credentials: "include" });
      if (res.ok) {
        const body = await res.json();
        return Boolean(body?.plan?.id);
      }
    } catch {
      // Network or parse error – assume no plan
    }
  }

  return false;
}

export function useReminderIntegrations(enabled: boolean) {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const { createReminder } = useReminders();

  // Capture the latest createReminder in a ref so the effect only runs once
  // per day (on mount) while still using the up-to-date function reference.
  const createReminderRef = useRef(createReminder);
  useEffect(() => {
    createReminderRef.current = createReminder;
  });

  useEffect(() => {
    if (!enabled) return;

    // Convenience alias pointing at the stable ref
    const create = (input: CreateReminderInput) => createReminderRef.current(input);
    const today = todayIso();

    // ── 1. Daily check-in reminder ──────────────────────────────────────────
    const lastCheckinReminderDate = (() => {
      try { return localStorage.getItem(LAST_CHECKIN_REMINDER_DATE_KEY) ?? ""; } catch { return ""; }
    })();

    if (lastCheckinReminderDate !== today) {
      const timeStr = (() => {
        try { return localStorage.getItem(CHECKIN_REMINDER_TIME_KEY) ?? "18:00"; } catch { return "18:00"; }
      })();
      const scheduledAt = buildTimeToday(timeStr);

      // Only schedule if the reminder time is still in the future
      if (scheduledAt > new Date()) {
        hasCheckinToday(isLoggedIn).then((alreadyDone) => {
          if (alreadyDone) return;
          return create({
            type: "daily_checkin",
            title: "Daily check-in reminder",
            body: "Take a moment to log how you're feeling today.",
            scheduledAt,
            sourceEntityType: "daily_checkin",
            sourceEntityId: today,
          }).then(() => {
            try { localStorage.setItem(LAST_CHECKIN_REMINDER_DATE_KEY, today); } catch { /* blocked */ }
          });
        }).catch(() => { /* ignore */ });
      }
    }

    // ── 2. Elevation plan daily reminder ───────────────────────────────────
    const lastPlanReminderDate = (() => {
      try { return localStorage.getItem(LAST_PLAN_REMINDER_DATE_KEY) ?? ""; } catch { return ""; }
    })();

    if (lastPlanReminderDate !== today) {
      const planTimeStr = (() => {
        try { return localStorage.getItem(PLAN_REMINDER_TIME_KEY) ?? "09:00"; } catch { return "09:00"; }
      })();
      const scheduledAt = buildTimeToday(planTimeStr);

      hasActiveElevationPlan(isLoggedIn).then((hasActive) => {
        if (!hasActive) return;
        return create({
          type: "plan_action",
          title: "Elevation plan reminder",
          body: "Your plan is active — check in on today's action.",
          scheduledAt,
          sourceEntityType: "elevation_plan",
          sourceEntityId: today,
        }).then(() => {
          try { localStorage.setItem(LAST_PLAN_REMINDER_DATE_KEY, today); } catch { /* blocked */ }
        });
      }).catch(() => { /* ignore */ });
    }
    // Run once per day (on mount only)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);
}

/** Exported constants so Settings can read/write the same keys. */
export { CHECKIN_REMINDER_TIME_KEY, PLAN_REMINDER_TIME_KEY };
