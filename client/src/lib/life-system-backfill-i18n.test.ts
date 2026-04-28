import { describe, it, expect } from "vitest";
import {
  formatCarriedEntry,
  formatCarriedItem,
  getBackfillBannerStrings,
} from "./life-system-backfill-i18n";

describe("getBackfillBannerStrings", () => {
  it("returns English banner strings by default", () => {
    const en = getBackfillBannerStrings("en");
    expect(en.title).toBe("We set up your Life System");
    expect(en.dismiss).toBe("Dismiss");
    expect(en.body).toContain("three-level system");
  });

  it("returns the requested language when supported", () => {
    expect(getBackfillBannerStrings("es").title).toBe(
      "Configuramos tu Sistema de Vida",
    );
    expect(getBackfillBannerStrings("fr").dismiss).toBe("Ignorer");
    expect(getBackfillBannerStrings("de").title).toContain("Lebenssystem");
    expect(getBackfillBannerStrings("ja").dismiss).toBe("閉じる");
  });

  it("falls back to the base language for regional tags", () => {
    expect(getBackfillBannerStrings("pt-BR").dismiss).toBe("Dispensar");
    expect(getBackfillBannerStrings("ES-mx").dismiss).toBe("Descartar");
  });

  it("falls back to English for unknown languages", () => {
    expect(getBackfillBannerStrings("xx-YY").title).toBe(
      "We set up your Life System",
    );
  });
});

describe("formatCarriedItem", () => {
  it("pluralizes goalsToProjects in English", () => {
    expect(formatCarriedItem({ kind: "goalsToProjects", count: 1 }, "en")).toBe(
      "1 goal → Creation projects",
    );
    expect(formatCarriedItem({ kind: "goalsToProjects", count: 4 }, "en")).toBe(
      "4 goals → Creation projects",
    );
  });

  it("renders dailyRhythm with the localized parts and pillar name", () => {
    expect(
      formatCarriedItem(
        { kind: "dailyRhythm", parts: ["wake", "sleep", "peakTime"] },
        "en",
      ),
    ).toBe("wake + sleep + peak time → Daily Rhythm");

    expect(
      formatCarriedItem(
        { kind: "dailyRhythm", parts: ["wake", "peakTime"] },
        "es",
      ),
    ).toBe("despertar + hora pico → Ritmo Diario");
  });

  it("orders dailyRhythm parts deterministically regardless of input order", () => {
    expect(
      formatCarriedItem(
        { kind: "dailyRhythm", parts: ["peakTime", "wake"] },
        "en",
      ),
    ).toBe("wake + peak time → Daily Rhythm");
  });

  it("translates the simple tags", () => {
    expect(formatCarriedItem({ kind: "responsibility" }, "fr")).toContain(
      "Responsabilités",
    );
    expect(formatCarriedItem({ kind: "purpose" }, "de")).toContain("Sinn");
    expect(formatCarriedItem({ kind: "physicalHealth" }, "pt")).toContain(
      "Saúde Física",
    );
    expect(formatCarriedItem({ kind: "foundation" }, "en")).toContain(
      "Foundation",
    );
    expect(
      formatCarriedItem({ kind: "starterTemplateProjects" }, "en"),
    ).toContain("Starter Template");
  });
});

describe("formatCarriedEntry (legacy compatibility)", () => {
  it("returns plain strings unchanged", () => {
    expect(formatCarriedEntry("Old persisted line", "en")).toBe(
      "Old persisted line",
    );
    expect(formatCarriedEntry("Algo en español", "es")).toBe(
      "Algo en español",
    );
  });

  it("formats structured tags through the i18n layer", () => {
    expect(
      formatCarriedEntry({ kind: "goalsToProjects", count: 2 }, "en"),
    ).toBe("2 goals → Creation projects");
  });
});
