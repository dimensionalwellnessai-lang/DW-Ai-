import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth, DW_MAX_MESSAGE_CONTENT_LENGTH } from "./_shared";
import { chatLimiter } from "./_limiters";

import { openai, getAiConfigStatus } from "../openai";

import { insertCalendarEventSchema } from "@shared/schema";

export function registerWeekPlannerRoutes(app: Express): void {
  app.post("/api/week-planner/chat", chatLimiter, requireAuth, async (req, res) => {
    try {
      const { message, conversationHistory, questionCount } = req.body;

      if (!message || typeof message !== "string" || message.trim().length === 0) {
        return res.status(400).json({ error: "Message content is required" });
      }
      if (message.length > DW_MAX_MESSAGE_CONTENT_LENGTH) {
        return res.status(400).json({ error: `Message is too long (max ${DW_MAX_MESSAGE_CONTENT_LENGTH} characters)` });
      }

      const aiConfig = getAiConfigStatus();
      if (!aiConfig.configured) {
        return res.status(503).json({ error: "AI is not configured on this server." });
      }

      const currentQuestionCount: number = typeof questionCount === "number" ? questionCount : 0;
      const today = new Date();
      const todayStr = today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });

      // Build message history for the AI – only allow "user" | "assistant" roles,
      // cap at 20 turns to avoid excessively large prompts.
      const ALLOWED_ROLES = new Set(["user", "assistant"]);
      const history: { role: "user" | "assistant"; content: string }[] = Array.isArray(conversationHistory)
        ? conversationHistory
            .filter(
              (m: unknown) =>
                m !== null &&
                typeof m === "object" &&
                typeof (m as Record<string, unknown>).role === "string" &&
                typeof (m as Record<string, unknown>).content === "string" &&
                ALLOWED_ROLES.has((m as Record<string, unknown>).role as string)
            )
            .slice(-20)
            .map((m: Record<string, unknown>) => ({ role: m.role as "user" | "assistant", content: m.content as string }))
        : [];

      const systemPrompt = `You are the DW Week Planner, a calm and thoughtful assistant that helps users build their personalised weekly schedule.

TODAY: ${todayStr}

YOUR GOAL: Gather information across up to 8 targeted questions, then propose a structured week plan.

QUESTIONS TO COVER (spread across the conversation, not all at once):
1. Wake time and morning energy
2. Work/school schedule and core commitments
3. Physical activity preferences and frequency
4. Meal preferences or prep habits
5. Evening wind-down or sleep goals
6. Social or personal commitments
7. Self-care or wellness priorities
8. Any blockers, constraints, or preferences

CURRENT QUESTION COUNT: ${currentQuestionCount} questions asked so far.

PHASE RULES:
- If questionCount < 7: Ask the NEXT unanswered question naturally. Keep responses brief and conversational (2-4 sentences). DO NOT produce a schedule yet.
- If questionCount >= 7: Summarise what you know, then produce the final schedule as JSON.

SCHEDULE JSON FORMAT (only when questionCount >= 7):
When ready, end your response with a JSON block in this exact format — no additional text after the JSON:

<SCHEDULE_JSON>
[
  {
    "id": "block-1",
    "title": "Morning Workout",
    "day": 1,
    "startTime": "07:00",
    "endTime": "08:00",
    "category": "workout",
    "why": "Aligns with your high morning energy on weekdays."
  }
]
</SCHEDULE_JSON>

FIELD RULES:
- "day": 0=Sunday, 1=Monday, 2=Tuesday, 3=Wednesday, 4=Thursday, 5=Friday, 6=Saturday
- "startTime" and "endTime": HH:mm 24-hour format
- "category": one of workout, meal, work, personal, social, wellness, sleep
- "id": unique string like "block-1", "block-2" etc.
- "why": brief one-sentence rationale personalised to the user
- Propose 5–12 blocks spread across the week
- Always include sleep blocks, at least one meal prep or meal block, and blocks matching the user's stated priorities

TONE: Warm, grounded, non-prescriptive. Never preachy. Match the user's energy level.`;

      const messages: { role: "user" | "assistant" | "system"; content: string }[] = [
        { role: "system", content: systemPrompt },
        ...history,
        { role: "user", content: message },
      ];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages,
        temperature: 0.7,
        max_tokens: 1200,
      });

      const rawResponse = completion.choices[0]?.message?.content || "I'm here to help plan your week. Could you tell me more?";

      // Extract schedule JSON if present
      let proposedSchedule: unknown[] | null = null;
      let cleanResponse = rawResponse;
      const jsonMatch = rawResponse.match(/<SCHEDULE_JSON>([\s\S]*?)<\/SCHEDULE_JSON>/);
      if (jsonMatch) {
        try {
          proposedSchedule = JSON.parse(jsonMatch[1].trim());
          cleanResponse = rawResponse.replace(/<SCHEDULE_JSON>[\s\S]*?<\/SCHEDULE_JSON>/, "").trim();
        } catch {
          // If JSON parse fails, treat as plain text response
        }
      }

      const newQuestionCount = Math.min(currentQuestionCount + 1, 8);
      const phase = proposedSchedule ? "proposal" : "questions";

      res.json({
        response: cleanResponse,
        questionCount: newQuestionCount,
        phase,
        ...(proposedSchedule ? { proposedSchedule } : {}),
      });
    } catch (error) {
      console.error("Week planner chat error:", error);
      res.status(500).json({ error: "Failed to process week planner message" });
    }
  });

  // POST /api/week-planner/confirm – save confirmed schedule blocks as calendar events
  // Accepts an optional `weekStart` (ISO string) from the client so server and
  // client anchor events to the same week. Falls back to the next Sunday if omitted.
  app.post("/api/week-planner/confirm", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { confirmedItems, weekStart: weekStartParam } = req.body;

      if (!Array.isArray(confirmedItems) || confirmedItems.length === 0) {
        return res.status(400).json({ error: "At least one schedule item must be confirmed" });
      }

      // Resolve week start: prefer the ISO string provided by the client so both
      // sides anchor to the same week; fall back to the upcoming Sunday.
      const computeNextSunday = () => {
        const now = new Date();
        const dayOfWeek = now.getDay(); // 0=Sunday
        const daysUntilSunday = dayOfWeek === 0 ? 0 : 7 - dayOfWeek;
        const d = new Date(now);
        d.setDate(now.getDate() + daysUntilSunday);
        return d;
      };
      let weekStart: Date;
      if (typeof weekStartParam === "string") {
        const parsed = new Date(weekStartParam);
        // Fall back to the same Sunday calculation if the client value is invalid
        weekStart = isNaN(parsed.getTime()) ? computeNextSunday() : parsed;
      } else {
        weekStart = computeNextSunday();
      }
      weekStart.setHours(0, 0, 0, 0);

      let created = 0;
      for (const item of confirmedItems) {
        // Guard against null/non-object entries
        if (!item || typeof item !== "object") continue;
        if (!(item as Record<string, unknown>).isConfirmed) continue;

        const day = (item as Record<string, unknown>).day;
        const startTimeRaw = (item as Record<string, unknown>).startTime;

        // Validate day is an integer in 0–6
        if (typeof day !== "number" || !Number.isInteger(day) || day < 0 || day > 6) continue;
        if (typeof startTimeRaw !== "string") continue;

        // Calculate the date for this block
        const eventDate = new Date(weekStart);
        eventDate.setDate(weekStart.getDate() + day);

        // Parse startTime (HH:mm)
        const [startHour, startMin] = startTimeRaw.split(":").map(Number);
        if (isNaN(startHour) || isNaN(startMin)) continue;
        eventDate.setHours(startHour, startMin, 0, 0);

        // Parse endTime (HH:mm) or default to +1 hour
        let endDate: Date;
        const endTimeRaw = (item as Record<string, unknown>).endTime;
        if (endTimeRaw && typeof endTimeRaw === "string") {
          const [endHour, endMin] = endTimeRaw.split(":").map(Number);
          endDate = new Date(eventDate);
          if (!isNaN(endHour) && !isNaN(endMin)) {
            endDate.setHours(endHour, endMin, 0, 0);
            // Handle overnight blocks (e.g. 22:00 → 06:00): advance end to next day
            if (endDate <= eventDate) {
              endDate.setDate(endDate.getDate() + 1);
            }
          } else {
            endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
          }
        } else {
          endDate = new Date(eventDate.getTime() + 60 * 60 * 1000);
        }

        // Map planner category to a known calendar event type
        const category = (item as Record<string, unknown>).category;
        const eventType =
          typeof category === "string" && PLANNER_CATEGORY_TO_EVENT_TYPE[category]
            ? PLANNER_CATEGORY_TO_EVENT_TYPE[category]
            : "event";

        try {
          const data = insertCalendarEventSchema.parse({
            userId,
            title: String((item as Record<string, unknown>).title || "Untitled block"),
            description: (item as Record<string, unknown>).description
              ? String((item as Record<string, unknown>).description)
              : null,
            startTime: eventDate.toISOString(),
            endTime: endDate.toISOString(),
            eventType,
          });
          await storage.createCalendarEvent(data);
          created++;
        } catch {
          // Skip invalid items rather than failing the whole batch
        }
      }

      res.json({ created });
    } catch (error) {
      console.error("Week planner confirm error:", error);
      res.status(500).json({ error: "Failed to save schedule. Please try again." });
    }
  });

  // ========================================
  // COMMUNITY OPPORTUNITIES (live data)
  // ========================================

  // Seed default opportunities on startup (no-op if already seeded)
  storage.seedDefaultCommunityOpportunities().catch((err) =>
    console.error("[community] seed error:", err),
  );

  // GET /api/community/opportunities — public; includes isSaved if authenticated
}
