/**
 * Tests for queryClient cache configuration and STALE_TIME constants.
 *
 * These tests validate that the React Query client is configured with the
 * correct default cache settings to meet the performance acceptance criteria:
 * cache hits exceeded thresholds, no duplicate API loads.
 */

import { describe, it, expect } from "vitest";
import { queryClient, STALE_TIME } from "../lib/queryClient";

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
