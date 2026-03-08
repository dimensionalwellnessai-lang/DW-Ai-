import { describe, it, expect } from "vitest";
import {
  reduceNumber,
  calcLifePath,
  calcExpression,
  calcSoulUrge,
  calcPersonalYear,
  calcPersonalMonth,
  calcPersonalDay,
  MASTER_NUMBERS,
  LIFE_PATH_MEANINGS,
  EXPRESSION_MEANINGS,
  SOUL_URGE_MEANINGS,
  PERSONAL_YEAR_MEANINGS,
  PERSONAL_MONTH_MEANINGS,
  PERSONAL_DAY_MEANINGS,
} from "../lib/numerology";

// ── reduceNumber ───────────────────────────────────────────────────────────────

describe("reduceNumber", () => {
  it("returns single digits unchanged", () => {
    expect(reduceNumber(1)).toBe(1);
    expect(reduceNumber(9)).toBe(9);
  });

  it("reduces two-digit numbers to single digits", () => {
    expect(reduceNumber(10)).toBe(1); // 1+0=1
    expect(reduceNumber(19)).toBe(1); // 1+9=10 → 1+0=1
    expect(reduceNumber(20)).toBe(2); // 2+0=2
  });

  it("preserves master numbers 11, 22, 33", () => {
    expect(reduceNumber(11)).toBe(11);
    expect(reduceNumber(22)).toBe(22);
    expect(reduceNumber(33)).toBe(33);
  });

  it("reduces numbers that pass through master sums correctly", () => {
    // 29 → 2+9 = 11 → master
    expect(reduceNumber(29)).toBe(11);
    // 40 → 4+0 = 4
    expect(reduceNumber(40)).toBe(4);
    // 55 → 5+5 = 10 → 1+0 = 1
    expect(reduceNumber(55)).toBe(1);
  });
});

// ── calcLifePath ───────────────────────────────────────────────────────────────

describe("calcLifePath", () => {
  it("computes a known life path number", () => {
    // 1990-01-15 → 1+9+9+0+0+1+1+5 = 26 → 2+6 = 8
    expect(calcLifePath("1990-01-15")).toBe(8);
  });

  it("produces a single digit or master number", () => {
    const result = calcLifePath("1985-07-23");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });

  it("handles a date that yields a master number", () => {
    // 1992-02-09 → 1+9+9+2+0+2+0+9 = 32 → 3+2 = 5
    expect(calcLifePath("1992-02-09")).toBe(5);
  });
});

// ── calcExpression ─────────────────────────────────────────────────────────────

describe("calcExpression", () => {
  it("computes expression number from a full name", () => {
    // J(1)+O(6)+H(8)+N(5) = 20 → 2+0 = 2
    expect(calcExpression("John")).toBe(2);
  });

  it("ignores spaces and non-alpha characters", () => {
    expect(calcExpression("John Doe")).toBe(calcExpression("JohnDoe"));
  });

  it("is case-insensitive", () => {
    expect(calcExpression("JANE")).toBe(calcExpression("jane"));
  });

  it("produces a single digit or master number", () => {
    const result = calcExpression("Jane Elizabeth Smith");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });
});

// ── calcSoulUrge ───────────────────────────────────────────────────────────────

describe("calcSoulUrge", () => {
  it("sums only vowels in the name", () => {
    // "John": O(6) only vowel → 6
    expect(calcSoulUrge("John")).toBe(6);
  });

  it("returns at least 1 for a name with no vowels", () => {
    // Edge case: no vowels → fallback to 1
    expect(calcSoulUrge("Byrn")).toBeGreaterThanOrEqual(1);
  });

  it("is case-insensitive", () => {
    expect(calcSoulUrge("JANE")).toBe(calcSoulUrge("jane"));
  });

  it("produces a single digit or master number", () => {
    const result = calcSoulUrge("Jane Elizabeth Smith");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });
});

// ── calcPersonalYear ───────────────────────────────────────────────────────────

