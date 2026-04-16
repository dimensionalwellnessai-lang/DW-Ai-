import type { Express } from "express";
import { or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { insertAiSuggestionSchema, insertConversationInsightSchema } from "@shared/schema";
export function registerAiFeaturesRoutes(app: Express): void {
  app.get("/api/ai-feature-usage", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const usage = await storage.getAiFeatureUsage(userId);
      res.json(usage);
    } catch (error) {
      console.error("Get AI feature usage error:", error);
      res.status(500).json({ error: "Failed to get feature usage" });
    }
  });

  const trackFeatureUsageSchema = z.object({
    featureName: z.string().min(1, "Feature name is required"),
    timeSpentSeconds: z.number().int().min(0).optional().default(0),
  });

  app.post("/api/ai-feature-usage/track", requireAuth, async (req, res) => {
    try {
      const { featureName, timeSpentSeconds } = trackFeatureUsageSchema.parse(req.body);
      const userId = req.session.userId!;
      await storage.trackFeatureUsage(userId, featureName, timeSpentSeconds);
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Track feature usage error:", error);
      res.status(500).json({ error: "Failed to track usage" });
    }
  });

  app.get("/api/ai-feature-usage/most-used", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let limit = 4;
      if (req.query.limit !== undefined) {
        const parsedLimit = parseInt(req.query.limit as string, 10);
        if (!Number.isNaN(parsedLimit)) {
          limit = Math.min(Math.max(parsedLimit, 1), 20);
        }
      }
      const mostUsed = await storage.getMostUsedFeatures(userId, limit);
      res.json(mostUsed);
    } catch (error) {
      console.error("Get most used features error:", error);
      res.status(500).json({ error: "Failed to get most used features" });
    }
  });

  // AI Suggestions
  app.get("/api/ai-suggestions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const status = req.query.status as string | undefined;
      const suggestions = await storage.getAiSuggestions(userId, status);
      res.json(suggestions);
    } catch (error) {
      console.error("Get AI suggestions error:", error);
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  app.post("/api/ai-suggestions", requireAuth, async (req, res) => {
    try {
      const data = insertAiSuggestionSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const suggestion = await storage.createAiSuggestion(data);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create AI suggestion error:", error);
      res.status(500).json({ error: "Failed to create suggestion" });
    }
  });

  app.patch("/api/ai-suggestions/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const { status } = req.body;
      const suggestion = await storage.updateAiSuggestion(id, userId, { status, respondedAt: new Date() });
      if (!suggestion) {
        return res.status(404).json({ error: "Suggestion not found" });
      }
      res.json(suggestion);
    } catch (error) {
      console.error("Update AI suggestion error:", error);
      res.status(500).json({ error: "Failed to update suggestion" });
    }
  });

  // ── Conversation Insight Cards (backend persistence for auth users) ─────────

  // Maximum number of insights that can be uploaded in a single bulk request.
  // Prevents excessively large payloads during local→backend migration.
  const MAX_BULK_INSIGHTS = 200;

  // Zod schema for PATCH /api/insights/:id – only the mutable subset of fields.
  const patchInsightSchema = z.object({
    title: z.string().min(1).max(80).optional(),
    summary: z.string().max(300).optional(),
    pinned: z.boolean().optional(),
    // Accept ms-epoch number, ISO string, or explicit null (unpin clears timestamp)
    pinnedAt: z.union([z.number(), z.string(), z.null()])
      .optional()
      .transform((v) => (v != null ? new Date(v) : null)),
    hidden: z.boolean().optional(),
  });

  app.get("/api/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.max(1, Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, MAX_BULK_INSIGHTS));
      const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
      const insights = await storage.getConversationInsights(userId, limit, offset);
      res.json(insights);
    } catch (error) {
      console.error("Get insights error:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  app.post("/api/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const data = insertConversationInsightSchema.parse({ ...req.body, userId });
      const insight = await storage.createConversationInsight(data);
      res.status(201).json(insight);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create insight error:", error);
      res.status(500).json({ error: "Failed to create insight" });
    }
  });

  // Bulk upsert – used for migrating local insights on first login
  app.post("/api/insights/bulk", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { insights } = req.body;
      if (!Array.isArray(insights)) {
        return res.status(400).json({ error: "insights must be an array" });
      }
      const capped = (insights as unknown[]).slice(0, MAX_BULK_INSIGHTS);
      const parsed = capped.map((i: unknown) => {
        return insertConversationInsightSchema.parse({ ...(i as object), userId });
      });
      await storage.bulkUpsertConversationInsights(parsed);
      res.json({ ok: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Bulk upsert insights error:", error);
      res.status(500).json({ error: "Failed to bulk upsert insights" });
    }
  });

  app.patch("/api/insights/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const patch = patchInsightSchema.parse(req.body);
      const updated = await storage.updateConversationInsight(id, userId, patch as Parameters<typeof storage.updateConversationInsight>[2]);
      if (!updated) {
        return res.status(404).json({ error: "Insight not found" });
      }
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update insight error:", error);
      res.status(500).json({ error: "Failed to update insight" });
    }
  });

  app.delete("/api/insights/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteConversationInsight(id, userId);
      res.json({ ok: true });
    } catch (error) {
      console.error("Delete insight error:", error);
      res.status(500).json({ error: "Failed to delete insight" });
    }
  });

  // ── DW Insight + Journal Intelligence System ──────────────────────────────

  // Rate limiter for the expensive AI pipeline endpoint
}
