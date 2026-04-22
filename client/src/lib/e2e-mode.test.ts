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
  setSearch("");
  _resetE2EModeCache();
});

afterEach(() => {
  window.localStorage.clear();
  setSearch(originalSearch);
  _resetE2EModeCache();
});

describe("isE2ETestMode", () => {
  it("returns false by default for real users", () => {
    expect(isE2ETestMode()).toBe(false);
  });

  it("returns true when the URL has ?e2e=1 and persists the flag for the rest of the session", () => {
    setSearch("?e2e=1");
    expect(isE2ETestMode()).toBe(true);
    expect(window.localStorage.getItem("dw_e2e")).toBe("1");
  });

  it("returns true when localStorage already has the flag (e.g. set by the runner once)", () => {
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
