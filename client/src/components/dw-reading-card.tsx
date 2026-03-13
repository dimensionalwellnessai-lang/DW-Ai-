/**
 * DW Reading Card
 *
 * A daily dimensional reading card that surfaces the user's most relevant
 * switch insight + a contextual DW prompt. Placed in the home command center
 * as the primary intelligence touchpoint.
 *
 * Design principles:
 *  - One card, one insight, one prompt
 *  - DW Orb is the only interactive intelligence symbol
 *  - Premium, calm, cosmic aesthetic — no gamification
 *  - Tap orb → opens DW chat pre-seeded with today's prompt
 */

import { useMemo } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DWOrb } from "@/components/dw-orb";
import { getSwitchStatuses, getSwitchData } from "@/lib/switch-storage";
import { getDailyPrompt, getPromptForSwitch } from "@/lib/prompt-kit";
import type { SwitchId, SwitchStatus } from "@/lib/switch-storage";
import { cn } from "@/lib/utils";
import { COPY } from "@/copy/en";

// ── Switch display metadata ────────────────────────────────────────────────────

interface SwitchMeta {
  label: string;
  perspective: string;
  color: string;
  bgColor: string;
  dotColor: string;
}

const SWITCH_META: Record<SwitchId, SwitchMeta> = {
  body: {
    label: "Body",
    perspective: "Energy comes before motivation.",
    color: "text-red-400",
    bgColor: "bg-red-500/10",
    dotColor: "bg-red-400",
  },
  mind: {
    label: "Mind",
    perspective: "I can notice my thoughts without becoming them.",
    color: "text-purple-400",
    bgColor: "bg-purple-500/10",
    dotColor: "bg-purple-400",
  },
  time: {
    label: "Time",
    perspective: "A plan should support my life, not trap it.",
    color: "text-blue-400",
    bgColor: "bg-blue-500/10",
    dotColor: "bg-blue-400",
  },
  purpose: {
    label: "Purpose",
    perspective: "I don't need the full map — just the next aligned step.",
    color: "text-amber-400",
    bgColor: "bg-amber-500/10",
    dotColor: "bg-amber-400",
  },
  money: {
    label: "Money",
    perspective: "Money is a tool, not a verdict on my worth.",
    color: "text-green-400",
    bgColor: "bg-green-500/10",
    dotColor: "bg-green-400",
  },
  relationships: {
    label: "Relationships",
    perspective: "Connection should feel safe, not draining.",
    color: "text-pink-400",
    bgColor: "bg-pink-500/10",
    dotColor: "bg-pink-400",
  },
  environment: {
    label: "Environment",
    perspective: "Your space is a mirror of your current chapter.",
    color: "text-cyan-400",
    bgColor: "bg-cyan-500/10",
    dotColor: "bg-cyan-400",
  },
  identity: {
    label: "Identity",
    perspective: "You are becoming, not just being.",
    color: "text-violet-400",
    bgColor: "bg-violet-500/10",
    dotColor: "bg-violet-400",
  },
};

const STATUS_LABELS: Record<SwitchStatus, string> = {
  off: "Not started",
  flickering: "Building",
  stable: "Holding",
  powered: "Powered",
};

const STATUS_BADGE_VARIANT: Record<
  SwitchStatus,
  "secondary" | "outline" | "default" | "destructive"
> = {
  off: "outline",
  flickering: "secondary",
  stable: "secondary",
  powered: "default",
};

// ── Energy thresholds (0–10 scale) ───────────────────────────────────────────

const ENERGY_LOW_THRESHOLD = 3;
const ENERGY_MEDIUM_THRESHOLD = 6;

// ── Component ─────────────────────────────────────────────────────────────────

export interface DWReadingCardProps {
  /** Override the energy level for prompt selection (0–10 scale or null) */
  energyLevel?: number | null;
  className?: string;
}

export function DWReadingCard({ energyLevel, className }: DWReadingCardProps) {
  const [, navigate] = useLocation();

  const { focusSwitch, focusStatus, prompt, meta } = useMemo(() => {
    const statuses = getSwitchStatuses();
    const switchData = getSwitchData();

    // Pick the most active non-off switch. Tiebreak by recency (lastUpdated).
    const statusOrder: SwitchStatus[] = ["powered", "stable", "flickering"];
    let chosen: SwitchId | null = null;
    let chosenStatus: SwitchStatus = "off";

    for (const status of statusOrder) {
      const candidates = (Object.entries(statuses) as [SwitchId, SwitchStatus][])
        .filter(([, s]) => s === status)
        .sort(([a], [b]) => (switchData[b]?.lastUpdated ?? 0) - (switchData[a]?.lastUpdated ?? 0));
      if (candidates.length > 0) {
        [chosen, chosenStatus] = candidates[0];
        break;
      }
    }

    // Convert numeric energy level to low/medium/high category
    const energyCategory =
      energyLevel === null || energyLevel === undefined
        ? null
        : energyLevel <= ENERGY_LOW_THRESHOLD
          ? "low"
          : energyLevel <= ENERGY_MEDIUM_THRESHOLD
            ? "medium"
            : "high";

    const resolvedPrompt = chosen
      ? getPromptForSwitch(chosen, chosenStatus)
      : getDailyPrompt({}, energyCategory);

    return {
      focusSwitch: chosen,
      focusStatus: chosenStatus,
      prompt: resolvedPrompt,
      meta: chosen ? SWITCH_META[chosen] : null,
    };
  }, [energyLevel]);

  const handleDWTap = () => {
    navigate(`/talk?topic=${encodeURIComponent(prompt.text)}`);
  };

  return (
    <Card
      className={cn(
        "border-border/30 bg-card/60 backdrop-blur-sm overflow-hidden",
        className,
      )}
      data-testid="dw-reading-card"
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Left: reading content */}
          <div className="flex-1 min-w-0 space-y-2">
            {/* Header row */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                {COPY.dwReadingCard.sectionLabel}
              </span>
              {focusSwitch && meta && (
                <>
                  <span className="text-muted-foreground/40 text-xs">·</span>
                  <span className={cn("text-xs font-medium", meta.color)} data-testid="reading-switch-label">
                    {meta.label}
                  </span>
                  <Badge
                    variant={STATUS_BADGE_VARIANT[focusStatus]}
                    className="text-[10px] h-4 px-1.5"
                    data-testid="reading-status-badge"
                  >
                    {STATUS_LABELS[focusStatus]}
                  </Badge>
                </>
              )}
            </div>

            {/* Daily prompt */}
            <p
              className="text-sm leading-relaxed text-foreground"
              data-testid="reading-prompt-text"
            >
              {prompt.text}
            </p>

            {/* Perspective phrase from this switch */}
            {meta && (
              <p
                className="text-xs text-muted-foreground italic leading-snug"
                data-testid="reading-perspective"
              >
                "{meta.perspective}"
              </p>
            )}
          </div>

          {/* Right: DW Orb */}
          <div className="flex-shrink-0 flex flex-col items-center justify-center pt-1">
            <DWOrb
              size={40}
              state="suggestion"
              onTap={handleDWTap}
              context={prompt.text}
              label={COPY.dwReadingCard.orbLabel}
            />
            <span className="text-[9px] text-muted-foreground mt-1.5 text-center leading-tight max-w-[44px]">
              {COPY.dwReadingCard.orbLabel}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
