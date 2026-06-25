/**
 * useOrbState — fetches the aggregated Orb brain state from /api/orb/state.
 * Used by OrbHud to power the "what now?" hub.
 */

import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";
import type { EnergyScoreResult } from "./use-energy-score";

export interface OrbAction {
  id: string;
  label: string;
  route: string;
  icon?: string;
}

export interface OrbState {
  todayFocus: string | null;
  energy: EnergyScoreResult;
  topPriority: { title: string; route: string } | null;
  actions: OrbAction[];
  lastPulseAt: string | null;
  greeting: string;
}

export function useOrbState() {
  return useQuery<OrbState>({
    queryKey: ["/api/orb/state"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 2 * 60 * 1000,
    refetchOnWindowFocus: true,
  });
}
