/**
 * companion-context.ts
 *
 * Builds the CompanionContext that gets injected into every DW AI prompt.
 * This gives DW awareness of the user's Zones, Currents, energy type, and
 * cosmic conditions — so responses reference specific wiring, not generic advice.
 */

import { db } from "../db";
import { sql } from "drizzle-orm";

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
  /** Current cosmic/energetic conditions */
  cosmicWeather: {
    activeCurrents: string[];
    phase: string;
    note: string;
  };
}

// ── Zone → Current mapping ────────────────────────────────────────────────────

const ZONE_PRIMARY_CURRENT: Record<ZoneId, CurrentType> = {
  physical:      "Drive",
  mental:        "Mind",
  spiritual:     "Light",
  financial:     "Will",
  relationships: "Wave",
  career:        "Will",
  learning:      "Spark",
  environment:   "Flow",
  creativity:    "Spark",
  fun:           "Gut",
  community:     "Flow",
  rest:          "Wave",
  identity:      "Mind",
};

// ── Builder ───────────────────────────────────────────────────────────────────

/**
 * Builds a CompanionContext for a given userId.
 * Falls back gracefully if data is unavailable — DW degrades to generic
 * context rather than crashing.
 */
export async function buildCompanionContext(userId: number): Promise<CompanionContext> {
  const empty: CompanionContext = {
    zones: {},
    currents: {},
    energyType: null,
    interests: { deepDives: [], currentObsessions: [], popCulture: [] },
    cosmicWeather: { activeCurrents: [], phase: "unknown", note: "" },
  };

  if (!userId) return empty;

  try {
    // ── Pull what the DB has ─────────────────────────────────────────────────
    // Zone states (stored as user_zone_states or dimension data)
    let zoneRows: Array<{ zone_id: string; level: number; trend: string }> = [];
    let profileRow: {
      energy_type?: string;
      currents?: string;
      interests?: string;
    } | null = null;

    try {
      const result = await db.execute(
        sql`SELECT zone_id,
               COALESCE(level, 50) AS level,
               COALESCE(trend, 'stable') AS trend
            FROM user_zone_states
            WHERE user_id = ${userId}`
      );
      zoneRows = (result.rows ?? []) as typeof zoneRows;
    } catch {
      // Table may not exist yet — silently skip
    }

    try {
      const result = await db.execute(
        sql`SELECT energy_type,
               currents_json AS currents,
               interests_json AS interests
            FROM user_wiring_profiles
            WHERE user_id = ${userId}
            LIMIT 1`
      );
      const rows = (result.rows ?? []) as Array<{
        energy_type?: string;
        currents?: string;
        interests?: string;
      }>;
      profileRow = rows[0] ?? null;
    } catch {
      // Table may not exist yet — silently skip
    }

    // ── Build zones map ──────────────────────────────────────────────────────
    const zones: Partial<Record<ZoneId, ZoneState>> = {};
    for (const row of zoneRows) {
      const id = row.zone_id as ZoneId;
      if (!ZONE_PRIMARY_CURRENT[id]) continue;
      zones[id] = {
        level: Number(row.level),
        trend: (row.trend as "rising" | "falling" | "stable") ?? "stable",
        current: ZONE_PRIMARY_CURRENT[id],
      };
    }

    // ── Build currents map ───────────────────────────────────────────────────
    let currents: Partial<Record<CurrentType, CurrentReliability>> = {};
    if (profileRow?.currents) {
      try {
        currents = JSON.parse(profileRow.currents);
      } catch {
        // ignore parse errors
      }
    }

    // ── Energy type ──────────────────────────────────────────────────────────
    const validTypes: EnergyType[] = ["Builder", "Guide", "Initiator", "Observer"];
    const rawType = profileRow?.energy_type ?? "";
    const energyType = validTypes.includes(rawType as EnergyType)
      ? (rawType as EnergyType)
      : null;

    // ── Interests ────────────────────────────────────────────────────────────
    let interests = empty.interests;
    if (profileRow?.interests) {
      try {
        interests = JSON.parse(profileRow.interests);
      } catch {
        // ignore parse errors
      }
    }

    return {
      zones,
      currents,
      energyType,
      interests,
      cosmicWeather: { activeCurrents: [], phase: "unknown", note: "" },
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
    lines.push(`Deep interests: ${ctx.interests.deepDives.join(", ")}`);
  if (ctx.interests.currentObsessions.length)
    lines.push(`Current obsessions: ${ctx.interests.currentObsessions.join(", ")}`);

  if (!lines.length) return "";

  return `\n--- Companion Context ---\n${lines.join("\n")}\n---`;
}
