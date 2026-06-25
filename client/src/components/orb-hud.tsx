/**
 * OrbHud — the "what now?" brain hub (Roadmap §15.2).
 *
 * Replaces the simple chat-launcher orb with a contextual hub showing:
 *   • Energy score
 *   • Today's focus
 *   • Top priority
 *   • One-tap actions
 */

import { useOrbState } from "@/hooks/use-orb-state";
import { EnergyPill } from "@/components/energy-pill";
import { useLocation } from "wouter";
import { cn } from "@/lib/utils";
import {
  Heart,
  CheckCircle,
  Wind,
  Dumbbell,
  Pencil,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const ICON_MAP: Record<string, typeof Heart> = {
  heart: Heart,
  "check-circle": CheckCircle,
  wind: Wind,
  dumbbell: Dumbbell,
  pencil: Pencil,
};

interface OrbHudProps {
  className?: string;
}

export function OrbHud({ className }: OrbHudProps) {
  const { data: orb, isLoading } = useOrbState();
  const [, navigate] = useLocation();

  if (isLoading) {
    return (
      <div className={cn("flex flex-col items-center gap-3 p-4", className)}>
        <Skeleton className="h-8 w-20 rounded-full" />
        <Skeleton className="h-4 w-48" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-20 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>
    );
  }

  if (!orb) return null;

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      data-testid="orb-hud"
    >
      {/* Energy score pill */}
      <EnergyPill score={orb.energy.score} band={orb.energy.band} variant="full" />

      {/* Today's focus text */}
      {orb.todayFocus && (
        <p
          className="text-xs text-muted-foreground text-center max-w-[260px] leading-relaxed"
          data-testid="orb-focus"
        >
          {orb.todayFocus}
        </p>
      )}

      {/* Top priority */}
      {orb.topPriority && (
        <button
          type="button"
          onClick={() => navigate(orb.topPriority!.route)}
          className="text-xs font-medium text-primary hover:underline"
          data-testid="orb-priority"
        >
          → {orb.topPriority.title}
        </button>
      )}

      {/* Quick actions */}
      {orb.actions.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 mt-1" data-testid="orb-actions">
          {orb.actions.map((action) => {
            const Icon = ICON_MAP[action.icon ?? ""] ?? CheckCircle;
            return (
              <button
                key={action.id}
                type="button"
                onClick={() => navigate(action.route)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-medium border border-border text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
                data-testid={`orb-action-${action.id}`}
              >
                <Icon className="h-3 w-3" aria-hidden="true" />
                {action.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
