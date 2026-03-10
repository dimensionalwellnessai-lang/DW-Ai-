/**
 * HomeModuleDock – a horizontal row of module icons shown on the Home screen.
 *
 * Each icon represents one of the five focus modules (Insight, Plan, Health,
 * Momentum, Follow-up). Tapping an icon opens the HomeFocusSheet to that
 * module. A micro-metric badge (≤4 chars) keeps the dock informative without
 * adding visual noise.
 */

import { Sparkles, Target, Activity, Zap, MessageCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModuleId = "insight" | "plan" | "health" | "momentum" | "followup";

export interface ModuleMeta {
  id: ModuleId;
  label: string;
  icon: React.ElementType;
  colorClass: string;
  bgClass: string;
}

export const MODULES: ModuleMeta[] = [
  { id: "insight",  label: "Insight",   icon: Sparkles,     colorClass: "text-primary",       bgClass: "bg-primary/10" },
  { id: "plan",     label: "Plan",      icon: Target,       colorClass: "text-amber-500",     bgClass: "bg-amber-500/10" },
  { id: "health",   label: "Health",    icon: Activity,     colorClass: "text-green-500",     bgClass: "bg-green-500/10" },
  { id: "momentum", label: "Momentum",  icon: Zap,          colorClass: "text-purple-500",    bgClass: "bg-purple-500/10" },
  { id: "followup", label: "Follow-up", icon: MessageCircle, colorClass: "text-pink-500",     bgClass: "bg-pink-500/10" },
];

interface HomeModuleDockProps {
  /** Badge text (≤4 chars) per module id */
  badges?: Partial<Record<ModuleId, string>>;
  /** Currently active module (highlighted) */
  activeModule?: ModuleId | null;
  /** Called when a module icon is tapped */
  onSelect: (id: ModuleId) => void;
}

export function HomeModuleDock({ badges = {}, activeModule, onSelect }: HomeModuleDockProps) {
  return (
    <div
      className="flex items-center justify-around px-2 py-3 rounded-2xl border border-border/60 bg-card shadow-none"
      role="toolbar"
      aria-label="Module shortcuts"
    >
      {MODULES.map((mod) => {
        const Icon = mod.icon;
        const badge = badges[mod.id];
        const isActive = activeModule === mod.id;

        return (
          <button
            key={mod.id}
            type="button"
            onClick={() => onSelect(mod.id)}
            aria-label={`Open ${mod.label}${badge ? ` (${badge.slice(0, 4)})` : ""}`}
            aria-pressed={isActive}
            className={cn(
              "flex flex-col items-center gap-1 px-2 py-1 rounded-xl transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
              isActive ? "bg-muted" : "hover:bg-muted/50"
            )}
          >
            {/* Icon + badge wrapper */}
            <div className="relative">
              <div className={cn("p-2 rounded-xl", mod.bgClass)}>
                <Icon
                  className={cn("h-5 w-5", mod.colorClass)}
                  aria-hidden="true"
                />
              </div>
              {badge && (
                <span
                  className={cn(
                    "absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-0.5",
                    "flex items-center justify-center",
                    "rounded-full text-[9px] font-bold leading-none",
                    "bg-foreground text-background",
                  )}
                  aria-hidden="true"
                >
                  {badge.slice(0, 4)}
                </span>
              )}
            </div>
            <span className={cn("text-[10px] font-medium leading-none", isActive ? "text-foreground" : "text-muted-foreground")}>
              {mod.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
