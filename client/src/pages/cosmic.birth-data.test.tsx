/**
 * Auth-transition isolation tests for useBirthData (cosmic.tsx).
 *
 * Birth details are sensitive personal data cached in a browser shared by
 * multiple accounts. These tests assert the hook is identity-bound:
 *   - guest → logged-in account: the guest's record is neither rendered for
 *     the account (even while the account's chart request is still pending)
 *     nor auto-uploaded to it.
 *   - account A → account B: A's record never renders for B while B's chart
 *     request is pending, and is never POSTed on B's behalf.
 *   - account → guest (logout): the account's record does not render for
 *     the guest.
 */
// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

import { saveBirthDataFor, loadBirthDataFor } from "@/lib/birth-data-storage";

const hoisted = vi.hoisted(() => ({
  apiRequest: vi.fn(async () => ({ ok: true }) as unknown as Response),
  auth: {
    user: null as { id: string } | null,
    isAuthenticated: false,
    isLoading: false,
  },
}));

vi.mock("@/lib/queryClient", () => ({
  apiRequest: hoisted.apiRequest,
  queryClient: { invalidateQueries: vi.fn() },
  getQueryFn: () => async () => null,
  parseApiError: (e: unknown) => String(e),
  STALE_TIME: { AUTH: 0, MEDIUM: 0, SHORT: 0, FOREVER: Infinity },
}));

vi.mock("@/hooks/use-auth", () => ({
  useAuth: () => ({ ...hoisted.auth }),
}));

import { useBirthData } from "./cosmic";

const guestData = {
  birthDate: "1980-01-01",
  birthTime: "01:00",
  birthPlace: "Guestville",
  houseSystem: "whole-sign",
  zodiacSystem: "tropical",
};
const userAData = { ...guestData, birthDate: "1990-06-15", birthPlace: "A-Town" };

/** Controllable fetch for GET /api/astrology/chart. */
function installChartFetch() {
  const pending: Array<(chart: unknown) => void> = [];
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => {
      const body = await new Promise(resolve => pending.push(resolve));
      if (body === null) {
        return { ok: false, status: 404, text: async () => "not found" } as Response;
      }
      return { ok: true, status: 200, json: async () => body } as unknown as Response;
    }),
  );
  return {
    /** Resolve the oldest outstanding chart request (null → 404). */
    resolveNext: (chart: unknown) => act(() => pending.shift()?.(chart)),
    outstanding: () => pending.length,
  };
}

function renderBirthData() {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: 0, gcTime: 0 } },
  });
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
  return renderHook(() => useBirthData(), { wrapper });
}

function setAuth(user: { id: string } | null, isLoading = false) {
  hoisted.auth.user = user;
  hoisted.auth.isAuthenticated = !!user;
  hoisted.auth.isLoading = isLoading;
}

describe("useBirthData auth-transition isolation", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    hoisted.apiRequest.mockClear();
    setAuth(null);
  });

  it("renders a guest's own record for the guest", async () => {
    saveBirthDataFor(guestData, null);
    installChartFetch();
    const { result } = renderBirthData();
    await waitFor(() => expect(result.current[0]).toEqual(guestData));
  });

  it("guest → account: never shows or uploads the guest record, even while the chart request is pending", async () => {
    saveBirthDataFor(guestData, null);
    const fetchCtl = installChartFetch();

    setAuth(null);
    const { result, rerender } = renderBirthData();
    await waitFor(() => expect(result.current[0]).toEqual(guestData));

    // User logs in; chart request stays pending.
    setAuth({ id: "user-b" });
    rerender();
    // Synchronous check: previous guest data must be gone immediately.
    expect(result.current[0]).toBeNull();

    // Server has no chart for this account → still nothing, and no upload.
    fetchCtl.resolveNext(null);
    await waitFor(() => expect(result.current[0]).toBeNull());
    expect(hoisted.apiRequest).not.toHaveBeenCalled();
  });

  it("account A → account B: A's record never renders for B or is submitted for B", async () => {
    const fetchCtl = installChartFetch();
    setAuth({ id: "user-a" });
    const { result, rerender } = renderBirthData();

    // A's chart arrives from the server and renders.
    fetchCtl.resolveNext({
      birthDate: userAData.birthDate,
      birthTime: userAData.birthTime,
      birthCity: "A-Town",
      birthState: null,
      birthCountry: null,
      zodiacSystem: "tropical",
      houseSystem: "whole-sign",
    });
    await waitFor(() => expect(result.current[0]?.birthDate).toBe(userAData.birthDate));

    // Switch to B without unmounting; B's request stays pending.
    setAuth({ id: "user-b" });
    rerender();
    expect(result.current[0]).toBeNull(); // A's data gone synchronously

    // B has no server chart → stays empty; A's cached record not uploaded.
    fetchCtl.resolveNext(null);
    await waitFor(() => expect(fetchCtl.outstanding()).toBe(0));
    expect(result.current[0]).toBeNull();
    const posts = hoisted.apiRequest.mock.calls.filter((c: unknown[]) => c[0] === "POST");
    expect(posts).toHaveLength(0);
  });

  it("account → guest (logout): the account's record does not render for the guest", async () => {
    saveBirthDataFor(userAData, "user-a");
    installChartFetch();

    setAuth({ id: "user-a" });
    const { result, rerender } = renderBirthData();

    setAuth(null); // logout before/regardless of chart resolution
    rerender();
    expect(result.current[0]).toBeNull();
    await waitFor(() => expect(result.current[0]).toBeNull());
  });

  it("saving while logged in tags the cache with the account and syncs to the server", async () => {
    installChartFetch();
    setAuth({ id: "user-a" });
    const { result } = renderBirthData();

    act(() => result.current[1](userAData as never));
    expect(result.current[0]).toEqual(userAData);
    expect(loadBirthDataFor("user-a")).toEqual(userAData);
    expect(loadBirthDataFor(null)).toBeNull();
    expect(loadBirthDataFor("user-b")).toBeNull();
    await waitFor(() =>
      expect(hoisted.apiRequest).toHaveBeenCalledWith("POST", "/api/astrology/chart", userAData),
    );
  });
});
