import type { Express } from "express";
import { z } from "zod";

import { storage } from "../storage";
import { requireAuth } from "./_shared";
import {
  generateBriefForUser,
  resolveLocalDay,
  type GeneratedBrief,
} from "../lib/today-brief";
import type {
  BriefBullet,
  DailyBrief,
  DailyBriefVariant,
} from "@shared/schema";

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
