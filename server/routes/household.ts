import type { Express } from "express";

import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { insertHouseholdCleaningTaskSchema, insertHouseholdLaundryScheduleSchema } from "@shared/schema";
export function registerHouseholdRoutes(app: Express): void {
  app.get("/api/household-cleaning-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const tasks = await storage.getHouseholdCleaningTasks(userId);
      res.json(tasks);
    } catch (error) {
      console.error("Get cleaning tasks error:", error);
      res.status(500).json({ error: "Failed to get cleaning tasks" });
    }
  });

  app.post("/api/household-cleaning-tasks", requireAuth, async (req, res) => {
    try {
      const data = insertHouseholdCleaningTaskSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const task = await storage.createHouseholdCleaningTask(data);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create cleaning task error:", error);
      res.status(500).json({ error: "Failed to create cleaning task" });
    }
  });

  app.patch("/api/household-cleaning-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const task = await storage.updateHouseholdCleaningTask(id, userId, req.body);
      if (!task) {
        return res.status(404).json({ error: "Cleaning task not found" });
      }
      res.json(task);
    } catch (error) {
      console.error("Update cleaning task error:", error);
      res.status(500).json({ error: "Failed to update cleaning task" });
    }
  });

  app.delete("/api/household-cleaning-tasks/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteHouseholdCleaningTask(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete cleaning task error:", error);
      res.status(500).json({ error: "Failed to delete cleaning task" });
    }
  });

  // Household Laundry Schedule
  app.get("/api/household-laundry-schedule", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schedule = await storage.getHouseholdLaundrySchedule(userId);
      res.json(schedule);
    } catch (error) {
      console.error("Get laundry schedule error:", error);
      res.status(500).json({ error: "Failed to get laundry schedule" });
    }
  });

  app.post("/api/household-laundry-schedule", requireAuth, async (req, res) => {
    try {
      const data = insertHouseholdLaundryScheduleSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });
      const schedule = await storage.createHouseholdLaundrySchedule(data);
      res.json(schedule);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Create laundry schedule error:", error);
      res.status(500).json({ error: "Failed to create laundry schedule" });
    }
  });

  app.patch("/api/household-laundry-schedule/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const schedule = await storage.updateHouseholdLaundrySchedule(id, userId, req.body);
      if (!schedule) {
        return res.status(404).json({ error: "Laundry schedule not found" });
      }
      res.json(schedule);
    } catch (error) {
      console.error("Update laundry schedule error:", error);
      res.status(500).json({ error: "Failed to update laundry schedule" });
    }
  });

  app.delete("/api/household-laundry-schedule/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      await storage.deleteHouseholdLaundrySchedule(id, userId);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete laundry schedule error:", error);
      res.status(500).json({ error: "Failed to delete laundry schedule" });
    }
  });

  // AI Feature Usage Tracking
}
