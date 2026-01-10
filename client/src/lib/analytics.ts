// Event name constants
export const EVENTS = {
  QUICK_SETUP_STARTED: "quick_setup_started",
  QUICK_SETUP_COMPLETED: "quick_setup_completed",
  STARTER_OBJECT_CREATED: "starter_object_created",
  DW_FIRST_MESSAGE_SHOWN: "dw_first_message_shown",
  STARTER_SPOTLIGHT_CLICKED: "starter_spotlight_clicked",
  STARTER_SPOTLIGHT_DISMISSED: "starter_spotlight_dismissed",
  APP_OPENED_NEW_DAY: "app_opened_new_day",
  COMPLETED_FIRST_ACTION: "completed_first_action",
} as const;

export type AnalyticsEventName = (typeof EVENTS)[keyof typeof EVENTS];

// Payload types per event
type QuickSetupCompletedPayload = {
  scheduleType: string | null;
  focusArea: string | null;
  hasStarterObject: boolean;
  timeToCompleteSeconds: number;
};

type StarterObjectCreatedPayload = {
  focusArea: string | null;
  objectType: "task" | "event" | "log";
  starterObjectId: string;
};

type DwFirstMessageShownPayload = {
  scheduleType: string | null;
  focusArea: string | null;
};

type SpotlightClickedPayload = {
  focusArea: string | null;
  destinationRoute: string;
};

type SpotlightDismissedPayload = {
  focusArea: string | null;
};

type AppOpenedNewDayPayload = {
  dateKey: string;
  daysSinceFirstOpen: number;
  opensThisWeek: number;
};

type CompletedFirstActionPayload = {
  actionType: "starter_object_created" | "spotlight_view_clicked" | "user_sent_first_chat" | "plan_created" | "task_created" | "log_created";
  source: "welcome" | "chat" | "plan" | "today" | "unknown";
  tsLocal: string;
};

// Map event names to their payload types
type EventPayloadMap = {
  [EVENTS.QUICK_SETUP_STARTED]: undefined;
  [EVENTS.QUICK_SETUP_COMPLETED]: QuickSetupCompletedPayload;
  [EVENTS.STARTER_OBJECT_CREATED]: StarterObjectCreatedPayload;
  [EVENTS.DW_FIRST_MESSAGE_SHOWN]: DwFirstMessageShownPayload;
  [EVENTS.STARTER_SPOTLIGHT_CLICKED]: SpotlightClickedPayload;
  [EVENTS.STARTER_SPOTLIGHT_DISMISSED]: SpotlightDismissedPayload;
  [EVENTS.APP_OPENED_NEW_DAY]: AppOpenedNewDayPayload;
  [EVENTS.COMPLETED_FIRST_ACTION]: CompletedFirstActionPayload;
};

// Session metadata (in-memory only)
const sessionId =
  globalThis.crypto &&
  "randomUUID" in globalThis.crypto &&
  typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
const env = import.meta.env.DEV ? "dev" : "prod";

// Event structure stored in window
export type StoredEvent = {
  name: AnalyticsEventName;
  payload?: unknown;
  ts: number;
  sessionId: string;
  env: "dev" | "prod";
};

declare global {
  interface Window {
    __ftsEvents?: StoredEvent[];
  }
}

// Type-safe trackEvent with payload enforcement
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  ...args: EventPayloadMap[K] extends undefined ? [] : [payload: EventPayloadMap[K]]
): void {
  try {
    const payload = (args[0] as unknown) ?? undefined;

    const event: StoredEvent = {
      name,
      payload,
      ts: Date.now(),
      sessionId,
      env,
    };

    window.__ftsEvents = window.__ftsEvents ?? [];
    window.__ftsEvents.push(event);

    if (import.meta.env.DEV) {
      console.log("[analytics]", name, event);
    }
  } catch {
    // Never throw from analytics
  }
}

// Retention tracking helpers
const STORAGE_KEYS = {
  FIRST_OPEN: "fts:firstOpenDateKey",
  LAST_OPEN: "fts:lastOpenDateKey",
  OPEN_DAYS: "fts:openDays",
  ACTIVATED_AT: "fts:activatedAt",
} as const;

function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(dateKey1: string, dateKey2: string): number {
  const d1 = new Date(dateKey1 + "T00:00:00");
  const d2 = new Date(dateKey2 + "T00:00:00");
  const diffMs = Math.abs(d2.getTime() - d1.getTime());
  return Math.floor(diffMs / (1000 * 60 * 60 * 24));
}

function getOpenDays(): string[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.OPEN_DAYS);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {}
  return [];
}

function saveOpenDays(days: string[]): void {
  try {
    // Trim to last 90 days max
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 90);
    const cutoffKey = getLocalDateKey();
    const trimmed = days
      .filter((d) => d >= cutoffKey.slice(0, 10).replace(/\d{2}$/, "01") || daysBetween(d, cutoffKey) <= 90)
      .slice(-90);
    localStorage.setItem(STORAGE_KEYS.OPEN_DAYS, JSON.stringify(trimmed));
  } catch {}
}

