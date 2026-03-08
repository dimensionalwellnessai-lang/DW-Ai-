import { useState, useEffect } from "react";
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
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { apiRequest } from "@/lib/queryClient";

// ─── Storage keys ──────────────────────────────────────────────────────────────
// Reuse the same key as /astrology so both pages share one birth chart record
const BIRTH_CHART_KEY = "dw_birth_chart";
const NUMEROLOGY_KEY = "dw_cosmic_numerology";
const CONSENT_KEY = "dw_cosmic_consent";

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

// ─── Numerology helpers ────────────────────────────────────────────────────────
const PYTHAGOREAN: Record<string, number> = {
  A:1,B:2,C:3,D:4,E:5,F:6,G:7,H:8,I:9,
  J:1,K:2,L:3,M:4,N:5,O:6,P:7,Q:8,R:9,
  S:1,T:2,U:3,V:4,W:5,X:6,Y:7,Z:8,
};

const MASTER_NUMBERS = new Set([11, 22, 33]);

function reduceNumber(n: number): number {
  while (n > 9 && !MASTER_NUMBERS.has(n)) {
    n = String(n).split("").reduce((s, d) => s + Number(d), 0);
  }
  return n;
}

function calcLifePath(birthDate: string): number {
  const digits = birthDate.replace(/-/g, "").split("").map(Number);
  return reduceNumber(digits.reduce((s, d) => s + d, 0));
}

function calcExpression(name: string): number {
  const total = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .reduce((s, c) => s + (PYTHAGOREAN[c] ?? 0), 0);
  return reduceNumber(total);
}

function calcSoulUrge(name: string): number {
  const vowels = "AEIOU";
  const total = name
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .split("")
    .filter(c => vowels.includes(c))
    .reduce((s, c) => s + (PYTHAGOREAN[c] ?? 0), 0);
  return reduceNumber(total || 1);
}

function calcPersonalYear(birthDate: string): number {
  const date = new Date(birthDate);
  const currentYear = new Date().getFullYear();
  const month = date.getMonth() + 1;
  const day = date.getDate();
  return reduceNumber(month + day + currentYear);
}

const LIFE_PATH_MEANINGS: Record<number, { title: string; desc: string }> = {
  1: { title: "The Leader", desc: "Independent, pioneering, original. You're here to lead and innovate." },
  2: { title: "The Diplomat", desc: "Cooperative, sensitive, intuitive. You thrive in partnership and bring balance." },
  3: { title: "The Creator", desc: "Expressive, joyful, imaginative. You're here to inspire through creativity." },
  4: { title: "The Builder", desc: "Practical, disciplined, dependable. You create lasting foundations." },
  5: { title: "The Explorer", desc: "Adventurous, versatile, freedom-loving. You're here to experience life fully." },
  6: { title: "The Nurturer", desc: "Responsible, caring, harmonious. You're here to serve and support." },
  7: { title: "The Seeker", desc: "Analytical, spiritual, introspective. You're here to seek deeper truth." },
  8: { title: "The Powerhouse", desc: "Ambitious, authoritative, material. You're here to master the material world." },
  9: { title: "The Humanitarian", desc: "Compassionate, wise, idealistic. You're here to serve humanity." },
  11: { title: "The Intuitive", desc: "Highly sensitive, visionary, illuminating. A master number — you inspire others." },
  22: { title: "The Master Builder", desc: "Practical visionary, capable of creating large-scale change. A master number." },
  33: { title: "The Master Teacher", desc: "Compassionate guide, devoted to uplifting others. A master number." },
};

