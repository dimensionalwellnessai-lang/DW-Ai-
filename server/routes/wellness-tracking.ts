import type { Express } from "express";
import { or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { insertResetProtocolSchema, insertUserPatternSchema, insertTrackingLogSchema, insertMealLogSchema, insertWaterLogSchema, insertUniversalPlanSchema, insertCompletionStatusSchema, insertDimensionBlueprintSchema } from "@shared/schema";
export function registerWellnessTrackingRoutes(app: Express): void {
  app.get("/api/dimension-blueprints", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const dimension = req.query.dimension as string | undefined;
      const blueprints = await storage.getDimensionBlueprints(userId, dimension);
      res.json(blueprints);
    } catch (error) {
      console.error("Get dimension blueprints error:", error);
      res.status(500).json({ error: "Failed to get dimension blueprints" });
    }
  });

  app.post("/api/dimension-blueprints", requireAuth, async (req, res) => {
    try {
      const data = insertDimensionBlueprintSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const blueprint = await storage.createDimensionBlueprint(data);
      res.json(blueprint);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create dimension blueprint error:", error);
      res.status(500).json({ error: "Failed to create dimension blueprint" });
    }
  });

  app.patch("/api/dimension-blueprints/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getDimensionBlueprint(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Dimension blueprint not found" });
      }
      const blueprint = await storage.updateDimensionBlueprint(id, req.body);
      if (!blueprint) {
        return res.status(404).json({ error: "Dimension blueprint not found" });
      }
      res.json(blueprint);
    } catch (error) {
      console.error("Update dimension blueprint error:", error);
      res.status(500).json({ error: "Failed to update dimension blueprint" });
    }
  });

  // Reset Protocol
  app.get("/api/reset-protocol", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const protocol = await storage.getResetProtocol(userId);
      res.json(protocol || {});
    } catch (error) {
      console.error("Get reset protocol error:", error);
      res.status(500).json({ error: "Failed to get reset protocol" });
    }
  });

  app.post("/api/reset-protocol", requireAuth, async (req, res) => {
    try {
      const data = insertResetProtocolSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const protocol = await storage.createResetProtocol(data);
      res.json(protocol);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create reset protocol error:", error);
      res.status(500).json({ error: "Failed to create reset protocol" });
    }
  });

  app.patch("/api/reset-protocol/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getResetProtocolById(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Reset protocol not found" });
      }
      const protocol = await storage.updateResetProtocol(id, req.body);
      if (!protocol) {
        return res.status(404).json({ error: "Reset protocol not found" });
      }
      res.json(protocol);
    } catch (error) {
      console.error("Update reset protocol error:", error);
      res.status(500).json({ error: "Failed to update reset protocol" });
    }
  });

  // User Patterns
  app.get("/api/patterns", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const isActive = req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined;
      const patterns = await storage.getUserPatterns(userId, isActive);
      res.json(patterns);
    } catch (error) {
      console.error("Get user patterns error:", error);
      res.status(500).json({ error: "Failed to get user patterns" });
    }
  });

  app.post("/api/patterns", requireAuth, async (req, res) => {
    try {
      const data = insertUserPatternSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const pattern = await storage.createUserPattern(data);
      res.json(pattern);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create user pattern error:", error);
      res.status(500).json({ error: "Failed to create user pattern" });
    }
  });

  // Tracking Logs
  app.get("/api/tracking-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const trackingType = req.query.trackingType as string | undefined;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getTrackingLogs(userId, trackingType, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get tracking logs error:", error);
      res.status(500).json({ error: "Failed to get tracking logs" });
    }
  });

  app.post("/api/tracking-logs", requireAuth, async (req, res) => {
    try {
      const data = insertTrackingLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createTrackingLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create tracking log error:", error);
      res.status(500).json({ error: "Failed to create tracking log" });
    }
  });

  // Meal Logs
  app.get("/api/meal-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getMealLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get meal logs error:", error);
      res.status(500).json({ error: "Failed to get meal logs" });
    }
  });

  app.post("/api/meal-logs", requireAuth, async (req, res) => {
    try {
      const data = insertMealLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createMealLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create meal log error:", error);
      res.status(500).json({ error: "Failed to create meal log" });
    }
  });

  // Water Logs
  app.get("/api/water-logs", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 100;
      const logs = await storage.getWaterLogs(userId, limit);
      res.json(logs);
    } catch (error) {
      console.error("Get water logs error:", error);
      res.status(500).json({ error: "Failed to get water logs" });
    }
  });

  app.post("/api/water-logs", requireAuth, async (req, res) => {
    try {
      const data = insertWaterLogSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const log = await storage.createWaterLog(data);
      res.json(log);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create water log error:", error);
      res.status(500).json({ error: "Failed to create water log" });
    }
  });

  // Universal Plans
  app.get("/api/universal-plans", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const planType = req.query.planType as string | undefined;
      const plans = await storage.getUniversalPlans(userId, planType);
      res.json(plans);
    } catch (error) {
      console.error("Get universal plans error:", error);
      res.status(500).json({ error: "Failed to get universal plans" });
    }
  });

  app.post("/api/universal-plans", requireAuth, async (req, res) => {
    try {
      const data = insertUniversalPlanSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const plan = await storage.createUniversalPlan(data);
      res.json(plan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create universal plan error:", error);
      res.status(500).json({ error: "Failed to create universal plan" });
    }
  });

  app.patch("/api/universal-plans/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getUniversalPlan(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Universal plan not found" });
      }
      const plan = await storage.updateUniversalPlan(id, req.body);
      if (!plan) {
        return res.status(404).json({ error: "Universal plan not found" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Update universal plan error:", error);
      res.status(500).json({ error: "Failed to update universal plan" });
    }
  });

  // Completion Status
  app.get("/api/completion-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let status = await storage.getCompletionStatus(userId);
      
      // If no status exists, create a default one
      if (!status) {
        status = await storage.createCompletionStatus({
          userId,
          bodyScanCompleted: false,
          mealPreferencesCompleted: false,
          blueprintCompletions: {},
          resetProtocolCompleted: false,
          onboardingCompleted: false,
        });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Get completion status error:", error);
      res.status(500).json({ error: "Failed to get completion status" });
    }
  });

  app.post("/api/completion-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getCompletionStatus(userId);
      
      if (existing) {
        // Update existing
        const updated = await storage.updateCompletionStatus(userId, req.body);
        res.json(updated);
      } else {
        // Create new
        const data = insertCompletionStatusSchema.parse({
          ...req.body,
          userId,
        });
        const status = await storage.createCompletionStatus(data);
        res.json(status);
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create/update completion status error:", error);
      res.status(500).json({ error: "Failed to save completion status" });
    }
  });

  // Analyze Meal Photo (placeholder for AI vision integration)
  app.post("/api/analyze-meal-photo", requireAuth, async (req, res) => {
    try {
      const { photoUrl } = req.body;
      
      if (!photoUrl) {
        return res.status(400).json({ error: "Photo URL is required" });
      }

      // Placeholder for AI vision analysis
      // In a real implementation, this would use Google Vision API or OpenAI Vision
      const analysis = {
        items: ["Food item detected"],
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        confidence: 0,
        aiAnalysis: "Meal photo analysis not yet implemented. Please enter nutrition information manually.",
      };
      
      res.json(analysis);
    } catch (error) {
      console.error("Analyze meal photo error:", error);
      res.status(500).json({ error: "Failed to analyze meal photo" });
    }
  });

  // Achievements endpoints
  app.get("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievements = await storage.getAchievements(req.user!.id);
      res.json(achievements);
    } catch (error) {
      console.error("Get achievements error:", error);
      res.status(500).json({ error: "Failed to fetch achievements" });
    }
  });

  app.post("/api/achievements", requireAuth, async (req, res) => {
    try {
      const achievement = await storage.createAchievement({
        userId: req.user!.id,
        ...req.body,
      });
      res.json(achievement);
    } catch (error) {
      console.error("Create achievement error:", error);
      res.status(500).json({ error: "Failed to create achievement" });
    }
  });

  // Streaks endpoints
  app.get("/api/streaks", requireAuth, async (req, res) => {
    try {
      const { streakType } = req.query;
      const streaks = await storage.getStreaks(
        req.user!.id,
        streakType as string | undefined
      );
      res.json(streaks);
    } catch (error) {
      console.error("Get streaks error:", error);
      res.status(500).json({ error: "Failed to fetch streaks" });
    }
  });

  app.post("/api/streaks", requireAuth, async (req, res) => {
    try {
      const streak = await storage.createStreak({
        userId: req.user!.id,
        ...req.body,
      });
      res.json(streak);
    } catch (error) {
      console.error("Create streak error:", error);
      res.status(500).json({ error: "Failed to create streak" });
    }
  });

  app.patch("/api/streaks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const existing = await storage.getStreak(id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Streak not found" });
      }
      const streak = await storage.updateStreak(id, req.body);
      
      if (!streak) {
        return res.status(404).json({ error: "Streak not found" });
      }
      
      res.json(streak);
    } catch (error) {
      console.error("Update streak error:", error);
      res.status(500).json({ error: "Failed to update streak" });
    }
  });

  // Accountability tracking routes
}
