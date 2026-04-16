import type { Express } from "express";

import { z } from "zod";

import { supportReportLimiter } from "./_limiters";

import { sendSupportReportEmail } from "../email";



export function registerSupportDetailedRoutes(app: Express): void {
  app.post("/api/support/detailed-report", supportReportLimiter, async (req, res) => {
    try {
      const data = detailedSupportReportSchema.parse(req.body);
      const createdAt = new Date().toISOString();

      const report = {
        category: data.category,
        description: data.description,
        stepsToReproduce: data.stepsToReproduce,
        eventType: data.eventType,
        requestedTerm: data.requestedTerm,
        normalizedTerm: data.normalizedTerm,
        closestMatch: data.closestMatch,
        confidence: data.confidence,
        technicalDetails: data.includeTechnicalDetails ? data.technicalDetails : undefined,
        recentContext: data.includeRecentContext ? data.recentContext : undefined,
        conversationSnippet: data.includeConversationSnippet ? data.conversationSnippet : undefined,
        constraintsSnapshot: data.includeConstraintsSnapshot ? data.constraintsSnapshot : undefined,
        createdAt,
      };

      const sent = await sendSupportReportEmail(report);
      if (!sent) {
        console.error("Support report email could not be delivered");
        return res.status(500).json({ error: "Failed to deliver support report. Please try again or email dimensionalwellnessai@gmail.com directly." });
      }

      res.json({ success: true, createdAt });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request", details: error.flatten() });
      }
      console.error("Support report error:", error);
      res.status(500).json({ error: "Failed to submit support report" });
    }
  });

  // ========================================
  // PR #5: ELEVATION PLAN BUILDER
  // ========================================


  const elevationPlanDraftSchema = z.object({
    conversationId: z.string().max(200).optional(),
    reasons: z.string().max(2000).optional(),
    recentInsights: z.string().max(2000).optional(),
    userPreferences: z.string().max(1000).optional(),
    focusDimension: z.string().max(100).optional(),
  });

  const elevationPlanUpdateSchema = z.object({
    title: z.string().min(1).max(200).optional(),
    goal: z.string().max(500).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
  });

  const elevationPlanActionUpdateSchema = z.object({
    isCompleted: z.boolean().optional(),
    title: z.string().min(1).max(200).optional(),
    description: z.string().max(1000).optional(),
  });

  const elevationPlanAddToCalendarSchema = z.object({
    planDayIndex: z.number().int().min(1).max(7),
    planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    planTitle: z.string().max(200).optional(),
  });

  const elevationPlanAddToTasksSchema = z.object({
    planDayIndex: z.number().int().min(1).max(7),
    planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  });

  /** Map action timeOfDay string to a wall-clock hour (24h). */
  function resolveActionHour(timeOfDay: string | null | undefined): number {
    if (!timeOfDay) return 9;
    const t = timeOfDay.toLowerCase();
    if (t.includes("morning")) return 8;
    if (t.includes("afternoon")) return 13;
    if (t.includes("evening") || t.includes("night")) return 18;
    // Try to parse "HH:MM" or "H:MM AM/PM"
    const match12 = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
    if (match12) {
      let h = parseInt(match12[1], 10);
      if (match12[3] === "pm" && h !== 12) h += 12;
      if (match12[3] === "am" && h === 12) h = 0;
      return h;
    }
    const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
    if (match24) return parseInt(match24[1], 10);
    return 9;
  }

  /** Add calendar days to a YYYY-MM-DD string without timezone conversion. */
  function addCalendarDays(dateStr: string, days: number): string {
    const [y, m, d] = dateStr.split("-").map(Number);
    const date = new Date(y, m - 1, d + days);
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  /** Build wall-clock startTime / endTime strings (no timezone offset) for a plan action. */
  function buildActionEventTimes(
    planStartDate: string,
    dayIndex: number,
    timeOfDay: string | null | undefined,
    durationMinutes: number | null | undefined
  ): { startTime: string; endTime: string } {
    const dateStr = addCalendarDays(planStartDate, dayIndex - 1);
    const hour = resolveActionHour(timeOfDay);
    const dur = durationMinutes ?? 30;
    const startMinutes = hour * 60;
    const endMinutes = startMinutes + dur;
    const endHour = Math.floor(endMinutes / 60) % 24;
    const endMin = endMinutes % 60;
    const pad = (n: number) => String(n).padStart(2, "0");
    const startTime = `${dateStr}T${pad(hour)}:00:00`;
    const endTime = `${addCalendarDays(planStartDate, dayIndex - 1 + (endMinutes >= 1440 ? 1 : 0))}T${pad(endHour)}:${pad(endMin)}:00`;
    return { startTime, endTime };
  }

  /** Map action type to calendar event type. */
  function actionTypeToEventType(actionType: string): string {
    const map: Record<string, string> = {
      workout: "workout",
      nutrition: "meal",
      habit: "routine",
      reflection: "routine",
      schedule: "event",
    };
    return map[actionType] ?? "event";
  }

  // POST /api/elevation-plans/preview – guest preview (no auth, returns structure only)
}
