import type { SwitchId } from "./switch-storage";

/**
 * Shared color configuration for Switch visualizations
 * Provides consistent text and background colors across all pages
 * with proper dark mode support
 */
export const SWITCH_COLORS: Record<SwitchId, { text: string; bg: string }> = {
  body: { text: "text-red-400", bg: "bg-red-500/10 dark:bg-red-400/15" },
  mind: { text: "text-purple-400", bg: "bg-purple-500/10 dark:bg-purple-400/15" },
  time: { text: "text-blue-400", bg: "bg-blue-500/10 dark:bg-blue-400/15" },
  purpose: { text: "text-amber-400", bg: "bg-amber-500/10 dark:bg-amber-400/15" },
  money: { text: "text-green-400", bg: "bg-green-500/10 dark:bg-green-400/15" },
  relationships: { text: "text-pink-400", bg: "bg-pink-500/10 dark:bg-pink-400/15" },
  environment: { text: "text-cyan-400", bg: "bg-cyan-500/10 dark:bg-cyan-400/15" },
  identity: { text: "text-emerald-400", bg: "bg-emerald-500/10 dark:bg-emerald-400/15" },
};
