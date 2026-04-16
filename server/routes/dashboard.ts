import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { openai } from "../openai";
import { generateProactiveNudges, generateMorningBriefing } from "../proactive";



export function registerDashboardRoutes(app: Express): void {
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const lifeSystem = await storage.getLifeSystem(userId);
      const goals = await storage.getGoals(userId);
      const habits = await storage.getHabits(userId);
      const todaysMood = await storage.getTodaysMoodLog(userId);

      res.json({
        systemName: user?.systemName || lifeSystem?.name || "Your Life System",
        lifeSystem,
        goals: goals.filter((g) => g.isActive),
        habits: habits.filter((h) => h.isActive),
        todaysMood,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to load dashboard" });
    }
  });

  app.get("/api/proactive/nudges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nudges = await generateProactiveNudges(userId);
      res.json(nudges);
    } catch (error) {
      console.error("Error generating proactive nudges:", error);
      res.json([]);
    }
  });

  app.get("/api/proactive/briefing", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const briefing = await generateMorningBriefing(userId);
      res.json(briefing);
    } catch (error) {
      console.error("Error generating morning briefing:", error);
      res.status(500).json({ error: "Failed to generate briefing" });
    }
  });

  // Quick-reply chip suggestions — given a DW message, return 2-3 short user replies
  app.post("/api/ai/chips", requireAuth, async (req, res) => {
    try {
      const { message } = req.body as { message?: string };
      if (!message || message.length < 10) return res.json({ chips: [] });

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You generate short quick-reply button text for a wellness AI chat.
Given the assistant's last message, produce 2–3 short replies a user might tap.
Rules:
- Each reply must be 2–7 words max
- Only produce chips if the message asks a question or invites a response
- If the message is purely informational with no question, return []
- Make chips feel natural and personal, not robotic
- Return ONLY a valid JSON array of strings. No explanation, no markdown.
Example: ["Work stress mostly", "It's been everything", "Just need a plan"]`,
          },
          { role: "user", content: message },
        ],
        max_tokens: 80,
        temperature: 0.8,
      });

      const raw = completion.choices[0]?.message?.content?.trim() || "[]";
      let chips: string[] = [];
      try { chips = JSON.parse(raw); } catch { chips = []; }
      res.json({ chips: Array.isArray(chips) ? chips.slice(0, 3) : [] });
    } catch {
      res.json({ chips: [] });
    }
  });

  // Browse: Music — personalized playlist/genre/mood recommendations
}
