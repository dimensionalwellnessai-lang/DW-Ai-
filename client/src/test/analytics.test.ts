import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import {
  EVENTS,
  trackEvent,
  isAnalyticsOptedOut,
  setAnalyticsOptOut,
  flushEventsToServer,
  trackNewDayOpen,
  markActivated,
  isActivated,
  getStreak,
  getOpensThisWeek,
  wasNudgeShownToday,
  markNudgeShownToday,
  type StoredEvent,
} from "../lib/analytics";

// ─── localStorage + window mock ───────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => {
    localStorageStore[key] = value;
  },
  removeItem: (key: string) => {
    delete localStorageStore[key];
  },
  clear: () => {
    Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]);
  },
};

vi.stubGlobal("localStorage", localStorageMock);

// Reset window events and storage before each test
beforeEach(() => {
  localStorageMock.clear();
  (window as Window & { __dwEvents?: StoredEvent[] }).__dwEvents = [];
});

// ─── trackEvent ───────────────────────────────────────────────────────────────

describe("trackEvent", () => {
  it("pushes an event to window.__dwEvents", () => {
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    expect(window.__dwEvents).toHaveLength(1);
    expect(window.__dwEvents![0].name).toBe(EVENTS.QUICK_SETUP_STARTED);
  });

  it("includes sessionId and env fields", () => {
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    const ev = window.__dwEvents![0];
    expect(typeof ev.sessionId).toBe("string");
    expect(ev.sessionId.length).toBeGreaterThan(0);
    expect(["dev", "prod"]).toContain(ev.env);
  });

  it("stores the provided payload", () => {
    trackEvent(EVENTS.QUICK_SETUP_COMPLETED, {
      scheduleType: "fixed",
      focusArea: "fitness",
      hasStarterObject: true,
      timeToCompleteSeconds: 30,
    });
    expect(window.__dwEvents![0].payload).toMatchObject({
      scheduleType: "fixed",
      focusArea: "fitness",
    });
  });

  it("never throws even when localStorage is broken", () => {
    const origSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => {
      throw new Error("storage error");
    };
    expect(() => trackEvent(EVENTS.QUICK_SETUP_STARTED)).not.toThrow();
    localStorageMock.setItem = origSetItem;
  });

  it("tracks all new engagement event types without throwing", () => {
    expect(() =>
      trackEvent(EVENTS.FOLLOWUP_CREATED, { source: "chat", dimension: "health" })
    ).not.toThrow();

    expect(() =>
      trackEvent(EVENTS.PLAN_VISITED, { planType: "elevation" })
    ).not.toThrow();

    expect(() =>
      trackEvent(EVENTS.CHECKIN_COMPLETED, { dimension: "mental", responseCount: 2 })
    ).not.toThrow();

    expect(() =>
      trackEvent(EVENTS.REMINDER_SET, { reminderType: "habit", hasTime: true })
    ).not.toThrow();
  });

  it("tracks onboarding routing and restart events", () => {
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_ROUTE_SELECTED, { selectedVersion: "v2" })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_RESTART_CLICKED)
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_RESTART_STARTED, { mode: "preserve" })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_RESTART_COMPLETED, { mode: "reset" })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_MULTI_REASON_SELECTED, {
        selectedReasons: ["overwhelmed", "clarify_focus"],
        selectedReasonCount: 2,
      })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_FREE_TEXT_REASON_SUBMITTED, { textLength: 42 })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_CHOOSE_FOR_ME_CLICKED, { areaCount: 12 })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_RECOMMENDATIONS_SAVED, {
        mode: "choose_for_me",
        protectCount: 3,
        activeGrowthCount: 2,
        editedCount: 1,
      })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.ONBOARDING_FOCUS_WINDOW_CREATED, {
        mode: "manual",
        changedAreaCount: 5,
      })
    ).not.toThrow();
  });

  it("tracks dashboard adaptation and calendar events", () => {
    expect(() =>
      trackEvent(EVENTS.DASHBOARD_BLOCK_INTERACTED, {
        block: "what_to_do_now",
        action: "open",
        adaptationMode: "maintain",
      })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.DASHBOARD_REALIGN_USED, {
        mode: "quick_update",
        adaptationMode: "reset",
      })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.DASHBOARD_ADAPTIVE_RANKING_DECIDED, {
        adaptationMode: "assistant",
        lane: "plan",
        cardCount: 6,
        calendarState: "connected",
      })
    ).not.toThrow();
    expect(() =>
      trackEvent(EVENTS.DASHBOARD_CALENDAR_SUGGESTION_CLICKED, {
        suggestionType: "focus_window",
      })
    ).not.toThrow();
  });
});

// ─── Opt-out toggle ───────────────────────────────────────────────────────────

describe("analytics opt-out", () => {
  it("isAnalyticsOptedOut returns false by default", () => {
    expect(isAnalyticsOptedOut()).toBe(false);
  });

  it("setAnalyticsOptOut(true) makes isAnalyticsOptedOut return true", () => {
    setAnalyticsOptOut(true);
    expect(isAnalyticsOptedOut()).toBe(true);
  });

  it("setAnalyticsOptOut(false) re-enables analytics", () => {
    setAnalyticsOptOut(true);
    setAnalyticsOptOut(false);
    expect(isAnalyticsOptedOut()).toBe(false);
  });

  it("trackEvent is a no-op when opted out", () => {
    setAnalyticsOptOut(true);
    window.__dwEvents = [];
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    expect(window.__dwEvents).toHaveLength(0);
  });

  it("trackEvent resumes after opting back in", () => {
    setAnalyticsOptOut(true);
    setAnalyticsOptOut(false);
    window.__dwEvents = [];
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    expect(window.__dwEvents).toHaveLength(1);
  });

  it("setAnalyticsOptOut(true) clears the window event queue", () => {
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    expect(window.__dwEvents!.length).toBeGreaterThan(0);
    setAnalyticsOptOut(true);
    expect(window.__dwEvents).toHaveLength(0);
  });
});

