/**
 * Orb routes — GET /api/orb/state (Roadmap §15.2)
 *
 * Returns the aggregated OrbState for the Command Center.
 */

import type { Express } from "express";
import { requireAuth } from "./_shared";
import { buildOrbState } from "../lib/orb-state";

export function registerOrbRoutes(app: Express): void {
  app.get("/api/orb/state", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const state = await buildOrbState(userId);
      res.json(state);
    } catch (error) {
      console.error("Error building orb state:", error);
      res.status(500).json({ error: "Failed to build orb state" });
    }
  });
}
