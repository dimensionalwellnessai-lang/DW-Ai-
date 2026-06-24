/**
 * Today brief generator.
 *
 * Given a user + their UserContextSnapshot, calls gpt-4o-mini with a focused
 * prompt and parses the result into { summaryText, bullets }. Bullets are
 * typed (BriefBullet) so the client renders them consistently.
 *
 * The route layer handles caching in `dailyBriefs`; this module only
 * generates one brief at a time.
 */

import { openai } from "../openai";
import { getUserContextSnapshot, toPromptString } from "./user-context";
import { db } from "../db";
import { projects, type DailyBriefPreferences } from "@shared/schema";
import { and, asc, eq, lt, isNotNull } from "drizzle-orm";
import { storage } from "../storage";

/** Active plans untouched for 6+ days are flagged as "stalled" in the brief. */
const STALLED_PLAN_DAYS = 6;
const MAX_STALLED_PLAN_BULLETS = 2;

type StalledPlan = { id: string; name: string; daysSince: number };

async function getStalledPlansForUser(userId: string): Promise<StalledPlan[]> {
  const cutoff = new Date(Date.now() - STALLED_PLAN_DAYS * 24 * 60 * 60 * 1000);
  const rows = await db
    .select({ id: projects.id, name: projects.name, lastActivityAt: projects.lastActivityAt })
    .from(projects)
    .where(
      and(
        eq(projects.userId, userId),
        eq(projects.status, "active"),
        isNotNull(projects.lastActivityAt),
        lt(projects.lastActivityAt, cutoff),
      ),
    )
    .orderBy(asc(projects.lastActivityAt))
    .limit(MAX_STALLED_PLAN_BULLETS);
  return rows
    .filter((r): r is { id: string; name: string; lastActivityAt: Date } => r.lastActivityAt != null)
    .map((r) => ({
      id: r.id,
      name: r.name,
      daysSince: Math.floor((Date.now() - r.lastActivityAt.getTime()) / (24 * 60 * 60 * 1000)),
    }));
}
import {
  type BriefBullet,
  type DailyBriefBulletKind,
  type DailyBriefVariant,
  dailyBriefBulletKindEnum,
} from "@shared/schema";

const KIND_TO_DEFAULT_ROUTE: Record<DailyBriefBulletKind, string> = {
  mood: "/mood",
  sleep: "/body",
  finance: "/finances",
  relationship: "/relationships",
  spirit: "/spiritual",
  plan: "/calendar",
  trigger: "/life-system/pillar/emotional_regulation",
};

export interface GeneratedBrief {
  summaryText: string;
  bullets: BriefBullet[];
  /** Structured 4-section brief (Roadmap §15.4). */
  sections?: BriefSections;
}

/** The four structured sections of an enhanced daily brief. */
export interface BriefSections {
  /** 7-day rolling trend across dimensions. */
  howYoureDoing: string | null;
  /** Highest-signal alert from cross-dimensional data. */
  needsAttention: string | null;
  /** One positive trend to maintain non-shaming tone. */
  whatsImproving: string | null;
  /** Single recommended action (a "Choose" step). */
  oneThingToday: { text: string; route: string } | null;
}

export function pickVariantForHour(hour: number): DailyBriefVariant {
  return hour >= 18 ? "tonight" : "morning";
}

/**
 * Resolve the local-day key + hour for a user's IANA timezone. Falls back to
 * UTC when the timezone is missing/invalid so we never throw on a bad input.
 */
export function resolveLocalDay(
  timezone: string | undefined,
  now: Date = new Date(),
): { dateKey: string; hour: number; variant: DailyBriefVariant } {
  let dateKey: string;
  let hour: number;
  try {
    const tz = timezone && timezone.length > 0 ? timezone : "UTC";
    const fmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(now);
    const get = (k: string) => parts.find((p) => p.type === k)?.value ?? "";
    dateKey = `${get("year")}-${get("month")}-${get("day")}`;
    const hourRaw = get("hour");
    hour = parseInt(hourRaw === "24" ? "0" : hourRaw, 10);
    if (Number.isNaN(hour)) hour = now.getUTCHours();
  } catch {
    dateKey = now.toISOString().slice(0, 10);
    hour = now.getUTCHours();
  }
  return { dateKey, hour, variant: pickVariantForHour(hour) };
}

