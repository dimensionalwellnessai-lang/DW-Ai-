import type { Express } from "express";
import { eq, and, desc, sql, gte, inArray, or } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { requireAuth, zodError } from "./_shared";
import { openai } from "../openai";
import {
  people,
  peopleInteractions,
  alivenessMoments,
  relationshipBoundaries,
  relationshipRepairs,
  relationshipAppreciations,
  peopleGroups,
  peopleGroupMembers,
  groupSharedItems,
  relationshipInsights,
  accountabilityPartners,
  users,
  insertPersonSchema,
  insertPeopleInteractionSchema,
  insertAlivenessMomentSchema,
  insertRelationshipBoundarySchema,
  insertRelationshipRepairSchema,
  insertRelationshipAppreciationSchema,
  insertPeopleGroupSchema,
  insertGroupSharedItemSchema,
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

const GROUP_KINDS = ["household", "core-family", "couple", "friends", "other"] as const;
const SHARED_ITEM_KINDS = ["rule", "event", "appreciation", "note"] as const;
const REPAIR_STATUSES = ["open", "done", "dropped"] as const;

// Tighten the auto-generated insert schemas with explicit enums + bounds
const personInputSchema = insertPersonSchema
  .omit({ userId: true })
  .extend({
    name: z.string().trim().min(1).max(120),
    relationship: z.enum(RELATIONSHIP_TYPES).optional(),
    category: z.enum(CATEGORY_TYPES).optional(),
    notes: z.string().max(2000).optional().nullable(),
    photoUrl: z.string().url().max(500).optional().nullable(),
    birthday: z.string().max(40).optional().nullable(),
    contactFrequencyDays: z.number().int().min(1).max(365).optional().nullable(),
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

const boundaryInputSchema = insertRelationshipBoundarySchema
  .omit({ userId: true })
  .extend({
    personId: z.string().min(1),
    rule: z.string().trim().min(1).max(500),
    isActive: z.boolean().optional(),
  });

const repairInputSchema = insertRelationshipRepairSchema
  .omit({ userId: true })
  .extend({
    personId: z.string().min(1),
    issue: z.string().trim().min(1).max(500),
    plannedAction: z.string().max(500).optional().nullable(),
    dueDate: z.coerce.date().optional().nullable(),
    status: z.enum(REPAIR_STATUSES).optional(),
  });

const repairPatchSchema = z.object({
  plannedAction: z.string().max(500).optional().nullable(),
  dueDate: z.coerce.date().optional().nullable(),
  status: z.enum(REPAIR_STATUSES).optional(),
});

const appreciationInputSchema = insertRelationshipAppreciationSchema
  .omit({ userId: true })
  .extend({
    personId: z.string().min(1),
    note: z.string().trim().min(1).max(500),
  });

const groupInputSchema = insertPeopleGroupSchema
  .omit({ userId: true })
  .extend({
    name: z.string().trim().min(1).max(120),
    kind: z.enum(GROUP_KINDS).optional(),
    description: z.string().max(500).optional().nullable(),
  });

const sharedItemInputSchema = z.object({
  kind: z.enum(SHARED_ITEM_KINDS),
  payload: z.record(z.any()),
});

// ── Health-score helpers ─────────────────────────────────────────────────────

export interface HealthScore {
  score: number; // 0..100
  factors: Array<{ label: string; impact: number; detail?: string }>;
  daysSinceContact: number | null;
}

export function computeHealthScore(args: {
  contactFrequencyDays: number | null | undefined;
  lastInteractionAt: Date | null | undefined;
  recentInteractions: Array<Pick<typeof peopleInteractions.$inferSelect, "energyAfter" | "clarityAfter" | "selfAfter" | "occurredAt">>;
  openRepairs: number;
  recentAppreciations: number;
}): HealthScore {
  const factors: HealthScore["factors"] = [];
  let score = 70;
  const now = Date.now();

  // ── Contact-frequency factor ─────────
  let daysSinceContact: number | null = null;
  if (args.lastInteractionAt) {
    daysSinceContact = Math.floor(
      (now - new Date(args.lastInteractionAt).getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  if (args.contactFrequencyDays && daysSinceContact !== null) {
    const ratio = daysSinceContact / args.contactFrequencyDays;
    if (ratio <= 1) {
      score += 10;
      factors.push({ label: "On track with contact rhythm", impact: 10 });
    } else if (ratio <= 1.5) {
      score -= 5;
      factors.push({
        label: "A little overdue",
        impact: -5,
        detail: `${daysSinceContact}d since last contact (target ${args.contactFrequencyDays}d)`,
      });
    } else {
      const penalty = Math.min(25, Math.round((ratio - 1) * 15));
      score -= penalty;
      factors.push({
        label: "Distant",
        impact: -penalty,
        detail: `${daysSinceContact}d since last contact`,
      });
    }
  } else if (daysSinceContact !== null && daysSinceContact > 60) {
    score -= 10;
    factors.push({ label: "Long stretch with no contact", impact: -10, detail: `${daysSinceContact}d` });
  }

  // ── Sentiment from recent interactions ──
  const recent = args.recentInteractions.slice(0, 10);
  if (recent.length > 0) {
    const sum = recent.reduce(
      (acc, r) =>
        acc + (r.energyAfter ?? 0) + (r.clarityAfter ?? 0) + (r.selfAfter ?? 0),
      0,
    );
    const avg = sum / (recent.length * 3); // -2..+2
    const sentimentImpact = Math.round(avg * 12);
    if (Math.abs(sentimentImpact) >= 1) {
      score += sentimentImpact;
      factors.push({
        label: avg > 0 ? "Recent interactions land well" : "Recent interactions feel heavy",
        impact: sentimentImpact,
      });
    }
  }

  // ── Open repair items pull the score down ──
  if (args.openRepairs > 0) {
    const penalty = Math.min(20, args.openRepairs * 7);
    score -= penalty;
    factors.push({
      label: `${args.openRepairs} open repair item${args.openRepairs === 1 ? "" : "s"}`,
      impact: -penalty,
    });
  }

  // ── Recent appreciations buoy it ──
  if (args.recentAppreciations > 0) {
    const boost = Math.min(10, args.recentAppreciations * 3);
    score += boost;
    factors.push({ label: `${args.recentAppreciations} recent appreciation${args.recentAppreciations === 1 ? "" : "s"}`, impact: boost });
  }

  score = Math.max(0, Math.min(100, score));
  return { score, factors, daysSinceContact };
}

// Verify person belongs to user; returns the person row or null
async function ownPerson(userId: string, personId: string) {
  const [row] = await db
    .select()
    .from(people)
    .where(and(eq(people.id, personId), eq(people.userId, userId)))
    .limit(1);
  return row ?? null;
}

async function ownGroup(userId: string, groupId: string) {
  const [row] = await db
    .select()
    .from(peopleGroups)
    .where(and(eq(peopleGroups.id, groupId), eq(peopleGroups.userId, userId)))
    .limit(1);
  return row ?? null;
}

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
      const personId = typeof req.query.personId === "string" ? req.query.personId : null;
      const where = personId
        ? and(eq(peopleInteractions.userId, userId), eq(peopleInteractions.personId, personId))
        : eq(peopleInteractions.userId, userId);
      const rows = await db
        .select()
        .from(peopleInteractions)
        .where(where)
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
      const owner = await ownPerson(userId, parsed.data.personId);
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

  // ── Boundaries ────────────────────────────────────────────────────────────
  app.get("/api/relationships/boundaries", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const personId = typeof req.query.personId === "string" ? req.query.personId : null;
      const where = personId
        ? and(eq(relationshipBoundaries.userId, userId), eq(relationshipBoundaries.personId, personId))
        : eq(relationshipBoundaries.userId, userId);
      const rows = await db.select().from(relationshipBoundaries).where(where).orderBy(desc(relationshipBoundaries.createdAt));
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list boundaries failed", err);
      res.status(500).json({ error: "Failed to load boundaries" });
    }
  });

  app.post("/api/relationships/boundaries", requireAuth, async (req, res) => {
    const parsed = boundaryInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      if (!(await ownPerson(userId, parsed.data.personId))) {
        return res.status(404).json({ error: "Person not found" });
      }
      const [row] = await db
        .insert(relationshipBoundaries)
        .values({ ...parsed.data, userId })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create boundary failed", err);
      res.status(500).json({ error: "Failed to add boundary" });
    }
  });

  app.delete("/api/relationships/boundaries/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(relationshipBoundaries)
        .where(
          and(
            eq(relationshipBoundaries.id, req.params.id),
            eq(relationshipBoundaries.userId, req.session.userId!),
          ),
        )
        .returning({ id: relationshipBoundaries.id });
      if (result.length === 0) return res.status(404).json({ error: "Boundary not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete boundary failed", err);
      res.status(500).json({ error: "Failed to delete boundary" });
    }
  });

  // ── Repairs ───────────────────────────────────────────────────────────────
  app.get("/api/relationships/repairs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const personId = typeof req.query.personId === "string" ? req.query.personId : null;
      const where = personId
        ? and(eq(relationshipRepairs.userId, userId), eq(relationshipRepairs.personId, personId))
        : eq(relationshipRepairs.userId, userId);
      const rows = await db.select().from(relationshipRepairs).where(where).orderBy(desc(relationshipRepairs.createdAt));
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list repairs failed", err);
      res.status(500).json({ error: "Failed to load repairs" });
    }
  });

  app.post("/api/relationships/repairs", requireAuth, async (req, res) => {
    const parsed = repairInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      if (!(await ownPerson(userId, parsed.data.personId))) {
        return res.status(404).json({ error: "Person not found" });
      }
      const [row] = await db
        .insert(relationshipRepairs)
        .values({ ...parsed.data, userId })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create repair failed", err);
      res.status(500).json({ error: "Failed to add repair" });
    }
  });

  app.patch("/api/relationships/repairs/:id", requireAuth, async (req, res) => {
    const parsed = repairPatchSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const update: Record<string, any> = { ...parsed.data };
      if (parsed.data.status === "done" || parsed.data.status === "dropped") {
        update.resolvedAt = new Date();
      } else if (parsed.data.status === "open") {
        update.resolvedAt = null;
      }
      const [row] = await db
        .update(relationshipRepairs)
        .set(update)
        .where(
          and(
            eq(relationshipRepairs.id, req.params.id),
            eq(relationshipRepairs.userId, req.session.userId!),
          ),
        )
        .returning();
      if (!row) return res.status(404).json({ error: "Repair not found" });
      res.json(row);
    } catch (err) {
      console.error("[relationships] update repair failed", err);
      res.status(500).json({ error: "Failed to update repair" });
    }
  });

  app.delete("/api/relationships/repairs/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(relationshipRepairs)
        .where(
          and(
            eq(relationshipRepairs.id, req.params.id),
            eq(relationshipRepairs.userId, req.session.userId!),
          ),
        )
        .returning({ id: relationshipRepairs.id });
      if (result.length === 0) return res.status(404).json({ error: "Repair not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete repair failed", err);
      res.status(500).json({ error: "Failed to delete repair" });
    }
  });

  // ── Appreciations ─────────────────────────────────────────────────────────
  app.get("/api/relationships/appreciations", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const personId = typeof req.query.personId === "string" ? req.query.personId : null;
      const where = personId
        ? and(eq(relationshipAppreciations.userId, userId), eq(relationshipAppreciations.personId, personId))
        : eq(relationshipAppreciations.userId, userId);
      const rows = await db.select().from(relationshipAppreciations).where(where).orderBy(desc(relationshipAppreciations.createdAt));
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list appreciations failed", err);
      res.status(500).json({ error: "Failed to load appreciations" });
    }
  });

  app.post("/api/relationships/appreciations", requireAuth, async (req, res) => {
    const parsed = appreciationInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      if (!(await ownPerson(userId, parsed.data.personId))) {
        return res.status(404).json({ error: "Person not found" });
      }
      const [row] = await db
        .insert(relationshipAppreciations)
        .values({ ...parsed.data, userId })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create appreciation failed", err);
      res.status(500).json({ error: "Failed to add appreciation" });
    }
  });

  app.delete("/api/relationships/appreciations/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(relationshipAppreciations)
        .where(
          and(
            eq(relationshipAppreciations.id, req.params.id),
            eq(relationshipAppreciations.userId, req.session.userId!),
          ),
        )
        .returning({ id: relationshipAppreciations.id });
      if (result.length === 0) return res.status(404).json({ error: "Appreciation not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete appreciation failed", err);
      res.status(500).json({ error: "Failed to delete appreciation" });
    }
  });

  // ── Health score (per person) ─────────────────────────────────────────────
  app.get("/api/relationships/health/:personId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const person = await ownPerson(userId, req.params.personId);
      if (!person) return res.status(404).json({ error: "Person not found" });

      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const [recentInter, openRepairsRows, recentAppr] = await Promise.all([
        db
          .select()
          .from(peopleInteractions)
          .where(
            and(
              eq(peopleInteractions.userId, userId),
              eq(peopleInteractions.personId, person.id),
              gte(peopleInteractions.occurredAt, since),
            ),
          )
          .orderBy(desc(peopleInteractions.occurredAt)),
        db
          .select({ id: relationshipRepairs.id })
          .from(relationshipRepairs)
          .where(
            and(
              eq(relationshipRepairs.userId, userId),
              eq(relationshipRepairs.personId, person.id),
              eq(relationshipRepairs.status, "open"),
            ),
          ),
        db
          .select({ id: relationshipAppreciations.id })
          .from(relationshipAppreciations)
          .where(
            and(
              eq(relationshipAppreciations.userId, userId),
              eq(relationshipAppreciations.personId, person.id),
              gte(relationshipAppreciations.createdAt, since),
            ),
          ),
      ]);

      const result = computeHealthScore({
        contactFrequencyDays: person.contactFrequencyDays,
        lastInteractionAt: person.lastInteractionAt,
        recentInteractions: recentInter,
        openRepairs: openRepairsRows.length,
        recentAppreciations: recentAppr.length,
      });
      res.json({ personId: person.id, ...result });
    } catch (err) {
      console.error("[relationships] health failed", err);
      res.status(500).json({ error: "Failed to compute health" });
    }
  });

  // Bulk health for the whole list (used by the Health tab)
  app.get("/api/relationships/health", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
      const [allPeople, allInter, allRepairs, allAppr] = await Promise.all([
        db.select().from(people).where(eq(people.userId, userId)),
        db
          .select()
          .from(peopleInteractions)
          .where(and(eq(peopleInteractions.userId, userId), gte(peopleInteractions.occurredAt, since))),
        db
          .select({ personId: relationshipRepairs.personId })
          .from(relationshipRepairs)
          .where(and(eq(relationshipRepairs.userId, userId), eq(relationshipRepairs.status, "open"))),
        db
          .select({ personId: relationshipAppreciations.personId })
          .from(relationshipAppreciations)
          .where(and(eq(relationshipAppreciations.userId, userId), gte(relationshipAppreciations.createdAt, since))),
      ]);

      const interByPerson = new Map<string, typeof allInter>();
      for (const i of allInter) {
        const arr = interByPerson.get(i.personId) ?? [];
        arr.push(i);
        interByPerson.set(i.personId, arr);
      }
      const openRepairCount = new Map<string, number>();
      for (const r of allRepairs) openRepairCount.set(r.personId, (openRepairCount.get(r.personId) ?? 0) + 1);
      const apprCount = new Map<string, number>();
      for (const a of allAppr) apprCount.set(a.personId, (apprCount.get(a.personId) ?? 0) + 1);

      const result = allPeople.map((p) => ({
        personId: p.id,
        name: p.name,
        category: p.category,
        ...computeHealthScore({
          contactFrequencyDays: p.contactFrequencyDays,
          lastInteractionAt: p.lastInteractionAt,
          recentInteractions: (interByPerson.get(p.id) ?? []).sort(
            (a, b) => new Date(b.occurredAt!).getTime() - new Date(a.occurredAt!).getTime(),
          ),
          openRepairs: openRepairCount.get(p.id) ?? 0,
          recentAppreciations: apprCount.get(p.id) ?? 0,
        }),
      }));
      res.json(result);
    } catch (err) {
      console.error("[relationships] bulk health failed", err);
      res.status(500).json({ error: "Failed to load health" });
    }
  });

  // ── Groups (family / shared hub) ──────────────────────────────────────────
  app.get("/api/relationships/groups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Owner groups
      const ownedGroups = await db
        .select()
        .from(peopleGroups)
        .where(eq(peopleGroups.userId, userId))
        .orderBy(desc(peopleGroups.createdAt));
      // Groups this user is linked into via partner_user_id on a member row
      const linkedMemberRows = await db
        .select({ groupId: peopleGroupMembers.groupId })
        .from(peopleGroupMembers)
        .where(eq(peopleGroupMembers.partnerUserId, userId));
      const linkedGroupIds = Array.from(
        new Set(linkedMemberRows.map((r) => r.groupId)),
      ).filter((id) => !ownedGroups.some((g) => g.id === id));
      let linkedGroups: Array<typeof peopleGroups.$inferSelect> = [];
      if (linkedGroupIds.length > 0) {
        linkedGroups = await db
          .select()
          .from(peopleGroups)
          .where(inArray(peopleGroups.id, linkedGroupIds));
      }
      const groups = [...ownedGroups, ...linkedGroups].sort((a, b) => {
        const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bt - at;
      });
      const groupIds = groups.map((g) => g.id);
      let members: Array<typeof peopleGroupMembers.$inferSelect> = [];
      if (groupIds.length > 0) {
        members = await db
          .select()
          .from(peopleGroupMembers)
          .where(inArray(peopleGroupMembers.groupId, groupIds));
      }
      const byGroup = new Map<string, typeof members>();
      for (const m of members) {
        const arr = byGroup.get(m.groupId) ?? [];
        arr.push(m);
        byGroup.set(m.groupId, arr);
      }
      res.json(groups.map((g) => ({ ...g, members: byGroup.get(g.id) ?? [] })));
    } catch (err) {
      console.error("[relationships] list groups failed", err);
      res.status(500).json({ error: "Failed to load groups" });
    }
  });

  app.post("/api/relationships/groups", requireAuth, async (req, res) => {
    const parsed = groupInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const [row] = await db
        .insert(peopleGroups)
        .values({ ...parsed.data, userId: req.session.userId! })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] create group failed", err);
      res.status(500).json({ error: "Failed to add group" });
    }
  });

  app.patch("/api/relationships/groups/:id", requireAuth, async (req, res) => {
    const parsed = groupInputSchema.partial().safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const [row] = await db
        .update(peopleGroups)
        .set(parsed.data)
        .where(and(eq(peopleGroups.id, req.params.id), eq(peopleGroups.userId, req.session.userId!)))
        .returning();
      if (!row) return res.status(404).json({ error: "Group not found" });
      res.json(row);
    } catch (err) {
      console.error("[relationships] update group failed", err);
      res.status(500).json({ error: "Failed to update group" });
    }
  });

  app.delete("/api/relationships/groups/:id", requireAuth, async (req, res) => {
    try {
      const result = await db
        .delete(peopleGroups)
        .where(and(eq(peopleGroups.id, req.params.id), eq(peopleGroups.userId, req.session.userId!)))
        .returning({ id: peopleGroups.id });
      if (result.length === 0) return res.status(404).json({ error: "Group not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete group failed", err);
      res.status(500).json({ error: "Failed to delete group" });
    }
  });

  // Add a person to a group
  app.post("/api/relationships/groups/:id/members", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const schema = z.object({
      personId: z.string().min(1),
      partnerUserId: z.string().optional().nullable(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const group = await ownGroup(userId, req.params.id);
      if (!group) return res.status(404).json({ error: "Group not found" });
      if (!(await ownPerson(userId, parsed.data.personId))) {
        return res.status(404).json({ error: "Person not found" });
      }
      // If partnerUserId given, verify they're an active accountability partner
      if (parsed.data.partnerUserId) {
        const [link] = await db
          .select({ id: accountabilityPartners.id })
          .from(accountabilityPartners)
          .where(
            and(
              eq(accountabilityPartners.status, "active"),
              or(
                and(
                  eq(accountabilityPartners.requesterId, userId),
                  eq(accountabilityPartners.recipientId, parsed.data.partnerUserId),
                ),
                and(
                  eq(accountabilityPartners.recipientId, userId),
                  eq(accountabilityPartners.requesterId, parsed.data.partnerUserId),
                ),
              ),
            ),
          )
          .limit(1);
        if (!link) return res.status(400).json({ error: "Not a linked accountability partner" });
      }
      const [row] = await db
        .insert(peopleGroupMembers)
        .values({
          groupId: group.id,
          personId: parsed.data.personId,
          partnerUserId: parsed.data.partnerUserId ?? null,
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] add group member failed", err);
      res.status(500).json({ error: "Failed to add member" });
    }
  });

  app.delete("/api/relationships/groups/:groupId/members/:memberId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const group = await ownGroup(userId, req.params.groupId);
      if (!group) return res.status(404).json({ error: "Group not found" });
      const result = await db
        .delete(peopleGroupMembers)
        .where(
          and(
            eq(peopleGroupMembers.id, req.params.memberId),
            eq(peopleGroupMembers.groupId, group.id),
          ),
        )
        .returning({ id: peopleGroupMembers.id });
      if (result.length === 0) return res.status(404).json({ error: "Member not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete group member failed", err);
      res.status(500).json({ error: "Failed to remove member" });
    }
  });

  // Shared items inside a group (rules, events, appreciations, notes)
  app.get("/api/relationships/groups/:id/items", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const group = await ownGroup(userId, req.params.id);
      // Also allow access if the user is a partner-linked member
      let canRead = !!group;
      if (!canRead) {
        const [linkedMember] = await db
          .select({ id: peopleGroupMembers.id })
          .from(peopleGroupMembers)
          .where(
            and(
              eq(peopleGroupMembers.groupId, req.params.id),
              eq(peopleGroupMembers.partnerUserId, userId),
            ),
          )
          .limit(1);
        canRead = !!linkedMember;
      }
      if (!canRead) return res.status(404).json({ error: "Group not found" });
      const items = await db
        .select({
          id: groupSharedItems.id,
          groupId: groupSharedItems.groupId,
          authorUserId: groupSharedItems.authorUserId,
          kind: groupSharedItems.kind,
          payload: groupSharedItems.payload,
          createdAt: groupSharedItems.createdAt,
          authorName: users.firstName,
          authorEmail: users.email,
        })
        .from(groupSharedItems)
        .leftJoin(users, eq(groupSharedItems.authorUserId, users.id))
        .where(eq(groupSharedItems.groupId, req.params.id))
        .orderBy(desc(groupSharedItems.createdAt));
      res.json(items);
    } catch (err) {
      console.error("[relationships] list group items failed", err);
      res.status(500).json({ error: "Failed to load items" });
    }
  });

  app.post("/api/relationships/groups/:id/items", requireAuth, async (req, res) => {
    const parsed = sharedItemInputSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json(zodError(parsed.error));
    try {
      const userId = req.session.userId!;
      const group = await ownGroup(userId, req.params.id);
      let canWrite = !!group;
      if (!canWrite) {
        const [linkedMember] = await db
          .select({ id: peopleGroupMembers.id })
          .from(peopleGroupMembers)
          .where(
            and(
              eq(peopleGroupMembers.groupId, req.params.id),
              eq(peopleGroupMembers.partnerUserId, userId),
            ),
          )
          .limit(1);
        canWrite = !!linkedMember;
      }
      if (!canWrite) return res.status(404).json({ error: "Group not found" });
      const [row] = await db
        .insert(groupSharedItems)
        .values({
          groupId: req.params.id,
          authorUserId: userId,
          kind: parsed.data.kind,
          payload: parsed.data.payload,
        })
        .returning();
      res.status(201).json(row);
    } catch (err) {
      console.error("[relationships] add group item failed", err);
      res.status(500).json({ error: "Failed to add item" });
    }
  });

  app.delete("/api/relationships/groups/:groupId/items/:itemId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await db
        .delete(groupSharedItems)
        .where(
          and(
            eq(groupSharedItems.id, req.params.itemId),
            eq(groupSharedItems.groupId, req.params.groupId),
            eq(groupSharedItems.authorUserId, userId),
          ),
        )
        .returning({ id: groupSharedItems.id });
      if (result.length === 0) return res.status(404).json({ error: "Item not found" });
      res.json({ ok: true });
    } catch (err) {
      console.error("[relationships] delete group item failed", err);
      res.status(500).json({ error: "Failed to delete item" });
    }
  });

  // ── Insights ──────────────────────────────────────────────────────────────
  app.get("/api/relationships/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const rows = await db
        .select()
        .from(relationshipInsights)
        .where(and(eq(relationshipInsights.userId, userId), eq(relationshipInsights.isDismissed, false)))
        .orderBy(desc(relationshipInsights.createdAt))
        .limit(40);
      res.json(rows);
    } catch (err) {
      console.error("[relationships] list insights failed", err);
      res.status(500).json({ error: "Failed to load insights" });
    }
  });

  app.post("/api/relationships/insights/:id/dismiss", requireAuth, async (req, res) => {
    try {
      const [row] = await db
        .update(relationshipInsights)
        .set({ isDismissed: true })
        .where(
          and(
            eq(relationshipInsights.id, req.params.id),
            eq(relationshipInsights.userId, req.session.userId!),
          ),
        )
        .returning();
      if (!row) return res.status(404).json({ error: "Insight not found" });
      res.json(row);
    } catch (err) {
      console.error("[relationships] dismiss insight failed", err);
      res.status(500).json({ error: "Failed to dismiss" });
    }
  });

  // Refresh: walk graph, generate fresh insight messages, store them
  app.post("/api/relationships/insights/refresh", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allPeople = await db.select().from(people).where(eq(people.userId, userId));
      if (allPeople.length === 0) return res.json({ created: 0, insights: [] });

      const now = Date.now();
      const since = new Date(now - 90 * 24 * 60 * 60 * 1000);
      const [allInter, allOpenRepairs, allAppr] = await Promise.all([
        db
          .select()
          .from(peopleInteractions)
          .where(and(eq(peopleInteractions.userId, userId), gte(peopleInteractions.occurredAt, since))),
        db
          .select()
          .from(relationshipRepairs)
          .where(and(eq(relationshipRepairs.userId, userId), eq(relationshipRepairs.status, "open"))),
        db
          .select()
          .from(relationshipAppreciations)
          .where(and(eq(relationshipAppreciations.userId, userId), gte(relationshipAppreciations.createdAt, since))),
      ]);

      const interByPerson = new Map<string, typeof allInter>();
      for (const i of allInter) {
        const arr = interByPerson.get(i.personId) ?? [];
        arr.push(i);
        interByPerson.set(i.personId, arr);
      }
      const openRepairsByPerson = new Map<string, number>();
      for (const r of allOpenRepairs) openRepairsByPerson.set(r.personId, (openRepairsByPerson.get(r.personId) ?? 0) + 1);
      const apprByPerson = new Map<string, number>();
      for (const a of allAppr) apprByPerson.set(a.personId, (apprByPerson.get(a.personId) ?? 0) + 1);

      type DraftInsight = { kind: string; personId: string | null; message: string; cta?: any };
      const drafts: DraftInsight[] = [];

      // Distance / overdue
      for (const p of allPeople) {
        const inter = interByPerson.get(p.id) ?? [];
        const last = inter[0]?.occurredAt ?? p.lastInteractionAt;
        if (!last) continue;
        const days = Math.floor((now - new Date(last).getTime()) / (1000 * 60 * 60 * 24));
        const target = p.contactFrequencyDays ?? (p.category === "aligned" || p.category === "growth" ? 14 : 30);
        if (days > target * 1.3 && days >= 14) {
          drafts.push({
            kind: "distance",
            personId: p.id,
            message: `You haven't talked to ${p.name} in ${days} days.`,
            cta: { tab: "crm", personId: p.id },
          });
        }
      }

      // Birthdays in next 7 days (parse loose birthday strings)
      for (const p of allPeople) {
        const days = daysUntilBirthday(p.birthday);
        if (days !== null && days >= 0 && days <= 7) {
          drafts.push({
            kind: "birthday",
            personId: p.id,
            message:
              days === 0
                ? `${p.name}'s birthday is today.`
                : `${p.name}'s birthday is in ${days} day${days === 1 ? "" : "s"}.`,
            cta: { tab: "crm", personId: p.id },
          });
        }
      }

      // Multiple unresolved grievances
      for (const [personId, count] of Array.from(openRepairsByPerson.entries())) {
        if (count >= 2) {
          const p = allPeople.find((pp) => pp.id === personId);
          if (!p) continue;
          drafts.push({
            kind: "unresolved",
            personId,
            message: `You and ${p.name} have ${count} unresolved repair items — want to talk it through?`,
            cta: { tab: "health", personId },
          });
        }
      }

      // Optional AI flourish: ask the model for one warm summary line
      let aiSummary: string | null = null;
      try {
        if (process.env.OPENAI_API_KEY && drafts.length > 0) {
          const stub = drafts
            .slice(0, 6)
            .map((d) => `- ${d.message}`)
            .join("\n");
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are DW, a warm, grounding wellness companion. In one short sentence (max 25 words), summarize what the user's relationship landscape needs this week. Plain language, no preamble, no questions.",
              },
              { role: "user", content: `Signals from my relationships:\n${stub}` },
            ],
            max_tokens: 80,
            temperature: 0.5,
          });
          aiSummary = completion.choices[0]?.message?.content?.trim() ?? null;
        }
      } catch (aiErr) {
        console.warn("[relationships] AI summary failed, continuing without", aiErr);
      }

      if (aiSummary) {
        drafts.unshift({ kind: "suggestion", personId: null, message: aiSummary });
      }

      if (drafts.length === 0) {
        return res.json({ created: 0, insights: [] });
      }

      // Wipe old non-dismissed insights so the list stays fresh
      await db
        .delete(relationshipInsights)
        .where(and(eq(relationshipInsights.userId, userId), eq(relationshipInsights.isDismissed, false)));

      const inserted = await db
        .insert(relationshipInsights)
        .values(
          drafts.map((d) => ({
            userId,
            kind: d.kind,
            personId: d.personId,
            message: d.message,
            cta: d.cta ?? null,
          })),
        )
        .returning();

      res.json({ created: inserted.length, insights: inserted });
    } catch (err) {
      console.error("[relationships] refresh insights failed", err);
      res.status(500).json({ error: "Failed to refresh insights" });
    }
  });

  // ── Summary for AI / dashboards ───────────────────────────────────────────
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

