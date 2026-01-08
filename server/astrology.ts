import type { BirthChart } from "@shared/schema";

export interface PlanetPlacement {
  planet: string;
  sign: string;
  degree: number;
  minutes: number;
  absoluteDegree: number;
}

export interface ChartAspect {
  planet1: string;
  planet2: string;
  type: "conjunction" | "opposition" | "trine" | "square" | "sextile";
  orb: number;
  applying: boolean;
}

export interface PlacementInterpretation {
  planet: string;
  technicalPlacement: string;
  experientialOverlay: string | null;
  explanation: string;
  whyDifferent: string | null;
}

export interface CalculatedChart {
  placements: PlanetPlacement[];
  aspects: ChartAspect[];
  interpretations: PlacementInterpretation[];
  houseSystem: string;
  zodiacSystem: string;
}

const ZODIAC_SIGNS = [
  "Aries", "Taurus", "Gemini", "Cancer", "Leo", "Virgo",
  "Libra", "Scorpio", "Sagittarius", "Capricorn", "Aquarius", "Pisces"
];

const PLANET_SYMBOLS: Record<string, string> = {
  "Sun": "☉",
  "Moon": "☽",
  "Ascendant": "Asc",
  "MC": "MC",
  "IC": "IC",
  "Vertex": "Vx",
  "Mercury": "☿",
  "Venus": "♀",
  "Mars": "♂",
  "Jupiter": "♃",
  "Saturn": "♄",
  "Uranus": "♅",
  "Neptune": "♆",
  "Pluto": "♇"
};

const SIGN_ELEMENTS: Record<string, "fire" | "earth" | "air" | "water"> = {
  "Aries": "fire", "Leo": "fire", "Sagittarius": "fire",
  "Taurus": "earth", "Virgo": "earth", "Capricorn": "earth",
  "Gemini": "air", "Libra": "air", "Aquarius": "air",
  "Cancer": "water", "Scorpio": "water", "Pisces": "water"
};

const SIGN_QUALITIES: Record<string, "cardinal" | "fixed" | "mutable"> = {
  "Aries": "cardinal", "Cancer": "cardinal", "Libra": "cardinal", "Capricorn": "cardinal",
  "Taurus": "fixed", "Leo": "fixed", "Scorpio": "fixed", "Aquarius": "fixed",
  "Gemini": "mutable", "Virgo": "mutable", "Sagittarius": "mutable", "Pisces": "mutable"
};

function getSignFromDegree(degree: number): { sign: string; signDegree: number; minutes: number } {
  const normalized = ((degree % 360) + 360) % 360;
  const signIndex = Math.floor(normalized / 30);
  const signDegree = Math.floor(normalized % 30);
  const minutes = Math.round((normalized % 1) * 60);
  return {
    sign: ZODIAC_SIGNS[signIndex],
    signDegree,
    minutes
  };
}

function julianDay(year: number, month: number, day: number, hour: number = 12): number {
  if (month <= 2) {
    year -= 1;
    month += 12;
  }
  const A = Math.floor(year / 100);
  const B = 2 - A + Math.floor(A / 4);
  return Math.floor(365.25 * (year + 4716)) + 
         Math.floor(30.6001 * (month + 1)) + 
         day + hour / 24 + B - 1524.5;
}

function calculateSunPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const L0 = 280.46646 + 36000.76983 * T + 0.0003032 * T * T;
  const M = 357.52911 + 35999.05029 * T - 0.0001537 * T * T;
  const e = 0.016708634 - 0.000042037 * T;
  const Mrad = M * Math.PI / 180;
  const C = (1.914602 - 0.004817 * T) * Math.sin(Mrad) +
            (0.019993 - 0.000101 * T) * Math.sin(2 * Mrad) +
            0.000289 * Math.sin(3 * Mrad);
  let sunLong = L0 + C;
  sunLong = ((sunLong % 360) + 360) % 360;
  return sunLong;
}

function calculateMoonPosition(jd: number): number {
  const T = (jd - 2451545.0) / 36525;
  const Lp = 218.3164477 + 481267.88123421 * T - 0.0015786 * T * T;
  const D = 297.8501921 + 445267.1114034 * T - 0.0018819 * T * T;
  const M = 357.5291092 + 35999.0502909 * T - 0.0001536 * T * T;
  const Mp = 134.9633964 + 477198.8675055 * T + 0.0087414 * T * T;
  const F = 93.272095 + 483202.0175233 * T - 0.0036539 * T * T;
  
  const Drad = D * Math.PI / 180;
  const Mrad = M * Math.PI / 180;
  const Mprad = Mp * Math.PI / 180;
  const Frad = F * Math.PI / 180;
  
  let moonLong = Lp +
    6.288774 * Math.sin(Mprad) +
    1.274027 * Math.sin(2 * Drad - Mprad) +
    0.658314 * Math.sin(2 * Drad) +
    0.213618 * Math.sin(2 * Mprad) -
    0.185116 * Math.sin(Mrad) -
    0.114332 * Math.sin(2 * Frad);
  
  moonLong = ((moonLong % 360) + 360) % 360;
  return moonLong;
}

