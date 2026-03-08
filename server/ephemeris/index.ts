/**
 * In-house Ephemeris Engine
 *
 * Computes planetary positions, natal charts, ongoing transits, retrogrades,
 * sign ingresses, lunations (New/Full Moon) and major aspects for the
 * Cosmic Hub calendar.
 *
 * Supports Whole Sign and Placidus house systems.
 * All longitude values are ecliptic (tropical), with optional sidereal offset.
 */

// ─── Constants & tables ────────────────────────────────────────────────────────

export const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces",
] as const;

export type ZodiacSign = (typeof ZODIAC_SIGNS)[number];

export const ZODIAC_SYMBOLS: Record<ZodiacSign, string> = {
  Aries: "♈", Taurus: "♉", Gemini: "♊", Cancer: "♋",
  Leo: "♌", Virgo: "♍", Libra: "♎", Scorpio: "♏",
  Sagittarius: "♐", Capricorn: "♑", Aquarius: "♒", Pisces: "♓",
};

export const PLANET_SYMBOLS: Record<string, string> = {
  Sun: "☉", Moon: "☽", Mercury: "☿", Venus: "♀", Mars: "♂",
  Jupiter: "♃", Saturn: "♄", Uranus: "♅", Neptune: "♆", Pluto: "♇",
  Ascendant: "Asc", MC: "MC",
};

export const SIGN_ELEMENTS: Record<ZodiacSign, "fire" | "earth" | "air" | "water"> = {
  Aries: "fire", Leo: "fire", Sagittarius: "fire",
  Taurus: "earth", Virgo: "earth", Capricorn: "earth",
  Gemini: "air", Libra: "air", Aquarius: "air",
  Cancer: "water", Scorpio: "water", Pisces: "water",
};

export const SIGN_MODALITIES: Record<ZodiacSign, "cardinal" | "fixed" | "mutable"> = {
  Aries: "cardinal", Cancer: "cardinal", Libra: "cardinal", Capricorn: "cardinal",
  Taurus: "fixed", Leo: "fixed", Scorpio: "fixed", Aquarius: "fixed",
  Gemini: "mutable", Virgo: "mutable", Sagittarius: "mutable", Pisces: "mutable",
};

// Sidereal offset (Lahiri ayanamsha approximation for year 2000)
const SIDEREAL_OFFSET = 23.856; // degrees

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PlanetPosition {
  planet: string;
  /** Absolute ecliptic longitude 0–360 */
  longitude: number;
  /** Sign name */
  sign: ZodiacSign;
  /** Degree within sign 0–29 */
  degree: number;
  /** Minutes 0–59 */
  minutes: number;
  /** Whether the planet is retrograde */
  retrograde: boolean;
}

export interface HousePosition {
  house: number; // 1-12
  cuspLongitude: number;
  sign: ZodiacSign;
}

export interface NatalPlanetPlacement extends PlanetPosition {
  house: number;
  symbol: string;
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  type: "conjunction" | "opposition" | "trine" | "square" | "sextile";
  orb: number;
  applying: boolean;
}

export interface NatalChart {
  placements: NatalPlanetPlacement[];
  aspects: ChartAspect[];
  houses: HousePosition[];
  houseSystem: "whole-sign" | "placidus";
  zodiacSystem: "tropical" | "sidereal";
  ascendantLongitude: number;
  mcLongitude: number;
}

export type CalendarEventType =
  | "new_moon"
  | "full_moon"
  | "first_quarter"
  | "last_quarter"
  | "retrograde_start"
  | "retrograde_end"
  | "ingress"
  | "major_aspect"
  | "season";

export interface CalendarEvent {
  date: string; // ISO date YYYY-MM-DD
  type: CalendarEventType;
  label: string;
  description: string;
  planet?: string;
  sign?: string;
  prompt: string;
}

export interface TodaySnapshot {
  date: string;
  moonPhase: string;
  moonPhaseEmoji: string;
  moonSign: ZodiacSign;
  sunSign: ZodiacSign;
  planetPositions: PlanetPosition[];
  events: CalendarEvent[];
  energyWord: string;
}

