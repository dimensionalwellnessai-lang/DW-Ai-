/**
 * Level-progress API — the "My Level" surface.
 *
 * GET /api/level-progress          → current level status + contribution breakdown
 *                                    (also lazily upserts today's growth snapshot)
 * GET /api/level-progress/trends   → daily growth_snapshots series (?days=7..90)
 * GET /api/level-progress/review   → rule-based growth review (?period=week|month)
 */

import type { Express } from "express";
import { requireAuth } from "./_shared";
import {
  buildGrowthReview,
  computeGrowthMetrics,
  getGrowthTrends,
  upsertTodayGrowthSnapshot,
} from "../lib/growth-metrics";

export function registerLevelProgressRoutes(app: Express): void {
  app.get("/api/level-progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const metrics = await computeGrowthMetrics(userId);
      // Persist today's snapshot so trend charts fill in as the user shows up.
      // Best-effort: a snapshot write failure must not break the page.
      try {
        await upsertTodayGrowthSnapshot(userId, metrics);
      } catch (err) {
        console.error("[level-progress] snapshot upsert failed:", err);
      }
      res.json(metrics);
    } catch (error) {
      console.error("Level progress error:", error);
      res.status(500).json({ error: "Failed to compute level progress" });
    }
  });

  app.get("/api/level-progress/trends", requireAuth, async (req, res) => {
    try {
      const raw = parseInt(String(req.query.days ?? "30"), 10);
      const days = Math.min(90, Math.max(7, isFinite(raw) ? raw : 30));
      const series = await getGrowthTrends(req.session.userId!, days);
      res.json({ days, series });
    } catch (error) {
      console.error("Level progress trends error:", error);
      res.status(500).json({ error: "Failed to load trends" });
    }
  });

  app.get("/api/level-progress/review", requireAuth, async (req, res) => {
    try {
      const period = req.query.period === "month" ? "month" : "week";
      const userId = req.session.userId!;
      const [metrics, series] = await Promise.all([
        computeGrowthMetrics(userId),
        getGrowthTrends(userId, period === "month" ? 30 : 7),
      ]);
      res.json(buildGrowthReview(period, series, metrics));
    } catch (error) {
      console.error("Growth review error:", error);
      res.status(500).json({ error: "Failed to build growth review" });
    }
  });
}