function calculateAscendant(jd: number, latitude: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
               0.000387933 * T * T;
  const lst = (gmst + longitude) % 360;
  const lstRad = lst * Math.PI / 180;
  const latRad = latitude * Math.PI / 180;
  const obliquity = 23.439291 - 0.013004 * T;
  const oblRad = obliquity * Math.PI / 180;
  
  const ascRad = Math.atan2(Math.cos(lstRad), 
    -(Math.sin(lstRad) * Math.cos(oblRad) + Math.tan(latRad) * Math.sin(oblRad)));
  let asc = ascRad * 180 / Math.PI;
  asc = ((asc % 360) + 360) % 360;
  return asc;
}

function calculateMC(jd: number, longitude: number): number {
  const T = (jd - 2451545.0) / 36525;
  const gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0);
  const lst = (gmst + longitude) % 360;
  const obliquity = 23.439291 - 0.013004 * T;
  const oblRad = obliquity * Math.PI / 180;
  const lstRad = lst * Math.PI / 180;
  
  const mcRad = Math.atan2(Math.sin(lstRad), Math.cos(lstRad) * Math.cos(oblRad));
  let mc = mcRad * 180 / Math.PI;
  mc = ((mc % 360) + 360) % 360;
  return mc;
}

function calculatePlanetaryPositions(jd: number): Record<string, number> {
  const T = (jd - 2451545.0) / 36525;
  
  const mercuryL = 252.2509 + 149472.6747 * T;
  const venusL = 181.9798 + 58517.8157 * T;
  const marsL = 355.4330 + 19140.2993 * T;
  const jupiterL = 34.3515 + 3034.9057 * T;
  const saturnL = 50.0774 + 1222.1138 * T;
  const uranusL = 314.0550 + 428.4669 * T;
  const neptuneL = 304.3487 + 218.4602 * T;
  const plutoL = 238.9283 + 145.2078 * T;
  
  return {
    Mercury: ((mercuryL % 360) + 360) % 360,
    Venus: ((venusL % 360) + 360) % 360,
    Mars: ((marsL % 360) + 360) % 360,
    Jupiter: ((jupiterL % 360) + 360) % 360,
    Saturn: ((saturnL % 360) + 360) % 360,
    Uranus: ((uranusL % 360) + 360) % 360,
    Neptune: ((neptuneL % 360) + 360) % 360,
    Pluto: ((plutoL % 360) + 360) % 360,
  };
}

function calculateAspects(placements: PlanetPlacement[]): ChartAspect[] {
  const aspects: ChartAspect[] = [];
  const mainPlanets = placements.filter(p => 
    !["IC", "Vertex"].includes(p.planet)
  );
  
  const aspectTypes: { name: ChartAspect["type"]; angle: number; orb: number }[] = [
    { name: "conjunction", angle: 0, orb: 8 },
    { name: "opposition", angle: 180, orb: 8 },
    { name: "trine", angle: 120, orb: 8 },
    { name: "square", angle: 90, orb: 7 },
    { name: "sextile", angle: 60, orb: 6 },
  ];
  
  for (let i = 0; i < mainPlanets.length; i++) {
    for (let j = i + 1; j < mainPlanets.length; j++) {
      const deg1 = mainPlanets[i].absoluteDegree;
      const deg2 = mainPlanets[j].absoluteDegree;
      let diff = Math.abs(deg1 - deg2);
      if (diff > 180) diff = 360 - diff;
      
      for (const aspect of aspectTypes) {
        const orb = Math.abs(diff - aspect.angle);
        if (orb <= aspect.orb) {
          aspects.push({
            planet1: mainPlanets[i].planet,
            planet2: mainPlanets[j].planet,
            type: aspect.name,
            orb: Math.round(orb * 10) / 10,
            applying: deg1 < deg2,
          });
          break;
        }
      }
    }
  }
  
  return aspects;
}

