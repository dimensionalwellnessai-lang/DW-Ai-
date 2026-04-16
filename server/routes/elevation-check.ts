import type { Express } from "express";

import { z } from "zod";

import { storage } from "../storage";

import { requireAuth } from "./_shared";



import { todayDateString, computeMomentumStatus } from "./_shared";

export function registerElevationCheckRoutes(app: Express): void {
  app.get("/api/elevation/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = todayDateString();
      const existing = await storage.getElevationCheckByDate(userId, today);
      if (existing) {
        return res.json(existing);
      }
      res.json(null);
    } catch (error) {
      console.error("Elevation check GET error:", error);
      res.status(500).json({ error: "Failed to get elevation check" });
    }
  });

  const elevationCheckBodySchema = z.object({
    force: z.boolean().optional(),
  });

  // POST /api/elevation/check – run (or re-run) today's elevation check
  // Body: { force?: boolean } — force=true bypasses the daily idempotency guard
  app.post("/api/elevation/check", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = todayDateString();

      const parsed = elevationCheckBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body" });
      }
      const force = parsed.data.force === true;

      // Idempotency: skip if already checked today (unless force=true)
      if (!force) {
        const existing = await storage.getElevationCheckByDate(userId, today);
        if (existing) {
          return res.json({ ...existing, skipped: true });
        }
      }

      // Gather only what we need: habits/goals (all active) + mood logs for the last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const [habits, goals, moodData, learningProfile] = await Promise.all([
        storage.getHabits(userId),
        storage.getGoals(userId),
        storage.getRecentMoodLogs(userId, sevenDaysAgo),
        storage.getLearningProfile(userId),
      ]);

      const { momentumStatus, reasons, suggestedFocus } = computeMomentumStatus(
        habits,
        goals,
        moodData.logs,
        moodData.hasPriorLogs,
        // Only pass learning profile when personalization is enabled
        (learningProfile?.learningEnabled !== false) ? (learningProfile ?? undefined) : undefined,
      );

      const check = await storage.upsertElevationCheck({
        userId,
        checkedDate: today,
        momentumStatus,
        reasons,
        suggestedFocus: suggestedFocus ?? null,
      });

      res.json(check);
    } catch (error) {
      console.error("Elevation check POST error:", error);
      res.status(500).json({ error: "Failed to run elevation check" });
    }
  });

  // Support report endpoint (accessible to both guests and authenticated users)

  const detailedSupportReportSchema = z.object({
    category: z.enum(["bug", "demo_mismatch", "voice", "content_feed", "scheduling", "other"]),
    description: z.string().min(1),
    stepsToReproduce: z.string().optional(),
    eventType: z.string().optional(),
    requestedTerm: z.string().optional(),
    normalizedTerm: z.string().optional(),
    closestMatch: z.object({ id: z.string().optional(), name: z.string().optional() }).optional(),
    confidence: z.number().min(0).max(1).optional(),
    includeTechnicalDetails: z.boolean(),
    technicalDetails: z.object({
      appVersion: z.string().optional(),
      platform: z.string().optional(),
      deviceModel: z.string().optional(),
      osVersion: z.string().optional(),
      userAgent: z.string().optional(),
    }).optional(),
    includeRecentContext: z.boolean(),
    recentContext: z.object({
      route: z.string().optional(),
      screen: z.string().optional(),
      lastAction: z.string().optional(),
    }).optional(),
    includeConversationSnippet: z.boolean(),
    conversationSnippet: z.object({
      conversationId: z.string().optional(),
      lastUserMessage: z.string().optional(),
      lastDwReply: z.string().optional(),
    }).optional(),
    includeConstraintsSnapshot: z.boolean(),
    constraintsSnapshot: z.object({
      equipment: z.unknown().optional(),
      injuries: z.unknown().optional(),
      lowImpact: z.boolean().optional(),
      dietaryRules: z.unknown().optional(),
    }).optional(),
  });

}
