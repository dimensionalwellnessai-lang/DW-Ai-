import { describe, expect, it } from "vitest";
import { calculateEnergyCurrents, isMercuryRetrogradeWindow } from "../energy-currents";

describe("calculateEnergyCurrents", () => {
  it("returns deterministic type/compass/currents for same input", () => {
    const first = calculateEnergyCurrents({
      birthDate: "1990-06-20",
      birthTime: "08:45",
      birthPlace: "Austin, TX",
    });
    const second = calculateEnergyCurrents({
      birthDate: "1990-06-20",
      birthTime: "08:45",
      birthPlace: "Austin, TX",
    });

    expect(first.energyType).toBe(second.energyType);
    expect(first.decisionCompass).toBe(second.decisionCompass);
    expect(first.currents).toEqual(second.currents);
  });

  it("flags mercury retrograde windows", () => {
    expect(isMercuryRetrogradeWindow(new Date("2026-04-01T12:00:00Z"))).toBe(true);
    expect(isMercuryRetrogradeWindow(new Date("2026-06-01T12:00:00Z"))).toBe(false);
    expect(isMercuryRetrogradeWindow(new Date("2027-04-01T12:00:00Z"))).toBe(false);
  });
});
