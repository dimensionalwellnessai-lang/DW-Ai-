/**
 * useElevationEngine – hook for the PR #3 Elevation Engine.
 *
 * Implements the "Trigger model A": daily check once per calendar day per user,
 * plus an on-demand "checkNow" function.
 *
 * - Auth users: persists to DB via /api/elevation/check; idempotent server-side.
 * - Guests: no data available (habits/goals require auth), returns null status.
 *
 * Feature-flag gated: returns a no-op result when ELEVATION_ENGINE is disabled.
 */

import { useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { getQueryFn } from "@/lib/queryClient";

export type MomentumStatus = "green" | "yellow" | "red";

export interface ElevationCheckResult {
  momentumStatus: MomentumStatus;
  reasons: string[];
  suggestedFocus?: string | null;
  checkedDate?: string;
}

export interface UseElevationEngineResult {
  /** Current momentum status, or null if not yet available */
  status: MomentumStatus | null;
  /** Up to 2 reason strings explaining the status */
  reasons: string[];
  /** Optional one-line focus suggestion */
  suggestedFocus: string | null;
  /** True while the check is being fetched/computed */
  isLoading: boolean;
  /** Trigger an on-demand re-check immediately */
  checkNow: () => void;
  /** Whether the feature is enabled */
  enabled: boolean;
}

const QUERY_KEY = ["/api/elevation/check"];

export function useElevationEngine(): UseElevationEngineResult {
  const enabled = isFeatureEnabled("ELEVATION_ENGINE");
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const hasRunDailyCheck = useRef(false);

  // ── GET today's cached check ──────────────────────────────────────────────
  const { data: cachedCheck, isLoading: isFetching } = useQuery<ElevationCheckResult | null>({
    queryKey: QUERY_KEY,
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: enabled && isLoggedIn,
    retry: false,
    staleTime: 5 * 60 * 1000, // treat as fresh for 5 minutes
  });

  // ── POST to run/re-run a check ────────────────────────────────────────────
  const { mutate: runCheck, isPending: isChecking } = useMutation<
    ElevationCheckResult,
    Error,
    { force?: boolean }
  >({
    mutationFn: async ({ force = false } = {}) => {
      const res = await fetch("/api/elevation/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force }),
      });
      if (!res.ok) {
        let errorText = "";
        try {
          errorText = (await res.text()).trim();
        } catch {
          // ignore errors while reading error body
        }
        const detail = errorText || res.statusText || "Unknown error";
        throw new Error(`Elevation check failed: ${res.status} ${detail}`);
      }
      return (await res.json()) as ElevationCheckResult;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
      // Mark that we've completed a check so the daily effect won't re-run
      hasRunDailyCheck.current = true;
    },
    onError: (error) => {
      // Non-critical: log and continue; also mark done so we don't retry in a loop
      console.warn("Elevation engine check error (non-fatal):", error);
      hasRunDailyCheck.current = true;
    },
  });

  // ── Daily check on mount: run once per calendar day ──────────────────────
  useEffect(() => {
    if (!enabled || !isLoggedIn || hasRunDailyCheck.current) return;
    // cachedCheck is undefined while loading, null when no check exists today, or the result
    if (cachedCheck === undefined) return; // still loading – wait
    if (cachedCheck === null) {
      // No check today → run it now; flag is set in onSuccess/onError
      runCheck({ force: false });
    } else {
      // Already have today's result – nothing to do
      hasRunDailyCheck.current = true;
    }
  }, [enabled, isLoggedIn, cachedCheck, runCheck]);

  // ── On-demand check ───────────────────────────────────────────────────────
  const checkNow = useCallback(() => {
    if (!enabled || !isLoggedIn) return;
    runCheck({ force: true });
  }, [enabled, isLoggedIn, runCheck]);

  // ── Derive output ─────────────────────────────────────────────────────────
  if (!enabled || !isLoggedIn) {
    return {
      status: null,
      reasons: [],
      suggestedFocus: null,
      isLoading: false,
      checkNow: () => undefined,
      enabled,
    };
  }

  const result = cachedCheck;
  const isLoading = isFetching || isChecking;

  return {
    status: result?.momentumStatus ?? null,
    reasons: result?.reasons ?? [],
    suggestedFocus: result?.suggestedFocus ?? null,
    isLoading,
    checkNow,
    enabled,
  };
}
