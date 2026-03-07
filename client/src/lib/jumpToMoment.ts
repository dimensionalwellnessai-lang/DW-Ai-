/**
 * Parses the `jumpToMessageIndex` query parameter from a URL search string.
 * Accepts only non-negative integers; returns null for absent, negative,
 * non-integer, or otherwise malformed values.
 *
 * @example
 *   parseJumpToMessageIndex("?jumpToMessageIndex=5")      // → 5
 *   parseJumpToMessageIndex("?jumpToMessageIndex=0")      // → 0
 *   parseJumpToMessageIndex("?jumpToMessageIndex=3.7")    // → null (float)
 *   parseJumpToMessageIndex("?jumpToMessageIndex=-1")     // → null (negative)
 *   parseJumpToMessageIndex("?jumpToMessageIndex=abc")    // → null (non-numeric)
 *   parseJumpToMessageIndex("?foo=bar")                   // → null (absent)
 *   parseJumpToMessageIndex("")                           // → null
 */
export function parseJumpToMessageIndex(queryString: string): number | null {
  if (!queryString) return null;
  try {
    const params = new URLSearchParams(
      queryString.startsWith("?") ? queryString.slice(1) : queryString
    );
    const raw = params.get("jumpToMessageIndex");
    if (raw === null) return null;
    // Strict integer-only: reject empty string, floats, negatives, and non-numeric values
    if (!/^\d+$/.test(raw)) return null;
    const index = Number(raw);
    return Number.isSafeInteger(index) && index >= 0 ? index : null;
  } catch {
    return null;
  }
}
