import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  FEATURE_FLAGS,
  isFeatureEnabled,
  getEnabledFeatures,
  areAllFeaturesEnabled,
  type FeatureFlags,
} from "../config/featureFlags";

// ─── Flag value types ─────────────────────────────────────────────────────────

describe("FEATURE_FLAGS shape", () => {
  it("exports a non-null object", () => {
    expect(FEATURE_FLAGS).toBeDefined();
    expect(typeof FEATURE_FLAGS).toBe("object");
  });

  it("every flag value is a boolean", () => {
    for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
      expect(typeof value, `flag ${key} should be boolean`).toBe("boolean");
    }
  });

  it("contains all expected flag keys", () => {
    const expectedKeys: (keyof FeatureFlags)[] = [
      "NEW_NAVIGATION",
      "NEW_ONBOARDING",
      "ALL_FEATURES_VIEW",
      "AI_PERSONALIZATION",
      "LIFE_BLUEPRINT",
      "HOME_CONSOLIDATION",
      "APP_TOUR",
      "INTERACTION_ENGINE",
      "CONVERSATION_INSIGHTS",
      "DW_INSIGHT_JOURNAL",
      "ELEVATION_ENGINE",
      "DAILY_CHECKIN",
      "DW_LEARNS",
    ];
    for (const key of expectedKeys) {
      expect(FEATURE_FLAGS).toHaveProperty(key);
    }
  });
});

// ─── isFeatureEnabled ─────────────────────────────────────────────────────────

describe("isFeatureEnabled", () => {
  it("returns true for flags that are enabled by default", () => {
    expect(isFeatureEnabled("NEW_NAVIGATION")).toBe(true);
    expect(isFeatureEnabled("NEW_ONBOARDING")).toBe(true);
    expect(isFeatureEnabled("HOME_CONSOLIDATION")).toBe(true);
    expect(isFeatureEnabled("DW_LEARNS")).toBe(true);
  });

  it("returns false for LIFE_BLUEPRINT which is off by default", () => {
    expect(isFeatureEnabled("LIFE_BLUEPRINT")).toBe(false);
  });

  it("returns the same value as direct flag lookup", () => {
    for (const key of Object.keys(FEATURE_FLAGS) as (keyof FeatureFlags)[]) {
      expect(isFeatureEnabled(key)).toBe(FEATURE_FLAGS[key]);
    }
  });
});

// ─── getEnabledFeatures ───────────────────────────────────────────────────────

describe("getEnabledFeatures", () => {
  it("returns an array", () => {
    expect(Array.isArray(getEnabledFeatures())).toBe(true);
  });

  it("includes flags that are known to be enabled", () => {
    const enabled = getEnabledFeatures();
    expect(enabled).toContain("NEW_NAVIGATION");
    expect(enabled).toContain("DW_LEARNS");
  });

  it("excludes LIFE_BLUEPRINT which is off by default", () => {
    const enabled = getEnabledFeatures();
    expect(enabled).not.toContain("LIFE_BLUEPRINT");
  });

  it("every returned key is actually enabled in FEATURE_FLAGS", () => {
    for (const key of getEnabledFeatures()) {
      expect(FEATURE_FLAGS[key]).toBe(true);
    }
  });
});

// ─── areAllFeaturesEnabled ────────────────────────────────────────────────────

describe("areAllFeaturesEnabled", () => {
  it("returns true when all provided flags are on", () => {
    expect(areAllFeaturesEnabled("NEW_NAVIGATION", "DW_LEARNS")).toBe(true);
  });

  it("returns false if any flag is off", () => {
    expect(areAllFeaturesEnabled("NEW_NAVIGATION", "LIFE_BLUEPRINT")).toBe(false);
  });

  it("returns true for a single enabled flag", () => {
    expect(areAllFeaturesEnabled("HOME_CONSOLIDATION")).toBe(true);
  });

  it("returns false for a single disabled flag", () => {
    expect(areAllFeaturesEnabled("LIFE_BLUEPRINT")).toBe(false);
  });
});
