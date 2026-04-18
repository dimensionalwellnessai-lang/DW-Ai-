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
import { pillarContentSchema, type PillarContent, type LifeSystemDocumentContent } from "@shared/lifeSystemContent";

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
      const [pillars, projects] = await Promise.all([
        storage.getLifeSystemPillars(userId),
        storage.getLifeSystemProjects(userId),
      ]);
      res.json({ pillars, projects });
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
