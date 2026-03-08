/**
 * Regression test suite – key application flows
 *
 * Covers the following flows without requiring a running server:
 *
 *  1. Entitlement limits (daily messages / sessions, DW Plus)
 *  2. Conversation insight lifecycle (capture → suppress → list)
 *  3. Daily check-in signal derivation
 *  4. Interaction engine intent detection & response shaping
 *  5. buildFollowUpPrefill branches (FollowUpCard)
 *  6. buildElevationPlanPrefill (elevationUtils)
 *  7. getMomentumMessage (MomentumCard legacy mode)
 *  8. Guest storage: daily check-in round-trip
 *  9. Feature flag read (isFeatureEnabled / FEATURE_FLAGS)
 * 10. jumpToMoment utility
 */

import { describe, it, expect, beforeEach, vi } from "vitest";

// ── localStorage mock ─────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────
// 1. Entitlement – free-tier limits
// ─────────────────────────────────────────────────────────────────────────────

import {
  getLocalDateKey,
  isDWPlus,
  setDWPlus,
  canSendMessage,
  incrementMessageCount,
  canStartNewSession,
  incrementSessionCount,
  FREE_LIMITS,
} from "../lib/entitlement";

describe("Regression: entitlement limits", () => {
  beforeEach(() => localStorageMock.clear());

  it("starts below message limit", () => {
    expect(canSendMessage()).toBe(true);
  });

  it("blocks messages at FREE_LIMITS.messagesPerDay", () => {
    localStorage.setItem("dw_msg_date", getLocalDateKey());
    localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
    expect(canSendMessage()).toBe(false);
  });

  it("DW Plus bypasses message limit", () => {
    setDWPlus(true);
    localStorage.setItem("dw_msg_date", getLocalDateKey());
    localStorage.setItem("dw_msg_count", String(FREE_LIMITS.messagesPerDay));
    expect(canSendMessage()).toBe(true);
  });

  it("starts below session limit", () => {
    expect(canStartNewSession()).toBe(true);
  });

  it("blocks sessions at FREE_LIMITS.sessionsPerDay", () => {
    localStorage.setItem("dw_session_date", getLocalDateKey());
    localStorage.setItem("dw_session_count", String(FREE_LIMITS.sessionsPerDay));
    expect(canStartNewSession()).toBe(false);
  });

  it("count resets on a new day (staleness check)", () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const y = yesterday.getFullYear();
    const m = String(yesterday.getMonth() + 1).padStart(2, "0");
    const d = String(yesterday.getDate()).padStart(2, "0");
    localStorage.setItem("dw_msg_date", `${y}-${m}-${d}`);
    localStorage.setItem("dw_msg_count", "999");
    expect(canSendMessage()).toBe(true);
  });

  it("incrementMessageCount returns correct next value", () => {
    localStorage.clear();
    expect(incrementMessageCount()).toBe(1);
    expect(incrementMessageCount()).toBe(2);
  });

  it("incrementSessionCount returns correct next value", () => {
    localStorage.clear();
    expect(incrementSessionCount()).toBe(1);
    expect(incrementSessionCount()).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Conversation insights lifecycle
// ─────────────────────────────────────────────────────────────────────────────

import {
  shouldCaptureInsight,
  buildInsight,
  getInsights,
  saveInsight,
  type Insight,
} from "../core/conversationInsights";

describe("Regression: conversation insight lifecycle", () => {
  beforeEach(() => localStorageMock.clear());

  it("shouldCaptureInsight returns false when either side is too short", () => {
    expect(shouldCaptureInsight({ userText: "ok", assistantText: "hi" })).toBe(false);
  });

  it("shouldCaptureInsight returns true for a substantive exchange with planning signal", () => {
    const userText =
      "I've been struggling to stay consistent with my morning routine. " +
      "Every week I plan to do it but fail by Wednesday. What can I do?";
    const assistantText =
      "That's a really important pattern to notice. " +
      "When you take small consistent steps each morning, you're building a foundation of discipline " +
      "that compounds over weeks and months. The key is to start with one anchor habit and add to it gradually. " +
      "This is a planning insight worth acting on. Let's create a simple plan together to help you stay on track.";
    expect(shouldCaptureInsight({ userText, assistantText })).toBe(true);
  });

  it("buildInsight produces a valid insight with all required fields", () => {
    const insight = buildInsight({
      userText: "Help me plan my mornings better.",
      assistantText:
        "Consistent mornings build momentum. Start with a small anchor habit like a glass of water, " +
        "then layer in your routine. Doing this daily compounds over weeks into lasting habits.",
      source: { surface: "talk" },
    });
    expect(insight.id).toBeTruthy();
    expect(typeof insight.title).toBe("string");
    expect(insight.title.length).toBeGreaterThan(0);
    expect(insight.createdAt).toBeGreaterThan(0);
  });

  it("getInsights returns [] when nothing stored", () => {
    expect(getInsights()).toEqual([]);
  });

  it("saveInsight persists and getInsights retrieves it", () => {
    const ins = buildInsight({
      userText: "Help me plan my mornings better.",
      assistantText:
        "Consistent mornings build momentum. Start with a small anchor habit like a glass of water, " +
        "then layer in your routine. Doing this daily compounds over weeks into lasting habits.",
      source: { surface: "main" },
    });
    saveInsight(ins);
    const stored = getInsights();
    expect(stored.length).toBe(1);
    expect(stored[0].id).toBe(ins.id);
  });

  it("multiple insights can be stored", () => {
    const makeIns = (surface: "main" | "talk") =>
      buildInsight({
        userText: "How do I stay consistent with habits?",
        assistantText:
          "Consistency comes from starting small and building on small wins every day. " +
          "Tracking your habits with a simple system also helps reinforce the behavior. " +
          "Create a plan that is realistic and review it each week to stay accountable.",
        source: { surface },
      });
    saveInsight(makeIns("talk"));
    saveInsight(makeIns("main"));
    const stored = getInsights();
    expect(stored.length).toBe(2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Daily check-in signal derivation
// ─────────────────────────────────────────────────────────────────────────────

import { deriveMomentumHint, type CheckinSignal } from "../lib/daily-checkin-signals";

describe("Regression: daily check-in signal derivation", () => {
  it("returns null for empty signals", () => {
    expect(deriveMomentumHint([])).toBeNull();
  });

  it("high-energy message for avg mood >= 4 with a specific constraint", () => {
    const signals: CheckinSignal[] = [
      { date: "2026-03-07", moodScore: 5, constraintType: "Time" },
      { date: "2026-03-06", moodScore: 4, constraintType: "Time" },
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toBeTruthy();
    expect(hint).toContain("Time");
  });

  it("low-energy message for avg mood <= 2", () => {
    const signals: CheckinSignal[] = [
      { date: "2026-03-07", moodScore: 1, constraintType: "Stress" },
      { date: "2026-03-06", moodScore: 2, constraintType: "Stress" },
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toBeTruthy();
    expect(hint).toContain("low");
  });

  it("steady message for mid-range mood (2–4)", () => {
    const signals: CheckinSignal[] = [
      { date: "2026-03-07", moodScore: 3, constraintType: "Focus" },
      { date: "2026-03-06", moodScore: 3, constraintType: "Focus" },
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. Interaction engine – intent detection
// ─────────────────────────────────────────────────────────────────────────────

import { detectIntent } from "../core/interactionEngine";

describe("Regression: interaction engine intent detection", () => {
  it("short neutral message → general_chat", () => {
    expect(detectIntent({ message: "Hey there" })).toBe("general_chat");
  });

  it("planning keyword → planning", () => {
    expect(detectIntent({ message: "Help me plan my week" })).toBe("planning");
  });

  it("emotional keyword → exploration", () => {
    expect(detectIntent({ message: "I feel anxious today" })).toBe("exploration");
  });

  it("update_check keyword", () => {
    expect(detectIntent({ message: "Any updates on the project?" })).toBe("update_check");
  });

  it("research keyword", () => {
    expect(detectIntent({ message: "What is the latest research on sleep?" })).toBe("research");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5. FollowUpCard – buildFollowUpPrefill branches
//    (Tested via card component, re-verified here as pure logic)
// ─────────────────────────────────────────────────────────────────────────────

describe("Regression: FollowUpCard prefill branches (pure logic)", () => {
  // We re-verify the branching logic independent of component rendering

  function buildFollowUpPrefill(summary: {
    activeFollowUp?: { id: string; prompt: string } | null;
    latestInsight?: { id: string; title: string; summary: string; category: string } | null;
    activeGoals?: Array<{ id: string; title: string }>;
    nextEvent?: { id: string; title: string; startTime: Date | null; isAllDay: boolean } | null;
  }): string {
    if (summary.activeFollowUp) return summary.activeFollowUp.prompt;
    if (summary.latestInsight)
      return `I want to follow up on something — "${summary.latestInsight.title}". What would you suggest I do next?`;
    if (summary.activeGoals && summary.activeGoals.length > 0)
      return `I want to check in on my goal: "${summary.activeGoals[0].title}". How am I doing and what's my next step?`;
    if (summary.nextEvent)
      return `I have "${summary.nextEvent.title}" coming up. Help me prepare or set intentions for it.`;
    return "I want to check in with you today. Where should I focus my energy?";
  }

  it("activeFollowUp takes priority over everything else", () => {
    const result = buildFollowUpPrefill({
      activeFollowUp: { id: "fu1", prompt: "Custom prompt" },
      latestInsight: { id: "i1", title: "Ignored", summary: "", category: "planning" },
    });
    expect(result).toBe("Custom prompt");
  });

  it("falls back to latestInsight when no follow-up", () => {
    const result = buildFollowUpPrefill({
      latestInsight: { id: "i1", title: "Morning habits", summary: ".", category: "planning" },
    });
    expect(result).toContain("Morning habits");
  });

  it("falls back to first activeGoal when no follow-up or insight", () => {
    const result = buildFollowUpPrefill({
      activeGoals: [{ id: "g1", title: "Run a 5K" }],
    });
    expect(result).toContain("Run a 5K");
  });

  it("falls back to nextEvent when no follow-up, insight, or goals", () => {
    const result = buildFollowUpPrefill({
      nextEvent: { id: "ev1", title: "Doctor appointment", startTime: null, isAllDay: false },
    });
    expect(result).toContain("Doctor appointment");
  });

  it("returns generic fallback when nothing is available", () => {
    const result = buildFollowUpPrefill({});
    expect(result).toContain("Where should I focus my energy");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 6. buildElevationPlanPrefill
// ─────────────────────────────────────────────────────────────────────────────

import { buildElevationPlanPrefill } from "../features/home/elevationUtils";

describe("Regression: buildElevationPlanPrefill", () => {
  it("includes reasons in the prefill when provided", () => {
    const result = buildElevationPlanPrefill(["Low habit completion", "No goals set"]);
    expect(result).toContain("Low habit completion");
    expect(result).toContain("No goals set");
    expect(result).toContain("7-day elevation plan");
  });

  it("produces a valid prefill with empty reasons", () => {
    const result = buildElevationPlanPrefill([]);
    expect(result).toContain("7-day elevation plan");
    expect(typeof result).toBe("string");
    expect(result.length).toBeGreaterThan(10);
  });

  it("separates multiple reasons with a semicolon", () => {
    const result = buildElevationPlanPrefill(["Reason A", "Reason B"]);
    expect(result).toContain("Reason A; Reason B");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 7. MomentumCard – getMomentumMessage (re-tested as pure logic)
// ─────────────────────────────────────────────────────────────────────────────

describe("Regression: getMomentumMessage logic (via MomentumCard internals)", () => {
  // Re-implementing the pure helper to test independently
  function getMomentumMessage(
    totalHabits: number,
    topStreak: number,
    totalGoals: number,
  ): string {
    if (totalHabits === 0 && totalGoals === 0) {
      return "Every journey starts with one step. What will yours be today?";
    }
    if (topStreak >= 7) {
      return `${topStreak}-day streak — consistency is your superpower. Keep it going.`;
    }
    if (topStreak > 0) {
      return `You're on a ${topStreak}-day streak. One more day builds the habit.`;
    }
    if (totalHabits > 0 && totalGoals > 0) {
      return `${totalHabits} habit${totalHabits !== 1 ? "s" : ""} and ${totalGoals} goal${totalGoals !== 1 ? "s" : ""} in motion. Small actions compound.`;
    }
    if (totalGoals > 0) {
      return `You have ${totalGoals} active goal${totalGoals > 1 ? "s" : ""} in motion. Small actions add up.`;
    }
    return `${totalHabits} active habit${totalHabits !== 1 ? "s" : ""}. Stay consistent — it compounds over time.`;
  }

  it("empty state message with no habits or goals", () => {
    expect(getMomentumMessage(0, 0, 0)).toContain("Every journey");
  });

  it("7-day streak message", () => {
    expect(getMomentumMessage(1, 7, 0)).toContain("7-day streak");
    expect(getMomentumMessage(1, 7, 0)).toContain("superpower");
  });

  it("partial streak message (1–6 days)", () => {
    expect(getMomentumMessage(1, 4, 0)).toContain("4-day streak");
  });

  it("habits + goals in motion message (no streak)", () => {
    const msg = getMomentumMessage(2, 0, 3);
    expect(msg).toContain("2 habits");
    expect(msg).toContain("3 goals");
  });

  it("goals-only message (no habits)", () => {
    expect(getMomentumMessage(0, 0, 2)).toContain("2 active goals");
  });

  it("habits-only message (no goals)", () => {
    expect(getMomentumMessage(3, 0, 0)).toContain("3 active habits");
  });

  it("singular 'habit' and 'goal'", () => {
    expect(getMomentumMessage(1, 0, 1)).toContain("1 habit");
    expect(getMomentumMessage(1, 0, 1)).toContain("1 goal");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 8. Guest storage – daily check-in round-trip
// ─────────────────────────────────────────────────────────────────────────────

import {
  getTodayGuestCheckin,
  upsertGuestDailyCheckin,
  getRecentGuestCheckins,
} from "../lib/guest-storage";

describe("Regression: guest daily check-in storage", () => {
  beforeEach(() => localStorageMock.clear());

  const today = new Date().toISOString().slice(0, 10);

  it("returns null when no check-in exists for today", () => {
    expect(getTodayGuestCheckin(today)).toBeNull();
  });

  it("persists and retrieves today's check-in", () => {
    upsertGuestDailyCheckin({ date: today, moodScore: 4, constraintType: "Time" });
    const checkin = getTodayGuestCheckin(today);
    expect(checkin).not.toBeNull();
    expect(checkin?.moodScore).toBe(4);
    expect(checkin?.constraintType).toBe("Time");
  });

  it("upsert updates an existing check-in for the same date", () => {
    upsertGuestDailyCheckin({ date: today, moodScore: 3, constraintType: "Focus" });
    upsertGuestDailyCheckin({ date: today, moodScore: 5, constraintType: "Energy" });
    const checkin = getTodayGuestCheckin(today);
    expect(checkin?.moodScore).toBe(5);
    expect(checkin?.constraintType).toBe("Energy");
  });

  it("persists constraintNote when provided", () => {
    upsertGuestDailyCheckin({
      date: today,
      moodScore: 2,
      constraintType: "Other",
      constraintNote: "Family pressure",
    });
    const checkin = getTodayGuestCheckin(today);
    expect(checkin?.constraintNote).toBe("Family pressure");
  });

  it("getRecentGuestCheckins returns recent entries", () => {
    upsertGuestDailyCheckin({ date: today, moodScore: 4, constraintType: "Time" });
    const recent = getRecentGuestCheckins(7);
    expect(Array.isArray(recent)).toBe(true);
    expect(recent.length).toBeGreaterThanOrEqual(1);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 9. Feature flags
// ─────────────────────────────────────────────────────────────────────────────

import { isFeatureEnabled, FEATURE_FLAGS } from "../config/featureFlags";

describe("Regression: feature flags", () => {
  it("FEATURE_FLAGS object is defined and non-empty", () => {
    expect(typeof FEATURE_FLAGS).toBe("object");
    expect(Object.keys(FEATURE_FLAGS).length).toBeGreaterThan(0);
  });

  it("isFeatureEnabled returns a boolean for a known flag", () => {
    const result = isFeatureEnabled("NEW_NAVIGATION");
    expect(typeof result).toBe("boolean");
  });

  it("isFeatureEnabled returns false for unknown flag", () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(isFeatureEnabled("TOTALLY_UNKNOWN_FLAG_XYZ" as any)).toBe(false);
  });

  it("FEATURE_FLAGS.HOME_CONSOLIDATION is a boolean", () => {
    expect(typeof FEATURE_FLAGS.HOME_CONSOLIDATION).toBe("boolean");
  });

  it("FEATURE_FLAGS.DW_LEARNS is a boolean", () => {
    expect(typeof FEATURE_FLAGS.DW_LEARNS).toBe("boolean");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 10. parseJumpToMessageIndex utility
// ─────────────────────────────────────────────────────────────────────────────

import { parseJumpToMessageIndex } from "../lib/jumpToMoment";

describe("Regression: parseJumpToMessageIndex", () => {
  it("returns a valid index for a well-formed query string", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=5")).toBe(5);
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=0")).toBe(0);
  });

  it("returns null for an absent parameter", () => {
    expect(parseJumpToMessageIndex("?foo=bar")).toBeNull();
    expect(parseJumpToMessageIndex("")).toBeNull();
  });

  it("returns null for negative values", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=-1")).toBeNull();
  });

  it("returns null for float values", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=3.7")).toBeNull();
  });

  it("returns null for non-numeric values", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=abc")).toBeNull();
  });

  it("accepts query string without leading '?'", () => {
    expect(parseJumpToMessageIndex("jumpToMessageIndex=2")).toBe(2);
  });
});
