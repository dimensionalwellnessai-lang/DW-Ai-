/**
 * DW Adaptive Role Picker.
 *
 * Picks the best DW mode for the user's current message + life snapshot.
 * Two-stage: a cheap deterministic rules pass for obvious cases, and an
 * LLM fallback (gpt-4o-mini, JSON mode) for the ambiguous middle.
 *
 * Designed to never block the response — callers run this in parallel with
 * their actual chat completion and either pre-apply the picked addendum or
 * surface the result to the client for the next turn.
 */

import { openai } from "../openai";
import {
  DW_MODES,
  type DWMode,
  getDWMode,
} from "@shared/dw-persona";
import type { UserContextSnapshot } from "./user-context";

export interface PickedRole {
  mode: DWMode;
  confidence: number; // 0..1
  reason: string;
  source: "rules" | "llm" | "fallback";
}

/** Confidence floor at which the picker's choice should override the current mode. */
export const PICKER_APPLY_THRESHOLD = 0.6;

// ─── Rules pass ──────────────────────────────────────────────────────────────

interface RuleHit {
  mode: DWMode;
  reason: string;
  /** How decisive this rule is — informs confidence reported back. */
  weight: number;
}

const RULE_TABLE: Array<{ mode: DWMode; pattern: RegExp; reason: string; weight?: number }> = [
  // Trainer — workout / movement
  { mode: "trainer", pattern: /\b(workout|reps?|sets?|deadlift|squat|bench|push[- ]?ups?|cardio|run(ning)?|gym|lift(ing)?|warm[- ]?up|cooldown|mobility|stretch(ing)?|hiit|tempo|pr|max\s*effort)\b/i, reason: "training language" },
  // Nutritionist — food / fueling
  { mode: "nutritionist", pattern: /\b(eat|meal|breakfast|lunch|dinner|snack|recipe|protein|calories?|carbs?|fats?|macros?|hydrat\w+|recovery\s*meal|pre[- ]?workout|post[- ]?workout|grocery|grocer|fueling|fuel\s*for)\b/i, reason: "food / fueling" },
  // Liaison — people / relationships
  { mode: "liaison", pattern: /\b(my\s+(wife|husband|partner|girlfriend|boyfriend|mom|dad|mother|father|sister|brother|son|daughter|kid|kids|child|friend|coworker|boss|teammate)|she\s+(said|did|won't|wouldn't)|he\s+(said|did|won't|wouldn't)|fight\s+with|argument|relationship|texting|ghosted|ignored\s+me)\b/i, reason: "people in their life" },
  // Concierge — recommendations / errands
  { mode: "concierge", pattern: /\b(recommend|recs?|where\s+(can|should)\s+i|what's\s+a\s+good|best\s+place|find\s+me\s+a|book\s+(a|me)|reservation|errand|how\s+do\s+i\s+(get|go|fix|order|return|cancel))\b/i, reason: "recs / errands / how-do-I" },
  // Assistant — schedule/draft/logistics
  { mode: "assistant", pattern: /\b(schedule|reschedule|put\s+on\s+(my\s+)?calendar|add\s+to\s+(my\s+)?calendar|remind\s+me|set\s+a?\s*reminder|draft\s+(an?|the)\s+(email|message|reply|text)|send\s+(an?|a)\s+(email|message|invite)|move\s+my|cancel\s+my|rsvp)\b/i, reason: "scheduling / drafting / logistics" },
  // Planner — projects / brainstorming
  { mode: "planner", pattern: /\b(plan(ning)?\s+(a|my|the|this)\s+(project|launch|workshop|offsite|trip|event|sprint)|brainstorm|outline\s+(a|the)\s+(plan|project)|kick\s*off|milestones?|roadmap|let'?s\s+plan|help\s+me\s+plan)\b/i, reason: "project / brainstorm" },
  // Perspective — stuck loops / reframes
  { mode: "perspective", pattern: /\b(spiraling|spiraled|stuck\s+in\s+(my\s+)?head|stuck\s+on|catastroph\w+|can'?t\s+stop\s+thinking|overthinking|ruminat\w+|step\s+back|need\s+(a\s+)?reframe|zoom\s+out|loop(ing)?\s+(on|about)|going\s+in\s+circles)\b/i, reason: "stuck loop / needs reframe" },
  // Coach — goals / accountability
  { mode: "coach", pattern: /\b(my\s+goal|hit\s+my\s+goal|hold\s+me\s+(to\s+it|accountable)|stop\s+slacking|non[- ]?negotiable|commit(ment|ted)?|stay\s+on\s+track|fall(ing)?\s+behind)\b/i, reason: "goals / accountability" },
  // Guide — meaning / spiritual
  { mode: "guide", pattern: /\b(meditat\w+|prayer|pray|spirit(ual|uality)?|meaning|purpose|soul|grateful|gratitude|breathwork|grounding|centered|presence)\b/i, reason: "meaning / practice" },
  // Companion — feelings / venting
  { mode: "companion", pattern: /\b(i\s+(feel|felt|am\s+feeling)|i'?m\s+(sad|anxious|scared|lonely|exhausted|burned\s*out|overwhelmed|frustrated|angry)|just\s+need\s+to\s+(vent|talk)|hold\s+space)\b/i, reason: "feelings / venting" },
];

function rulesPass(message: string): RuleHit | null {
  const text = message.trim();
  if (!text) return null;
  // First match wins, but stronger keyword categories appear first in the table.
  for (const rule of RULE_TABLE) {
    if (rule.pattern.test(text)) {
      return { mode: rule.mode, reason: rule.reason, weight: rule.weight ?? 0.85 };
    }
  }
  return null;
}

// ─── LLM fallback ────────────────────────────────────────────────────────────

const MODE_DEFS_FOR_PROMPT = DW_MODES.map(
  (m) => `- ${m.id}: ${m.label} — ${m.short}`,
).join("\n");

function summariseSnapshot(snap?: UserContextSnapshot | null): string {
  if (!snap) return "(no snapshot)";
  const bits: string[] = [];
  bits.push(`time: ${snap.today.timeOfDay}`);
  if (snap.identity.firstName) bits.push(`user: ${snap.identity.firstName}`);
  if (snap.body.currentMood) {
    bits.push(`mood ${snap.body.currentMood.moodLevel}/5 energy ${snap.body.currentMood.energyLevel}/5`);
  }
  if (snap.plans.activeGoals?.length) {
    bits.push(`goals: ${snap.plans.activeGoals.slice(0, 2).map((g) => g.title).join("; ")}`);
  }
  if (snap.triggers?.last7Days) bits.push(`${snap.triggers.last7Days} triggers/7d`);
  return bits.join(" • ");
}

const PICKER_TIMEOUT_MS = 2_500;

async function llmPass(message: string, snap?: UserContextSnapshot | null): Promise<PickedRole | null> {
  try {
    const ctx = summariseSnapshot(snap);
    const completion = await Promise.race([
      openai.chat.completions.create({
        model: "gpt-4o-mini",
        temperature: 0,
        max_tokens: 120,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              "You route a user message to the right DW mode. Return ONLY a JSON object: " +
              `{"mode": one of [${DW_MODES.map((m) => `"${m.id}"`).join(", ")}], "confidence": 0..1, "reason": "<8 words"}.\n` +
              `Modes:\n${MODE_DEFS_FOR_PROMPT}\n` +
              "Be decisive. If the message clearly fits one mode, confidence ≥ 0.8. If it's ambiguous, pick companion with confidence 0.4.",
          },
          {
            role: "user",
            content: `Snapshot: ${ctx}\nMessage: """${message.slice(0, 600)}"""`,
          },
        ],
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("picker timeout")), PICKER_TIMEOUT_MS),
      ),
    ]);

    const raw = (completion as any)?.choices?.[0]?.message?.content;
    if (!raw || typeof raw !== "string") return null;
    const parsed = JSON.parse(raw) as { mode?: string; confidence?: number; reason?: string };
    const mode = getDWMode(parsed.mode);
    const confidence = typeof parsed.confidence === "number"
      ? Math.max(0, Math.min(1, parsed.confidence))
      : 0.5;
    const reason = (parsed.reason || "best fit for this turn").slice(0, 140);
    return { mode, confidence, reason, source: "llm" };
  } catch (err) {
    console.warn("[dw-role-picker] llm pass failed", (err as Error).message);
    return null;
  }
}

// ─── Public API ──────────────────────────────────────────────────────────────

export interface PickRoleOptions {
  /** Skip the LLM fallback (e.g. for synchronous prompt building). */
  rulesOnly?: boolean;
}

export async function pickDWRole(
  message: string,
  snapshot?: UserContextSnapshot | null,
  opts: PickRoleOptions = {},
): Promise<PickedRole> {
  const text = (message || "").trim();
  if (!text) {
    return { mode: "companion", confidence: 0.3, reason: "empty message", source: "fallback" };
  }

  const ruleHit = rulesPass(text);
  // High-confidence rule hit → done.
  if (ruleHit && ruleHit.weight >= 0.8) {
    return { mode: ruleHit.mode, confidence: ruleHit.weight, reason: ruleHit.reason, source: "rules" };
  }

  if (opts.rulesOnly) {
    if (ruleHit) {
      return { mode: ruleHit.mode, confidence: ruleHit.weight, reason: ruleHit.reason, source: "rules" };
    }
    return { mode: "companion", confidence: 0.4, reason: "no clear lane (rules only)", source: "fallback" };
  }

  const llm = await llmPass(text, snapshot);
  if (llm) return llm;
  if (ruleHit) {
    return { mode: ruleHit.mode, confidence: ruleHit.weight, reason: ruleHit.reason, source: "rules" };
  }
  return { mode: "companion", confidence: 0.4, reason: "no clear lane", source: "fallback" };
}

/**
 * Pick an opening role for a brand-new session — used by the realtime
 * route which doesn't have a user message yet. Considers time of day +
 * loose snapshot signals to start in a sensible lane.
 */
export function pickInitialRole(snap?: UserContextSnapshot | null): PickedRole {
  const tod = snap?.today.timeOfDay ?? "morning";
  if (tod === "morning") {
    return { mode: "coach", confidence: 0.6, reason: "morning — set the day", source: "rules" };
  }
  if (tod === "night") {
    return { mode: "guide", confidence: 0.6, reason: "late — wind down", source: "rules" };
  }
  return { mode: "companion", confidence: 0.5, reason: "default opener", source: "fallback" };
}
