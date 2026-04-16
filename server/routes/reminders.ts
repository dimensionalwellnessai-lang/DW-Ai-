import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { insertReminderSchema } from "@shared/schema";

export function registerRemindersRoutes(app: Express): void {
  app.get("/api/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const status = typeof req.query.status === "string" ? req.query.status : undefined;
      const items = await storage.getReminders(userId, status);
      res.json(items);
    } catch (err) {
      console.error("GET /api/reminders error:", err);
      res.status(500).json({ error: "Failed to fetch reminders" });
    }
  });

  // POST /api/reminders – create a reminder
  app.post("/api/reminders", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = insertReminderSchema.safeParse({ ...req.body, userId });
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid reminder data", details: parsed.error.flatten() });
      }
      const created = await storage.createReminder(parsed.data);
      res.status(201).json(created);
    } catch (err) {
      console.error("POST /api/reminders error:", err);
      res.status(500).json({ error: "Failed to create reminder" });
    }
  });

  // PATCH /api/reminders/:id – update status or reschedule
  app.patch("/api/reminders/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { id } = req.params;
      const { status, scheduledAt, title, body } = req.body as {
        status?: string;
        scheduledAt?: string;
        title?: string;
        body?: string;
      };
      const fields: Record<string, unknown> = {};
      if (status !== undefined) fields.status = status;
      if (scheduledAt !== undefined) fields.scheduledAt = new Date(scheduledAt);
      if (title !== undefined) fields.title = title;
      if (body !== undefined) fields.body = body;
      const updated = await storage.updateReminder(id, userId, fields as Parameters<typeof storage.updateReminder>[2]);
      if (!updated) return res.status(404).json({ error: "Reminder not found" });
      res.json(updated);
    } catch (err) {
      console.error("PATCH /api/reminders/:id error:", err);
      res.status(500).json({ error: "Failed to update reminder" });
    }
  });

  // POST /api/reminders/cancel-by-source – cancel reminders matching a source entity
  app.post("/api/reminders/cancel-by-source", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { sourceEntityType, sourceEntityId } = req.body as {
        sourceEntityType?: string;
        sourceEntityId?: string;
      };
      if (!sourceEntityType || !sourceEntityId) {
        return res.status(400).json({ error: "sourceEntityType and sourceEntityId are required" });
      }
      await storage.cancelRemindersBySource(userId, sourceEntityType, sourceEntityId);
      res.json({ success: true });
    } catch (err) {
      console.error("POST /api/reminders/cancel-by-source error:", err);
      res.status(500).json({ error: "Failed to cancel reminders" });
    }
  });

  // ── Learning Profile (PR #8: DW Learns) ───────────────────────────────────

  // GET /api/learning-profile – get profile for the authenticated user
}
