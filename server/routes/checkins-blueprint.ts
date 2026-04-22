import type { Express } from "express";

import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { generateDashboardInsight, generateFullAnalysis } from "../openai";
import { insertBaselineProfileSchema, insertRecoveryReflectionSchema, insertRoutineSchema, insertStabilizingActionSchema, insertStressSignalsSchema, insertSupportPreferencesSchema } from "@shared/schema";
export function registerCheckinsBlueprintRoutes(app: Express): void {
  app.get("/api/checkins", requireAuth, async (req, res) => {
    const checkIns = await storage.getCheckIns(req.session.userId!);
    res.json(checkIns);
  });


  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const goals = await storage.getGoals(userId);
      const habits = await storage.getHabits(userId);

      res.json({ moodLogs, goals, habits });
    } catch (error) {
      res.status(500).json({ error: "Failed to load progress data" });
    }
  });

  app.get("/api/insight", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const habits = await storage.getHabits(userId);
      const goals = await storage.getGoals(userId);
      const profile = await storage.getOnboardingProfile(userId);
      const { getYesterdayHeadlineMetrics } = await import("./wearables");
      const wearablesYesterday = await getYesterdayHeadlineMetrics(userId).catch(() => null);

      const insight = await generateDashboardInsight({
        moodLogs: moodLogs.slice(0, 7).map(m => ({
          energyLevel: m.energyLevel,
          moodLevel: m.moodLevel,
          clarityLevel: m.clarityLevel,
          createdAt: m.createdAt,
        })),
        habits: habits.map(h => ({
          title: h.title,
          streak: h.streak || 0,
        })),
        goals: goals.map(g => ({
          title: g.title,
          progress: g.progress,
        })),
        peakMotivationTime: profile?.peakMotivationTime || undefined,
        wellnessFocus: profile?.wellnessFocus || undefined,
        wearablesYesterday,
      });

      res.json({ insight });
    } catch (error) {
      console.error("Insight error:", error);
      res.status(500).json({ error: "Failed to generate insight" });
    }
  });

  app.post("/api/insights/analyze", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const moodLogs = await storage.getMoodLogs(userId);
      const habits = await storage.getHabits(userId);
      const goals = await storage.getGoals(userId);
      const profile = await storage.getOnboardingProfile(userId);

      const analysis = await generateFullAnalysis({
        moodLogs: moodLogs.map(m => ({
          energyLevel: m.energyLevel,
          moodLevel: m.moodLevel,
          clarityLevel: m.clarityLevel,
          createdAt: m.createdAt,
        })),
        habits: habits.map(h => ({
          title: h.title,
          streak: h.streak || 0,
        })),
        goals: goals.map(g => ({
          title: g.title,
          progress: g.progress,
          wellnessDimension: g.wellnessDimension,
        })),
        peakMotivationTime: profile?.peakMotivationTime || undefined,
        wellnessFocus: profile?.wellnessFocus || undefined,
      });

      res.json(analysis);
    } catch (error) {
      console.error("Analysis error:", error);
      res.status(500).json({ error: "Failed to generate analysis" });
    }
  });

  app.get("/api/blueprint", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const [baseline, signals, actions, support, reflections] = await Promise.all([
        storage.getBaselineProfile(blueprint.id),
        storage.getStressSignals(blueprint.id),
        storage.getStabilizingActions(blueprint.id),
        storage.getSupportPreferences(blueprint.id),
        storage.getRecoveryReflections(blueprint.id),
      ]);
      
      res.json({
        blueprint,
        baseline,
        signals,
        actions,
        support,
        reflections,
      });
    } catch (error) {
      console.error("Blueprint error:", error);
      res.status(500).json({ error: "Failed to load blueprint" });
    }
  });

  app.patch("/api/blueprint", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.status(404).json({ error: "Blueprint not found" });
      }
      const updated = await storage.updateWellnessBlueprint(blueprint.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update blueprint" });
    }
  });

  app.post("/api/blueprint/baseline", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getBaselineProfile(blueprint.id);
      if (existing) {
        const updated = await storage.updateBaselineProfile(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertBaselineProfileSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createBaselineProfile(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save baseline profile" });
    }
  });

  app.post("/api/blueprint/signals", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getStressSignals(blueprint.id);
      if (existing) {
        const updated = await storage.updateStressSignals(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertStressSignalsSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createStressSignals(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save stress signals" });
    }
  });

  app.get("/api/blueprint/actions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.json([]);
      }
      const actions = await storage.getStabilizingActions(blueprint.id);
      res.json(actions);
    } catch (error) {
      res.status(500).json({ error: "Failed to load actions" });
    }
  });

  app.post("/api/blueprint/actions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const data = insertStabilizingActionSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createStabilizingAction(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create action" });
    }
  });

  app.patch("/api/blueprint/actions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const action = await storage.getStabilizingAction(req.params.id);
      if (!action) {
        return res.status(404).json({ error: "Action not found" });
      }
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint || action.blueprintId !== blueprint.id) {
        return res.status(404).json({ error: "Action not found" });
      }
      const updated = await storage.updateStabilizingAction(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update action" });
    }
  });

  app.delete("/api/blueprint/actions/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteStabilizingAction(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete action" });
    }
  });

  app.post("/api/blueprint/support", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const existing = await storage.getSupportPreferences(blueprint.id);
      if (existing) {
        const updated = await storage.updateSupportPreferences(existing.id, req.body);
        return res.json(updated);
      }
      
      const data = insertSupportPreferencesSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createSupportPreferences(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save support preferences" });
    }
  });

  app.get("/api/blueprint/reflections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        return res.json([]);
      }
      const reflections = await storage.getRecoveryReflections(blueprint.id);
      res.json(reflections);
    } catch (error) {
      res.status(500).json({ error: "Failed to load reflections" });
    }
  });

  app.post("/api/blueprint/reflections", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      let blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint) {
        blueprint = await storage.createWellnessBlueprint({ userId });
      }
      
      const data = insertRecoveryReflectionSchema.parse({ ...req.body, blueprintId: blueprint.id });
      const created = await storage.createRecoveryReflection(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create reflection" });
    }
  });

  app.patch("/api/blueprint/reflections/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const reflection = await storage.getRecoveryReflection(req.params.id);
      if (!reflection) {
        return res.status(404).json({ error: "Reflection not found" });
      }
      const blueprint = await storage.getWellnessBlueprint(userId);
      if (!blueprint || reflection.blueprintId !== blueprint.id) {
        return res.status(404).json({ error: "Reflection not found" });
      }
      const updated = await storage.updateRecoveryReflection(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update reflection" });
    }
  });

  app.delete("/api/blueprint/reflections/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteRecoveryReflection(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete reflection" });
    }
  });

  app.get("/api/routines", requireAuth, async (req, res) => {
    try {
      const routines = await storage.getRoutines(req.session.userId!);
      res.json(routines);
    } catch (error) {
      res.status(500).json({ error: "Failed to load routines" });
    }
  });

  app.post("/api/routines", requireAuth, async (req, res) => {
    try {
      const data = insertRoutineSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createRoutine(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create routine" });
    }
  });

  app.patch("/api/routines/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const routine = await storage.getRoutine(req.params.id);
      if (!routine || routine.userId !== userId) {
        return res.status(404).json({ error: "Routine not found" });
      }
      const updated = await storage.updateRoutine(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update routine" });
    }
  });

  app.delete("/api/routines/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteRoutine(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete routine" });
    }
  });

  // ── Shared AI limiter for new non-chat AI endpoints ────────────────────────
}
