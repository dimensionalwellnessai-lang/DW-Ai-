/**
 * Energy routes — GET /api/energy/current (Roadmap §15.8)
 *
 * Returns the live EnergyScore for the authenticated user.
 */

import type { Express } from "express";
import { requireAuth } from "./_shared";
import { computeEnergyScore } from "../lib/energy-score";

export function registerEnergyRoutes(app: Express): void {
  app.get("/api/energy/current", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await computeEnergyScore(userId);
      res.json(result);
    } catch (error) {
      console.error("Error computing energy score:", error);
      res.status(500).json({ error: "Failed to compute energy score" });
    }
  });
}
