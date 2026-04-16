import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";



import { elevationPlanAddToCalendarSchema, buildActionEventTimes, actionTypeToEventType } from "./_shared";

export function registerElevationActionsRoutes(app: Express): void {
  app.post("/api/elevation-plan-actions/:id/add-to-calendar", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanAddToCalendarSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const existing = action.linkedEntity as { type?: string; id?: string } | null;
      if (existing?.type === "calendar_event" && existing.id) {
        return res.status(409).json({ error: "Action is already linked to a calendar event", calendarEventId: existing.id });
      }

      const { startTime, endTime } = buildActionEventTimes(
        parsed.data.planStartDate,
        parsed.data.planDayIndex,
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
          planTitle: parsed.data.planTitle ?? "",
          planDayIndex: parsed.data.planDayIndex,
          actionType: action.actionType,
        },
      });

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: { type: "calendar_event", id: calendarEvent.id },
      });

      res.json({ action: updatedAction, calendarEvent });
    } catch (error) {
      console.error("Elevation plan add-to-calendar error:", error);
      res.status(500).json({ error: "Failed to add action to calendar" });
    }
  });

  // DELETE /api/elevation-plan-actions/:id/remove-from-calendar – remove linked calendar event
  app.delete("/api/elevation-plan-actions/:id/remove-from-calendar", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const linked = action.linkedEntity as { type?: string; id?: string } | null;
      if (linked && linked.type === "calendar_event" && linked.id) {
        await storage.deleteCalendarEventForUser(linked.id, userId);
      }

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: null,
      });
      res.json({ action: updatedAction, success: true });
    } catch (error) {
      console.error("Elevation plan remove-from-calendar error:", error);
      res.status(500).json({ error: "Failed to remove action from calendar" });
    }
  });

  // POST /api/elevation-plan-actions/:id/add-to-tasks – create a task from a plan action
  app.post("/api/elevation-plan-actions/:id/add-to-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const parsed = elevationPlanAddToTasksSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: parsed.error.flatten() });
      }

      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const existing = action.linkedEntity as { type?: string; id?: string } | null;
      if (existing?.type === "task" && existing.id) {
        return res.status(409).json({ error: "Action is already linked to a task", taskId: existing.id });
      }

      // Compute due date for the plan day using pure date arithmetic (no UTC shift)
      const dueDate = addCalendarDays(parsed.data.planStartDate, parsed.data.planDayIndex - 1);

      const task = await storage.createTask({
        userId,
        title: action.title,
        description: action.description ?? "",
        status: "todo",
        isCompleted: false,
        dueDate,
        dimensionTags: [action.actionType],
        blueprintActionId: action.id,  // back-reference for bidirectional completion sync
      });

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: { type: "task", id: task.id },
      });

      res.json({ action: updatedAction, task });
    } catch (error) {
      console.error("Elevation plan add-to-tasks error:", error);
      res.status(500).json({ error: "Failed to add action to tasks" });
    }
  });

  // DELETE /api/elevation-plan-actions/:id/remove-from-tasks – remove linked task
  app.delete("/api/elevation-plan-actions/:id/remove-from-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const action = await storage.getElevationPlanActionForUser(req.params.id, userId);
      if (!action) return res.status(404).json({ error: "Action not found" });

      const linked = action.linkedEntity as { type?: string; id?: string } | null;
      if (linked && linked.type === "task" && linked.id) {
        await storage.deleteTask(linked.id);
      }

      const updatedAction = await storage.updateElevationPlanAction(action.id, userId, {
        linkedEntity: null,
      });
      res.json({ action: updatedAction, success: true });
    } catch (error) {
      console.error("Elevation plan remove-from-tasks error:", error);
      res.status(500).json({ error: "Failed to remove action from tasks" });
    }
  });

  // ── Reminders API (PR #7) ─────────────────────────────────────────────────

  // GET /api/reminders – list reminders for the authenticated user
}
