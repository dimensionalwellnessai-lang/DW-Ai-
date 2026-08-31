/**
 * Builds the CompanionContext injected into DW prompts.
 *
 * Data is sourced from persisted user records that already exist in the app
 * (birth chart, life-dimension assessments, interests, wellness preferences,
 * onboarding profile, and goals). Each lookup degrades gracefully so user-bound
 * prompts still work when optional records are missing or malformed.
 */
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

interface ZoneContext {
  level: number;
  trend: string;
  lastAction?: string;
}

export interface CompanionContext {
  currents: Record<CurrentType, CurrentState>;
  energyType: EnergyType;
  decisionCompass: DecisionCompass;
  zones: Record<ZoneId, ZoneContext>;
  cosmicWeather: { activeCurrents: string[]; moonPhase: string | null };
  interests: {
    deepDives: string[];
    currentObsessions: string[];
    popCulture: string[];
    spiritualCuriosity: string[];
  };
  patterns: { bestDecisionTime?: string; energyCrashRisk?: string };
  isFallback?: boolean;
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

const CURRENT_TYPES: CurrentType[] = [
  "gut",
  "wave",
  "spark",
  "will",
  "voice",
  "mind",
  "flow",
  "drive",
  "light",
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

const MAX_INTEREST_ITEMS = 4;
const MAX_INTEREST_LENGTH = 120;

function scoreToZoneState(score?: number | null): { level: number; trend: string } {
  const level = Math.max(1, Math.min(5, Math.round(score ?? 2)));
  if (level <= 2) return { level, trend: "dim" };
  if (level === 3) return { level, trend: "flickering" };
  if (level === 4) return { level, trend: "bright" };
  return { level, trend: "radiant" };
}

function normalizeInterestText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s+/g, " ").trim();
  if (!normalized || normalized.length > MAX_INTEREST_LENGTH) return null;
  return normalized;
}

function normalizeStringArray(value: unknown, maxItems = MAX_INTEREST_ITEMS): string[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const items: string[] = [];

  for (const entry of value) {
    const normalized = normalizeInterestText(entry);
    if (!normalized) continue;

    const key = normalized.toLowerCase();
    if (seen.has(key)) continue;

    seen.add(key);
    items.push(normalized);

    if (items.length >= maxItems) break;
  }

  return items;
}

function createDefaultZones(): Record<ZoneId, ZoneContext> {
  return Object.fromEntries(
    DEFAULT_ZONES.map((zone) => [zone, { level: 2, trend: "dim" }]),
  ) as Record<ZoneId, ZoneContext>;
}

function parseInterests(input: {
  deepDives?: unknown;
  currentObsessions?: unknown;
  popCulture?: unknown;
  spiritualCuriosity?: unknown;
  traditions?: unknown;
}): CompanionContext["interests"] {
  const spiritualCuriosity = normalizeStringArray(input.spiritualCuriosity);

  return {
    deepDives: normalizeStringArray(input.deepDives),
    currentObsessions: normalizeStringArray(input.currentObsessions),
    popCulture: normalizeStringArray(input.popCulture),
    spiritualCuriosity: (
      spiritualCuriosity.length > 0
        ? spiritualCuriosity
        : normalizeStringArray(input.traditions)
    ).slice(0, MAX_INTEREST_ITEMS),
  };
}

function serializeUserList(label: string, values: string[]): string | null {
  return values.length ? `${label}: ${JSON.stringify(values)}` : null;
}

export function emptyCompanionContext(): CompanionContext {
  return {
    currents: Object.fromEntries(
      CURRENT_TYPES.map((current) => [current, "open"]),
    ) as Record<CurrentType, CurrentState>,
    energyType: "Builder",
    decisionCompass: "Self",
    zones: createDefaultZones(),
    cosmicWeather: { activeCurrents: [], moonPhase: null },
    interests: {
      deepDives: [],
      currentObsessions: [],
      popCulture: [],
      spiritualCuriosity: [],
    },
    patterns: {},
    isFallback: true,
  };
}

