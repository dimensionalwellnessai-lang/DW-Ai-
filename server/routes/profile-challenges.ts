import type { Express } from "express";
import { and } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { openai } from "../openai";
import { insertChallengeSchema, insertUserProfileSchema } from "@shared/schema";
export function registerProfileChallengesRoutes(app: Express): void {
  app.get("/api/profile/lifestyle-preferences", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.session.userId!);
      res.json((profile?.lifestylePreferences as Record<string, string>) ?? {});
    } catch {
      res.status(500).json({ error: "Failed to load lifestyle preferences" });
    }
  });

  app.post("/api/profile/lifestyle-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = req.body as Record<string, string>;
      const existing = await storage.getUserProfile(userId);
      if (existing) {
        const updated = await storage.updateUserProfile(userId, { lifestylePreferences: prefs });
        res.json(updated?.lifestylePreferences ?? prefs);
      } else {
        const created = await storage.createUserProfile({ userId, lifestylePreferences: prefs });
        res.json(created?.lifestylePreferences ?? prefs);
      }
    } catch {
      res.status(500).json({ error: "Failed to save lifestyle preferences" });
    }
  });

  app.get("/api/profile", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.session.userId!);
      res.json(profile || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.post("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserProfile(req.session.userId!);
      if (existing) {
        const updated = await storage.updateUserProfile(req.session.userId!, req.body);
        return res.json(updated);
      }
      const data = insertUserProfileSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createUserProfile(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  app.patch("/api/profile", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserProfile(req.session.userId!);
      if (!existing) {
        const data = insertUserProfileSchema.parse({ ...req.body, userId: req.session.userId! });
        const created = await storage.createUserProfile(data);
        return res.json(created);
      }
      const updated = await storage.updateUserProfile(req.session.userId!, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update profile" });
    }
  });

  app.get("/api/challenges", requireAuth, async (req, res) => {
    try {
      const userChallenges = await storage.getChallenges(req.session.userId!);
      res.json(userChallenges);
    } catch (error) {
      res.status(500).json({ error: "Failed to load challenges" });
    }
  });

  app.get("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const challenge = await storage.getChallenge(req.params.id, req.session.userId!);
      if (!challenge) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(challenge);
    } catch (error) {
      res.status(500).json({ error: "Failed to load challenge" });
    }
  });

  app.post("/api/challenges", requireAuth, async (req, res) => {
    try {
      const data = insertChallengeSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createChallenge(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create challenge" });
    }
  });

  app.patch("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateChallenge(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update challenge" });
    }
  });

  app.delete("/api/challenges/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteChallenge(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Challenge not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete challenge" });
    }
  });

  // Body scan data is never stored — privacy by design.
  // The POST endpoint returns a success stub without DB writes.
  // The GET history endpoint is intentionally removed.
  app.post("/api/body-scans", requireAuth, async (_req, res) => {
    // No data is written to the database. Scans are transient, used only
    // for the current session to personalize the AI.
    res.json({ id: "transient", stored: false });
  });

  // ── Body Scan AI Analysis ─────────────────────────────────────────────────
  app.post("/api/body-scan/analyze", requireAuth, async (req, res) => {
    try {
      const { photoDataUrl, measurements, bodyGoal, focusAreas, currentState, exercise } = req.body;
      const isFormCheck = !!exercise;

      const systemPrompt = isFormCheck
        ? `You are DW, a professional fitness coach. The user is performing "${exercise}". Analyze their form in the photo and give short, direct coaching feedback. Focus on: alignment, posture, safety, and technique. Be encouraging but specific. Keep it under 80 words.`
        : `You are DW, a wellness AI. Analyze the user's body photo and measurements to provide personalized, compassionate insights. Cover: posture assessment, body type observation, key areas to focus on, and 3 specific recommendations for their stated goal. Be honest, supportive, and specific. Keep it under 200 words. Start with a positive observation.`;

      const userContent: any[] = [];

      if (photoDataUrl) {
        userContent.push({ type: "image_url", image_url: { url: photoDataUrl } });
      }

      const contextText = isFormCheck
        ? `Exercise: ${exercise}. Please analyze my form in this photo.`
        : [
            currentState && `How I'm feeling: ${currentState}`,
            bodyGoal && `Goal: ${bodyGoal}`,
            focusAreas?.length && `Focus areas: ${focusAreas.join(", ")}`,
            measurements?.heightCm && `Height: ${measurements.heightCm}cm`,
            measurements?.weightKg && `Weight: ${measurements.weightKg}kg`,
          ].filter(Boolean).join("\n") || "No additional context provided.";

      userContent.push({ type: "text", text: contextText });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: photoDataUrl ? userContent : contextText },
        ],
        max_tokens: 400,
      });

      res.json({ analysis: response.choices[0].message.content });
    } catch (error: any) {
      console.error("Body scan analyze error:", error);
      res.status(500).json({ error: "Failed to analyze. Please try again." });
    }
  });

}
