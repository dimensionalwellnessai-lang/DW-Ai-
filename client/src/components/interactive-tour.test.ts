import { describe, it, expect } from "vitest";
import { computeCardPosition } from "./interactive-tour";

// Helper: build a fake DOMRect-like object
function rect(top: number, left: number, width: number, height: number) {
  return { top, left, width, height, bottom: top + height, right: left + width };
}

describe("computeCardPosition", () => {
  const VIEWPORT = { viewportWidth: 375, viewportHeight: 812 };
  const CARD = { cardWidth: 343, cardHeight: 280 };

  it("places card above target when position=top and there is space", () => {
    // target sits at 600px from top – plenty of room above
    const pos = computeCardPosition({
      targetRect: rect(600, 16, 343, 56),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "top",
    });
    expect(pos.top).toBeLessThan(600); // card is above target
    expect(pos.top).toBeGreaterThanOrEqual(16); // not off-screen top
  });

  it("flips to below when there is not enough space above", () => {
    // target near the top of the screen – no room above
    const pos = computeCardPosition({
      targetRect: rect(50, 16, 343, 56),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "top",
    });
    // Should flip below (top should be > target bottom = 106)
    expect(pos.top).toBeGreaterThan(50 + 56); // below target bottom
  });

  it("places card below target when position=bottom and there is space", () => {
    const pos = computeCardPosition({
      targetRect: rect(100, 16, 343, 56),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "bottom",
    });
    expect(pos.top).toBeGreaterThan(100 + 56); // below target
  });

  it("flips to above when bottom would overflow (accounting for bottomReserved)", () => {
    // target near the bottom, with a large bottom nav reservation
    const pos = computeCardPosition({
      targetRect: rect(650, 16, 343, 56),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "bottom",
      bottomReserved: 88,
    });
    // Usable height = 812 - 88 = 724.  target.bottom = 706 => spaceBelow = 724 - 706 - 16 = 2 < cardNeeds
    // Should flip above: top = 650 - 280 - 12 = 358
    expect(pos.top).toBeLessThan(650);
  });

  it("clamps card left so it never overflows the right edge", () => {
    // target far to the right
    const pos = computeCardPosition({
      targetRect: rect(400, 300, 50, 50),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "top",
    });
    expect(pos.left + CARD.cardWidth).toBeLessThanOrEqual(VIEWPORT.viewportWidth - 16);
  });

  it("clamps card left so it never overflows the left edge", () => {
    const pos = computeCardPosition({
      targetRect: rect(400, 0, 50, 50),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "top",
    });
    expect(pos.left).toBeGreaterThanOrEqual(16);
  });

  it("returns integer pixel values (no subpixel fractions)", () => {
    const pos = computeCardPosition({
      targetRect: rect(300.7, 16.3, 343.5, 56.1),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "top",
    });
    expect(pos.top).toBe(Math.round(pos.top));
    expect(pos.left).toBe(Math.round(pos.left));
  });

  it("respects bottomReserved: card top stays above usable area", () => {
    const bottomReserved = 88;
    const usableHeight = VIEWPORT.viewportHeight - bottomReserved;
    const pos = computeCardPosition({
      targetRect: rect(700, 16, 343, 56),
      ...CARD,
      ...VIEWPORT,
      preferredPosition: "bottom",
      bottomReserved,
    });
    expect(pos.top + CARD.cardHeight).toBeLessThanOrEqual(usableHeight - 16);
  });
});