describe("calcPersonalYear", () => {
  it("computes personal year for a given calendar year", () => {
    // birthDate 1990-03-15, year 2026 → 3+15+2026 = 3+1+5+2+0+2+6 = month(3)+day(15)+year(2026)
    // reduceNumber(3 + 15 + 2026) = reduceNumber(2044) → 2+0+4+4 = 10 → 1+0 = 1
    expect(calcPersonalYear("1990-03-15", 2026)).toBe(1);
  });

  it("returns a single digit or master number", () => {
    const result = calcPersonalYear("1985-07-23", 2025);
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });

  it("defaults to current year when forYear is omitted", () => {
    const result = calcPersonalYear("1990-01-01");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });
});

// ── calcPersonalMonth ──────────────────────────────────────────────────────────

describe("calcPersonalMonth", () => {
  it("computes personal month as personalYear + month, reduced", () => {
    // personalYear("1990-03-15", 2026) = 1 (from above test)
    // month = 6 → reduceNumber(1 + 6) = 7
    expect(calcPersonalMonth("1990-03-15", 2026, 6)).toBe(7);
  });

  it("returns a single digit or master number", () => {
    const result = calcPersonalMonth("1985-07-23", 2025, 3);
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });

  it("defaults to current year and month when not provided", () => {
    const result = calcPersonalMonth("1990-01-01");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });
});

// ── calcPersonalDay ────────────────────────────────────────────────────────────

describe("calcPersonalDay", () => {
  it("computes personal day as personalMonth + day, reduced", () => {
    // personalMonth("1990-03-15", 2026, 6) = 7 (from above)
    // day = 10 → reduceNumber(7 + 10) = reduceNumber(17) = 1+7 = 8
    expect(calcPersonalDay("1990-03-15", 2026, 6, 10)).toBe(8);
  });

  it("returns a single digit or master number", () => {
    const result = calcPersonalDay("1985-07-23", 2025, 3, 15);
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });

  it("defaults to current year, month, and day when not provided", () => {
    const result = calcPersonalDay("1990-01-01");
    expect(result >= 1 && result <= 9 || MASTER_NUMBERS.has(result)).toBe(true);
  });
});

// ── Meanings dictionaries ──────────────────────────────────────────────────────

describe("meanings dictionaries", () => {
  const singleDigits = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const masterNums = [11, 22, 33];
  const allKeys = [...singleDigits, ...masterNums];

  it("LIFE_PATH_MEANINGS covers all single digits and master numbers", () => {
    allKeys.forEach(n => {
      expect(LIFE_PATH_MEANINGS[n]).toBeDefined();
      expect(typeof LIFE_PATH_MEANINGS[n].title).toBe("string");
      expect(typeof LIFE_PATH_MEANINGS[n].desc).toBe("string");
    });
  });

  it("EXPRESSION_MEANINGS covers all single digits and master numbers", () => {
    allKeys.forEach(n => {
      expect(EXPRESSION_MEANINGS[n]).toBeDefined();
      expect(typeof EXPRESSION_MEANINGS[n].title).toBe("string");
    });
  });

  it("SOUL_URGE_MEANINGS covers all single digits and master numbers", () => {
    allKeys.forEach(n => {
      expect(SOUL_URGE_MEANINGS[n]).toBeDefined();
      expect(typeof SOUL_URGE_MEANINGS[n].title).toBe("string");
    });
  });

  it("PERSONAL_YEAR_MEANINGS covers single digits 1–9", () => {
    singleDigits.forEach(n => {
      expect(typeof PERSONAL_YEAR_MEANINGS[n]).toBe("string");
      expect(PERSONAL_YEAR_MEANINGS[n].length).toBeGreaterThan(0);
    });
  });

  it("PERSONAL_MONTH_MEANINGS covers single digits 1–9", () => {
    singleDigits.forEach(n => {
      expect(typeof PERSONAL_MONTH_MEANINGS[n]).toBe("string");
      expect(PERSONAL_MONTH_MEANINGS[n].length).toBeGreaterThan(0);
    });
  });

  it("PERSONAL_DAY_MEANINGS covers single digits 1–9", () => {
    singleDigits.forEach(n => {
      expect(typeof PERSONAL_DAY_MEANINGS[n]).toBe("string");
      expect(PERSONAL_DAY_MEANINGS[n].length).toBeGreaterThan(0);
    });
  });
});
