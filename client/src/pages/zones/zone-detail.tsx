/**
 * Zone Interior Page — `/zones/:zoneId`
 *
 * Shows the state, wiring, and embedded tools for a single Zone.
 * All relevant tools for the Zone are surfaced here, keeping
 * the architecture's depth-based model intact.
 */

import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Constellation } from "@/components/constellation";
import { cn } from "@/lib/utils";
import { ZONES } from "./index";
import { ChevronRight, ArrowLeft } from "lucide-react";
import type { ZoneId } from "@/components/constellation";

// ── Energy level types ────────────────────────────────────────────────────────

type EnergyLevel = "dim" | "low" | "steady" | "bright";

const ENERGY_DESCRIPTIONS: Record<EnergyLevel, string> = {
  dim:    "This Zone needs attention. A little intention goes a long way here.",
  low:    "Some light getting through. Worth tending without forcing.",
  steady: "Holding well. Consistent small actions keep it here.",
  bright: "Lit up. This Zone is feeding the others right now.",
};

// ── Current descriptions ──────────────────────────────────────────────────────

const CURRENT_DESCRIPTIONS: Record<string, string> = {
  Gut:   "Gut Current (Sacral) — responds in the moment. Trust the immediate yes or no.",
  Wave:  "Wave Current (Emotional) — needs time to settle. Sleep on big decisions.",
  Spark: "Spark Current (Splenic) — intuitive hits in real time. Quick instincts are reliable.",
  Will:  "Will Current (Heart/Ego) — willpower in bursts. Rest between commitments.",
  Voice: "Voice Current (Throat) — made to express. Speaking it makes it real.",
  Mind:  "Mind Current (Ajna) — processes conceptually. Not designed to trust itself alone.",
  Flow:  "Flow Current (G/Identity) — oriented by direction, not destination. Let it emerge.",
  Drive: "Drive Current (Root) — pressure and adrenaline. Works best under healthy deadlines.",
  Light: "Light Current (Head/Crown) — inspired by ideas. Not obligated to act on every one.",
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

  const { data: zoneState } = useQuery<{ level: EnergyLevel; trend?: string }>({
    queryKey: [`/api/zones/states/${zoneId}`],
    staleTime: 60_000,
    enabled: !!zoneId,
  });

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

  const level: EnergyLevel = zoneState?.level ?? "steady";
  const energyDesc = ENERGY_DESCRIPTIONS[level];
  const currentDesc = CURRENT_DESCRIPTIONS[zone.current] ?? zone.current;

  const levelColor = {
    dim:    "text-zinc-400",
    low:    "text-amber-400",
    steady: "text-sky-400",
    bright: "text-emerald-400",
  }[level];

  const levelDot = {
    dim:    "bg-zinc-500",
    low:    "bg-amber-500",
    steady: "bg-sky-500",
    bright: "bg-emerald-500",
  }[level];

  return (
    <div className="min-h-screen bg-background pb-28">
      {/* Back nav */}
      <div className="px-4 pt-4">
        <button
          onClick={() => setLocation("/zones")}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
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
                  `/talk?context=zone-${zone.id}&prompt=Tell+me+about+my+${encodeURIComponent(zone.name)}+Zone`
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
