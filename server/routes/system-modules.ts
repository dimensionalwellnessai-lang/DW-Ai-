import type { Express } from "express";

import { z } from "zod";
import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { insertDailyScheduleEventSchema, insertSystemModuleSchema, insertUserSystemPreferencesSchema } from "@shared/schema";
export function registerSystemModulesRoutes(app: Express): void {
  app.get("/api/system-modules", requireAuth, async (req, res) => {
    try {
      const modules = await storage.getSystemModules(req.session.userId!);
      res.json(modules);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system modules" });
    }
  });

  app.get("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      const module = await storage.getSystemModule(req.params.id);
      if (!module) {
        return res.status(404).json({ error: "System module not found" });
      }
      res.json(module);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system module" });
    }
  });

  app.post("/api/system-modules", requireAuth, async (req, res) => {
    try {
      const data = insertSystemModuleSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createSystemModule(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create system module" });
    }
  });

  app.patch("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getSystemModule(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "System module not found" });
      }
      const updated = await storage.updateSystemModule(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "System module not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update system module" });
    }
  });

  app.delete("/api/system-modules/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteSystemModule(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete system module" });
    }
  });

  app.get("/api/schedule-events", requireAuth, async (req, res) => {
    try {
      const dayOfWeek = req.query.day ? parseInt(req.query.day as string) : undefined;
      let events;
      if (dayOfWeek !== undefined && !isNaN(dayOfWeek)) {
        events = await storage.getScheduleEventsByDay(req.session.userId!, dayOfWeek);
      } else {
        events = await storage.getScheduleEvents(req.session.userId!);
      }
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to load schedule events" });
    }
  });

  app.post("/api/schedule-events", requireAuth, async (req, res) => {
    try {
      const data = insertDailyScheduleEventSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createScheduleEvent(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create schedule event" });
    }
  });

  app.patch("/api/schedule-events/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const existing = await storage.getScheduleEvent(req.params.id);
      if (!existing || existing.userId !== userId) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      const updated = await storage.updateScheduleEvent(req.params.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Schedule event not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update schedule event" });
    }
  });

  app.delete("/api/schedule-events/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteScheduleEvent(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete schedule event" });
    }
  });

  app.get("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await storage.getUserSystemPreferences(req.session.userId!);
      res.json(prefs || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to load system preferences" });
    }
  });

  app.post("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserSystemPreferences(req.session.userId!);
      if (existing) {
        const updated = await storage.updateUserSystemPreferences(req.session.userId!, req.body);
        return res.json(updated);
      }
      const data = insertUserSystemPreferencesSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createUserSystemPreferences(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to save system preferences" });
    }
  });

  app.patch("/api/system-preferences", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getUserSystemPreferences(req.session.userId!);
      if (!existing) {
        const data = insertUserSystemPreferencesSchema.parse({ ...req.body, userId: req.session.userId! });
        const created = await storage.createUserSystemPreferences(data);
        return res.json(created);
      }
      const updated = await storage.updateUserSystemPreferences(req.session.userId!, req.body);
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to update system preferences" });
    }
  });


}
