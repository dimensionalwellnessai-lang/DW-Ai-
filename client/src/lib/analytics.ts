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
  // Follow-up / engagement events
  FOLLOWUP_CREATED: "followup_created",
  PLAN_VISITED: "plan_visited",
  CHECKIN_COMPLETED: "checkin_completed",
  REMINDER_SET: "reminder_set",
  // Mature-flow action events
  FOLLOWUP_ACCEPTED: "followup_accepted",
  FOLLOWUP_SNOOZED: "followup_snoozed",
  FOLLOWUP_DISMISSED: "followup_dismissed",
  PLAN_ACTIVATED: "plan_activated",
  PLAN_COMPLETED: "plan_completed",
  CHECKIN_SUBMITTED: "checkin_submitted",
  REMINDER_INTERACTED: "reminder_interacted",
  // Agentic Companion — proactive notices (SPEC_14)
  PROACTIVE_NOTICE_SHOWN: "proactive_notice_shown",
  PROACTIVE_NOTICE_ACCEPTED: "proactive_notice_accepted",
  PROACTIVE_NOTICE_DISMISSED: "proactive_notice_dismissed",
  ONBOARDING_ROUTE_SELECTED: "onboarding_route_selected",
  ONBOARDING_RESTART_CLICKED: "onboarding_restart_clicked",
  ONBOARDING_RESTART_STARTED: "onboarding_restart_started",
  ONBOARDING_RESTART_CANCELED: "onboarding_restart_canceled",
  ONBOARDING_RESTART_COMPLETED: "onboarding_restart_completed",
  ONBOARDING_MULTI_REASON_SELECTED: "onboarding_multi_reason_selected",
  ONBOARDING_FREE_TEXT_REASON_SUBMITTED: "onboarding_free_text_reason_submitted",
  ONBOARDING_CHOOSE_FOR_ME_CLICKED: "onboarding_choose_for_me_clicked",
  ONBOARDING_RECOMMENDATIONS_SAVED: "onboarding_recommendations_saved",
  ONBOARDING_FOCUS_WINDOW_CREATED: "onboarding_focus_window_created",
  ONBOARDING_FOCUS_WINDOW_ADJUSTED: "onboarding_focus_window_adjusted",
  DASHBOARD_BLOCK_INTERACTED: "dashboard_block_interacted",
  DASHBOARD_REALIGN_USED: "dashboard_realign_used",
  DASHBOARD_ADAPTIVE_RANKING_DECIDED: "dashboard_adaptive_ranking_decided",
  DASHBOARD_CALENDAR_SUGGESTION_CLICKED: "dashboard_calendar_suggestion_clicked",
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

type FollowupCreatedPayload = {
  source: "chat" | "insight" | "checkin" | "unknown";
  dimension: string | null;
};

type PlanVisitedPayload = {
  planType: "elevation" | "meal" | "workout" | "universal" | "unknown";
};

type CheckinCompletedPayload = {
  dimension: string | null;
  responseCount: number;
};

type ReminderSetPayload = {
  reminderType: "habit" | "checkin" | "plan" | "custom";
  hasTime: boolean;
};

// Mature-flow action payload types (no PII)
type FollowupAcceptedPayload = {
  followupId: string;
};

type FollowupSnoozedPayload = {
  followupId: string;
  snoozeDurationHours: number;
};

type FollowupDismissedPayload = {
  followupId: string;
};

type PlanActivatedPayload = {
  planItemId: string;
  switchId: string;
};

type PlanCompletedPayload = {
  planItemId: string;
  switchId: string;
};

type CheckinSubmittedPayload = {
  moodScore: number;
  constraintType: string;
};

type ReminderInteractedPayload = {
  reminderId: string;
  reminderType: string;
  action: "dismissed" | "snoozed";
  snoozeLabel?: string;
};

// Agentic Companion — proactive notice payloads (SPEC_14)
type ProactiveNoticePayload = {
  suggestionKey: string;
};

type OnboardingRouteSelectedPayload = {
  selectedVersion: "v1" | "v2";
};

type OnboardingRestartPayload = {
  mode: "preserve" | "reset";
};

type OnboardingMultiReasonPayload = {
  selectedReasons: string[];
  selectedReasonCount: number;
};

type OnboardingFreeTextReasonPayload = {
  textLength: number;
};

type OnboardingChooseForMePayload = {
  areaCount: number;
};