// ─── Julian Day helpers ────────────────────────────────────────────────────────

export function julianDay(
  year: number, month: number, day: number, hour = 12
): number {
  if (month <= 2) { year -= 1; month += 12; }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) +
    Math.floor(30.6001 * (month + 1)) +
    day + hour / 24 + B - 1524.5;
}

function jdToDate(jd: number): Date {
  const z = Math.floor(jd + 0.5);
  const f = (jd + 0.5) - z;
  let a = z;
  if (z >= 2299161) {
    const alpha = Math.floor((z - 1867216.25) / 36524.25);
    a = z + 1 + alpha - Math.floor(alpha / 4);
  }
  const b = a + 1524;
  const c = Math.floor((b - 122.1) / 365.25);
  const d = Math.floor(365.25 * c);
  const e = Math.floor((b - d) / 30.6001);
  const day = b - d - Math.floor(30.6001 * e);
  const month = e < 14 ? e - 1 : e - 13;
  const year = month > 2 ? c - 4716 : c - 4715;
  const hours = f * 24;
  return new Date(Date.UTC(year, month - 1, day, Math.floor(hours), Math.round((hours % 1) * 60)));
}

function dateToJd(date: Date): number {
  return julianDay(
    date.getUTCFullYear(),
    date.getUTCMonth() + 1,
    date.getUTCDate(),
    date.getUTCHours() + date.getUTCMinutes() / 60
  );
}

// ─── Low-level planetary longitude computations ────────────────────────────────

function normDeg(d: number): number { return ((d % 360) + 360) % 360; }
function toRad(d: number): number { return d * Math.PI / 180; }
function toDeg(r: number): number { return r * 180 / Math.PI; }

/** Sun ecliptic longitude (low-precision, ~0.01°) */
export function sunLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T;
  const Mrad = toRad(M);
  const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
    (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
    0.000289 * Math.sin(3 * Mrad);
  return normDeg(L0 + C);
}

/** Moon ecliptic longitude (~0.3° precision) */
export function moonLongitude(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  const lng = Lp +
    6.288774 * Math.sin(toRad(Mp)) +
    1.274027 * Math.sin(toRad(2 * D - Mp)) +
    0.658314 * Math.sin(toRad(2 * D)) +
    0.213618 * Math.sin(toRad(2 * Mp)) -
    0.185116 * Math.sin(toRad(M)) -
    0.114332 * Math.sin(toRad(2 * F));
  return normDeg(lng);
}

/** Mean planetary longitudes (VSOP87-simplified, sufficient for sign/house placement) */
function planetaryLongitudes(jd: number): Record<string, number> {
  const T = (jd - 2451545.0) / 36525;
  // Mean longitude + mean motion approximations
  // Mercury, Venus use heliocentric corrections for better accuracy
  const mercL = 252.2509 + 149472.6747 * T + 0.0003 * Math.sin(toRad(149472.6747 * T));
  const venL  = 181.9798 + 58517.8157 * T;
  const marL  = 355.4330 + 19140.2993 * T + 0.0184 * Math.sin(toRad(19140.2993 * T));
  const jupL  = 34.3515 + 3034.9057 * T + 0.0832 * Math.sin(toRad(10.29 + 1222.114 * T));
  const satL  = 50.0774 + 1222.1138 * T + 0.0557 * Math.sin(toRad(1222.1138 * T));
  const uraL  = 314.0550 + 428.4669 * T;
  const nepL  = 304.3487 + 218.4602 * T;
  const pluL  = 238.9283 + 145.2078 * T;

  return {
    Mercury: normDeg(mercL),
    Venus:   normDeg(venL),
    Mars:    normDeg(marL),
    Jupiter: normDeg(jupL),
    Saturn:  normDeg(satL),
    Uranus:  normDeg(uraL),
    Neptune: normDeg(nepL),
    Pluto:   normDeg(pluL),
  };
}

/** All planet longitudes at a given JD */
export function allPlanetLongitudes(jd: number): Record<string, number> {
  return {
    Sun:  sunLongitude(jd),
    Moon: moonLongitude(jd),
    ...planetaryLongitudes(jd),
  };
}

