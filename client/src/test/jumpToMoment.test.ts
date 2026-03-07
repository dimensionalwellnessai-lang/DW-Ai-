import { describe, it, expect } from "vitest";
import { parseJumpToMessageIndex } from "../lib/jumpToMoment";

describe("parseJumpToMessageIndex", () => {
  // ── Valid inputs ──────────────────────────────────────────────────────────

  it("returns the index when a valid non-negative integer is provided", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=5")).toBe(5);
  });

  it("returns 0 for index 0 (first message)", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=0")).toBe(0);
  });

  it("ignores extra params and still reads jumpToMessageIndex", () => {
    expect(parseJumpToMessageIndex("?conversationId=abc123&jumpToMessageIndex=7")).toBe(7);
  });

  it("accepts a query string without a leading '?'", () => {
    expect(parseJumpToMessageIndex("jumpToMessageIndex=3")).toBe(3);
  });

  it("handles a large valid index", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=9999")).toBe(9999);
  });

  // ── Invalid / absent inputs ───────────────────────────────────────────────

  it("returns null when the param is absent (empty string)", () => {
    expect(parseJumpToMessageIndex("")).toBeNull();
  });

  it("returns null when the param is absent (unrelated param only)", () => {
    expect(parseJumpToMessageIndex("?foo=bar")).toBeNull();
  });

  it("returns null for a negative index", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=-1")).toBeNull();
  });

  it("returns null for a non-numeric string value", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=abc")).toBeNull();
  });

  it("returns null for an empty param value", () => {
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=")).toBeNull();
  });

  it("returns null for a float (strict integer validation rejects non-integer strings)", () => {
    // "3.7" contains a dot so /^\d+$/ rejects it → null
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=3.7")).toBeNull();
  });

  it("accepts leading zeros and returns their numeric value (e.g. '007' becomes 7)", () => {
    // /^\d+$/ matches "007" but Number("007") === 7 and isSafeInteger → returns 7
    // Documenting the actual behavior: leading-zero strings are accepted as their numeric value
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=007")).toBe(7);
  });
});