type OnboardingRecommendationsSavedPayload = {
  mode: "manual" | "choose_for_me";
  protectCount: number;
  activeGrowthCount: number;
  editedCount: number;
};

type OnboardingFocusWindowPayload = {
  mode: "manual" | "choose_for_me";
  changedAreaCount: number;
};

type DashboardBlockInteractedPayload = {
  block: "where_i_stand" | "what_to_do_now" | "calendar" | "lane_card";
  action: "open";
  adaptationMode: "reset" | "maintain" | "assistant";
};

type DashboardRealignUsedPayload = {
  mode: "quick_update" | "full_refresh";
  adaptationMode: "reset" | "maintain" | "assistant";
};

type DashboardAdaptiveRankingPayload = {
  adaptationMode: "reset" | "maintain" | "assistant";
  lane: "stabilize" | "understand" | "plan" | "expand" | "execute";
  cardCount: number;
  calendarState: "connected" | "none" | "overloaded";
};

type DashboardCalendarSuggestionPayload = {
  suggestionType: "upcoming_prep" | "focus_window" | "overload_recovery" | "no_calendar";
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
  [EVENTS.FOLLOWUP_CREATED]: FollowupCreatedPayload;
  [EVENTS.PLAN_VISITED]: PlanVisitedPayload;
  [EVENTS.CHECKIN_COMPLETED]: CheckinCompletedPayload;
  [EVENTS.REMINDER_SET]: ReminderSetPayload;
  [EVENTS.FOLLOWUP_ACCEPTED]: FollowupAcceptedPayload;
  [EVENTS.FOLLOWUP_SNOOZED]: FollowupSnoozedPayload;
  [EVENTS.FOLLOWUP_DISMISSED]: FollowupDismissedPayload;
  [EVENTS.PLAN_ACTIVATED]: PlanActivatedPayload;
  [EVENTS.PLAN_COMPLETED]: PlanCompletedPayload;
  [EVENTS.CHECKIN_SUBMITTED]: CheckinSubmittedPayload;
  [EVENTS.REMINDER_INTERACTED]: ReminderInteractedPayload;
  [EVENTS.PROACTIVE_NOTICE_SHOWN]: ProactiveNoticePayload;
  [EVENTS.PROACTIVE_NOTICE_ACCEPTED]: ProactiveNoticePayload;
  [EVENTS.PROACTIVE_NOTICE_DISMISSED]: ProactiveNoticePayload;
  [EVENTS.ONBOARDING_ROUTE_SELECTED]: OnboardingRouteSelectedPayload;
  [EVENTS.ONBOARDING_RESTART_CLICKED]: undefined;
  [EVENTS.ONBOARDING_RESTART_STARTED]: OnboardingRestartPayload;
  [EVENTS.ONBOARDING_RESTART_CANCELED]: undefined;
  [EVENTS.ONBOARDING_RESTART_COMPLETED]: OnboardingRestartPayload;
  [EVENTS.ONBOARDING_MULTI_REASON_SELECTED]: OnboardingMultiReasonPayload;
  [EVENTS.ONBOARDING_FREE_TEXT_REASON_SUBMITTED]: OnboardingFreeTextReasonPayload;
  [EVENTS.ONBOARDING_CHOOSE_FOR_ME_CLICKED]: OnboardingChooseForMePayload;
  [EVENTS.ONBOARDING_RECOMMENDATIONS_SAVED]: OnboardingRecommendationsSavedPayload;
  [EVENTS.ONBOARDING_FOCUS_WINDOW_CREATED]: OnboardingFocusWindowPayload;
  [EVENTS.ONBOARDING_FOCUS_WINDOW_ADJUSTED]: OnboardingFocusWindowPayload;
  [EVENTS.DASHBOARD_BLOCK_INTERACTED]: DashboardBlockInteractedPayload;
  [EVENTS.DASHBOARD_REALIGN_USED]: DashboardRealignUsedPayload;
  [EVENTS.DASHBOARD_ADAPTIVE_RANKING_DECIDED]: DashboardAdaptiveRankingPayload;
  [EVENTS.DASHBOARD_CALENDAR_SUGGESTION_CLICKED]: DashboardCalendarSuggestionPayload;
};

// Session metadata (in-memory only)
const sessionId =
  globalThis.crypto &&
  "randomUUID" in globalThis.crypto &&
  typeof globalThis.crypto.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;
const env = import.meta.env.DEV ? "dev" : "prod";

