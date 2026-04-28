/**
 * Tiny app-wide i18n helper.
 *
 * The product is currently shipped in English only, but the UI strings the
 * Life System backfill banner adds need to be translatable when other
 * languages are turned on.  Rather than pull in a heavyweight library, this
 * helper gives us the two primitives every other feature will need:
 *
 *   - `useLanguage()` — reactive hook that returns the current language code,
 *     resolved from (in order) an explicit `localStorage` override, the user
 *     preference set via `setLanguage(...)`, or the browser's `navigator.language`.
 *   - `pickTranslation(map, lang)` — chooses the best entry from a translation
 *     map, falling back to the base language (e.g. `pt-BR` → `pt`) and finally
 *     to English.
 *
 * Future features can drop their string maps next to their components and
 * call into the same primitives, so when the rest of the app picks up i18n
 * the banner will already be using the same plumbing.
 */

import { useEffect, useState } from "react";

export const DEFAULT_LANGUAGE = "en";
const STORAGE_KEY = "dw.lang";
const CHANGE_EVENT = "dw:language-change";

export type TranslationMap<T> = Record<string, T> & { en: T };

function readStoredLanguage(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function readNavigatorLanguage(): string | null {
  if (typeof navigator === "undefined") return null;
  // navigator.languages reflects the user's full preference order; fall back
  // to the single `language` field for older environments.
  const candidates = (navigator.languages && navigator.languages.length
    ? navigator.languages
    : [navigator.language]
  ).filter((x): x is string => typeof x === "string" && x.length > 0);
  return candidates[0] ?? null;
}

/** Normalise to a lowercase BCP-47 tag (e.g. `pt-br`). */
function normalize(lang: string | null | undefined): string {
  if (!lang) return DEFAULT_LANGUAGE;
  return lang.toLowerCase();
}

/** Resolve the language code we should render right now (non-reactive). */
export function resolveLanguage(): string {
  return normalize(readStoredLanguage() ?? readNavigatorLanguage() ?? DEFAULT_LANGUAGE);
}

/**
 * Persist a user-chosen language and notify any mounted `useLanguage()` hooks.
 * Pass `null` to clear the override and fall back to navigator detection.
 */
export function setLanguage(lang: string | null): void {
  if (typeof window === "undefined") return;
  try {
    if (lang) {
      window.localStorage.setItem(STORAGE_KEY, lang);
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Ignore — private mode / quota errors shouldn't break the UI.
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Reactive language hook. Re-renders when the override changes (within this
 * tab via `setLanguage`, or across tabs via the standard `storage` event).
 */
export function useLanguage(): string {
  const [lang, setLang] = useState<string>(() => resolveLanguage());

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setLang(resolveLanguage());
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) sync();
    };
    window.addEventListener(CHANGE_EVENT, sync);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener(CHANGE_EVENT, sync);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  return lang;
}

/**
 * Pick the best translation for `lang` from a map.
 *
 * Lookup order:
 *   1. exact match (case-insensitive)
 *   2. base language (e.g. `pt-br` → `pt`)
 *   3. English fallback (always present, enforced by `TranslationMap`)
 */
export function pickTranslation<T>(map: TranslationMap<T>, lang: string): T {
  const normalized = normalize(lang);
  if (map[normalized] !== undefined) return map[normalized];
  const base = normalized.split("-")[0];
  if (base && map[base] !== undefined) return map[base];
  return map.en;
}
