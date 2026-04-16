import type { Express } from "express";

import { storage } from "../storage";

import { db } from "../db";

import { requireAuth } from "./_shared";
import { elevationPlanLimiter } from "./_limiters";

import { generateElevationPlanStructure } from "../openai";

import { elevationPlans, elevationPlanDays, elevationPlanActions } from "@shared/schema";

import { buildActionEventTimes, actionTypeToEventType } from "./_shared";

export function registerElevationPlansRoutes(app: Express): void {
  app.post("/api/elevation-plans/preview", elevationPlanLimiter, async (req, res) => {
    try {
      const parsed = elevationPlanDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { reasons, recentInsights, userPreferences, focusDimension } = parsed.data;
      const structure = await generateElevationPlanStructure({ reasons, recentInsights, userPreferences, focusDimension });
      if (!structure) return res.status(500).json({ error: "Failed to generate elevation plan" });
      res.json(structure);
    } catch (error) {
      console.error("Elevation plan preview error:", error);
      res.status(500).json({ error: "Failed to generate elevation plan preview" });
    }
  });

  // POST /api/elevation-plans/draft – create or reuse existing draft for current conversation/date
  app.post("/api/elevation-plans/draft", requireAuth, elevationPlanLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanDraftSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const { conversationId, reasons, recentInsights, userPreferences, focusDimension } = parsed.data;

      const today = new Date().toISOString().slice(0, 10);

      // Idempotency: reuse existing draft for the same day / conversation
      const existing = await storage.getDraftElevationPlanForDay(userId, today, conversationId);
      if (existing) {
        const days = await storage.getElevationPlanDays(existing.id);
        const daysWithActions = await Promise.all(
          days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
        );
        return res.json({ plan: existing, days: daysWithActions });
      }

      // Enrich with learning profile context (PR #8)
      const learningProfile = await storage.getLearningProfile(userId);
      let enrichedUserPreferences = userPreferences ?? "";
      if (learningProfile && learningProfile.learningEnabled !== false) {
        const parts: string[] = [];
        if (learningProfile.preferredActionTypes && learningProfile.preferredActionTypes.length > 0) {
          parts.push(`Preferred action types: ${learningProfile.preferredActionTypes.join(", ")}`);
        }
        if (learningProfile.preferredTimes && Object.keys(learningProfile.preferredTimes).length > 0) {
          const times = Object.entries(learningProfile.preferredTimes)
            .filter(([k]) => !k.startsWith("_"))
            .map(([k, v]) => `${k}: ${v}`)
            .join(", ");
          if (times) parts.push(`Preferred times: ${times}`);
        }
        if (learningProfile.frictionPoints && learningProfile.frictionPoints.length > 0) {
          parts.push(`Known friction points: ${learningProfile.frictionPoints.join(", ")}`);
        }
        if (learningProfile.avoid && learningProfile.avoid.length > 0) {
          parts.push(`Avoid: ${learningProfile.avoid.join(", ")}`);
        }
        if (parts.length > 0) {
          enrichedUserPreferences = [enrichedUserPreferences, parts.join(". ")].filter(Boolean).join("\n");
        }
      }

      // Generate via AI
      const structure = await generateElevationPlanStructure({ reasons, recentInsights, userPreferences: enrichedUserPreferences || undefined, focusDimension });
      if (!structure) {
        return res.status(500).json({ error: "Failed to generate elevation plan" });
      }

      const endDate = new Date(today);
      endDate.setDate(endDate.getDate() + 6);

      // Wrap all inserts in a DB transaction to avoid partial drafts
      const { plan, daysWithActions } = await db.transaction(async (tx) => {
        const [plan] = await tx.insert(elevationPlans)
          .values({
            userId,
            title: structure.title,
            goal: structure.goal,
            focusDimension: structure.focusDimension,
            status: "draft",
            startDate: today,
            endDate: endDate.toISOString().slice(0, 10),
            sourceConversationId: conversationId,
            updatedAt: new Date(),
          })
          .returning();

        const daysWithActions = [];
        for (const dayData of structure.days.slice(0, 7)) {
          const [day] = await tx.insert(elevationPlanDays)
            .values({
              planId: plan.id,
              dayIndex: dayData.dayIndex,
              theme: dayData.theme,
              intention: dayData.intention,
            })
            .returning();

          const actions = [];
          for (const a of (dayData.actions ?? []).slice(0, 4)) {
            const [action] = await tx.insert(elevationPlanActions)
              .values({
                planDayId: day.id,
                actionType: a.actionType,
                title: a.title,
                description: a.description,
                timeOfDay: a.timeOfDay,
                durationMinutes: a.durationMinutes,
                isCompleted: false,
                updatedAt: new Date(),
              })
              .returning();
            actions.push(action);
          }
          daysWithActions.push({ ...day, actions });
        }

        return { plan, daysWithActions };
      });

      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan draft error:", error);
      res.status(500).json({ error: "Failed to create elevation plan draft" });
    }
  });

  // GET /api/elevation-plans/active – get the active elevation plan
  app.get("/api/elevation-plans/active", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const plan = await storage.getActiveElevationPlan(userId);
      if (!plan) return res.json(null);
      const days = await storage.getElevationPlanDays(plan.id);
      const daysWithActions = await Promise.all(
        days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );
      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan active error:", error);
      res.status(500).json({ error: "Failed to get active elevation plan" });
    }
  });

  // GET /api/elevation-plans – list all plans for the user with completion stats (PR #17)
  app.get("/api/elevation-plans", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      // Use a single aggregate query to avoid N+1 (PR #17)
      const plansWithStats = await storage.getElevationPlansWithStats(userId);
      res.json(plansWithStats);
    } catch (error) {
      console.error("Elevation plans list error:", error);
      res.status(500).json({ error: "Failed to list elevation plans" });
    }
  });

  // GET /api/elevation-plans/:id – get a specific elevation plan
  app.get("/api/elevation-plans/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const plan = await storage.getElevationPlan(req.params.id, userId);
      if (!plan) return res.status(404).json({ error: "Plan not found" });
      const days = await storage.getElevationPlanDays(plan.id);
      const daysWithActions = await Promise.all(
        days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
      );
      res.json({ plan, days: daysWithActions });
    } catch (error) {
      console.error("Elevation plan get error:", error);
      res.status(500).json({ error: "Failed to get elevation plan" });
    }
  });

  // PATCH /api/elevation-plans/:id – update plan title/goal/status
  app.patch("/api/elevation-plans/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      // PR #17: when activating a plan, first verify the target plan exists/belongs to user
      // so we don't accidentally archive the current active plan for a non-existent target.
      if (parsed.data.status === "active") {
        const targetPlan = await storage.getElevationPlan(req.params.id, userId);
        if (!targetPlan) return res.status(404).json({ error: "Plan not found" });
        const currentActive = await storage.getActiveElevationPlan(userId);
        if (currentActive && currentActive.id !== req.params.id) {
          await storage.updateElevationPlan(currentActive.id, userId, { status: "archived" });
        }
      }
      const updated = await storage.updateElevationPlan(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Plan not found" });

      // When activating a plan, bulk-create calendar events for all actions that
      // are not already linked to a calendar event (non-fatal: errors are logged).
      if (parsed.data.status === "active") {
        try {
          const days = await storage.getElevationPlanDays(updated.id);
          const daysWithActions = await Promise.all(
            days.map(async (d) => ({ ...d, actions: await storage.getElevationPlanActions(d.id) }))
          );
          for (const day of daysWithActions) {
            for (const action of day.actions) {
              const linked = action.linkedEntity as { type?: string; id?: string } | null;
              if (linked?.type === "calendar_event" && linked.id) continue; // already linked
              try {
                const { startTime, endTime } = buildActionEventTimes(
                  updated.startDate,
                  day.dayIndex,
                  action.timeOfDay,
                  action.durationMinutes
                );
                const calendarEvent = await storage.createCalendarEvent({
                  userId,
                  title: action.title,
                  description: action.description ?? "",
                  startTime,
                  endTime,
                  eventType: actionTypeToEventType(action.actionType),
                  linkedType: "elevation_action",
                  linkedId: action.id,
                  linkedRoute: "/elevation-plan",
                  linkedMeta: {
                    planTitle: updated.title ?? "",
                    planDayIndex: day.dayIndex,
                    actionType: action.actionType,
                  },
                });
                await storage.updateElevationPlanAction(action.id, userId, {
                  linkedEntity: { type: "calendar_event", id: calendarEvent.id },
                });
              } catch (actionErr) {
                console.error(`Failed to create calendar event for action ${action.id}:`, actionErr);
              }
            }
          }
        } catch (bulkErr) {
          console.error("Failed to bulk-create calendar events on plan activation:", bulkErr);
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Elevation plan update error:", error);
      res.status(500).json({ error: "Failed to update elevation plan" });
    }
  });

  // PATCH /api/elevation-plan-actions/:id – toggle complete, update text
  app.patch("/api/elevation-plan-actions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanActionUpdateSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }
      const updated = await storage.updateElevationPlanAction(req.params.id, userId, parsed.data);
      if (!updated) return res.status(404).json({ error: "Action not found" });

      // Sync completion state to a linked task when isCompleted changes
      if (parsed.data.isCompleted !== undefined && updated.linkedEntity) {
        const linked = updated.linkedEntity as { type?: string; id?: string } | null;
        if (linked && linked.type === "task" && linked.id) {
          try {
            await storage.updateTaskForUser(linked.id, userId, {
              isCompleted: parsed.data.isCompleted,
              status: parsed.data.isCompleted ? "done" : "todo",
            });
          } catch {
            // Non-fatal: linked task may have been deleted externally
          }
        }
      }

      res.json(updated);
    } catch (error) {
      console.error("Elevation plan action update error:", error);
      res.status(500).json({ error: "Failed to update elevation plan action" });
    }
  });

  // ── Weekly Plan Reviews API (PR #15) ──────────────────────────────────────

  // GET /api/weekly-review/:planId – get the review for a specific plan
}
