import type { Express } from "express";
import { or } from "drizzle-orm";

import { requireAuth } from "./_shared";
import { sendPartnerInviteEmail } from "../email";
import * as accountability from "../accountability";
import { storage } from "../storage";
import {
  markSingleReminderCancelled,
  clearSingleReminderCancellation,
} from "../push";
import { safeGetWearablesYesterday } from "./wearables";
import { notificationPreferencesUpdateSchema } from "@shared/schema";

export function registerAccountabilityRoutes(app: Express): void {
  app.post("/api/accountability/commit", requireAuth, async (req, res) => {
    try {
      const {
        taskId,
        calendarEventId,
        taskName,
        scheduledTime,
        scheduledEndTime,
        commitmentResponse
      } = req.body;

      if (!taskName || !scheduledTime || !commitmentResponse) {
        return res.status(400).json({ 
          error: "Missing required fields: taskName, scheduledTime, commitmentResponse" 
        });
      }

      if (!['yes', 'remind_later', 'skip'].includes(commitmentResponse)) {
        return res.status(400).json({ 
          error: "Invalid commitmentResponse. Must be 'yes', 'remind_later', or 'skip'" 
        });
      }

      const record = await accountability.recordCommitment(
        req.session.userId!,
        taskId || null,
        calendarEventId || null,
        taskName,
        new Date(scheduledTime),
        scheduledEndTime ? new Date(scheduledEndTime) : null,
        commitmentResponse
      );

      res.json(record);
    } catch (error) {
      console.error("Record commitment error:", error);
      res.status(500).json({ error: "Failed to record commitment" });
    }
  });

  app.post("/api/accountability/complete", requireAuth, async (req, res) => {
    try {
      const {
        taskId,
        calendarEventId,
        completionStatus,
        reflectionNote
      } = req.body;

      if (!completionStatus) {
        return res.status(400).json({ 
          error: "Missing required field: completionStatus" 
        });
      }

      if (!['completed', 'partial', 'skipped', 'no_response'].includes(completionStatus)) {
        return res.status(400).json({ 
          error: "Invalid completionStatus" 
        });
      }

      const record = await accountability.recordCompletion(
        req.session.userId!,
        taskId || null,
        calendarEventId || null,
        completionStatus,
        reflectionNote
      );

      res.json(record);
    } catch (error) {
      console.error("Record completion error:", error);
      res.status(500).json({ error: "Failed to record completion" });
    }
  });

  app.get("/api/accountability/stats", requireAuth, async (req, res) => {
    try {
      const stats = await accountability.getAccountabilityStats(req.session.userId!);
      res.json(stats);
    } catch (error) {
      console.error("Get accountability stats error:", error);
      res.status(500).json({ error: "Failed to get stats" });
    }
  });

  app.get("/api/accountability/records", requireAuth, async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      
      const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const end = endDate ? new Date(endDate as string) : new Date();

      const records = await accountability.getAccountabilityRecords(
        req.session.userId!,
        start,
        end
      );

      res.json(records);
    } catch (error) {
      console.error("Get accountability records error:", error);
      res.status(500).json({ error: "Failed to get records" });
    }
  });

  app.get("/api/accountability/today", requireAuth, async (req, res) => {
    try {
      const summary = await accountability.getTodayAccountabilitySummary(req.session.userId!);
      res.json(summary);
    } catch (error) {
      console.error("Get today's accountability error:", error);
      res.status(500).json({ error: "Failed to get today's summary" });
    }
  });

  app.get("/api/accountability/synopsis", requireAuth, async (req, res) => {
    try {
      const synopsis = await accountability.getWeeklySynopsis(req.session.userId!);
      res.json(synopsis);
    } catch (error) {
      console.error("Get synopsis error:", error);
      res.status(500).json({ error: "Failed to get synopsis" });
    }
  });

  app.get("/api/accountability/preferences", requireAuth, async (req, res) => {
    try {
      const prefs = await accountability.getNotificationPreferences(req.session.userId!);
      res.json(prefs);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to get preferences" });
    }
  });

  app.put("/api/accountability/preferences", requireAuth, async (req, res) => {
    // Reject unknown / non-allowed fields (incl. userId, id, timestamps) so a
    // client cannot overwrite columns we don't intend to expose.
    const parsed = notificationPreferencesUpdateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid preferences payload",
        details: parsed.error.flatten(),
      });
    }
    try {
      const prefs = await accountability.updateNotificationPreferences(
        req.session.userId!,
        parsed.data,
      );
      res.json(prefs);
    } catch (error) {
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: "Failed to update preferences" });
    }
  });

  // ------ Partner Linking ------

  // POST /api/accountability/partner/invite
  // Body: { email: string }
  app.post("/api/accountability/partner/invite", requireAuth, async (req, res) => {
    try {
      const { email } = req.body as { email?: string };
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const trimmedEmail = email.trim();
      const basicEmailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!basicEmailRegex.test(trimmedEmail)) {
        return res.status(400).json({ error: "A valid email address is required." });
      }
      const invite = await accountability.invitePartner(req.session.userId!, trimmedEmail);

      // Send invitation email — requesterEmail is already available from invitePartner()
      if (invite.requesterEmail) {
        sendPartnerInviteEmail(trimmedEmail, invite.requesterEmail, invite.inviteToken).catch((err) => {
          console.error("Failed to send partner invite email:", err);
        });
      }

      // Return the invite token so the client can construct a deep-link if desired
      res.json({ invite });
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      if (
        message === "You cannot invite yourself as an accountability partner." ||
        message?.startsWith("You already have an active accountability partner")
      ) {
        return res.status(400).json({ error: message });
      }
      console.error("Partner invite error:", error);
      res.status(500).json({ error: "Failed to send invite." });
    }
  });

  // GET /api/accountability/partner
  // Returns the active partnership (or pending outgoing invites) for the logged-in user
  app.get("/api/accountability/partner", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const active = await accountability.getActivePartnership(userId);
      const pending = await accountability.getPendingOutgoingInvites(userId);
      res.json({ active, pending });
    } catch (error) {
      console.error("Get partner error:", error);
      res.status(500).json({ error: "Failed to load partner info." });
    }
  });

  // GET /api/accountability/partner/invite/:token
  // Public-ish: look up an invite by token (used on the accept-invite page)
  app.get("/api/accountability/partner/invite/:token", async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const invite = await accountability.getInviteByToken(token);
      if (!invite || invite.status !== "pending") {
        return res.status(404).json({ error: "Invite not found or already used." });
      }
      // Only expose safe fields to the client
      res.json({
        invitedEmail: invite.invitedEmail,
        requesterEmail: invite.requesterEmail,
        requesterName: invite.requesterName,
        invitedAt: invite.invitedAt,
      });
    } catch (error) {
      console.error("Get invite by token error:", error);
      res.status(500).json({ error: "Failed to look up invite." });
    }
  });

  // POST /api/accountability/partner/accept/:token
  // Authenticated: logged-in user accepts the invite
  app.post("/api/accountability/partner/accept/:token", requireAuth, async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const result = await accountability.acceptPartnerInvite(token, req.session.userId!);
      if (!result) {
        return res.status(400).json({ error: "Invite is invalid, expired, or already used." });
      }
      res.json({ success: true, partner: result });
    } catch (error) {
      console.error("Accept partner invite error:", error);
      res.status(500).json({ error: "Failed to accept invite." });
    }
  });

  // POST /api/accountability/partner/decline/:token
  // Authenticated: logged-in user declines the invite
  app.post("/api/accountability/partner/decline/:token", requireAuth, async (req, res) => {
    try {
      const { token } = req.params;
      if (!token || token.length !== 64 || !/^[0-9a-f]+$/.test(token)) {
        return res.status(400).json({ error: "Invalid token." });
      }
      const result = await accountability.declinePartnerInvite(token, req.session.userId!);
      if (!result) {
        return res.status(400).json({ error: "Invite not found or already handled." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Decline partner invite error:", error);
      res.status(500).json({ error: "Failed to decline invite." });
    }
  });

  // DELETE /api/accountability/partner
  // Unlink the active partnership
  app.delete("/api/accountability/partner", requireAuth, async (req, res) => {
    try {
      const unlinked = await accountability.unlinkPartner(req.session.userId!);
      if (!unlinked) {
        return res.status(404).json({ error: "No active partnership found." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Unlink partner error:", error);
      res.status(500).json({ error: "Failed to unlink partner." });
    }
  });

  // DELETE /api/accountability/partner/invite/:inviteId
  // Cancel a pending outgoing invite
  app.delete("/api/accountability/partner/invite/:inviteId", requireAuth, async (req, res) => {
    try {
      const { inviteId } = req.params;
      const cancelled = await accountability.cancelInvite(inviteId, req.session.userId!);
      if (!cancelled) {
        return res.status(404).json({ error: "Invite not found or already handled." });
      }
      res.json({ success: true });
    } catch (error) {
      console.error("Cancel invite error:", error);
      res.status(500).json({ error: "Failed to cancel invite." });
    }
  });

  // ── Reminder skip / restore ────────────────────────────────────────────────
  // Skip a single upcoming reminder. Body: { itemId: "task:<id>"|"event:<id>", kind: "pre"|"post" }
  app.post("/api/accountability/reminders/skip", requireAuth, async (req, res) => {
    try {
      const { itemId, kind } = req.body as { itemId?: string; kind?: string };
      if (
        typeof itemId !== "string" ||
        (!itemId.startsWith("task:") && !itemId.startsWith("event:")) ||
        (kind !== "pre" && kind !== "post")
      ) {
        return res.status(400).json({ error: "Invalid itemId or kind" });
      }
      const opts = itemId.startsWith("task:")
        ? { taskId: itemId.slice(5) }
        : { calendarEventId: itemId.slice(6) };
      markSingleReminderCancelled(req.session.userId!, kind, opts);
      res.json({ success: true });
    } catch (error) {
      console.error("Skip reminder error:", error);
      res.status(500).json({ error: "Failed to skip reminder" });
    }
  });

  // Skip multiple upcoming reminders in one round-trip.
  // Body: { reminders: Array<{ itemId: "task:<id>"|"event:<id>", kind: "pre"|"post" }> }
  app.post("/api/accountability/reminders/skip-batch", requireAuth, async (req, res) => {
    try {
      const { reminders } = req.body as {
        reminders?: Array<{ itemId?: string; kind?: string }>;
      };
      if (!Array.isArray(reminders) || reminders.length === 0) {
        return res.status(400).json({ error: "reminders[] is required" });
      }
      if (reminders.length > 200) {
        return res.status(400).json({ error: "Too many reminders in batch" });
      }
      const valid: Array<{ itemId: string; kind: "pre" | "post" }> = [];
      for (const r of reminders) {
        if (
          !r ||
          typeof r.itemId !== "string" ||
          (!r.itemId.startsWith("task:") && !r.itemId.startsWith("event:")) ||
          (r.kind !== "pre" && r.kind !== "post")
        ) {
          return res.status(400).json({ error: "Invalid reminder entry" });
        }
        valid.push({ itemId: r.itemId, kind: r.kind });
      }
      for (const r of valid) {
        const opts = r.itemId.startsWith("task:")
          ? { taskId: r.itemId.slice(5) }
          : { calendarEventId: r.itemId.slice(6) };
        markSingleReminderCancelled(req.session.userId!, r.kind, opts);
      }
      res.json({ success: true, count: valid.length });
    } catch (error) {
      console.error("Batch skip reminders error:", error);
      res.status(500).json({ error: "Failed to skip reminders" });
    }
  });

  // Restore a single previously-skipped upcoming reminder.
  // Body: { itemId: "task:<id>"|"event:<id>", kind: "pre"|"post" }
  app.post("/api/accountability/reminders/restore", requireAuth, async (req, res) => {
    try {
      const { itemId, kind } = req.body as { itemId?: string; kind?: string };
      if (
        typeof itemId !== "string" ||
        (!itemId.startsWith("task:") && !itemId.startsWith("event:")) ||
        (kind !== "pre" && kind !== "post")
      ) {
        return res.status(400).json({ error: "Invalid itemId or kind" });
      }
      const opts = itemId.startsWith("task:")
        ? { taskId: itemId.slice(5) }
        : { calendarEventId: itemId.slice(6) };
      clearSingleReminderCancellation(req.session.userId!, kind, opts);
      res.json({ success: true });
    } catch (error) {
      console.error("Restore reminder error:", error);
      res.status(500).json({ error: "Failed to restore reminder" });
    }
  });

  // Restore multiple previously-skipped upcoming reminders in one round-trip.
  // Mirrors /reminders/skip-batch and powers the Undo affordance on the
  // "Skip this day" toast so undoing a whole-day skip is a single request,
  // not one-per-reminder.
  // Body: { reminders: Array<{ itemId: "task:<id>"|"event:<id>", kind: "pre"|"post" }> }
  app.post("/api/accountability/reminders/restore-batch", requireAuth, async (req, res) => {
    try {
      const { reminders } = req.body as {
        reminders?: Array<{ itemId?: string; kind?: string }>;
      };
      if (!Array.isArray(reminders) || reminders.length === 0) {
        return res.status(400).json({ error: "reminders[] is required" });
      }
      if (reminders.length > 200) {
        return res.status(400).json({ error: "Too many reminders in batch" });
      }
      const valid: Array<{ itemId: string; kind: "pre" | "post" }> = [];
      for (const r of reminders) {
        if (
          !r ||
          typeof r.itemId !== "string" ||
          (!r.itemId.startsWith("task:") && !r.itemId.startsWith("event:")) ||
          (r.kind !== "pre" && r.kind !== "post")
        ) {
          return res.status(400).json({ error: "Invalid reminder entry" });
        }
        valid.push({ itemId: r.itemId, kind: r.kind });
      }
      for (const r of valid) {
        const opts = r.itemId.startsWith("task:")
          ? { taskId: r.itemId.slice(5) }
          : { calendarEventId: r.itemId.slice(6) };
        clearSingleReminderCancellation(req.session.userId!, r.kind, opts);
      }
      res.json({ success: true, count: valid.length });
    } catch (error) {
      console.error("Batch restore reminders error:", error);
      res.status(500).json({ error: "Failed to restore reminders" });
    }
  });

  // ── Evening Check-In ───────────────────────────────────────────────────────
  app.get("/api/accountability/check-in-status", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const now = new Date();
      const hour = now.getHours();
      const minute = now.getMinutes();
      const today = now.toISOString().split("T")[0];
      const yesterday = new Date(now.getTime() - 86400000).toISOString().split("T")[0];

      // Pull existing check-in for today
      const existing = await storage.getTodayCheckIn(userId);
      // Check if yesterday was missed
      let yesterdayCheckIn: any = null;
      try {
        const ei = await (storage as any).getCheckInByDate?.(userId, yesterday);
        yesterdayCheckIn = ei || null;
      } catch (_) {}

      // Compute optimal check-in time from user preferences
      let optimalHour = 21; // default 9 PM
      let optimalMinute = 30;
      try {
        const prefs = await storage.getUserSystemPreferences(userId);
        if (prefs?.preferredSleepTime) {
          // preferredSleepTime like "23:00" or "11:00 PM"
          const match = prefs.preferredSleepTime.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
          if (match) {
            let h = parseInt(match[1]);
            const m = parseInt(match[2]);
            const meridiem = match[3]?.toLowerCase();
            if (meridiem === "pm" && h < 12) h += 12;
            if (meridiem === "am" && h === 12) h = 0;
            // Optimal check-in = 90 minutes before sleep
            const optimalTotal = h * 60 + m - 90;
            optimalHour = Math.floor(optimalTotal / 60);
            optimalMinute = optimalTotal % 60;
            if (optimalHour < 0) optimalHour = 21; // fallback
          }
        }
      } catch (_) {}

      // Count today's calendar events (planned tasks) as context
      let todayTaskCount = 0;
      try {
        const events = await storage.getCalendarEvents(userId);
        todayTaskCount = events.filter((e: any) => {
          const st = e.startTime || "";
          return st.startsWith(today);
        }).length;
      } catch (_) {}

      // Time of day classification
      const nowMinutes = hour * 60 + minute;
      const optimalMinutes = optimalHour * 60 + optimalMinute;
      const isEarlyMorning = hour >= 4 && hour < 10;
      const isMorning = hour >= 10 && hour < 14;
      const isAfternoon = hour >= 14 && hour < 18;
      const isEvening = hour >= 18 && hour < 22;
      const isNight = hour >= 22 || hour < 4;
      const pastOptimalTime = nowMinutes >= optimalMinutes;
      const completedToday = !!existing;

      // Determine scenario
      // "needsCheckIn" = should show the modal now
      // "missedCheckIn" = they had a chance yesterday and didn't do it
      const missedYesterday = !yesterdayCheckIn;

      let needsCheckIn = false;
      let timeContext = "none";
      let contextTitle = "How did today go?";
      let contextBody = "DW wants to help you reflect and set up tomorrow.";
      let showMissedCount = false;

      if (!completedToday) {
        if (pastOptimalTime && isEvening) {
          // Prime time — optimal evening window
          needsCheckIn = true;
          timeContext = "prime_evening";
          contextTitle = "Time to check in";
          contextBody = "DW is ready whenever you are — a quick reflection goes a long way.";
        } else if (isNight && hour >= 22) {
          // Late evening / night, still same day
          needsCheckIn = true;
          timeContext = "late_night";
          contextTitle = "Still up?";
          contextBody = "Before you wind down — a quick reflection so tomorrow starts clear.";
        } else if (isNight && hour < 4) {
          // Very late / early hours — brief and non-pressuring
          needsCheckIn = true;
          timeContext = "very_late";
          contextTitle = "Late night…";
          contextBody = "No pressure — just a quick word with DW before you sleep. Totally optional.";
        } else if (isEarlyMorning && missedYesterday) {
          // Woke up, missed yesterday
          needsCheckIn = true;
          timeContext = "missed_morning";
          contextTitle = "Yesterday slipped by";
          contextBody = todayTaskCount > 0
            ? `You had ${todayTaskCount} things on the agenda — before today starts, want to close out yesterday?`
            : "Before today begins, want to close out yesterday with DW?";
          showMissedCount = true;
        } else if (isMorning && missedYesterday) {
          // Morning, missed yesterday
          needsCheckIn = true;
          timeContext = "missed_day_start";
          contextTitle = "A quick close-out";
          contextBody = todayTaskCount > 0
            ? `Yesterday had ${todayTaskCount} things planned. Before this day gets going — want to reflect?`
            : "Yesterday went uncaptured. Before this day gets going — a quick reflection?";
          showMissedCount = true;
        } else if (isAfternoon && missedYesterday) {
          // Afternoon, missed yesterday — lighter nudge
          needsCheckIn = true;
          timeContext = "missed_afternoon";
          contextTitle = "Yesterday's reflection";
          contextBody = "DW noticed you didn't check in yesterday. Even a one-line recap helps you stay aligned.";
          showMissedCount = true;
        }
        // else: before optimal window and no missed check-in → don't prompt yet
      }

      res.json({
        needsCheckIn,
        completed: completedToday,
        timeContext,
        contextTitle,
        contextBody,
        optimalHour,
        optimalMinute,
        missedYesterday,
        todayTaskCount,
        showMissedCount,
        hour,
        minute,
        today,
        yesterday,
      });
    } catch (err) {
      res.json({ needsCheckIn: false, completed: false, timeContext: "none" });
    }
  });

  app.post("/api/accountability/evening-check-in", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { userNotes, energyScore, completedSummary, timeContext, missedTaskCount } = req.body;
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const hour = now.getHours();

      let dwAnalysis = "Thank you for checking in. Every day you show up for yourself counts — even the imperfect ones.";
      try {
        const { generateCheckInAnalysis } = await import("../openai");
        const user = await storage.getUser(userId);
        const name = (user as any)?.systemName || (user as any)?.firstName || "friend";
        const goals = await storage.getGoals(userId);
        const wearablesYesterday = await safeGetWearablesYesterday(userId);
        dwAnalysis = await generateCheckInAnalysis(
          name,
          userNotes || "",
          energyScore || 5,
          goals.map((g: any) => g.title),
          { timeContext: timeContext || "prime_evening", hour, missedTaskCount: missedTaskCount || 0, wearablesYesterday }
        );
      } catch (_) {}

      const checkIn = await storage.createEveningCheckIn({ userId, checkInDate: today, userNotes, completedSummary, dwAnalysis, energyScore });

      await storage.createNotification({
        userId,
        type: "accountability",
        title: "Check-in saved ✓",
        body: dwAnalysis.slice(0, 120) + (dwAnalysis.length > 120 ? "…" : ""),
        actionUrl: "/talk",
      });

      res.json({ checkIn, dwAnalysis });
    } catch (err) {
      console.error("Evening check-in error:", err);
      res.status(500).json({ error: "Failed to save check-in" });
    }
  });
}