// ── Person-name detection for chat hook ─────────────────────────────────────
// Returns the person id whose name is mentioned in the message, if any.
export async function detectPersonMention(
  userId: string,
  message: unknown,
): Promise<{ personId: string; name: string } | null> {
  if (typeof message !== "string" || message.length < 2) return null;
  try {
    const list = await db
      .select({ id: people.id, name: people.name })
      .from(people)
      .where(eq(people.userId, userId))
      .limit(200);
    if (list.length === 0) return null;
    const lower = message.toLowerCase();
    // Match longest names first so "Sarah Jane" beats "Sarah"
    const sorted = [...list].sort((a, b) => b.name.length - a.name.length);
    for (const p of sorted) {
      const first = p.name.split(/\s+/)[0];
      if (!first || first.length < 3) continue;
      const re = new RegExp(`\\b${escapeRegex(first)}\\b`, "i");
      if (re.test(lower)) return { personId: p.id, name: p.name };
    }
  } catch (err) {
    console.warn("[relationships] person mention detection failed", err);
  }
  return null;
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Parse loose birthday strings ("March 14", "1991-03-14", "3/14") and return
// the number of days until the next anniversary (0 = today). null on parse fail.
function daysUntilBirthday(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const s = raw.trim();
  if (!s) return null;
  const months: Record<string, number> = {
    jan: 1, january: 1,
    feb: 2, february: 2,
    mar: 3, march: 3,
    apr: 4, april: 4,
    may: 5,
    jun: 6, june: 6,
    jul: 7, july: 7,
    aug: 8, august: 8,
    sep: 9, sept: 9, september: 9,
    oct: 10, october: 10,
    nov: 11, november: 11,
    dec: 12, december: 12,
  };

  let month: number | null = null;
  let day: number | null = null;

  // ISO YYYY-MM-DD
  const iso = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) {
    month = parseInt(iso[2], 10);
    day = parseInt(iso[3], 10);
  } else {
    // M/D or M-D
    const md = s.match(/^(\d{1,2})[\/\-](\d{1,2})/);
    if (md) {
      month = parseInt(md[1], 10);
      day = parseInt(md[2], 10);
    } else {
      // "March 14" or "Mar 14"
      const txt = s.match(/([A-Za-z]+)\s+(\d{1,2})/);
      if (txt) {
        const m = months[txt[1].toLowerCase()];
        if (m) {
          month = m;
          day = parseInt(txt[2], 10);
        }
      }
    }
  }

  if (!month || !day || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const now = new Date();
  let target = new Date(now.getFullYear(), month - 1, day);
  if (target.getTime() < now.setHours(0, 0, 0, 0)) {
    target = new Date(new Date().getFullYear() + 1, month - 1, day);
  }
  const diff = target.getTime() - new Date(new Date().setHours(0, 0, 0, 0)).getTime();
  return Math.round(diff / (1000 * 60 * 60 * 24));
}