export async function buildCompanionContext(
  userId: string,
  options?: { useAstrologyInGuidance?: boolean },
): Promise<CompanionContext> {
  if (!userId) return emptyCompanionContext();

  const [chart, assessments, interestsRow, wellnessPreferences, onboardingProfile, goals] =
    await Promise.all([
      storage.getBirthChart(userId).catch(() => null),
      storage.getLifeDimensionAssessments(userId).catch(() => []),
      storage.getUserInterests(userId).catch(() => null),
      storage.getWellnessPreferences(userId).catch(() => null),
      storage.getOnboardingProfile(userId).catch(() => null),
      storage.getGoals(userId).catch(() => []),
    ]);

  const birthPlace = [chart?.birthCity, chart?.birthState, chart?.birthCountry]
    .filter(Boolean)
    .join(", ");
  const energy = calculateEnergyCurrents({
    birthDate: chart?.birthDate,
    birthTime: chart?.birthTime,
    birthPlace,
  });

  const zones = createDefaultZones();
  const seenZones = new Set<ZoneId>();

  [...assessments]
    .sort(
      (a, b) =>
        new Date(b.assessedAt ?? 0).getTime() - new Date(a.assessedAt ?? 0).getTime(),
    )
    .forEach((row) => {
      const dimension = (row.dimension ?? "").toLowerCase();
      const zone = DIMENSION_TO_ZONE[dimension];
      if (!zone || seenZones.has(zone)) return;

      seenZones.add(zone);
      zones[zone] = {
        ...scoreToZoneState(row.score),
        lastAction: goals.find(
          (goal) => (goal.wellnessDimension ?? "").toLowerCase() === dimension,
        )?.title,
      };
    });

  if (zones.community.trend === "dim") zones.community = { level: 3, trend: "flickering" };
  if (zones.fun.trend === "dim") zones.fun = { level: 3, trend: "flickering" };
  if (zones.rest.trend === "dim") zones.rest = { level: zones.physical.level, trend: zones.physical.trend };
  if (zones.identity.trend === "dim") zones.identity = { level: zones.mental.level, trend: zones.mental.trend };
  if (zones.creativity.trend === "dim") zones.creativity = { level: zones.learning.level, trend: zones.learning.trend };

  const useAstrologyInGuidance =
    options?.useAstrologyInGuidance ?? Boolean(wellnessPreferences?.useAstrologyInGuidance);

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
      bestDecisionTime: normalizeInterestText(onboardingProfile?.peakMotivationTime) ?? undefined,
      energyCrashRisk: zones.rest.level <= 2 ? "high" : zones.rest.level === 3 ? "medium" : "low",
    },
  };
}

export function companionContextPromptBlock(context: CompanionContext): string {
  if (context.isFallback) return "";

  const lines = [
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
    serializeUserList("Deep interests (user-provided)", context.interests.deepDives),
    serializeUserList("Current obsessions (user-provided)", context.interests.currentObsessions),
    serializeUserList("Pop culture signals (user-provided)", context.interests.popCulture),
    serializeUserList("Spiritual curiosity (user-provided)", context.interests.spiritualCuriosity),
    context.patterns.bestDecisionTime
      ? `Best decision time: ${context.patterns.bestDecisionTime}`
      : null,
    context.patterns.energyCrashRisk
      ? `Energy crash risk: ${context.patterns.energyCrashRisk}`
      : null,
    "WIRING EXAMPLES:",
    "- Gut Current: e.g., You said yes to plans but your stomach clenched.",
    "- Wave Current: e.g., You decided while excited, then regretted it next day.",
    "- Spark Current: e.g., You ignored a flash of 'don't trust this' and later found out why.",
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}

export const serializeCompanionContext = companionContextPromptBlock;
