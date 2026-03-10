/**
 * Tests for queryClient cache configuration and STALE_TIME constants.
 *
 * These tests validate that the React Query client is configured with the
 * correct default cache settings to meet the performance acceptance criteria:
 * cache hits exceeded thresholds, no duplicate API loads.
 */

import { describe, it, expect } from "vitest";
import { queryClient, STALE_TIME, parseApiError } from "../lib/queryClient";

describe("queryClient defaults", () => {
  it("has staleTime set to Infinity by default (no unnecessary refetches)", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.staleTime).toBe(Infinity);
  });

  it("has gcTime set to 10 minutes (inactive data retained for navigation)", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    // 10 minutes = 600_000 ms
    expect(defaults?.gcTime).toBe(10 * 60 * 1000);
  });

  it("has refetchInterval disabled (no polling)", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.refetchInterval).toBe(false);
  });

  it("has refetchOnWindowFocus disabled (no refetch on tab switch)", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.refetchOnWindowFocus).toBe(false);
  });

  it("has retry disabled (fail fast, no cascade delays)", () => {
    const defaults = queryClient.getDefaultOptions().queries;
    expect(defaults?.retry).toBe(false);
  });

  it("disables mutation retry", () => {
    const defaults = queryClient.getDefaultOptions().mutations;
    expect(defaults?.retry).toBe(false);
  });
});

describe("STALE_TIME constants", () => {
  it("FOREVER is Infinity", () => {
    expect(STALE_TIME.FOREVER).toBe(Infinity);
  });

  it("AUTH is 30 seconds", () => {
    expect(STALE_TIME.AUTH).toBe(30_000);
  });

  it("MEDIUM is 5 minutes", () => {
    expect(STALE_TIME.MEDIUM).toBe(5 * 60 * 1000);
  });

  it("SHORT is 1 minute", () => {
    expect(STALE_TIME.SHORT).toBe(60_000);
  });

  it("MEDIUM >= SHORT (cache hierarchy is consistent)", () => {
    expect(STALE_TIME.MEDIUM).toBeGreaterThanOrEqual(STALE_TIME.SHORT);
  });

  it("FOREVER >= MEDIUM (cache hierarchy is consistent)", () => {
    expect(STALE_TIME.FOREVER).toBeGreaterThanOrEqual(STALE_TIME.MEDIUM);
  });
});

describe("parseApiError", () => {
  it("extracts error field from JSON body", () => {
    const err = new Error('503: {"error":"AI is not configured on this server."}');
    expect(parseApiError(err)).toBe("AI is not configured on this server.");
  });

  it("extracts message field from JSON body when error field is absent", () => {
    const err = new Error('400: {"message":"Message is required"}');
    expect(parseApiError(err)).toBe("Message is required");
  });

  it("returns raw body text when JSON parse fails", () => {
    const err = new Error("503: Service Unavailable");
    expect(parseApiError(err)).toBe("Service Unavailable");
  });

  it("returns full error message when no colon separator is present", () => {
    const err = new Error("Network request failed");
    expect(parseApiError(err)).toBe("Network request failed");
  });

  it("returns fallback string for non-Error input", () => {
    expect(parseApiError("something went wrong")).toBe(
      "An unexpected error occurred. Please try again.",
    );
    expect(parseApiError(null)).toBe(
      "An unexpected error occurred. Please try again.",
    );
    expect(parseApiError(undefined)).toBe(
      "An unexpected error occurred. Please try again.",
    );
  });

  it("prefers error field over message field when both are present", () => {
    const err = new Error('422: {"error":"Validation failed","message":"Also valid"}');
    expect(parseApiError(err)).toBe("Validation failed");
  });

  it("falls back to the full error.message when JSON object has neither error nor message string fields", () => {
    const err = new Error('500: {"code":42}');
    expect(parseApiError(err)).toBe('500: {"code":42}');
  });
});
