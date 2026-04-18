// Typed shapes for the JSONB `content` blob on life_system_pillars and the
// jsonb `content` on life_system_documents.
//
// We keep these intentionally tolerant: the backend stores arbitrary
// user-supplied prose plus a few well-known fields (laws, weeklyRhythm,
// userVoice, etc.). These types let the UI/server consume the well-known
// fields safely without `any` casts, while still allowing extra extras.
import { z } from "zod";
import type { LifeSystemPillarId } from "./lifeSystemTaxonomy";

// ─── Pillar content ───────────────────────────────────────────────────────
export interface PillarContent {
  /** Long-form description of how this pillar works in the user's life. */
  description?: string;
  /** The user's own words captured during onboarding. */
  userVoice?: string;
  /** Pillar-level laws/principles (Foundation also stores Foundation Laws here). */
  laws?: string[];
  /** What's "non-negotiable" for this pillar (e.g. workouts/week). */
  nonNegotiables?: string[];
  /** Plain-text rhythm summary (e.g. "lift M/W/F, run T/Th"). */
  weeklyRhythm?: string;
  /** Free-form key/value extras (anchor practices, references, etc.). */
  extras?: Record<string, string | string[]>;

  // ── Foundation-only headline sections ──
  identityStatement?: string;
  weeklyNonNegotiables?: string[];
  minimumDayChecklist?: string[];
  commandments?: string[];
  finalStatement?: string;

  /** Last 20 messages of "Talk to DW about this pillar" chat. */
  conversation?: PillarConversationMessage[];
}

export interface PillarConversationMessage {
  role: "user" | "assistant";
  content: string;
  ts: string;
}

export const pillarConversationMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string(),
  ts: z.string(),
});

export const pillarContentSchema: z.ZodType<PillarContent> = z.object({
  description: z.string().optional(),
  userVoice: z.string().optional(),
  laws: z.array(z.string()).optional(),
  nonNegotiables: z.array(z.string()).optional(),
  weeklyRhythm: z.string().optional(),
  extras: z.record(z.string(), z.union([z.string(), z.array(z.string())])).optional(),
  identityStatement: z.string().optional(),
  weeklyNonNegotiables: z.array(z.string()).optional(),
  minimumDayChecklist: z.array(z.string()).optional(),
  commandments: z.array(z.string()).optional(),
  finalStatement: z.string().optional(),
  conversation: z.array(pillarConversationMessageSchema).optional(),
});

// ─── Document content (the rendered Life System Document) ─────────────────
export interface PillarSection {
  id: LifeSystemPillarId | string;
  label: string;
  level: "core" | "expression" | "creation";
  icon: string;
  enabled: boolean;
  description: string;
  userVoice?: string;
  laws: string[];
  weeklyRhythm?: string;
}

export interface ProjectSection {
  name: string;
  description: string | null;
  currentFocus: string | null;
  weeklyCadence: string | null;
  nextAction: string | null;
  status: string | null;
}

export interface LifeSystemDocumentContent {
  title: string;
  subtitle: string;
  identityStatement: string;
  foundationLaws: string[];
  corePillars: PillarSection[];
  expressionPillars: PillarSection[];
  projects: ProjectSection[];
  weeklyNonNegotiables: string[];
  minimumDayChecklist: string[];
  commandments: string[];
  finalStatement: string;
  generatedAt: string;
}
