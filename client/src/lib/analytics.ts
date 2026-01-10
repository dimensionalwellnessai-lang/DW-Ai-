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
    __ftsEvents?: Array<{ event: AnalyticsEventName; payload: AnalyticsPayload; ts: number }>;
  }
}

export function trackEvent(name: AnalyticsEventName, payload?: AnalyticsPayload): void {
  const eventData = {
    event: name,
    payload: payload || {},
    ts: Date.now(),
  };

  console.log("[analytics]", name, payload || {});

  if (typeof window !== "undefined") {
    window.__ftsEvents = window.__ftsEvents || [];
    window.__ftsEvents.push(eventData);
  }
}
