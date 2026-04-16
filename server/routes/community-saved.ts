import type { Express } from "express";

import { z } from "zod";

import { storage } from "../storage";

import { requireAuth } from "./_shared";



export function registerCommunitySavedRoutes(app: Express): void {
  app.get("/api/community/opportunities", async (req, res) => {
    try {
      const opportunities = await storage.getCommunityOpportunities();
      const userId = req.session.userId;
      const savedIds = userId
        ? await storage.getSavedCommunityOpportunityIds(userId)
        : [];

      const savedIdSet = new Set(savedIds);
      const result = opportunities.map((opp) => ({
        ...opp,
        discoveredAt: opp.createdAt ? opp.createdAt.getTime() : Date.now(),
        isSaved: savedIdSet.has(opp.id),
      }));
      res.json(result);
    } catch (error) {
      console.error("GET /api/community/opportunities error:", error);
      res.status(500).json({ error: "Failed to fetch community opportunities" });
    }
  });

  // POST /api/community/opportunities/saved — auth required
  app.post("/api/community/opportunities/saved", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const bodyResult = z.object({ opportunityId: z.string().min(1) }).safeParse(req.body);
      if (!bodyResult.success) {
        return res.status(400).json({ error: "opportunityId is required" });
      }
      await storage.saveCommunityOpportunity(userId, bodyResult.data.opportunityId);
      res.json({ success: true, saved: true });
    } catch (error) {
      console.error("POST /api/community/opportunities/saved error:", error);
      res.status(500).json({ error: "Failed to save opportunity" });
    }
  });

  // DELETE /api/community/opportunities/saved/:id — auth required
  app.delete("/api/community/opportunities/saved/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const idResult = z.string().min(1).safeParse(req.params.id);
      if (!idResult.success) {
        return res.status(400).json({ error: "Invalid opportunity id" });
      }
      await storage.unsaveCommunityOpportunity(userId, idResult.data);
      res.json({ success: true, saved: false });
    } catch (error) {
      console.error("DELETE /api/community/opportunities/saved error:", error);
      res.status(500).json({ error: "Failed to unsave opportunity" });
    }
  });

  // ── Browse: Entertainment (TV/Movies) ──────────────────────────────────────
}
