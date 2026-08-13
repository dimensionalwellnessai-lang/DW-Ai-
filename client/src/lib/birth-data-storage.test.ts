import { beforeEach, describe, expect, it } from "vitest";

import {
  BIRTH_CHART_KEY,
  loadBirthDataFor,
  saveBirthDataFor,
  type BirthData,
} from "./birth-data-storage";

const sample: BirthData = {
  birthDate: "1990-06-15",
  birthTime: "08:30",
  birthPlace: "Lisbon, Portugal",
  houseSystem: "whole-sign",
  zodiacSystem: "tropical",
};

describe("owner-scoped birth data storage", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("round-trips a guest record", () => {
    saveBirthDataFor(sample, null);
    expect(loadBirthDataFor(null)).toEqual(sample);
  });

  it("round-trips a record for the owning account", () => {
    saveBirthDataFor(sample, "user-a");
    expect(loadBirthDataFor("user-a")).toEqual(sample);
  });

  it("never returns one account's record to a different account", () => {
    saveBirthDataFor(sample, "user-a");
    expect(loadBirthDataFor("user-b")).toBeNull();
  });

  it("never returns a guest record to an authenticated account", () => {
    saveBirthDataFor(sample, null);
    expect(loadBirthDataFor("user-a")).toBeNull();
  });

  it("never returns an account-owned record to a guest (after logout)", () => {
    saveBirthDataFor(sample, "user-a");
    expect(loadBirthDataFor(null)).toBeNull();
  });

  it("treats legacy untagged records as guest-owned", () => {
    localStorage.setItem(BIRTH_CHART_KEY, JSON.stringify(sample));
    expect(loadBirthDataFor(null)).toEqual(sample);
    expect(loadBirthDataFor("user-a")).toBeNull();
  });

  it("returns null for corrupt or empty storage", () => {
    expect(loadBirthDataFor(null)).toBeNull();
    localStorage.setItem(BIRTH_CHART_KEY, "not-json{");
    expect(loadBirthDataFor(null)).toBeNull();
    localStorage.setItem(BIRTH_CHART_KEY, JSON.stringify({ foo: 1 }));
    expect(loadBirthDataFor(null)).toBeNull();
  });
});
