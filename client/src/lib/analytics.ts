// Event name constants
export const EVENTS = {
  QUICK_SETUP_STARTED: "quick_setup_started",
  QUICK_SETUP_COMPLETED: "quick_setup_completed",
  STARTER_OBJECT_CREATED: "starter_object_created",
  DW_FIRST_MESSAGE_SHOWN: "dw_first_message_shown",
  STARTER_SPOTLIGHT_CLICKED: "starter_spotlight_clicked",
  STARTER_SPOTLIGHT_DISMISSED: "starter_spotlight_dismissed",
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

// Map event names to their payload types
type EventPayloadMap = {
  [EVENTS.QUICK_SETUP_STARTED]: undefined;
  [EVENTS.QUICK_SETUP_COMPLETED]: QuickSetupCompletedPayload;
  [EVENTS.STARTER_OBJECT_CREATED]: StarterObjectCreatedPayload;
  [EVENTS.DW_FIRST_MESSAGE_SHOWN]: DwFirstMessageShownPayload;
  [EVENTS.STARTER_SPOTLIGHT_CLICKED]: SpotlightClickedPayload;
  [EVENTS.STARTER_SPOTLIGHT_DISMISSED]: SpotlightDismissedPayload;
};

// Session metadata (in-memory only)
const sessionId = typeof crypto !== "undefined" && crypto.randomUUID 
  ? crypto.randomUUID() 
  : String(Math.random());
const env = import.meta.env.DEV ? "dev" : "prod";

// Event structure stored in window
export type StoredEvent = {
  name: AnalyticsEventName;
  payload: Record<string, unknown>;
  ts: number;
  sessionId: string;
  env: "dev" | "prod";
};

declare global {
  interface Window {
    __ftsEvents?: StoredEvent[];
  }
}

const ANALYTICS_DEBUG = import.meta.env.DEV;

// Type-safe trackEvent with payload enforcement
export function trackEvent<K extends AnalyticsEventName>(
  name: K,
  ...args: EventPayloadMap[K] extends undefined ? [] : [payload: EventPayloadMap[K]]
): void {
  try {
    const ts = Date.now();
    const payload = args[0] ?? {};
    
    const eventData: StoredEvent = {
      name,
      payload: payload as Record<string, unknown>,
      ts,
      sessionId,
      env,
    };

    if (ANALYTICS_DEBUG) {
      console.log("[analytics]", name, payload, new Date(ts).toISOString());
    }

    if (typeof window !== "undefined") {
      window.__ftsEvents = window.__ftsEvents || [];
      window.__ftsEvents.push(eventData);
    }
  } catch {
    // Never throw - analytics should never break the app
  }
}
