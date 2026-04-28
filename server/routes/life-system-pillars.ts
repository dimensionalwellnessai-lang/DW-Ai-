import type { Express } from "express";
import { z } from "zod";

import { storage } from "../storage";
import { requireAuth } from "./_shared";
import {
  PILLARS,
  PILLAR_BY_ID,
  isValidPillarId,
  LEVEL_META,
  type LifeSystemPillarId,
} from "@shared/lifeSystemTaxonomy";
import { STARTER_TEMPLATE } from "@shared/lifeSystemStarterTemplate";
import {
  insertLifeSystemPillarSchema,
  insertLifeSystemProjectSchema,
} from "@shared/schema";
import { pillarContentSchema, type PillarContent, type PillarConversationMessage, type LifeSystemDocumentContent } from "@shared/lifeSystemContent";
import type {
  LifeSystemBackfillCarriedItem,
  LifeSystemBackfillSummary,
  LifeSystemDailyRhythmPart,
} from "@shared/lifeSystemBackfill";
import { openai } from "../openai";

// ─── Body schemas ──────────────────────────────────────────────────────────
const upsertPillarBody = z.object({
  pillarId: z.string().refine(isValidPillarId, "Unknown pillarId"),
  enabled: z.boolean().optional(),
  content: pillarContentSchema.optional(),
});

const adoptTemplateBody = z.object({
  // When true, wipes existing pillars/projects first. Default keep & merge.
  reset: z.boolean().optional(),
});

const projectBody = insertLifeSystemProjectSchema.omit({ userId: true }).extend({
  status: z.enum(["vision", "active", "paused", "done"]).optional(),
});
type ProjectBody = z.infer<typeof projectBody>;
type ProjectPatch = Partial<ProjectBody>;

// ─── Helpers ───────────────────────────────────────────────────────────────
function pillarSortOrder(pillarId: LifeSystemPillarId): number {
  return PILLARS.findIndex(p => p.id === pillarId);
}

/**
 * Build the starter content blob for a single pillar, including the headline
 * sections that only Foundation carries.
 */
function buildStarterPillarContent(pillarId: LifeSystemPillarId): PillarContent {
  const def = PILLAR_BY_ID[pillarId];
  const starter = STARTER_TEMPLATE.pillars[pillarId];
  const content: PillarContent = {
    description: starter?.description ?? def.summary,
    ...(starter?.laws ? { laws: starter.laws } : {}),
    ...(starter?.nonNegotiables ? { nonNegotiables: starter.nonNegotiables } : {}),
    ...(starter?.weeklyRhythm ? { weeklyRhythm: starter.weeklyRhythm } : {}),
    ...(starter?.extras ? { extras: starter.extras as Record<string, string | string[]> } : {}),
  };
  if (pillarId === "foundation") {
    content.identityStatement = STARTER_TEMPLATE.identityStatement;
    content.weeklyNonNegotiables = STARTER_TEMPLATE.weeklyNonNegotiables;
    content.minimumDayChecklist = STARTER_TEMPLATE.minimumDayChecklist;
    content.commandments = STARTER_TEMPLATE.commandments;
    content.finalStatement = STARTER_TEMPLATE.finalStatement;
  }
  return content;
}

/**
 * Best-effort mapping from legacy onboarding-profile fields onto the new
 * three-level pillar shape. Only adds well-known overrides; the rest of each
 * pillar stays on the Starter Template defaults.
 */
