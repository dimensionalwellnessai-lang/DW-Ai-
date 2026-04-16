import type { Express } from "express";

import { z } from "zod";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { updateUserLearningProfileSchema } from "@shared/schema";

export function registerLearningProfileRoutes(app: Express): void {
  app.get("/api/learning-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getLearningProfile(userId);
      if (!profile) {
        // Return sensible empty defaults so the client always gets a valid shape
        return res.json({
          preferredTimes: {},
          preferredActionTypes: [],
          sensitivity: {},
          frictionPoints: [],
          wins: [],
          avoid: [],
          lastFeedbackAt: null,
          learningEnabled: true,
          updatedAt: null,
        });
      }
      res.json(profile);
    } catch (err) {
      console.error("GET /api/learning-profile error:", err);
      res.status(500).json({ error: "Failed to fetch learning profile" });
    }
  });

  // PATCH /api/learning-profile – manual user edits
  app.patch("/api/learning-profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = updateUserLearningProfileSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
      }
      const profile = await storage.upsertLearningProfile(userId, { ...parsed.data, lastFeedbackAt: new Date() });
      res.json(profile);
    } catch (err) {
      console.error("PATCH /api/learning-profile error:", err);
      res.status(500).json({ error: "Failed to update learning profile" });
    }
  });

  // POST /api/learning-profile/reset – reset all learned data
  app.post("/api/learning-profile/reset", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.resetLearningProfile(userId);
      res.json(profile);
    } catch (err) {
      console.error("POST /api/learning-profile/reset error:", err);
      res.status(500).json({ error: "Failed to reset learning profile" });
    }
  });

  // POST /api/learning-profile/auto-update – internal endpoint for event-driven updates
  // Called from: daily check-in completion, reminder snooze/dismiss, plan action completion
  app.post("/api/learning-profile/auto-update", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getLearningProfile(userId);
      // Stop auto-updates if user has disabled learning
      if (profile && profile.learningEnabled === false) {
        return res.json({ skipped: true });
      }

      const autoUpdateSchema = z.discriminatedUnion("event", [
        z.object({
          event: z.literal("checkin"),
          payload: z.object({ constraintType: z.string().optional(), moodScore: z.number().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("reminder_snooze"),
          payload: z.object({ snoozedToHour: z.number().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("reminder_dismiss"),
          payload: z.object({}).passthrough(),
        }),
        z.object({
          event: z.literal("plan_action_complete"),
          payload: z.object({ actionType: z.string().optional(), title: z.string().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("followup_accept"),
          payload: z.object({ actionType: z.string().optional() }).passthrough(),
        }),
        z.object({
          event: z.literal("followup_dismiss"),
          payload: z.object({ actionType: z.string().optional() }).passthrough(),
        }),
      ]);

      const parsed = autoUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request body for learning profile auto-update" });
      }

      const { event, payload } = parsed.data;

      const patch: Record<string, unknown> = {};

      if (event === "checkin") {
        // Learn from constraint types and mood trends
        const constraintType = payload.constraintType as string | undefined;
        if (constraintType && constraintType !== "none") {
          const current = await storage.getLearningProfile(userId);
          const fp = [...(current?.frictionPoints ?? [])];
          if (!fp.includes(constraintType)) {
            fp.unshift(constraintType);
            patch.frictionPoints = fp.slice(0, 5); // keep top 5
          }
        }
      } else if (event === "reminder_snooze") {
        // Snoozed reminders → lower reminder sensitivity or adjust time.
        // NOTE: _snoozeCount and _dismissCount are internal tracking keys stored
        // in the sensitivity JSON blob (prefixed with _ to distinguish them from
        // user-facing keys like "reminders"). They are not shown in the UI.
        const current = await storage.getLearningProfile(userId);
        const sens = { ...(current?.sensitivity ?? {}) };
        const snoozeCount = (parseInt(String(sens._snoozeCount ?? "0"), 10) || 0) + 1;
        sens._snoozeCount = String(snoozeCount);
        if (snoozeCount >= 3) {
          sens.reminders = "low";
        }
        patch.sensitivity = sens;
        // Learn preferred time from where the user snoozed TO (that's their actual preferred time)
        const snoozedToHour = payload.snoozedToHour;
        if (typeof snoozedToHour === "number") {
          const times = { ...(current?.preferredTimes ?? {}) };
          times.reminder = `${String(snoozedToHour).padStart(2, "0")}:00`;
          patch.preferredTimes = times;
        }
      } else if (event === "reminder_dismiss") {
        const current = await storage.getLearningProfile(userId);
        const sens = { ...(current?.sensitivity ?? {}) };
        const dismissCount = (parseInt(String(sens._dismissCount ?? "0"), 10) || 0) + 1;
        sens._dismissCount = String(dismissCount);
        if (dismissCount >= 5) {
          sens.reminders = "low";
        }
        patch.sensitivity = sens;
      } else if (event === "plan_action_complete") {
        // Learn from which action types get completed
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const pat = [...(current?.preferredActionTypes ?? [])];
          if (!pat.includes(actionType)) {
            pat.unshift(actionType);
          } else {
            // Bubble to top
            const idx = pat.indexOf(actionType);
            pat.splice(idx, 1);
            pat.unshift(actionType);
          }
          patch.preferredActionTypes = pat.slice(0, 6);
          const wins = [...(current?.wins ?? [])];
          const winLabel = payload.title as string | undefined;
          if (winLabel && !wins.includes(winLabel)) {
            wins.unshift(winLabel);
            patch.wins = wins.slice(0, 10);
          }
        }
      } else if (event === "followup_accept") {
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const pat = [...(current?.preferredActionTypes ?? [])];
          if (!pat.includes(actionType)) pat.push(actionType);
          patch.preferredActionTypes = pat.slice(0, 6);
        }
      } else if (event === "followup_dismiss") {
        const actionType = payload.actionType as string | undefined;
        if (actionType) {
          const current = await storage.getLearningProfile(userId);
          const avoid = [...(current?.avoid ?? [])];
          if (!avoid.includes(actionType)) avoid.push(actionType);
          patch.avoid = avoid.slice(0, 10);
        }
      }

      if (Object.keys(patch).length === 0) {
        return res.json({ skipped: true });
      }

      const updated = await storage.upsertLearningProfile(userId, patch as Parameters<typeof storage.upsertLearningProfile>[1]);
      res.json(updated);
    } catch (err) {
      console.error("POST /api/learning-profile/auto-update error:", err);
      res.status(500).json({ error: "Failed to auto-update learning profile" });
    }
  });

}
