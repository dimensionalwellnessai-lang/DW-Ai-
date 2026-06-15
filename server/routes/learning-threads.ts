/**
 * Learning Threads — Spec 13, PR C: Guidance as a real learning system.
 *
 * A Learning Thread is a saved AI coaching conversation that the user has
 * deliberately kept for future reference. Threads can be titled, tagged,
 * and optionally linked to a My Life object (path / project / system).
 *
 * Routes:
 *   GET    /api/learning-threads          — list the user's threads (newest first)
 *   POST   /api/learning-threads          — save a new learning thread
 *   PATCH  /api/learning-threads/:id      — update title / tags / linked item
 *   DELETE /api/learning-threads/:id      — delete a thread
 */

import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { requireAuth } from "./_shared";

// ─── Validation schemas ───────────────────────────────────────────────────────

const createThreadSchema = z.object({
  title: z.string().min(1).max(200),
  summary: z.string().max(1000).optional().nullable(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant"]),
      content: z.string(),
    }),
  ).min(1),
  tags: z.array(z.string().max(50)).max(10).optional().nullable(),
  linkedToType: z.string().max(50).optional().nullable(),
  linkedToId: z.string().max(100).optional().nullable(),
});

const patchThreadSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  summary: z.string().max(1000).optional().nullable(),
  tags: z.array(z.string().max(50)).max(10).optional().nullable(),
  linkedToType: z.string().max(50).optional().nullable(),
  linkedToId: z.string().max(100).optional().nullable(),
});

// ─── Route registration ───────────────────────────────────────────────────────

export function registerLearningThreadRoutes(app: Express): void {
  /** List all learning threads for the authenticated user. */
  app.get("/api/learning-threads", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const threads = await storage.getLearningThreads(userId);
      // Omit the full message array from the list response to reduce payload;
      // clients load the full thread on demand via the PATCH or by opening the talk page.
      const dto = threads.map(({ messages: _m, ...rest }) => rest);
      res.json({ threads: dto });
    } catch (err) {
      console.error("GET /api/learning-threads error:", err);
      res.status(500).json({ error: "Failed to load learning threads" });
    }
  });

  /** Get a single learning thread (full messages included). */
  app.get("/api/learning-threads/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const thread = await storage.getLearningThread(req.params.id, userId);
      if (!thread) return res.status(404).json({ error: "Thread not found" });
      res.json({ thread });
    } catch (err) {
      console.error("GET /api/learning-threads/:id error:", err);
      res.status(500).json({ error: "Failed to load learning thread" });
    }
  });

  /** Save a new learning thread from a conversation. */
  app.post("/api/learning-threads", requireAuth, async (req, res) => {
    const parsed = createThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid thread data", details: parsed.error.errors });
    }

    try {
      const userId = req.session.userId!;
      const thread = await storage.createLearningThread({
        userId,
        title: parsed.data.title,
        summary: parsed.data.summary ?? null,
        messages: parsed.data.messages,
        tags: parsed.data.tags ?? null,
        linkedToType: parsed.data.linkedToType ?? null,
        linkedToId: parsed.data.linkedToId ?? null,
      });
      res.status(201).json({ thread });
    } catch (err) {
      console.error("POST /api/learning-threads error:", err);
      res.status(500).json({ error: "Failed to save learning thread" });
    }
  });

  /** Update a learning thread's title, tags, or linked item. */
  app.patch("/api/learning-threads/:id", requireAuth, async (req, res) => {
    const parsed = patchThreadSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid update data", details: parsed.error.errors });
    }

    try {
      const userId = req.session.userId!;
      const updated = await storage.updateLearningThread(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Thread not found" });
      res.json({ thread: updated });
    } catch (err) {
      console.error("PATCH /api/learning-threads/:id error:", err);
      res.status(500).json({ error: "Failed to update learning thread" });
    }
  });

  /** Delete a learning thread. */
  app.delete("/api/learning-threads/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const deleted = await storage.deleteLearningThread(req.params.id, userId);
      if (!deleted) return res.status(404).json({ error: "Thread not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("DELETE /api/learning-threads/:id error:", err);
      res.status(500).json({ error: "Failed to delete learning thread" });
    }
  });
}
