import type { Express } from "express";
import { and } from "drizzle-orm";

import { storage } from "../storage";

import { requireAuth } from "./_shared";


export function registerUsersRoutes(app: Express): void {
  app.get("/api/users/check-username", async (req, res) => {
    const { username } = req.query as { username: string };
    if (!username || username.length < 3) return res.json({ available: false, reason: "Too short" });
    if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.json({ available: false, reason: "Only letters, numbers, _ . -" });
    try {
      const existing = await storage.getUserByUsername(username);
      res.json({ available: !existing });
    } catch (err) {
      res.status(500).json({ available: false });
    }
  });

  app.post("/api/users/set-username", requireAuth, async (req, res) => {
    try {
      const { username, systemName } = req.body;
      if (!username || username.length < 3) return res.status(400).json({ error: "Username too short" });
      if (!/^[a-zA-Z0-9_.-]+$/.test(username)) return res.status(400).json({ error: "Invalid characters" });
      const existing = await storage.getUserByUsername(username);
      if (existing && existing.id !== req.session.userId) return res.status(409).json({ error: "Username taken" });
      await storage.setUsername(req.session.userId!, username, systemName);
      res.json({ ok: true });
    } catch (err) {
      console.error("Set username error:", err);
      res.status(500).json({ error: "Failed" });
    }
  });

  app.patch("/api/users/me", requireAuth, async (req, res) => {
    try {
      const { firstName } = req.body;
      if (typeof firstName !== "string" || !firstName.trim()) {
        return res.status(400).json({ error: "Invalid name" });
      }
      const updated = await storage.updateUser(req.session.userId!, { firstName: firstName.trim().slice(0, 50) });
      res.json({ ok: true, firstName: updated?.firstName });
    } catch (err) {
      console.error("Update user name error:", err);
      res.status(500).json({ error: "Failed to update name" });
    }
  });

  // ── Discover Filter (AI-tailored) ──────────────────────────────────────────
  app.get("/api/discover/filter", async (req, res) => {
    try {
      const { bucket, type: contentType, dimension } = req.query as Record<string, string>;
      const userId = req.session?.userId;
      let profileCtx = "";
      if (userId) {
        try {
          const profile = await storage.getUserProfile(userId);
          const goals = (await storage.getGoals(userId)).filter((g: any) => g.status === "active");
          const lp = (profile as any)?.lifestylePreferences;
          profileCtx = [
            profile?.interests?.length && `Interests: ${(profile.interests as string[]).join(", ")}`,
            lp?.identityVision && `Identity: ${lp.identityVision}`,
            goals.length && `Goals: ${goals.map((g: any) => g.title).join(", ")}`,
          ].filter(Boolean).join(". ");
        } catch (_) {}
      }

      // Import the static library from discover feed logic and filter it
      const { DISCOVER_STATIC_LIBRARY } = await import("../discover-static");
      let filtered: any[] = [...DISCOVER_STATIC_LIBRARY];
      if (bucket && bucket !== "all") filtered = filtered.filter((c: any) => c.bucket === bucket);
      if (contentType && contentType !== "all") filtered = filtered.filter((c: any) => c.type === contentType);
      if (dimension && dimension !== "all") filtered = filtered.filter((c: any) => c.dimension?.toLowerCase() === dimension.toLowerCase());

      // Shuffle
      filtered = filtered.sort(() => Math.random() - 0.5);
      res.json({ cards: filtered, filtered: true });
    } catch (err) {
      console.error("Discover filter error:", err);
      res.status(500).json({ cards: [] });
    }
  });
}
