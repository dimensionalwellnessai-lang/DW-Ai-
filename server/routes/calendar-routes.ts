import type { Express } from "express";

import crypto from "crypto";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { storage } from "../storage";

import { db } from "../db";

import { requireAuth } from "./_shared";

import { openai } from "../openai";

import { aiLearnings, insertCalendarEventSchema } from "@shared/schema";

export function registerCalendarRoutes(app: Express): void {
  app.get("/api/calendar", requireAuth, async (req, res) => {
    try {
      const events = await storage.getCalendarEvents(req.session.userId!);
      res.json(events);
    } catch (error) {
      res.status(500).json({ error: "Failed to load calendar events" });
    }
  });

  // ─── iCal Feed ────────────────────────────────────────────────────────────────
  // Helpers for signing/verifying tokens so we can give Apple/Google a public URL
  function makeIcalToken(userId: string): string {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is required for iCal token signing");
    const payload = Buffer.from(userId).toString("base64url");
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("base64url")
      .slice(0, 24);
    return `${payload}.${sig}`;
  }

  function verifyIcalToken(token: string): string | null {
    const secret = process.env.SESSION_SECRET;
    if (!secret) throw new Error("SESSION_SECRET is required for iCal token verification");
    try {
      const [payload, sig] = token.split(".");
      if (!payload || !sig) return null;
      const expected = crypto
        .createHmac("sha256", secret)
        .update(payload)
        .digest("base64url")
        .slice(0, 24);
      if (sig !== expected) return null;
      return Buffer.from(payload, "base64url").toString("utf8");
    } catch {
      return null;
    }
  }

  function escapeIcal(str: string): string {
    return (str || "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\n/g, "\\n");
  }

  function toIcalDate(iso: string): string {
    // Returns UTC date-time string YYYYMMDDTHHMMSSZ
    const d = new Date(iso);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  }

  // Authenticated endpoint: returns the subscription URL for the current user
  app.get("/api/calendar/ical-token", requireAuth, (req, res) => {
    const token = makeIcalToken(req.session.userId!);
    const base = process.env.APP_BASE_URL || `https://${req.hostname}`;
    res.json({ url: `${base}/api/ical/${token}.ics` });
  });

  // Public endpoint: Apple/Google Calendar subscribes to this URL
  app.get("/api/ical/:token", async (req, res) => {
    const rawToken = req.params.token.replace(/\.ics$/, "");
    const userId = verifyIcalToken(rawToken);
    if (!userId) return res.status(401).send("Invalid or expired calendar token.");

    try {
      const events = await storage.getCalendarEvents(userId);
      const lines: string[] = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//Dimensional Wellness AI//Calendar//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        "X-WR-CALNAME:Dimensional Wellness",
        "X-WR-TIMEZONE:UTC",
      ];

      for (const ev of events) {
        const dtStart = toIcalDate(ev.startTime);
        const dtEnd   = toIcalDate(ev.endTime || ev.startTime);
        if (!dtStart) continue;
        lines.push("BEGIN:VEVENT");
        lines.push(`UID:${ev.id}@dimensionalwellnessai.com`);
        lines.push(`DTSTAMP:${toIcalDate(new Date().toISOString())}`);
        lines.push(`DTSTART:${dtStart}`);
        lines.push(`DTEND:${dtEnd}`);
        lines.push(`SUMMARY:${escapeIcal(ev.title)}`);
        if (ev.description) lines.push(`DESCRIPTION:${escapeIcal(ev.description)}`);
        if (ev.eventType)   lines.push(`CATEGORIES:${escapeIcal(ev.eventType)}`);
        lines.push("END:VEVENT");
      }

      lines.push("END:VCALENDAR");

      res.setHeader("Content-Type", "text/calendar; charset=utf-8");
      res.setHeader("Content-Disposition", 'attachment; filename="dw-calendar.ics"');
      res.setHeader("Cache-Control", "no-cache, no-store");
      res.send(lines.join("\r\n"));
    } catch (error) {
      res.status(500).send("Failed to generate calendar feed.");
    }
  });
  // ─────────────────────────────────────────────────────────────────────────────

  app.get("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const event = await storage.getCalendarEventForUser(req.params.id, req.session.userId!);
      if (!event) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(event);
    } catch (error) {
      res.status(500).json({ error: "Failed to load event" });
    }
  });

  app.post("/api/calendar", requireAuth, async (req, res) => {
    try {
      const data = insertCalendarEventSchema.parse({ ...req.body, userId: req.session.userId! });
      const created = await storage.createCalendarEvent(data);
      res.json(created);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create event" });
    }
  });

  app.patch("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateCalendarEventForUser(req.params.id, req.session.userId!, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update event" });
    }
  });

  app.delete("/api/calendar/:id", requireAuth, async (req, res) => {
    try {
      const deleted = await storage.deleteCalendarEventForUser(req.params.id, req.session.userId!);
      if (!deleted) {
        return res.status(404).json({ error: "Event not found" });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete event" });
    }
  });

  // ── Calendar Event Tasks ────────────────────────────────────────────────
  app.get("/api/calendar/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const tasks = await storage.getEventTasks(req.params.eventId, req.session.userId!);
      res.json(tasks);
    } catch (error) {
      res.status(500).json({ error: "Failed to load tasks" });
    }
  });

  app.post("/api/calendar/:eventId/tasks", requireAuth, async (req, res) => {
    try {
      const task = await storage.createEventTask({
        calendarEventId: req.params.eventId,
        userId: req.session.userId!,
        title: req.body.title,
        dwSuggested: req.body.dwSuggested ?? false,
        linkedRoute: req.body.linkedRoute ?? null,
      });
      res.json(task);
    } catch (error) {
      res.status(500).json({ error: "Failed to create task" });
    }
  });

  app.patch("/api/calendar/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      const updated = await storage.updateEventTask(req.params.taskId, req.session.userId!, req.body);
      if (!updated) return res.status(404).json({ error: "Task not found" });
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update task" });
    }
  });

  app.delete("/api/calendar/tasks/:taskId", requireAuth, async (req, res) => {
    try {
      await storage.deleteEventTask(req.params.taskId, req.session.userId!);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete task" });
    }
  });

  // DW suggests tasks for a calendar event — personalized using user context
  app.post("/api/calendar/:eventId/suggest-tasks", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { title, description, startTime, endTime, dimensionTags, location } = req.body;

      // ── Collect user context in parallel ──────────────────────────────────
      const [onboarding, userGoals, profile, learningsRows] = await Promise.all([
        storage.getOnboardingProfile(userId),
        storage.getGoals(userId),
        storage.getUserProfile(userId),
        db.select().from(aiLearnings).where(eq(aiLearnings.userId, userId)).limit(12),
      ]);

      const activeGoalTitles = userGoals
        .filter((g) => g.isActive)
        .map((g) => g.title)
        .slice(0, 8);

      const learningsSummary = learningsRows
        .map((l) => `${l.topic}: ${JSON.stringify(l.details ?? "")}`)
        .join("; ");

      const lp = (profile?.lifestylePreferences ?? {}) as Record<string, string>;
      const lifestyleCtx = [
        lp.identityVision ? `Who they're becoming / identity vision: ${lp.identityVision}` : "",
        lp.styleLikes ? `Their style / aesthetic: ${lp.styleLikes}` : "",
        lp.watchLikes ? `TV/Movies they enjoy: ${lp.watchLikes}` : "",
        lp.readLikes ? `Reading interests: ${lp.readLikes}` : "",
        lp.doLikes ? `Activities they love: ${lp.doLikes}` : "",
        lp.musicLikes ? `Music/Podcasts they like: ${lp.musicLikes}` : "",
        lp.goLikes ? `Places/experiences they enjoy: ${lp.goLikes}` : "",
        lp.createLikes ? `Creative interests: ${lp.createLikes}` : "",
      ].filter(Boolean).join("\n");

      const userCtx = [
        onboarding?.shortTermGoals ? `Short-term goals: ${onboarding.shortTermGoals}` : "",
        onboarding?.longTermGoals ? `Long-term goals: ${onboarding.longTermGoals}` : "",
        onboarding?.wellnessFocus?.length ? `Wellness focus areas: ${onboarding.wellnessFocus.join(", ")}` : "",
        onboarding?.priorities?.length ? `Priorities: ${onboarding.priorities.join(", ")}` : "",
        activeGoalTitles.length ? `Active goals: ${activeGoalTitles.join(", ")}` : "",
        profile?.fitnessGoal ? `Fitness goal: ${profile.fitnessGoal}` : "",
        profile?.coachingTone ? `Preferred tone: ${profile.coachingTone}` : "",
        lifestyleCtx ? `LIFESTYLE PREFERENCES (use these to be specific):\n${lifestyleCtx}` : "",
        learningsSummary ? `What DW has learned about this person: ${learningsSummary}` : "",
      ].filter(Boolean).join("\n");

      // ── Detect free time / leisure event ──────────────────────────────────
      const freeTimeKeywords = ["free", "relax", "tv", "television", "chill", "leisure", "downtime", "unwind", "rest", "watch", "movie", "read", "hang", "game", "play", "scroll", "browse"];
      const isFreeTime = !title?.trim() || freeTimeKeywords.some((kw) => title.toLowerCase().includes(kw));

      let prompt: string;

      const hasLifestylePrefs = lifestyleCtx.length > 0;
      const identityLens = lp.identityVision ? `This person is actively becoming: ${lp.identityVision}. Every suggestion should feel like it serves that version of them.` : "";
      const styleLens = lp.styleLikes ? `Their style/aesthetic is: ${lp.styleLikes}. Suggestions should feel aligned with this vibe.` : "";

      if (isFreeTime) {
        prompt = `You are DW, a personal AI companion who knows this person more deeply than anyone. They have free/leisure time${startTime ? ` at ${startTime}` : ""}${endTime ? ` until ${endTime}` : ""}${location ? ` in/near ${location}` : ""}.

═══ EVERYTHING YOU KNOW ABOUT THIS PERSON ═══
${userCtx || "Limited context — give diverse, growth-oriented suggestions."}

${identityLens}
${styleLens}
═══════════════════════════════════════════════

${hasLifestylePrefs
  ? `USE THEIR PREFERENCES TO BE EXTREMELY SPECIFIC:
- If they like crime dramas → suggest a specific type of crime drama, not just "watch TV"
- If they're into R&B → suggest a specific mood or artist type, not just "listen to music"  
- If they enjoy coffee shops → suggest going to a cozy spot to work on something specific
- Every suggestion should feel like it was written specifically for this person
- Their identity vision is the filter — does this suggestion serve who they're becoming?`
  : `No specific preferences yet — make suggestions that feel aspirational and growth-oriented for someone building a healthier, more intentional life.`}

Generate 5-6 suggestions for their free time. Each should feel like it was curated specifically for THIS person. Vary the categories. Make some suggestions serve their goals, some serve pure enjoyment — but all should feel right for who they are.

Return ONLY a JSON array. Each object must have:
- "title": specific and personal (max 70 chars) — name real content types, genres, activity types, vibes
- "category": one of "Watch", "Read", "Go", "Do", "Listen", "Create"  
- "why": one short sentence (max 80 chars) — tie it to their identity, goals, or preferences specifically. Never say "This is relaxing" — say WHY it fits THEM.
- "linkedRoute": relevant app route or null (options: /browse, /workout, /insights, /goals, /habits, /talk)

Return only valid JSON, no markdown, no extra text.`;
      } else {
        const timeStr = startTime ? ` at ${startTime}` : "";
        const durationStr = endTime ? ` until ${endTime}` : "";
        const tagStr = dimensionTags?.length ? ` [${dimensionTags.join(", ")}]` : "";
        const locationStr = location ? ` at ${location}` : "";

        prompt = `You are DW, a personal AI companion who knows this person deeply. They have a calendar event: "${title}"${timeStr}${durationStr}${tagStr}${locationStr}.${description ? ` Notes: ${description}` : ""}

═══ WHAT YOU KNOW ABOUT THIS PERSON ═══
${userCtx || "No specific context — suggest practical, actionable steps."}
${identityLens}
${styleLens}
═══════════════════════════════════════

Generate 4-5 specific, actionable tasks for this event. Every task should serve both the event AND who this person is becoming. Reference their goals and style directly — not generic advice anyone would get.

Return ONLY a JSON array. Each object must have:
- "title": task title (max 65 chars) — be specific and practical
- "category": one of "Prepare", "Do", "Track", "Reflect", "Connect"
- "why": one short sentence (max 80 chars) — tie it to their specific goals, identity, or style
- "linkedRoute": relevant app route or null (options: /workout, /insights, /habits, /goals, /talk, /browse, /mood-tracker, /tracking)

Return only valid JSON, no markdown, no extra text.`;
      }

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.8,
        max_tokens: 600,
      });

      const raw = completion.choices[0]?.message?.content?.trim() ?? "[]";
      let suggestions: { title: string; category: string; why: string; linkedRoute: string | null }[] = [];
      try {
        const cleaned = raw.replace(/^```(?:json)?[\s\S]*?\n|```$/gm, "").trim();
        suggestions = JSON.parse(cleaned);
      } catch {
        suggestions = [];
      }

      res.json({ suggestions, isFreeTime, hasLifestylePrefs });
    } catch (error) {
      console.error("suggest-tasks error:", error);
      res.status(500).json({ error: "Failed to generate suggestions" });
    }
  });

  // ── Lifestyle preferences ────────────────────────────────────────────────────
  // ── Unified Life Plan ─────────────────────────────────────────────────────
}