function countOpensThisWeek(openDays: string[], today: string): number {
  const todayDate = new Date(today + "T00:00:00");
  const weekAgo = new Date(todayDate);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoKey = `${weekAgo.getFullYear()}-${String(weekAgo.getMonth() + 1).padStart(2, "0")}-${String(weekAgo.getDate()).padStart(2, "0")}`;
  
  return openDays.filter((d) => d >= weekAgoKey && d <= today).length;
}

export function trackNewDayOpen(): void {
  try {
    const dateKey = getLocalDateKey();
    
    // Get or set first open date
    let firstOpenDateKey = localStorage.getItem(STORAGE_KEYS.FIRST_OPEN);
    if (!firstOpenDateKey) {
      firstOpenDateKey = dateKey;
      localStorage.setItem(STORAGE_KEYS.FIRST_OPEN, dateKey);
    }
    
    // Check if already fired today
    const lastOpenDateKey = localStorage.getItem(STORAGE_KEYS.LAST_OPEN);
    if (lastOpenDateKey === dateKey) {
      return; // Already tracked today
    }
    
    // Update last open date
    localStorage.setItem(STORAGE_KEYS.LAST_OPEN, dateKey);
    
    // Update open days array
    const openDays = getOpenDays();
    if (!openDays.includes(dateKey)) {
      openDays.push(dateKey);
    }
    saveOpenDays(openDays);
    
    // Compute metrics
    const daysSinceFirstOpen = daysBetween(firstOpenDateKey, dateKey);
    const opensThisWeek = countOpensThisWeek(openDays, dateKey);
    
    // Fire the event
    trackEvent(EVENTS.APP_OPENED_NEW_DAY, {
      dateKey,
      daysSinceFirstOpen,
      opensThisWeek,
    });
  } catch {
    // Never throw from retention tracking
  }
}

// Activation tracking - fires once ever per user
export function markActivated(payload: CompletedFirstActionPayload): void {
  try {
    // Check if already activated
    const existingActivation = localStorage.getItem(STORAGE_KEYS.ACTIVATED_AT);
    if (existingActivation) {
      return; // Already activated, do nothing
    }
    
    // Mark as activated
    localStorage.setItem(STORAGE_KEYS.ACTIVATED_AT, Date.now().toString());
    
    // Fire the event
    trackEvent(EVENTS.COMPLETED_FIRST_ACTION, payload);
  } catch {
    // Never throw from activation tracking
  }
}

// D2 Nudge helpers
export function isActivated(): boolean {
  try {
    return !!localStorage.getItem(STORAGE_KEYS.ACTIVATED_AT);
  } catch {
    return false;
  }
}

export function wasNudgeShownToday(): boolean {
  try {
    const dateKey = getLocalDateKey();
    return !!localStorage.getItem(`fts:nudgeShown:${dateKey}`);
  } catch {
    return false;
  }
}

export function markNudgeShownToday(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem(`fts:nudgeShown:${dateKey}`, "1");
  } catch {
    // Never throw
  }
}

// D7 Streak helpers
export function getOpenDaysArray(): string[] {
  return getOpenDays();
}

export function getStreak(): number {
  try {
    const openDays = getOpenDays();
    if (openDays.length === 0) return 0;
    
    const today = getLocalDateKey();
    
    // Sort descending to start from most recent
    const sortedDays = [...openDays].sort().reverse();
    
    // If today is not in openDays, streak is 0
    if (!sortedDays.includes(today)) return 0;
    
    let streak = 0;
    let currentDate = new Date(today + "T00:00:00");
    
    for (let i = 0; i < sortedDays.length && i < 365; i++) {
      const expectedKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(currentDate.getDate()).padStart(2, "0")}`;
      
      if (sortedDays.includes(expectedKey)) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }
    
    return streak;
  } catch {
    return 0;
  }
}

// Weekly Recap helpers
function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

export function getWeeklyRecapKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const week = getWeekNumber(now);
  return `${year}-W${String(week).padStart(2, "0")}`;
}

export function wasWeeklyRecapShown(): boolean {
  try {
    const weekKey = getWeeklyRecapKey();
    return !!localStorage.getItem(`fts:weeklyRecapShown:${weekKey}`);
  } catch {
    return false;
  }
}

export function markWeeklyRecapShown(): void {
  try {
    const weekKey = getWeeklyRecapKey();
    localStorage.setItem(`fts:weeklyRecapShown:${weekKey}`, "1");
  } catch {
    // Never throw
  }
}

export function getOpensThisWeek(): number {
  try {
    const openDays = getOpenDays();
    const today = getLocalDateKey();
    return countOpensThisWeek(openDays, today);
  } catch {
    return 0;
  }
}

// Next Best Step helpers
export function wasNextStepShownToday(): boolean {
  try {
    const dateKey = getLocalDateKey();
    return !!localStorage.getItem(`fts:nextStepShown:${dateKey}`);
  } catch {
    return false;
  }
}

export function markNextStepShownToday(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem(`fts:nextStepShown:${dateKey}`, "1");
  } catch {
    // Never throw
  }
}

export function getLastPlanVisit(): string | null {
  try {
    return localStorage.getItem("fts:lastPlanVisit");
  } catch {
    return null;
  }
}

export function markPlanVisit(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem("fts:lastPlanVisit", dateKey);
  } catch {
    // Never throw
  }
}
