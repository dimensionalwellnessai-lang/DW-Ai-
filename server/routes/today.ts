import type { Express } from "express";
import { z } from "zod";

import { storage } from "../storage";
import { requireAuth } from "./_shared";
import {
  generateBriefForUser,
  resolveLocalDay,
  type GeneratedBrief,
} from "../lib/today-brief";
import {
  dailyBriefBulletKindEnum,
  dailyBriefVariantEnum,
  insertDailyBriefPreferencesSchema,
  type BriefBullet,
  type DailyBrief,
  type DailyBriefPreferences,
  type DailyBriefVariant,
} from "@shared/schema";

const PREFERENCE_DEFAULTS = {
  includeMood: true,
  includeSleep: true,
  includeFinance: true,
  includeRelationship: true,
  includeSpirit: true,
  includePlan: true,
  includeTrigger: true,
  toneNote: null as string | null,
};

function preferencesPayload(prefs: DailyBriefPreferences | undefined) {
  if (!prefs) return { ...PREFERENCE_DEFAULTS };
  return {
    includeMood: prefs.includeMood,
    includeSleep: prefs.includeSleep,
    includeFinance: prefs.includeFinance,
    includeRelationship: prefs.includeRelationship,
    includeSpirit: prefs.includeSpirit,
    includePlan: prefs.includePlan,
    includeTrigger: prefs.includeTrigger,
    toneNote: prefs.toneNote ?? null,
  };
}

const updatePreferencesSchema = insertDailyBriefPreferencesSchema
  .omit({ userId: true })
  .partial()
  .extend({
    toneNote: z.string().trim().max(280).nullable().optional(),
  });

const bulletTapSchema = z.object({
  dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  variant: z.enum(dailyBriefVariantEnum),
  bulletKind: z.enum(dailyBriefBulletKindEnum),
  route: z.string().min(1).max(200),
  importance: z.union([z.literal(1), z.literal(2), z.literal(3)]).optional().nullable(),
});

const tzQuerySchema = z.object({
  tz: z.string().min(1).max(80).optional(),
});

interface TodayResponse {
  dateKey: string;
  variant: DailyBriefVariant;
  hour: number;
  summaryText: string;
  bullets: BriefBullet[];
  generatedAt: string;
  cached: boolean;
}

function toResponse(
  brief: DailyBrief | (GeneratedBrief & { generatedAt: Date }),
  ctx: { dateKey: string; variant: DailyBriefVariant; hour: number; cached: boolean },
): TodayResponse {
  return {
    dateKey: ctx.dateKey,
    variant: ctx.variant,
    hour: ctx.hour,
    summaryText: brief.summaryText,
    bullets: (brief.bullets ?? []) as BriefBullet[],
    generatedAt:
      brief.generatedAt instanceof Date
        ? brief.generatedAt.toISOString()
        : new Date(brief.generatedAt as unknown as string | number).toISOString(),
    cached: ctx.cached,
  };
}

async function buildAndPersist(
  userId: string,
  dateKey: string,
  variant: DailyBriefVariant,
): Promise<DailyBrief> {
  const generated = await generateBriefForUser(userId, variant, dateKey);
  return storage.upsertDailyBrief({
    userId,
    dateKey,
    variant,
    summaryText: generated.summaryText,
    bullets: generated.bullets,
  });
}