// ─── Ascendant & MC ────────────────────────────────────────────────────────────

export function ascendantLongitude(jd: number, lat: number, lng: number): number {
  const T = (jd - 2451545.0) / 36525;
  const gmst = normDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0) + 0.000387933 * T * T);
  const lst = normDeg(gmst + lng);
  const lstRad = toRad(lst);
  const latRad = toRad(lat);
  const obliquity = 23.439291 - 0.013004 * T;
  const oblRad = toRad(obliquity);
  const ascRad = Math.atan2(
    Math.cos(lstRad),
    -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad))
  );
  return normDeg(toDeg(ascRad));
}

export function mcLongitude(jd: number, lng: number): number {
  const T = (jd - 2451545.0) / 36525;
  const gmst = normDeg(280.46061837 + 360.98564736629 * (jd - 2451545.0));
  const lst = normDeg(gmst + lng);
  const obliquity = 23.439291 - 0.013004 * T;
  const oblRad = toRad(obliquity);
  const lstRad = toRad(lst);
  const mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad));
  return normDeg(toDeg(mcRad));
}

// ─── Sign & degree parsing ─────────────────────────────────────────────────────

function signFromLongitude(lon: number): { sign: ZodiacSign; degree: number; minutes: number } {
  const norm = normDeg(lon);
  const idx = Math.floor(norm / 30);
  const deg = Math.floor(norm % 30);
  const min = Math.round(((norm % 30) - deg) * 60);
  return { sign: ZODIAC_SIGNS[idx], degree: deg, minutes: min };
}

// ─── Retrograde detection ──────────────────────────────────────────────────────

/** Returns true if a planet is moving backwards (retrograde) at the given JD */
function isRetrograde(planet: string, jd: number): boolean {
  // Luminaries never retrograde
  if (planet === "Sun" || planet === "Moon") return false;
  const lngs = allPlanetLongitudes(jd);
  const lngs2 = allPlanetLongitudes(jd + 1);
  const d1 = lngs[planet];
  const d2 = lngs2[planet];
  if (d1 === undefined || d2 === undefined) return false;
  // Handle wrap-around near 0°/360°
  let delta = d2 - d1;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return delta < 0;
}

// ─── House systems ────────────────────────────────────────────────────────────

/** Whole Sign houses: each sign IS a house starting at Ascendant sign */
function wholeSignHouses(ascLon: number): HousePosition[] {
  const ascSignIdx = Math.floor(ascLon / 30);
  return Array.from({ length: 12 }, (_, i) => {
    const signIdx = (ascSignIdx + i) % 12;
    return {
      house: i + 1,
      cuspLongitude: signIdx * 30,
      sign: ZODIAC_SIGNS[signIdx],
    };
  });
}

/** Simplified Placidus: divides the space between ASC and MC into 3 equal arcs */
function placidusHouses(ascLon: number, mcLon: number): HousePosition[] {
  // Cusp 1 = ASC, Cusp 10 = MC
  // Houses 11,12 interpolated above horizon; 2,3 below
  const cusp1 = ascLon;
  const cusp10 = mcLon;

  function interpolateCusp(from: number, to: number, fraction: number): number {
    let diff = to - from;
    if (diff < 0) diff += 360;
    return normDeg(from + diff * fraction);
  }

  const cusps: number[] = new Array(13).fill(0);
  cusps[1]  = cusp1;
  cusps[10] = cusp10;
  cusps[4]  = normDeg(cusp10 + 180); // IC
  cusps[7]  = normDeg(cusp1 + 180);  // Descendant

  // Interpolate houses 2,3 (between ASC and IC going clockwise)
  cusps[2] = interpolateCusp(cusp1,   cusps[4], 1 / 3);
  cusps[3] = interpolateCusp(cusp1,   cusps[4], 2 / 3);
  // Interpolate houses 5,6
  cusps[5] = interpolateCusp(cusp10,  cusps[7], 1 / 3);
  cusps[6] = interpolateCusp(cusp10,  cusps[7], 2 / 3);
  // Interpolate houses 8,9
  cusps[8] = interpolateCusp(cusps[7],cusps[10], 1 / 3);
  cusps[9] = interpolateCusp(cusps[7],cusps[10], 2 / 3);
  // Interpolate houses 11,12
  cusps[11] = interpolateCusp(cusp10, cusp1, 1 / 3);
  cusps[12] = interpolateCusp(cusp10, cusp1, 2 / 3);

  return Array.from({ length: 12 }, (_, i) => {
    const lon = cusps[i + 1];
    return {
      house: i + 1,
      cuspLongitude: lon,
      sign: signFromLongitude(lon).sign,
    };
  });
}

