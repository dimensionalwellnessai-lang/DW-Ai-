import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";


export function registerNotificationsRoutes(app: Express): void {
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const notifs = await storage.getUserNotifications(req.session.userId!);
      res.json(notifs);
    } catch (err) {
      console.error("GET /api/notifications error:", err);
      res.status(500).json([]);
    }
  });

  app.get("/api/notifications/count", requireAuth, async (req, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.session.userId!);
      res.json({ count });
    } catch (err) {
      res.json({ count: 0 });
    }
  });

  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      await storage.markNotificationRead(req.params.id, req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      await storage.markAllNotificationsRead(req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  app.delete("/api/notifications/:id", requireAuth, async (req, res) => {
    try {
      await storage.deleteNotification(req.params.id, req.session.userId!);
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: "Failed" });
    }
  });

  // Generate DW daily affirmation notification (called on app open, max once per day)
  app.post("/api/notifications/dw-daily", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const today = new Date().toISOString().split("T")[0];
      // Check if we already sent one today
      const existing = await storage.getUserNotifications(userId);
      const alreadySent = existing.some((n: any) => n.type === "dw_affirmation" && n.created_at?.toISOString?.()?.startsWith(today));
      if (alreadySent) return res.json({ sent: false });

      const user = await storage.getUser(userId);
      const name = (user as any)?.systemName || (user as any)?.firstName || "friend";
      const hour = new Date().getHours();
      const timeOfDay = hour < 12 ? "morning" : hour < 17 ? "afternoon" : "evening";

      let affirmation = `Good ${timeOfDay}, ${name}. Today is a fresh opportunity to move toward who you're becoming. You don't have to do it all — just one step.`;
      try {
        const { generateAffirmation } = await import("../openai");
        affirmation = await generateAffirmation(name, timeOfDay);
      } catch (_) {}

      const notif = await storage.createNotification({
        userId,
        type: "dw_affirmation",
        title: `Good ${timeOfDay}, ${name} ✨`,
        body: affirmation,
        actionUrl: "/talk",
      });
      res.json({ sent: true, notification: notif });
    } catch (err) {
      console.error("DW daily affirmation error:", err);
      res.status(500).json({ sent: false });
    }
  });

}
