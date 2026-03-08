/**
 * reminder-scheduler.ts
 *
 * Client-side timer-based scheduler for the Reminders feature (PR #7).
 *
 * When the app is open, this module fires in-app callbacks and optional
 * browser Notification API notifications when a reminder becomes due.
 *
 * NOTE: When the app is closed, delivery is NOT guaranteed (documented in UI).
 */

type OnDueCallback = (reminder: { id: string; title: string; body?: string | null }) => void;

const timers = new Map<string, ReturnType<typeof setTimeout>>();
let globalOnDue: OnDueCallback | null = null;

/**
 * Register a global callback that fires whenever a scheduled reminder fires.
 */
export function onReminderDue(cb: OnDueCallback): () => void {
  globalOnDue = cb;
  return () => {
    if (globalOnDue === cb) globalOnDue = null;
  };
}

/**
 * Schedule a single reminder timer.
 * Replaces any existing timer for the same id.
 */
export function scheduleReminderTimer(reminder: {
  id: string;
  title: string;
  body?: string | null;
  scheduledAt: string;
}): void {
  // Cancel any existing timer
  clearReminderTimer(reminder.id);

  const fireAt = new Date(reminder.scheduledAt).getTime();
  const delay = fireAt - Date.now();

  if (delay <= 0) {
    // Already due – fire immediately
    fireReminder(reminder);
    return;
  }

  // Max safe setTimeout is ~24.8 days. For far-future reminders, schedule a
  // chunked timeout that re-checks whether the reminder is actually due before
  // firing, and re-schedules itself if not.
  const MAX_TIMEOUT = 2_147_483_647; // ~24.8 days
  const effectiveDelay = Math.min(delay, MAX_TIMEOUT);
  const timer = setTimeout(() => {
    const remaining = new Date(reminder.scheduledAt).getTime() - Date.now();
    if (remaining <= 0) {
      // Due now (or overdue) – fire
      fireReminder(reminder);
    } else {
      // Still in the future (chunked re-schedule)
      scheduleReminderTimer(reminder);
    }
  }, effectiveDelay);
  timers.set(reminder.id, timer);
}

/**
 * Cancel the in-memory timer for a specific reminder id.
 */
export function clearReminderTimer(id: string): void {
  const existing = timers.get(id);
  if (existing !== undefined) {
    clearTimeout(existing);
    timers.delete(id);
  }
}

/**
 * Re-schedule all timers from a list of reminders (e.g., on app open or
 * after fetching the list from the server).
 * Clears all previously scheduled timers first.
 */
export function rescheduleAll(
  scheduledReminders: Array<{
    id: string;
    title: string;
    body?: string | null;
    scheduledAt: string;
    status: string;
  }>
): void {
  // Clear stale timers whose reminders are no longer in the list
  const ids = new Set(scheduledReminders.map((r) => r.id));
  for (const id of timers.keys()) {
    if (!ids.has(id)) clearReminderTimer(id);
  }

  // (Re-)schedule active ones
  for (const r of scheduledReminders) {
    if (r.status === "scheduled") {
      scheduleReminderTimer(r);
    } else {
      clearReminderTimer(r.id);
    }
  }
}

// ── Internal ──────────────────────────────────────────────────────────────────

function fireReminder(reminder: {
  id: string;
  title: string;
  body?: string | null;
}): void {
  timers.delete(reminder.id);

  // In-app callback
  globalOnDue?.(reminder);

  // Browser notification (if permission granted)
  fireBrowserNotification(reminder);
}

function fireBrowserNotification(reminder: {
  id: string;
  title: string;
  body?: string | null;
}): void {
  if (typeof Notification === "undefined") return;
  if (Notification.permission !== "granted") return;

  // Respect the app-level preference (user can disable without revoking browser permission)
  try {
    if (localStorage.getItem("dw_browser_notif_enabled") === "false") return;
  } catch {
    // Blocked storage – proceed
  }

  // Prefer Service Worker notification for reliability; fall back to plain Notification
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) =>
        reg.showNotification(reminder.title, {
          body: reminder.body ?? undefined,
          icon: "/icon-192.png",
          badge: "/icon-192.png",
          tag: `reminder-${reminder.id}`,
          data: { reminderId: reminder.id },
        })
      )
      .catch(() => {
        // Service worker unavailable – fall back
        try {
          new Notification(reminder.title, {
            body: reminder.body ?? undefined,
            icon: "/icon-192.png",
            tag: `reminder-${reminder.id}`,
          });
        } catch {
          // Some environments block Notification constructor
        }
      });
  } else {
    try {
      new Notification(reminder.title, {
        body: reminder.body ?? undefined,
        icon: "/icon-192.png",
        tag: `reminder-${reminder.id}`,
      });
    } catch {
      // Blocked
    }
  }
}
