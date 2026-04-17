/**
 * Capacitor Local Notifications adapter.
 *
 * On iOS / Android Capacitor builds we schedule pre-task and post-task
 * reminders directly with the operating system via @capacitor/local-
 * notifications, so they fire even when the app is killed or backgrounded.
 *
 * On web this module is a no-op (`isCapacitor()` returns false) and the
 * accountability scheduler falls back to web-push + in-page timers.
 */

import type {
  LocalNotificationSchema,
  ScheduleOptions,
} from "@capacitor/local-notifications";

interface ScheduleableItem {
  id: string;
  name: string;
  start: Date;
  end: Date | null;
}

interface SchedulePrefs {
  preTaskEnabled: boolean;
  postTaskEnabled: boolean;
  preTaskMinutes: number;
  quietHoursEnabled: boolean;
  quietHoursStart: string;
  quietHoursEnd: string;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
}

export function isCapacitor(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
  return !!cap?.isNativePlatform?.();
}

let modulePromise: Promise<typeof import("@capacitor/local-notifications")> | null = null;
function loadModule() {
  if (!modulePromise) {
    modulePromise = import("@capacitor/local-notifications");
  }
  return modulePromise;
}

/** Hash a string id to a stable positive 31-bit integer (LocalNotification id space). */
function hashId(s: string): number {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h) % 2147483647;
}

function parseTimeOfDay(value: string | null | undefined, fallback: string) {
  const raw = (value || fallback).trim();
  const [h, m] = raw.split(":").map((n) => parseInt(n, 10));
  return { h: isFinite(h) ? h : 0, m: isFinite(m) ? m : 0 };
}

function isInQuietHours(when: Date, prefs: SchedulePrefs): boolean {
  if (!prefs.quietHoursEnabled) return false;
  const start = parseTimeOfDay(prefs.quietHoursStart, "22:00");
  const end = parseTimeOfDay(prefs.quietHoursEnd, "08:00");
  const minutes = when.getHours() * 60 + when.getMinutes();
  const startMin = start.h * 60 + start.m;
  const endMin = end.h * 60 + end.m;
  if (startMin === endMin) return false;
  if (startMin < endMin) return minutes >= startMin && minutes < endMin;
  return minutes >= startMin || minutes < endMin;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export async function ensureNativePermission(): Promise<boolean> {
  if (!isCapacitor()) return false;
  try {
    const { LocalNotifications } = await loadModule();
    const status = await LocalNotifications.checkPermissions();
    if (status.display === "granted") return true;
    const req = await LocalNotifications.requestPermissions();
    return req.display === "granted";
  } catch (err) {
    console.error("[capacitor-notifications] permission failed:", err);
    return false;
  }
}

const SCHEDULED_KEY = "dw_native_scheduled_ids";

function readScheduledIds(): number[] {
  try {
    const raw = localStorage.getItem(SCHEDULED_KEY);
    return raw ? (JSON.parse(raw) as number[]) : [];
  } catch {
    return [];
  }
}

function writeScheduledIds(ids: number[]): void {
  try {
    localStorage.setItem(SCHEDULED_KEY, JSON.stringify(ids));
  } catch {
    /* ignore */
  }
}

/**
 * Cancel previously-scheduled notifications and re-schedule today's pre/post
 * task reminders with the OS. Idempotent — safe to call on every refresh.
 */
export async function rescheduleNativeReminders(
  items: ScheduleableItem[],
  prefs: SchedulePrefs,
): Promise<{ scheduled: number; skipped: number }> {
  if (!isCapacitor()) return { scheduled: 0, skipped: 0 };
  const granted = await ensureNativePermission();
  if (!granted) return { scheduled: 0, skipped: 0 };

  const { LocalNotifications } = await loadModule();

  // Cancel previous batch
  const previous = readScheduledIds();
  if (previous.length > 0) {
    try {
      await LocalNotifications.cancel({
        notifications: previous.map((id) => ({ id })),
      });
    } catch (err) {
      console.error("[capacitor-notifications] cancel failed:", err);
    }
  }

  const now = Date.now();
  const toSchedule: LocalNotificationSchema[] = [];
  const newIds: number[] = [];
  let skipped = 0;

  for (const item of items) {
    if (prefs.preTaskEnabled) {
      const fireAt = new Date(
        item.start.getTime() - prefs.preTaskMinutes * 60 * 1000,
      );
      if (fireAt.getTime() > now) {
        if (isInQuietHours(fireAt, prefs)) {
          skipped++;
        } else {
          const id = hashId(`pre:${item.id}`);
          newIds.push(id);
          toSchedule.push({
            id,
            title: `⏰ Coming Up: ${item.name}`,
            body: `Scheduled for ${formatTime(item.start)}. Will you be doing this?`,
            schedule: { at: fireAt, allowWhileIdle: true },
            extra: {
              notificationType: "pre_task",
              taskId: item.id.startsWith("task:") ? item.id.slice(5) : null,
              calendarEventId: item.id.startsWith("event:") ? item.id.slice(6) : null,
              taskName: item.name,
              scheduledTime: item.start.toISOString(),
            },
          });
        }
      }
    }

    if (prefs.postTaskEnabled) {
      const endRef = item.end ?? new Date(item.start.getTime() + 30 * 60 * 1000);
      if (endRef.getTime() > now) {
        if (isInQuietHours(endRef, prefs)) {
          skipped++;
        } else {
          const id = hashId(`post:${item.id}`);
          newIds.push(id);
          toSchedule.push({
            id,
            title: `${item.name} - Time's Up!`,
            body: "Did you complete this task?",
            schedule: { at: endRef, allowWhileIdle: true },
            extra: {
              notificationType: "post_task",
              taskId: item.id.startsWith("task:") ? item.id.slice(5) : null,
              calendarEventId: item.id.startsWith("event:") ? item.id.slice(6) : null,
              taskName: item.name,
            },
          });
        }
      }
    }
  }

  if (toSchedule.length > 0) {
    const opts: ScheduleOptions = { notifications: toSchedule };
    try {
      await LocalNotifications.schedule(opts);
    } catch (err) {
      console.error("[capacitor-notifications] schedule failed:", err);
      return { scheduled: 0, skipped };
    }
  }

  writeScheduledIds(newIds);
  return { scheduled: toSchedule.length, skipped };
}
