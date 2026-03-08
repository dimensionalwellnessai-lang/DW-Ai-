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
        throw new Error(`Elevation check failed: ${res.status}`);
      }
      return res.json() as Promise<ElevationCheckResult>;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(QUERY_KEY, data);
    },
    onError: (error) => {
      // Non-critical: log and continue
      console.warn("Elevation engine check error (non-fatal):", error);
    },
  });

  // ── Daily check on mount: run once per calendar day ──────────────────────
  useEffect(() => {
    if (!enabled || !isLoggedIn || hasRunDailyCheck.current) return;
    // If we already have a cached result from today, skip
    if (cachedCheck !== undefined) {
      // cachedCheck is null (no check yet today) or the result
      hasRunDailyCheck.current = true;
      if (cachedCheck === null) {
        // No check today → run it now
        runCheck({ force: false });
      }
      // If cachedCheck is a result, we're already done
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
