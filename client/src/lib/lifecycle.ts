/**
 * Lifecycle routing helpers for dwai.
 *
 * On each authenticated app open the router reads the user's `lastActiveAt`
 * timestamp (from the /api/user response) and classifies them into one of
 * three lifecycle states so the app can route them to the right screen:
 *
 *   new        → no completed onboarding, go to /voice-onboarding
 *   recent     → last active within 7 days, go to /command-center (home)
 *   long_away  → last active 21+ days ago, go to /welcome-back
 *
 * The band between 7 and 21 days also routes to /command-center (home).
 * Welcome Back is reserved for users away 21 or more days.
 */

export type LifecycleState = "new" | "recent" | "long_away";

/**
 * Compute lifecycle state from `lastActiveAt`.
 *
 * Three-band classification:
 *   - new:       onboarding not completed
 *   - recent:    last active ≤ 7 days ago   → route to Home
 *   - long_away: last active ≥ 21 days ago  → route to Welcome Back
 *
 * Users in the 7–21 day band are treated as "recent" (route to Home).
 *
 * @param onboardingCompleted - whether the user finished onboarding
 * @param lastActiveAt        - ISO string or Date of last activity, or null
 * @returns lifecycle state string
 */
export function computeLifecycleState(
  onboardingCompleted: boolean,
  lastActiveAt: string | Date | null | undefined,
): LifecycleState {
  if (!onboardingCompleted) return "new";

  if (!lastActiveAt) {
    // Onboarding done but never stored last_active → treat as recent (just onboarded)
    return "recent";
  }

  const last = typeof lastActiveAt === "string" ? new Date(lastActiveAt) : lastActiveAt;
  const daysAway = (Date.now() - last.getTime()) / (1000 * 60 * 60 * 24);

  if (daysAway >= LONG_AWAY_THRESHOLD_DAYS) return "long_away";
  return "recent";
}

/** Days-away threshold for "long away" classification (Welcome Back flow). */
export const LONG_AWAY_THRESHOLD_DAYS = 21;

/** Days-away threshold for "recent" classification (direct-to-Home routing). */
export const RECENT_THRESHOLD_DAYS = 7;

/**
 * Returns a human-readable summary of days away, e.g. "3 weeks" or "45 days".
 */
export function formatDaysAway(lastActiveAt: string | Date | null | undefined): string {
  if (!lastActiveAt) return "a while";
  const last = typeof lastActiveAt === "string" ? new Date(lastActiveAt) : lastActiveAt;
  const days = Math.round((Date.now() - last.getTime()) / (1000 * 60 * 60 * 24));
  if (days < 2) return "yesterday";
  if (days < 14) return `${days} days`;
  const weeks = Math.round(days / 7);
  return `${weeks} week${weeks !== 1 ? "s" : ""}`;
}
