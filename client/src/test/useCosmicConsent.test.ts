import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import {
  useCosmicConsent,
  getCosmicConsent,
  COSMIC_CONSENT_KEY,
  type CosmicConsent,
} from "../hooks/use-cosmic-consent";

// ─── localStorage mock ─────────────────────────────────────────────────────────

const store: Record<string, string> = {};

const localStorageMock = {
  getItem: (key: string) => store[key] ?? null,
  setItem: (key: string, value: string) => { store[key] = value; },
  removeItem: (key: string) => { delete store[key]; },
  clear: () => { Object.keys(store).forEach((k) => delete store[k]); },
};

vi.stubGlobal("localStorage", localStorageMock);

// ─── helpers ───────────────────────────────────────────────────────────────────

function clearStore() {
  localStorageMock.clear();
}

// ─── tests ─────────────────────────────────────────────────────────────────────

describe("useCosmicConsent", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns default off values when localStorage is empty", () => {
    const { result } = renderHook(() => useCosmicConsent());
    expect(result.current.consent).toEqual<CosmicConsent>({
      useAstrologyInGuidance: false,
      useNumerologyInGuidance: false,
    });
  });

  it("reads persisted consent from localStorage on mount", () => {
    const saved: CosmicConsent = { useAstrologyInGuidance: true, useNumerologyInGuidance: false };
    localStorageMock.setItem(COSMIC_CONSENT_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useCosmicConsent());
    expect(result.current.consent.useAstrologyInGuidance).toBe(true);
    expect(result.current.consent.useNumerologyInGuidance).toBe(false);
  });

  it("update() changes consent state and persists to localStorage", () => {
    const { result } = renderHook(() => useCosmicConsent());

    act(() => {
      result.current.update("useAstrologyInGuidance", true);
    });

    expect(result.current.consent.useAstrologyInGuidance).toBe(true);

    const persisted = JSON.parse(localStorageMock.getItem(COSMIC_CONSENT_KEY) ?? "{}") as CosmicConsent;
    expect(persisted.useAstrologyInGuidance).toBe(true);
  });

  it("update() of one field does not affect the other", () => {
    const { result } = renderHook(() => useCosmicConsent());

    act(() => {
      result.current.update("useNumerologyInGuidance", true);
    });

    expect(result.current.consent.useNumerologyInGuidance).toBe(true);
    expect(result.current.consent.useAstrologyInGuidance).toBe(false);
  });

  it("update() can disable a previously enabled toggle", () => {
    const saved: CosmicConsent = { useAstrologyInGuidance: true, useNumerologyInGuidance: true };
    localStorageMock.setItem(COSMIC_CONSENT_KEY, JSON.stringify(saved));

    const { result } = renderHook(() => useCosmicConsent());

    act(() => {
      result.current.update("useAstrologyInGuidance", false);
    });

    expect(result.current.consent.useAstrologyInGuidance).toBe(false);
    expect(result.current.consent.useNumerologyInGuidance).toBe(true);
  });
});

describe("getCosmicConsent (read-only helper)", () => {
  beforeEach(() => {
    clearStore();
  });

  it("returns defaults when localStorage is empty", () => {
    const consent = getCosmicConsent();
    expect(consent).toEqual<CosmicConsent>({
      useAstrologyInGuidance: false,
      useNumerologyInGuidance: false,
    });
  });

  it("returns persisted values from localStorage", () => {
    const saved: CosmicConsent = { useAstrologyInGuidance: false, useNumerologyInGuidance: true };
    localStorageMock.setItem(COSMIC_CONSENT_KEY, JSON.stringify(saved));

    const consent = getCosmicConsent();
    expect(consent.useNumerologyInGuidance).toBe(true);
    expect(consent.useAstrologyInGuidance).toBe(false);
  });

  it("handles corrupt localStorage data gracefully", () => {
    localStorageMock.setItem(COSMIC_CONSENT_KEY, "not-valid-json");
    const consent = getCosmicConsent();
    expect(consent).toEqual<CosmicConsent>({
      useAstrologyInGuidance: false,
      useNumerologyInGuidance: false,
    });
  });
});
