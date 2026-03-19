/**
 * Tests for the billing stub module (client/src/lib/billing.ts).
 *
 * These tests mock the global `fetch` to isolate the billing module from the
 * network, and mock `activateDWPlus` / `setDWPlus` from the entitlement module
 * so we can verify they are called with the right arguments without touching
 * localStorage state from the entitlement module.
 */

import { describe, it, expect, beforeEach, vi, type Mock } from "vitest";

// ── localStorage stub ─────────────────────────────────────────────────────────

const localStorageStore: Record<string, string> = {};
const localStorageMock = {
  getItem: (key: string) => localStorageStore[key] ?? null,
  setItem: (key: string, value: string) => { localStorageStore[key] = value; },
  removeItem: (key: string) => { delete localStorageStore[key]; },
  clear: () => { Object.keys(localStorageStore).forEach((k) => delete localStorageStore[k]); },
};
vi.stubGlobal("localStorage", localStorageMock);

// ── Mock entitlement helpers ──────────────────────────────────────────────────

vi.mock("./entitlement", () => ({
  activateDWPlus: vi.fn(),
  setDWPlus: vi.fn(),
}));

import { activateDWPlus, setDWPlus } from "./entitlement";
import { simulateUpgrade, simulateRestore, fetchSubscriptionStatus } from "./billing";

// ── fetch mock helper ─────────────────────────────────────────────────────────

function mockFetch(body: unknown, ok = true, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok,
      status,
      json: () => Promise.resolve(body),
      text: () => Promise.resolve(JSON.stringify(body)),
    }),
  );
}

// ─────────────────────────────────────────────────────────────────────────────

describe("billing stub", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
  });

  // ── simulateUpgrade ─────────────────────────────────────────────────────────

  describe("simulateUpgrade", () => {
    it("applies local entitlement immediately before the API call", async () => {
      mockFetch({ success: true, tier: "plus", message: "DW Plus activated" });
      await simulateUpgrade("plus", "paywall");
      expect(activateDWPlus).toHaveBeenCalledWith("paywall");
    });

    it("returns success result from API on happy path", async () => {
      mockFetch({ success: true, tier: "plus", message: "DW Plus activated" });
      const result = await simulateUpgrade("plus");
      expect(result.success).toBe(true);
      expect(result.tier).toBe("plus");
    });

    it("still returns success when backend call fails (graceful degradation)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
      const result = await simulateUpgrade("premium", "message_limit");
      // Local activation should still have been called
      expect(activateDWPlus).toHaveBeenCalledWith("message_limit");
      expect(result.success).toBe(true);
      expect(result.tier).toBe("plus");
    });

    it("passes plan in request body to the backend", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, tier: "plus", message: "ok" }),
      });
      vi.stubGlobal("fetch", fetchMock);
      await simulateUpgrade("lifetime", "paywall");
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { plan: string };
      expect(body.plan).toBe("lifetime");
    });

    it("defaults plan to 'plus' when called without arguments", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ success: true, tier: "plus", message: "ok" }),
      });
      vi.stubGlobal("fetch", fetchMock);
      await simulateUpgrade();
      const [, options] = fetchMock.mock.calls[0] as [string, RequestInit];
      const body = JSON.parse(options.body as string) as { plan: string };
      expect(body.plan).toBe("plus");
    });
  });

  // ── simulateRestore ─────────────────────────────────────────────────────────

  describe("simulateRestore", () => {
    it("activates entitlement when backend confirms plus tier", async () => {
      mockFetch({ success: true, tier: "plus", message: "DW Plus restored successfully" });
      const result = await simulateRestore();
      expect(activateDWPlus).toHaveBeenCalledWith("restore");
      expect(result.success).toBe(true);
      expect(result.tier).toBe("plus");
    });

    it("does NOT activate entitlement when backend returns no subscription", async () => {
      mockFetch({ success: false, tier: "free", message: "No active subscription found" });
      const result = await simulateRestore();
      expect(activateDWPlus).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
    });

    it("falls back to failure on network error (does NOT grant access)", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network error")));
      const result = await simulateRestore();
      // Should NOT call activateDWPlus — cannot verify subscription without server
      expect(activateDWPlus).not.toHaveBeenCalled();
      expect(result.success).toBe(false);
      expect(result.tier).toBe("free");
    });
  });

  // ── fetchSubscriptionStatus ──────────────────────────────────────────────────

  describe("fetchSubscriptionStatus", () => {
    it("returns tier and calls setDWPlus(true) when backend returns plus", async () => {
      mockFetch({ tier: "plus", updatedAt: "2024-01-01T00:00:00Z" });
      const status = await fetchSubscriptionStatus();
      expect(status.tier).toBe("plus");
      expect(setDWPlus).toHaveBeenCalledWith(true);
    });

    it("returns free tier and calls setDWPlus(false) for free users", async () => {
      mockFetch({ tier: "free", updatedAt: null });
      const status = await fetchSubscriptionStatus();
      expect(status.tier).toBe("free");
      expect(setDWPlus).toHaveBeenCalledWith(false);
    });

    it("returns free tier on network error without throwing", async () => {
      vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
      const status = await fetchSubscriptionStatus();
      expect(status.tier).toBe("free");
      expect(status.updatedAt).toBeNull();
    });

    it("returns free tier when backend returns non-OK response", async () => {
      mockFetch({ error: "Unauthorized" }, false, 401);
      const status = await fetchSubscriptionStatus();
      expect(status.tier).toBe("free");
    });
  });
});
