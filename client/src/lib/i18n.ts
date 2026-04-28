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

/**
 * Read the language the server bootstrapped into the initial HTML. The
 * server injects `window.__DW_LANG__ = "<bcp47>"` into index.html for
 * signed-in users with a stored preference, so cross-device users get
 * the right strings on the very first paint instead of seeing English
 * until /api/auth/me resolves.
 */
function readBootstrappedLanguage(): string | null {
  if (typeof window === "undefined") return null;
  const v = (window as unknown as { __DW_LANG__?: unknown }).__DW_LANG__;
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Normalise to a lowercase BCP-47 tag (e.g. `pt-br`). */
function normalize(lang: string | null | undefined): string {
  if (!lang) return DEFAULT_LANGUAGE;
  return lang.toLowerCase();
}

/**
 * Resolve the language code we should render right now (non-reactive).
 *
 * Precedence (deterministic, evaluated synchronously on every call):
 *   1. Server-bootstrapped language (`window.__DW_LANG__`) — the
 *      cross-device source of truth for signed-in users. Wins because
 *      the alternative is a flash of English while /api/auth/me settles.
 *   2. Per-tab localStorage override — what `setLanguage()` writes when
 *      the picker fires. Used both for anonymous users and as the
 *      "until the next bootstrap arrives" cache after a save.
 *   3. Navigator language — best guess for first-time anonymous users.
 *   4. `DEFAULT_LANGUAGE` (`en`).
 */
export function resolveLanguage(): string {
  return normalize(
    readBootstrappedLanguage()
      ?? readStoredLanguage()
      ?? readNavigatorLanguage()
      ?? DEFAULT_LANGUAGE,
  );
}

/**
 * Persist a user-chosen language and notify any mounted `useLanguage()` hooks.
 * Pass `null` to clear the override and fall back to navigator detection.
 *
 * Writes to localStorage AND mirrors the value into `window.__DW_LANG__`
 * (the same slot the server bootstrap fills). The bootstrap takes
 * precedence inside `resolveLanguage()`, so without this mirror a
 * picker save would have no effect for users whose page loaded with a
 * server-bootstrapped language — they'd be stuck on the bootstrapped
 * value until a full page reload.
 *
 * Server-side persistence (so the choice follows the user across
 * devices) is still the caller's responsibility, e.g. via
 * `PATCH /api/auth/me`.
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
  // Keep the bootstrap slot in sync so resolveLanguage() reads the
  // freshest value on the next call. Setting to undefined (rather than
  // an empty string) lets the precedence chain fall through to
  // localStorage / navigator on a clear.
  const bootstrapHost = window as unknown as { __DW_LANG__?: string };
  if (lang) {
    bootstrapHost.__DW_LANG__ = lang;
  } else {
    delete bootstrapHost.__DW_LANG__;
  }
  window.dispatchEvent(new CustomEvent(CHANGE_EVENT));
}

/**
 * Hydrate the local override from a server-persisted preference when the
 * two are out of sync. Used on auth load as a belt-and-braces in case
 * the bootstrap script was served stale (e.g. cached by a CDN); the
 * primary first-paint path is the synchronous bootstrap injection.
 *
 * Passing `null`/`undefined` is a no-op — we don't want to clobber a
 * deliberate local override just because the server hasn't been told yet.
 */
export function hydrateLanguageFromServer(serverLang: string | null | undefined): void {
  if (!serverLang || typeof window === "undefined") return;
  const normalized = normalize(serverLang);
  const current = readStoredLanguage();
  if (current && normalize(current) === normalized) return;
  setLanguage(normalized);
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
      if (e.key !== STORAGE_KEY) return;
      // Mirror the cross-tab change into the bootstrap slot so
      // resolveLanguage()'s bootstrap-priority precedence sees the
      // freshest value, not the stale server-injected one from the
      // initial page load. Without this, a save in tab A would update
      // tab A's UI but tab B would stay on the bootstrapped value
      // until the next reload.
      const bootstrapHost = window as unknown as { __DW_LANG__?: string };
      if (e.newValue) {
        bootstrapHost.__DW_LANG__ = e.newValue;
      } else {
        delete bootstrapHost.__DW_LANG__;
      }
      sync();
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
