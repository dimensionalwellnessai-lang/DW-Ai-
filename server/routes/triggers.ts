import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "./_shared";
import {
  insertTriggerEventSchema,
  triggerOutcomeEnum,
  type LifeSystemPillar,
} from "@shared/schema";
import { PILLAR_BY_ID, type LifeSystemPillarId } from "@shared/lifeSystemTaxonomy";
import { pillarContentSchema } from "@shared/lifeSystemContent";

// Body the client sends — userId is filled in from the session.
const createBody = insertTriggerEventSchema.omit({ userId: true }).extend({
  outcome: z.enum(triggerOutcomeEnum).optional().nullable(),
});

interface AggregatedStandard {
  text: string;
  // Where this standard came from. Helps the UI show provenance.
  sourcePillarId: LifeSystemPillarId | "user";
  sourceLabel: string;
  kind: "non_negotiable" | "trigger_standard" | "commandment";
}

function aggregateStandards(pillars: LifeSystemPillar[]): AggregatedStandard[] {
  const seen = new Set<string>();
  const out: AggregatedStandard[] = [];

  function add(text: string, sourcePillarId: LifeSystemPillarId | "user", sourceLabel: string, kind: AggregatedStandard["kind"]) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push({ text: trimmed, sourcePillarId, sourceLabel, kind });
  }

  // Parse all enabled pillars once.
  const enabled = pillars
    .filter(row => row.enabled !== false)
    .map(row => {
      const def = PILLAR_BY_ID[row.pillarId as LifeSystemPillarId];
      if (!def) return null;
      const parsed = pillarContentSchema.safeParse(row.content ?? {});
      if (!parsed.success) return null;
      return { row, def, content: parsed.data };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // Phase 1 — the user's own trigger standards (highest priority).
  // Read top-level `triggerStandards` and fall back to extras.triggerStandards
  // for back-compat with the starter template's older shape.
  for (const { row, content } of enabled) {
    if (row.pillarId !== "emotional_regulation") continue;
    const top = content.triggerStandards ?? [];
    const extra = content.extras?.triggerStandards;
    const fromExtras = Array.isArray(extra) ? extra : [];
    for (const s of [...top, ...fromExtras]) {
      add(s, "user", "Your trigger standards", "trigger_standard");
    }
  }

  // Phase 2 — non-negotiables from every enabled pillar.
  // Order: emotional_regulation, foundation, then the rest.
  const ordered = [...enabled].sort((a, b) => {
    const rank = (id: string) =>
      id === "emotional_regulation" ? 0 : id === "foundation" ? 1 : 2;
    return rank(a.row.pillarId) - rank(b.row.pillarId);
  });
  for (const { def, content } of ordered) {
    for (const n of content.nonNegotiables ?? []) {
      add(n, def.id, def.label, "non_negotiable");
    }
  }

  // Phase 3 — Foundation commandments anchor the bottom.
  for (const { row, content } of enabled) {
    if (row.pillarId !== "foundation") continue;
    for (const cmd of content.commandments ?? []) {
      add(cmd, "foundation", "Foundation", "commandment");
    }
  }

  return out;
}

export function registerTriggerRoutes(app: Express) {
  app.get("/api/trigger-events", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId as string;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const events = await storage.listTriggerEvents(userId, limit);
      const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const week = await storage.countTriggerEventsSince(userId, since);
      res.json({ events, week });
    } catch (err) {
      console.error("[triggers] list failed", err);
      res.status(500).json({ error: "Failed to load trigger events" });
    }
  });

  app.get("/api/trigger-events/standards", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId as string;
      const pillars = await storage.getLifeSystemPillars(userId);
      res.json({ standards: aggregateStandards(pillars) });
    } catch (err) {
      console.error("[triggers] standards failed", err);
      res.status(500).json({ error: "Failed to load standards" });
    }
  });

  app.post("/api/trigger-events", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId as string;
      const parsed = createBody.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid trigger event", issues: parsed.error.issues });
      }
      const event = await storage.createTriggerEvent({ ...parsed.data, userId });
      res.json(event);
    } catch (err) {
      console.error("[triggers] create failed", err);
      res.status(500).json({ error: "Failed to save trigger event" });
    }
  });
}
