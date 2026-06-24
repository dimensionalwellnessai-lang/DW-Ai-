/**
 * Cross-dimensional insights route (Roadmap §15.5).
 * Accountability challenges route (Roadmap §15.7).
 */

import type { Express } from "express";
import { requireAuth } from "./_shared";
import { generateCrossInsights } from "../insights/correlations";
import { generateAccountabilityChallenges } from "../lib/accountability-engine";

export function registerInsightsRoutes(app: Express): void {
  app.get("/api/insights/cross-dimensional", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const insights = await generateCrossInsights(userId);
      res.json({ insights, generatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error generating cross-dimensional insights:", error);
      res.status(500).json({ error: "Failed to generate insights" });
    }
  });

  app.get("/api/accountability/challenges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const challenges = await generateAccountabilityChallenges(userId);
      res.json({ challenges, generatedAt: new Date().toISOString() });
    } catch (error) {
      console.error("Error generating accountability challenges:", error);
      res.status(500).json({ error: "Failed to generate challenges" });
    }
  });
}
