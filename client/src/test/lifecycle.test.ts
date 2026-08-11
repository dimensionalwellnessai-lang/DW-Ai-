import { describe, it, expect } from "vitest";
import {
  computeLifecycleState,
  LONG_AWAY_THRESHOLD_DAYS,
  RECENT_THRESHOLD_DAYS,
} from "../lib/lifecycle";

/** Returns a Date that is `days` ago from now. */
function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

describe("computeLifecycleState – three-band classification", () => {
  describe("new user (no onboarding)", () => {
    it("returns 'new' when onboarding is not completed, regardless of lastActiveAt", () => {
      expect(computeLifecycleState(false, null)).toBe("new");
      expect(computeLifecycleState(false, daysAgo(1))).toBe("new");
      expect(computeLifecycleState(false, daysAgo(30))).toBe("new");
    });
  });

  describe("recent user (onboarding done, last active ≤ 7 days)", () => {
    it("returns 'recent' when lastActiveAt is null (just onboarded)", () => {
      expect(computeLifecycleState(true, null)).toBe("recent");
    });

    it("returns 'recent' when last active today", () => {
      expect(computeLifecycleState(true, daysAgo(0))).toBe("recent");
    });

    it("returns 'recent' when last active exactly at RECENT_THRESHOLD_DAYS", () => {
      expect(computeLifecycleState(true, daysAgo(RECENT_THRESHOLD_DAYS))).toBe("recent");
    });

    it("returns 'recent' when last active 3 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(3))).toBe("recent");
    });
  });

  describe("middle band (7–21 days) – routes to Home, not Welcome Back", () => {
    it("returns 'recent' when last active 10 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(10))).toBe("recent");
    });

    it("returns 'recent' when last active 14 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(14))).toBe("recent");
    });

    it("returns 'recent' when last active 20 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(20))).toBe("recent");
    });
  });

  describe("long-away user (last active ≥ 21 days)", () => {
    it("returns 'long_away' when last active exactly at LONG_AWAY_THRESHOLD_DAYS", () => {
      expect(computeLifecycleState(true, daysAgo(LONG_AWAY_THRESHOLD_DAYS))).toBe("long_away");
    });

    it("returns 'long_away' when last active 30 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(30))).toBe("long_away");
    });

    it("returns 'long_away' when last active 60 days ago", () => {
      expect(computeLifecycleState(true, daysAgo(60))).toBe("long_away");
    });
  });

  describe("accepts ISO string dates", () => {
    it("handles ISO string date for recent user", () => {
      expect(computeLifecycleState(true, daysAgo(2).toISOString())).toBe("recent");
    });

    it("handles ISO string date for long-away user", () => {
      expect(computeLifecycleState(true, daysAgo(25).toISOString())).toBe("long_away");
    });
  });

  describe("constant values", () => {
    it("RECENT_THRESHOLD_DAYS is 7", () => {
      expect(RECENT_THRESHOLD_DAYS).toBe(7);
    });

    it("LONG_AWAY_THRESHOLD_DAYS is 21", () => {
      expect(LONG_AWAY_THRESHOLD_DAYS).toBe(21);
    });
  });
});