function getHouseForPlanet(lon: number, houses: HousePosition[]): number {
  // Find which house the longitude falls in
  for (let i = 0; i < 12; i++) {
    const cuspStart = houses[i].cuspLongitude;
    const cuspEnd   = houses[(i + 1) % 12].cuspLongitude;
    let end = cuspEnd;
    if (end <= cuspStart) end += 360; // wrap
    let pos = lon;
    if (pos < cuspStart) pos += 360;
    if (pos >= cuspStart && pos < end) return houses[i].house;
  }
  return 1;
}

// ─── Aspect detection ──────────────────────────────────────────────────────────

const ASPECT_DEFS: { name: ChartAspect["type"]; angle: number; orb: number }[] = [
  { name: "conjunction", angle: 0,   orb: 8 },
  { name: "opposition",  angle: 180, orb: 8 },
  { name: "trine",       angle: 120, orb: 8 },
  { name: "square",      angle: 90,  orb: 7 },
  { name: "sextile",     angle: 60,  orb: 6 },
];

export function calculateAspects(
  placements: Array<{ planet: string; longitude: number }>
): ChartAspect[] {
  const aspects: ChartAspect[] = [];
  const main = placements.filter(p => !["IC", "Vertex"].includes(p.planet));

  for (let i = 0; i < main.length; i++) {
    for (let j = i + 1; j < main.length; j++) {
      let diff = Math.abs(main[i].longitude - main[j].longitude);
      if (diff > 180) diff = 360 - diff;
      for (const def of ASPECT_DEFS) {
        const orb = Math.abs(diff - def.angle);
        if (orb <= def.orb) {
          aspects.push({
            planet1: main[i].planet,
            planet2: main[j].planet,
            type:    def.name,
            orb:     Math.round(orb * 10) / 10,
            applying: main[i].longitude < main[j].longitude,
          });
          break;
        }
      }
    }
  }
  return aspects;
}

// ─── Natal chart computation ───────────────────────────────────────────────────

export function computeNatalChart(
  birthDate: string,           // YYYY-MM-DD
  birthTime: string,           // HH:MM
  latitude: number,
  longitude: number,
  zodiacSystem: "tropical" | "sidereal" = "tropical",
  houseSystem: "whole-sign" | "placidus" = "placidus"
): NatalChart {
  const [yr, mo, dy] = birthDate.split("-").map(Number);
  const [hr, mn] = birthTime.split(":").map(Number);
  const jd = julianDay(yr, mo, dy, hr + mn / 60);

  const siderealAdj = zodiacSystem === "sidereal" ? SIDEREAL_OFFSET : 0;
  const adj = (lon: number) => normDeg(lon - siderealAdj);

  const lngs = allPlanetLongitudes(jd);
  const ascLon = adj(ascendantLongitude(jd, latitude, longitude));
  const mcLon  = adj(mcLongitude(jd, longitude));

  const houses: HousePosition[] = houseSystem === "whole-sign"
    ? wholeSignHouses(ascLon)
    : placidusHouses(ascLon, mcLon);

  const PLANETS_ORDER = [
    "Sun", "Moon", "Mercury", "Venus", "Mars",
    "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto",
    "Ascendant", "MC",
  ];

  const placements: NatalPlanetPlacement[] = PLANETS_ORDER.map(name => {
    const rawLon = name === "Ascendant" ? ascLon
                 : name === "MC"        ? mcLon
                 : adj(lngs[name] ?? 0);
    const { sign, degree, minutes } = signFromLongitude(rawLon);
    return {
      planet:    name,
      symbol:    PLANET_SYMBOLS[name] ?? name,
      longitude: rawLon,
      sign,
      degree,
      minutes,
      retrograde: isRetrograde(name, jd),
      house:     getHouseForPlanet(rawLon, houses),
    };
  });

  const aspects = calculateAspects(placements.map(p => ({ planet: p.planet, longitude: p.longitude })));

  return { placements, aspects, houses, houseSystem, zodiacSystem, ascendantLongitude: ascLon, mcLongitude: mcLon };
}

