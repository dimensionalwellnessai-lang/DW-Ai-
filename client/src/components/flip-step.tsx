/**
 * FlipStep — shared UI primitive for the Pause → Name → Flip → Choose loop
 * (Roadmap §15.1).
 *
 * Used across pages so the loop is visually consistent and the user
 * recognizes the rhythm in every interaction.
 */

import { cn } from "@/lib/utils";

export type FlipStepType = "pause" | "name" | "flip" | "choose";

interface FlipStepProps {
  step: FlipStepType;
  /** Optional label override. */
  label?: string;
  /** Show as compact inline tag vs. larger block. */
  variant?: "tag" | "block";
  className?: string;
}

const STEP_CONFIG: Record<FlipStepType, { label: string; color: string; icon: string }> = {
  pause: {
    label: "Pause",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300",
    icon: "◉",
  },
  name: {
    label: "Name",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300",
    icon: "◈",
  },
  flip: {
    label: "Flip",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300",
    icon: "↻",
  },
  choose: {
    label: "Choose",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300",
    icon: "✓",
  },
};

export function FlipStep({ step, label, variant = "tag", className }: FlipStepProps) {
  const config = STEP_CONFIG[step];
  const displayLabel = label ?? config.label;

  if (variant === "block") {
    return (
      <div
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium",
          config.color,
          className,
        )}
      >
        <span className="text-base">{config.icon}</span>
        <span>{displayLabel}</span>
      </div>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
        config.color,
        className,
      )}
    >
      <span>{config.icon}</span>
      <span>{displayLabel}</span>
    </span>
  );
}
