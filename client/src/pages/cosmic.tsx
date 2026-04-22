import { useState, useEffect, useRef, useCallback } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useSearch } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Moon,
  Sun,
  Star,
  Calendar,
  Sparkles,
  Settings2,
  Lightbulb,
  Hash,
  ChevronDown,
  ChevronUp,
  Info,
  ArrowRight,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { useCosmicConsent, loadConsent, saveConsent } from "@/hooks/use-cosmic-consent";
import { useAuth } from "@/hooks/use-auth";
import {
  calcLifePath,
  calcExpression,
  calcSoulUrge,
  calcPersonalYear,
  calcPersonalMonth,
  calcPersonalDay,
  LIFE_PATH_MEANINGS,
  EXPRESSION_MEANINGS,
  SOUL_URGE_MEANINGS,
  PERSONAL_YEAR_MEANINGS,
  PERSONAL_MONTH_MEANINGS,
  PERSONAL_DAY_MEANINGS,
} from "@/lib/numerology";
import { TTSButton } from "@/components/tts-button";
import { apiRequest } from "@/lib/queryClient";

// ─── Storage keys ──────────────────────────────────────────────────────────────
// Reuse the same key as /cosmic-insights so both pages share one birth chart record
const BIRTH_CHART_KEY = "dw_birth_chart";
const NUMEROLOGY_KEY = "dw_cosmic_numerology";

// ─── Types ─────────────────────────────────────────────────────────────────────
type HouseSystem = "whole-sign" | "placidus";
type ZodiacSystem = "tropical" | "sidereal";

interface BirthData {
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  houseSystem: HouseSystem;
  zodiacSystem: ZodiacSystem;
}

interface NumerologyData {
  fullName: string;
  birthDate: string;
}

interface CosmicConsent {
  useAstrologyInGuidance: boolean;
  useNumerologyInGuidance: boolean;
}

interface PlanetPlacement {
  planet: string;
  symbol: string;
  sign: string;
  signSymbol: string;
  degree: number;
  meaning: string;
}

// ─── Zodiac data ───────────────────────────────────────────────────────────────
const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
];

const ZODIAC_SYMBOLS: Record<string, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "Asc", Midheaven: "MC",
};

const SIGN_MEANINGS: Record<string, string> = {
  Aries: "Bold, pioneering, driven by instinct and action.",
  Taurus: "Steady, sensual, values security and comfort.",
  Gemini: "Curious, communicative, adaptable and witty.",
  Cancer: "Nurturing, intuitive, deeply connected to home.",
  Leo: "Creative, generous, expressive and warm-hearted.",
  Virgo: "Analytical, detail-oriented, devoted to service.",
  Libra: "Balanced, diplomatic, drawn to beauty and harmony.",
  Scorpio: "Intense, transformative, deeply perceptive.",
  Sagittarius: "Adventurous, philosophical, freedom-seeking.",
  Capricorn: "Disciplined, ambitious, grounded and patient.",
  Aquarius: "Independent, innovative, visionary and humanitarian.",
  Pisces: "Empathic, imaginative, spiritually attuned.",
};

const PLANET_MEANINGS: Record<string, string> = {
  Sun: "Core identity and life purpose.",
  Moon: "Emotional nature, instincts, and inner life.",
  Mercury: "Communication style, thinking, and perception.",
  Venus: "Love, aesthetics, values, and attraction.",
  Mars: "Drive, desire, courage, and action.",
  Jupiter: "Growth, wisdom, abundance, and luck.",
  Saturn: "Discipline, boundaries, lessons, and time.",
  Uranus: "Awakening, change, and originality.",
  Neptune: "Dreams, spirituality, and dissolution.",
  Pluto: "Transformation, power, and deep renewal.",
  Ascendant: "How you appear to the world; your outer mask.",
  Midheaven: "Career path and public reputation.",
};

// ─── Computation helpers ───────────────────────────────────────────────────────
const AYANAMSA = 24; // approximate sidereal offset in degrees

function getSign(degree: number, system: ZodiacSystem): string {
  let d = ((degree % 360) + 360) % 360;
  if (system === "sidereal") d = ((d - AYANAMSA) + 360) % 360;
  return ZODIAC_SIGNS[Math.floor(d / 30) % 12];
}

function calculatePlacements(
  birthDate: string,
  birthTime: string,
  zodiacSystem: ZodiacSystem,
): PlanetPlacement[] {
  const date = new Date(birthDate + "T" + (birthTime || "12:00"));
  const y = date.getFullYear();
  const dayOfYear = Math.floor(
    (date.getTime() - new Date(y, 0, 0).getTime()) / 86400000,
  );
  const hour = date.getHours() + date.getMinutes() / 60;

  const sunDeg = ((dayOfYear / 365.25) * 360 + 280) % 360;
  const moonDeg = ((dayOfYear / 27.32) * 360 + hour * 0.5) % 360;
  const ascDeg = (hour * 15 + (dayOfYear / 365.25) * 360) % 360;
  const mcDeg = (ascDeg + 270) % 360;
  const mercuryDeg = (sunDeg + 15 + (dayOfYear % 88) * 4) % 360;
  const venusDeg = ((sunDeg - 20 + (dayOfYear % 225) * 1.6) + 360) % 360;
  const marsDeg = ((dayOfYear / 687) * 360 + 45) % 360;
  const jupiterDeg = ((dayOfYear / 4333) * 360 + 120) % 360;
  const saturnDeg = ((dayOfYear / 10759) * 360 + 200) % 360;
  const uranusDeg = ((dayOfYear / 30687) * 360 + 50) % 360;
  const neptuneDeg = ((dayOfYear / 60182) * 360 + 355) % 360;
  const plutoDeg = ((dayOfYear / 90560) * 360 + 300) % 360;

  const makeEntry = (name: string, deg: number): PlanetPlacement => {
    const sign = getSign(deg, zodiacSystem);
    return {
      planet: name,
      symbol: PLANET_SYMBOLS[name] ?? name,
      sign,
      signSymbol: ZODIAC_SYMBOLS[sign] ?? sign,
      degree: Math.round(deg % 30),
      meaning: `${PLANET_MEANINGS[name] ?? ""} In ${sign}: ${SIGN_MEANINGS[sign] ?? ""}`,
    };
  };

  return [
    makeEntry("Sun", sunDeg),
    makeEntry("Moon", moonDeg),
    makeEntry("Ascendant", ascDeg),
    makeEntry("Midheaven", mcDeg),
    makeEntry("Mercury", mercuryDeg),
    makeEntry("Venus", venusDeg),
    makeEntry("Mars", marsDeg),
    makeEntry("Jupiter", jupiterDeg),
    makeEntry("Saturn", saturnDeg),
    makeEntry("Uranus", uranusDeg),
    makeEntry("Neptune", neptuneDeg),
    makeEntry("Pluto", plutoDeg),
  ];
}

// ─── Moon phase helper ─────────────────────────────────────────────────────────
const MOON_PHASES = [
  "New Moon", "Waxing Crescent", "First Quarter", "Waxing Gibbous",
  "Full Moon", "Waning Gibbous", "Last Quarter", "Waning Crescent",
] as const;

const MOON_PHASE_EMOJI: Record<string, string> = {
  "New Moon": "🌑",
  "Waxing Crescent": "🌒",
  "First Quarter": "🌓",
  "Waxing Gibbous": "🌔",
  "Full Moon": "🌕",
  "Waning Gibbous": "🌖",
  "Last Quarter": "🌗",
  "Waning Crescent": "🌘",
};

const MOON_PHASE_GUIDANCE: Record<string, string> = {
  "New Moon": "Set intentions. Begin fresh. What do you want to call in this cycle?",
  "Waxing Crescent": "Take small steps toward your intentions. Build momentum with care.",
  "First Quarter": "Push through resistance. Make decisions and take decisive action.",
  "Waxing Gibbous": "Refine and adjust. Trust the process and stay committed.",
  "Full Moon": "Celebrate and release. Acknowledge what has grown, let go of what hasn't.",
  "Waning Gibbous": "Share your wisdom. Practice gratitude and reflect on lessons.",
  "Last Quarter": "Forgive and release. Clear space for something new.",
  "Waning Crescent": "Rest and restore. Prepare quietly for the next cycle.",
};