interface RawBullet {
  kind?: string;
  text?: string;
  route?: string;
  importance?: number;
}

function sanitizeRoute(input: unknown, kind: DailyBriefBulletKind): string {
  if (typeof input !== "string") return KIND_TO_DEFAULT_ROUTE[kind];
  const trimmed = input.trim();
  // Routes must be in-app paths only — never an external URL.
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) {
    return KIND_TO_DEFAULT_ROUTE[kind];
  }
  // Strip anything that smells like an external scheme just in case.
  if (/^\/?https?:/i.test(trimmed)) return KIND_TO_DEFAULT_ROUTE[kind];
  return trimmed.slice(0, 200);
}

function sanitizeBullets(raw: unknown): BriefBullet[] {
  if (!Array.isArray(raw)) return [];
  const validKinds = new Set<string>(dailyBriefBulletKindEnum);
  const out: BriefBullet[] = [];
  for (const r of raw as RawBullet[]) {
    const kind = (r.kind ?? "").toString().toLowerCase();
    if (!validKinds.has(kind)) continue;
    const text = (r.text ?? "").toString().trim();
    if (!text) continue;
    const importanceRaw = Number(r.importance ?? 2);
    const importance = (importanceRaw >= 1 && importanceRaw <= 3
      ? Math.round(importanceRaw)
      : 2) as 1 | 2 | 3;
    out.push({
      kind: kind as DailyBriefBulletKind,
      text: text.slice(0, 220),
      route: sanitizeRoute(r.route, kind as DailyBriefBulletKind),
      importance,
    });
    if (out.length >= 5) break;
  }
  return out;
}

