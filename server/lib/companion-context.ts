/**
 * companion-context.ts
 *
 * Builds the CompanionContext injected into user-bound DW prompts from
 * existing persisted profile data. It must degrade gracefully when optional
 * profile fields are absent or malformed.
 */

import { storage } from "../storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export type ZoneId =
  | "physical" | "mental" | "spiritual" | "financial"
  | "relationships" | "career" | "learning" | "environment"
  | "creativity" | "fun" | "community" | "rest" | "identity";

export type CurrentType =
  | "Gut" | "Wave" | "Spark" | "Will" | "Voice"
  | "Mind" | "Flow" | "Drive" | "Light";

export type CurrentReliability = "hardwired" | "variable" | "open";

export type EnergyType = "Builder" | "Guide" | "Initiator" | "Observer";

export interface ZoneState {
  /** 0–100 energy level */
  level: number;
  /** "rising" | "falling" | "stable" */
  trend: "rising" | "falling" | "stable";
  /** Primary Current powering this Zone */
  current: CurrentType;
}

export interface CompanionContext {
  /** Per-Zone state snapshot */
  zones: Partial<Record<ZoneId, ZoneState>>;
  /** How each Current behaves for this user */
  currents: Partial<Record<CurrentType, CurrentReliability>>;
  /** User's core energy archetype */
  energyType: EnergyType | null;
  /** What the user is genuinely interested in */
  interests: {
    deepDives: string[];
    currentObsessions: string[];
    popCulture: string[];
  };
}

// ── Builder ───────────────────────────────────────────────────────────────────

const MAX_INTEREST_ITEMS = 6;
const MAX_INTEREST_LENGTH = 120;

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

function normalizePreferenceValues(value: unknown): string[] {
  if (Array.isArray(value)) return normalizeStringArray(value, 3);
  const normalized = normalizeInterestText(value);
  return normalized ? [normalized] : [];
}

function mergeUniqueLists(...lists: string[][]): string[] {
  const seen = new Set<string>();
  const items: string[] = [];

  for (const list of lists) {
    for (const entry of list) {
      const key = entry.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      items.push(entry);
      if (items.length >= MAX_INTEREST_ITEMS) return items;
    }
  }

  return items;
}

export function emptyCompanionContext(): CompanionContext {
  const empty: CompanionContext = {
    zones: {},
    currents: {},
    energyType: null,
    interests: { deepDives: [], currentObsessions: [], popCulture: [] },
  };
  return empty;
}

/**
 * Builds a CompanionContext for a given userId.
 * Falls back gracefully if data is unavailable — DW degrades to generic
 * context rather than crashing.
 */
export async function buildCompanionContext(userId: string): Promise<CompanionContext> {
  const empty = emptyCompanionContext();

  if (!userId) return empty;

  try {
    const [userProfile, onboardingProfile] = await Promise.all([
      storage.getUserProfile(userId).catch(() => undefined),
      storage.getOnboardingProfile(userId).catch(() => undefined),
    ]);

    const lifestylePreferences =
      userProfile?.lifestylePreferences &&
      typeof userProfile.lifestylePreferences === "object" &&
      !Array.isArray(userProfile.lifestylePreferences)
        ? userProfile.lifestylePreferences as Record<string, unknown>
        : {};

    const interests = {
      deepDives: mergeUniqueLists(
        normalizeStringArray(onboardingProfile?.curiosityTopics),
        normalizeStringArray(userProfile?.goals),
      ),
      currentObsessions: mergeUniqueLists(
        normalizePreferenceValues(userProfile?.fitnessGoal),
        normalizePreferenceValues(onboardingProfile?.shortTermGoals),
        normalizeStringArray(onboardingProfile?.wellnessFocus),
      ),
      popCulture: mergeUniqueLists(
        normalizePreferenceValues(lifestylePreferences.watchLikes),
        normalizePreferenceValues(lifestylePreferences.musicLikes),
        normalizePreferenceValues(lifestylePreferences.readLikes),
        normalizePreferenceValues(lifestylePreferences.doLikes),
        normalizePreferenceValues(lifestylePreferences.goLikes),
      ),
    };

    return {
      // These richer wiring fields are intentionally left empty until the app
      // persists explicit zone state / current reliability data.
      zones: {},
      currents: {},
      energyType: null,
      interests,
    };
  } catch {
    return empty;
  }
}

// ── Prompt serialiser ─────────────────────────────────────────────────────────

/**
 * Converts a CompanionContext into a concise string block for the DW
 * system prompt. Omitted when context is entirely empty.
 */
export function serializeCompanionContext(ctx: CompanionContext): string {
  const lines: string[] = [];

  if (ctx.energyType) {
    lines.push(`Energy Type: ${ctx.energyType}`);
  }

  const hardwired = Object.entries(ctx.currents)
    .filter(([, r]) => r === "hardwired")
    .map(([c]) => c);
  const variable = Object.entries(ctx.currents)
    .filter(([, r]) => r === "variable")
    .map(([c]) => c);
  const open = Object.entries(ctx.currents)
    .filter(([, r]) => r === "open")
    .map(([c]) => c);

  if (hardwired.length) lines.push(`Hardwired Currents: ${hardwired.join(", ")}`);
  if (variable.length)  lines.push(`Variable Currents: ${variable.join(", ")}`);
  if (open.length)      lines.push(`Open Currents: ${open.join(", ")}`);

  const dimZones = Object.entries(ctx.zones)
    .filter(([, z]) => z.level < 30)
    .map(([id]) => id);
  const brightZones = Object.entries(ctx.zones)
    .filter(([, z]) => z.level >= 70)
    .map(([id]) => id);

  if (dimZones.length)  lines.push(`Dim Zones (need attention): ${dimZones.join(", ")}`);
  if (brightZones.length) lines.push(`Bright Zones (thriving): ${brightZones.join(", ")}`);

  if (ctx.interests.deepDives.length)
    lines.push(`Deep interests (user-provided): ${JSON.stringify(ctx.interests.deepDives)}`);
  if (ctx.interests.currentObsessions.length)
    lines.push(`Current obsessions (user-provided): ${JSON.stringify(ctx.interests.currentObsessions)}`);
  if (ctx.interests.popCulture.length)
    lines.push(`Pop culture signals (user-provided): ${JSON.stringify(ctx.interests.popCulture)}`);

  if (!lines.length) return "";

  return `\n--- Companion Context ---\n${lines.join("\n")}\n---`;
}
