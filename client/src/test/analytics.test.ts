import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  EVENTS,
  trackEvent,
  isAnalyticsOptedOut,
  setAnalyticsOptOut,
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
