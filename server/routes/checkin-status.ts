import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { generateInteractionInsights } from "../openai";



export function registerCheckinStatusRoutes(app: Express): void {
  app.get("/api/ai/status", async (_req, res) => {
    try {
      const { getAIEngineStatus } = await import("../ai-engine");
      res.json(getAIEngineStatus());
    } catch {
      res.json({ status: "unknown" });
    }
  });

  app.get("/api/ai/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const aggregatedData = await storage.getAggregatedInteractionData(userId);
      const insights = await generateInteractionInsights(aggregatedData);
      res.json(insights);
    } catch (error) {
      console.error("Get AI insights error:", error);
      res.status(500).json({ error: "Failed to get AI insights" });
    }
  });

  app.get("/api/weekly-checkin/state", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const trialStartAt = user.trialStartAt || null;
      let currentWeekNumber = 1;
      
      if (trialStartAt) {
        const daysSinceStart = Math.floor((Date.now() - new Date(trialStartAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysSinceStart < 7) currentWeekNumber = 1;
        else if (daysSinceStart < 14) currentWeekNumber = 2;
        else if (daysSinceStart < 21) currentWeekNumber = 3;
        else currentWeekNumber = 4;
      }

      const responses = await storage.getWeeklyFeedbackResponses(req.session.userId!);
      const submittedWeeks = responses
        .filter(r => r.status === "submitted")
        .map(r => r.weekNumber);

      res.json({
        trialStartAt,
        currentWeekNumber,
        submittedWeeks
      });
    } catch (error) {
      console.error("Weekly checkin state error:", error);
      res.status(500).json({ error: "Failed to get weekly checkin state" });
    }
  });

  app.post("/api/weekly-checkin/start", requireAuth, async (req, res) => {
    try {
      const user = await storage.getUser(req.session.userId!);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      if (!user.trialStartAt) {
        const trialStartAt = new Date();
        await storage.updateUser(req.session.userId!, { trialStartAt });
        res.json({ trialStartAt });
      } else {
        res.json({ trialStartAt: user.trialStartAt });
      }
    } catch (error) {
      console.error("Weekly checkin start error:", error);
      res.status(500).json({ error: "Failed to start trial" });
    }
  });

  app.get("/api/weekly-checkin/:weekNumber", requireAuth, async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
        return res.status(400).json({ error: "Invalid week number" });
      }

      const response = await storage.getWeeklyFeedbackResponse(req.session.userId!, weekNumber);
      res.json(response || null);
    } catch (error) {
      console.error("Weekly checkin get error:", error);
      res.status(500).json({ error: "Failed to get weekly checkin" });
    }
  });

  app.post("/api/weekly-checkin/:weekNumber/save", requireAuth, async (req, res) => {
    try {
      const weekNumber = parseInt(req.params.weekNumber);
      if (isNaN(weekNumber) || weekNumber < 1 || weekNumber > 4) {
        return res.status(400).json({ error: "Invalid week number" });
      }

      const { status, answers } = req.body;
      if (!status || !["draft", "submitted"].includes(status)) {
        return res.status(400).json({ error: "Invalid status" });
      }

      const user = await storage.getUser(req.session.userId!);
      if (!user?.trialStartAt) {
        await storage.updateUser(req.session.userId!, { trialStartAt: new Date() });
      }

      const result = await storage.saveWeeklyFeedbackResponse({
        userId: req.session.userId!,
        weekNumber,
        status,
        answers,
        trialStartAt: user?.trialStartAt || new Date(),
      });

      res.json(result);
    } catch (error) {
      console.error("Weekly checkin save error:", error);
      res.status(500).json({ error: "Failed to save weekly checkin" });
    }
  });

}
