/**
 * Regression Suite – Key Utility Flows for Home Command Center
 *
 * Tests the shared utility functions and logic that underpin the Home cards,
 * ensuring they remain correct across refactors.
 */

import { describe, it, expect } from "vitest";
import { buildElevationPlanPrefill } from "../features/home/elevationUtils";
import { getMomentumMessage } from "../features/home/components/MomentumCard";
import { buildFollowUpPrefill } from "../features/home/components/FollowUpCard";

// ═══════════════════════════════════════════════════════════════════════════════
// buildElevationPlanPrefill – regression
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildElevationPlanPrefill regression", () => {
  it("always contains '7-day elevation plan'", () => {
    expect(buildElevationPlanPrefill([])).toContain("7-day elevation plan");
    expect(buildElevationPlanPrefill(["Reason A"])).toContain("7-day elevation plan");
    expect(buildElevationPlanPrefill(["A", "B", "C"])).toContain("7-day elevation plan");
  });

  it("omits the 'I'm noticing:' clause when reasons array is empty", () => {
    const result = buildElevationPlanPrefill([]);
    expect(result).not.toContain("I'm noticing");
  });

  it("includes 'I'm noticing:' when at least one reason is given", () => {
    const result = buildElevationPlanPrefill(["Low energy"]);
    expect(result).toContain("I'm noticing: Low energy");
  });

  it("joins multiple reasons with '; '", () => {
    const result = buildElevationPlanPrefill(["Low energy", "Habit drift"]);
    expect(result).toContain("Low energy; Habit drift");
  });

  it("handles a single-element reasons array without a trailing semicolon", () => {
    const result = buildElevationPlanPrefill(["Stress"]);
    expect(result).not.toContain("; ");
    expect(result).toContain("Stress");
  });

  it("is a non-empty string for any input", () => {
    [[], ["x"], ["a", "b", "c", "d"]].forEach((reasons) => {
      expect(buildElevationPlanPrefill(reasons).length).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// getMomentumMessage regression – boundary cases
// ═══════════════════════════════════════════════════════════════════════════════

describe("getMomentumMessage regression", () => {
  it("returns a non-empty string for all zero inputs", () => {
    expect(getMomentumMessage(0, 0, 0).length).toBeGreaterThan(0);
  });

  it("treats streak < 7 as a short streak (not a superpower message)", () => {
    const msg = getMomentumMessage(1, 6, 0);
    expect(msg).not.toContain("superpower");
    expect(msg).toContain("6-day streak");
  });

  it("treats streak === 7 as the 'superpower' threshold", () => {
    const msg = getMomentumMessage(1, 7, 0);
    expect(msg).toContain("superpower");
  });

  it("streak message takes priority over habits+goals message", () => {
    const msg = getMomentumMessage(3, 5, 2);
    // A positive streak should dominate the message
    expect(msg).toContain("5-day streak");
    expect(msg).not.toContain("3 habit");
  });

  it("returns an 'active habits' message when only habits exist (no streak)", () => {
    const msg = getMomentumMessage(2, 0, 0);
    expect(msg).toContain("2 active habit");
  });

  it("correctly pluralises 1 vs multiple habits", () => {
    expect(getMomentumMessage(1, 0, 0)).toContain("1 active habit");
    expect(getMomentumMessage(2, 0, 0)).toContain("2 active habits");
  });

  it("correctly pluralises 1 vs multiple goals", () => {
    expect(getMomentumMessage(0, 0, 1)).toContain("1 active goal");
    expect(getMomentumMessage(0, 0, 2)).toContain("2 active goals");
  });

  it("mentions habits and goals when both are non-zero (streak = 0)", () => {
    const msg = getMomentumMessage(2, 0, 3);
    expect(msg).toContain("2 habit");
    expect(msg).toContain("3 goal");
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// buildFollowUpPrefill regression – priority ordering
// ═══════════════════════════════════════════════════════════════════════════════

describe("buildFollowUpPrefill regression – priority ordering", () => {
  const insight = { id: "i1", title: "Sleep quality", summary: "...", category: "health" };
  const goal = { id: "g1", title: "Run a 5K" };
  const event = { id: "e1", title: "Doctor visit", startTime: null, isAllDay: false };
  const followUp = { id: "fu1", prompt: "Did you rest enough?" };

  it("activeFollowUp takes highest priority over all others", () => {
    const result = buildFollowUpPrefill({
      latestInsight: insight,
      activeGoals: [goal],
      nextEvent: event,
      activeFollowUp: followUp,
    });
    expect(result).toBe("Did you rest enough?");
  });

  it("latestInsight takes priority over goals and events when no follow-up", () => {
    const result = buildFollowUpPrefill({
      latestInsight: insight,
      activeGoals: [goal],
      nextEvent: event,
      activeFollowUp: null,
    });
    expect(result).toContain("Sleep quality");
    expect(result).not.toContain("Run a 5K");
  });

  it("activeGoals take priority over nextEvent when no follow-up and no insight", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [goal],
      nextEvent: event,
      activeFollowUp: null,
    });
    expect(result).toContain("Run a 5K");
    expect(result).not.toContain("Doctor visit");
  });

  it("nextEvent is used when no follow-up, no insight, and no goals", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [],
      nextEvent: event,
      activeFollowUp: null,
    });
    expect(result).toContain("Doctor visit");
  });

  it("always returns a non-empty string regardless of inputs", () => {
    const result = buildFollowUpPrefill({
      latestInsight: null,
      activeGoals: [],
      nextEvent: null,
      activeFollowUp: null,
    });
    expect(result.length).toBeGreaterThan(0);
  });
});