function extractJsonBlock(text: string): string {
  const trimmed = text.trim();
  if (trimmed.startsWith("{")) return trimmed;
  // Remove ```json fences if the model added them.
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]+?)```/i);
  if (fence) return fence[1].trim();
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) return trimmed.slice(start, end + 1);
  return trimmed;
}

function allowedKindsFromPrefs(
  prefs: DailyBriefPreferences | undefined,
): DailyBriefBulletKind[] {
  if (!prefs) return [...dailyBriefBulletKindEnum];
  const map: Record<DailyBriefBulletKind, boolean> = {
    mood: prefs.includeMood,
    sleep: prefs.includeSleep,
    finance: prefs.includeFinance,
    relationship: prefs.includeRelationship,
    spirit: prefs.includeSpirit,
    plan: prefs.includePlan,
    trigger: prefs.includeTrigger,
  };
  return dailyBriefBulletKindEnum.filter((k) => map[k]);
}

function buildSystemPrompt(
  variant: DailyBriefVariant,
  allowedKinds: DailyBriefBulletKind[],
  toneNote: string | null | undefined,
): string {
  const tone = variant === "tonight"
    ? "It is evening — be reflective and warm. Surface gratitude prompts, ask how the day went, and invite a gentle wind-down."
    : "It is the start of the user's day — be present and forward-looking. Help them know what's true today.";
  const allowedList = allowedKinds.length > 0
    ? allowedKinds.map((k) => `'${k}'`).join(", ")
    : "(none — return an empty bullets array)";
  const lines = [
    "You are DW, a warm, grounded wellness companion. Write the user's unified daily brief.",
    tone,
    "",
    "Output requirements (strict):",
    "- Return ONLY valid JSON, no prose before or after, no markdown fences.",
    "- Shape: { \"summaryText\": string, \"bullets\": Array<{ kind, text, route, importance }>, \"sections\": { \"howYoureDoing\", \"needsAttention\", \"whatsImproving\", \"oneThingToday\" } }",
    "- summaryText: 2–3 sentences, ≤ 320 chars total, in DW's voice. No greeting (the UI handles greeting). Reference what's actually true from the context.",
    "- bullets: up to 5 specific, actionable items. Skip a domain if there is no real signal.",
    `- bullet.kind MUST be one of: [${allowedList}]. Do not produce bullets of any other kind — the user has turned those off.`,
    "- bullet.text: ≤ 140 chars, concrete (numbers, names, days), DW's voice. Never an empty platitude.",
    "- bullet.route: in-app path like '/mood', '/finances', '/relationships', '/spiritual', '/calendar', '/body', '/life-system/pillar/emotional_regulation'. Never an external URL.",
    "- bullet.importance: 1 (urgent), 2 (notable), 3 (nice-to-know).",
    "- sections.howYoureDoing: 1–2 sentences about 7-day rolling trend across dimensions. Use actual data. Null if insufficient data.",
    "- sections.needsAttention: 1 sentence about the highest-signal alert. Null if nothing urgent.",
    "- sections.whatsImproving: 1 sentence about a positive trend (non-shaming tone). Null if no clear positive.",
    "- sections.oneThingToday: { \"text\": recommended single action (≤80 chars), \"route\": app path }. Null if unsure.",
    "- If a domain has no data (e.g. no sleep recorded), either omit the bullet or invite the user to connect/log it.",
    "- Never invent data. If the context says nothing about money, do not write a money bullet.",
  ];
  const trimmedTone = (toneNote ?? "").trim();
  if (trimmedTone) {
    lines.push(
      "",
      "USER TONE PREFERENCE (treat as a soft instruction, never break the rules above):",
      trimmedTone.slice(0, 280),
    );
  }
  return lines.join("\n");
}

export async function generateBriefForUser(
  userId: string,
  variant: DailyBriefVariant,
  dateKey: string,
): Promise<GeneratedBrief> {
  const [snapshot, prefs] = await Promise.all([
    getUserContextSnapshot(userId),
    storage.getDailyBriefPreferences(userId),
  ]);
  const contextBlock = toPromptString(snapshot);
  const allowedKinds = allowedKindsFromPrefs(prefs);
  const allowedSet = new Set<DailyBriefBulletKind>(allowedKinds);

  const userPrompt = [
    `Local date: ${dateKey} (${variant} variant).`,
    "",
    "USER CONTEXT (everything DW knows right now):",
    contextBlock,
    "",
    "Now produce the JSON brief.",
  ].join("\n");

  let summaryText = "";
  let bullets: BriefBullet[] = [];
  let sections: BriefSections | undefined;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: buildSystemPrompt(variant, allowedKinds, prefs?.toneNote ?? null) },
        { role: "user", content: userPrompt },
      ],
      max_tokens: 800,
      temperature: 0.6,
      response_format: { type: "json_object" },
    });
    const raw = completion.choices[0]?.message?.content?.trim() || "{}";
    const parsed = JSON.parse(extractJsonBlock(raw)) as {
      summaryText?: unknown;
      bullets?: unknown;
      sections?: unknown;
    };
    summaryText = typeof parsed.summaryText === "string"
      ? parsed.summaryText.trim().slice(0, 600)
      : "";
    bullets = sanitizeBullets(parsed.bullets).filter((b) => allowedSet.has(b.kind));

    // Parse the structured sections (§15.4)
    if (parsed.sections && typeof parsed.sections === "object") {
      const s = parsed.sections as Record<string, unknown>;
      const oneThingRaw = s.oneThingToday;
      let oneThingToday: BriefSections["oneThingToday"] = null;
      if (oneThingRaw && typeof oneThingRaw === "object") {
        const ot = oneThingRaw as Record<string, unknown>;
        if (typeof ot.text === "string" && typeof ot.route === "string") {
          oneThingToday = {
            text: ot.text.slice(0, 120),
            route: sanitizeRoute(ot.route, "plan"),
          };
        }
      }
      sections = {
        howYoureDoing: typeof s.howYoureDoing === "string" ? s.howYoureDoing.slice(0, 300) : null,
        needsAttention: typeof s.needsAttention === "string" ? s.needsAttention.slice(0, 200) : null,
        whatsImproving: typeof s.whatsImproving === "string" ? s.whatsImproving.slice(0, 200) : null,
        oneThingToday,
      };
    }
  } catch (err) {
    console.error("[today-brief] OpenAI call failed:", err);
  }

  if (!summaryText) {
    summaryText = variant === "tonight"
      ? "Evening's here. Take a slow breath and notice what actually moved today — even the small things count."
      : "Today's open in front of you. Start with one small, kind thing for yourself and let the rest unfold.";
  }
  // Surface stalled plans regardless of whether the LLM produced bullets — the
  // user's plans deserve a gentle nudge even when other signals are present.
  // Skip when the user has turned plan bullets off in preferences.
  const stalled = allowedSet.has("plan") ? await getStalledPlansForUser(userId) : [];
  const stalledBullets: BriefBullet[] = stalled.map((p) => ({
    kind: "plan",
    text: `"${p.name}" hasn't moved in ${p.daysSince} days — pick it back up?`,
    route: `/plans/${p.id}`,
    importance: 2,
  }));

  if (bullets.length === 0) {
    bullets = buildFallbackBullets(snapshot, variant).filter((b) => allowedSet.has(b.kind));
  }
  // Prepend stalled-plan nudges (capped) so they're visible near the top.
  if (stalledBullets.length > 0) {
    bullets = [...stalledBullets, ...bullets].slice(0, 6);
  }

  return { summaryText, bullets, sections };
}