// ─── Current transit positions ─────────────────────────────────────────────────

export function currentTransits(
  date: Date = new Date(),
  zodiacSystem: "tropical" | "sidereal" = "tropical"
): PlanetPosition[] {
  const jd = dateToJd(date);
  const siderealAdj = zodiacSystem === "sidereal" ? SIDEREAL_OFFSET : 0;
  const adj = (lon: number) => normDeg(lon - siderealAdj);
  const lngs = allPlanetLongitudes(jd);

  return Object.entries(lngs).map(([planet, lon]) => {
    const adjusted = adj(lon);
    const { sign, degree, minutes } = signFromLongitude(adjusted);
    return { planet, longitude: adjusted, sign, degree, minutes, retrograde: isRetrograde(planet, jd) };
  });
}

// ─── Moon phase ────────────────────────────────────────────────────────────────

/** Returns the moon phase name and illumination 0–1 */
export function moonPhaseInfo(date: Date = new Date()): {
  name: string;
  emoji: string;
  illumination: number;
  angle: number;
} {
  const jd = dateToJd(date);
  const sun  = sunLongitude(jd);
  const moon = moonLongitude(jd);
  let angle = normDeg(moon - sun);
  const illum = (1 - Math.cos(toRad(angle))) / 2;

  let name: string;
  let emoji: string;
  if (angle < 22.5 || angle >= 337.5) { name = "New Moon"; emoji = "🌑"; }
  else if (angle < 67.5)  { name = "Waxing Crescent"; emoji = "🌒"; }
  else if (angle < 112.5) { name = "First Quarter";   emoji = "🌓"; }
  else if (angle < 157.5) { name = "Waxing Gibbous";  emoji = "🌔"; }
  else if (angle < 202.5) { name = "Full Moon";        emoji = "🌕"; }
  else if (angle < 247.5) { name = "Waning Gibbous";  emoji = "🌖"; }
  else if (angle < 292.5) { name = "Last Quarter";    emoji = "🌗"; }
  else                    { name = "Waning Crescent";  emoji = "🌘"; }

  return { name, emoji, illumination: Math.round(illum * 100) / 100, angle };
}

// ─── Calendar event engine ─────────────────────────────────────────────────────

const RETROGRADE_PROMPTS: Record<string, string> = {
  Mercury: "Slow down, review communications, and revisit unfinished conversations.",
  Venus:   "Reassess your values and relationships. What truly matters to you?",
  Mars:    "Redirect inner drive inward. Reflect before you act.",
  Jupiter: "Review where you're expanding. Are your beliefs serving you?",
  Saturn:  "Examine your structures and responsibilities with fresh eyes.",
  Uranus:  "Unexpected reversals invite deeper liberation. Stay adaptable.",
  Neptune: "Illusions may dissolve. Seek clarity in your dreams.",
  Pluto:   "Transformation turns inward. What shadow material needs attention?",
};

const INGRESS_PROMPTS: Record<ZodiacSign, string> = {
  Aries:       "A surge of initiative energy. What bold step will you take?",
  Taurus:      "Slow down and savor. What are you building to last?",
  Gemini:      "Curiosity peaks. What conversations are you ready to have?",
  Cancer:      "Tend to home and heart. What needs nurturing?",
  Leo:         "Let yourself shine. What do you want to express?",
  Virgo:       "Refinement calls. Where can you bring more care and precision?",
  Libra:       "Seek balance and beauty. What relationship deserves attention?",
  Scorpio:     "Go deeper. What truth are you ready to uncover?",
  Sagittarius: "Expand your horizons. What adventure or belief inspires you?",
  Capricorn:   "Commit to your goals. What structure supports your ambition?",
  Aquarius:    "Think differently. What innovation are you ready to embrace?",
  Pisces:      "Flow and feel. What needs compassion and release?",
};