function buildLegacyOverrides(
  profile: { lifeAreaDetails?: unknown; peakMotivationTime?: string | null; responsibilities?: string[] | null; priorities?: string[] | null; shortTermGoals?: string | null; longTermGoals?: string | null; wellnessFocus?: string[] | null } | undefined,
  habits: { title: string; isActive: boolean | null }[],
): Partial<Record<LifeSystemPillarId, PillarContent>> {
  const overrides: Partial<Record<LifeSystemPillarId, PillarContent>> = {};
  if (!profile) return overrides;

  const lad = (profile.lifeAreaDetails && typeof profile.lifeAreaDetails === "object")
    ? (profile.lifeAreaDetails as Record<string, unknown>)
    : {};
  const wakeTime = typeof lad.wakeTime === "string" ? lad.wakeTime : undefined;
  const sleepTime = typeof lad.sleepTime === "string" ? lad.sleepTime : undefined;
  const peak = profile.peakMotivationTime || (typeof lad.peakMotivationTime === "string" ? lad.peakMotivationTime : undefined);

  if (wakeTime || sleepTime || peak) {
    const base = buildStarterPillarContent("daily_rhythm");
    const extras: Record<string, string | string[]> = { ...(base.extras ?? {}) };
    if (wakeTime) extras.wakeTarget = wakeTime;
    if (sleepTime) extras.sleepTarget = sleepTime;
    if (peak) extras.peakMotivationTime = peak;
    overrides.daily_rhythm = { ...base, extras };
  }

  const responsibilities = (profile.responsibilities ?? []).filter(Boolean);
  if (responsibilities.length) {
    const base = buildStarterPillarContent("responsibility");
    overrides.responsibility = {
      ...base,
      nonNegotiables: Array.from(new Set([...(base.nonNegotiables ?? []), ...responsibilities])),
    };
  }

  const priorities = (profile.priorities ?? []).filter(Boolean);
  const purposeText = [profile.shortTermGoals, profile.longTermGoals].filter(Boolean).join("\n\n").trim();
  if (priorities.length || purposeText) {
    const base = buildStarterPillarContent("purpose");
    overrides.purpose = {
      ...base,
      ...(purposeText ? { userVoice: purposeText } : {}),
      ...(priorities.length ? { nonNegotiables: priorities } : {}),
    };
  }

  const wellnessFocus = (profile.wellnessFocus ?? []).filter(Boolean);
  if (wellnessFocus.length) {
    const base = buildStarterPillarContent("physical_health");
    overrides.physical_health = {
      ...base,
      extras: { ...(base.extras ?? {}), wellnessFocus },
    };
  }

  const activeHabitTitles = habits.filter(h => h.isActive !== false).map(h => h.title).filter(Boolean);
  if (activeHabitTitles.length) {
    const base = overrides.foundation ?? buildStarterPillarContent("foundation");
    overrides.foundation = {
      ...base,
      weeklyNonNegotiables: Array.from(new Set([...(base.weeklyNonNegotiables ?? []), ...activeHabitTitles])),
    };
  }

  return overrides;
}

function mapLegacyGoalStatus(progress: number | null | undefined): "vision" | "active" | "paused" | "done" {
  const p = progress ?? 0;
  if (p >= 100) return "done";
  if (p > 0) return "active";
  return "vision";
}

// `LifeSystemBackfillSummary` is now a structured, locale-agnostic type that
// lives in `@shared/lifeSystemBackfill`. The client renders each tag through
// the i18n layer so the banner translates with the rest of the UI.
export type { LifeSystemBackfillSummary };

/**
 * One-time seed for users still on the legacy data model. Idempotent and safe
 * to run repeatedly: it short-circuits as soon as the user has any pillars,
 * and only seeds projects when the user has none.
 *
 * Returns a summary describing what was carried over (so the UI can surface it
 * once), or `null` if no backfill was needed.
 *
 * Strategy:
 *   1. If the user already has any life_system_pillars rows, do nothing.
 *   2. Read legacy onboarding profile + habits and build best-effort overrides.
 *   3. Upsert every pillar from the Starter Template, applying overrides.
 *   4. If the user has no life_system_projects, map legacy goals → projects
 *      (and seed the Starter Template projects when no legacy goals exist).
 */