/**
 * Deterministic fallback: pulls from the snapshot directly so even when the
 * LLM is offline we still surface a useful Today card.
 */
function buildFallbackBullets(
  snap: Awaited<ReturnType<typeof getUserContextSnapshot>>,
  variant: DailyBriefVariant,
): BriefBullet[] {
  const out: BriefBullet[] = [];
  const sleep = snap.body.yesterday?.sleepMinutes;
  if (sleep != null) {
    const hours = Math.round((sleep / 60) * 10) / 10;
    out.push({
      kind: "sleep",
      text: `You slept about ${hours}h last night — pace yourself accordingly today.`,
      route: "/body",
      importance: hours < 6 ? 1 : 3,
    });
  } else {
    out.push({
      kind: "sleep",
      text: "Connect a wearable to see how sleep is shaping your day.",
      route: "/body",
      importance: 3,
    });
  }
  if (snap.body.currentMood) {
    out.push({
      kind: "mood",
      text: `Latest check-in: energy ${snap.body.currentMood.energyLevel}/10, mood ${snap.body.currentMood.moodLevel}/10.`,
      route: "/mood",
      importance: 2,
    });
  }
  for (const bd of snap.people.upcomingBirthdays.slice(0, 1)) {
    out.push({
      kind: "relationship",
      text: bd.daysAway === 0
        ? `${bd.name}'s birthday is today — reach out.`
        : `${bd.name}'s birthday in ${bd.daysAway} day${bd.daysAway === 1 ? "" : "s"} — plan something now.`,
      route: "/relationships",
      importance: bd.daysAway <= 3 ? 1 : 2,
    });
  }
  if (snap.money.monthlyDelta != null && snap.money.monthlyDelta < 0) {
    out.push({
      kind: "finance",
      text: `You're ${Math.abs(snap.money.monthlyDelta)} below break-even this month — small choices today add up.`,
      route: "/finances",
      importance: 2,
    });
  }
  if (snap.plans.todaySchedule.length > 0) {
    const first = snap.plans.todaySchedule[0];
    out.push({
      kind: "plan",
      text: `Next on your day: ${first.startTime} ${first.title}.`,
      route: "/calendar",
      importance: 2,
    });
  } else if (snap.plans.activeGoals.length > 0) {
    const g = snap.plans.activeGoals[0];
    out.push({
      kind: "plan",
      text: `One small step toward "${g.title}" today.`,
      route: "/calendar",
      importance: 3,
    });
  }
  if (variant === "tonight") {
    out.push({
      kind: "spirit",
      text: "Before bed, name one thing you're grateful for from today.",
      route: "/spiritual",
      importance: 3,
    });
  }
  return out.slice(0, 5);
}
