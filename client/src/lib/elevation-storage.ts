/**
 * elevation-storage.ts – Guest-mode localStorage helpers for the Elevation Engine.
 *
 * Auth users: data stored in DB via /api/elevation/check.
 * Guests: last-prompt date stored here so we don't re-prompt on every page load.
 */

const LAST_PROMPT_KEY = "dw_elevation_last_prompt_date";

/** Returns today's date as a YYYY-MM-DD string. */
export function todayString(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns the last date the elevation prompt was shown to a guest, or null. */
export function getGuestLastPromptDate(): string | null {
  try {
    return localStorage.getItem(LAST_PROMPT_KEY);
  } catch {
    return null;
  }
}

/** Records that the elevation prompt was shown today (guest only). */
export function setGuestLastPromptDate(date: string): void {
  try {
    localStorage.setItem(LAST_PROMPT_KEY, date);
  } catch {
    // localStorage blocked — silently ignore
  }
}

/** Returns true if the prompt has already been shown today (guest only). */
export function hasGuestSeenPromptToday(): boolean {
  return getGuestLastPromptDate() === todayString();
}
