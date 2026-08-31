import { storage } from "../storage";
import {
  calculateEnergyCurrents,
  type CurrentType,
  type CurrentState,
  type EnergyType,
  type DecisionCompass,
} from "./energy-currents";

export type ZoneId =
  | "physical"
  | "mental"
  | "spiritual"
  | "financial"
  | "relationships"
  | "career"
  | "learning"
  | "environment"
  | "creativity"
  | "fun"
  | "community"
  | "rest"
  | "identity";

export interface CompanionContext {
  currents: Record<CurrentType, CurrentState>;
  energyType: EnergyType;
  decisionCompass: DecisionCompass;
  zones: Record<ZoneId, { level: number; trend: string; lastAction?: string }>;
  cosmicWeather: { activeCurrents: string[]; moonPhase: string | null };
  interests: {
    deepDives: string[];
    currentObsessions: string[];
    popCulture: string[];
    spiritualCuriosity: string[];
  };
  patterns: { bestDecisionTime?: string; energyCrashRisk?: string };
}

const DEFAULT_ZONES: ZoneId[] = [
  "physical",
  "mental",
  "spiritual",
  "financial",
  "relationships",
  "career",
  "learning",
  "environment",
  "creativity",
  "fun",
  "community",
  "rest",
  "identity",
];

const DIMENSION_TO_ZONE: Record<string, ZoneId> = {
  physical: "physical",
  emotional: "mental",
  mental: "mental",
  social: "relationships",
  spiritual: "spiritual",
  environmental: "environment",
  occupational: "career",
  intellectual: "learning",
  financial: "financial",
};

function scoreToZoneState(score?: number | null): { level: number; trend: string } {
  const level = Math.max(1, Math.min(5, Math.round(score ?? 2)));
  if (level <= 2) return { level, trend: "dim" };
  if (level === 3) return { level, trend: "flickering" };
  if (level === 4) return { level, trend: "bright" };
  return { level, trend: "radiant" };
}

function takeStrings(values: string[] | null | undefined): string[] {
  return Array.isArray(values)
    ? values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
    : [];
}

function parseInterests(input: {
  deepDives?: string[] | null;
  currentObsessions?: string[] | null;
  popCulture?: string[] | null;
  spiritualCuriosity?: string[] | null;
  traditions?: string[] | null;
}): CompanionContext["interests"] {
  const spiritualCuriosity = takeStrings(input.spiritualCuriosity);

  return {
    deepDives: takeStrings(input.deepDives).slice(0, 4),
    currentObsessions: takeStrings(input.currentObsessions).slice(0, 4),
    popCulture: takeStrings(input.popCulture).slice(0, 4),
    spiritualCuriosity: (spiritualCuriosity.length > 0 ? spiritualCuriosity : takeStrings(input.traditions)).slice(0, 4),
  };
}

export async function buildCompanionContext(
  userId: string,
  options?: { useAstrologyInGuidance?: boolean },
): Promise<CompanionContext> {
  const [chart, assessments, interestsRow, wellnessPreferences, onboardingProfile, goals] = await Promise.all([
    storage.getBirthChart(userId),
    storage.getLifeDimensionAssessments(userId),
    storage.getUserInterests(userId),
    storage.getWellnessPreferences(userId),
    storage.getOnboardingProfile(userId),
    storage.getGoals(userId),
  ]);

  const birthPlace = [chart?.birthCity, chart?.birthState, chart?.birthCountry].filter(Boolean).join(", ");
  const energy = calculateEnergyCurrents({
    birthDate: chart?.birthDate,
    birthTime: chart?.birthTime,
    birthPlace,
  });

  const zones = Object.fromEntries(
    DEFAULT_ZONES.map((zone) => [zone, { level: 2, trend: "dim" }]),
  ) as CompanionContext["zones"];
  const seenZones = new Set<ZoneId>();

  assessments.forEach((row) => {
    const zone = DIMENSION_TO_ZONE[(row.dimension ?? "").toLowerCase()];
    if (!zone || seenZones.has(zone)) return;
    seenZones.add(zone);
    zones[zone] = {
      ...scoreToZoneState(row.score),
      lastAction: goals.find((goal) => (goal.wellnessDimension ?? "").toLowerCase() === row.dimension.toLowerCase())?.title,
    };
  });

  if (zones.community.trend === "dim") zones.community = { level: 3, trend: "flickering" };
  if (zones.fun.trend === "dim") zones.fun = { level: 3, trend: "flickering" };
  if (zones.rest.trend === "dim") zones.rest = { level: zones.physical.level, trend: zones.physical.trend };
  if (zones.identity.trend === "dim") zones.identity = { level: zones.mental.level, trend: zones.mental.trend };
  if (zones.creativity.trend === "dim") zones.creativity = { level: zones.learning.level, trend: zones.learning.trend };

  const useAstrologyInGuidance = options?.useAstrologyInGuidance ?? Boolean(wellnessPreferences?.useAstrologyInGuidance);

  return {
    currents: energy.currents,
    energyType: energy.energyType,
    decisionCompass: energy.decisionCompass,
    zones,
    cosmicWeather: {
      activeCurrents: useAstrologyInGuidance ? energy.activeCurrents : [],
      moonPhase: useAstrologyInGuidance ? energy.moonPhase : null,
    },
    interests: parseInterests({
      deepDives: interestsRow?.deepDives,
      currentObsessions: interestsRow?.currentObsessions,
      popCulture: interestsRow?.popCulture,
      spiritualCuriosity: interestsRow?.spiritualCuriosity,
      traditions: wellnessPreferences?.traditions,
    }),
    patterns: {
      bestDecisionTime: onboardingProfile?.peakMotivationTime ?? undefined,
      energyCrashRisk: zones.rest.level <= 2 ? "high" : zones.rest.level === 3 ? "medium" : "low",
    },
  };
}

export function companionContextPromptBlock(context: CompanionContext): string {
  return [
    "COMPANION CONTEXT (Energy Blueprint)",
    `Energy Type: ${context.energyType}`,
    `Decision Compass: ${context.decisionCompass}`,
    `Currents: ${Object.entries(context.currents)
      .map(([name, state]) => `${name}:${state}`)
      .join(", ")}`,
    `Zones: ${Object.entries(context.zones)
      .map(([zone, value]) => `${zone}:${value.trend}(${value.level})`)
      .join(", ")}`,
    context.cosmicWeather.moonPhase
      ? `Cosmic Weather: moon=${context.cosmicWeather.moonPhase}; active=${context.cosmicWeather.activeCurrents.join(", ") || "none"}`
      : "Cosmic Weather: off",
    `Interests: deepDives=${context.interests.deepDives.join(", ") || "none"}; obsessions=${context.interests.currentObsessions.join(", ") || "none"}; popCulture=${context.interests.popCulture.join(", ") || "none"}`,
    "WIRING EXAMPLES:",
    "- Gut Current: e.g., You said yes to plans but your stomach clenched.",
    "- Wave Current: e.g., You decided while excited, then regretted it next day.",
    "- Spark Current: e.g., You ignored a flash of 'don't trust this' and later found out why.",
  ].join("\n");
}