function getCurrentMoonPhase(): string {
  const knownNewMoon = new Date("2024-01-11").getTime();
  const daysSince = (Date.now() - knownNewMoon) / 86400000;
  const idx = Math.floor((daysSince % 29.53) / (29.53 / 8)) % 8;
  return MOON_PHASES[idx];
}

// ─── Planetary event data ──────────────────────────────────────────────────────
interface PlanetaryEvent {
  date: Date;
  label: string;
  type: "moon" | "retrograde" | "transit" | "season";
  description: string;
  prompt: string;
}

function getUpcomingEvents(days = 30): PlanetaryEvent[] {
  const now = new Date();
  const events: PlanetaryEvent[] = [];

  // Generate moon phase events for the next `days` days
  for (let i = 0; i < days; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() + i);
    const knownNewMoon = new Date("2024-01-11").getTime();
    const daysSince = (d.getTime() - knownNewMoon) / 86400000;
    const phaseProgress = daysSince % 29.53;

    // Key moon phase days (approx)
    const isNewMoon = phaseProgress < 1 || phaseProgress > 28.53;
    const isFullMoon = phaseProgress >= 13.76 && phaseProgress < 15.76;
    const isFirstQuarter = phaseProgress >= 6.38 && phaseProgress < 8.38;
    const isLastQuarter = phaseProgress >= 20.14 && phaseProgress < 22.14;

    if (isNewMoon) {
      events.push({ date: d, label: "New Moon", type: "moon", description: "Moon is dark — ideal for rest and intention-setting.", prompt: "What new chapter do you want to open?" });
    } else if (isFullMoon) {
      events.push({ date: d, label: "Full Moon", type: "moon", description: "Moon at peak illumination — release what no longer serves.", prompt: "What are you ready to let go of?" });
    } else if (isFirstQuarter) {
      events.push({ date: d, label: "First Quarter Moon", type: "moon", description: "Half-moon rising — time for decisions and action.", prompt: "What decision have you been holding back?" });
    } else if (isLastQuarter) {
      events.push({ date: d, label: "Last Quarter Moon", type: "moon", description: "Half-moon waning — reflect and release.", prompt: "What habits no longer align with your intentions?" });
    }
  }

  // Add a few static seasonal / retrograde markers
  const year = now.getFullYear();
  const statics: PlanetaryEvent[] = [
    { date: new Date(`${year}-03-20`), label: "Spring Equinox", type: "season", description: "Equal day and night. Seeds of the year come alive.", prompt: "What are you planting in this new season?" },
    { date: new Date(`${year}-06-21`), label: "Summer Solstice", type: "season", description: "Longest day of the year. Peak energy and vitality.", prompt: "Where in your life are you at full bloom?" },
    { date: new Date(`${year}-09-22`), label: "Autumn Equinox", type: "season", description: "Harvest and letting go begin.", prompt: "What are you harvesting? What will you release?" },
    { date: new Date(`${year}-12-21`), label: "Winter Solstice", type: "season", description: "The longest night. Rest, reflection, and renewal.", prompt: "What wants to be born from the stillness?" },
    { date: new Date(`${year}-04-01`), label: "Mercury Retrograde", type: "retrograde", description: "Communication and technology may feel scattered. Slow down, review, revise.", prompt: "What needs re-examination in your life right now?" },
    { date: new Date(`${year}-08-05`), label: "Mercury Direct", type: "retrograde", description: "Mercury stations direct. Move forward with renewed clarity.", prompt: "What insight emerged during the retrograde?" },
  ];

  const cutoff = new Date(now);
  cutoff.setDate(cutoff.getDate() + days);

  statics.forEach(e => {
    if (e.date >= now && e.date <= cutoff) events.push(e);
  });

  return events.sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 20);
}

// ─── Local storage helpers ─────────────────────────────────────────────────────
function loadBirthData(): BirthData | null {
  try { return JSON.parse(localStorage.getItem(BIRTH_CHART_KEY) ?? "null"); } catch { return null; }
}

