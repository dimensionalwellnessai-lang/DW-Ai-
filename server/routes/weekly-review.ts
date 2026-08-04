import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { updateWeeklyPlanReviewSchema } from "@shared/schema";

import {
  buildGrowthReview,
  computeGrowthMetrics,
  getGrowthTrends,
} from "../lib/growth-metrics";

export function registerWeeklyReviewRoutes(app: Express): void {
  app.get("/api/weekly-review/:planId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { planId } = req.params;

      // Verify the plan belongs to this user
      const plan = await storage.getElevationPlan(planId, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      // Fetch days+actions once – reused for both recap generation and response payload
      const rawDays = await storage.getElevationPlanDays(planId);
      const daysWithActions = await Promise.all(
        rawDays.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );

      // Get or auto-populate the review from plan completion data
      let review = await storage.getWeeklyPlanReview(planId, userId);
      if (!review) {
        // Auto-generate recap from plan completion stats (reuses already-fetched data)
        const wins: string[] = [];
        const frictionPoints: string[] = [];
        let totalActions = 0;
        let completedActions = 0;

        for (const day of daysWithActions) {
          for (const action of day.actions) {
            totalActions++;
            if (action.isCompleted) {
              completedActions++;
              wins.push(action.title);
            } else {
              frictionPoints.push(action.title);
            }
          }
        }

        const completionRate = totalActions > 0
          ? Math.round((completedActions / totalActions) * 100)
          : 0;

        review = await storage.createWeeklyPlanReview({
          userId,
          planId,
          wins: wins.slice(0, 10),
          frictionPoints: frictionPoints.slice(0, 10),
          completionRate,
          status: "draft",
        });
      }

      // Level-up section: the same growth review shown on My Level, so the
      // weekly review reflects role-map progress and one recommended focus.
      // Best-effort — a metrics failure must not break the plan review.
      let levelUp: ReturnType<typeof buildGrowthReview> | null = null;
      try {
        const [metrics, series] = await Promise.all([
          computeGrowthMetrics(userId),
          getGrowthTrends(userId, 7),
        ]);
        levelUp = buildGrowthReview("week", series, metrics);
      } catch (err) {
        console.error("Weekly review level-up section failed:", err);
      }

      res.json({ review, plan, days: daysWithActions, levelUp });
    } catch (error) {
      console.error("Weekly review get error:", error);
      res.status(500).json({ error: "Failed to get weekly review" });
    }
  });

  // POST /api/weekly-review/:planId – submit/update the weekly review
  app.post("/api/weekly-review/:planId", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { planId } = req.params;

      // Verify the plan belongs to this user
      const plan = await storage.getElevationPlan(planId, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });

      const parsed = updateWeeklyPlanReviewSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const existing = await storage.getWeeklyPlanReview(planId, userId);
      let review: import("@shared/schema").WeeklyPlanReview;
      if (existing) {
        const updated = await storage.updateWeeklyPlanReview(planId, userId, parsed.data);
        if (!updated) return res.status(404).json({ error: "Review not found" });
        review = updated;
      } else {
        review = await storage.createWeeklyPlanReview({
          userId,
          planId,
          ...parsed.data,
        });
      }

      // When submitted, archive the plan and update learning profile with wins/friction
      if (parsed.data.status === "submitted") {
        await storage.updateElevationPlan(planId, userId, { status: "archived" });

        // Update learning profile with wins and friction from the review
        const wins = review.wins ?? [];
        const frictionPoints = review.frictionPoints ?? [];
        const currentProfile = await storage.getLearningProfile(userId);
        const existingWins = (currentProfile?.wins ?? []) as string[];
        const existingFriction = (currentProfile?.frictionPoints ?? []) as string[];
        const mergedWins = [...new Set([...wins, ...existingWins])].slice(0, 20);
        const mergedFriction = [...new Set([...frictionPoints, ...existingFriction])].slice(0, 10);
        await storage.upsertLearningProfile(userId, {
          wins: mergedWins,
          frictionPoints: mergedFriction,
          lastFeedbackAt: new Date(),
        });
      }

      res.json(review);
    } catch (error) {
      console.error("Weekly review submit error:", error);
      res.status(500).json({ error: "Failed to submit weekly review" });
    }
  });

  // POST /api/elevation-plan-actions/:id/add-to-calendar – create a calendar event from a plan action
}
