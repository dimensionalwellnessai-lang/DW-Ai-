type AnalyticsPayload = Record<string, unknown>;

declare global {
  interface Window {
    __analyticsQueue?: Array<{ event: string; payload: AnalyticsPayload; timestamp: number }>;
  }
}

export function trackEvent(name: string, payload?: AnalyticsPayload): void {
  const eventData = {
    event: name,
    payload: payload || {},
    timestamp: Date.now(),
  };

  if (import.meta.env.DEV) {
    console.log(`[analytics]`, name, payload || {});
  }

  if (typeof window !== "undefined") {
    window.__analyticsQueue = window.__analyticsQueue || [];
    window.__analyticsQueue.push(eventData);
  }
}
