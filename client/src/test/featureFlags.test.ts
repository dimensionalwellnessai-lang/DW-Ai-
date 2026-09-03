// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from "vitest";
import type { FeatureFlags } from "../config/featureFlags";

async function loadFeatureFlagsModule() {
  return import("../config/featureFlags");
}

beforeEach(() => {
  vi.resetModules();
  localStorage.clear();
  window.history.replaceState({}, "", "/");
});

// ─── Flag value types ─────────────────────────────────────────────────────────

describe("FEATURE_FLAGS shape", () => {
  it("exports a non-null object", async () => {
    const { FEATURE_FLAGS } = await loadFeatureFlagsModule();
    expect(FEATURE_FLAGS).toBeDefined();
    expect(typeof FEATURE_FLAGS).toBe("object");
  });

  it("every flag value is a boolean", async () => {
    const { FEATURE_FLAGS } = await loadFeatureFlagsModule();
    for (const [key, value] of Object.entries(FEATURE_FLAGS)) {
      expect(typeof value, `flag ${key} should be boolean`).toBe("boolean");
    }
  });

  it("contains all expected flag keys", async () => {
    const { FEATURE_FLAGS } = await loadFeatureFlagsModule();
    const expectedKeys: (keyof FeatureFlags)[] = [
      "onboarding_v2_enabled",
      "onboarding_prioritization_v2",
      "NEW_NAVIGATION",
      "NEW_ONBOARDING",
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
      // Agentic Companion flags
      "exploreCard",
      "entertainmentCard",
      "creatorsCard",
      "companionshipCard",
      "dwProactiveNotices",
      "actionEngine",
      "sharedAttention",
    ];
    for (const key of expectedKeys) {
      expect(FEATURE_FLAGS).toHaveProperty(key);
    }
  });
});

// ─── isFeatureEnabled ─────────────────────────────────────────────────────────

describe("isFeatureEnabled", () => {
  it("returns true for flags that are enabled by default", async () => {
    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("NEW_NAVIGATION")).toBe(true);
    expect(isFeatureEnabled("NEW_ONBOARDING")).toBe(true);
    expect(isFeatureEnabled("HOME_CONSOLIDATION")).toBe(true);
    expect(isFeatureEnabled("DW_LEARNS")).toBe(true);
  });

  it("returns false for LIFE_BLUEPRINT which is off by default", async () => {
    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("LIFE_BLUEPRINT")).toBe(false);
  });

  it("keeps onboarding_v2_enabled off by default", async () => {
    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("onboarding_v2_enabled")).toBe(false);
  });

  it("keeps onboarding_prioritization_v2 off by default", async () => {
    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("onboarding_prioritization_v2")).toBe(false);
  });

  it("agentic companion flags are off by default when no localStorage keys are set", async () => {
    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("exploreCard")).toBe(false);
    expect(isFeatureEnabled("entertainmentCard")).toBe(false);
    expect(isFeatureEnabled("creatorsCard")).toBe(false);
    expect(isFeatureEnabled("companionshipCard")).toBe(false);
    expect(isFeatureEnabled("dwProactiveNotices")).toBe(false);
    expect(isFeatureEnabled("actionEngine")).toBe(false);
    expect(isFeatureEnabled("sharedAttention")).toBe(false);
  });

  it("enables agentic companion flags when localStorage keys are true", async () => {
    localStorage.setItem("dw_explore_card", "true");
    localStorage.setItem("dw_entertainment_card", "true");
    localStorage.setItem("dw_creators_card", "true");
    localStorage.setItem("dw_companionship_card", "true");
    localStorage.setItem("dw_proactive_notices", "true");
    localStorage.setItem("dw_action_engine", "true");
    localStorage.setItem("dw_shared_attention", "true");

    const { isFeatureEnabled } = await loadFeatureFlagsModule();
    expect(isFeatureEnabled("exploreCard")).toBe(true);
    expect(isFeatureEnabled("entertainmentCard")).toBe(true);
    expect(isFeatureEnabled("creatorsCard")).toBe(true);
    expect(isFeatureEnabled("companionshipCard")).toBe(true);
    expect(isFeatureEnabled("dwProactiveNotices")).toBe(true);
    expect(isFeatureEnabled("actionEngine")).toBe(true);
    expect(isFeatureEnabled("sharedAttention")).toBe(true);
  });

  it("returns the same value as direct flag lookup", async () => {
    const { FEATURE_FLAGS, isFeatureEnabled } = await loadFeatureFlagsModule();
    for (const key of Object.keys(FEATURE_FLAGS) as (keyof FeatureFlags)[]) {
      expect(isFeatureEnabled(key)).toBe(FEATURE_FLAGS[key]);
    }
  });
});

// ─── getEnabledFeatures ───────────────────────────────────────────────────────

describe("getEnabledFeatures", () => {
  it("returns an array", async () => {
    const { getEnabledFeatures } = await loadFeatureFlagsModule();
    expect(Array.isArray(getEnabledFeatures())).toBe(true);
  });

  it("includes flags that are known to be enabled", async () => {
    const { getEnabledFeatures } = await loadFeatureFlagsModule();
    const enabled = getEnabledFeatures();
    expect(enabled).toContain("NEW_NAVIGATION");
    expect(enabled).toContain("DW_LEARNS");
  });

  it("excludes LIFE_BLUEPRINT which is off by default", async () => {
    const { getEnabledFeatures } = await loadFeatureFlagsModule();
    const enabled = getEnabledFeatures();
    expect(enabled).not.toContain("LIFE_BLUEPRINT");
  });

  it("excludes agentic companion flags which are off by default", async () => {
    const { getEnabledFeatures } = await loadFeatureFlagsModule();
    const enabled = getEnabledFeatures();
    expect(enabled).not.toContain("exploreCard");
    expect(enabled).not.toContain("entertainmentCard");
    expect(enabled).not.toContain("creatorsCard");
    expect(enabled).not.toContain("companionshipCard");
    expect(enabled).not.toContain("dwProactiveNotices");
    expect(enabled).not.toContain("actionEngine");
    expect(enabled).not.toContain("sharedAttention");
  });

  it("every returned key is actually enabled in FEATURE_FLAGS", async () => {
    const { FEATURE_FLAGS, getEnabledFeatures } = await loadFeatureFlagsModule();
    for (const key of getEnabledFeatures()) {
      expect(FEATURE_FLAGS[key]).toBe(true);
    }
  });
});

// ─── areAllFeaturesEnabled ────────────────────────────────────────────────────

describe("areAllFeaturesEnabled", () => {
  it("returns true when all provided flags are on", async () => {
    const { areAllFeaturesEnabled } = await loadFeatureFlagsModule();
    expect(areAllFeaturesEnabled("NEW_NAVIGATION", "DW_LEARNS")).toBe(true);
  });

  it("returns false if any flag is off", async () => {
    const { areAllFeaturesEnabled } = await loadFeatureFlagsModule();
    expect(areAllFeaturesEnabled("NEW_NAVIGATION", "LIFE_BLUEPRINT")).toBe(false);
  });

  it("returns true for a single enabled flag", async () => {
    const { areAllFeaturesEnabled } = await loadFeatureFlagsModule();
    expect(areAllFeaturesEnabled("HOME_CONSOLIDATION")).toBe(true);
  });

  it("returns false for a single disabled flag", async () => {
    const { areAllFeaturesEnabled } = await loadFeatureFlagsModule();
    expect(areAllFeaturesEnabled("LIFE_BLUEPRINT")).toBe(false);
  });
});