export async function backfillLifeSystemForUser(userId: string): Promise<LifeSystemBackfillSummary | null> {
  const existingPillars = await storage.getLifeSystemPillars(userId);
  if (existingPillars.length > 0) return null;

  const [profile, goals, habits, existingProjects] = await Promise.all([
    storage.getOnboardingProfile(userId),
    storage.getGoals(userId),
    storage.getHabits(userId),
    storage.getLifeSystemProjects(userId),
  ]);

  const overrides = buildLegacyOverrides(profile, habits);
  const carried: LifeSystemBackfillCarriedItem[] = [];

  for (const def of PILLARS) {
    const base = buildStarterPillarContent(def.id);
    const content = overrides[def.id]
      ? { ...base, ...overrides[def.id] }
      : base;
    await storage.upsertLifeSystemPillar({
      userId,
      pillarId: def.id,
      level: def.level,
      enabled: def.defaultOn,
      content,
      sortOrder: pillarSortOrder(def.id),
    });
  }

  if (existingProjects.length === 0) {
    const activeGoals = goals.filter(g => g.isActive !== false);
    if (activeGoals.length > 0) {
      for (let i = 0; i < activeGoals.length; i++) {
        const g = activeGoals[i];
        await storage.createLifeSystemProject({
          userId,
          name: g.title,
          description: g.description ?? null,
          currentFocus: g.explainWhy ?? null,
          weeklyCadence: null,
          nextAction: null,
          status: mapLegacyGoalStatus(g.progress),
          sortOrder: i,
        });
      }
      carried.push({ kind: "goalsToProjects", count: activeGoals.length });
    } else {
      for (let i = 0; i < STARTER_TEMPLATE.projects.length; i++) {
        const p = STARTER_TEMPLATE.projects[i];
        await storage.createLifeSystemProject({
          userId,
          name: p.name,
          description: p.description,
          currentFocus: p.currentFocus,
          weeklyCadence: p.weeklyCadence,
          nextAction: p.nextAction,
          status: p.status ?? "active",
          sortOrder: i,
        });
      }
      carried.push({ kind: "starterTemplateProjects" });
    }
  }

  if (overrides.daily_rhythm) {
    const extras = overrides.daily_rhythm.extras ?? {};
    const parts: LifeSystemDailyRhythmPart[] = [];
    if (extras.wakeTarget) parts.push("wake");
    if (extras.sleepTarget) parts.push("sleep");
    if (extras.peakMotivationTime) parts.push("peakTime");
    if (parts.length) carried.push({ kind: "dailyRhythm", parts });
  }
  if (overrides.responsibility) {
    carried.push({ kind: "responsibility" });
  }
  if (overrides.purpose) {
    carried.push({ kind: "purpose" });
  }
  if (overrides.physical_health) {
    carried.push({ kind: "physicalHealth" });
  }
  if (overrides.foundation) {
    carried.push({ kind: "foundation" });
  }

  return { carried };
}

/**
 * Compose the Life System Document from current pillar + project state.
 * Layered structure mirrors the user's ChatGPT template:
 *   identityStatement → foundationLaws → core pillars → expression pillars
 *   → creation projects → weeklyNonNegotiables → minimumDay → commandments
 *   → finalStatement.
 *
 * The document looks beautiful even when a pillar is sparse — sparse content
 * shows the pillar definition's summary so nothing reads as empty.
 */
function composeDocumentContent(
  pillars: { pillarId: string; level: string; enabled: boolean | null; content: unknown }[],
  projects: { name: string; description: string | null; currentFocus: string | null; weeklyCadence: string | null; nextAction: string | null; status: string | null }[],
  user: { firstName?: string | null; systemName?: string | null } | null,
): LifeSystemDocumentContent {
  const asContent = (raw: unknown): PillarContent =>
    raw && typeof raw === "object" ? (raw as PillarContent) : {};

  const byId = new Map(pillars.map(p => [p.pillarId, { ...p, content: asContent(p.content) }]));
  const get = (id: LifeSystemPillarId) => byId.get(id);

  const foundation = get("foundation");
  const foundationContent: PillarContent = foundation?.content ?? {};

  const identityStatement: string =
    foundationContent.identityStatement ||
    foundationContent.userVoice ||
    STARTER_TEMPLATE.identityStatement;

  const foundationLaws: string[] = Array.isArray(foundationContent.laws) && foundationContent.laws.length
    ? foundationContent.laws
    : (STARTER_TEMPLATE.pillars.foundation?.laws ?? []);

  const weeklyNonNegotiables: string[] = Array.isArray(foundationContent.weeklyNonNegotiables) && foundationContent.weeklyNonNegotiables.length
    ? foundationContent.weeklyNonNegotiables
    : STARTER_TEMPLATE.weeklyNonNegotiables;

  const minimumDayChecklist: string[] = Array.isArray(foundationContent.minimumDayChecklist) && foundationContent.minimumDayChecklist.length
    ? foundationContent.minimumDayChecklist
    : STARTER_TEMPLATE.minimumDayChecklist;

  const commandments: string[] = Array.isArray(foundationContent.commandments) && foundationContent.commandments.length
    ? foundationContent.commandments
    : STARTER_TEMPLATE.commandments;

  const finalStatement: string =
    foundationContent.finalStatement || STARTER_TEMPLATE.finalStatement;

  const pillarSection = (pillarId: LifeSystemPillarId) => {
    const def = PILLAR_BY_ID[pillarId];
    const row = get(pillarId);
    const c: PillarContent = row?.content ?? {};
    const description: string =
      c.description || STARTER_TEMPLATE.pillars[pillarId]?.description || def.summary;
    const userVoice: string | undefined = c.userVoice;
    return {
      id: pillarId,
      label: def.label,
      level: def.level,
      icon: def.icon,
      enabled: row ? row.enabled !== false : def.defaultOn,
      description,
      userVoice,
      laws: c.laws ?? STARTER_TEMPLATE.pillars[pillarId]?.laws ?? [],
      weeklyRhythm: c.weeklyRhythm ?? STARTER_TEMPLATE.pillars[pillarId]?.weeklyRhythm ?? undefined,
    };
  };

  const corePillars = (Object.keys(PILLAR_BY_ID) as LifeSystemPillarId[])
    .filter(id => PILLAR_BY_ID[id].level === "core")
    .map(pillarSection);

  const expressionPillars = (Object.keys(PILLAR_BY_ID) as LifeSystemPillarId[])
    .filter(id => PILLAR_BY_ID[id].level === "expression")
    .map(pillarSection)
    .filter(p => p.enabled);

  return {
    title: user?.systemName || `${user?.firstName ?? "My"} Life System`,
    subtitle: "An operating system for a real life.",
    identityStatement,
    foundationLaws,
    corePillars,
    expressionPillars,
    projects: projects.map(p => ({
      name: p.name,
      description: p.description,
      currentFocus: p.currentFocus,
      weeklyCadence: p.weeklyCadence,
      nextAction: p.nextAction,
      status: p.status ?? "active",
    })),
    weeklyNonNegotiables,
    minimumDayChecklist,
    commandments,
    finalStatement,
    generatedAt: new Date().toISOString(),
  };
}

