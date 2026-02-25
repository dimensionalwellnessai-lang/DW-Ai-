import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  getLocalDateKey,
  isDWPlus,
  setDWPlus,
  activateDWPlus,
  getMessageCount,
  incrementMessageCount,
  canSendMessage,
  getSessionCount,
  incrementSessionCount,
  canStartNewSession,
  getBonusMessageFlag,
  consumeBonusMessage,
  getBonusSessionFlag,
  consumeBonusSession,
  FREE_LIMITS,
} from "./entitlement";

describe("entitlement service", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // ── getLocalDateKey ─────────────────────────────────────────────────────
  describe("getLocalDateKey", () => {
    it("returns today's date in YYYY-MM-DD format", () => {
      const key = getLocalDateKey();
      expect(key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      const [y, m, d] = key.split("-").map(Number);
      const now = new Date();
      expect(y).toBe(now.getFullYear());
      expect(m).toBe(now.getMonth() + 1);
      expect(d).toBe(now.getDate());
    });

    it("changes at local midnight", () => {
      // Use explicit fixed times for both "today" and "tomorrow" to avoid flakiness
      const today = new Date("2024-06-15T12:00:00");
      const tomorrow = new Date("2024-06-16T00:00:01");

      vi.useFakeTimers();

      vi.setSystemTime(today);
      const todayKey = getLocalDateKey();

      vi.setSystemTime(tomorrow);
      const tomorrowKey = getLocalDateKey();

      vi.useRealTimers();

      expect(tomorrowKey).not.toBe(todayKey);
    });
  });

  // ── isDWPlus / setDWPlus ────────────────────────────────────────────────
  describe("isDWPlus / setDWPlus", () => {
    it("defaults to false", () => {
      expect(isDWPlus()).toBe(false);
    });

    it("sets to true", () => {
      setDWPlus(true);
      expect(isDWPlus()).toBe(true);
    });

    it("sets back to false", () => {
      setDWPlus(true);
      setDWPlus(false);
      expect(isDWPlus()).toBe(false);
    });
  });

  // ── message counter ─────────────────────────────────────────────────────
  describe("message counter", () => {
    it("starts at 0", () => {
      expect(getMessageCount()).toBe(0);
    });

    it("increments correctly", () => {
      expect(incrementMessageCount()).toBe(1);
      expect(incrementMessageCount()).toBe(2);
      expect(getMessageCount()).toBe(2);
    });

    it("resets at local midnight (new date key)", () => {
      incrementMessageCount();
      incrementMessageCount();
      // Simulate a new day by overwriting the stored date with yesterday
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, "0");
      const d = String(yesterday.getDate()).padStart(2, "0");
      localStorage.setItem("dw_msg_date", `${y}-${m}-${d}`);
      // Now reading should reset
      expect(getMessageCount()).toBe(0);
    });

    it("canSendMessage returns true below limit", () => {
      expect(canSendMessage()).toBe(true);
    });

    it("canSendMessage returns false at limit", () => {
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
      expect(canSendMessage()).toBe(false);
    });

    it("canSendMessage ignores limit for DW Plus users", () => {
      setDWPlus(true);
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
      expect(canSendMessage()).toBe(true);
    });

    it("treats corrupted count as 0 (NaN coercion)", () => {
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", "not-a-number");
      expect(getMessageCount()).toBe(0);
      expect(canSendMessage()).toBe(true);
    });
  });

  // ── session counter ─────────────────────────────────────────────────────
  describe("session counter", () => {
    it("starts at 0", () => {
      expect(getSessionCount()).toBe(0);
    });

    it("increments correctly", () => {
      expect(incrementSessionCount()).toBe(1);
      expect(incrementSessionCount()).toBe(2);
      expect(getSessionCount()).toBe(2);
    });

    it("resets at local midnight (new date key)", () => {
      incrementSessionCount();
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const y = yesterday.getFullYear();
      const m = String(yesterday.getMonth() + 1).padStart(2, "0");
      const d = String(yesterday.getDate()).padStart(2, "0");
      localStorage.setItem("dw_session_date", `${y}-${m}-${d}`);
      expect(getSessionCount()).toBe(0);
    });

    it("canStartNewSession returns true below limit", () => {
      expect(canStartNewSession()).toBe(true);
    });

    it("canStartNewSession returns false at limit", () => {
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", String(FREE_LIMITS.sessionsPerDay));
      expect(canStartNewSession()).toBe(false);
    });

    it("canStartNewSession ignores limit for DW Plus users", () => {
      setDWPlus(true);
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", String(FREE_LIMITS.sessionsPerDay));
      expect(canStartNewSession()).toBe(true);
    });

    it("treats corrupted count as 0 (NaN coercion)", () => {
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", "not-a-number");
      expect(getSessionCount()).toBe(0);
      expect(canStartNewSession()).toBe(true);
    });
  });

  // ── bonus mechanics ─────────────────────────────────────────────────────
  describe("bonus mechanics", () => {
    it("no bonus message by default", () => {
      expect(getBonusMessageFlag()).toBe(false);
    });

    it("activateDWPlus with message_limit grants bonus message only when at cap", () => {
      // Simulate being at the daily message cap
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
      activateDWPlus("message_limit");
      expect(isDWPlus()).toBe(true);
      expect(getBonusMessageFlag()).toBe(true);
    });

    it("activateDWPlus with message_limit does NOT grant bonus when below cap", () => {
      // Below the cap — no bonus should be granted
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", "10");
      activateDWPlus("message_limit");
      expect(isDWPlus()).toBe(true);
      expect(getBonusMessageFlag()).toBe(false);
    });

    it("consumeBonusMessage clears the flag", () => {
      localStorage.setItem("dw_msg_date", getLocalDateKey());
      localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
      activateDWPlus("message_limit");
      consumeBonusMessage();
      expect(getBonusMessageFlag()).toBe(false);
    });

    it("no bonus session by default", () => {
      expect(getBonusSessionFlag()).toBe(false);
    });

    it("activateDWPlus with session_limit grants bonus session only when at cap", () => {
      // Simulate being at the daily session cap
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", String(FREE_LIMITS.sessionsPerDay));
      activateDWPlus("session_limit");
      expect(isDWPlus()).toBe(true);
      expect(getBonusSessionFlag()).toBe(true);
    });

    it("activateDWPlus with session_limit does NOT grant bonus when below cap", () => {
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", "1");
      activateDWPlus("session_limit");
      expect(isDWPlus()).toBe(true);
      expect(getBonusSessionFlag()).toBe(false);
    });

    it("consumeBonusSession clears the flag", () => {
      localStorage.setItem("dw_session_date", getLocalDateKey());
      localStorage.setItem("dw_session_count", String(FREE_LIMITS.sessionsPerDay));
      activateDWPlus("session_limit");
      consumeBonusSession();
      expect(getBonusSessionFlag()).toBe(false);
    });

    it("activateDWPlus with paywall context grants no bonus", () => {
      activateDWPlus("paywall");
      expect(isDWPlus()).toBe(true);
      expect(getBonusMessageFlag()).toBe(false);
      expect(getBonusSessionFlag()).toBe(false);
    });

    it("activateDWPlus always resets both flags before setting them", () => {
      // Pre-set both flags to true via storage directly
      localStorage.setItem("dw_bonus_message", "true");
      localStorage.setItem("dw_bonus_session", "true");
      // Upgrade via paywall (no cap check), both flags should be cleared
      activateDWPlus("paywall");
      expect(getBonusMessageFlag()).toBe(false);
      expect(getBonusSessionFlag()).toBe(false);
    });
  });
});
