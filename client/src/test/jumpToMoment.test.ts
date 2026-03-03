import { describe, it, expect } from "vitest";

// ─── parseJumpToMessageIndex ──────────────────────────────────────────────────
// Mirrors the parsing logic used in TalkItOutPage's mount effect.

function parseJumpToMessageIndex(search: string): number | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get("jumpToMessageIndex");
    if (raw !== null) {
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch {
    // URL params unavailable or malformed – fail silently
  }
  return null;
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

  it("returns the integer part of a float (parseInt truncates to valid integer)", () => {
    // parseInt("3.7") === 3, which is valid
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=3.7")).toBe(3);
  });

  it("ignores extra params and still reads jumpToMessageIndex", () => {
    expect(parseJumpToMessageIndex("?conversationId=abc123&jumpToMessageIndex=7")).toBe(7);
  });
});

// ─── bounds checking ──────────────────────────────────────────────────────────

function isIndexInBounds(index: number | null, messageCount: number): boolean {
  if (index === null) return false;
  return index >= 0 && index < messageCount;
}

describe("isIndexInBounds", () => {
  it("returns true for a valid index within message array", () => {
    expect(isIndexInBounds(0, 5)).toBe(true);
    expect(isIndexInBounds(4, 5)).toBe(true);
  });

  it("returns false for an index at or beyond message count", () => {
    expect(isIndexInBounds(5, 5)).toBe(false);
    expect(isIndexInBounds(10, 5)).toBe(false);
  });

  it("returns false for null index", () => {
    expect(isIndexInBounds(null, 5)).toBe(false);
  });

  it("returns false for negative index", () => {
    expect(isIndexInBounds(-1, 5)).toBe(false);
  });

  it("returns false when there are no messages", () => {
    expect(isIndexInBounds(0, 0)).toBe(false);
  });
});
