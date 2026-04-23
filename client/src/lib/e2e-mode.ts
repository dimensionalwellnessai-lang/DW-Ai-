/**
 * Test-mode flag used by automated end-to-end runners (Playwright, etc.)
 * to suppress first-run UX that gets in the way of test assertions:
 *   - First-run tutorial coach marks (TutorialProvider.startTutorial)
 *   - Proactive accountability cards on the home command center
 *
 * The flag is OFF for real users. It only turns on when one of these is true:
 *   - The page was loaded with `?e2e=1` (anywhere in the query string)
 *   - `localStorage.dw_e2e === "1"` (set by the test runner once)
 *   - `VITE_E2E === "1"` at build time (CI builds)
 *
 * Loading with `?e2e=1` once is enough for the rest of the session: we
 * persist the flag to `sessionStorage` so subsequent navigations inside
 * the same test keep tutorials suppressed without re-passing the query
 * param. `sessionStorage` (not `localStorage`) is intentional — if a real
 * user ever stumbles onto a `?e2e=1` link, the suppression dies the
 * moment they close the tab instead of sticking around forever.
 *
 * `localStorage.dw_e2e === "1"` is also honoured for runners that prefer
 * to set it once and reuse the same browser context across pages.
 */

const E2E_STORAGE_KEY = "dw_e2e";

let cached: boolean | null = null;

export function isE2ETestMode(): boolean {
  if (cached !== null) return cached;

  // Build-time flag (CI). Always honoured.
  const buildFlag =
    typeof import.meta !== "undefined" &&
    import.meta.env &&
    import.meta.env.VITE_E2E === "1";
  if (buildFlag) {
    cached = true;
    return true;
  }

  // Runtime flag — query param or persisted localStorage entry.
  if (typeof window === "undefined") {
    cached = false;
    return false;
  }

  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("e2e") === "1") {
      try {
        // Tab-scoped on purpose: closing the tab clears it.
        window.sessionStorage.setItem(E2E_STORAGE_KEY, "1");
      } catch {
        // Ignore quota / private-mode errors — the query param alone is fine.
      }
      cached = true;
      return true;
    }
    if (window.sessionStorage.getItem(E2E_STORAGE_KEY) === "1") {
      cached = true;
      return true;
    }
    // Cross-context runners that set localStorage once still work.
    if (window.localStorage.getItem(E2E_STORAGE_KEY) === "1") {
      cached = true;
      return true;
    }
  } catch {
    // localStorage / URL parsing can throw in obscure environments;
    // a hostile failure mode would be silently disabling tutorials, so
    // we err on the side of "not in test mode".
  }

  cached = false;
  return false;
}

/**
 * Reset the cached value. Exposed for unit tests so the helper can be
 * re-evaluated after tests mutate localStorage / window.location.
 */
export function _resetE2EModeCache(): void {
  cached = null;
}
