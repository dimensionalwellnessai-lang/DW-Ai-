/**
 * agentActions.test.ts
 *
 * Unit tests for the DWAI Action Engine (client/src/lib/agent-actions.ts).
 *
 * Covers: propose, consent, execute, decline, undo, audit log.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const {
  mockSpeak,
  mockScheduleReminderTimer,
  mockClearReminderTimer,
  mockWindowOpen,
} = vi.hoisted(() => ({
  mockSpeak: vi.fn().mockResolvedValue(undefined),
  mockScheduleReminderTimer: vi.fn(),
  mockClearReminderTimer: vi.fn(),
  mockWindowOpen: vi.fn(),
}));

// ── Mock TTS service ──────────────────────────────────────────────────────────

vi.mock("@/lib/tts-service", () => ({
  ttsService: { speak: mockSpeak },
}));

// ── Mock reminder scheduler ───────────────────────────────────────────────────

vi.mock("@/lib/reminder-scheduler", () => ({
  scheduleReminderTimer: mockScheduleReminderTimer,
  clearReminderTimer: mockClearReminderTimer,
}));

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

// ── window.open mock ──────────────────────────────────────────────────────────

Object.defineProperty(globalThis, "window", {
  value: { open: mockWindowOpen, location: { href: "" } },
  writable: true,
});

// ── Import under test (after mocks are set up) ────────────────────────────────

import {
  proposeAction,
  requestConsent,
  executeAction,
  declineAction,
  undoAction,
  readAuditLog,
} from "@/lib/agent-actions";

// ── Setup / teardown ──────────────────────────────────────────────────────────

beforeEach(() => {
  mockLocalStorage.clear();
  vi.clearAllMocks();
});

afterEach(() => {
  mockLocalStorage.clear();
});

// ── proposeAction ─────────────────────────────────────────────────────────────

describe("proposeAction", () => {
  it("returns an action with status 'proposed'", () => {
    const action = proposeAction({ type: "open", label: "Test open", consentTier: "silent", targetUrl: "/test" });
    expect(action.status).toBe("proposed");
  });

  it("assigns a unique id", () => {
    const a1 = proposeAction({ type: "read", label: "A", consentTier: "notify" });
    const a2 = proposeAction({ type: "read", label: "B", consentTier: "notify" });
    expect(a1.id).not.toBe(a2.id);
  });

  it("sets createdAt to a valid ISO timestamp", () => {
    const action = proposeAction({ type: "open", label: "x", consentTier: "silent", targetUrl: "/" });
    expect(() => new Date(action.createdAt)).not.toThrow();
    expect(Number.isNaN(new Date(action.createdAt).getTime())).toBe(false);
  });

  it("logs the action to the audit log", () => {
    proposeAction({ type: "open", label: "Logged", consentTier: "silent", targetUrl: "/logged" });
    const log = readAuditLog();
    expect(log.length).toBe(1);
    expect(log[0].action.label).toBe("Logged");
  });
});

// ── requestConsent ────────────────────────────────────────────────────────────

describe("requestConsent", () => {
  it("advances 'silent' tier directly to 'executing'", () => {
    const action = proposeAction({ type: "open", label: "silent test", consentTier: "silent", targetUrl: "/silent" });
    const result = requestConsent(action);
    expect(result.status).toBe("executing");
  });

  it("advances 'notify' tier directly to 'executing'", () => {
    const action = proposeAction({ type: "open", label: "notify test", consentTier: "notify", targetUrl: "/notify" });
    const result = requestConsent(action);
    expect(result.status).toBe("executing");
  });

  it("holds 'witness' tier at 'awaiting-consent'", () => {
    const action = proposeAction({ type: "order", label: "witness test", consentTier: "witness", targetUrl: "https://shop.example.com" });
    const result = requestConsent(action);
    expect(result.status).toBe("awaiting-consent");
  });

  it("forces 'order' actions to witness consent", () => {
    const action = proposeAction({ type: "order", label: "must witness", consentTier: "silent", targetUrl: "https://shop.example.com" });
    expect(action.consentTier).toBe("witness");
  });

  it("is a no-op for non-proposed actions", () => {
    const action = proposeAction({ type: "open", label: "x", consentTier: "silent", targetUrl: "/x" });
    const executing = requestConsent(action);
    const again = requestConsent(executing);
    // Should not change since it's no longer 'proposed'
    expect(again.status).toBe("executing");
  });
});

// ── executeAction ─────────────────────────────────────────────────────────────

describe("executeAction — open type", () => {
  it("navigates to internal routes via navigate callback", async () => {
    const mockNavigate = vi.fn();
    const action = proposeAction({ type: "open", label: "Open internal", consentTier: "silent", targetUrl: "/test" });
    const consented = requestConsent(action);
    await executeAction(consented, mockNavigate);
    expect(mockNavigate).toHaveBeenCalledWith("/test");
  });

  it("opens external URLs via window.open", async () => {
    const action = proposeAction({ type: "open", label: "Open external", consentTier: "silent", targetUrl: "https://example.com" });
    const consented = requestConsent(action);
    await executeAction(consented);
    expect(mockWindowOpen).toHaveBeenCalledWith("https://example.com", "_blank", "noopener,noreferrer");
  });

  it("returns action with status 'done'", async () => {
    const action = proposeAction({ type: "open", label: "x", consentTier: "silent", targetUrl: "/" });
    const consented = requestConsent(action);
    const done = await executeAction(consented, vi.fn());
    expect(done.status).toBe("done");
    expect(done.completedAt).toBeDefined();
  });
});

describe("executeAction — read type", () => {
  it("calls ttsService.speak with readText", async () => {
    const action = proposeAction({ type: "read", label: "Read aloud", consentTier: "silent", readText: "Hello world" });
    const consented = requestConsent(action);
    await executeAction(consented);
    expect(mockSpeak).toHaveBeenCalledWith("Hello world");
  });

  it("falls back to label if readText is not provided", async () => {
    const action = proposeAction({ type: "read", label: "The fallback text", consentTier: "silent" });
    const consented = requestConsent(action);
    await executeAction(consented);
    expect(mockSpeak).toHaveBeenCalledWith("The fallback text");
  });
});

describe("executeAction — schedule type", () => {
  it("calls scheduleReminderTimer and marks action undoable", async () => {
    const action = proposeAction({
      type: "schedule",
      label: "Check in at noon",
      consentTier: "notify",
      scheduledFor: new Date(Date.now() + 60_000).toISOString(),
    });
    const consented = requestConsent(action);
    const done = await executeAction(consented);
    expect(mockScheduleReminderTimer).toHaveBeenCalled();
    expect(done.undoable).toBe(true);
    expect(done.reminderId).toBeDefined();
  });
});

describe("executeAction — order / search types", () => {
  it("opens targetUrl in a new tab for 'order'", async () => {
    const action = proposeAction({ type: "order", label: "Order something", consentTier: "witness", targetUrl: "https://shop.example.com" });
    const consented = { ...action, status: "awaiting-consent" as const };
    await executeAction(consented);
    expect(mockWindowOpen).toHaveBeenCalledWith("https://shop.example.com", "_blank", "noopener,noreferrer");
  });

  it("opens targetUrl in a new tab for 'search'", async () => {
    const action = proposeAction({ type: "search", label: "Search for X", consentTier: "silent", targetUrl: "https://google.com?q=X" });
    const consented = requestConsent(action);
    await executeAction(consented);
    expect(mockWindowOpen).toHaveBeenCalledWith("https://google.com?q=X", "_blank", "noopener,noreferrer");
  });
});

describe("executeAction — guard: skips if not in executable state", () => {
  it("does not execute a 'proposed' action (not consented)", async () => {
    const action = proposeAction({ type: "open", label: "x", consentTier: "silent", targetUrl: "/" });
    const result = await executeAction(action, vi.fn());
    // Status stays 'proposed' — execution was skipped
    expect(result.status).toBe("proposed");
  });
});

// ── declineAction ─────────────────────────────────────────────────────────────

describe("declineAction", () => {
  it("marks an action as 'declined'", () => {
    const action = proposeAction({ type: "order", label: "Decline me", consentTier: "witness", targetUrl: "https://shop.example.com/decline" });
    const awaiting = requestConsent(action);
    const declined = declineAction(awaiting);
    expect(declined.status).toBe("declined");
    expect(declined.completedAt).toBeDefined();
  });

  it("logs the declined action", () => {
    const action = proposeAction({ type: "order", label: "Logged decline", consentTier: "witness", targetUrl: "https://shop.example.com/logged" });
    const awaiting = requestConsent(action);
    declineAction(awaiting);
    const log = readAuditLog();
    const declinedEntry = log.find((e) => e.action.status === "declined");
    expect(declinedEntry).toBeDefined();
  });
});

// ── undoAction ────────────────────────────────────────────────────────────────

describe("undoAction", () => {
  it("cancels a scheduled reminder and marks action as 'undone'", async () => {
    const action = proposeAction({
      type: "schedule",
      label: "Reminder to undo",
      consentTier: "notify",
      scheduledFor: new Date(Date.now() + 60_000).toISOString(),
    });
    const done = await executeAction(requestConsent(action));
    const undone = undoAction(done);
    expect(undone.status).toBe("undone");
    expect(mockClearReminderTimer).toHaveBeenCalledWith(done.reminderId);
  });

  it("is a no-op for non-undoable actions", async () => {
    const action = proposeAction({ type: "open", label: "Not undoable", consentTier: "silent", targetUrl: "/" });
    const done = await executeAction(requestConsent(action), vi.fn());
    // open actions are not undoable
    const result = undoAction(done);
    expect(result.status).toBe("done");
  });

  it("is a no-op for actions that are not yet 'done'", () => {
    const action = { ...proposeAction({ type: "schedule", label: "Not done", consentTier: "notify", scheduledFor: new Date(Date.now() + 120_000).toISOString() }), undoable: true };
    const result = undoAction(action);
    expect(result.status).toBe("proposed");
  });
});

// ── readAuditLog ──────────────────────────────────────────────────────────────

describe("readAuditLog", () => {
  it("returns empty array when log is empty", () => {
    expect(readAuditLog()).toEqual([]);
  });

  it("accumulates multiple entries", () => {
    proposeAction({ type: "open", label: "A", consentTier: "silent", targetUrl: "/a" });
    proposeAction({ type: "read", label: "B", consentTier: "notify" });
    expect(readAuditLog().length).toBe(2);
  });

  it("returns empty array for malformed log", () => {
    localStorageStore["dw-agent-action-log"] = "not-valid-json{{{{";
    expect(readAuditLog()).toEqual([]);
  });
});