export function registerTodayRoutes(app: Express): void {
  app.get("/api/today", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = tzQuerySchema.safeParse(req.query);
      const tz = parsed.success ? parsed.data.tz : undefined;
      const { dateKey, variant, hour } = resolveLocalDay(tz);

      const existing = await storage.getDailyBrief(userId, dateKey, variant);
      if (existing) {
        return res.json(toResponse(existing, { dateKey, variant, hour, cached: true }));
      }

      const brief = await buildAndPersist(userId, dateKey, variant);
      res.json(toResponse(brief, { dateKey, variant, hour, cached: false }));
    } catch (err) {
      console.error("[today] GET /api/today failed:", err);
      res.status(500).json({ error: "Failed to load today's brief" });
    }
  });

  // Lightweight in-memory dedupe so a double-tap (or quick double-render) on the
  // same bullet doesn't create two rows. Per (userId, dateKey, variant, kind, route)
  // ignored within DEDUPE_MS. Best-effort only; restarts clear it, which is fine.
  const tapDedupe = new Map<string, number>();
  const DEDUPE_MS = 3000;

  app.post("/api/today/bullet-tap", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const parsed = bulletTapSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid bullet tap payload", issues: parsed.error.issues });
    }
    const data = parsed.data;
    try {
      // Integrity check: only accept taps that match a real bullet from THIS
      // user's brief for that day/variant. Stops clients from forging analytics.
      const brief = await storage.getDailyBrief(userId, data.dateKey, data.variant);
      if (!brief) {
        return res.status(404).json({ error: "No brief found for that day/variant" });
      }
      const bullets = (brief.bullets ?? []) as BriefBullet[];
      const matched = bullets.find(
        (b) => b.kind === data.bulletKind && b.route === data.route,
      );
      if (!matched) {
        return res.status(400).json({ error: "Bullet does not match today's brief" });
      }

      const key = `${userId}|${data.dateKey}|${data.variant}|${data.bulletKind}|${data.route}`;
      const now = Date.now();
      const last = tapDedupe.get(key);
      if (last && now - last < DEDUPE_MS) {
        return res.status(204).end();
      }
      tapDedupe.set(key, now);
      // Periodic cleanup so the map can't grow unbounded across long uptimes.
      if (tapDedupe.size > 5000) {
        for (const [k, t] of tapDedupe) {
          if (now - t > DEDUPE_MS) tapDedupe.delete(k);
        }
      }

      await storage.recordDailyBriefTap({
        userId,
        dateKey: data.dateKey,
        variant: data.variant,
        bulletKind: data.bulletKind,
        route: data.route,
        importance: matched.importance,
      });
      res.status(204).end();
    } catch (err) {
      console.error("[today] POST /api/today/bullet-tap failed:", err);
      res.status(500).json({ error: "Failed to record bullet tap" });
    }
  });

  app.get("/api/today/bullet-taps/rollup", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const sinceDays = Math.min(Math.max(parseInt(String(req.query.days ?? "30"), 10) || 30, 1), 365);
      const rows = await storage.getDailyBriefTapRollup(userId, sinceDays);
      res.json({ sinceDays, rows });
    } catch (err) {
      console.error("[today] GET /api/today/bullet-taps/rollup failed:", err);
      res.status(500).json({ error: "Failed to load bullet tap rollup" });
    }
  });

  app.get("/api/today/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = await storage.getDailyBriefPreferences(userId);
      res.json(preferencesPayload(prefs));
    } catch (err) {
      console.error("[today] GET /api/today/preferences failed:", err);
      res.status(500).json({ error: "Failed to load brief preferences" });
    }
  });

  app.put("/api/today/preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = updatePreferencesSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid preferences", issues: parsed.error.issues });
      }
      const tzParsed = tzQuerySchema.safeParse({ tz: req.body?.tz ?? req.query?.tz });
      const tz = tzParsed.success ? tzParsed.data.tz : undefined;

      const existing = await storage.getDailyBriefPreferences(userId);
      const base = preferencesPayload(existing);
      const next = { ...base, ...parsed.data };
      const toneNote = typeof next.toneNote === "string" ? next.toneNote.trim() : next.toneNote;

      const saved = await storage.upsertDailyBriefPreferences({
        userId,
        includeMood: next.includeMood,
        includeSleep: next.includeSleep,
        includeFinance: next.includeFinance,
        includeRelationship: next.includeRelationship,
        includeSpirit: next.includeSpirit,
        includePlan: next.includePlan,
        includeTrigger: next.includeTrigger,
        toneNote: toneNote ? toneNote : null,
      });

      // Invalidate today's cached briefs so the next view reflects the change.
      const { dateKey } = resolveLocalDay(tz);
      await storage.deleteDailyBriefsForDay(userId, dateKey);

      res.json(preferencesPayload(saved));
    } catch (err) {
      console.error("[today] PUT /api/today/preferences failed:", err);
      res.status(500).json({ error: "Failed to save brief preferences" });
    }
  });

  app.post("/api/today/refresh", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = tzQuerySchema.safeParse({ tz: req.body?.tz ?? req.query?.tz });
      const tz = parsed.success ? parsed.data.tz : undefined;
      const { dateKey, variant, hour } = resolveLocalDay(tz);

      const brief = await buildAndPersist(userId, dateKey, variant);
      res.json(toResponse(brief, { dateKey, variant, hour, cached: false }));
    } catch (err) {
      console.error("[today] POST /api/today/refresh failed:", err);
      res.status(500).json({ error: "Failed to regenerate today's brief" });
    }
  });
}
