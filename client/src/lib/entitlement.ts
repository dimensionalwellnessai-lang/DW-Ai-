/**
 * DW Plus entitlement & free-tier limits service.
 *
 * All state is localStorage-backed so it works in both web and Capacitor
 * without a backend. Structured to be drop-in compatible with a future
 * RevenueCat / StoreKit integration (replace the setDWPlus callers).
 */

// ─── Storage keys ────────────────────────────────────────────────────────────
const KEY_IS_PLUS = "dw_is_plus";
const KEY_MSG_COUNT = "dw_msg_count";
const KEY_MSG_DATE = "dw_msg_date";
const KEY_SESSION_COUNT = "dw_session_count";
const KEY_SESSION_DATE = "dw_session_date";
const KEY_BONUS_MESSAGE = "dw_bonus_message";
const KEY_BONUS_SESSION = "dw_bonus_session";

// ─── Free-tier limits ────────────────────────────────────────────────────────
export const FREE_LIMITS = {
  messagesPerDay: 75,
  sessionsPerDay: 3,
} as const;

// ─── Safe localStorage helpers ───────────────────────────────────────────────
function getItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function setItem(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // localStorage unavailable (e.g. private browsing quota) — silently skip
  }
}

// ─── Date key (local midnight boundary) ──────────────────────────────────────
/**
 * Returns a YYYY-MM-DD string for today in the *local* timezone.
 * This is the reset boundary: counters clear when the date key changes.
 */
export function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// ─── DW Plus entitlement ─────────────────────────────────────────────────────
export function isDWPlus(): boolean {
  return getItem(KEY_IS_PLUS) === "true";
}

export function setDWPlus(value: boolean): void {
  setItem(KEY_IS_PLUS, value ? "true" : "false");
}

/**
 * Activate DW Plus (simulated purchase on web/Replit).
 * `context` lets callers grant the appropriate one-time bonus — but only when
 * the user is actually at the free-tier cap at the moment of upgrade:
 *   - "message_limit" → grants 1 bonus message (only if currently at the daily cap)
 *   - "session_limit" → grants 1 bonus session (only if currently at the daily cap)
 *   - "paywall" / "restore" → no bonus
 */
export function activateDWPlus(
  context: "message_limit" | "session_limit" | "paywall" | "restore"
): void {
  setDWPlus(true);
  // Always reset both flags, then selectively grant based on current counters
  setItem(KEY_BONUS_MESSAGE, "false");
  setItem(KEY_BONUS_SESSION, "false");
  if (context === "message_limit" && getMessageCount() >= FREE_LIMITS.messagesPerDay) {
    setItem(KEY_BONUS_MESSAGE, "true");
  } else if (context === "session_limit" && getSessionCount() >= FREE_LIMITS.sessionsPerDay) {
    setItem(KEY_BONUS_SESSION, "true");
  }
}

// ─── Daily message counter ────────────────────────────────────────────────────
/**
 * Returns the message count for today, resetting to 0 if the date has changed.
 */
export function getMessageCount(): number {
  const today = getLocalDateKey();
  if (getItem(KEY_MSG_DATE) !== today) {
    setItem(KEY_MSG_DATE, today);
    setItem(KEY_MSG_COUNT, "0");
    return 0;
  }
  const parsed = parseInt(getItem(KEY_MSG_COUNT) ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function incrementMessageCount(): number {
  const count = getMessageCount() + 1;
  setItem(KEY_MSG_COUNT, String(count));
  return count;
}

export function canSendMessage(): boolean {
  return true;
}

// ─── Daily session counter ────────────────────────────────────────────────────
/**
 * Returns the session count for today, resetting to 0 if the date has changed.
 */
export function getSessionCount(): number {
  const today = getLocalDateKey();
  if (getItem(KEY_SESSION_DATE) !== today) {
    setItem(KEY_SESSION_DATE, today);
    setItem(KEY_SESSION_COUNT, "0");
    return 0;
  }
  const parsed = parseInt(getItem(KEY_SESSION_COUNT) ?? "0", 10);
  return Number.isNaN(parsed) ? 0 : parsed;
}

export function incrementSessionCount(): number {
  const count = getSessionCount() + 1;
  setItem(KEY_SESSION_COUNT, String(count));
  return count;
}

export function canStartNewSession(): boolean {
  return true;
}

// ─── Bonus mechanics ──────────────────────────────────────────────────────────
/** One final message allowed after upgrading at the message limit. */
export function getBonusMessageFlag(): boolean {
  return getItem(KEY_BONUS_MESSAGE) === "true";
}

export function consumeBonusMessage(): void {
  setItem(KEY_BONUS_MESSAGE, "false");
}

/** One bonus session allowed after upgrading at the session limit. */
export function getBonusSessionFlag(): boolean {
  return getItem(KEY_BONUS_SESSION) === "true";
}

export function consumeBonusSession(): void {
  setItem(KEY_BONUS_SESSION, "false");
}
