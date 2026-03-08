/**
 * use-reminder-integrations.ts
 *
 * Wires the REMINDERS feature (PR #7) into the existing check-in and
 * elevation-plan flows.
 *
 * Mount this once (e.g., in App.tsx or ReminderBanner) when REMINDERS flag is ON.
 * It handles:
 *   1. Daily check-in reminder – fires if no check-in by the user's configured time.
 *   2. Elevation plan daily reminder – fires at the user's configured morning time.
 */

import { useEffect } from "react";
import { useReminders } from "@/hooks/use-reminders";

const CHECKIN_REMINDER_TIME_KEY = "dw_checkin_reminder_time";
const PLAN_REMINDER_TIME_KEY = "dw_plan_reminder_time";
const LAST_CHECKIN_REMINDER_DATE_KEY = "dw_last_checkin_reminder_date";
const LAST_PLAN_REMINDER_DATE_KEY = "dw_last_plan_reminder_date";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Build a Date for HH:MM today (or tomorrow if time has passed today). */
function buildTimeToday(hhmm: string, allowPast = false): Date {
  const [hours, minutes] = hhmm.split(":").map(Number);
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  if (!allowPast && d <= new Date()) {
    // Already passed – schedule for tomorrow
    d.setDate(d.getDate() + 1);
  }
  return d;
}

/** Read whether today's check-in already happened (guest storage key). */
function hasCheckinToday(): boolean {
  const today = todayIso();
  try {
    const raw = localStorage.getItem("dw_guest_data");
    if (!raw) return false;
    const data = JSON.parse(raw);
    const checkins: Array<{ date: string }> = data?.moodCheckins ?? [];
    return checkins.some((c) => c.date === today);
  } catch {
    return false;
  }
}

/** Read whether there's an active elevation plan (guests: elevation-storage). */
function hasActiveElevationPlan(): boolean {
  try {
    const raw = localStorage.getItem("dw_elevation_plans");
    if (!raw) return false;
    const plans: Array<{ status: string }> = JSON.parse(raw);
    return plans.some((p) => p.status === "active");
  } catch {
    return false;
  }
}

export function useReminderIntegrations() {
  const { createReminder } = useReminders();

  useEffect(() => {
    const today = todayIso();

    // ── 1. Daily check-in reminder ──────────────────────────────────────────
    const lastCheckinReminderDate = (() => {
      try { return localStorage.getItem(LAST_CHECKIN_REMINDER_DATE_KEY) ?? ""; } catch { return ""; }
    })();

    if (lastCheckinReminderDate !== today && !hasCheckinToday()) {
      const timeStr = (() => {
        try { return localStorage.getItem(CHECKIN_REMINDER_TIME_KEY) ?? "18:00"; } catch { return "18:00"; }
      })();
      const scheduledAt = buildTimeToday(timeStr);

      // Only schedule if the time hasn't already passed today
      if (scheduledAt > new Date() || scheduledAt.toDateString() !== new Date().toDateString()) {
        createReminder({
          type: "daily_checkin",
          title: "Daily check-in reminder",
          body: "Take a moment to log how you're feeling today.",
          scheduledAt,
          sourceEntityType: "daily_checkin",
          sourceEntityId: today,
        }).then(() => {
          try { localStorage.setItem(LAST_CHECKIN_REMINDER_DATE_KEY, today); } catch { /* blocked */ }
        }).catch(() => { /* ignore */ });
      }
    }

    // ── 2. Elevation plan daily reminder ───────────────────────────────────
    const lastPlanReminderDate = (() => {
      try { return localStorage.getItem(LAST_PLAN_REMINDER_DATE_KEY) ?? ""; } catch { return ""; }
    })();

    if (lastPlanReminderDate !== today && hasActiveElevationPlan()) {
      const planTimeStr = (() => {
        try { return localStorage.getItem(PLAN_REMINDER_TIME_KEY) ?? "09:00"; } catch { return "09:00"; }
      })();
      const scheduledAt = buildTimeToday(planTimeStr);

      createReminder({
        type: "plan_action",
        title: "Elevation plan reminder",
        body: "Your plan is active — check in on today's action.",
        scheduledAt,
        sourceEntityType: "elevation_plan",
        sourceEntityId: today,
      }).then(() => {
        try { localStorage.setItem(LAST_PLAN_REMINDER_DATE_KEY, today); } catch { /* blocked */ }
      }).catch(() => { /* ignore */ });
    }
    // Run once per day (not on every re-render)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Exported constant so Settings can read/write the same key. */
export { CHECKIN_REMINDER_TIME_KEY, PLAN_REMINDER_TIME_KEY };
