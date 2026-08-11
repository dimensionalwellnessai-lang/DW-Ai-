import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "../db";
import { energyPractices } from "@shared/schema";
import { requireAuth } from "./_shared";
import { openai } from "../openai";
import { storage } from "../storage";

const transmutationResponseSchema = z.object({
  reframe: z.string().min(1),
  exercise: z.string().min(1),
});

export function registerEnergyTransmutationRoutes(app: Express): void {
  /** GET /api/energy-practices — return the user's recent practices */
  app.get("/api/energy-practices", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const practices = await db
        .select()
        .from(energyPractices)
        .where(eq(energyPractices.userId, userId))
        .orderBy(desc(energyPractices.createdAt))
        .limit(20);
      res.json(practices);
    } catch (err) {
      console.error("[energy-practices] GET error", err);
      res.status(500).json({ error: "Unable to load practices" });
    }
  });

  /** POST /api/energy-practices/transmute — create + transmute a situation */
  app.post("/api/energy-practices/transmute", requireAuth, async (req, res) => {
    const schema = z.object({ situation: z.string().min(1).max(2000) });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

    const userId = req.session.userId!;
    const { situation } = parsed.data;

    try {
      const prompt = `You are DW, a warm and supportive wellness companion. The user shared this situation: "${situation}"

Respond with ONLY valid JSON in exactly this shape:
{
  "reframe": "A compassionate 2-3 sentence perspective reframe that shifts how they see the situation — no toxic positivity, just a grounded new angle.",
  "exercise": "A practical 3-5 step transmutation exercise they can do right now or today to shift their energy around this situation."
}`;

      const aiResponse = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 600,
        response_format: { type: "json_object" },
      });

      const raw = aiResponse.choices[0]?.message?.content ?? "{}";
      let reframe = "";
      let exercise = "";
      try {
        const parsed = transmutationResponseSchema.safeParse(JSON.parse(raw));
        if (parsed.success) {
          reframe = parsed.data.reframe;
          exercise = parsed.data.exercise;
        } else {
          throw new Error("Invalid transmutation payload");
        }
      } catch {
        // fallback
        reframe = "Sometimes stepping back gives us room to see things differently.";
        exercise = "Take 3 deep breaths, then write down one small action you can take today.";
      }

      const [practice] = await db
        .insert(energyPractices)
        .values({ userId, situation, reframe, exercise })
        .returning();

      res.json({ practice, reframe, exercise });
    } catch (err) {
      console.error("[energy-practices] transmute error", err);
      res.status(500).json({ error: "Transmutation unavailable right now" });
    }
  });

  /** PATCH /api/energy-practices/:id — update action flags */
  app.patch("/api/energy-practices/:id", requireAuth, async (req, res) => {
    const schema = z.object({
      action: z.enum(["save", "add_to_today", "add_to_routine"]),
      routineCadence: z.enum(["daily", "weekly", "as_needed"]).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: "Invalid action" });

    const userId = req.session.userId!;
    const { id } = req.params;
    const { action, routineCadence } = parsed.data;

    try {
      const updates: Partial<typeof energyPractices.$inferInsert> = {};
      if (action === "save") updates.saved = true;
      if (action === "add_to_today") updates.addedToToday = true;
      if (action === "add_to_routine") updates.routineCadence = routineCadence ?? "weekly";

      const [practice] = await db
        .update(energyPractices)
        .set({ ...updates, updatedAt: new Date() })
        .where(and(eq(energyPractices.id, id), eq(energyPractices.userId, userId)))
        .returning();

      if (!practice) {
        return res.status(404).json({ error: "Practice not found" });
      }

      if (action === "add_to_routine") {
        await storage.createRoutine({
          userId,
          name: "Energy transmutation practice",
          dimensionTags: ["emotional"],
          steps: [
            { title: "Perspective reframe", description: practice.reframe ?? "" },
            { title: "Transmutation exercise", description: practice.exercise ?? "" },
          ],
          scheduleOptions: { cadence: practice.routineCadence ?? "weekly" },
        });
      }

      res.json({ ok: true, practice });
    } catch (err) {
      console.error("[energy-practices] PATCH error", err);
      res.status(500).json({ error: "Update failed" });
    }
  });
}
