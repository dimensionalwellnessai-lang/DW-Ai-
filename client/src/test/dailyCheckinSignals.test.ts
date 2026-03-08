import { describe, it, expect } from "vitest";
import { deriveMomentumHint, type CheckinSignal } from "../lib/daily-checkin-signals";

// ── helpers ────────────────────────────────────────────────────────────────────

function makeSignal(date: string, moodScore: number, constraintType: string): CheckinSignal {
  return { date, moodScore, constraintType };
}

// ── deriveMomentumHint ─────────────────────────────────────────────────────────

describe("deriveMomentumHint", () => {
  it("returns null for an empty array", () => {
    expect(deriveMomentumHint([])).toBeNull();
  });

  it("returns a high-energy message when avg mood >= 4 with a real constraint", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 5, "Time"),
      makeSignal("2026-03-06", 4, "Time"),
      makeSignal("2026-03-05", 4, "Focus"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("Energy has been high");
    expect(hint).toContain("Time");
  });

  it("returns generic high-energy message when constraint is 'Nothing major'", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 5, "Nothing major"),
      makeSignal("2026-03-06", 4, "Nothing major"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("high");
    expect(hint).toContain("stretch goal");
  });

  it("returns a low-energy message when avg mood <= 2 with a constraint", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 1, "Stress"),
      makeSignal("2026-03-06", 2, "Stress"),
      makeSignal("2026-03-05", 2, "Energy"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("low");
    expect(hint).toContain("Stress");
  });

  it("returns a low-energy message when avg mood <= 2 with no specific constraint", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 1, "Nothing major"),
      makeSignal("2026-03-06", 2, "Nothing major"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("low");
    expect(hint).toContain("recovery");
  });

  it("returns a steady-energy message when avg mood is between 2 and 4", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 3, "Focus"),
      makeSignal("2026-03-06", 3, "Focus"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("steady");
    expect(hint).toContain("Focus");
  });

  it("returns 'No major recurring constraints' when steady and constraint is 'Nothing major'", () => {
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-07", 3, "Nothing major"),
      makeSignal("2026-03-06", 3, "Nothing major"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("No major recurring constraints");
  });

  it("only uses the most recent 7 signals (sorts by date desc)", () => {
    // 8 signals: oldest 1 has mood=1, newest 7 all have mood=5
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-08", 5, "Nothing major"),
      makeSignal("2026-03-07", 5, "Nothing major"),
      makeSignal("2026-03-06", 5, "Nothing major"),
      makeSignal("2026-03-05", 5, "Nothing major"),
      makeSignal("2026-03-04", 5, "Nothing major"),
      makeSignal("2026-03-03", 5, "Nothing major"),
      makeSignal("2026-03-02", 5, "Nothing major"),
      makeSignal("2026-03-01", 1, "Stress"), // oldest – should be excluded
    ];
    const hint = deriveMomentumHint(signals);
    // Avg of first 7 = 5, so we expect high-energy message, not low
    expect(hint).toContain("high");
  });

  it("handles unsorted input and still uses the most recent 7 days", () => {
    // Providing in ascending order deliberately to verify sorting works
    const signals: CheckinSignal[] = [
      makeSignal("2026-03-01", 1, "Stress"), // oldest, low mood
      makeSignal("2026-03-02", 5, "Nothing major"),
      makeSignal("2026-03-03", 5, "Nothing major"),
      makeSignal("2026-03-04", 5, "Nothing major"),
      makeSignal("2026-03-05", 5, "Nothing major"),
      makeSignal("2026-03-06", 5, "Nothing major"),
      makeSignal("2026-03-07", 5, "Nothing major"),
      makeSignal("2026-03-08", 5, "Nothing major"),
    ];
    const hint = deriveMomentumHint(signals);
    expect(hint).toContain("high");
  });
});
