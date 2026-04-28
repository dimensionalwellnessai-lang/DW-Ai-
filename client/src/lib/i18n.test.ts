import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_LANGUAGE,
  pickTranslation,
  resolveLanguage,
  setLanguage,
  type TranslationMap,
} from "./i18n";

describe("pickTranslation", () => {
  const map: TranslationMap<string> = {
    en: "Hello",
    es: "Hola",
    "pt-br": "Olá",
    fr: "Bonjour",
  };

  it("returns the exact match for a known language", () => {
    expect(pickTranslation(map, "es")).toBe("Hola");
    expect(pickTranslation(map, "fr")).toBe("Bonjour");
  });

  it("matches case-insensitively", () => {
    expect(pickTranslation(map, "ES")).toBe("Hola");
    expect(pickTranslation(map, "PT-BR")).toBe("Olá");
  });

  it("falls back to the base language when a region is unknown", () => {
    expect(pickTranslation(map, "es-MX")).toBe("Hola");
    expect(pickTranslation(map, "fr-CA")).toBe("Bonjour");
  });

  it("falls back to English for unknown languages", () => {
    expect(pickTranslation(map, "xx")).toBe("Hello");
    expect(pickTranslation(map, "")).toBe("Hello");
  });

  it("prefers the exact regional match over the base", () => {
    expect(pickTranslation(map, "pt-BR")).toBe("Olá");
  });
});

describe("resolveLanguage / setLanguage", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it("uses the stored override when present", () => {
    setLanguage("fr");
    expect(resolveLanguage()).toBe("fr");
  });

  it("clears the override when passed null", () => {
    setLanguage("fr");
    setLanguage(null);
    expect(window.localStorage.getItem("dw.lang")).toBeNull();
  });

  it("falls back to navigator.language when no override is set", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue(["de-DE", "en"]);
    expect(resolveLanguage()).toBe("de-de");
  });

  it("returns the default language as a final fallback", () => {
    vi.spyOn(navigator, "languages", "get").mockReturnValue([]);
    vi.spyOn(navigator, "language", "get").mockReturnValue("");
    expect(resolveLanguage()).toBe(DEFAULT_LANGUAGE);
  });
});
