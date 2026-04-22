import type { Express } from "express";
import { and, or } from "drizzle-orm";

import { storage } from "../storage";

import { requireAuth } from "./_shared";
import * as accountability from "../accountability";

export function registerAccountabilityCheckinRoutes(app: Express): void {
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
        const { getYesterdayHeadlineMetrics } = await import("./wearables");
        const user = await storage.getUser(userId);
        const name = (user as any)?.systemName || (user as any)?.firstName || "friend";
        const goals = await storage.getGoals(userId);
        const wearablesYesterday = await getYesterdayHeadlineMetrics(userId).catch(() => null);
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