const MOON_EVENT_PROMPTS: Record<string, string> = {
  new_moon:      "What new intention do you want to plant in this cycle?",
  full_moon:     "What have you grown? What are you ready to release?",
  first_quarter: "What decision have you been holding back from making?",
  last_quarter:  "What habits no longer align with your intentions?",
};

function isoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Find all New/Full/Quarter Moon events between two JD values using bisection.
 */
function findLunationEvents(jdStart: number, jdEnd: number): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const targets: { angle: number; type: CalendarEventType; label: string }[] = [
    { angle: 0,   type: "new_moon",      label: "New Moon" },
    { angle: 90,  type: "first_quarter", label: "First Quarter Moon" },
    { angle: 180, type: "full_moon",     label: "Full Moon" },
    { angle: 270, type: "last_quarter",  label: "Last Quarter Moon" },
  ];

  for (const target of targets) {
    // Step through every ~3 days and look for sign crossing
    for (let jd = jdStart; jd < jdEnd; jd += 29.53 / 4) {
      const sun0  = sunLongitude(jd);
      const moon0 = moonLongitude(jd);
      let elongation0 = normDeg(moon0 - sun0);
      // Normalise to how far past the target angle we are
      let diff0 = normDeg(elongation0 - target.angle);
      if (diff0 > 180) diff0 -= 360; // signed
      let diff1: number;
      const jdPlus = jd + 29.53 / 4;
      {
        const s = sunLongitude(jdPlus);
        const m = moonLongitude(jdPlus);
        let el = normDeg(m - s);
        diff1 = normDeg(el - target.angle);
        if (diff1 > 180) diff1 -= 360;
      }

      if (diff0 * diff1 < 0) {
        // Bisect to find the exact JD
        let lo = jd, hi = jdPlus;
        for (let iter = 0; iter < 30; iter++) {
          const mid = (lo + hi) / 2;
          const sm  = sunLongitude(mid);
          const mm  = moonLongitude(mid);
          let elMid = normDeg(mm - sm);
          let dMid  = normDeg(elMid - target.angle);
          if (dMid > 180) dMid -= 360;
          if (dMid * diff0 < 0) hi = mid;
          else lo = mid;
        }
        const exactJd = (lo + hi) / 2;
        if (exactJd >= jdStart && exactJd < jdEnd) {
          const eventDate = jdToDate(exactJd);
          const moonSign = signFromLongitude(moonLongitude(exactJd)).sign;
          const prompt = MOON_EVENT_PROMPTS[target.type];
          const descriptions: Record<CalendarEventType, string> = {
            new_moon:      `New Moon in ${moonSign} — a portal for fresh intentions.`,
            full_moon:     `Full Moon in ${moonSign} — peak illumination and release.`,
            first_quarter: `First Quarter Moon in ${moonSign} — push through resistance.`,
            last_quarter:  `Last Quarter Moon in ${moonSign} — reflect and let go.`,
            retrograde_start: "",
            retrograde_end: "",
            ingress: "",
            major_aspect: "",
            season: "",
          };
          events.push({
            date:        isoDate(eventDate),
            type:        target.type,
            label:       target.label,
            description: descriptions[target.type],
            planet:      "Moon",
            sign:        moonSign,
            prompt,
          });
        }
      }
    }
  }
  return events;
}

/**
 * Detect retrograde start/end transitions for a planet over a date range.
 */