// Analytics opt-out key
const OPT_OUT_KEY = "dw:analyticsOptOut";

/**
 * Check whether the user has opted out of analytics.
 */
export function isAnalyticsOptedOut(): boolean {
  try {
    return localStorage.getItem(OPT_OUT_KEY) === "true";
  } catch {
    return false;
  }
}

/**
 * Set the user's analytics opt-out preference.
 * When opted out, trackEvent() is a no-op and no events are stored.
 */
export function setAnalyticsOptOut(optOut: boolean): void {
  try {
    if (optOut) {
      localStorage.setItem(OPT_OUT_KEY, "true");
      // Clear any previously queued events from the window queue
      window.__dwEvents = [];
    } else {
      localStorage.removeItem(OPT_OUT_KEY);
    }
  } catch {
    // Never throw
  }
}

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
    __dwEvents?: StoredEvent[];
  }
}

// ─── Server forwarding ────────────────────────────────────────────────────────

/**
 * Sends queued events to the server analytics endpoint (fire-and-forget).
 * - Respects the user's opt-out preference.
 * - Clears the queue optimistically before sending to prevent duplicate uploads.
 * - Called automatically on page hide/unload via the visibilitychange listener below.
 */
export function flushEventsToServer(): void {
  try {
    if (isAnalyticsOptedOut()) return;
    const pending = window.__dwEvents;
    if (!pending || pending.length === 0) return;
    // Clear the queue BEFORE copying — any new events tracked while the
    // async fetch is in flight will land in the fresh queue, not the batch.
    window.__dwEvents = [];
    const batch = [...pending];
    // Direct fetch (not apiRequest): this is a fire-and-forget batch upload
    // that runs from a visibilitychange handler with `keepalive: true` so the
    // request can complete after the page is hidden/unloaded. apiRequest does
    // not support `keepalive` and would throw on non-2xx responses, which we
    // explicitly want to swallow here so analytics never breaks the app.
    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ events: batch }),
      keepalive: true,
    }).catch(() => {
      // Silently ignore network errors
    });
  } catch {
    // Never throw from analytics
  }
}

// Auto-flush events when the page is hidden (tab switch, close, navigate away)
if (typeof document !== "undefined") {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") {
      flushEventsToServer();
    }
  });
}

// Type-safe trackEvent with payload enforcement
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  ...args: EventPayloadMap[K] extends undefined ? [] : [payload: EventPayloadMap[K]]
): void {
  try {
    // Respect user opt-out
    if (isAnalyticsOptedOut()) return;

    const payload = (args[0] as unknown) ?? undefined;

    const event: StoredEvent = {
      name,
      payload,
      ts: Date.now(),
      sessionId,
      env,
    };

    window.__dwEvents = window.__dwEvents ?? [];
    window.__dwEvents.push(event);

    if (import.meta.env.DEV) {
      console.log("[analytics]", name, event);
    }
  } catch {
    // Never throw from analytics
  }
}

// Retention tracking helpers
const STORAGE_KEYS = {
  FIRST_OPEN: "dw:firstOpenDateKey",
  LAST_OPEN: "dw:lastOpenDateKey",
  OPEN_DAYS: "dw:openDays",
  ACTIVATED_AT: "dw:activatedAt",
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
    return !!localStorage.getItem(`dw:nudgeShown:${dateKey}`);
  } catch {
    return false;
  }
}

export function markNudgeShownToday(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem(`dw:nudgeShown:${dateKey}`, "1");
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
    return !!localStorage.getItem(`dw:weeklyRecapShown:${weekKey}`);
  } catch {
    return false;
  }
}

export function markWeeklyRecapShown(): void {
  try {
    const weekKey = getWeeklyRecapKey();
    localStorage.setItem(`dw:weeklyRecapShown:${weekKey}`, "1");
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
    return !!localStorage.getItem(`dw:nextStepShown:${dateKey}`);
  } catch {
    return false;
  }
}

export function markNextStepShownToday(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem(`dw:nextStepShown:${dateKey}`, "1");
  } catch {
    // Never throw
  }
}

export function getLastPlanVisit(): string | null {
  try {
    return localStorage.getItem("dw:lastPlanVisit");
  } catch {
    return null;
  }
}

export function markPlanVisit(): void {
  try {
    const dateKey = getLocalDateKey();
    localStorage.setItem("dw:lastPlanVisit", dateKey);
  } catch {
    // Never throw
  }
}
