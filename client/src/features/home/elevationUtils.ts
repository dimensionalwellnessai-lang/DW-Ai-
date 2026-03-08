/**
 * Elevation Engine – shared UI utilities for Home Command Center cards.
 */

/**
 * Builds the chat prefill message used when navigating to /talk
 * for a 7-day elevation plan proposal.
 *
 * @param reasons - Up to 2 reason strings from the momentum check
 * @returns A pre-filled message string suitable for /talk?prefill=...
 */
export function buildElevationPlanPrefill(reasons: string[]): string {
  const reasonPart =
    reasons.length > 0
      ? `I'm noticing: ${reasons.join("; ")}. `
      : "";
  return `You mentioned you want momentum. Based on the last few days, ${reasonPart}Want me to propose a simple 7-day elevation plan?`;
}
