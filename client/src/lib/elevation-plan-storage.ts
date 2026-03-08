/**
 * elevation-plan-storage.ts
 *
 * Local storage helpers for the Elevation Plan Builder (PR #5).
 * Used by guest users when generating and reviewing 7-day elevation plans.
 *
 * Auth users: data lives in the DB via /api/elevation-plans/* endpoints.
 * Guests: data lives entirely in localStorage via these helpers.
 */

export interface GuestElevationPlanAction {
  id: string;
  planDayId: string;
  actionType: string;
  title: string;
  description: string;
  timeOfDay?: string;
  durationMinutes?: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface GuestElevationPlanDay {
  id: string;
  planId: string;
  dayIndex: number;
  theme: string;
  intention: string;
  createdAt: string;
  actions: GuestElevationPlanAction[];
}

export interface GuestElevationPlan {
  id: string;
  title: string;
  goal?: string;
  focusDimension?: string;
  status: "draft" | "active" | "archived";
  startDate: string;
  endDate: string;
  sourceConversationId?: string;
  createdAt: string;
  updatedAt: string;
}

const PLANS_KEY = "dw_elevation_plans";
const DAYS_KEY = "dw_elevation_plan_days";
const ACTIONS_KEY = "dw_elevation_plan_actions";

function generateId(): string {
  return `guest_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function readJson<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch {
    return [];
  }
}

function writeJson<T>(key: string, data: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch {
    // Blocked storage – silently fail
  }
}

// ─── Plans ────────────────────────────────────────────────────────────────────

export function getGuestElevationPlans(): GuestElevationPlan[] {
  return readJson<GuestElevationPlan>(PLANS_KEY);
}

export function getGuestActivePlan(): GuestElevationPlan | null {
  return getGuestElevationPlans().find((p) => p.status === "active") ?? null;
}

export function getGuestDraftPlanForDay(date: string, conversationId?: string): GuestElevationPlan | null {
  const drafts = getGuestElevationPlans().filter(
    (p) => p.status === "draft" && p.startDate === date
  );
  if (conversationId) {
    return drafts.find((p) => p.sourceConversationId === conversationId) ?? drafts[0] ?? null;
  }
  return drafts[0] ?? null;
}

export function saveGuestElevationPlan(
  plan: Omit<GuestElevationPlan, "id" | "createdAt" | "updatedAt">
): GuestElevationPlan {
  const plans = getGuestElevationPlans();
  const now = new Date().toISOString();
  const newPlan: GuestElevationPlan = { ...plan, id: generateId(), createdAt: now, updatedAt: now };
  writeJson(PLANS_KEY, [newPlan, ...plans]);
  return newPlan;
}

export function updateGuestElevationPlan(id: string, data: Partial<GuestElevationPlan>): void {
  const plans = getGuestElevationPlans().map((p) =>
    p.id === id ? { ...p, ...data, updatedAt: new Date().toISOString() } : p
  );
  writeJson(PLANS_KEY, plans);
}

// ─── Days ─────────────────────────────────────────────────────────────────────

export function getGuestElevationPlanDays(planId: string): GuestElevationPlanDay[] {
  return readJson<GuestElevationPlanDay>(DAYS_KEY)
    .filter((d) => d.planId === planId)
    .sort((a, b) => a.dayIndex - b.dayIndex);
}

export function saveGuestElevationPlanDay(
  day: Omit<GuestElevationPlanDay, "id" | "createdAt" | "actions">
): GuestElevationPlanDay {
  const days = readJson<GuestElevationPlanDay>(DAYS_KEY);
  const newDay: GuestElevationPlanDay = {
    ...day,
    id: generateId(),
    createdAt: new Date().toISOString(),
    actions: [],
  };
  writeJson(DAYS_KEY, [...days, newDay]);
  return newDay;
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export function getGuestElevationPlanActions(planDayId: string): GuestElevationPlanAction[] {
  return readJson<GuestElevationPlanAction>(ACTIONS_KEY).filter((a) => a.planDayId === planDayId);
}

export function saveGuestElevationPlanAction(
  action: Omit<GuestElevationPlanAction, "id" | "createdAt" | "updatedAt">
): GuestElevationPlanAction {
  const actions = readJson<GuestElevationPlanAction>(ACTIONS_KEY);
  const now = new Date().toISOString();
  const newAction: GuestElevationPlanAction = { ...action, id: generateId(), createdAt: now, updatedAt: now };
  writeJson(ACTIONS_KEY, [...actions, newAction]);
  return newAction;
}

export function updateGuestElevationPlanAction(
  id: string,
  data: Partial<GuestElevationPlanAction>
): void {
  const actions = readJson<GuestElevationPlanAction>(ACTIONS_KEY).map((a) =>
    a.id === id ? { ...a, ...data, updatedAt: new Date().toISOString() } : a
  );
  writeJson(ACTIONS_KEY, actions);
}

// ─── Full plan with days + actions ────────────────────────────────────────────

export interface GuestElevationPlanFull {
  plan: GuestElevationPlan;
  days: (GuestElevationPlanDay & { actions: GuestElevationPlanAction[] })[];
}

export function getGuestElevationPlanFull(planId: string): GuestElevationPlanFull | null {
  const plan = getGuestElevationPlans().find((p) => p.id === planId);
  if (!plan) return null;
  const days = getGuestElevationPlanDays(planId).map((d) => ({
    ...d,
    actions: getGuestElevationPlanActions(d.id),
  }));
  return { plan, days };
}

export function clearGuestElevationPlanData(): void {
  try {
    localStorage.removeItem(PLANS_KEY);
    localStorage.removeItem(DAYS_KEY);
    localStorage.removeItem(ACTIONS_KEY);
  } catch {
    // Blocked storage
  }
}
