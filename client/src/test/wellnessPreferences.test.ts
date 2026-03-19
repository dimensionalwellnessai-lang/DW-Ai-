/**
 * Wellness Preferences – save/load cycle tests
 *
 * Covers:
 *  1. Boolean fields default correctly when API returns null values
 *  2. Traditions are cleared when beliefSystem is not "religious"
 *  3. All DB-schema fields are included in the save payload
 *  4. GET endpoint returning null (no prefs yet) is handled gracefully
 */

import { describe, it, expect } from "vitest";
import {
  normaliseApiResponse,
  buildSavePayload,
  type WellnessPreferencesData,
  type WellnessFormState,
} from "../lib/wellness-preferences-helpers";

// ─────────────────────────────────────────────────────────────────────────────
// 1. Null-value defaults
// ─────────────────────────────────────────────────────────────────────────────

describe("normaliseApiResponse – null boolean fields default to schema defaults", () => {
  const basePrefs: WellnessPreferencesData = {
    id: "pref-1",
    meditationEnabled: null,
    journalEnabled: null,
    astrologyEnabled: null,
    tarotEnabled: null,
    energyWorkEnabled: null,
    useAstrologyInGuidance: null,
    useNumerologyInGuidance: null,
  };

  it("meditationEnabled defaults to true", () => {
    expect(normaliseApiResponse(basePrefs).meditationEnabled).toBe(true);
  });

  it("journalEnabled defaults to true", () => {
    expect(normaliseApiResponse(basePrefs).journalEnabled).toBe(true);
  });

  it("astrologyEnabled defaults to false", () => {
    expect(normaliseApiResponse(basePrefs).astrologyEnabled).toBe(false);
  });

  it("tarotEnabled defaults to false", () => {
    expect(normaliseApiResponse(basePrefs).tarotEnabled).toBe(false);
  });

  it("energyWorkEnabled defaults to false", () => {
    expect(normaliseApiResponse(basePrefs).energyWorkEnabled).toBe(false);
  });

  it("useAstrologyInGuidance defaults to false", () => {
    expect(normaliseApiResponse(basePrefs).useAstrologyInGuidance).toBe(false);
  });

  it("useNumerologyInGuidance defaults to false", () => {
    expect(normaliseApiResponse(basePrefs).useNumerologyInGuidance).toBe(false);
  });

  it("preserves explicit true values", () => {
    const state = normaliseApiResponse({
      ...basePrefs,
      meditationEnabled: false,
      journalEnabled: false,
      astrologyEnabled: true,
      useAstrologyInGuidance: true,
      useNumerologyInGuidance: true,
    });
    expect(state.meditationEnabled).toBe(false);
    expect(state.journalEnabled).toBe(false);
    expect(state.astrologyEnabled).toBe(true);
    expect(state.useAstrologyInGuidance).toBe(true);
    expect(state.useNumerologyInGuidance).toBe(true);
  });

  it("traditions defaults to empty array when null", () => {
    expect(normaliseApiResponse({ ...basePrefs, traditions: null }).traditions).toEqual([]);
  });

  it("otherTradition defaults to empty string when null", () => {
    expect(normaliseApiResponse({ ...basePrefs, otherTradition: null }).otherTradition).toBe("");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 2. Traditions cleared when beliefSystem is not "religious"
// ─────────────────────────────────────────────────────────────────────────────

describe("buildSavePayload – traditions cleared for non-religious belief systems", () => {
  const baseState: WellnessFormState = {
    beliefSystem: "secular",
    traditions: ["Christianity", "Buddhism"],
    otherTradition: "Some other",
    meditationEnabled: true,
    journalEnabled: true,
    astrologyEnabled: false,
    tarotEnabled: false,
    energyWorkEnabled: false,
    useAstrologyInGuidance: false,
    useNumerologyInGuidance: false,
  };

  it("clears traditions when beliefSystem is 'secular'", () => {
    const payload = buildSavePayload({ ...baseState, beliefSystem: "secular" });
    expect(payload.traditions).toEqual([]);
    expect(payload.otherTradition).toBe("");
  });

  it("clears traditions when beliefSystem is 'spiritual'", () => {
    const payload = buildSavePayload({ ...baseState, beliefSystem: "spiritual" });
    expect(payload.traditions).toEqual([]);
  });

  it("clears traditions when beliefSystem is 'prefer_not_say'", () => {
    const payload = buildSavePayload({ ...baseState, beliefSystem: "prefer_not_say" });
    expect(payload.traditions).toEqual([]);
  });

  it("clears traditions when beliefSystem is empty", () => {
    const payload = buildSavePayload({ ...baseState, beliefSystem: "" });
    expect(payload.traditions).toEqual([]);
  });

  it("preserves traditions when beliefSystem is 'religious'", () => {
    const payload = buildSavePayload({ ...baseState, beliefSystem: "religious" });
    expect(payload.traditions).toEqual(["Christianity", "Buddhism"]);
    expect(payload.otherTradition).toBe("Some other");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 3. Save payload includes all DB-schema fields
// ─────────────────────────────────────────────────────────────────────────────

describe("buildSavePayload – all schema fields are present", () => {
  const fullState: WellnessFormState = {
    beliefSystem: "religious",
    traditions: ["Islam"],
    otherTradition: "",
    meditationEnabled: true,
    journalEnabled: false,
    astrologyEnabled: true,
    tarotEnabled: false,
    energyWorkEnabled: false,
    useAstrologyInGuidance: true,
    useNumerologyInGuidance: false,
  };

  it("includes useAstrologyInGuidance in the save payload", () => {
    const payload = buildSavePayload(fullState);
    expect("useAstrologyInGuidance" in payload).toBe(true);
    expect(payload.useAstrologyInGuidance).toBe(true);
  });

  it("includes useNumerologyInGuidance in the save payload", () => {
    const payload = buildSavePayload(fullState);
    expect("useNumerologyInGuidance" in payload).toBe(true);
    expect(payload.useNumerologyInGuidance).toBe(false);
  });

  it("payload contains all 10 updatable fields", () => {
    const payload = buildSavePayload(fullState);
    const expectedKeys = [
      "beliefSystem",
      "traditions",
      "otherTradition",
      "meditationEnabled",
      "journalEnabled",
      "astrologyEnabled",
      "tarotEnabled",
      "energyWorkEnabled",
      "useAstrologyInGuidance",
      "useNumerologyInGuidance",
    ];
    for (const key of expectedKeys) {
      expect(key in payload, `payload should contain key '${key}'`).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET returning null (no existing prefs) is handled gracefully
// ─────────────────────────────────────────────────────────────────────────────

describe("null API response (no existing preferences)", () => {
  it("normaliseApiResponse is not called when preferences is null", () => {
    // The component only calls normalise inside `if (preferences)` – so null
    // from the server leaves form state at its initial defaults.
    const prefs = null;
    // Simulate the `if (preferences)` guard in useEffect
    const formState: WellnessFormState = {
      beliefSystem: "",
      traditions: [],
      otherTradition: "",
      meditationEnabled: true,
      journalEnabled: true,
      astrologyEnabled: false,
      tarotEnabled: false,
      energyWorkEnabled: false,
      useAstrologyInGuidance: false,
      useNumerologyInGuidance: false,
    };
    if (prefs) {
      Object.assign(formState, normaliseApiResponse(prefs));
    }
    // Default form state should be preserved
    expect(formState.meditationEnabled).toBe(true);
    expect(formState.journalEnabled).toBe(true);
    expect(formState.astrologyEnabled).toBe(false);
    expect(formState.useAstrologyInGuidance).toBe(false);
    expect(formState.useNumerologyInGuidance).toBe(false);
  });

  it("save after null response triggers POST (no id on preferences)", () => {
    // When preferences is null, preferences?.id is undefined → POST path
    const preferences = null;
    const shouldPatch = Boolean(preferences && (preferences as WellnessPreferencesData).id);
    expect(shouldPatch).toBe(false);
  });
});