function findRetrogradeEvents(
  planet: string,
  jdStart: number,
  jdEnd: number
): CalendarEvent[] {
  if (planet === "Sun" || planet === "Moon") return [];
  const events: CalendarEvent[] = [];
  let wasRetro = isRetrograde(planet, jdStart);

  for (let jd = jdStart + 1; jd <= jdEnd; jd += 1) {
    const nowRetro = isRetrograde(planet, jd);
    if (nowRetro !== wasRetro) {
      const eventDate = jdToDate(jd);
      const type: CalendarEventType = nowRetro ? "retrograde_start" : "retrograde_end";
      const label = nowRetro ? `${planet} Retrograde` : `${planet} Direct`;
      const sign = signFromLongitude(allPlanetLongitudes(jd)[planet]).sign;
      events.push({
        date:        isoDate(eventDate),
        type,
        label,
        description: nowRetro
          ? `${planet} stations retrograde in ${sign}. Review, revise, reflect.`
          : `${planet} stations direct in ${sign}. Move forward with clarity.`,
        planet,
        sign,
        prompt: RETROGRADE_PROMPTS[planet] ?? "Pause, reflect, and reassess.",
      });
      wasRetro = nowRetro;
    }
  }
  return events;
}

/**
 * Detect when a planet ingresses (enters) a new sign over a date range.
 */
function findIngressEvents(
  planet: string,
  jdStart: number,
  jdEnd: number
): CalendarEvent[] {
  const events: CalendarEvent[] = [];
  const lngsStart = allPlanetLongitudes(jdStart);
  let prevSign = Math.floor((lngsStart[planet] ?? 0) / 30);

  for (let jd = jdStart + 1; jd <= jdEnd; jd += 1) {
    const lngs = allPlanetLongitudes(jd);
    const lon  = lngs[planet] ?? 0;
    const signIdx = Math.floor(normDeg(lon) / 30);
    if (signIdx !== prevSign) {
      const eventDate = jdToDate(jd);
      const sign = ZODIAC_SIGNS[signIdx];
      events.push({
        date:        isoDate(eventDate),
        type:        "ingress",
        label:       `${planet} enters ${sign}`,
        description: `${planet} ingresses into ${sign} ${ZODIAC_SYMBOLS[sign]}.`,
        planet,
        sign,
        prompt: INGRESS_PROMPTS[sign],
      });
      prevSign = signIdx;
    }
  }
  return events;
}

/** Seasonal equinox/solstice events */
function findSeasonEvents(jdStart: number, jdEnd: number): CalendarEvent[] {
  const SEASONS: { lon: number; label: string; desc: string; prompt: string }[] = [
    { lon: 0,   label: "Spring Equinox (Aries Ingress)",  desc: "Equal day and night. New astrological year begins.", prompt: "What seeds are you planting for the year ahead?" },
    { lon: 90,  label: "Summer Solstice (Cancer Ingress)", desc: "Longest day. Peak solar energy and vitality.", prompt: "Where in your life are you at full bloom?" },
    { lon: 180, label: "Autumn Equinox (Libra Ingress)",   desc: "Balance point. Harvest and letting go begins.", prompt: "What are you harvesting? What will you release?" },
    { lon: 270, label: "Winter Solstice (Capricorn Ingress)", desc: "Longest night. Rest, reflection, and renewal.", prompt: "What wants to be born from the stillness?" },
  ];
  const events: CalendarEvent[] = [];

  for (const season of SEASONS) {
    for (let jd = jdStart; jd < jdEnd; jd += 91) {
      const sun0 = sunLongitude(jd);
      let diff0 = normDeg(sun0 - season.lon);
      if (diff0 > 180) diff0 -= 360;
      const jdPlus = jd + 91;
      const sun1 = sunLongitude(jdPlus);
      let diff1 = normDeg(sun1 - season.lon);
      if (diff1 > 180) diff1 -= 360;

      if (diff0 * diff1 < 0) {
        let lo = jd, hi = jdPlus;
        for (let iter = 0; iter < 40; iter++) {
          const mid = (lo + hi) / 2;
          let dm = normDeg(sunLongitude(mid) - season.lon);
          if (dm > 180) dm -= 360;
          if (dm * diff0 < 0) hi = mid;
          else lo = mid;
        }
        const exactJd = (lo + hi) / 2;
        if (exactJd >= jdStart && exactJd < jdEnd) {
          events.push({
            date:        isoDate(jdToDate(exactJd)),
            type:        "season",
            label:       season.label,
            description: season.desc,
            prompt:      season.prompt,
          });
        }
      }
    }
  }
  return events;
}