function getPlacementDescription(planet: string, sign: string): string {
  const descriptions: Record<string, Record<string, string>> = {
    Sun: {
      Aries: "Your core identity is built around initiative, courage, and pioneering spirit.",
      Taurus: "Your core identity centers on stability, sensuality, and building lasting value.",
      Gemini: "Your core identity expresses through communication, curiosity, and adaptability.",
      Cancer: "Your core identity is rooted in nurturing, emotional depth, and creating home.",
      Leo: "Your core identity shines through creativity, self-expression, and generous leadership.",
      Virgo: "Your core identity manifests through service, discernment, and practical improvement.",
      Libra: "Your core identity seeks harmony, partnership, and aesthetic balance.",
      Scorpio: "Your core identity transforms through intensity, depth, and emotional power.",
      Sagittarius: "Your core identity expands through philosophy, adventure, and seeking truth.",
      Capricorn: "Your core identity builds through ambition, discipline, and mastery over time.",
      Aquarius: "Your core identity innovates through independence, vision, and humanitarian ideals.",
      Pisces: "Your core identity dissolves boundaries through compassion, imagination, and spiritual connection.",
    },
    Moon: {
      Aries: "You process emotions through action, independence, and direct expression.",
      Taurus: "You process emotions through comfort, stability, and sensory grounding.",
      Gemini: "You process emotions through thought, communication, and mental analysis.",
      Cancer: "You process emotions through nurturing, memory, and deep emotional attunement.",
      Leo: "You process emotions through creative expression, recognition, and warmth.",
      Virgo: "You process emotions through analysis, service, and practical problem-solving.",
      Libra: "You process emotions through relationship, harmony, and aesthetic appreciation.",
      Scorpio: "You process emotions through intensity, transformation, and psychological depth.",
      Sagittarius: "You process emotions through meaning-making, optimism, and philosophical perspective.",
      Capricorn: "You process emotions through structure, achievement, and measured control.",
      Aquarius: "You process emotions through detachment, ideals, and intellectual processing.",
      Pisces: "You process emotions through empathy, imagination, and spiritual absorption.",
    },
    Ascendant: {
      Aries: "You approach life with directness, courage, and pioneering energy.",
      Taurus: "You approach life with steadiness, sensuality, and deliberate patience.",
      Gemini: "You approach life with curiosity, adaptability, and quick mental agility.",
      Cancer: "You approach life with sensitivity, protectiveness, and emotional awareness.",
      Leo: "You approach life with confidence, warmth, and creative self-expression.",
      Virgo: "You approach life with precision, helpfulness, and analytical care.",
      Libra: "You approach life with diplomacy, grace, and a desire for harmony.",
      Scorpio: "You approach life with intensity, perception, and magnetic presence.",
      Sagittarius: "You approach life with optimism, adventure, and philosophical openness.",
      Capricorn: "You approach life with ambition, reserve, and strategic patience.",
      Aquarius: "You approach life with originality, independence, and progressive thinking.",
      Pisces: "You approach life with sensitivity, imagination, and fluid adaptability.",
    },
  };
  
  return descriptions[planet]?.[sign] || 
    `${planet} in ${sign} brings the energy of ${sign} to ${planet}'s domain.`;
}

function determineExperientialOverlay(placements: PlanetPlacement[]): Record<string, PlacementInterpretation> {
  const interpretations: Record<string, PlacementInterpretation> = {};
  const placementMap = new Map(placements.map(p => [p.planet, p]));
  
  const sun = placementMap.get("Sun");
  const moon = placementMap.get("Moon");
  const asc = placementMap.get("Ascendant");
  const mc = placementMap.get("MC");
  
  const elementCounts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of placements) {
    const element = SIGN_ELEMENTS[p.sign];
    if (element) elementCounts[element]++;
  }
  
  const dominantElement = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])[0][0] as "fire" | "earth" | "air" | "water";
  
  const waterDominant = elementCounts.water >= 4;
  const fireDominant = elementCounts.fire >= 4;
  const earthDominant = elementCounts.earth >= 4;
  const airDominant = elementCounts.air >= 4;
  
  for (const placement of placements) {
    const { planet, sign, degree } = placement;
    const technical = `${planet} in ${sign} at ${degree}°`;
    let experiential: string | null = null;
    let whyDifferent: string | null = null;
    
    if (planet === "Moon" && moon && sun && asc && mc) {
      if (moon.sign === "Gemini") {
        if ((sun.sign === "Cancer" || asc.sign === "Cancer") && mc.sign === "Pisces") {
          experiential = "May feel Pisces-like due to water dominance";
          whyDifferent = "With Cancer dominance and a Pisces Midheaven, emotions are absorbed intuitively and energetically rather than processed purely through thought.";
        } else if (waterDominant) {
          experiential = "May feel more emotionally intuitive due to water chart emphasis";
          whyDifferent = "While you process emotions through thought and language, strong water placements create deeper emotional undercurrents.";
        }
      }
      if (moon.sign === "Aquarius" && waterDominant) {
        experiential = "May feel more emotionally engaged than typical Aquarius Moon";
        whyDifferent = "Water dominance in your chart softens the natural detachment of Aquarius Moon.";
      }
    }
    
    if (planet === "Mars" && fireDominant && SIGN_ELEMENTS[sign] !== "fire") {
      experiential = `May express with more fire than typical ${sign} Mars`;
      whyDifferent = `Fire dominance in your chart intensifies your drive and assertiveness beyond what ${sign} alone would suggest.`;
    }
    
    if (planet === "Venus" && earthDominant && SIGN_ELEMENTS[sign] !== "earth") {
      experiential = `May seek more stability in love than typical ${sign} Venus`;
      whyDifferent = `Strong earth placements ground your relating style, adding practicality to ${sign}'s expression.`;
    }
    
    interpretations[planet] = {
      planet,
      technicalPlacement: technical,
      experientialOverlay: experiential,
      explanation: getPlacementDescription(planet, sign),
      whyDifferent,
    };
  }
  
  return interpretations;
}