const PERSONAL_YEAR_MEANINGS: Record<number, string> = {
  1: "New beginnings. Plant seeds for the next 9-year cycle.",
  2: "Cooperation and patience. Nurture what you planted.",
  3: "Expression and joy. Let creativity flow freely.",
  4: "Hard work and foundation-building. Focus and discipline.",
  5: "Change and freedom. Embrace unexpected opportunities.",
  6: "Responsibility and love. Family and community focus.",
  7: "Reflection and inner growth. A time for solitude and study.",
  8: "Harvest and achievement. Material and career gains.",
  9: "Completion and release. Let go to prepare for renewal.",
};

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
function loadConsent(): CosmicConsent {
  try {
    return JSON.parse(localStorage.getItem(CONSENT_KEY) ?? "null") ?? { useAstrologyInGuidance: false, useNumerologyInGuidance: false };
  } catch {
    return { useAstrologyInGuidance: false, useNumerologyInGuidance: false };
  }
}
function saveConsent(c: CosmicConsent) {
  try {
    localStorage.setItem(CONSENT_KEY, JSON.stringify(c));
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
interface CosmicCalendarEvent {
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

function CalendarTab() {
  const [view, setView] = useState<"day" | "week" | "month">("week");

  const now = new Date();
  const todayStr  = now.toISOString().slice(0, 10);
  const monthEnd  = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);

  const { data: todayData, isLoading: todayLoading } = useQuery<CosmicTodaySnapshot>({
    queryKey: ["/api/cosmic/today"],
    staleTime: 30 * 60 * 1000,
  });

  const { data: calData, isLoading: calLoading, refetch } = useQuery<{ events: CosmicCalendarEvent[] }>({
    queryKey: ["/api/cosmic/calendar", todayStr, monthEnd],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/cosmic/calendar?start=${todayStr}&end=${monthEnd}`);
      return res.json();
    },
    staleTime: 60 * 60 * 1000,
  });

  const allEvents = calData?.events ?? [];

  const filtered = (() => {
    if (view === "day") {
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().slice(0, 10);
      return allEvents.filter(e => e.date <= tomorrowStr);
    }
    if (view === "week") {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() + 7);
      const weekEndStr = weekEnd.toISOString().slice(0, 10);
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

function InsightsTab({ birthData, numerologyData }: { birthData: BirthData | null; numerologyData: NumerologyData | null }) {
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

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted-foreground">{today}</p>

      {/* Daily moon insight */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Moon className="h-4 w-4 text-blue-400" />
            Moon Energy Today
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <p className="text-sm font-medium">{MOON_PHASE_EMOJI[moonPhase]} {moonPhase}</p>
          <p className="text-xs text-muted-foreground">{MOON_PHASE_GUIDANCE[moonPhase]}</p>
        </CardContent>
      </Card>

      {/* Astrology insight (if birth data available) */}
      {sunSign ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-400" />
              Your Sun Sign Lens
            </CardTitle>
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
            <p className="text-xs text-muted-foreground">Add your birth details in the Astrology Profile tab for personalised insights.</p>
          </CardContent>
        </Card>
      )}

      {/* Numerology insight */}
      {lifePath !== null && personalYear !== null ? (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Hash className="h-4 w-4 text-purple-400" />
              Numerology Pulse
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex gap-3 flex-wrap">
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Life Path {lifePath}</span>
              <span className="text-xs bg-primary/10 rounded px-2 py-0.5">Personal Year {personalYear}</span>
            </div>
            <p className="text-xs text-muted-foreground">{PERSONAL_YEAR_MEANINGS[personalYear] ?? ""}</p>
            <p className="text-xs text-primary italic">
              ✦ {LIFE_PATH_MEANINGS[lifePath]?.desc ?? "Your numbers shape your journey."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-4 text-center">
            <p className="text-xs text-muted-foreground">Add your name and birth date in the Numerology Profile tab for number-based insights.</p>
          </CardContent>
        </Card>
      )}

      {/* Practical prompt */}
      <Card className="bg-muted/50">
        <CardContent className="p-4 space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Today's Reflection Prompt</p>
          <p className="text-sm">
            {MOON_PHASE_GUIDANCE[moonPhase]}
          </p>
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
              <circle cx={x} cy={y} r="8" fill="hsl(var(--primary))" fillOpacity="0.15" />
              <text
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="7"
                fill="hsl(var(--primary))"
                fontWeight="600"
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

function NumerologyProfileTab() {
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
  const expression = numData.fullName ? calcExpression(numData.fullName) : null;
  const soulUrge = numData.fullName ? calcSoulUrge(numData.fullName) : null;
  const lpData = LIFE_PATH_MEANINGS[lifePath];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Your Numbers</h3>
        <Button variant="ghost" size="sm" onClick={() => setEditing(true)} data-testid="button-edit-numerology">
          <Settings2 className="w-4 h-4 mr-1" />
          Edit
        </Button>
      </div>

      {/* Life Path */}
      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-lg">
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
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-lg w-8">{expression}</span>
              <div>
                <p className="text-sm font-medium">Expression Number</p>
                <p className="text-xs text-muted-foreground">Your natural talents and abilities as revealed by your full name.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Soul Urge */}
      {soulUrge !== null && (
        <Card>
          <CardContent className="p-4 space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-primary font-bold text-lg w-8">{soulUrge}</span>
              <div>
                <p className="text-sm font-medium">Soul Urge</p>
                <p className="text-xs text-muted-foreground">Your heart's deepest desires — what motivates you at your core.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Personal Year */}
      <Card>
        <CardContent className="p-4 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-primary font-bold text-lg w-8">{personalYear}</span>
            <div>
              <p className="text-sm font-medium">Personal Year {personalYear}</p>
              <p className="text-xs text-muted-foreground">{PERSONAL_YEAR_MEANINGS[personalYear] ?? ""}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cycles info */}
      <Card className="bg-muted/40">
        <CardContent className="p-4 space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">About Numerology Cycles</p>
          <p className="text-xs text-muted-foreground">
            Numerology maps your life using 9-year cycles (Personal Years 1–9). Each year has a unique theme — from new beginnings (1) to completion (9). Your Life Path is a constant, while Personal Year changes annually.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Consent section ───────────────────────────────────────────────────────────
function ConsentSection() {
  const [consent, setConsent] = useState<CosmicConsent>(loadConsent);

  const update = (key: keyof CosmicConsent, val: boolean) => {
    const next = { ...consent, [key]: val };
    setConsent(next);
    saveConsent(next);
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
            <p className="text-sm font-medium">Astrology insights</p>
            <p className="text-xs text-muted-foreground">Include your chart in personalised DW guidance</p>
          </div>
          <Switch
            checked={consent.useAstrologyInGuidance}
            onCheckedChange={v => update("useAstrologyInGuidance", v)}
            aria-label="Use astrology in guidance"
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

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function CosmicHubPage() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const tabParam = params.get("tab");

  const VALID_TABS = ["calendar", "insights", "astrology", "numerology"] as const;
  type TabId = (typeof VALID_TABS)[number];

  const initialTab: TabId = VALID_TABS.includes(tabParam as TabId) ? (tabParam as TabId) : "insights";
  const [activeTab, setActiveTab] = useState<TabId>(initialTab);

  // Keep tab in sync if deep-link changes (e.g. command widget navigates to /cosmic?tab=astrology)
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
          {/* Brief intro */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4 flex items-start gap-3">
              <Lightbulb className="h-5 w-5 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                Cosmic tools are offered as optional lenses for self-reflection — not predictions. Use what resonates, leave the rest.
              </p>
            </CardContent>
          </Card>

          <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabId)}>
            <TabsList className="w-full grid grid-cols-4 h-auto p-1">
              <TabsTrigger value="calendar" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-calendar">
                <Calendar className="h-4 w-4" />
                <span className="text-[10px]">Calendar</span>
              </TabsTrigger>
              <TabsTrigger value="insights" className="flex flex-col gap-0.5 py-2" data-testid="tab-cosmic-insights">
                <Sparkles className="h-4 w-4" />
                <span className="text-[10px]">Insights</span>
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

            <TabsContent value="insights" className="mt-4">
              <InsightsTab birthData={birthData} numerologyData={numerologyData} />
            </TabsContent>

            <TabsContent value="astrology" className="mt-4 space-y-4">
              <AstrologyProfileTab />
              <ConsentSection />
            </TabsContent>

            <TabsContent value="numerology" className="mt-4 space-y-4">
              <NumerologyProfileTab />
              <ConsentSection />
            </TabsContent>
          </Tabs>
        </main>
      </ScrollArea>
    </div>
  );
}
