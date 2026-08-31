import type { Express } from "express";
import { z } from "zod";

import { storage } from "../storage";
import { requireAuth } from "./_shared";
import { DISCOVER_STATIC_LIBRARY } from "../discover-static";
import { buildCompanionContext } from "../lib/companion-context";
import { rankFeedItems } from "../feed-engine";

function inferRoute(type: string, category?: string | null): string | null {
  const key = `${type} ${category ?? ""}`.toLowerCase();
  if (key.includes("workout") || key.includes("exercise")) return "/workout";
  if (key.includes("meal") || key.includes("nutrition")) return "/meal-prep";
  if (key.includes("meditation") || key.includes("mindful") || key.includes("spiritual")) return "/spiritual";
  if (key.includes("journal")) return "/journal";
  return null;
}

export function registerExperienceStateRoutes(app: Express): void {
  app.get("/api/feed", async (req, res) => {
    const querySchema = z.object({
      search: z.string().optional(),
      filter: z.string().optional(),
      sort: z.enum(["relevant", "latest"]).optional(),
      cursor: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(50).optional(),
    });

    try {
      const { search = "", filter = "all", sort = "relevant", cursor = 0, limit = 12 } = querySchema.parse(req.query);
      const userId = req.session.userId;
      const [wellness, interactions, savedContent, companionContext] = await Promise.all([
        storage.getWellnessContent(),
        userId
          ? storage.getFeedInteractions(userId, ["like", "favorite", "save", "hide", "not_interested"])
          : Promise.resolve([]),
        userId ? storage.getSavedContent(userId) : Promise.resolve([]),
        userId ? buildCompanionContext(userId) : Promise.resolve(null),
      ]);

      const latestActions = new Map<string, Set<string>>();
      const latestActionStates = new Set<string>();
      for (const row of interactions) {
        const itemKey = row.contentId ?? row.contentUrl ?? row.contentTitle ?? row.id;
        const actionStateKey = `${itemKey}:${row.action}`;
        if (latestActionStates.has(actionStateKey)) continue;
        latestActionStates.add(actionStateKey);
        const actions = latestActions.get(itemKey) ?? new Set<string>();
        if (row.state === "active") actions.add(row.action);
        latestActions.set(itemKey, actions);
      }
      const savedKeys = new Set(savedContent.map((item) => item.url));
      const query = search.trim().toLowerCase();
      const baseItems = [
        ...wellness.map((item) => ({
          id: item.id,
          title: item.title,
          description: item.description ?? "A small supportive resource for this season.",
          type: item.contentType,
          category: item.category,
          source: "DW Library",
          duration: item.duration ? `${item.duration} min` : null,
          thumbnail: item.thumbnailUrl,
          url: `wellness:${item.id}`,
          route: inferRoute(item.contentType, item.category),
          createdAt: item.createdAt ? item.createdAt.toISOString() : null,
        })),
        ...DISCOVER_STATIC_LIBRARY.map((item, index) => ({
          id: `discover-${index}`,
          title: item.title,
          description: item.summary,
          type: item.type,
          category: item.dimension ?? item.bucket,
          source: item.source,
          duration: item.readTime,
          thumbnail: null,
          url: item.url || `discover:${index}`,
          route: inferRoute(item.type, item.dimension),
          createdAt: null,
        })),
        {
          id: "dw-cosmic-update",
          title: "Current Activation Update",
          description: "Quick read on today's active currents and likely static points.",
          type: "cosmic_update",
          category: "cosmic",
          source: "DW Signals",
          duration: "1 min",
          thumbnail: null,
          url: "dw:cosmic-update",
          route: "/cosmic",
          createdAt: new Date().toISOString(),
        },
        {
          id: "dw-audio-reset",
          title: "3-minute grounding audio reset",
          description: "A short audio to ground the wire when zones feel flickery.",
          type: "audio",
          category: "rest",
          source: "DW Audio",
          duration: "3 min",
          thumbnail: null,
          url: "dw:audio-reset",
          route: "/spiritual",
          createdAt: new Date().toISOString(),
        },
        {
          id: "dw-meme-static",
          title: "Mercury static meme drop",
          description: "Light, nostalgic meme content for communication static days.",
          type: "meme",
          category: "fun",
          source: "DW Fun",
          duration: "quick",
          thumbnail: null,
          url: "dw:meme-static",
          route: null,
          createdAt: new Date().toISOString(),
        },
      ]
        .map((item) => {
          const actionKey = item.url || item.id;
          const actions = latestActions.get(actionKey) ?? latestActions.get(item.id) ?? new Set<string>();
          return {
            ...item,
            liked: actions.has("like"),
            favorited: actions.has("favorite"),
            saved: savedKeys.has(item.url) || actions.has("save"),
            hidden: actions.has("hide") || actions.has("not_interested"),
          };
        })
        .filter((item) => !item.hidden)
        .map(({ hidden, ...item }) => item);

      const fallbackContext = {
        currents: {
          gut: "variable",
          wave: "variable",
          spark: "open",
          will: "variable",
          voice: "open",
          mind: "hardwired",
          flow: "variable",
          drive: "hardwired",
          light: "open",
        } as const,
        energyType: "Builder" as const,
        decisionCompass: "Gut" as const,
        zones: {
          physical: { level: 3, trend: "flickering" },
          mental: { level: 3, trend: "flickering" },
          spiritual: { level: 3, trend: "flickering" },
          financial: { level: 3, trend: "flickering" },
          relationships: { level: 3, trend: "flickering" },
          career: { level: 3, trend: "flickering" },
          learning: { level: 3, trend: "flickering" },
          environment: { level: 3, trend: "flickering" },
          creativity: { level: 3, trend: "flickering" },
          fun: { level: 3, trend: "flickering" },
          community: { level: 3, trend: "flickering" },
          rest: { level: 3, trend: "flickering" },
          identity: { level: 3, trend: "flickering" },
        },
        cosmicWeather: { activeCurrents: [], moonPhase: "Unknown" },
        interests: { deepDives: [], currentObsessions: [], popCulture: [], spiritualCuriosity: [] },
        patterns: {},
      };

      const ranked = rankFeedItems(baseItems, {
        context: companionContext ?? fallbackContext,
        query,
        filter,
        sort,
        offset: cursor,
        limit,
      });

      res.json({ items: ranked.items, hasMore: ranked.hasMore, nextCursor: ranked.nextCursor });
    } catch (error) {
      console.error("GET /api/feed error:", error);
      res.status(500).json({ error: "Failed to build your feed" });
    }
  });

  app.get("/api/feed/interactions", requireAuth, async (req, res) => {
    try {
      const action = typeof req.query.action === "string" ? req.query.action : undefined;
      const items = action
        ? await storage.getFeedInteractionsByAction(req.session.userId!, action)
        : await storage.getFeedInteractions(req.session.userId!);
      res.json({ items });
    } catch (error) {
      console.error("GET /api/feed/interactions error:", error);
      res.status(500).json({ error: "Failed to load feed interactions" });
    }
  });

  app.post("/api/feed/interactions", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      contentId: z.string().optional(),
      contentType: z.string().optional(),
      contentTitle: z.string().min(1),
      contentUrl: z.string().min(1),
      action: z.enum(["like", "favorite", "save", "hide", "not_interested"]),
      collectionKey: z.string().optional(),
      topic: z.string().optional(),
      state: z.enum(["active", "cleared"]).optional(),
    });

    try {
      const body = bodySchema.parse(req.body);
      const created = await storage.createFeedInteraction({
        userId: req.session.userId!,
        contentId: body.contentId,
        contentType: body.contentType,
        contentTitle: body.contentTitle,
        contentUrl: body.contentUrl,
        action: body.action,
        collectionKey: body.collectionKey,
        topic: body.topic,
        state: body.state ?? "active",
      });
      res.status(201).json(created);
    } catch (error) {
      console.error("POST /api/feed/interactions error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      res.status(500).json({ error: "Failed to save feed interaction" });
    }
  });

  app.patch("/api/reminders/:id/response-state", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      responseState: z.enum(["pending", "completed", "snoozed", "skipped", "no_response"]),
      snoozedUntil: z.string().datetime().optional(),
    });

    try {
      const { responseState, snoozedUntil } = bodySchema.parse(req.body);
      const now = new Date();
      const fields: Parameters<typeof storage.updateReminder>[2] = {
        responseState,
        completedAt: null,
        skippedAt: null,
        noResponseAt: null,
        snoozedUntil: null,
      };

      if (responseState === "completed") {
        fields.completedAt = now;
        fields.status = "dismissed";
      }
      if (responseState === "skipped") {
        fields.skippedAt = now;
        fields.status = "dismissed";
      }
      if (responseState === "no_response") {
        fields.noResponseAt = now;
        fields.status = "dismissed";
      }
      if (responseState === "snoozed") {
        if (!snoozedUntil) {
          return res.status(400).json({ error: "snoozedUntil is required when snoozing a reminder" });
        }
        fields.snoozedUntil = new Date(snoozedUntil);
        fields.scheduledAt = new Date(snoozedUntil);
        fields.status = "scheduled";
      }

      if (responseState === "pending") {
        fields.status = "scheduled";
      }

      const updated = await storage.updateReminder(req.params.id, req.session.userId!, fields);
      if (!updated) {
        return res.status(404).json({ error: "Reminder not found" });
      }
      res.json(updated);
    } catch (error) {
      console.error("PATCH /api/reminders/:id/response-state error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      res.status(500).json({ error: "Failed to update reminder state" });
    }
  });

  app.get("/api/tours/:tourId/progress", requireAuth, async (req, res) => {
    try {
      const rows = await storage.getTourProgress(req.session.userId!, req.params.tourId);
      res.json({ progress: rows[0] ?? null });
    } catch (error) {
      console.error("GET /api/tours/:tourId/progress error:", error);
      res.status(500).json({ error: "Failed to load tour progress" });
    }
  });

  app.put("/api/tours/:tourId/progress", requireAuth, async (req, res) => {
    const bodySchema = z.object({
      lastStep: z.number().int().min(0).optional(),
      totalSteps: z.number().int().min(1).nullable().optional(),
      complete: z.boolean().optional(),
    });

    try {
      const body = bodySchema.parse(req.body);
      const progress = await storage.upsertTourProgress(req.session.userId!, req.params.tourId, {
        lastStep: body.lastStep,
        totalSteps: body.totalSteps,
        completedAt: body.complete === undefined ? undefined : body.complete ? new Date() : null,
      });
      res.json({ progress });
    } catch (error) {
      console.error("PUT /api/tours/:tourId/progress error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      res.status(500).json({ error: "Failed to save tour progress" });
    }
  });

  app.get("/api/whats-new/state", requireAuth, async (req, res) => {
    const version = typeof req.query.version === "string" ? req.query.version : "";
    if (!version) {
      return res.status(400).json({ error: "version is required" });
    }

    try {
      const row = await storage.getWhatsNewSeen(req.session.userId!, version);
      res.json({ seen: !!row, seenAt: row?.seenAt ?? null });
    } catch (error) {
      console.error("GET /api/whats-new/state error:", error);
      res.status(500).json({ error: "Failed to load what's new state" });
    }
  });

  app.post("/api/whats-new/state", requireAuth, async (req, res) => {
    const bodySchema = z.object({ version: z.string().min(1) });

    try {
      const body = bodySchema.parse(req.body);
      const row = await storage.markWhatsNewSeen({ userId: req.session.userId!, version: body.version });
      res.status(201).json({ seen: true, seenAt: row.seenAt });
    } catch (error) {
      console.error("POST /api/whats-new/state error:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.flatten() });
      }
      res.status(500).json({ error: "Failed to save what's new state" });
    }
  });
}
