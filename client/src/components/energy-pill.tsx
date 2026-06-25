/**
 * EnergyPill — compact display of the user's energy score (Roadmap §15.8).
 *
 * Shows a colored pill with the score and band. Used in the Today page header
 * and the OrbHud overlay.
 */

import { cn } from "@/lib/utils";
import { Zap } from "lucide-react";
import type { EnergyBand } from "@/hooks/use-energy-score";

interface EnergyPillProps {
  score: number;
  band: EnergyBand;
  className?: string;
  /** Show just the icon + number (compact) or include band label. */
  variant?: "compact" | "full";
}

const BAND_STYLES: Record<EnergyBand, string> = {
  low: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300",
  steady: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
  high: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
};

export function EnergyPill({ score, band, className, variant = "compact" }: EnergyPillProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors",
        BAND_STYLES[band],
        className,
      )}
      aria-label={`Energy score: ${score} out of 100, ${band}`}
    >
      <Zap className="h-3 w-3" aria-hidden="true" />
      <span>{score}</span>
      {variant === "full" && (
        <span className="opacity-70 capitalize">· {band}</span>
      )}
    </span>
  );
}