// ─── trackNewDayOpen ─────────────────────────────────────────────────────────

describe("trackNewDayOpen", () => {
  it("fires APP_OPENED_NEW_DAY on first call", () => {
    trackNewDayOpen();
    const events = (window.__dwEvents ?? []).filter(
      (e) => e.name === EVENTS.APP_OPENED_NEW_DAY
    );
    expect(events).toHaveLength(1);
  });

  it("does not fire a second time on the same day", () => {
    trackNewDayOpen();
    trackNewDayOpen();
    const events = (window.__dwEvents ?? []).filter(
      (e) => e.name === EVENTS.APP_OPENED_NEW_DAY
    );
    expect(events).toHaveLength(1);
  });

  it("includes dateKey, daysSinceFirstOpen, and opensThisWeek in payload", () => {
    trackNewDayOpen();
    const ev = (window.__dwEvents ?? []).find(
      (e) => e.name === EVENTS.APP_OPENED_NEW_DAY
    );
    expect(ev?.payload).toMatchObject({
      dateKey: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      daysSinceFirstOpen: expect.any(Number),
      opensThisWeek: expect.any(Number),
    });
  });
});

// ─── markActivated / isActivated ─────────────────────────────────────────────

describe("markActivated / isActivated", () => {
  it("isActivated returns false before activation", () => {
    expect(isActivated()).toBe(false);
  });

  it("isActivated returns true after markActivated", () => {
    markActivated({
      actionType: "task_created",
      source: "today",
      tsLocal: new Date().toISOString(),
    });
    expect(isActivated()).toBe(true);
  });

  it("fires COMPLETED_FIRST_ACTION event on first call", () => {
    markActivated({
      actionType: "plan_created",
      source: "plan",
      tsLocal: new Date().toISOString(),
    });
    const events = (window.__dwEvents ?? []).filter(
      (e) => e.name === EVENTS.COMPLETED_FIRST_ACTION
    );
    expect(events).toHaveLength(1);
  });

  it("does not fire COMPLETED_FIRST_ACTION on subsequent calls", () => {
    const payload = {
      actionType: "plan_created" as const,
      source: "plan" as const,
      tsLocal: new Date().toISOString(),
    };
    markActivated(payload);
    markActivated(payload);
    const events = (window.__dwEvents ?? []).filter(
      (e) => e.name === EVENTS.COMPLETED_FIRST_ACTION
    );
    expect(events).toHaveLength(1);
  });
});

// ─── getStreak ────────────────────────────────────────────────────────────────

describe("getStreak", () => {
  it("returns 0 when no open days recorded", () => {
    expect(getStreak()).toBe(0);
  });

  it("returns 1 after trackNewDayOpen is called today", () => {
    trackNewDayOpen();
    expect(getStreak()).toBe(1);
  });
});

// ─── getOpensThisWeek ─────────────────────────────────────────────────────────

describe("getOpensThisWeek", () => {
  it("returns 0 when no open days recorded", () => {
    expect(getOpensThisWeek()).toBe(0);
  });

  it("returns 1 after opening today", () => {
    trackNewDayOpen();
    expect(getOpensThisWeek()).toBe(1);
  });
});

// ─── nudge helpers ────────────────────────────────────────────────────────────

describe("nudge helpers", () => {
  it("wasNudgeShownToday returns false initially", () => {
    expect(wasNudgeShownToday()).toBe(false);
  });

  it("wasNudgeShownToday returns true after markNudgeShownToday", () => {
    markNudgeShownToday();
    expect(wasNudgeShownToday()).toBe(true);
  });
});

// ─── flushEventsToServer ──────────────────────────────────────────────────────

describe("flushEventsToServer", () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal("fetch", fetchSpy);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("POSTs queued events to /api/analytics/events", () => {
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    flushEventsToServer();
    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, options] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/analytics/events");
    expect(options.method).toBe("POST");
    const body = JSON.parse(options.body as string) as { events: StoredEvent[] };
    expect(body.events).toHaveLength(1);
    expect(body.events[0].name).toBe(EVENTS.QUICK_SETUP_STARTED);
  });

  it("clears the window queue after flushing", () => {
    trackEvent(EVENTS.QUICK_SETUP_STARTED);
    expect(window.__dwEvents).toHaveLength(1);
    flushEventsToServer();
    expect(window.__dwEvents).toHaveLength(0);
  });

  it("does nothing when queue is empty", () => {
    window.__dwEvents = [];
    flushEventsToServer();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("does nothing when analytics is opted out", () => {
    setAnalyticsOptOut(true);
    // Manually push a raw event to bypass trackEvent's opt-out guard
    window.__dwEvents = window.__dwEvents ?? [];
    window.__dwEvents.push({
      name: EVENTS.QUICK_SETUP_STARTED,
      ts: Date.now(),
      sessionId: "test",
      env: "dev",
    });
    flushEventsToServer();
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
