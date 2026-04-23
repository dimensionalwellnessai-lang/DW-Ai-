/**
 * Unit tests for the e2e-mode flag used by automated tests to suppress
 * tutorial coach marks and proactive accountability cards.
 */
// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { _resetE2EModeCache, isE2ETestMode } from "./e2e-mode";

const originalSearch = window.location.search;

function setSearch(query: string) {
  window.history.replaceState({}, "", `${window.location.pathname}${query}`);
}

beforeEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setSearch("");
  _resetE2EModeCache();
});

afterEach(() => {
  window.localStorage.clear();
  window.sessionStorage.clear();
  setSearch(originalSearch);
  _resetE2EModeCache();
});

describe("isE2ETestMode", () => {
  it("returns false by default for real users", () => {
    expect(isE2ETestMode()).toBe(false);
  });

  it("returns true when the URL has ?e2e=1 and persists the flag in sessionStorage for the rest of the tab", () => {
    setSearch("?e2e=1");
    expect(isE2ETestMode()).toBe(true);
    expect(window.sessionStorage.getItem("dw_e2e")).toBe("1");
    // We deliberately DO NOT leak the flag into localStorage so a real
    // user who lands on a `?e2e=1` link doesn't get suppressed forever.
    expect(window.localStorage.getItem("dw_e2e")).toBeNull();
  });

  it("returns true when sessionStorage already has the flag (set on a previous page in the same tab)", () => {
    window.sessionStorage.setItem("dw_e2e", "1");
    expect(isE2ETestMode()).toBe(true);
  });

  it("also honours localStorage for runners that set it once across browser contexts", () => {
    window.localStorage.setItem("dw_e2e", "1");
    expect(isE2ETestMode()).toBe(true);
  });

  it("ignores unrelated query params", () => {
    setSearch("?utm_source=email");
    expect(isE2ETestMode()).toBe(false);
  });

  it("does NOT treat e2e=0 or other values as enabled", () => {
    setSearch("?e2e=0");
    expect(isE2ETestMode()).toBe(false);
    expect(window.localStorage.getItem("dw_e2e")).toBeNull();
  });
});
