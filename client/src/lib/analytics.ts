export type AnalyticsEventName =
  | "quick_setup_started"
  | "quick_setup_completed"
  | "starter_object_created"
  | "dw_first_message_shown"
  | "starter_spotlight_clicked"
  | "starter_spotlight_dismissed";

type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    __ftsEvents?: Array<{ name: AnalyticsEventName; payload: AnalyticsPayload; ts: number }>;
  }
}

const ANALYTICS_DEBUG = import.meta.env.DEV;

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsPayload): void {
  try {
    const ts = Date.now();
    const eventData = {
      name,
      payload: payload || {},
      ts,
    };

    if (ANALYTICS_DEBUG) {
      console.log("[analytics]", name, payload || {}, new Date(ts).toISOString());
    }

    if (typeof window !== "undefined") {
      window.__ftsEvents = window.__ftsEvents || [];
      window.__ftsEvents.push(eventData);
    }
  } catch {
    // Never throw - analytics should never break the app
  }
}