// ─── Date helper (avoids UTC-shift when parsing date-only strings) ─────────────
function parseLocalDate(dateStr: string): Date | null {
  const parts = dateStr.split("-");
  if (parts.length !== 3) return null;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  const day = Number(parts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  return new Date(year, month - 1, day);
}
function saveBirthData(data: BirthData) {
  try {
    localStorage.setItem(BIRTH_CHART_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable (quota exceeded, private mode)
  }
}
function loadNumerologyData(): NumerologyData | null {
  try { return JSON.parse(localStorage.getItem(NUMEROLOGY_KEY) ?? "null"); } catch { return null; }
}
function saveNumerologyData(data: NumerologyData) {
  try {
    localStorage.setItem(NUMEROLOGY_KEY, JSON.stringify(data));
  } catch {
    // Storage may be unavailable
  }
}

/** Format an ISO date string (YYYY-MM-DD) as a human-readable short date */
function formatEventDate(isoDate: string): string {
  return new Date(isoDate + "T12:00:00").toLocaleDateString("en-US", {
    weekday: "short", month: "short", day: "numeric",
  });
}

// ─── Sub-components ────────────────────────────────────────────────────────────

// Types matching the /api/cosmic/* response shapes
export interface CosmicCalendarEvent {
  date: string;
  type: string;
  label: string;
  description: string;
  planet?: string;
  sign?: string;
  prompt: string;
}

interface CosmicTodaySnapshot {
  date: string;
  moonPhase: string;
  moonPhaseEmoji: string;
  moonSign: string;
  sunSign: string;
  energyWord: string;
  events: CosmicCalendarEvent[];
}

function eventBadgeVariant(type: string): "secondary" | "destructive" | "outline" {
  if (type === "new_moon" || type === "full_moon" || type === "first_quarter" || type === "last_quarter") return "secondary";
  if (type === "retrograde_start") return "destructive";
  return "outline";
}

function eventBadgeLabel(type: string): string {
  const MAP: Record<string, string> = {
    new_moon: "moon", full_moon: "moon", first_quarter: "moon", last_quarter: "moon",
    retrograde_start: "retrograde", retrograde_end: "direct",
    ingress: "ingress", major_aspect: "aspect", season: "season",
  };
  return MAP[type] ?? type;
}

export function CalendarTab() {
  const [view, setView] = useState<"day" | "week" | "month">("week");

  // Use local date parts to avoid UTC day-shift (same pattern as parseLocalDate)
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  const todayStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  // Last day of next month (local)
  const monthEndDate = new Date(now.getFullYear(), now.getMonth() + 2, 0);
  const monthEnd = `${monthEndDate.getFullYear()}-${pad(monthEndDate.getMonth() + 1)}-${pad(monthEndDate.getDate())}`;

  const { data: todayData, isLoading: todayLoading } = useQuery<CosmicTodaySnapshot>({
    queryKey: ["/api/cosmic/today"],
    staleTime: 30 * 60 * 1000,
  });

  const { data: calData, isLoading: calLoading, isError: calError, refetch } = useQuery<{ events: CosmicCalendarEvent[] }>({
    queryKey: ["/api/cosmic/calendar", todayStr, monthEnd],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cosmic/calendar?start=${todayStr}&end=${monthEnd}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

  const allEvents = calData?.events ?? [];

  const filtered = (() => {
    if (view === "day") {
      const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
      const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
      return allEvents.filter(e => e.date <= tomorrowStr);
    }
    if (view === "week") {
      const weekEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
      const weekEndStr = `${weekEnd.getFullYear()}-${pad(weekEnd.getMonth() + 1)}-${pad(weekEnd.getDate())}`;
      return allEvents.filter(e => e.date <= weekEndStr);
    }
    return allEvents;
  })();

  const isLoading = todayLoading || calLoading;

  return (
    <div className="space-y-4">
      {/* Today snapshot card */}
      {todayLoading ? (
        <Skeleton className="h-20 w-full rounded-xl" />
      ) : todayData ? (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">{todayData.moonPhaseEmoji}</span>
            <div className="flex-1">
              <p className="font-semibold text-sm">{todayData.moonPhase} in {todayData.moonSign}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{MOON_PHASE_GUIDANCE[todayData.moonPhase] ?? ""}</p>
              <p className="text-xs text-primary mt-1">✦ Today's energy: <span className="font-medium">{todayData.energyWord}</span></p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 flex items-start gap-3">
            <span className="text-2xl" aria-hidden="true">{MOON_PHASE_EMOJI[getCurrentMoonPhase()]}</span>
            <div>
              <p className="font-semibold text-sm">{getCurrentMoonPhase()}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{MOON_PHASE_GUIDANCE[getCurrentMoonPhase()]}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* View toggle */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1" role="group" aria-label="Calendar view">
          {(["day", "week", "month"] as const).map(v => (
            <Button
              key={v}
              variant={view === v ? "default" : "outline"}
              size="sm"
              onClick={() => setView(v)}
              className="capitalize"
              aria-pressed={view === v}
            >
              {v}
            </Button>
          ))}
        </div>
        <Button variant="ghost" size="icon" onClick={() => void refetch()} aria-label="Refresh calendar events">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(n => <Skeleton key={n} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : calError ? (
        <div className="text-center py-6 space-y-2">
          <p className="text-sm text-muted-foreground">Could not load celestial events.</p>
          <Button variant="outline" size="sm" onClick={() => void refetch()}>
            <RefreshCw className="h-3 w-3 mr-1" /> Try again
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">No major events in this window.</p>
      ) : (
        <div className="space-y-3" role="list" aria-label="Planetary events">
          {filtered.map((evt) => (
            <Card key={`${evt.date}-${evt.type}-${evt.planet ?? ""}-${evt.label}`} role="listitem">
              <CardContent className="p-4 space-y-1">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-sm">{evt.label}</p>
                  <Badge variant={eventBadgeVariant(evt.type)} className="text-xs capitalize">
                    {eventBadgeLabel(evt.type)}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  {formatEventDate(evt.date)}
                </p>
                <p className="text-xs">{evt.description}</p>
                <p className="text-xs text-primary italic">✦ {evt.prompt}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function InsightsTab({
  birthData,
  numerologyData,
  onViewNumerologyProfile,
}: {
  birthData: BirthData | null;
  numerologyData: NumerologyData | null;
  onViewNumerologyProfile?: () => void;
}) {
  const moonPhase = getCurrentMoonPhase();
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" });

  const sunSign = (() => {
    if (!birthData?.birthDate) return null;
    const localDate = parseLocalDate(birthData.birthDate);
    if (!localDate) return null;
    const dayOfYear = Math.floor(
      (localDate.getTime() - new Date(localDate.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return getSign(((dayOfYear / 365.25) * 360 + 280) % 360, birthData.zodiacSystem);
  })();

  const lifePath = numerologyData?.birthDate ? calcLifePath(numerologyData.birthDate) : null;
  const personalYear = numerologyData?.birthDate ? calcPersonalYear(numerologyData.birthDate) : null;
  const personalMonth = numerologyData?.birthDate ? calcPersonalMonth(numerologyData.birthDate) : null;
  const personalDay = numerologyData?.birthDate ? calcPersonalDay(numerologyData.birthDate) : null;

  const { consent } = useCosmicConsent();
  const astrologyConsent = consent?.useAstrologyInGuidance ?? false;
  const numerologyConsent = consent?.useNumerologyInGuidance ?? false;

  const [aiReading, setAiReading] = useState<string | null>(null);

  const readingMutation = useMutation({
    mutationFn: async () => {
      const contextParts: string[] = [];
      if (astrologyConsent && sunSign) contextParts.push(`Sun sign: ${sunSign}`);
      // Moon phase is publicly observable — not personal birth data, no consent required
      contextParts.push(`Moon phase: ${moonPhase}`);
      if (numerologyConsent && lifePath !== null) contextParts.push(`Life Path number: ${lifePath}`);
      if (numerologyConsent && personalYear !== null) contextParts.push(`Personal Year: ${personalYear}`);
      if (numerologyConsent && personalMonth !== null) contextParts.push(`Personal Month: ${personalMonth}`);
      if (numerologyConsent && personalDay !== null) contextParts.push(`Personal Day: ${personalDay}`);

      const context = contextParts.join(", ");
      const prompt = `You are a gentle cosmic guide speaking in a warm, grounded voice. Using this person's cosmic context (${context}), provide a short, personalized daily reading.

Follow this 4-step structure:
1. GROUND: Start with a grounding phrase
2. NAME: Name the energy or theme present today
3. SHIFT: Offer a gentle perspective or insight
4. NEXT STEP: End with one small, optional action

Rules: Max 80 words total. Use words like "notice", "shift", "steady", "grounded". Never use "you should", "fix", "broken", "optimize", "maximize". Do not create goals, habits, schedule blocks, or log anything.`;

      const response = await apiRequest("POST", "/api/chat/smart", {
        message: prompt,
        conversationHistory: [],
        cosmicConsent: consent,
      });
      const json = (await response.json()) as unknown;
      if (
        !json ||
        typeof json !== "object" ||
        typeof (json as { response?: unknown }).response !== "string"
      ) {
        throw new Error("Invalid AI response format");
      }
      return json as { response: string };
    },
    onSuccess: (data) => {
      setAiReading(data.response);
    },
  });

  // Auto-fetch reading when user data is available (run once when ready)
  const hasInitiated = useRef(false);
  const { mutate: triggerReading } = readingMutation;
  useEffect(() => {
    if (!hasInitiated.current && (sunSign || lifePath !== null)) {
      hasInitiated.current = true;
      triggerReading();
    }
  }, [sunSign, lifePath, triggerReading]);

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{today}</p>

      {/* Daily moon insight */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Moon className="h-4 w-4 text-blue-400" />
              Moon Energy Today
            </CardTitle>
            <TTSButton
              text={`${moonPhase} moon. ${MOON_PHASE_GUIDANCE[moonPhase]}`}
              alwaysShow
              size="sm"
              variant="ghost"
              label="Listen"
            />
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{MOON_PHASE_EMOJI[moonPhase]} {moonPhase}</p>
          <p className="text-xs text-muted-foreground">{MOON_PHASE_GUIDANCE[moonPhase]}</p>
        </CardContent>
      </Card>

      {/* Cosmic insight (if birth data available) */}
      {sunSign ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Star className="h-4 w-4 text-yellow-400" />
                Your Sun Sign Lens
              </CardTitle>
              <TTSButton
                text={`${sunSign} sun sign. ${SIGN_MEANINGS[sunSign]}. Today, notice where your ${sunSign} energy wants to express itself.`}
                alwaysShow
                size="sm"
                variant="ghost"
                label="Listen"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <p className="text-sm font-medium">{ZODIAC_SYMBOLS[sunSign]} {sunSign}</p>
            <p className="text-xs text-muted-foreground">{SIGN_MEANINGS[sunSign]}</p>
            <p className="text-xs text-primary italic">
              ✦ Today, notice where your {sunSign} energy wants to express itself.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Add your birth details in the Cosmic Insights Profile tab for personalised insights.</p>
          </CardContent>
        </Card>
      )}

      {/* Numerology insight */}
      {lifePath !== null && personalYear !== null && personalMonth !== null && personalDay !== null ? (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <Hash className="h-4 w-4 text-purple-400" />
                Numerology Pulse
              </CardTitle>
              <TTSButton
                text={[
                  `Life path ${lifePath}`,
                  LIFE_PATH_MEANINGS[lifePath]?.desc ?? "Your numbers shape your journey",
                  `Personal year ${personalYear}`,
                  PERSONAL_YEAR_MEANINGS[personalYear] ?? "a master number year of heightened energy",
                  `Personal month ${personalMonth}`,
                  PERSONAL_MONTH_MEANINGS[personalMonth] ?? "a master number month of heightened energy",
                  `Personal day ${personalDay}`,
                  PERSONAL_DAY_MEANINGS[personalDay] ?? "a master number day of heightened energy",
                ].filter(Boolean).join('. ')}
                alwaysShow
                size="sm"
                variant="ghost"
                label="Listen"
              />
            </div>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Life Path {lifePath}</span>
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Year {personalYear}</span>
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Month {personalMonth}</span>
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Day {personalDay}</span>
            </div>
            <p className="text-xs text-muted-foreground">{PERSONAL_DAY_MEANINGS[personalDay] ?? ""}</p>
            <p className="text-xs text-muted-foreground">{PERSONAL_MONTH_MEANINGS[personalMonth] ?? ""}</p>
            <p className="text-xs text-primary italic">
              ✦ {LIFE_PATH_MEANINGS[lifePath]?.desc ?? "Your numbers shape your journey."}
            </p>
            {onViewNumerologyProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewNumerologyProfile}
                className="mt-1 h-7 text-xs px-2 gap-1"
              >
                View full numerology profile <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center space-y-2">
            <p className="text-xs text-muted-foreground">Add your birth date (and name if you'd like deeper insights) to see your number-based guidance.</p>
            {onViewNumerologyProfile && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onViewNumerologyProfile}
                className="h-7 text-xs px-2 gap-1"
              >
                Set up Numerology Profile <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Personalized Daily Reading */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Your Daily Reading
            </CardTitle>
            <div className="flex items-center gap-1">
              {aiReading && (
                <TTSButton
                  text={aiReading}
                  alwaysShow
                  size="sm"
                  variant="ghost"
                  label="Listen"
                />
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => readingMutation.mutate()}
                disabled={readingMutation.isPending}
                aria-label="Refresh daily reading"
              >
                <RefreshCw className={`h-3 w-3 ${readingMutation.isPending ? "animate-spin" : ""}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {readingMutation.isPending ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-4/6" />
            </div>
          ) : aiReading ? (
            <p className="text-sm leading-relaxed">{aiReading}</p>
          ) : readingMutation.isError ? (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{MOON_PHASE_GUIDANCE[moonPhase]}</p>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 gap-1"
                onClick={() => readingMutation.mutate()}
              >
                Try personalized reading <RefreshCw className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{MOON_PHASE_GUIDANCE[moonPhase]}</p>
              {(sunSign || lifePath !== null) && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={() => readingMutation.mutate()}
                >
                  Get personalized reading <Sparkles className="h-3 w-3" />
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function AstrologyProfileTab() {
  const queryClient = useQueryClient();
  const [birthData, setBirthData] = useState<BirthData | null>(loadBirthData);
  const [editing, setEditing] = useState(!birthData);

  // Form state
  const [birthDate, setBirthDate] = useState(birthData?.birthDate ?? "");
  const [birthTime, setBirthTime] = useState(birthData?.birthTime ?? "");
  const [birthPlace, setBirthPlace] = useState(birthData?.birthPlace ?? "");
  const [houseSystem, setHouseSystem] = useState<HouseSystem>(birthData?.houseSystem ?? "whole-sign");
  const [zodiacSystem, setZodiacSystem] = useState<ZodiacSystem>(birthData?.zodiacSystem ?? "tropical");
  const [expandedPlanet, setExpandedPlanet] = useState<string | null>(null);

  // Persist house system to server for authenticated users
  const houseSystemMutation = useMutation({
    mutationFn: async (hs: HouseSystem) => {
      const res = await apiRequest("PATCH", "/api/cosmic/house-system", { houseSystem: hs });
      if (!res.ok) throw new Error("Failed to update house system");
      return res.json() as Promise<{ houseSystem: string }>;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["/api/cosmic/chart"] });
    },
  });

  const handleHouseSystemToggle = (hs: HouseSystem) => {
    setHouseSystem(hs);
    // Also persist to server if birth data is already saved
    if (birthData) {
      const updated = { ...birthData, houseSystem: hs };
      saveBirthData(updated);
      setBirthData(updated);
      houseSystemMutation.mutate(hs);
    }
  };

  const handleSave = () => {
    if (!birthDate) return;
    const data: BirthData = { birthDate, birthTime, birthPlace, houseSystem, zodiacSystem };
    saveBirthData(data);
    setBirthData(data);
    setEditing(false);
  };

  const placements = birthData
    ? calculatePlacements(birthData.birthDate, birthData.birthTime, birthData.zodiacSystem)
    : null;

  const sunSign = placements?.find(p => p.planet === "Sun")?.sign ?? null;
  const moonSign = placements?.find(p => p.planet === "Moon")?.sign ?? null;
  const ascSign = placements?.find(p => p.planet === "Ascendant")?.sign ?? null;

  if (editing || !birthData) {
    return (
      <div className="space-y-5">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              {birthData ? "Edit Birth Details" : "Enter Your Birth Details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cosmic-birth-date">Birth Date <span className="text-destructive">*</span></Label>
              <Input
                id="cosmic-birth-date"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cosmic-birth-time">Birth Time <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="cosmic-birth-time"
                type="time"
                value={birthTime}
                onChange={e => setBirthTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cosmic-birth-place">Birth Place <span className="text-muted-foreground text-xs">(optional)</span></Label>
              <Input
                id="cosmic-birth-place"
                type="text"
                placeholder="e.g. New York, USA"
                value={birthPlace}
                onChange={e => setBirthPlace(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Zodiac System</Label>
              <div className="flex gap-2" role="group" aria-label="Zodiac system">
                <Button
                  variant={zodiacSystem === "tropical" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setZodiacSystem("tropical")}
                  aria-pressed={zodiacSystem === "tropical"}
                >
                  Western / Tropical
                </Button>
                <Button
                  variant={zodiacSystem === "sidereal" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setZodiacSystem("sidereal")}
                  aria-pressed={zodiacSystem === "sidereal"}
                >
                  Vedic / Sidereal
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>House System</Label>
              <div className="flex gap-2" role="group" aria-label="House system">
                <Button
                  variant={houseSystem === "whole-sign" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHouseSystem("whole-sign")}
                  aria-pressed={houseSystem === "whole-sign"}
                >
                  Whole Sign
                </Button>
                <Button
                  variant={houseSystem === "placidus" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setHouseSystem("placidus")}
                  aria-pressed={houseSystem === "placidus"}
                >
                  Placidus
                </Button>
              </div>
              <p className="text-xs text-muted-foreground flex items-start gap-1">
                <Info className="h-3 w-3 mt-0.5 shrink-0" />
                Whole Sign is traditional and easy to understand. Placidus is the modern Western default.
              </p>
            </div>

            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!birthDate} data-testid="button-save-birth-chart">
                Save Chart
              </Button>
              {birthData && (
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Big three */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Star className="w-4 h-4" />
              Your Natal Chart
            </CardTitle>
            <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-birth-chart">
              <Settings2 className="w-4 h-4 mr-1" />
              Edit
            </Button>
          </div>
          <div className="flex flex-wrap gap-2 pt-1">
            <Badge variant="secondary" className="gap-1">
              <Sun className="h-3 w-3" />{sunSign ? `${ZODIAC_SYMBOLS[sunSign]} ${sunSign}` : "–"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Moon className="h-3 w-3" />{moonSign ? `${ZODIAC_SYMBOLS[moonSign]} ${moonSign}` : "–"}
            </Badge>
            <Badge variant="secondary" className="gap-1">
              <Star className="h-3 w-3" />{ascSign ? `${ZODIAC_SYMBOLS[ascSign]} ${ascSign} Rising` : "Rising: unknown"}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground pt-1">
            {birthData.zodiacSystem === "tropical" ? "Western/Tropical" : "Vedic/Sidereal"} ·{" "}
            <span className="inline-flex items-center gap-1">
              {birthData.houseSystem === "whole-sign" ? "Whole Sign" : "Placidus"} houses
              <button
                type="button"
                onClick={() => handleHouseSystemToggle(birthData.houseSystem === "whole-sign" ? "placidus" : "whole-sign")}
                className="ml-1 text-primary underline underline-offset-2 text-xs hover:no-underline focus:outline-none focus-visible:ring-1 focus-visible:ring-ring rounded"
                aria-label="Toggle house system"
              >
                Switch to {birthData.houseSystem === "whole-sign" ? "Placidus" : "Whole Sign"}
              </button>
            </span>
            {birthData.birthTime ? "" : " · Birth time not set (some placements are approximate)"}
          </p>
        </CardHeader>
      </Card>

      {/* Chart wheel (SVG-based minimal) */}
      <NatalChartWheel placements={placements ?? []} />

      {/* Placement list */}
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Placements</h3>
        {placements?.map(p => {
          const isExpanded = expandedPlanet === p.planet;
          const panelId = `placement-${p.planet}-details`;

          const handleToggle = () => {
            setExpandedPlanet(isExpanded ? null : p.planet);
          };

          return (
            <Card
              key={p.planet}
              className="cursor-pointer"
              onClick={handleToggle}
              role="button"
              tabIndex={0}
              aria-expanded={isExpanded}
              aria-controls={panelId}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleToggle();
                }
              }}
            >
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base" aria-hidden="true">{p.symbol}</span>
                    <span className="text-sm font-medium">{p.planet}</span>
                    <span className="text-sm text-muted-foreground">{p.signSymbol} {p.sign} {p.degree}°</span>
                  </div>
                  {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </div>
                {isExpanded && (
                  <p
                    id={panelId}
                    className="text-xs text-muted-foreground mt-2"
                  >
                    {p.meaning}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

// ─── Minimal natal chart wheel ─────────────────────────────────────────────────
function NatalChartWheel({ placements }: { placements: PlanetPlacement[] }) {
  const cx = 110, cy = 110, r = 90;
  const innerR = 55;

  const signSlices = ZODIAC_SIGNS.map((sign, i) => {
    const startAngle = (i * 30 - 90) * (Math.PI / 180);
    const endAngle = ((i + 1) * 30 - 90) * (Math.PI / 180);
    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);
    const xi1 = cx + innerR * Math.cos(startAngle);
    const yi1 = cy + innerR * Math.sin(startAngle);

    const labelAngle = ((i * 30 + 15) - 90) * (Math.PI / 180);
    const lx = cx + (innerR + (r - innerR) / 2) * Math.cos(labelAngle);
    const ly = cy + (innerR + (r - innerR) / 2) * Math.sin(labelAngle);

    return { sign, x1, y1, x2, y2, xi1, yi1, lx, ly, startAngle, endAngle };
  });

  const planetDots = placements
    .filter(p => !["Midheaven"].includes(p.planet))
    .map(p => {
      const signIdx = ZODIAC_SIGNS.indexOf(p.sign);
      if (signIdx < 0) return null;
      const angleDeg = signIdx * 30 + p.degree - 90;
      const angle = angleDeg * (Math.PI / 180);
      const dotR = innerR - 10;
      return {
        planet: p.planet,
        symbol: p.symbol,
        x: cx + dotR * Math.cos(angle),
        y: cy + dotR * Math.sin(angle),
      };
    })
    .filter(Boolean) as { planet: string; symbol: string; x: number; y: number }[];

  return (
    <Card>
      <CardContent className="p-4 flex justify-center">
        <svg
          width="220"
          height="220"
          viewBox="0 0 220 220"
          aria-label="Natal chart wheel"
          role="img"
          className="max-w-full"
        >
          {/* Outer ring background */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />
          <circle cx={cx} cy={cy} r={innerR} fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="1" />

          {/* Sign slices */}
          {signSlices.map(({ sign, x1, y1, x2, y2, xi1, yi1, lx, ly }, i) => (
            <g key={sign}>
              <line x1={cx} y1={cy} x2={x1} y2={y1} stroke="currentColor" strokeOpacity="0.1" strokeWidth="0.5" />
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="currentColor"
                fillOpacity="0.6"
                aria-hidden="true"
              >
                {ZODIAC_SYMBOLS[sign]}
              </text>
            </g>
          ))}

          {/* Planet dots */}
          {planetDots.map(({ planet, symbol, x, y }) => (
            <g key={planet}>
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="8"
                fill="hsl(var(--primary))"
                fontWeight="700"
                aria-label={planet}
              >
                {symbol}
              </text>
            </g>
          ))}

          {/* Center dot */}
          <circle cx={cx} cy={cy} r="3" fill="hsl(var(--primary))" fillOpacity="0.4" />
        </svg>
      </CardContent>
    </Card>
  );
}

// ─────────────────────────────────────────────────────────────────────────────

function NumerologyProfileTab({ onViewInsights }: { onViewInsights?: () => void }) {
  const [numData, setNumData] = useState<NumerologyData | null>(loadNumerologyData);
  const [editing, setEditing] = useState(!numData);
  const [fullName, setFullName] = useState(numData?.fullName ?? "");
  const [birthDate, setBirthDate] = useState(numData?.birthDate ?? "");

  const handleSave = () => {
    if (!birthDate) return;
    const data: NumerologyData = { fullName, birthDate };
    saveNumerologyData(data);
    setNumData(data);
    setEditing(false);
  };

  if (editing || !numData) {
    return (
      <div className="space-y-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Hash className="w-4 h-4" />
              {numData ? "Edit Numerology Profile" : "Create Your Numerology Profile"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="num-birth-date">Birth Date <span className="text-destructive">*</span></Label>
              <Input
                id="num-birth-date"
                type="date"
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="num-full-name">Full Birth Name <span className="text-muted-foreground text-xs">(optional — for Expression & Soul Urge)</span></Label>
              <Input
                id="num-full-name"
                type="text"
                placeholder="e.g. Jane Elizabeth Doe"
                value={fullName}
                onChange={e => setFullName(e.target.value)}
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button onClick={handleSave} disabled={!birthDate} data-testid="button-save-numerology">
                Save Profile
              </Button>
              {numData && (
                <Button variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const lifePath = calcLifePath(numData.birthDate);
  const personalYear = calcPersonalYear(numData.birthDate);
  const personalMonth = calcPersonalMonth(numData.birthDate);
  const personalDay = calcPersonalDay(numData.birthDate);
  const cleanedFullName = numData.fullName
    ? numData.fullName.replace(/[^A-Za-z]/g, "").trim()
    : "";
  const hasValidName = cleanedFullName.length > 0;
  const expression = hasValidName ? calcExpression(numData.fullName) : null;
  const soulUrge = hasValidName ? calcSoulUrge(numData.fullName) : null;
  const lpData = LIFE_PATH_MEANINGS[lifePath];
  const exprData = expression !== null ? EXPRESSION_MEANINGS[expression] : null;
  const soulData = soulUrge !== null ? SOUL_URGE_MEANINGS[soulUrge] : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Your Numbers</h3>
        <div className="flex items-center gap-1">
          {onViewInsights && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onViewInsights}
              className="h-7 text-xs px-2 gap-1"
              aria-label="View numerology in Insights tab"
            >
              Insights <ArrowRight className="h-3 w-3" />
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-numerology">
            <Settings2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
        </div>
      </div>

      {/* Life Path */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg shrink-0"
              aria-label={`Life Path number ${lifePath}`}
            >
              {lifePath}
            </div>
            <div>
              <p className="font-semibold text-sm">Life Path · {lpData?.title ?? ""}</p>
              <p className="text-xs text-muted-foreground">{lpData?.desc ?? ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expression */}
      {expression !== null && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-3">
              <span
                className="text-primary font-bold text-lg w-8 shrink-0"
                aria-label={`Expression number ${expression}`}
              >
                {expression}
              </span>
              <div>
                <p className="text-sm font-medium">Expression · {exprData?.title ?? ""}</p>
                <p className="text-xs text-muted-foreground">{exprData?.desc ?? "Your natural talents and abilities as revealed by your full name."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Soul Urge */}
      {soulUrge !== null && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-3">
              <span
                className="text-primary font-bold text-lg w-8 shrink-0"
                aria-label={`Soul Urge number ${soulUrge}`}
              >
                {soulUrge}
              </span>
              <div>
                <p className="text-sm font-medium">Soul Urge · {soulData?.title ?? ""}</p>
                <p className="text-xs text-muted-foreground">{soulData?.desc ?? "Your heart's deepest desires — what motivates you at your core."}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Cycle numbers: Personal Year / Month / Day */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-purple-400" />
            Active Cycles
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-3">
            <span
              className="text-primary font-bold text-lg w-8 shrink-0"
              aria-label={`Personal Year ${personalYear}`}
            >
              {personalYear}
            </span>
            <div>
              <p className="text-sm font-medium">Personal Year {personalYear}</p>
              <p className="text-xs text-muted-foreground">{PERSONAL_YEAR_MEANINGS[personalYear] ?? ""}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className="text-primary font-bold text-lg w-8 shrink-0"
              aria-label={`Personal Month ${personalMonth}`}
            >
              {personalMonth}
            </span>
            <div>
              <p className="text-sm font-medium">Personal Month {personalMonth}</p>
              <p className="text-xs text-muted-foreground">{PERSONAL_MONTH_MEANINGS[personalMonth] ?? ""}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <span
              className="text-primary font-bold text-lg w-8 shrink-0"
              aria-label={`Personal Day ${personalDay}`}
            >
              {personalDay}
            </span>
            <div>
              <p className="text-sm font-medium">Personal Day {personalDay}</p>
              <p className="text-xs text-muted-foreground">{PERSONAL_DAY_MEANINGS[personalDay] ?? ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 9-year cycle wheel */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Hash className="h-4 w-4" />
            9-Year Cycle
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className="grid grid-cols-9 gap-1"
            role="list"
            aria-label="9-year numerology cycle"
          >
            {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(yr => {
              const isCurrent = yr === personalYear;
              return (
                <div
                  key={yr}
                  role="listitem"
                  aria-current={isCurrent ? "true" : undefined}
                  title={PERSONAL_YEAR_MEANINGS[yr] ?? ""}
                  className={[
                    "flex flex-col items-center justify-center rounded p-1.5 text-xs font-semibold transition-colors",
                    isCurrent
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted/50 text-muted-foreground hover:bg-muted",
                  ].join(" ")}
                >
                  {yr}
                </div>
              );
            })}
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            You are in a Personal Year <strong>{personalYear}</strong> cycle. Each year carries its own energy theme — from new beginnings (1) through completion and release (9).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Consent section ───────────────────────────────────────────────────────────
function ConsentSection() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();

  // For authenticated users, fetch consent from the server
  const { data: serverConsent } = useQuery<CosmicConsent>({
    queryKey: ["/api/cosmic/consent"],
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const res = await fetch("/api/cosmic/consent", { credentials: "include" });
      if (!res.ok) return loadConsent();
      return res.json() as Promise<CosmicConsent>;
    },
  });

  // Local state seeded from server (auth) or localStorage (guest)
  const [consent, setConsent] = useState<CosmicConsent>(loadConsent);

  // Sync local state and localStorage when server data loads
  useEffect(() => {
    if (serverConsent) {
      setConsent(serverConsent);
      // Keep localStorage aligned with server as offline/guest fallback
      saveConsent(serverConsent);
    }
  }, [serverConsent]);

  const serverMutation = useMutation({
    mutationFn: async (next: CosmicConsent) => {
      const res = await fetch("/api/cosmic/consent", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(next),
      });
      if (!res.ok) throw new Error("Failed to save consent");
      return res.json() as Promise<CosmicConsent>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/cosmic/consent"] });
    },
  });

  const update = (key: keyof CosmicConsent, val: boolean) => {
    const next = { ...consent, [key]: val };
    setConsent(next);
    // Always keep localStorage in sync as guest/offline fallback
    saveConsent(next);
    if (isAuthenticated) {
      serverMutation.mutate(next);
    }
  };

  return (
    <Card className="mt-4">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <Sparkles className="h-4 w-4" />
          Use in DW Guidance
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Cosmic insights</p>
            <p className="text-xs text-muted-foreground">Include your chart in personalised DW guidance</p>
          </div>
          <Switch
            checked={consent.useAstrologyInGuidance}
            onCheckedChange={v => update("useAstrologyInGuidance", v)}
            aria-label="Use cosmic insights in guidance"
          />
        </div>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Numerology insights</p>
            <p className="text-xs text-muted-foreground">Include your numbers in personalised DW guidance</p>
          </div>
          <Switch
            checked={consent.useNumerologyInGuidance}
            onCheckedChange={v => update("useNumerologyInGuidance", v)}
            aria-label="Use numerology in guidance"
          />
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Deep Readings Tab ─────────────────────────────────────────────────────────

const READING_TIMEFRAMES = [
  {
    id: "today",
    label: "Today",
    emoji: "☀️",
    desc: "What today's energy means for you",
  },
  {
    id: "month",
    label: "This Month",
    emoji: "🌙",
    desc: "The energetic themes shaping your month",
  },
  {
    id: "year",
    label: "This Year",
    emoji: "🌀",
    desc: "Your personal year and what it asks of you",
  },
  {
    id: "moon",
    label: "Moon Phase",
    emoji: "🌕",
    desc: "What the current moon phase means for you specifically",
  },
  {
    id: "lifePhase",
    label: "Life Phase",
    emoji: "🌱",
    desc: "Where you are in your larger life journey",
  },
  {
    id: "lifePattern",
    label: "Life Pattern",
    emoji: "♾️",
    desc: "Your core patterns, gifts, and recurring themes",
  },
] as const;

type ReadingTimeframe = (typeof READING_TIMEFRAMES)[number]["id"];

function buildReadingPrompt(
  timeframe: ReadingTimeframe,
  birthData: BirthData | null,
  numerologyData: NumerologyData | null,
  consent: CosmicConsent,
): string {
  const moonPhase = getCurrentMoonPhase();
  const now = new Date();
  const monthName = now.toLocaleString("en-US", { month: "long" });
  const year = now.getFullYear();

  const sunSign = (() => {
    if (!birthData?.birthDate) return null;
    const localDate = parseLocalDate(birthData.birthDate);
    if (!localDate) return null;
    const dayOfYear = Math.floor(
      (localDate.getTime() - new Date(localDate.getFullYear(), 0, 0).getTime()) / 86400000,
    );
    return getSign(((dayOfYear / 365.25) * 360 + 280) % 360, birthData.zodiacSystem);
  })();

  const lifePath = numerologyData?.birthDate ? calcLifePath(numerologyData.birthDate) : null;
  const personalYear = numerologyData?.birthDate ? calcPersonalYear(numerologyData.birthDate) : null;
  const personalMonth = numerologyData?.birthDate ? calcPersonalMonth(numerologyData.birthDate) : null;
  const personalDay = numerologyData?.birthDate ? calcPersonalDay(numerologyData.birthDate) : null;

  // Build allowed context parts
  const cosmic: string[] = [];
  cosmic.push(`Current moon phase: ${moonPhase}`);
  if (consent.useAstrologyInGuidance && sunSign) cosmic.push(`Sun sign: ${sunSign}`);
  if (consent.useNumerologyInGuidance && lifePath !== null) cosmic.push(`Life Path: ${lifePath}`);
  if (consent.useNumerologyInGuidance && personalYear !== null) cosmic.push(`Personal Year: ${personalYear}`);
  if (consent.useNumerologyInGuidance && personalMonth !== null) cosmic.push(`Personal Month: ${personalMonth}`);
  if (consent.useNumerologyInGuidance && personalDay !== null) cosmic.push(`Personal Day: ${personalDay}`);

  const ctx = cosmic.join(" | ");

  const style = `You are a thoughtful, grounded cosmic guide. Your tone is warm, direct, and poetic without being vague. Max 150 words. No bullet points. Never say "you should" — speak in invitations. Avoid "optimize", "maximize", "fix", "broken". If you know the person's active goals, habits, or life situation from context, weave one or two specific references into the reading to make it feel genuinely personal — not generic cosmic advice.`;

  const frames: Record<ReadingTimeframe, string> = {
    today: `${style} Context: ${ctx}. Give a personal reading for TODAY. Name the energy at play today, one specific invitation for this person grounded in their actual goals or habits if visible, and one thing to notice or let go of. Be personal and specific — this should feel like it was written for them, not for everyone.`,
    month: `${style} Context: ${ctx}. Give a reading for ${monthName} ${year}. Describe the dominant energetic theme this month, what it's asking of this person given where they are in their life right now, and one way to work with it rather than against it. If their goals or current habits are visible, show how this month's energy relates to what they're building.`,
    year: `${style} Context: ${ctx}. Give a reading for Personal Year ${personalYear ?? "(unknown)"}. What is the overarching invitation and challenge of this year? What is this year's purpose for this specific person given what you know about their goals and direction? End with one orienting question.`,
    moon: `${style} Context: ${ctx}. Give a deep reading for the current ${moonPhase} phase and what it specifically means for this person's inner life right now. Connect the lunar energy to something specific in their current reality — a goal they're working toward, a habit they're building, or an area of their life that's in motion. Go deeper than general moon wisdom.`,
    lifePhase: `${style} Context: ${ctx}. Speak to where this person is in their larger life journey. Consider their numerological cycles and sun sign together to describe the chapter they are in — its gifts, its tests, and its underlying invitation. If their goals or habits reveal what they're currently building or healing, name how this life phase supports or challenges that.`,
    lifePattern: `${style} Context: ${ctx}. Describe this person's core energetic patterns — what they carry naturally, what tends to trip them up, and what their recurring life themes are trying to teach them. Ground it in their specific cosmic profile. If you can see patterns in their goals, habits, or life choices that reflect these themes, reflect that back to them.`,
  };

  return frames[timeframe];
}

function ReadingsTab({
  birthData,
  numerologyData,
}: {
  birthData: BirthData | null;
  numerologyData: NumerologyData | null;
}) {
  const [activeFrame, setActiveFrame] = useState<ReadingTimeframe>("today");
  const [readings, setReadings] = useState<Partial<Record<ReadingTimeframe, string>>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [correspondenceText, setCorrespondenceText] = useState<string | null>(null);
  const [correspondenceLoading, setCorrespondenceLoading] = useState(false);

  const { consent } = useCosmicConsent();

  const hasCosmicData = !!(birthData?.birthDate || numerologyData?.birthDate);

  const fetchReading = useCallback(
    async (frame: ReadingTimeframe) => {
      if (readings[frame]) return;
      setLoading(true);
      setError(null);
      try {
        const prompt = buildReadingPrompt(frame, birthData, numerologyData, consent ?? {
          useAstrologyInGuidance: false,
          useNumerologyInGuidance: false,
        });
        const response = await apiRequest("POST", "/api/chat/smart", {
          message: prompt,
          conversationHistory: [],
          cosmicConsent: consent,
        });
        const json = (await response.json()) as { response?: string };
        if (typeof json.response === "string") {
          setReadings((prev) => ({ ...prev, [frame]: json.response }));
        }
      } catch {
        setError("Couldn't load this reading. Tap to try again.");
      } finally {
        setLoading(false);
      }
    },
    [birthData, numerologyData, consent, readings],
  );

  const fetchCorrespondence = useCallback(async () => {
    if (correspondenceText) return;
    setCorrespondenceLoading(true);
    try {
      const moonPhase = getCurrentMoonPhase();
      const personalDay = numerologyData?.birthDate ? calcPersonalDay(numerologyData.birthDate) : null;
      const sunSign = (() => {
        if (!birthData?.birthDate) return null;
        const d = parseLocalDate(birthData.birthDate);
        if (!d) return null;
        const doy = Math.floor((d.getTime() - new Date(d.getFullYear(), 0, 0).getTime()) / 86400000);
        return getSign(((doy / 365.25) * 360 + 280) % 360, birthData.zodiacSystem);
      })();
      const cosmicCtx = [
        `Moon phase: ${moonPhase}`,
        sunSign && consent?.useAstrologyInGuidance ? `Sun sign: ${sunSign}` : null,
        personalDay !== null && consent?.useNumerologyInGuidance ? `Personal Day: ${personalDay}` : null,
      ].filter(Boolean).join(" | ");
      const prompt = `You are a cosmic guide who understands the full picture of a person's life. Cosmic context today: ${cosmicCtx}. Using the person's active goals, habits, and any life situation you know about, write 2–3 short sentences showing how today's cosmic energy corresponds specifically to something happening in THEIR life right now. Name the life areas (body, work, relationships, creativity, money, spirit, mind, heart) that are most activated. Speak directly and personally — not as a generic horoscope, but as someone who sees their specific reality. Max 80 words. No bullet points.`;
      const response = await apiRequest("POST", "/api/chat/smart", {
        message: prompt,
        conversationHistory: [],
        cosmicConsent: consent,
      });
      const json = (await response.json()) as { response?: string };
      if (typeof json.response === "string") {
        setCorrespondenceText(json.response);
      }
    } catch {
      // fail silently — this is supplemental
    } finally {
      setCorrespondenceLoading(false);
    }
  }, [birthData, numerologyData, consent, correspondenceText]);

  useEffect(() => {
    fetchReading(activeFrame);
  }, [activeFrame]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchCorrespondence();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const frame = READING_TIMEFRAMES.find((f) => f.id === activeFrame)!;

  return (
    <div className="space-y-4">
      {/* Cosmic Correspondence — today's energy mapped to this person's reality */}
      <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 overflow-hidden" data-testid="section-cosmic-correspondence">
        <div className="px-4 pt-3 pb-2 flex items-center gap-2 border-b border-violet-500/10">
          <span className="text-base" aria-hidden="true">✦</span>
          <div>
            <p className="text-xs font-semibold text-foreground">Today's Cosmic Correspondence</p>
            <p className="text-[10px] text-muted-foreground">How today's energy maps to your life</p>
          </div>
          {correspondenceText && (
            <button
              className="ml-auto text-[10px] text-muted-foreground/60 hover:text-muted-foreground"
              onClick={() => { setCorrespondenceText(null); fetchCorrespondence(); }}
              data-testid="button-refresh-correspondence"
            >
              ↺
            </button>
          )}
        </div>
        <div className="px-4 py-3">
          {correspondenceLoading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-2.5 bg-muted/60 rounded w-full" />
              <div className="h-2.5 bg-muted/60 rounded w-[85%]" />
              <div className="h-2.5 bg-muted/60 rounded w-[70%]" />
            </div>
          ) : correspondenceText ? (
            <p className="text-xs text-foreground/80 leading-relaxed">{correspondenceText}</p>
          ) : (
            <p className="text-xs text-muted-foreground italic">
              Add birth data or goals to see your personal cosmic correspondence.
            </p>
          )}
        </div>
      </div>

      {/* Timeframe selector */}
      <div className="grid grid-cols-3 gap-2">
        {READING_TIMEFRAMES.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setActiveFrame(f.id);
            }}
            className={`flex flex-col items-center justify-center p-3 rounded-2xl border text-center transition-all gap-1 ${
              activeFrame === f.id
                ? "border-primary bg-primary/10 text-foreground"
                : "border-border/30 bg-muted/30 text-muted-foreground hover:bg-muted/60"
            }`}
            data-testid={`button-reading-${f.id}`}
          >
            <span className="text-lg" aria-hidden="true">{f.emoji}</span>
            <span className="text-[10px] font-semibold leading-tight">{f.label}</span>
          </button>
        ))}
      </div>

      {/* Reading card */}
      <div className="rounded-2xl border border-border/30 bg-muted/20 overflow-hidden">
        <div className="px-4 pt-4 pb-2 border-b border-border/20">
          <div className="flex items-center gap-2">
            <span className="text-xl" aria-hidden="true">{frame.emoji}</span>
            <div>
              <p className="text-sm font-semibold text-foreground">{frame.label}</p>
              <p className="text-xs text-muted-foreground">{frame.desc}</p>
            </div>
          </div>
        </div>

        <div className="p-4">
          {!hasCosmicData && !consent?.useAstrologyInGuidance && !consent?.useNumerologyInGuidance ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-sm text-muted-foreground">
                Add your birth data in the Astrology or Numerology tab to get a personalized reading.
              </p>
              <p className="text-xs text-muted-foreground/60">
                Even without birth data, you'll get a reading based on universal cosmic conditions.
              </p>
            </div>
          ) : loading ? (
            <div className="space-y-2 animate-pulse">
              <div className="h-3 bg-muted rounded w-full" />
              <div className="h-3 bg-muted rounded w-[90%]" />
              <div className="h-3 bg-muted rounded w-[95%]" />
              <div className="h-3 bg-muted rounded w-[75%]" />
            </div>
          ) : error ? (
            <div className="text-center space-y-2 py-2">
              <p className="text-xs text-muted-foreground">{error}</p>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setReadings((prev) => { const next = { ...prev }; delete next[activeFrame]; return next; });
                  fetchReading(activeFrame);
                }}
              >
                Try again
              </Button>
            </div>
          ) : readings[activeFrame] ? (
            <div className="space-y-3">
              <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
                {readings[activeFrame]}
              </p>
              <Button
                size="sm"
                variant="ghost"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setReadings((prev) => { const next = { ...prev }; delete next[activeFrame]; return next; });
                  fetchReading(activeFrame);
                }}
                data-testid={`button-refresh-reading-${activeFrame}`}
              >
                ↺ Refresh reading
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Cosmic Alignment */}
      <CosmicAlignmentSection birthData={birthData} numerologyData={numerologyData} />
    </div>
  );
}

// ─── Cosmic Alignment ──────────────────────────────────────────────────────────

function CosmicAlignmentSection({
  birthData,
  numerologyData,
}: {
  birthData: BirthData | null;
  numerologyData: NumerologyData | null;
}) {
  const [otherName, setOtherName] = useState("");
  const [otherBirthDate, setOtherBirthDate] = useState("");
  const [alignmentReading, setAlignmentReading] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const myLifePath = numerologyData?.birthDate ? calcLifePath(numerologyData.birthDate) : null;
  const myPersonalYear = numerologyData?.birthDate ? calcPersonalYear(numerologyData.birthDate) : null;

  const canRun = otherName.trim().length > 0 && otherBirthDate.length > 0;

  const runAlignment = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setAlignmentReading(null);
    try {
      const otherLifePath = calcLifePath(otherBirthDate);
      const otherPersonalYear = calcPersonalYear(otherBirthDate);
      const myCtx = [
        myLifePath !== null ? `Life Path ${myLifePath}` : null,
        myPersonalYear !== null ? `Personal Year ${myPersonalYear}` : null,
        birthData?.birthDate ? `Sun sign data available` : null,
      ].filter(Boolean).join(", ");

      const prompt = `You are a thoughtful cosmic guide. Compare the energetic alignment between two people for right now. Keep it warm, honest, and direct — max 150 words. No bullet points. Never be vague or generic.

Person A (me): ${myCtx || "Limited data available"}
Person B (${otherName.trim()}): Life Path ${otherLifePath}, Personal Year ${otherPersonalYear}

Describe: 1) Where their energies naturally complement or support each other right now. 2) Where friction or growth edges may appear. 3) One question they could explore together. Keep it encouraging but honest.`;

      const response = await apiRequest("POST", "/api/chat/smart", {
        message: prompt,
        conversationHistory: [],
      });
      const json = (await response.json()) as { response?: string };
      if (typeof json.response === "string") {
        setAlignmentReading(json.response);
      }
    } catch {
      setError("Couldn't generate alignment reading. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-2xl border border-border/30 bg-muted/20 overflow-hidden">
      <div className="px-4 pt-4 pb-2 border-b border-border/20">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">🔗</span>
          <div>
            <p className="text-sm font-semibold text-foreground">Cosmic Alignment</p>
            <p className="text-xs text-muted-foreground">See how your energy aligns with someone else right now</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div className="space-y-2">
          <Input
            placeholder="Their name"
            value={otherName}
            onChange={(e) => setOtherName(e.target.value)}
            className="h-10"
            data-testid="input-alignment-name"
          />
          <Input
            type="date"
            value={otherBirthDate}
            onChange={(e) => setOtherBirthDate(e.target.value)}
            className="h-10"
            data-testid="input-alignment-birthdate"
          />
          <Button
            className="w-full"
            size="sm"
            onClick={runAlignment}
            disabled={!canRun || loading}
            data-testid="button-alignment-run"
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                Reading alignment…
              </span>
            ) : (
              "Check Alignment"
            )}
          </Button>
        </div>

        {error && (
          <p className="text-xs text-muted-foreground text-center">{error}</p>
        )}

        {alignmentReading && (
          <div className="pt-2 space-y-2 border-t border-border/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              {otherName.trim()} × You
            </p>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-line">
              {alignmentReading}
            </p>
          </div>
        )}

        {!alignmentReading && !loading && !error && (
          <p className="text-xs text-muted-foreground text-center">
            Enter their name and birthday — no account needed.
          </p>
        )}
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function CosmicHubPage() {
  usePageMeta("Cosmic Hub", "Explore astrology, numerology, and cosmic cycles all in one place.");
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tabParam = params.get("tab");

  const VALID_TABS = ["calendar", "readings", "astrology", "numerology"] as const;
  type TabId = (typeof VALID_TABS)[number];

  const initialTab: TabId = VALID_TABS.includes(tabParam as TabId) ? (tabParam as TabId) : "readings";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search).get("tab");
    if (p && VALID_TABS.includes(p as TabId)) {
      setActiveTab(p as TabId);
    }
  }, [searchString]);

  const birthData = loadBirthData();
  const numerologyData = loadNumerologyData();

  return (
    <div className="flex flex-col min-h-full bg-background">
      <PageHeader title="Cosmic Hub" />

      <ScrollArea className="flex-1">
        <main className="p-4 max-w-2xl mx-auto pb-10 space-y-4">
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Cosmic tools are optional lenses for self-reflection — not predictions. Use what resonates, leave the rest.
              </p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)}>
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="calendar" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-calendar">
                <Calendar className="h-4 w-4" />
                <span className="text-[10px]">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="readings" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-readings">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px]">Readings</span>
              </TabsTrigger>
              <TabsTrigger value="astrology" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-astrology">
                <Star className="h-4 w-4" />
                <span className="text-[10px]">Astrology</span>
              </TabsTrigger>
              <TabsTrigger value="numerology" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-numerology">
                <Hash className="h-4 w-4" />
                <span className="text-[10px]">Numerology</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="calendar" className="mt-4">
              <CalendarTab />
            </TabsContent>

            <TabsContent value="readings" className="mt-4">
              <ReadingsTab birthData={birthData} numerologyData={numerologyData} />
            </TabsContent>

            <TabsContent value="astrology" className="mt-4 space-y-4">
              <InsightsTab
                birthData={birthData}
                numerologyData={numerologyData}
                onViewNumerologyProfile={() => setActiveTab("numerology")}
              />
              <AstrologyProfileTab />
              <ConsentSection />
            </TabsContent>

            <TabsContent value="numerology" className="mt-4 space-y-4">
              <NumerologyProfileTab onViewInsights={() => setActiveTab("readings")} />
              <ConsentSection />
            </TabsContent>
          </Tabs>
        </main>
      </ScrollArea>
    </div>
  );
}
