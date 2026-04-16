import type { Express } from "express";
import { and } from "drizzle-orm";

import { storage } from "../storage";

import { requireAuth } from "./_shared";
export function registerConversationsRoutes(app: Express): void {
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const conversations = await storage.getConversations(req.session.userId!);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to get conversations" });
    }
  });

  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { title, category, messages } = req.body;
      const conversation = await storage.createConversation({
        userId: req.session.userId!,
        title: title || "New Chat",
        category: category || "general",
        messages: messages || [],
      });
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });

  app.post("/api/conversations/sync", requireAuth, async (req, res) => {
    try {
      const { conversations: guestConvos } = req.body;
      if (!Array.isArray(guestConvos)) {
        return res.status(400).json({ error: "conversations array required" });
      }
      
      // Get existing conversations to check for duplicates
      const existingConvos = await storage.getConversations(req.session.userId!);
      const existingTitles = new Set(existingConvos.map(c => c.title));
      
      const results = [];
      for (const convo of guestConvos) {
        if (!convo.messages || convo.messages.length === 0) continue;
        
        // Skip if a conversation with same title already exists (simple dedup)
        if (existingTitles.has(convo.title)) continue;
        
        // Validate and sanitize messages
        const validatedMessages = convo.messages
          .filter((m: any) => m && typeof m.content === "string" && ["user", "assistant"].includes(m.role))
          .map((m: any) => ({
            role: m.role,
            content: m.content,
            timestamp: m.timestamp || Date.now(),
          }));
        
        if (validatedMessages.length === 0) continue;
        
        const conversation = await storage.createConversation({
          userId: req.session.userId!,
          title: convo.title || "Imported Chat",
          category: convo.category || "general",
          messages: validatedMessages,
        });
        results.push(conversation);
        existingTitles.add(convo.title);
      }
      
      res.json({ imported: results.length, conversations: results });
    } catch (error) {
      console.error("Sync conversations error:", error);
      res.status(500).json({ error: "Failed to sync conversations" });
    }
  });

  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      res.json(conversation);
    } catch (error) {
      console.error("Get conversation error:", error);
      res.status(500).json({ error: "Failed to get conversation" });
    }
  });

  app.patch("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const updated = await storage.updateConversation(req.params.id, {
        ...req.body,
        lastMessageAt: new Date(),
      });
      res.json(updated);
    } catch (error) {
      console.error("Update conversation error:", error);
      res.status(500).json({ error: "Failed to update conversation" });
    }
  });

  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      if (!conversation || conversation.userId !== req.session.userId) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  app.get("/api/sync/sessions", requireAuth, async (req, res) => {
    try {
      const sessions = await storage.getSyncSessions(req.session.userId!);
      res.json(sessions);
    } catch (error) {
      console.error("Get sync sessions error:", error);
      res.status(500).json({ error: "Failed to get sync sessions" });
    }
  });

  app.get("/api/sync/sessions/active", requireAuth, async (req, res) => {
    try {
      const session = await storage.getActiveSyncSession(req.session.userId!);
      if (!session) {
        return res.json(null);
      }
      const items = await storage.getSyncItems(session.id);
      const groupedItems: Record<string, typeof items> = {};
      const ungroupedItems: typeof items = [];
      
      for (const item of items) {
        if (item.recurrenceGroupKey) {
          if (!groupedItems[item.recurrenceGroupKey]) {
            groupedItems[item.recurrenceGroupKey] = [];
          }
          groupedItems[item.recurrenceGroupKey].push(item);
        } else {
          ungroupedItems.push(item);
        }
      }
      
      res.json({ session, items, groupedItems, ungroupedItems });
    } catch (error) {
      console.error("Get active sync session error:", error);
      res.status(500).json({ error: "Failed to get active sync session" });
    }
  });

  app.post("/api/sync/sessions", requireAuth, async (req, res) => {
    try {
      const session = await storage.createSyncSession({
        userId: req.session.userId!,
        conversationId: req.body.conversationId || null,
        status: "processing",
        totalItems: req.body.totalItems || 0,
        sourceType: req.body.sourceType || "chat",
      });
      res.json(session);
    } catch (error) {
      console.error("Create sync session error:", error);
      res.status(500).json({ error: "Failed to create sync session" });
    }
  });

  app.get("/api/sync/sessions/:id", requireAuth, async (req, res) => {
    try {
      const session = await storage.getSyncSession(req.params.id);
      if (!session) {
        return res.status(404).json({ error: "Sync session not found" });
      }
      const items = await storage.getSyncItems(session.id);
      res.json({ session, items });
    } catch (error) {
      console.error("Get sync session error:", error);
      res.status(500).json({ error: "Failed to get sync session" });
    }
  });

  app.patch("/api/sync/sessions/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSyncSession(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      console.error("Update sync session error:", error);
      res.status(500).json({ error: "Failed to update sync session" });
    }
  });

  app.post("/api/sync/items", requireAuth, async (req, res) => {
    try {
      if (Array.isArray(req.body)) {
        const items = await storage.createSyncItems(req.body);
        res.json(items);
      } else {
        const item = await storage.createSyncItem(req.body);
        res.json(item);
      }
    } catch (error) {
      console.error("Create sync items error:", error);
      res.status(500).json({ error: "Failed to create sync items" });
    }
  });

  app.patch("/api/sync/items/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateSyncItem(req.params.id, {
        ...req.body,
        decidedAt: req.body.userDecision ? new Date() : undefined,
      });
      res.json(updated);
    } catch (error) {
      console.error("Update sync item error:", error);
      res.status(500).json({ error: "Failed to update sync item" });
    }
  });

  app.post("/api/sync/items/group/:sessionId/:groupKey/accept", requireAuth, async (req, res) => {
    try {
      await storage.updateSyncItemsByGroup(req.params.sessionId, req.params.groupKey, {
        status: "accepted",
        userDecision: "accepted",
        decidedAt: new Date(),
      });
      
      const items = await storage.getSyncItemsByGroup(req.params.sessionId, req.params.groupKey);
      for (const item of items) {
        if (item.itemType === "event" && item.startTime && item.title) {
          const startTimeStr = item.startTime.toISOString();
          const endTimeStr = item.endTime 
            ? item.endTime.toISOString() 
            : new Date(item.startTime.getTime() + 60 * 60 * 1000).toISOString();
          await storage.createCalendarEvent({
            userId: req.session.userId!,
            title: item.title,
            description: item.description || undefined,
            startTime: startTimeStr,
            endTime: endTimeStr,
            isRecurring: !!item.recurrencePattern,
            recurrenceRule: item.recurrencePattern || undefined,
            dimensionTags: item.dimensionTags || undefined,
          });
        }
      }
      
      res.json({ success: true, itemsAccepted: items.length });
    } catch (error) {
      console.error("Accept sync group error:", error);
      res.status(500).json({ error: "Failed to accept sync group" });
    }
  });

  app.post("/api/sync/items/group/:sessionId/:groupKey/reject", requireAuth, async (req, res) => {
    try {
      await storage.updateSyncItemsByGroup(req.params.sessionId, req.params.groupKey, {
        status: "rejected",
        userDecision: "rejected",
        decidedAt: new Date(),
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Reject sync group error:", error);
      res.status(500).json({ error: "Failed to reject sync group" });
    }
  });

  app.post("/api/interactions", requireAuth, async (req, res) => {
    try {
      const event = await storage.createInteractionEvent({
        userId: req.session.userId!,
        eventType: req.body.eventType,
        pagePath: req.body.pagePath,
        actionTarget: req.body.actionTarget,
        actionValue: req.body.actionValue,
        durationMs: req.body.durationMs,
        metadata: req.body.metadata,
      });
      res.json(event);
    } catch (error) {
      console.error("Create interaction event error:", error);
      res.status(500).json({ error: "Failed to create interaction event" });
    }
  });

  app.get("/api/patterns", requireAuth, async (req, res) => {
    try {
      const dimension = req.query.dimension as string | undefined;
      const patterns = await storage.getPatternSnapshots(req.session.userId!, dimension);
      res.json(patterns);
    } catch (error) {
      console.error("Get patterns error:", error);
      res.status(500).json({ error: "Failed to get patterns" });
    }
  });

  // AI engine health status — shows which providers are active/circuit-open
}
