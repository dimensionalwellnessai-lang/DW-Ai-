/**
 * useEnergyScore — fetches the live energy score from /api/energy/current.
 * Used by OrbHud and Today page to display the primary metric.
 */

import { useQuery } from "@tanstack/react-query";
import { getQueryFn } from "@/lib/queryClient";

export type EnergyBand = "low" | "steady" | "high";

export interface EnergyFactor {
  source: "mood" | "sleep" | "hrv" | "activity" | "self_report";
  label: string;
  value: number;
  weight: number;
}

export interface EnergyScoreResult {
  score: number;
  band: EnergyBand;
  factors: EnergyFactor[];
  computedAt: string;
}

export function useEnergyScore() {
  return useQuery<EnergyScoreResult>({
    queryKey: ["/api/energy/current"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: 2 * 60 * 1000, // refresh every 2 min
    refetchOnWindowFocus: true,
  });
}
