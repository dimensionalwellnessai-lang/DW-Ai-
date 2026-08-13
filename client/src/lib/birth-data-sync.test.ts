/**
 * Tests for the shared birth-details write path used by every entry point
 * (Cosmic Hub quick-add, Cosmic Insights chart dialog, onboarding bridge).
 * Asserts guest/account isolation of the device cache and account API sync.
 */
// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => ({
  apiRequest: vi.fn(async () => ({ ok: true }) as unknown as Response),
  invalidateQueries: vi.fn(),
}));

vi.mock("./queryClient", () => ({
  apiRequest: hoisted.apiRequest,
  queryClient: { invalidateQueries: hoisted.invalidateQueries },
}));

import { persistBirthData } from "./birth-data-sync";
import { loadBirthDataFor } from "./birth-data-storage";

const data = {
  birthDate: "1990-06-15",
  birthTime: "08:30",
  birthPlace: "Lisbon, Portugal",
  houseSystem: "whole-sign",
  zodiacSystem: "tropical",
};

describe("persistBirthData", () => {
  beforeEach(() => {
    localStorage.clear();
    hoisted.apiRequest.mockClear();
    hoisted.invalidateQueries.mockClear();
  });

  it("guest save: device-only, owner-scoped to guest, no API call", async () => {
    await persistBirthData(data, null);
    expect(loadBirthDataFor(null)).toEqual(data);
    expect(loadBirthDataFor("user-a")).toBeNull(); // no account can inherit it
    expect(hoisted.apiRequest).not.toHaveBeenCalled();
  });

  it("account save: scoped to that account and synced to the API", async () => {
    await persistBirthData(data, "user-a");
    expect(loadBirthDataFor("user-a")).toEqual(data);
    expect(loadBirthDataFor(null)).toBeNull();      // guests can't read it
    expect(loadBirthDataFor("user-b")).toBeNull();  // other accounts can't read it
    expect(hoisted.apiRequest).toHaveBeenCalledWith("POST", "/api/astrology/chart", data);
    expect(hoisted.invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["/api/astrology/chart", "user-a"],
    });
  });

  it("account save survives API failure (device cache still written)", async () => {
    hoisted.apiRequest.mockRejectedValueOnce(new Error("network"));
    await persistBirthData(data, "user-a");
    expect(loadBirthDataFor("user-a")).toEqual(data);
  });
});
