/**
 * Zone Interior Page — `/zones/:zoneId`
 *
 * Shows the available state, wiring, and embedded tools for a single Zone.
 * All relevant tools for the Zone are surfaced here, keeping
 * the architecture's depth-based model intact.
 */

import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Constellation } from "@/components/constellation";
import { cn } from "@/lib/utils";
import { ZONES } from "./index";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { ZoneId } from "@/components/constellation";

// ── Energy level types ────────────────────────────────────────────────────────

type EnergyLevel = "dim" | "low" | "steady" | "bright" | "unavailable";

const ENERGY_DESCRIPTIONS: Record<EnergyLevel, string> = {
  dim:    "This Zone needs attention. A little intention goes a long way here.",
  low:    "Some light getting through. Worth tending without forcing.",
  steady: "Holding well. Consistent small actions keep it here.",
  bright: "Lit up. This Zone is feeding the others right now.",
  unavailable: "Personalized Zone state isn't available yet.",
};

// ── Current descriptions ──────────────────────────────────────────────────────

const CURRENT_DESCRIPTIONS: Record<string, string> = {
  Gut:   "Gut Current (Sacral) — body-led response that tends to show up in the moment.",
  Wave:  "Wave Current (Emotional) — feeling-led signal that often benefits from settling before clarity.",
  Spark: "Spark Current (Splenic) — intuitive awareness that can arrive quickly and quietly.",
  Will:  "Will Current (Heart/Ego) — bursts of drive around desire, commitment, and resourcing.",
  Voice: "Voice Current (Throat) — expression, articulation, and being heard.",
  Mind:  "Mind Current (Ajna) — conceptual processing, patterning, and perspective-making.",
  Flow:  "Flow Current (G/Identity) — orientation through direction, belonging, and resonance.",
  Drive: "Drive Current (Root) — pressure, momentum, and activation under load.",
  Light: "Light Current (Head/Crown) — inspiration, ideas, and larger-pattern awareness.",
};

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  params: { zoneId: string };
}

export default function ZoneDetailPage({ params }: Props) {
  const zoneId = params?.zoneId as ZoneId;
  const [, setLocation] = useLocation();

  const zone = ZONES.find((z) => z.id === zoneId);

  usePageMeta(
    zone ? `${zone.name} Zone` : "Zone",
    zone ? zone.tagline : "A space worth tending."
  );

  if (!zone) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 p-8 text-center">
        <p className="text-muted-foreground">Zone not found.</p>
        <Button variant="outline" onClick={() => setLocation("/zones")}>
          Back to The House
        </Button>
      </div>
    );
  }

  const level: EnergyLevel = "unavailable";
  const energyDesc = ENERGY_DESCRIPTIONS[level];
  const currentDesc = CURRENT_DESCRIPTIONS[zone.current] ?? zone.current;

  const levelColor = {
    dim:    "text-zinc-700 dark:text-zinc-400",
    low:    "text-amber-700 dark:text-amber-400",
    steady: "text-sky-700 dark:text-sky-400",
    bright: "text-emerald-700 dark:text-emerald-400",
    unavailable: "text-zinc-700 dark:text-zinc-300",
  }[level];

  const levelDot = {
    dim:    "bg-zinc-500",
    low:    "bg-amber-500",
    steady: "bg-sky-500",
    bright: "bg-emerald-500",
    unavailable: "bg-zinc-400",
  }[level];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Back nav */}
      <div className="px-4 pt-4">
        <button
          type="button"
          onClick={() => setLocation("/zones")}
          className="flex min-h-11 items-center gap-1.5 px-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          The House
        </button>
      </div>

      {/* Zone header */}
      <div className={cn("mx-4 mt-3 rounded-2xl border p-5", zone.bg, zone.border)}>
        <div className="flex items-center gap-3">
          <Constellation zone={zone.id} state="idle" size={48} />
          <div>
            <h1 className={cn("text-xl font-bold", zone.color)}>{zone.name}</h1>
            <p className="text-sm text-muted-foreground">{zone.tagline}</p>
          </div>
        </div>

        {/* Energy state */}
        <div className="mt-4 flex items-center gap-2">
          <span className={cn("h-2.5 w-2.5 rounded-full", levelDot)} />
          <span className={cn("text-sm font-medium", levelColor)}>
            {level.charAt(0).toUpperCase() + level.slice(1)}
          </span>
          <span className="text-muted-foreground text-sm">— {energyDesc}</span>
        </div>
      </div>

      {/* Current wiring */}
      <div className="mx-4 mt-3 rounded-xl border border-border/40 bg-muted/30 p-4">
        <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-1">Wiring</p>
        <p className="text-sm text-foreground/80">{currentDesc}</p>
      </div>

      {/* Tools */}
      <div className="mx-4 mt-5">
        <p className="text-xs text-muted-foreground/70 uppercase tracking-wider mb-3">
          Tools in this Zone
        </p>
        <div className="flex flex-col gap-2">
          {zone.tools.map((tool) => (
            <button
              type="button"
              key={tool.path}
              onClick={() => setLocation(tool.path)}
              className={cn(
                "flex items-center justify-between rounded-xl border border-border/40",
                "bg-card/60 px-4 py-3 text-left",
                "hover:bg-card transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              )}
            >
              <span className="text-sm font-medium">{tool.label}</span>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </div>

      {/* Talk to DW about this Zone */}
      <div className="mx-4 mt-6">
        <Card className={cn("border", zone.border)}>
          <CardContent className="pt-4 pb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Ask DW about your {zone.name} Zone
            </p>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() =>
                setLocation(
                  `/talk?prefill=${encodeURIComponent(`Tell me about my ${zone.name} Zone`)}`
                )
              }
            >
              <Constellation zone={zone.id} state="idle" size={16} className="mr-2" />
              Talk to DW about {zone.name}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
