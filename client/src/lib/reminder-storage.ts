/**
 * reminder-storage.ts
 *
 * Guest-side localStorage helpers for the Reminders feature (PR #7).
 * Auth users: data lives in the DB via /api/reminders endpoints.
 * Guests: data lives entirely in localStorage via these helpers.
 */

export type ReminderType = "followup" | "plan_action" | "daily_checkin" | "custom";
export type ReminderStatus = "scheduled" | "sent" | "dismissed" | "cancelled";

export interface GuestReminder {
  id: string;
  type: ReminderType;
  title: string;
  body?: string;
  scheduledAt: string; // ISO date string
  status: ReminderStatus;
  sourceEntityType?: string;
  sourceEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

const REMINDERS_KEY = "dw_reminders";

function generateId(): string {
  return `gr_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson(): GuestReminder[] {
  try {
    const raw = localStorage.getItem(REMINDERS_KEY);
    return raw ? (JSON.parse(raw) as GuestReminder[]) : [];
  } catch {
    return [];
  }
}

function writeJson(data: GuestReminder[]): void {
  try {
    localStorage.setItem(REMINDERS_KEY, JSON.stringify(data));
  } catch {
    // Blocked storage – silently fail
  }
}

export function getGuestReminders(status?: string): GuestReminder[] {
  const items = readJson();
  if (!status || status === "all") return items;
  return items.filter((r) => r.status === status);
}

export function getDueGuestReminders(): GuestReminder[] {
  const now = new Date();
  return readJson().filter(
    (r) => r.status === "scheduled" && new Date(r.scheduledAt) <= now
  );
}

export function createGuestReminder(
  reminder: Omit<GuestReminder, "id" | "createdAt" | "updatedAt">
): GuestReminder {
  const items = readJson();
  const now = new Date().toISOString();
  const newItem: GuestReminder = {
    ...reminder,
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
  writeJson([newItem, ...items]);
  return newItem;
}

export function updateGuestReminder(
  id: string,
  fields: Partial<Pick<GuestReminder, "status" | "scheduledAt" | "title" | "body">>
): GuestReminder | null {
  const items = readJson();
  let updated: GuestReminder | null = null;
  const next = items.map((r) => {
    if (r.id !== id) return r;
    updated = { ...r, ...fields, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (updated) writeJson(next);
  return updated;
}

export function cancelGuestRemindersBySource(
  sourceEntityType: string,
  sourceEntityId: string
): void {
  const items = readJson();
  const now = new Date().toISOString();
  const next = items.map((r) => {
    if (
      r.status === "scheduled" &&
      r.sourceEntityType === sourceEntityType &&
      r.sourceEntityId === sourceEntityId
    ) {
      return { ...r, status: "cancelled" as ReminderStatus, updatedAt: now };
    }
    return r;
  });
  writeJson(next);
}

export function clearGuestReminders(): void {
  try {
    localStorage.removeItem(REMINDERS_KEY);
  } catch {
    // Blocked storage
  }
}
