import type { Express } from "express";
import { eq, and, desc, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, zodError } from "./_shared";
import {
  people,
  peopleInteractions,
  alivenessMoments,
  insertPersonSchema,
  insertPeopleInteractionSchema,
  insertAlivenessMomentSchema,
} from "@shared/schema";

const RELATIONSHIP_TYPES = [
  "family",
  "partner",
  "close-friend",
  "friend",
  "coworker",
  "mentor",
  "acquaintance",
  "other",
] as const;

const CATEGORY_TYPES = ["aligned", "neutral", "draining", "growth"] as const;

const INTERACTION_KINDS = [
  "in-person",
  "call",
  "text",
  "video",
  "group",
  "other",
] as const;

// Tighten the auto-generated insert schemas with explicit enums + bounds so
// the API rejects nonsense values up front (the table columns are plain text /
// integer for forward-compat).
const personInputSchema = insertPersonSchema
  .omit({ userId: true })
  .extend({
    name: z.string().trim().min(1).max(120),
    relationship: z.enum(RELATIONSHIP_TYPES).optional(),
    category: z.enum(CATEGORY_TYPES).optional(),
    notes: z.string().max(2000).optional().nullable(),
    photoUrl: z.string().url().max(500).optional().nullable(),
    birthday: z.string().max(40).optional().nullable(),
    isActive: z.boolean().optional(),
  });

const personPatchSchema = personInputSchema.partial();

const interactionInputSchema = insertPeopleInteractionSchema
  .omit({ userId: true })
  .extend({
    personId: z.string().min(1),
    kind: z.enum(INTERACTION_KINDS).optional(),
    energyAfter: z.number().int().min(-2).max(2).optional().nullable(),
    clarityAfter: z.number().int().min(-2).max(2).optional().nullable(),
    selfAfter: z.number().int().min(-2).max(2).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
    occurredAt: z.coerce.date().optional(),
  });

const alivenessInputSchema = insertAlivenessMomentSchema
  .omit({ userId: true })
  .extend({
    title: z.string().trim().min(1).max(160),
    description: z.string().max(2000).optional().nullable(),
    tags: z.array(z.string().max(40)).max(12).optional(),
    alivenessLevel: z.number().int().min(1).max(5).optional(),
    occurredAt: z.coerce.date().optional(),
  });