export function registerLifeSystemPillarRoutes(app: Express): void {
  // ── Taxonomy & template (public read; doesn't need user) ────────────────
  app.get("/api/life-system/taxonomy", (_req, res) => {
    res.json({ pillars: PILLARS, levels: LEVEL_META });
  });

  app.get("/api/life-system/starter-template", (_req, res) => {
    res.json(STARTER_TEMPLATE);
  });

  // ── User pillars ────────────────────────────────────────────────────────
  app.get("/api/life-system/pillars", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let [pillars, projects] = await Promise.all([
        storage.getLifeSystemPillars(userId),
        storage.getLifeSystemProjects(userId),
      ]);
      let backfillSummary: LifeSystemBackfillSummary | null = null;
      if (pillars.length === 0) {
        try {
          backfillSummary = await backfillLifeSystemForUser(userId);
          [pillars, projects] = await Promise.all([
            storage.getLifeSystemPillars(userId),
            storage.getLifeSystemProjects(userId),
          ]);
        } catch (backfillErr) {
          console.error("backfillLifeSystemForUser error:", backfillErr);
        }
      }
      res.json({
        pillars,
        projects,
        wasBackfilled: backfillSummary !== null,
        ...(backfillSummary ? { backfillSummary } : {}),
      });
    } catch (err) {
      console.error("getLifeSystemPillars error:", err);
      res.status(500).json({ error: "Failed to load life system" });
    }
  });

  app.put("/api/life-system/pillars", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = upsertPillarBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const def = PILLAR_BY_ID[parsed.data.pillarId as LifeSystemPillarId];
    // Core pillars are existential — they cannot be disabled.
    const requestedEnabled = def.level === "core" ? true : (parsed.data.enabled ?? def.defaultOn);
    try {
      const row = await storage.upsertLifeSystemPillar({
        userId,
        pillarId: parsed.data.pillarId,
        level: def.level,
        enabled: requestedEnabled,
        content: parsed.data.content ?? null,
        sortOrder: pillarSortOrder(parsed.data.pillarId as LifeSystemPillarId),
      });
      res.json(row);
    } catch (err) {
      console.error("upsertLifeSystemPillar error:", err);
      res.status(500).json({ error: "Failed to save pillar" });
    }
  });

  app.patch("/api/life-system/pillars/:pillarId", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { pillarId } = req.params;
    if (!isValidPillarId(pillarId)) {
      return res.status(400).json({ error: "Unknown pillarId" });
    }
    const parsed = z.object({
      enabled: z.boolean().optional(),
      content: pillarContentSchema.optional(),
    }).safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const def = PILLAR_BY_ID[pillarId];
    // Core pillars cannot be disabled — silently coerce to enabled.
    const safePatch = {
      ...parsed.data,
      ...(def.level === "core" ? { enabled: true as const } : {}),
    };
    try {
      const row = await storage.updateLifeSystemPillar(userId, pillarId, safePatch);
      // If row doesn't exist yet, create it.
      if (!row) {
        const created = await storage.upsertLifeSystemPillar({
          userId,
          pillarId,
          level: def.level,
          enabled: safePatch.enabled ?? def.defaultOn,
          content: parsed.data.content ?? null,
          sortOrder: pillarSortOrder(pillarId),
        });
        return res.json(created);
      }
      res.json(row);
    } catch (err) {
      console.error("patchLifeSystemPillar error:", err);
      res.status(500).json({ error: "Failed to update pillar" });
    }
  });

  // ── Adopt the Starter Template ──────────────────────────────────────────
  app.post("/api/life-system/adopt-starter", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = adoptTemplateBody.safeParse(req.body || {});
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    try {
      if (parsed.data.reset) {
        // Wipe all three tables so the starter is the only thing seeded.
        await storage.deleteAllLifeSystemPillars(userId);
        const existingProjects = await storage.getLifeSystemProjects(userId);
        for (const p of existingProjects) {
          await storage.deleteLifeSystemProject(p.id, userId);
        }
        await storage.deleteAllLifeSystemDocuments(userId);
      }
      // Upsert every pillar with starter content.
      for (const def of PILLARS) {
        const starter = STARTER_TEMPLATE.pillars[def.id];
        const content: Record<string, unknown> = {
          description: starter?.description ?? def.summary,
          ...(starter?.laws ? { laws: starter.laws } : {}),
          ...(starter?.nonNegotiables ? { nonNegotiables: starter.nonNegotiables } : {}),
          ...(starter?.weeklyRhythm ? { weeklyRhythm: starter.weeklyRhythm } : {}),
          ...(starter?.extras ? { extras: starter.extras } : {}),
        };
        // Foundation gets the headline sections too.
        if (def.id === "foundation") {
          content.identityStatement = STARTER_TEMPLATE.identityStatement;
          content.weeklyNonNegotiables = STARTER_TEMPLATE.weeklyNonNegotiables;
          content.minimumDayChecklist = STARTER_TEMPLATE.minimumDayChecklist;
          content.commandments = STARTER_TEMPLATE.commandments;
          content.finalStatement = STARTER_TEMPLATE.finalStatement;
        }
        await storage.upsertLifeSystemPillar({
          userId,
          pillarId: def.id,
          level: def.level,
          enabled: def.defaultOn,
          content,
          sortOrder: pillarSortOrder(def.id),
        });
      }
      // Seed starter projects (only if user has none yet).
      const existingProjectsAfter = await storage.getLifeSystemProjects(userId);
      if (existingProjectsAfter.length === 0) {
        for (let i = 0; i < STARTER_TEMPLATE.projects.length; i++) {
          const p = STARTER_TEMPLATE.projects[i];
          await storage.createLifeSystemProject({
            userId,
            name: p.name,
            description: p.description,
            currentFocus: p.currentFocus,
            weeklyCadence: p.weeklyCadence,
            nextAction: p.nextAction,
            status: p.status ?? "active",
            sortOrder: i,
          });
        }
      }
      const [pillars, projects] = await Promise.all([
        storage.getLifeSystemPillars(userId),
        storage.getLifeSystemProjects(userId),
      ]);
      res.json({ pillars, projects });
    } catch (err) {
      console.error("adoptStarter error:", err);
      res.status(500).json({ error: "Failed to adopt starter template" });
    }
  });

  // ── Projects ────────────────────────────────────────────────────────────
  app.post("/api/life-system/projects", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = projectBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    try {
      const data: ProjectBody = parsed.data;
      const created = await storage.createLifeSystemProject({
        userId,
        name: data.name,
        description: data.description ?? null,
        currentFocus: data.currentFocus ?? null,
        weeklyCadence: data.weeklyCadence ?? null,
        nextAction: data.nextAction ?? null,
        status: data.status ?? "active",
        sortOrder: data.sortOrder ?? 0,
      });
      res.json(created);
    } catch (err) {
      console.error("createLifeSystemProject error:", err);
      res.status(500).json({ error: "Failed to create project" });
    }
  });

  app.patch("/api/life-system/projects/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = projectBody.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    try {
      const patch: ProjectPatch = parsed.data;
      const updated = await storage.updateLifeSystemProject(req.params.id, userId, patch);
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      console.error("updateLifeSystemProject error:", err);
      res.status(500).json({ error: "Failed to update project" });
    }
  });

  app.delete("/api/life-system/projects/:id", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const ok = await storage.deleteLifeSystemProject(req.params.id, userId);
      if (!ok) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("deleteLifeSystemProject error:", err);
      res.status(500).json({ error: "Failed to delete project" });
    }
  });

  // ── Document: generate, fetch, save snapshot ────────────────────────────
  app.post("/api/life-system/document/generate", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const [pillars, projects, user] = await Promise.all([
        storage.getLifeSystemPillars(userId),
        storage.getLifeSystemProjects(userId),
        storage.getUser(userId),
      ]);
      const content = composeDocumentContent(pillars, projects, user || null);
      const saved = await storage.createLifeSystemDocument({ userId, content });
      res.json({ document: saved });
    } catch (err) {
      console.error("generateLifeSystemDocument error:", err);
      res.status(500).json({ error: "Failed to generate document" });
    }
  });

  // ── Talk to DW about a single pillar ────────────────────────────────────
  const converseBody = z.object({
    message: z.string().min(1).max(2000),
  });

  app.post("/api/life-system/pillars/:pillarId/converse", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const { pillarId } = req.params;
    if (!isValidPillarId(pillarId)) {
      return res.status(400).json({ error: "Unknown pillarId" });
    }
    const parsed = converseBody.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: parsed.error.message });
    const def = PILLAR_BY_ID[pillarId];

    try {
      // Load the pillar (or build a default row from definition).
      const userPillars = await storage.getLifeSystemPillars(userId);
      const existing = userPillars.find(p => p.pillarId === pillarId);
      const content: PillarContent =
        (existing?.content && typeof existing.content === "object")
          ? (existing.content as PillarContent)
          : {};
      const history: PillarConversationMessage[] = Array.isArray(content.conversation)
        ? content.conversation
        : [];

      // Build pillar-context system prompt — DW's job is to interview the user
      // and quietly capture what they say into the pillar's structured fields.
      const tone = LEVEL_META[def.level].toneSentence;
      const knownLines: string[] = [];
      if (content.description) knownLines.push(`description: ${content.description}`);
      if (content.userVoice) knownLines.push(`userVoice: ${content.userVoice}`);
      if (Array.isArray(content.laws) && content.laws.length) {
        knownLines.push(`laws:\n- ${content.laws.join("\n- ")}`);
      }
      if (Array.isArray(content.nonNegotiables) && content.nonNegotiables.length) {
        knownLines.push(`nonNegotiables:\n- ${content.nonNegotiables.join("\n- ")}`);
      }
      if (content.weeklyRhythm) knownLines.push(`weeklyRhythm: ${content.weeklyRhythm}`);
      const knownBlock = knownLines.length
        ? `WHAT YOU ALREADY KNOW ABOUT THIS PILLAR FROM THIS USER:\n${knownLines.join("\n")}`
        : `WHAT YOU ALREADY KNOW ABOUT THIS PILLAR FROM THIS USER: (nothing yet)`;

      const system = [
        `You are DW, the user's life-system concierge. You are talking to them about ONE pillar of their Life System: "${def.label}" (${def.level} level).`,
        `Pillar summary: ${def.summary}`,
        `Pillar opening question DW would ask if starting fresh: ${def.openingQuestion}`,
        `Tone for this level: ${tone}`,
        knownBlock,
        `YOUR JOB
1. Have a warm, grounded conversation about this pillar — the user fills out their Life System by talking with you, NOT by typing into forms.
2. Ask one clear, inviting question at a time. Build naturally on what they just said.
3. Quietly capture what the user shares into the pillar's structured fields.
   - description: a 1–2 sentence description of how this pillar works in their life (only fill once they've given enough to say something true).
   - userVoice: a short verbatim or near-verbatim quote of how they describe this area.
   - laws: rules/principles they live by for this pillar (full updated list — include existing + any new ones the user just expressed).
   - weeklyRhythm: what their week looks like for this pillar (e.g. "lift M/W/F, run Sun").
   - nonNegotiables: things they refuse to skip (full updated list — include existing + new).
4. Only update a field when the user has clearly expressed information that maps to it. If they haven't said anything new about a field, OMIT that field from the update — do not echo or invent.
5. NEVER drop existing items from laws/nonNegotiables unless the user explicitly asked to remove or change them. When in doubt, keep what's there and append.
6. Keep your reply short (2–4 short paragraphs max). End with at most ONE question.

OUTPUT FORMAT (strict):
Return ONLY a JSON object with this shape:
{
  "reply": "<your warm, conversational message to the user>",
  "update": {
    "description"?: string,
    "userVoice"?: string,
    "laws"?: string[],
    "weeklyRhythm"?: string,
    "nonNegotiables"?: string[]
  }
}
If the user did not share anything new this turn, return an empty "update": {}.`,
      ].join("\n\n");

      // Compose the messages array (recent history + new user message).
      const recent = history.slice(-19); // leave room for the new user msg
      const messages = [
        { role: "system" as const, content: system },
        ...recent.map(m => ({ role: m.role, content: m.content })),
        { role: "user" as const, content: parsed.data.message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 700,
        response_format: { type: "json_object" },
      });
      const raw = completion.choices?.[0]?.message?.content?.toString().trim() || "";

      // Parse the model's JSON, with a tolerant fallback so a malformed reply
      // never breaks the conversation.
      let reply = "I'm here — say that again and I'll pick right up.";
      let update: Record<string, unknown> = {};
      try {
        const parsedReply = JSON.parse(raw);
        if (parsedReply && typeof parsedReply === "object") {
          if (typeof parsedReply.reply === "string" && parsedReply.reply.trim()) {
            reply = parsedReply.reply.trim();
          }
          if (parsedReply.update && typeof parsedReply.update === "object") {
            update = parsedReply.update as Record<string, unknown>;
          }
        }
      } catch {
        // Treat the raw text as the reply if JSON parsing fails.
        if (raw) reply = raw;
      }

      // Validate + apply the structured update. We only accept the fields we
      // know about and silently drop anything malformed.
      const updatePatch: Partial<PillarContent> = {};
      if (typeof update.description === "string" && update.description.trim()) {
        updatePatch.description = update.description.trim();
      }
      if (typeof update.userVoice === "string" && update.userVoice.trim()) {
        updatePatch.userVoice = update.userVoice.trim();
      }
      if (typeof update.weeklyRhythm === "string" && update.weeklyRhythm.trim()) {
        updatePatch.weeklyRhythm = update.weeklyRhythm.trim();
      }
      if (Array.isArray(update.laws)) {
        const cleaned = update.laws.filter((l): l is string => typeof l === "string" && !!l.trim()).map(l => l.trim());
        if (cleaned.length) updatePatch.laws = Array.from(new Set(cleaned)).slice(0, 20);
      }
      if (Array.isArray(update.nonNegotiables)) {
        const cleaned = update.nonNegotiables.filter((n): n is string => typeof n === "string" && !!n.trim()).map(n => n.trim());
        if (cleaned.length) updatePatch.nonNegotiables = Array.from(new Set(cleaned)).slice(0, 20);
      }

      const now = new Date().toISOString();
      const userMsg: PillarConversationMessage = { role: "user", content: parsed.data.message, ts: now };
      const assistantMsg: PillarConversationMessage = { role: "assistant", content: reply, ts: new Date().toISOString() };
      const nextConversation = [...history, userMsg, assistantMsg].slice(-20);

      const nextContent: PillarContent = {
        ...content,
        ...updatePatch,
        conversation: nextConversation,
      };

      if (existing) {
        await storage.updateLifeSystemPillar(userId, pillarId, { content: nextContent });
      } else {
        await storage.upsertLifeSystemPillar({
          userId,
          pillarId,
          level: def.level,
          enabled: def.defaultOn,
          content: nextContent,
          sortOrder: pillarSortOrder(pillarId as LifeSystemPillarId),
        });
      }

      res.json({
        reply: assistantMsg,
        conversation: nextConversation,
        capturedFields: Object.keys(updatePatch),
        content: nextContent,
      });
    } catch (err) {
      console.error("conversePillar error:", err);
      res.status(500).json({ error: "Failed to generate response" });
    }
  });

  app.get("/api/life-system/document", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const doc = await storage.getLatestLifeSystemDocument(userId);
      res.json({ document: doc ?? null });
    } catch (err) {
      console.error("getLifeSystemDocument error:", err);
      res.status(500).json({ error: "Failed to load document" });
    }
  });
}
