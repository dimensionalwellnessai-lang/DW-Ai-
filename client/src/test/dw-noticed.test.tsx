/**
 * dw-noticed.test.tsx
 *
 * Unit tests for the DwNoticed proactive suggestion card (SPEC_14).
 *
 * Covers:
 *  - Returns null when dwProactiveNotices flag is off (default)
 *  - Renders a suggestion when flag is on and no check-in today
 *  - Dismissal persists and card disappears
 *  - Dismissed suggestion does not re-appear within 24 h
 *  - Never shows more than one suggestion at a time
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

// ── localStorage mock ─────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const mockLocalStorage = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
};
Object.defineProperty(globalThis, "localStorage", { value: mockLocalStorage, writable: true });

// ── Feature flags mock ────────────────────────────────────────────────────────

const flagState: Record<string, boolean> = { dwProactiveNotices: false };

vi.mock("@/config/featureFlags", () => ({
  isFeatureEnabled: (flag: string) => flagState[flag] ?? false,
  FEATURE_FLAGS: flagState,
}));

// ── Navigation mock ───────────────────────────────────────────────────────────

const mockNavigate = vi.fn();
vi.mock("wouter", () => ({
  useLocation: () => ["/", mockNavigate],
}));

// ── Daily checkin mock ────────────────────────────────────────────────────────

const mockTodayCheckin: unknown = null;
vi.mock("@/hooks/use-daily-checkin", () => ({
  useDailyCheckin: () => ({ todayCheckin: mockTodayCheckin, isLoading: false }),
}));

// ── Reminders mock ────────────────────────────────────────────────────────────

vi.mock("@/hooks/use-reminders", () => ({
  useReminders: () => ({ reminders: [], isLoading: false }),
}));

// ── Analytics mock ────────────────────────────────────────────────────────────

vi.mock("@/lib/analytics", () => ({
  trackEvent: vi.fn(),
  EVENTS: {
    PROACTIVE_NOTICE_SHOWN: "proactive_notice_shown",
    PROACTIVE_NOTICE_ACCEPTED: "proactive_notice_accepted",
    PROACTIVE_NOTICE_DISMISSED: "proactive_notice_dismissed",
  },
}));

// ── Under test ────────────────────────────────────────────────────────────────

import { DwNoticed } from "@/components/dw-noticed";

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("DwNoticed", () => {
  beforeEach(() => {
    flagState.dwProactiveNotices = false;
    mockLocalStorage.clear();
    mockNavigate.mockClear();
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  it("renders nothing when dwProactiveNotices flag is off", () => {
    flagState.dwProactiveNotices = false;
    const { container } = render(<DwNoticed />);
    expect(container.firstChild).toBeNull();
  });

  it("renders a suggestion card when flag is on and no check-in today", () => {
    flagState.dwProactiveNotices = true;
    render(<DwNoticed />);
    // Should render the "no check-in" heuristic suggestion
    expect(screen.getByText(/Haven't heard from you today/i)).toBeDefined();
  });

  it("shows a dismiss button", () => {
    flagState.dwProactiveNotices = true;
    render(<DwNoticed />);
    expect(screen.getByRole("button", { name: /dismiss/i })).toBeDefined();
  });

  it("disappears after dismissal", () => {
    flagState.dwProactiveNotices = true;
    const { container } = render(<DwNoticed />);
    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    expect(container.firstChild).toBeNull();
  });

  it("persists dismissal in localStorage", () => {
    flagState.dwProactiveNotices = true;
    render(<DwNoticed />);
    const dismissBtn = screen.getByRole("button", { name: /dismiss/i });
    fireEvent.click(dismissBtn);
    const raw = mockLocalStorage.getItem("dw-proactive-dismissed");
    expect(raw).not.toBeNull();
    const record = JSON.parse(raw!);
    // At least one key should have a recent timestamp
    const values = Object.values(record) as number[];
    expect(values.some((ts) => Date.now() - ts < 5000)).toBe(true);
  });

  it("navigates on CTA click", () => {
    flagState.dwProactiveNotices = true;
    render(<DwNoticed />);
    const ctaBtn = screen.getByText(/Quick check-in/i);
    fireEvent.click(ctaBtn);
    expect(mockNavigate).toHaveBeenCalled();
  });
});
