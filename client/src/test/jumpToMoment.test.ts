import { describe, it, expect } from "vitest";

// ─── parseJumpToMessageIndex ──────────────────────────────────────────────────
// Mirrors the parsing logic used in TalkItOutPage's mount effect.

function parseJumpToMessageIndex(search: string): number | null {
  try {
    const params = new URLSearchParams(search);
    const raw = params.get("jumpToMessageIndex");
    if (raw !== null && /^\d+$/.test(raw)) {
      const parsed = Number(raw);
      if (Number.isSafeInteger(parsed) && parsed >= 0) {
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

  it("returns null for a float (strict integer validation rejects non-integer strings)", () => {
    // "3.7" contains a dot so /^\d+$/ rejects it → null
    expect(parseJumpToMessageIndex("?jumpToMessageIndex=3.7")).toBeNull();
  });

  it("ignores extra params and still reads jumpToMessageIndex", () => {
    expect(parseJumpToMessageIndex("?conversationId=abc123&jumpToMessageIndex=7")).toBe(7);
  });
});