export function calculateBirthChart(
  birthDate: string,
  birthTime: string,
  latitude: number,
  longitude: number,
  zodiacSystem: "tropical" | "sidereal" = "tropical",
  houseSystem: string = "placidus"
): CalculatedChart {
  const [year, month, day] = birthDate.split("-").map(Number);
  const [hour, minute] = birthTime.split(":").map(Number);
  const hourDecimal = hour + minute / 60;
  
  const jd = julianDay(year, month, day, hourDecimal);
  
  const sunDeg = calculateSunPosition(jd);
  const moonDeg = calculateMoonPosition(jd);
  const ascDeg = calculateAscendant(jd, latitude, longitude);
  const mcDeg = calculateMC(jd, longitude);
  const icDeg = (mcDeg + 180) % 360;
  const vertexDeg = (ascDeg + 90) % 360;
  
  const planetaryPositions = calculatePlanetaryPositions(jd);
  
  const siderealOffset = zodiacSystem === "sidereal" ? 24 : 0;
  
  function makePlacement(planet: string, degree: number): PlanetPlacement {
    const adjusted = zodiacSystem === "sidereal" 
      ? ((degree - siderealOffset + 360) % 360)
      : degree;
    const { sign, signDegree, minutes } = getSignFromDegree(adjusted);
    return {
      planet,
      sign,
      degree: signDegree,
      minutes,
      absoluteDegree: adjusted,
    };
  }
  
  const placements: PlanetPlacement[] = [
    makePlacement("Sun", sunDeg),
    makePlacement("Moon", moonDeg),
    makePlacement("Ascendant", ascDeg),
    makePlacement("MC", mcDeg),
    makePlacement("IC", icDeg),
    makePlacement("Vertex", vertexDeg),
    makePlacement("Mercury", planetaryPositions.Mercury),
    makePlacement("Venus", planetaryPositions.Venus),
    makePlacement("Mars", planetaryPositions.Mars),
    makePlacement("Jupiter", planetaryPositions.Jupiter),
    makePlacement("Saturn", planetaryPositions.Saturn),
    makePlacement("Uranus", planetaryPositions.Uranus),
    makePlacement("Neptune", planetaryPositions.Neptune),
    makePlacement("Pluto", planetaryPositions.Pluto),
  ];
  
  const aspects = calculateAspects(placements);
  const interpretationMap = determineExperientialOverlay(placements);
  const interpretations = placements.map(p => interpretationMap[p.planet]);
  
  return {
    placements,
    aspects,
    interpretations,
    houseSystem,
    zodiacSystem,
  };
}

export function getChartSummary(chart: CalculatedChart): {
  sunSign: string;
  moonSign: string;
  risingSign: string;
  dominantElement: string;
  keyAspects: string[];
} {
  const sun = chart.placements.find(p => p.planet === "Sun")!;
  const moon = chart.placements.find(p => p.planet === "Moon")!;
  const asc = chart.placements.find(p => p.planet === "Ascendant")!;
  
  const elementCounts: Record<string, number> = { fire: 0, earth: 0, air: 0, water: 0 };
  for (const p of chart.placements) {
    const element = SIGN_ELEMENTS[p.sign];
    if (element) elementCounts[element]++;
  }
  const dominantElement = Object.entries(elementCounts)
    .sort((a, b) => b[1] - a[1])[0][0];
  
  const keyAspects = chart.aspects
    .filter(a => 
      ["Sun", "Moon", "Ascendant", "MC"].includes(a.planet1) ||
      ["Sun", "Moon", "Ascendant", "MC"].includes(a.planet2)
    )
    .slice(0, 5)
    .map(a => `${a.planet1} ${a.type} ${a.planet2}`);
  
  return {
    sunSign: sun.sign,
    moonSign: moon.sign,
    risingSign: asc.sign,
    dominantElement,
    keyAspects,
  };
}

export function formatDegree(degree: number, minutes: number): string {
  return `${degree}°${minutes.toString().padStart(2, "0")}'`;
}

export { ZODIAC_SIGNS, PLANET_SYMBOLS, SIGN_ELEMENTS, SIGN_QUALITIES };
