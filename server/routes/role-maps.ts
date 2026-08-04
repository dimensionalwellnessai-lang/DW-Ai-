import type { Express } from "express";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "../db";
import { storage } from "../storage";
import { requireAuth } from "./_shared";
import { aiContentLimiter, dwProcessLimiter } from "./_limiters";
import { openai } from "../openai";
import {
  roleMaps,
  roleMapInterviews,
  type RoleMap,
  type RoleMapLevel,
} from "@shared/schema";

// ─── Types ───────────────────────────────────────────────────────────────────

interface InterviewMessage {
  role: "assistant" | "user";
  content: string;
}

const OPENING_QUESTION =
  "Let's build your Role Map. I'm going to interview you the way you'd interview someone already living the life you want — except the subject is your future self.\n\nFirst question: when you picture your life a few years from now going exactly the way you want, what role are you playing? Not a job title necessarily — who are you being?";

const MIN_ANSWERS_TO_SYNTHESIZE = 4;

// ─── Interview prompt ────────────────────────────────────────────────────────

const INTERVIEWER_SYSTEM_PROMPT = `You are DW, conducting an informational interview to help the user map how to level up into the life they want. You use classic informational-interviewing techniques, but flipped: the "role" being explored is the user's own future self.

Your job each turn:
1. Read the transcript so far.
2. Ask exactly ONE probing, adaptive follow-up question. Never ask two questions at once.
3. Warm, grounded, a little dry — like a sharp friend. Plain English, 1-3 sentences before the question at most.

Cover these areas across the interview (adapt order to the conversation, don't announce them):
- The target role/identity: who they want to become, in their own words.
- The picture of that life: a typical day/week, what they're doing, how it feels.
- People already living it: what those people actually DO (activities, routines) and how they THINK (mindsets, standards, what they say no to).
- The gap: what's true today vs. that life — skills, habits, environment, relationships.
- Obstacles and past attempts: what's stopped them before.
- The very next level: what a realistic next step up looks like in the next 1-3 months.

Rules:
- One question per turn. Short. No bullet lists.
- Reflect back something specific they said before asking the next question.
- If an answer is vague, gently probe deeper rather than moving on.
- After the user has given you enough material to build a meaningful map (target role, gap, activities/mindsets, and a sense of the next level), set "ready" to true. Keep it false before that.

Respond with JSON: {"reply": "<your next message ending in one question>", "ready": <boolean>}`;

const SYNTHESIS_SYSTEM_PROMPT = `You are DW, a life-design coach. Synthesize the following informational-interview transcript into a personal Role Map: the role the user wants to grow into and a realistic ladder of levels to get there.

Return JSON with exactly these fields:
{
  "targetRole": "<short name of the role/identity, max 60 chars, in the user's language (e.g. 'Calm, present founder')>",
  "identityStatement": "<one sentence in the user's voice starting with 'I am becoming...' grounded in what they said>",
  "gapSummary": "<2-3 sentences honestly describing the gap between their life today and the target, using their own words where possible>",
  "currentLevel": <1-based number of the level that best matches where they are TODAY>,
  "levels": [
    {
      "level": 1,
      "title": "<short level name>",
      "description": "<1 sentence: what life looks like at this level>",
      "milestones": [{"id": "l1-m1", "title": "<concrete observable outcome>"}, ...2-3 milestones],
      "activities": ["<specific activity to practice at this level>", ...2-3],
      "habits": ["<repeatable habit, phrased as a habit (e.g. 'Write for 20 minutes every morning')>", ...2-3],
      "mindsets": ["<way of thinking / standard to adopt>", ...1-2]
    },
    ... 4-5 levels total, ascending from where they are to the full target role
  ]
}

Rules:
- Ground EVERYTHING in what the user actually said. Do not invent goals they never mentioned.
- Levels must be realistic steps, not fantasy leaps. Level 1 should be attainable now; the top level is the target role lived fully.
- Milestone ids must be unique across the whole map ("l<level>-m<n>").
- Habits must be phrased so they work as trackable daily/weekly habits.
- Keep every string concise. Return only valid JSON.`;

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sanitizeMessages(raw: unknown): InterviewMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter(
      (m): m is InterviewMessage =>
        !!m &&
        typeof (m as InterviewMessage).content === "string" &&
        ((m as InterviewMessage).role === "assistant" ||
          (m as InterviewMessage).role === "user"),
    )
    .map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
}

function userAnswerCount(messages: InterviewMessage[]): number {
  return messages.filter((m) => m.role === "user").length;
}

const levelSchema = z.object({
  level: z.number().int().min(1),
  title: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  milestones: z
    .array(
      z.object({
        id: z.string().min(1).max(40),
        title: z.string().min(1).max(300),
        done: z.boolean().optional(),
      }),
    )
    .max(8)
    .default([]),
  activities: z.array(z.string().min(1).max(300)).max(8).default([]),
  habits: z.array(z.string().min(1).max(300)).max(8).default([]),
  mindsets: z.array(z.string().min(1).max(300)).max(8).default([]),
});

