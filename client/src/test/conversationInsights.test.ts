import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  getSuppressions,
  addSuppression,
  recordNotHelpful,
  shouldCaptureInsight,
  getInsights,
  saveInsight,
  buildInsight,
  type Insight,
  type SuppressionPattern,
} from "../core/conversationInsights";

// ─── localStorage mock ────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
};

vi.stubGlobal("localStorage", localStorageMock);

// Helper to build a minimal Insight without needing full conversation text
function makeInsight(overrides: Partial<Insight> = {}): Insight {
  return {
    id: `ins_test_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    source: { surface: "talk" },
    category: "planning",
    title: "Focus on building healthy routines",
    summary: "Start with small steps each morning to build momentum.",
    ...overrides,
  };
}

// ─── getSuppressions / addSuppression ─────────────────────────────────────────

describe("getSuppressions", () => {
  beforeEach(() => localStorageMock.clear());

  it("returns an empty array when no suppressions are stored", () => {
    expect(getSuppressions()).toEqual([]);
  });

  it("returns stored suppression patterns", () => {
    const pattern: SuppressionPattern = { category: "planning", keyword: "routine" };
    addSuppression(pattern);
    const result = getSuppressions();
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(pattern);
  });
});

describe("addSuppression", () => {
  beforeEach(() => localStorageMock.clear());

  it("stores a new suppression pattern", () => {
    addSuppression({ category: "exploration", keyword: "anxious" });
    expect(getSuppressions()).toHaveLength(1);
  });

  it("deduplicates patterns with the same category and keyword", () => {
    const pattern: SuppressionPattern = { category: "planning", keyword: "goal" };
    addSuppression(pattern);
    addSuppression(pattern);
    expect(getSuppressions()).toHaveLength(1);
  });

  it("allows different keywords for the same category", () => {
    addSuppression({ category: "planning", keyword: "goal" });
    addSuppression({ category: "planning", keyword: "habit" });
    expect(getSuppressions()).toHaveLength(2);
  });

  it("allows the same keyword for different categories", () => {
    addSuppression({ category: "planning", keyword: "focus" });
    addSuppression({ category: "exploration", keyword: "focus" });
    expect(getSuppressions()).toHaveLength(2);
  });

  it("fails silently when localStorage is unavailable", () => {
    const origSetItem = localStorageMock.setItem;
    localStorageMock.setItem = () => { throw new Error("quota exceeded"); };
    expect(() => addSuppression({ category: "planning", keyword: "test" })).not.toThrow();
    localStorageMock.setItem = origSetItem;
  });
});

// ─── recordNotHelpful ─────────────────────────────────────────────────────────

describe("recordNotHelpful", () => {
  beforeEach(() => localStorageMock.clear());

  it("removes the insight from storage", () => {
    const insight = makeInsight();
    saveInsight(insight);
    expect(getInsights().find((i) => i.id === insight.id)).toBeDefined();

    recordNotHelpful(insight);
    expect(getInsights().find((i) => i.id === insight.id)).toBeUndefined();
  });

  it("adds a suppression pattern derived from the insight", () => {
    const insight = makeInsight({ category: "planning", title: "Build healthy morning habits" });
    saveInsight(insight);
    recordNotHelpful(insight);

    const suppressions = getSuppressions();
    expect(suppressions.length).toBeGreaterThan(0);
    // keyword should be from the title, category should match
    const match = suppressions.find((s) => s.category === "planning");
    expect(match).toBeDefined();
  });

  it("does not add a suppression when title has no keyword of ≥ 4 chars", () => {
    const insight = makeInsight({ title: "Ok. Go." });
    saveInsight(insight);
    recordNotHelpful(insight);
    // No valid keyword extracted – suppressions should remain empty
    expect(getSuppressions()).toHaveLength(0);
  });
});

// ─── shouldCaptureInsight – suppression integration ───────────────────────────

describe("shouldCaptureInsight with suppressions", () => {
  beforeEach(() => localStorageMock.clear());

  // Build sufficiently long texts that pass base heuristics (≥20 words each, planning signals)
  const planningUser =
    "I want to plan my goals and build morning habits starting next week with a new routine. " +
    "I really need to focus and commit to taking the right action steps every single day.";
  const planningAssistant =
    "Great plan! Start small by focusing on one goal at a time. " +
    "Building a routine takes consistency and small daily actions. " +
    "Consider scheduling your habits in the morning for better adherence. " +
    "Setting clear action steps each week will help you make steady progress toward your goals.";

  it("captures normally when no suppressions exist", () => {
    expect(shouldCaptureInsight({ userText: planningUser, assistantText: planningAssistant })).toBe(true);
  });

  it("suppresses capture when a matching suppression pattern exists", () => {
    // "plan" is a 4-char word that should be extracted from a planning insight title
    // Add a suppression pattern that matches the planning category + "plan" keyword
    addSuppression({ category: "planning", keyword: "plan" });
    expect(shouldCaptureInsight({ userText: planningUser, assistantText: planningAssistant })).toBe(false);
  });

  it("does not suppress when category differs", () => {
    // Add suppression for exploration category – should not suppress planning text
    addSuppression({ category: "exploration", keyword: "plan" });
    expect(shouldCaptureInsight({ userText: planningUser, assistantText: planningAssistant })).toBe(true);
  });

  it("does not suppress when keyword is absent from combined text", () => {
    addSuppression({ category: "planning", keyword: "meditation" });
    expect(shouldCaptureInsight({ userText: planningUser, assistantText: planningAssistant })).toBe(true);
  });
});