export function registerRelationshipsRoutes(app: Express): void {
  // ── People ────────────────────────────────────────────────────────────────
  app.get("/api/people", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await db
        .select()
        .from(people)
        .where(eq(people.userId, userId))
        .orderBy(desc(people.lastInteractionAt), desc(people.createdAt));
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list people failed", err);
      res.status(500).json({ error: "Failed to load people" });
    }
  });

  app.post("/api/people", requireAuth, async (req, res) => {
    const parsed = personInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const [row] = await db
        .insert(people)
        .values({ ...parsed.data, userId: req.session.userId! })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create person failed", err);
      res.status(500).json({ error: "Failed to add person" });
    }
  });

  app.patch("/api/people/:id", requireAuth, async (req, res) => {
    const parsed = personPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const [row] = await db
        .update(people)
        .set(parsed.data)
        .where(and(eq(people.id, req.params.id), eq(people.userId, req.session.userId!)))
        .returning();
      if (!row) return res.status(404).json({ error: "Person not found" });
      res.json(row);
    } catch (err) {
      console.error("[relationships] update person failed", err);
      res.status(500).json({ error: "Failed to update person" });
    }
  });

  app.delete("/api/people/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(people)
        .where(and(eq(people.id, req.params.id), eq(people.userId, req.session.userId!)))
        .returning({ id: people.id });
      if (result.length === 0) return res.status(404).json({ error: "Person not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete person failed", err);
      res.status(500).json({ error: "Failed to delete person" });
    }
  });

  // ── Interactions ──────────────────────────────────────────────────────────
  app.get("/api/people/interactions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db
        .select()
        .from(peopleInteractions)
        .where(eq(peopleInteractions.userId, userId))
        .orderBy(desc(peopleInteractions.occurredAt))
        .limit(limit);
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list interactions failed", err);
      res.status(500).json({ error: "Failed to load interactions" });
    }
  });

  app.post("/api/people/interactions", requireAuth, async (req, res) => {
    const parsed = interactionInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      // Confirm the person belongs to this user before logging
      const [owner] = await db
        .select({ id: people.id })
        .from(people)
        .where(and(eq(people.id, parsed.data.personId), eq(people.userId, userId)))
        .limit(1);
      if (!owner) return res.status(404).json({ error: "Person not found" });

      const occurredAt = parsed.data.occurredAt ?? new Date();
      const [row] = await db
        .insert(peopleInteractions)
        .values({ ...parsed.data, occurredAt, userId })
        .returning();

      // Bump the person's lastInteractionAt so the People list re-orders
      await db
        .update(people)
        .set({ lastInteractionAt: occurredAt })
        .where(eq(people.id, parsed.data.personId));

      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create interaction failed", err);
      res.status(500).json({ error: "Failed to log interaction" });
    }
  });

  app.delete("/api/people/interactions/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(peopleInteractions)
        .where(
          and(
            eq(peopleInteractions.id, req.params.id),
            eq(peopleInteractions.userId, req.session.userId!),
          ),
        )
        .returning({ id: peopleInteractions.id });
      if (result.length === 0) return res.status(404).json({ error: "Interaction not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete interaction failed", err);
      res.status(500).json({ error: "Failed to delete interaction" });
    }
  });

  // ── Aliveness moments ─────────────────────────────────────────────────────
  app.get("/api/aliveness", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db
        .select()
        .from(alivenessMoments)
        .where(eq(alivenessMoments.userId, userId))
        .orderBy(desc(alivenessMoments.occurredAt))
        .limit(limit);
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list aliveness failed", err);
      res.status(500).json({ error: "Failed to load aliveness moments" });
    }
  });

  app.post("/api/aliveness", requireAuth, async (req, res) => {
    const parsed = alivenessInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const [row] = await db
        .insert(alivenessMoments)
        .values({
          ...parsed.data,
          occurredAt: parsed.data.occurredAt ?? new Date(),
          userId: req.session.userId!,
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create aliveness failed", err);
      res.status(500).json({ error: "Failed to log aliveness moment" });
    }
  });

  app.delete("/api/aliveness/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(alivenessMoments)
        .where(
          and(
            eq(alivenessMoments.id, req.params.id),
            eq(alivenessMoments.userId, req.session.userId!),
          ),
        )
        .returning({ id: alivenessMoments.id });
      if (result.length === 0) return res.status(404).json({ error: "Moment not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete aliveness failed", err);
      res.status(500).json({ error: "Failed to delete moment" });
    }
  });

  // ── Summary for AI / dashboards ────────────────────────────────────────────
  // Lightweight aggregate the AI / home page can pull without N+1.
  app.get("/api/people/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [counts, recent, alive] = await Promise.all([
        db
          .select({
            category: people.category,
            count: sql<number>`count(*)::int`,
          })
          .from(people)
          .where(and(eq(people.userId, userId), eq(people.isActive, true)))
          .groupBy(people.category),
        db
          .select()
          .from(peopleInteractions)
          .where(eq(peopleInteractions.userId, userId))
          .orderBy(desc(peopleInteractions.occurredAt))
          .limit(10),
        db
          .select()
          .from(alivenessMoments)
          .where(eq(alivenessMoments.userId, userId))
          .orderBy(desc(alivenessMoments.occurredAt))
          .limit(5),
      ]);

      const byCategory: Record<string, number> = {
        aligned: 0,
        neutral: 0,
        draining: 0,
        growth: 0,
      };
      for (const row of counts) {
        if (row.category && row.category in byCategory) byCategory[row.category] = row.count;
      }

      res.json({
        byCategory,
        totalPeople: Object.values(byCategory).reduce((a, b) => a + b, 0),
        recentInteractions: recent,
        recentAliveness: alive,
      });
    } catch (err) {
      console.error("[relationships] summary failed", err);
      res.status(500).json({ error: "Failed to load summary" });
    }
  });
}
