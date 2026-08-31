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
  cosmicWeather: { activeCurrents: string[]; moonPhase: string };
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

function parseInterests(profile: any): CompanionContext["interests"] {
  const interests = Array.isArray(profile?.interests)
    ? profile.interests.filter((v: unknown): v is string => typeof v === "string" && v.trim().length > 0)
    : [];

  return {
    deepDives: interests.slice(0, 4),
    currentObsessions: interests.slice(4, 8),
    popCulture: [],
    spiritualCuriosity: Array.isArray(profile?.traditions) ? profile.traditions.slice(0, 4) : [],
  };
}

export async function buildCompanionContext(userId: string): Promise<CompanionContext> {
  const [chart, assessments, profile, goals] = await Promise.all([
    storage.getBirthChart(userId),
    storage.getLifeDimensionAssessments(userId),
    storage.getUserProfile(userId),
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

  assessments.forEach((row) => {
    const zone = DIMENSION_TO_ZONE[(row.dimension ?? "").toLowerCase()];
    if (!zone) return;
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

  return {
    currents: energy.currents,
    energyType: energy.energyType,
    decisionCompass: energy.decisionCompass,
    zones,
    cosmicWeather: {
      activeCurrents: energy.activeCurrents,
      moonPhase: energy.moonPhase,
    },
    interests: parseInterests(profile),
    patterns: {
      bestDecisionTime: (profile as any)?.peakFocusTime ?? (profile as any)?.peakMotivationTime ?? undefined,
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
    `Cosmic Weather: moon=${context.cosmicWeather.moonPhase}; active=${context.cosmicWeather.activeCurrents.join(", ") || "none"}`,
    `Interests: deepDives=${context.interests.deepDives.join(", ") || "none"}; obsessions=${context.interests.currentObsessions.join(", ") || "none"}; popCulture=${context.interests.popCulture.join(", ") || "none"}`,
    "WIRING EXAMPLES:",
    "- Gut Current: e.g., You said yes to plans but your stomach clenched.",
    "- Wave Current: e.g., You decided while excited, then regretted it next day.",
    "- Spark Current: e.g., You ignored a flash of 'don't trust this' and later found out why.",
  ].join("\n");
}
