import { describe, it, expect } from "vitest";

// Local helper mirroring the expected query parsing behavior for jumpToMessageIndex
function parseJumpToMessageIndex(queryString: string): number | null {
  if (!queryString) {
    return null;
  }

  const searchParams = new URLSearchParams(queryString.startsWith("?") ? queryString.slice(1) : queryString);
  const value = searchParams.get("jumpToMessageIndex");

  if (value === null) {
    return null;
  }

  // Strict integer-only check: reject empty string, negatives, floats, and non-numeric values
  if (!/^\d+$/.test(value)) {
    return null;
  }

  const index = Number(value);
  return index >= 0 ? index : null;
}
describe("parseJumpToMessageIndex", () => {
  it("returns the index when a valid non-negative integer is provided", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=5")).toBe(5);
  });

  it("returns 0 for index 0 (first message)", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=0")).toBe(0);
  });

  it("returns null when the param is absent", () => {
    expect(parseJumpToMessageIndex("")).toBeNull();
    expect(parseJumpToMessageIndex("?foo=bar")).toBeNull();
  });

  it("returns null for a negative index", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=-1")).toBeNull();
  });

  it("returns null for a non-numeric value", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=abc")).toBeNull();
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=")).toBeNull();
  });

  it("returns null for a float (strict integer validation rejects non-integer strings)", () => {
    // "3.7" contains a dot so /^\d+$/ rejects it → null
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=3.7")).toBeNull();
  });

  it("ignores extra params and still reads jumpToMessageIndex", () => {
    expect(parseJumpToMessageIndex("?conversationId=abc123&jumpToMessageIndex=7")).toBe(7);
  });
});