const updateRoleMapSchema = z
  .object({
    targetRole: z.string().min(1).max(120).optional(),
    identityStatement: z.string().max(500).nullable().optional(),
    gapSummary: z.string().max(1000).nullable().optional(),
    currentLevel: z.number().int().min(1).max(20).optional(),
    status: z.enum(["draft", "active", "archived"]).optional(),
    levels: z.array(levelSchema).max(10).optional(),
  })
  .strict();

async function getOwnedRoleMap(
  id: string,
  userId: string,
): Promise<RoleMap | null> {
  const [row] = await db
    .select()
    .from(roleMaps)
    .where(and(eq(roleMaps.id, id), eq(roleMaps.userId, userId)))
    .limit(1);
  return row ?? null;
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerRoleMapRoutes(app: Express): void {
  // List the user's role maps (newest first).
  app.get("/api/role-maps", requireAuth, async (req, res) => {
    try {
      const rows = await db
        .select()
        .from(roleMaps)
        .where(eq(roleMaps.userId, req.session.userId!))
        .orderBy(desc(roleMaps.createdAt));
      res.json(rows);
    } catch (error) {
      console.error("List role maps error:", error);
      res.status(500).json({ error: "Failed to load role maps" });
    }
  });

  // Get the current active (in-progress) interview, if any.
  app.get("/api/role-maps/interview/active", requireAuth, async (req, res) => {
    try {
      const [interview] = await db
        .select()
        .from(roleMapInterviews)
        .where(
          and(
            eq(roleMapInterviews.userId, req.session.userId!),
            eq(roleMapInterviews.status, "active"),
          ),
        )
        .orderBy(desc(roleMapInterviews.createdAt))
        .limit(1);
      if (!interview) return res.json({ interview: null });
      const messages = sanitizeMessages(interview.messages);
      res.json({
        interview: {
          id: interview.id,
          messages,
          answerCount: userAnswerCount(messages),
          canSynthesize: userAnswerCount(messages) >= MIN_ANSWERS_TO_SYNTHESIZE,
        },
      });
    } catch (error) {
      console.error("Get active interview error:", error);
      res.status(500).json({ error: "Failed to load interview" });
    }
  });

  // Start (or resume) an interview.
  app.post("/api/role-maps/interview/start", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [existing] = await db
        .select()
        .from(roleMapInterviews)
        .where(
          and(
            eq(roleMapInterviews.userId, userId),
            eq(roleMapInterviews.status, "active"),
          ),
        )
        .orderBy(desc(roleMapInterviews.createdAt))
        .limit(1);

      if (existing) {
        const messages = sanitizeMessages(existing.messages);
        return res.json({
          interview: {
            id: existing.id,
            messages,
            answerCount: userAnswerCount(messages),
            canSynthesize:
              userAnswerCount(messages) >= MIN_ANSWERS_TO_SYNTHESIZE,
          },
          resumed: true,
        });
      }

      // If the user already has an active map, mention evolving it in the opener.
      const [activeMap] = await db
        .select()
        .from(roleMaps)
        .where(
          and(eq(roleMaps.userId, userId), eq(roleMaps.status, "active")),
        )
        .limit(1);

      const opening: InterviewMessage = {
        role: "assistant",
        content: activeMap
          ? `Last time we mapped you toward "${activeMap.targetRole}". Life moves — let's see what's changed.\n\nWhat feels different now: the role you're aiming for, or how far along you are?`
          : OPENING_QUESTION,
      };

      // A partial unique index (one active interview per user) makes this
      // insert fail cleanly if a concurrent request won the race — in that
      // case, return the winner's interview instead of erroring.
      let interview;
      try {
        [interview] = await db
          .insert(roleMapInterviews)
          .values({ userId, status: "active", messages: [opening] })
          .returning();
      } catch (insertErr: unknown) {
        const e = insertErr as { code?: string; cause?: { code?: string } };
        const code = e?.code ?? e?.cause?.code;
        if (code === "23505") {
          const [winner] = await db
            .select()
            .from(roleMapInterviews)
            .where(
              and(
                eq(roleMapInterviews.userId, userId),
                eq(roleMapInterviews.status, "active"),
              ),
            )
            .limit(1);
          if (winner) {
            const msgs = sanitizeMessages(winner.messages);
            return res.json({
              interview: {
                id: winner.id,
                messages: msgs,
                answerCount: userAnswerCount(msgs),
                canSynthesize:
                  userAnswerCount(msgs) >= MIN_ANSWERS_TO_SYNTHESIZE,
              },
              resumed: true,
            });
          }
        }
        throw insertErr;
      }

      res.json({
        interview: {
          id: interview.id,
          messages: [opening],
          answerCount: 0,
          canSynthesize: false,
        },
        resumed: false,
      });
    } catch (error) {
      console.error("Start interview error:", error);
      res.status(500).json({ error: "Failed to start interview" });
    }
  });

  // Send an answer; DW replies with the next question.
  app.post(
    "/api/role-maps/interview/:id/message",
    requireAuth,
    aiContentLimiter,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const message = String(req.body?.message ?? "").trim();
        if (!message) {
          return res.status(400).json({ error: "message is required" });
        }
        if (message.length > 4000) {
          return res.status(400).json({ error: "message is too long" });
        }

        const [interview] = await db
          .select()
          .from(roleMapInterviews)
          .where(
            and(
              eq(roleMapInterviews.id, req.params.id),
              eq(roleMapInterviews.userId, userId),
            ),
          )
          .limit(1);
        if (!interview || interview.status !== "active") {
          return res.status(404).json({ error: "Interview not found" });
        }

        const messages = sanitizeMessages(interview.messages);
        messages.push({ role: "user", content: message });

        let reply = "";
        let ready = false;
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: INTERVIEWER_SYSTEM_PROMPT },
              ...messages.map((m) => ({
                role: m.role as "assistant" | "user",
                content: m.content,
              })),
            ],
            response_format: { type: "json_object" },
            max_tokens: 400,
          });
          const raw = completion.choices[0]?.message?.content;
          if (raw) {
            const parsed = JSON.parse(raw) as { reply?: string; ready?: boolean };
            reply = String(parsed.reply ?? "").trim();
            ready = Boolean(parsed.ready);
          }
        } catch (aiErr) {
          console.error("Role map interview AI error:", aiErr);
        }
        if (!reply) {
          return res
            .status(502)
            .json({ error: "DW couldn't respond right now. Try again." });
        }

        messages.push({ role: "assistant", content: reply });
        await db
          .update(roleMapInterviews)
          .set({ messages, updatedAt: new Date() })
          .where(eq(roleMapInterviews.id, interview.id));

        const answers = userAnswerCount(messages);
        res.json({
          reply,
          answerCount: answers,
          canSynthesize: ready || answers >= MIN_ANSWERS_TO_SYNTHESIZE,
          readySuggested: ready,
        });
      } catch (error) {
        console.error("Interview message error:", error);
        res.status(500).json({ error: "Failed to process message" });
      }
    },
  );

  // Abandon an active interview.
  app.post(
    "/api/role-maps/interview/:id/abandon",
    requireAuth,
    async (req, res) => {
      try {
        const [interview] = await db
          .select()
          .from(roleMapInterviews)
          .where(
            and(
              eq(roleMapInterviews.id, req.params.id),
              eq(roleMapInterviews.userId, req.session.userId!),
            ),
          )
          .limit(1);
        if (!interview) {
          return res.status(404).json({ error: "Interview not found" });
        }
        await db
          .update(roleMapInterviews)
          .set({ status: "abandoned", updatedAt: new Date() })
          .where(eq(roleMapInterviews.id, interview.id));
        res.json({ success: true });
      } catch (error) {
        console.error("Abandon interview error:", error);
        res.status(500).json({ error: "Failed to abandon interview" });
      }
    },
  );

  // Synthesize the interview into a draft Role Map.
  app.post(
    "/api/role-maps/interview/:id/synthesize",
    requireAuth,
    dwProcessLimiter,
    async (req, res) => {
      try {
        const userId = req.session.userId!;
        const [interview] = await db
          .select()
          .from(roleMapInterviews)
          .where(
            and(
              eq(roleMapInterviews.id, req.params.id),
              eq(roleMapInterviews.userId, userId),
            ),
          )
          .limit(1);
        if (!interview || interview.status !== "active") {
          return res.status(404).json({ error: "Interview not found" });
        }

        const messages = sanitizeMessages(interview.messages);
        if (userAnswerCount(messages) < MIN_ANSWERS_TO_SYNTHESIZE) {
          return res.status(400).json({
            error: "Answer a few more questions first so DW has enough to map.",
          });
        }

        const transcript = messages
          .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content}`)
          .join("\n");

        let parsed: unknown = null;
        try {
          const completion = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
              { role: "system", content: SYNTHESIS_SYSTEM_PROMPT },
              { role: "user", content: `Interview transcript:\n${transcript}` },
            ],
            response_format: { type: "json_object" },
            max_tokens: 2500,
          });
          const raw = completion.choices[0]?.message?.content;
          if (raw) parsed = JSON.parse(raw);
        } catch (aiErr) {
          console.error("Role map synthesis AI error:", aiErr);
        }

        const synthesisSchema = z.object({
          targetRole: z.string().min(1).max(120),
          identityStatement: z.string().max(500).optional().nullable(),
          gapSummary: z.string().max(1000).optional().nullable(),
          currentLevel: z.number().int().min(1).max(20).default(1),
          levels: z.array(levelSchema).min(2).max(10),
        });
        const result = synthesisSchema.safeParse(parsed);
        if (!result.success) {
          console.error("Role map synthesis validation failed:", result.error.issues.slice(0, 3));
          return res.status(502).json({
            error: "DW couldn't build the map from this conversation. Try again.",
          });
        }
        const synth = result.data;
        const maxLevel = Math.max(...synth.levels.map((l) => l.level));
        const currentLevel = Math.min(Math.max(synth.currentLevel, 1), maxLevel);

        const [map] = await db
          .insert(roleMaps)
          .values({
            userId,
            targetRole: synth.targetRole,
            identityStatement: synth.identityStatement ?? null,
            gapSummary: synth.gapSummary ?? null,
            currentLevel,
            status: "draft",
            levels: synth.levels as RoleMapLevel[],
          })
          .returning();

        await db
          .update(roleMapInterviews)
          .set({ status: "completed", roleMapId: map.id, updatedAt: new Date() })
          .where(eq(roleMapInterviews.id, interview.id));

        res.json({ roleMap: map });
      } catch (error) {
        console.error("Synthesize role map error:", error);
        res.status(500).json({ error: "Failed to build role map" });
      }
    },
  );

  // Update a role map (accept, edit, change level, archive).
  app.patch("/api/role-maps/:id", requireAuth, async (req, res) => {
    try {
      const existing = await getOwnedRoleMap(req.params.id, req.session.userId!);
      if (!existing) return res.status(404).json({ error: "Role map not found" });

      const patch = updateRoleMapSchema.parse(req.body);

      // Keep currentLevel on the ladder: bound it by the (possibly patched)
      // levels array so the "current level" always refers to a real rung.
      const effectiveLevels = (patch.levels ??
        (existing.levels as RoleMapLevel[]) ??
        []) as RoleMapLevel[];
      if (effectiveLevels.length) {
        const maxLevel = Math.max(...effectiveLevels.map((l) => l.level));
        const requested = patch.currentLevel ?? existing.currentLevel;
        patch.currentLevel = Math.min(Math.max(requested, 1), maxLevel);
      }

      // Activating a map archives any other active maps (one active map at a
      // time). Run atomically — a DB partial unique index backs the invariant.
      const updated = await db.transaction(async (tx) => {
        if (patch.status === "active") {
          await tx
            .update(roleMaps)
            .set({ status: "archived", updatedAt: new Date() })
            .where(
              and(
                eq(roleMaps.userId, req.session.userId!),
                eq(roleMaps.status, "active"),
              ),
            );
        }
        const [row] = await tx
          .update(roleMaps)
          .set({ ...patch, updatedAt: new Date() })
          .where(eq(roleMaps.id, existing.id))
          .returning();
        return row;
      });
      res.json(updated);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Update role map error:", error);
      res.status(500).json({ error: "Failed to update role map" });
    }
  });

  // Delete a role map.
  app.delete("/api/role-maps/:id", requireAuth, async (req, res) => {
    try {
      const existing = await getOwnedRoleMap(req.params.id, req.session.userId!);
      if (!existing) return res.status(404).json({ error: "Role map not found" });
      await db.delete(roleMaps).where(eq(roleMaps.id, existing.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete role map error:", error);
      res.status(500).json({ error: "Failed to delete role map" });
    }
  });

  // Adopt a map item as a trackable goal or habit.
  app.post("/api/role-maps/:id/adopt", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const map = await getOwnedRoleMap(req.params.id, userId);
      if (!map) return res.status(404).json({ error: "Role map not found" });

      const adoptSchema = z.object({
        kind: z.enum(["goal", "habit"]),
        title: z.string().min(1).max(200),
        description: z.string().max(1000).optional(),
      });
      const { kind, title, description } = adoptSchema.parse(req.body);
      const explainWhy = `From your Role Map toward "${map.targetRole}"`;

      if (kind === "goal") {
        const goal = await storage.createGoal({
          userId,
          title: title.trim(),
          description: description ?? explainWhy,
          wellnessDimension: "general",
          isActive: true,
          dataSource: "role_map",
          explainWhy,
        });
        return res.json({ created: "goal", item: goal });
      }
      const habit = await storage.createHabit({
        userId,
        title: title.trim(),
        description: description ?? explainWhy,
        frequency: "daily",
        isActive: true,
        dataSource: "role_map",
        explainWhy,
      });
      res.json({ created: "habit", item: habit });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Adopt role map item error:", error);
      res.status(500).json({ error: "Failed to add item" });
    }
  });
}