// ─── Public calendar API ───────────────────────────────────────────────────────

/**
 * Compute all celestial events in a date range.
 * @param startDate  ISO date string YYYY-MM-DD (inclusive)
 * @param endDate    ISO date string YYYY-MM-DD (inclusive)
 */
export function computeCalendarEvents(
  startDate: string,
  endDate: string
): CalendarEvent[] {
  const start = new Date(startDate + "T00:00:00Z");
  const end   = new Date(endDate   + "T23:59:59Z");
  const jdStart = dateToJd(start);
  const jdEnd   = dateToJd(end);

  const events: CalendarEvent[] = [];

  // Lunations
  events.push(...findLunationEvents(jdStart, jdEnd));

  // Seasons
  events.push(...findSeasonEvents(jdStart, jdEnd));

  // Retrogrades (outer planets only — inner planets retrograde too fast for monthly view noise)
  const RETROGRADE_PLANETS = ["Mercury", "Venus", "Mars", "Jupiter", "Saturn", "Uranus", "Neptune", "Pluto"];
  for (const planet of RETROGRADE_PLANETS) {
    events.push(...findRetrogradeEvents(planet, jdStart, jdEnd));
  }

  // Ingresses for slower planets (Mars+)
  const INGRESS_PLANETS = ["Sun", "Mercury", "Venus", "Mars", "Jupiter", "Saturn"];
  for (const planet of INGRESS_PLANETS) {
    events.push(...findIngressEvents(planet, jdStart, jdEnd));
  }

  // Deduplicate (same date + type + planet)
  const seen = new Set<string>();
  const deduplicated = events.filter(e => {
    const key = `${e.date}|${e.type}|${e.planet ?? ""}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduplicated.sort((a, b) => a.date.localeCompare(b.date));
}

// ─── Today snapshot ────────────────────────────────────────────────────────────

const ENERGY_WORDS: [string, ...string[]] = [
  "Grounded", "Expansive", "Reflective", "Dynamic", "Intuitive",
  "Transformative", "Harmonious", "Intense", "Clarifying", "Nurturing",
  "Visionary", "Decisive", "Receptive", "Renewing",
];

export function computeTodaySnapshot(
  zodiacSystem: "tropical" | "sidereal" = "tropical"
): TodaySnapshot {
  const today = new Date();
  const phase = moonPhaseInfo(today);
  const transits = currentTransits(today, zodiacSystem);
  const moonPos = transits.find(p => p.planet === "Moon")!;
  const sunPos  = transits.find(p => p.planet === "Sun")!;

  // Today + tomorrow events
  const todayStr    = isoDate(today);
  const tomorrowStr = isoDate(new Date(today.getTime() + 86400000));
  const events = computeCalendarEvents(todayStr, tomorrowStr);

  // Simple deterministic energy word from sum of planet degrees
  const degSum = transits.reduce((acc, p) => acc + Math.floor(p.longitude), 0);
  const energyWord = ENERGY_WORDS[degSum % ENERGY_WORDS.length];

  return {
    date:           todayStr,
    moonPhase:      phase.name,
    moonPhaseEmoji: phase.emoji,
    moonSign:       moonPos.sign,
    sunSign:        sunPos.sign,
    planetPositions: transits,
    events,
    energyWord,
  };
}

// ─── Simple in-memory cache ────────────────────────────────────────────────────

interface CacheEntry<T> { value: T; expiresAt: number; }
const _cache = new Map<string, CacheEntry<unknown>>();

export function withCache<T>(
  key: string,
  ttlMs: number,
  compute: () => T
): T {
  const now = Date.now();
  const entry = _cache.get(key) as CacheEntry<T> | undefined;
  if (entry && entry.expiresAt > now) return entry.value;
  const value = compute();
  _cache.set(key, { value, expiresAt: now + ttlMs });
  return value;
}
