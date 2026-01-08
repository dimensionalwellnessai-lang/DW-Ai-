import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface PlacementInterpretation {
  planet: string;
  technicalPlacement: string;
  experientialOverlay: string | null;
  explanation: string;
  whyDifferent: string | null;
}

interface PlanetPlacement {
  planet: string;
  sign: string;
  degree: number;
  minutes?: number;
}

const ZODIAC_SYMBOLS: Record<string, string> = {
  "Aries": "\u2648",
  "Taurus": "\u2649",
  "Gemini": "\u264a",
  "Cancer": "\u264b",
  "Leo": "\u264c",
  "Virgo": "\u264d",
  "Libra": "\u264e",
  "Scorpio": "\u264f",
  "Sagittarius": "\u2650",
  "Capricorn": "\u2651",
  "Aquarius": "\u2652",
  "Pisces": "\u2653"
};

const PLANET_SYMBOLS: Record<string, string> = {
  "Sun": "\u2609",
  "Moon": "\u263d",
  "Ascendant": "Asc",
  "MC": "MC",
  "IC": "IC",
  "Vertex": "Vx",
  "Mercury": "\u263f",
  "Venus": "\u2640",
  "Mars": "\u2642",
  "Jupiter": "\u2643",
  "Saturn": "\u2644",
  "Uranus": "\u2645",
  "Neptune": "\u2646",
  "Pluto": "\u2647"
};

interface PlacementInterpretationCardProps {
  placement: PlanetPlacement;
  interpretation?: PlacementInterpretation;
  houseSystem: string;
  zodiacSystem: string;
}

export function PlacementInterpretationCard({
  placement,
  interpretation,
  houseSystem,
  zodiacSystem,
}: PlacementInterpretationCardProps) {
  const minutes = placement.minutes ?? 0;
  const degreeDisplay = `${placement.degree}\u00b0${minutes.toString().padStart(2, "0")}'`;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="py-3 px-4 bg-muted/30">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <span className="text-lg opacity-70">{PLANET_SYMBOLS[placement.planet]}</span>
            {placement.planet}
          </CardTitle>
          <Badge variant="secondary" className="text-xs font-normal">
            {ZODIAC_SYMBOLS[placement.sign]} {placement.sign} {degreeDisplay}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {interpretation?.technicalPlacement && (
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Technical Placement
            </span>
            <p className="text-sm font-medium">
              {interpretation.technicalPlacement}
            </p>
          </div>
        )}
        
        {interpretation?.explanation && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            {interpretation.explanation}
          </p>
        )}
        
        {interpretation?.experientialOverlay && (
          <div className="border-l-2 border-violet-500/50 pl-3 space-y-1">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-violet-500 dark:text-violet-400">
                How this may show up
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[250px]">
                  <p className="text-xs">
                    This app shows both what the sky says and how it can feel to live it.
                    Interpretations never replace technical placements - only contextualize them.
                  </p>
                </TooltipContent>
              </Tooltip>
            </div>
            <p className="text-sm italic text-foreground/80">
              {interpretation.experientialOverlay}
            </p>
            {interpretation.whyDifferent && (
              <p className="text-xs text-muted-foreground mt-2">
                {interpretation.whyDifferent}
              </p>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface PlacementsListProps {
  placements: PlanetPlacement[];
  interpretations?: PlacementInterpretation[];
  houseSystem: string;
  zodiacSystem: string;
}

export function PlacementsList({
  placements,
  interpretations,
  houseSystem,
  zodiacSystem,
}: PlacementsListProps) {
  const interpretationMap = new Map(
    interpretations?.map(i => [i.planet, i]) || []
  );
  
  const bigThree = placements.filter(p => 
    ["Sun", "Moon", "Ascendant"].includes(p.planet)
  );
  
  const innerPlanets = placements.filter(p => 
    ["Mercury", "Venus", "Mars"].includes(p.planet)
  );
  
  const outerPlanets = placements.filter(p => 
    ["Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"].includes(p.planet)
  );
  
  const angles = placements.filter(p => 
    ["MC", "IC", "Vertex"].includes(p.planet)
  );
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>Zodiac: {zodiacSystem === "tropical" ? "Western/Tropical" : "Vedic/Sidereal"}</span>
        <span>Houses: {houseSystem.charAt(0).toUpperCase() + houseSystem.slice(1)}</span>
      </div>
      
      {bigThree.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Big Three
          </h3>
          <div className="space-y-3">
            {bigThree.map(p => (
              <PlacementInterpretationCard
                key={p.planet}
                placement={p}
                interpretation={interpretationMap.get(p.planet)}
                houseSystem={houseSystem}
                zodiacSystem={zodiacSystem}
              />
            ))}
          </div>
        </div>
      )}
      
      {innerPlanets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Personal Planets
          </h3>
          <div className="space-y-3">
            {innerPlanets.map(p => (
              <PlacementInterpretationCard
                key={p.planet}
                placement={p}
                interpretation={interpretationMap.get(p.planet)}
                houseSystem={houseSystem}
                zodiacSystem={zodiacSystem}
              />
            ))}
          </div>
        </div>
      )}
      
      {outerPlanets.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Outer Planets
          </h3>
          <div className="grid gap-2">
            {outerPlanets.map(p => (
              <div 
                key={p.planet}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <span className="opacity-60">{PLANET_SYMBOLS[p.planet]}</span>
                  {p.planet}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {ZODIAC_SYMBOLS[p.sign]} {p.sign} {p.degree}\u00b0
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {angles.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            Angles
          </h3>
          <div className="grid gap-2">
            {angles.map(p => (
              <div 
                key={p.planet}
                className="flex items-center justify-between p-3 bg-muted/30 rounded-lg"
              >
                <span className="text-sm font-medium flex items-center gap-2">
                  <span className="opacity-60">{PLANET_SYMBOLS[p.planet]}</span>
                  {p.planet}
                </span>
                <Badge variant="secondary" className="text-xs">
                  {ZODIAC_SYMBOLS[p.sign]} {p.sign} {p.degree}\u00b0
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}
      
      <p className="text-xs text-muted-foreground text-center pt-4 border-t">
        Technical placements are calculated using {zodiacSystem === "tropical" ? "Western/Tropical" : "Vedic/Sidereal"} astrology
        with {houseSystem.charAt(0).toUpperCase() + houseSystem.slice(1)} house system.
        Interpretations contextualize lived experience without altering the mathematical positions.
      </p>
    </div>
  );
}
