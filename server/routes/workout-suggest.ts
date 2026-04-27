import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { generateLearnModeQuestion, generateWorkoutPlan, generateMeditationSuggestions } from "../openai";
import { safeGetWearablesYesterday } from "./wearables";



export function registerWorkoutSuggestRoutes(app: Express): void {
  app.post("/api/workout/generate", async (req, res) => {
    try {
      const { preferences } = req.body;
      const userId = req.session.userId;
      const wearablesYesterday = userId ? await safeGetWearablesYesterday(userId) : null;
      const plan = await generateWorkoutPlan({ ...(preferences || {}), wearablesYesterday });
      res.json(plan);
    } catch (error) {
      console.error("Workout generation error:", error);
      res.status(500).json({ error: "Failed to generate workout plan" });
    }
  });

  app.post("/api/meditation/suggest", async (req, res) => {
    try {
      const { preferences } = req.body;
      const userId = req.session.userId;
      const wearablesYesterday = userId ? await safeGetWearablesYesterday(userId) : null;
      const suggestions = await generateMeditationSuggestions({ ...(preferences || {}), wearablesYesterday });
      res.json(suggestions);
    } catch (error) {
      console.error("Meditation suggestion error:", error);
      res.status(500).json({ error: "Failed to get meditation suggestions" });
    }
  });

  app.post("/api/learn-mode/question", async (req, res) => {
    try {
      const { previousAnswers, focusArea } = req.body;
      const result = await generateLearnModeQuestion(previousAnswers || [], focusArea);
      res.json(result);
    } catch (error) {
      console.error("Learn mode error:", error);
      res.status(500).json({ error: "Failed to generate question" });
    }
  });

  app.get("/api/category-entries", async (req, res) => {
    try {
      const userId = req.session.userId;
      if (!userId) {
        return res.json([]);
      }
      const category = req.query.category as string | undefined;
      const entries = await storage.getCategoryEntries(userId, category);
      res.json(entries);
    } catch (error) {
      res.status(500).json({ error: "Failed to get category entries" });
    }
  });

  app.delete("/api/category-entries/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteCategoryEntry(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

}
