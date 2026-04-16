import type { Express } from "express";
import { or } from "drizzle-orm";
import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { insertLifeDimensionAssessmentSchema, insertDimensionSystemSchema, insertWellnessPreferencesSchema, insertUserValuesRulesSchema, insertFeatureSettingsSchema } from "@shared/schema";
export function registerDimensionsConfigRoutes(app: Express): void {
  app.get("/api/life-dimension-assessments", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const assessments = await storage.getLifeDimensionAssessments(userId);
      res.json(assessments);
    } catch (error) {
      console.error("Get life dimension assessments error:", error);
      res.status(500).json({ error: "Failed to get assessments" });
    }
  });

  app.post("/api/life-dimension-assessments", requireAuth, async (req, res) => {
    try {
      const data = insertLifeDimensionAssessmentSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const assessment = await storage.createLifeDimensionAssessment(data);
      res.json(assessment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create assessment error:", error);
      res.status(500).json({ error: "Failed to create assessment" });
    }
  });

  // Dimension Systems
  app.get("/api/dimension-systems", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const dimension = req.query.dimension as string | undefined;
      const systems = await storage.getDimensionSystems(userId, dimension);
      res.json(systems);
    } catch (error) {
      console.error("Get dimension systems error:", error);
      res.status(500).json({ error: "Failed to get systems" });
    }
  });

  app.post("/api/dimension-systems", requireAuth, async (req, res) => {
    try {
      const data = insertDimensionSystemSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const system = await storage.createDimensionSystem(data);
      res.json(system);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create system error:", error);
      res.status(500).json({ error: "Failed to create system" });
    }
  });

  app.patch("/api/dimension-systems/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const system = await storage.updateDimensionSystem(id, userId, req.body);
      if (!system) {
        return res.status(404).json({ error: "System not found" });
      }
      res.json(system);
    } catch (error) {
      console.error("Update system error:", error);
      res.status(500).json({ error: "Failed to update system" });
    }
  });

  app.delete("/api/dimension-systems/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteDimensionSystem(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete system error:", error);
      res.status(500).json({ error: "Failed to delete system" });
    }
  });

  // Wellness Preferences
  app.get("/api/wellness-preferences", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const preferences = await storage.getWellnessPreferences(userId);
      res.json(preferences ?? null);
    } catch (error) {
      console.error("Get wellness preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.post("/api/wellness-preferences", requireAuth, async (req, res) => {
    try {
      const data = insertWellnessPreferencesSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const preferences = await storage.createWellnessPreferences(data);
      res.json(preferences);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create wellness preferences error:", error);
      res.status(500).json({ error: "Failed to create preferences" });
    }
  });

  app.patch("/api/wellness-preferences/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const parsed = insertWellnessPreferencesSchema
        .omit({ userId: true })
        .partial()
        .safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.errors });
      }
      const preferences = await storage.updateWellnessPreferences(id, userId, parsed.data);
      if (!preferences) {
        return res.status(404).json({ error: "Preferences not found" });
      }
      res.json(preferences);
    } catch (error) {
      console.error("Update wellness preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ── Cosmic Consent ──────────────────────────────────────────────────────────
  // Returns useAstrologyInGuidance + useNumerologyInGuidance for authenticated user.
  app.get("/api/cosmic/consent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const prefs = await storage.getWellnessPreferences(userId);
      res.json({
        useAstrologyInGuidance: prefs?.useAstrologyInGuidance ?? false,
        useNumerologyInGuidance: prefs?.useNumerologyInGuidance ?? false,
      });
    } catch (error) {
      console.error("Get cosmic consent error:", error);
      res.status(500).json({ error: "Failed to get cosmic consent" });
    }
  });

  app.patch("/api/cosmic/consent", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { useAstrologyInGuidance, useNumerologyInGuidance } = req.body as {
        useAstrologyInGuidance?: boolean;
        useNumerologyInGuidance?: boolean;
      };
      const update: Record<string, boolean> = {};
      if (typeof useAstrologyInGuidance === "boolean") update.useAstrologyInGuidance = useAstrologyInGuidance;
      if (typeof useNumerologyInGuidance === "boolean") update.useNumerologyInGuidance = useNumerologyInGuidance;

      if (Object.keys(update).length === 0) {
        return res.status(400).json({ error: "At least one of useAstrologyInGuidance or useNumerologyInGuidance must be provided" });
      }

      let prefs = await storage.getWellnessPreferences(userId);
      if (prefs) {
        await storage.updateWellnessPreferences(prefs.id, userId, update);
      } else {
        prefs = await storage.createWellnessPreferences({ userId, ...update });
      }

      const updated = await storage.getWellnessPreferences(userId);
      res.json({
        useAstrologyInGuidance: updated?.useAstrologyInGuidance ?? false,
        useNumerologyInGuidance: updated?.useNumerologyInGuidance ?? false,
      });
    } catch (error) {
      console.error("Update cosmic consent error:", error);
      res.status(500).json({ error: "Failed to update cosmic consent" });
    }
  });

  // User Values & Rules
  app.get("/api/user-values-rules", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const record = await storage.getUserValuesRules(userId);
      res.json(record || null);
    } catch (error) {
      console.error("Get user values rules error:", error);
      res.status(500).json({ error: "Failed to get values & rules" });
    }
  });

  app.post("/api/user-values-rules", requireAuth, async (req, res) => {
    try {
      const data = insertUserValuesRulesSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const record = await storage.createUserValuesRules(data);
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create user values rules error:", error);
      res.status(500).json({ error: "Failed to create values & rules" });
    }
  });

  app.patch("/api/user-values-rules/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const data = insertUserValuesRulesSchema.omit({ userId: true }).partial().parse(req.body);
      const record = await storage.updateUserValuesRules(id, userId, data);
      if (!record) {
        return res.status(404).json({ error: "Values & rules not found" });
      }
      res.json(record);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update user values rules error:", error);
      res.status(500).json({ error: "Failed to update values & rules" });
    }
  });

  // Feature Settings
  app.get("/api/feature-settings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const settings = await storage.getFeatureSettings(userId);
      res.json(settings);
    } catch (error) {
      console.error("Get feature settings error:", error);
      res.status(500).json({ error: "Failed to get feature settings" });
    }
  });

  app.post("/api/feature-settings", requireAuth, async (req, res) => {
    try {
      const data = insertFeatureSettingsSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const settings = await storage.createFeatureSettings(data);
      res.json(settings);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create feature settings error:", error);
      res.status(500).json({ error: "Failed to create feature settings" });
    }
  });

  app.patch("/api/feature-settings/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const settings = await storage.updateFeatureSettings(id, userId, req.body);
      if (!settings) {
        return res.status(404).json({ error: "Feature settings not found" });
      }
      res.json(settings);
    } catch (error) {
      console.error("Update feature settings error:", error);
      res.status(500).json({ error: "Failed to update feature settings" });
    }
  });

}
