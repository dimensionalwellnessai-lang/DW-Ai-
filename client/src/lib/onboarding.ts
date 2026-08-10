/**
 * Shared onboarding helpers and route constants.
 *
 * Centralising these prevents the multiple copies in App.tsx and
 * dw-avatar-overlay.tsx from drifting out of sync.
 */

// ---------------------------------------------------------------------------
// Onboarding completion detection
// ---------------------------------------------------------------------------

function isProfileSetupComplete(): boolean {
  try {
    const data = localStorage.getItem("dw_guest_data");
    if (data) {
      const parsed = JSON.parse(data);
      return !!parsed.profileSetup?.completedAt;
    }
  } catch {}
  return false;
}

/**
 * Returns true when the user has completed onboarding (either the full wizard
 * or the guest quick-setup flow).  This is the single source of truth used by
 * routing guards, the avatar overlay, and last-route persistence.
 */
export function isOnboardingComplete(): boolean {
  if (localStorage.getItem("dw_onboarding_completed") === "1") return true;
  return isProfileSetupComplete();
}

/**
 * Marks onboarding as complete so routing guards (FirstRunGuard / HomeRedirect)
 * stop redirecting back to the onboarding flow. Call this from every exit path
 * of an onboarding screen (skip, finish, accept/defer suggestions) before
 * navigating into the app, otherwise the user is bounced straight back.
 */
export function markOnboardingComplete(): void {
  try {
    localStorage.setItem("dw_onboarding_completed", "1");
  } catch {
    // Ignore storage errors to avoid blocking navigation
  }
}

// ---------------------------------------------------------------------------
// Auth / onboarding route prefixes
// ---------------------------------------------------------------------------

/**
 * Path prefixes for auth and onboarding flows.
 *
 * These are shared across:
 * - `App.tsx` – `PAGES_WITHOUT_BOTTOM_NAV` and `NON_RESTORABLE_PREFIXES`
 * - `dw-avatar-overlay.tsx` – pages where the avatar must not appear
 *
 * Keeping a single list prevents the lists from drifting independently.
 */
export const AUTH_ONBOARDING_PAGES: readonly string[] = [
  "/welcome",
  "/login",
  "/reset-password",
  "/onboarding",
  "/voice-onboarding",
  "/enhanced-onboarding",
  "/welcome-back",
  "/app-tour",
  "/account/delete",
  "/subscription",
  "/paywall",
  "/upgrade",
  "/404",
];
