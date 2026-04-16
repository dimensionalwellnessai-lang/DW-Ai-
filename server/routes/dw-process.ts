import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";
import { dwProcessLimiter } from "./_limiters";

import { processConversationIntoInsights } from "../openai";

import { type Habit, type Goal, type MoodLog } from "@shared/schema";

import { dwProcessSchema } from "./_shared";

export function registerDwProcessRoutes(app: Express): void {
  app.post("/api/dw/processConversation", requireAuth, dwProcessLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = dwProcessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { messages, conversationId } = parsed.data;

      // Idempotency: skip if this conversation was already processed for this user
      if (conversationId) {
        const existing = await storage.getDwInsightByConversation(userId, conversationId);
        if (existing) {
          return res.status(200).json({ skipped: true, reason: "already_processed", insightId: existing.id });
        }
      }

      const result = await processConversationIntoInsights(messages);
      if (!result) {
        return res.status(422).json({ error: "Conversation too short or could not be processed" });
      }

      // Persist insight
      const insight = await storage.createDwInsight({
        userId,
        title: result.insight.title,
        summary: result.insight.summary,
        insightLine: result.insight.insightLine,
        quotes: result.insight.quotes,
        theme: result.insight.theme,
        tags: result.insight.tags,
        switchTag: result.insight.switchTag ?? null,
        sourceConversationId: conversationId ?? null,
      });

      // Persist journal entry
      const journalEntry = await storage.createDwJournalEntry({
        userId,
        title: result.journalEntry.title,
        story: result.journalEntry.story,
        quotes: result.journalEntry.quotes,
        tags: result.journalEntry.tags,
        sourceConversationId: conversationId ?? null,
      });

      // Persist follow-up
      const followup = await storage.createDwFollowup({
        userId,
        prompt: result.followupPrompt,
        relatedInsightId: insight.id,
        sourceConversationId: conversationId ?? null,
        status: "pending",
      });

      res.status(201).json({ insight, journalEntry, followup });
    } catch (error) {
      console.error("DW processConversation error:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // POST /api/dw/processConversation/preview – guest-friendly endpoint
  // Runs the AI pipeline and returns the result WITHOUT saving to the database.
  // Guests should store the returned data in localStorage on the client.
  app.post("/api/dw/processConversation/preview", dwProcessLimiter, async (req, res) => {
    try {
      const parsed = dwProcessSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { messages } = parsed.data;

      const result = await processConversationIntoInsights(messages);
      if (!result) {
        return res.status(422).json({ error: "Conversation too short or could not be processed" });
      }

      res.json(result);
    } catch (error) {
      console.error("DW processConversation/preview error:", error);
      res.status(500).json({ error: "Failed to process conversation" });
    }
  });

  // GET /api/dw/latestInsight
  app.get("/api/dw/latestInsight", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const insight = await storage.getLatestDwInsight(userId);
      res.json(insight ?? null);
    } catch (error) {
      console.error("DW latestInsight error:", error);
      res.status(500).json({ error: "Failed to get latest insight" });
    }
  });

  // GET /api/dw/insights – feed of all DW insights for the insights page
  app.get("/api/dw/insights", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
      const insights = await storage.getDwInsights(userId, limit);
      res.json(insights);
    } catch (error) {
      console.error("DW insights error:", error);
      res.status(500).json({ error: "Failed to get insights" });
    }
  });

  // GET /api/dw/latestJournal
  app.get("/api/dw/latestJournal", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const entry = await storage.getLatestDwJournalEntry(userId);
      res.json(entry ?? null);
    } catch (error) {
      console.error("DW latestJournal error:", error);
      res.status(500).json({ error: "Failed to get latest journal entry" });
    }
  });

  // GET /api/dw/journalEntries – list of all DW journal entries
  app.get("/api/dw/journalEntries", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(parseInt(String(req.query.limit ?? "50"), 10) || 50, 100);
      const entries = await storage.getDwJournalEntries(userId, limit);
      res.json(entries);
    } catch (error) {
      console.error("DW journalEntries error:", error);
      res.status(500).json({ error: "Failed to get journal entries" });
    }
  });

  // GET /api/dw/followups
  app.get("/api/dw/followups", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Default to "pending" (which also surfaces snoozed-expired); pass "all" to get everything
      const status = typeof req.query.status === "string" ? req.query.status : "pending";
      const followups = await storage.getDwFollowups(userId, status);
      res.json(followups);
    } catch (error) {
      console.error("DW followups error:", error);
      res.status(500).json({ error: "Failed to get follow-ups" });
    }
  });

  // PATCH /api/dw/followups/:id – update follow-up status + snooze fields
  app.patch("/api/dw/followups/:id", requireAuth, async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.session.userId!;
      const { status, snoozedUntil } = req.body as { status?: string; snoozedUntil?: string };
      const validStatuses = ["pending", "accepted", "snoozed", "answered", "dismissed"];
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({ error: `status must be one of: ${validStatuses.join(", ")}` });
      }

      const now = new Date();
      const fields: Parameters<typeof storage.updateDwFollowup>[2] = { status };

      if (status === "snoozed") {
        if (!snoozedUntil) return res.status(400).json({ error: "snoozedUntil is required when status is snoozed" });
        const snoozeDate = new Date(snoozedUntil);
        if (isNaN(snoozeDate.getTime())) return res.status(400).json({ error: "snoozedUntil must be a valid ISO date" });
        fields.snoozedUntil = snoozeDate;
      } else if (status === "accepted") {
        fields.acceptedAt = now;
      } else if (status === "answered") {
        fields.answeredAt = now;
      } else if (status === "dismissed") {
        fields.dismissedAt = now;
      }

      const updated = await storage.updateDwFollowup(id, userId, fields);
      if (!updated) return res.status(404).json({ error: "Follow-up not found" });
      res.json(updated);
    } catch (error) {
      console.error("DW update followup error:", error);
      res.status(500).json({ error: "Failed to update follow-up" });
    }
  });

  // ── Elevation Engine (PR #3) ──────────────────────────────────────────────

  /**
   * Compute momentum status from a user's existing data.
   * Uses only real data: habits (streak), goals (progress), mood logs (last 7 days).
   * Returns: { momentumStatus, reasons, suggestedFocus }
   *
   * @param recentMoods - Mood logs within the last 7 days (pre-filtered by DB query)
   * @param hasPriorMoodLogs - Whether any mood logs exist before the 7-day window
   */
  function computeMomentumStatus(
    habits: Habit[],
    goals: Goal[],
    recentMoods: MoodLog[],
    hasPriorMoodLogs: boolean,
    learningProfile?: { preferredActionTypes?: string[]; frictionPoints?: string[]; wins?: string[] },
  ): { momentumStatus: "green" | "yellow" | "red"; reasons: string[]; suggestedFocus?: string } {
    const negativeSignals: string[] = [];

    const activeHabits = habits.filter((h) => h.isActive !== false);
    const activeGoals = goals.filter((g) => g.isActive !== false);

    // Signal 1: Nothing is being tracked
    if (activeHabits.length === 0 && activeGoals.length === 0) {
      return {
        momentumStatus: "red",
        reasons: ["No habits or goals are active yet"],
        suggestedFocus: "Start with one habit or goal to get things in motion",
      };
    }

    // Signal 2: Habits set up but no streak
    if (activeHabits.length > 0) {
      const maxStreak = activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
      if (maxStreak === 0) {
        negativeSignals.push("Habits are set up but consistency has stalled");
      }
    }

    // Signal 3: Goals with no progress
    if (activeGoals.length > 0) {
      const allStuck = activeGoals.every((g) => {
        return typeof g.progress !== "number" || g.progress === 0;
      });
      if (allStuck) {
        negativeSignals.push("Goals are active but haven't moved yet");
      }
    }

    // Signal 4: No mood check-ins in last 7 days (only flagged if they've logged before)
    if (recentMoods.length === 0 && hasPriorMoodLogs) {
      negativeSignals.push("No energy check-ins in the last 7 days");
    }

    // Signal 5: Low average mood recently
    if (recentMoods.length > 0) {
      const avgMood = recentMoods.reduce((sum, m) => sum + m.moodLevel, 0) / recentMoods.length;
      if (avgMood <= 3) {
        negativeSignals.push("Energy has been lower than usual recently");
      }
    }

    // Classify: limit reasons to max 2
    const reasons = negativeSignals.slice(0, 2);
    let momentumStatus: "green" | "yellow" | "red";
    let suggestedFocus: string | undefined;

    if (negativeSignals.length >= 2) {
      momentumStatus = "red";
      // Use learning profile to personalize the suggestedFocus
      const topActionType = learningProfile?.preferredActionTypes?.[0];
      suggestedFocus = topActionType
        ? `One small ${topActionType} action today can restart your momentum`
        : "One small action today can restart your momentum";
    } else if (negativeSignals.length === 1) {
      momentumStatus = "yellow";
      const knownFriction = learningProfile?.frictionPoints?.[0];
      suggestedFocus = knownFriction
        ? `You're close — even with ${knownFriction} challenges, one consistent action can shift things`
        : "You're close — one consistent action can shift things";
    } else {
      momentumStatus = "green";
      const recentWin = learningProfile?.wins?.[0];
      suggestedFocus = recentWin
        ? `Keep building on what worked (like "${recentWin}")`
        : "Keep building on what's working";
    }

    return { momentumStatus, reasons, suggestedFocus };
  }

  function todayDateString(): string {
    return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  }

  // GET /api/elevation/check – return today's cached check (or null if not yet run)
}
