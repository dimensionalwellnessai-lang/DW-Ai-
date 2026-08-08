import type { Express } from "express";
import { and, desc, eq, gte, inArray, isNull, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import rateLimit from "express-rate-limit";

import { db } from "../db";
import { requireAuth, requireAdmin } from "./_shared";
import { openai } from "../openai";
import {
  achievements,
  communityBoards,
  communityPosts,
  communityProfiles,
  groupChallengeCheckins,
  groupChallengeParticipants,
  groupChallenges,
  roleMaps,
  type GroupChallengeActivity,
} from "@shared/schema";

const challengeWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Slow down a moment and try again." },
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function monthKey(d = new Date()): string {
  return d.toISOString().slice(0, 7);
}

/**
 * The check-in day, honoring the client's local calendar via an optional
 * IANA-agnostic "dateKey" the client sends (validated to YYYY-MM-DD and to be
 * within ±1 day of server UTC so a client can't backfill a whole month).
 */
function resolveDateKey(raw: unknown): string | null {
  const todayUtc = new Date().toISOString().slice(0, 10);
  if (typeof raw !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return todayUtc;
  const diff = Math.abs(new Date(raw).getTime() - new Date(todayUtc).getTime());
  if (Number.isNaN(diff) || diff > 36 * 3600 * 1000) return null;
  return raw;
}

async function getCohortStats(challengeId: string) {
  const [row] = await db
    .select({
      participants: dsql<number>`count(*)::int`,
      completed: dsql<number>`count(*) FILTER (WHERE completed_at IS NOT NULL)::int`,
    })
    .from(groupChallengeParticipants)
    .where(
      and(
        eq(groupChallengeParticipants.challengeId, challengeId),
        isNull(groupChallengeParticipants.leftAt),
      ),
    );
  const [checkinRow] = await db
    .select({
      totalCheckins: dsql<number>`count(*)::int`,
      checkinsToday: dsql<number>`count(*) FILTER (WHERE date_key = ${new Date().toISOString().slice(0, 10)})::int`,
    })
    .from(groupChallengeCheckins)
    .where(eq(groupChallengeCheckins.challengeId, challengeId));
  const participants = row?.participants ?? 0;
  const completed = row?.completed ?? 0;
  return {
    participants,
    completed,
    completionRate: participants ? Math.round((completed / participants) * 100) : 0,
    totalCheckins: checkinRow?.totalCheckins ?? 0,
    checkinsToday: checkinRow?.checkinsToday ?? 0,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerGroupChallengeRoutes(app: Express): void {
  // Hub: current month's published challenges + upcoming ones, with the
  // viewer's participation status.
  app.get("/api/group-challenges", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const nowMonth = monthKey();
      const challenges = await db
        .select()
        .from(groupChallenges)
        .where(and(eq(groupChallenges.status, "published"), gte(groupChallenges.month, nowMonth)))
        .orderBy(groupChallenges.month, desc(groupChallenges.createdAt));

      const mine = challenges.length
        ? await db
            .select()
            .from(groupChallengeParticipants)
            .where(
              and(
                eq(groupChallengeParticipants.userId, userId),
                inArray(
                  groupChallengeParticipants.challengeId,
                  challenges.map((c) => c.id),
                ),
                isNull(groupChallengeParticipants.leftAt),
              ),
            )
        : [];

      const withStats = await Promise.all(
        challenges.map(async (c) => {
          const stats = await getCohortStats(c.id);
          const participation = mine.find((m) => m.challengeId === c.id);
          return {
            ...c,
            isCurrent: c.month === nowMonth,
            joined: !!participation,
            completedByMe: !!participation?.completedAt,
            stats,
          };
        }),
      );
      res.json({ challenges: withStats });
    } catch (error) {
      console.error("List group challenges error:", error);
      res.status(500).json({ error: "Failed to load group challenges" });
    }
  });

  // Detail: challenge + cohort members + my check-ins + stats.
  app.get("/api/group-challenges/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [challenge] = await db
        .select()
        .from(groupChallenges)
        .where(eq(groupChallenges.id, req.params.id))
        .limit(1);
      if (!challenge || challenge.status !== "published") {
        return res.status(404).json({ error: "Challenge not found" });
      }

      const participants = await db
        .select({
          userId: groupChallengeParticipants.userId,
          joinedAt: groupChallengeParticipants.joinedAt,
          completedAt: groupChallengeParticipants.completedAt,
        })
        .from(groupChallengeParticipants)
        .where(
          and(
            eq(groupChallengeParticipants.challengeId, challenge.id),
            isNull(groupChallengeParticipants.leftAt),
          ),
        )
        .orderBy(groupChallengeParticipants.joinedAt)
        .limit(200);

      // Public cohort identities come from opt-in community profiles only.
      const profileRows = participants.length
        ? await db
            .select({
              userId: communityProfiles.userId,
              displayName: communityProfiles.displayName,
              avatarEmoji: communityProfiles.avatarEmoji,
            })
            .from(communityProfiles)
            .where(inArray(communityProfiles.userId, participants.map((p) => p.userId)))
        : [];
      const profileMap = new Map(profileRows.map((p) => [p.userId, p]));

      const myCheckins = await db
        .select()
        .from(groupChallengeCheckins)
        .where(
          and(
            eq(groupChallengeCheckins.challengeId, challenge.id),
            eq(groupChallengeCheckins.userId, userId),
          ),
        )
        .orderBy(desc(groupChallengeCheckins.dateKey));

      const me = participants.find((p) => p.userId === userId);
      const stats = await getCohortStats(challenge.id);

      res.json({
        challenge,
        joined: !!me,
        completedByMe: !!me?.completedAt,
        myCheckins: myCheckins.map((c) => ({
          dateKey: c.dateKey,
          activityId: c.activityId,
          note: c.note,
        })),
        cohort: participants.map((p) => {
          const prof = profileMap.get(p.userId);
          return {
            isMe: p.userId === userId,
            displayName: prof?.displayName ?? "Member",
            avatarEmoji: prof?.avatarEmoji ?? "👤",
            completed: !!p.completedAt,
          };
        }),
        stats,
      });
    } catch (error) {
      console.error("Get group challenge error:", error);
      res.status(500).json({ error: "Failed to load challenge" });
    }
  });

  // Join (or rejoin) a challenge cohort.
  app.post("/api/group-challenges/:id/join", requireAuth, challengeWriteLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [challenge] = await db
        .select()
        .from(groupChallenges)
        .where(eq(groupChallenges.id, req.params.id))
        .limit(1);
      if (!challenge || challenge.status !== "published") {
        return res.status(404).json({ error: "Challenge not found" });
      }
      if (challenge.endDate.getTime() < Date.now()) {
        return res.status(400).json({ error: "This challenge has already ended." });
      }

      const [existing] = await db
        .select()
        .from(groupChallengeParticipants)
        .where(
          and(
            eq(groupChallengeParticipants.challengeId, challenge.id),
            eq(groupChallengeParticipants.userId, userId),
          ),
        )
        .limit(1);
      if (existing) {
        if (existing.leftAt) {
          await db
            .update(groupChallengeParticipants)
            .set({ leftAt: null })
            .where(eq(groupChallengeParticipants.id, existing.id));
        }
        return res.json({ joined: true });
      }
      await db
        .insert(groupChallengeParticipants)
        .values({ challengeId: challenge.id, userId })
        .onConflictDoNothing();
      res.json({ joined: true });
    } catch (error) {
      console.error("Join challenge error:", error);
      res.status(500).json({ error: "Failed to join challenge" });
    }
  });

  // Leave a challenge (check-ins are kept; rejoin restores them).
  app.post("/api/group-challenges/:id/leave", requireAuth, challengeWriteLimiter, async (req, res) => {
    try {
      const updated = await db
        .update(groupChallengeParticipants)
        .set({ leftAt: new Date() })
        .where(
          and(
            eq(groupChallengeParticipants.challengeId, req.params.id),
            eq(groupChallengeParticipants.userId, req.session.userId!),
            isNull(groupChallengeParticipants.leftAt),
          ),
        )
        .returning({ id: groupChallengeParticipants.id });
      if (!updated.length) return res.status(404).json({ error: "You're not in this challenge." });
      res.json({ left: true });
    } catch (error) {
      console.error("Leave challenge error:", error);
      res.status(500).json({ error: "Failed to leave challenge" });
    }
  });

  // Daily check-in. One per local day; awards the completion badge when the
  // participant reaches targetCheckins distinct days.
  app.post("/api/group-challenges/:id/checkin", requireAuth, challengeWriteLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const schema = z
        .object({
          dateKey: z.string().optional(),
          activityId: z.string().max(64).optional(),
          note: z.string().trim().max(500).optional(),
        })
        .strict();
      const body = schema.parse(req.body ?? {});

      const [challenge] = await db
        .select()
        .from(groupChallenges)
        .where(eq(groupChallenges.id, req.params.id))
        .limit(1);
      if (!challenge || challenge.status !== "published") {
        return res.status(404).json({ error: "Challenge not found" });
      }

      const [me] = await db
        .select()
        .from(groupChallengeParticipants)
        .where(
          and(
            eq(groupChallengeParticipants.challengeId, challenge.id),
            eq(groupChallengeParticipants.userId, userId),
            isNull(groupChallengeParticipants.leftAt),
          ),
        )
        .limit(1);
      if (!me) return res.status(403).json({ error: "Join the challenge before checking in." });

      const dateKey = resolveDateKey(body.dateKey);
      if (!dateKey) return res.status(400).json({ error: "Invalid check-in date." });
      if (
        dateKey < challenge.startDate.toISOString().slice(0, 10) ||
        dateKey > challenge.endDate.toISOString().slice(0, 10)
      ) {
        return res.status(400).json({ error: "Check-in date is outside the challenge window." });
      }
      if (body.activityId) {
        const activities = (challenge.activities ?? []) as GroupChallengeActivity[];
        if (!activities.some((a) => a.id === body.activityId)) {
          return res.status(400).json({ error: "Unknown activity." });
        }
      }

      const inserted = await db
        .insert(groupChallengeCheckins)
        .values({
          challengeId: challenge.id,
          userId,
          dateKey,
          activityId: body.activityId ?? null,
          note: body.note ?? null,
        })
        .onConflictDoNothing()
        .returning({ id: groupChallengeCheckins.id });
      if (!inserted.length) {
        return res.status(409).json({ error: "already_checked_in", message: "You already checked in for this day." });
      }

      // Count distinct days and award the badge on completion.
      const [countRow] = await db
        .select({ days: dsql<number>`count(distinct date_key)::int` })
        .from(groupChallengeCheckins)
        .where(
          and(
            eq(groupChallengeCheckins.challengeId, challenge.id),
            eq(groupChallengeCheckins.userId, userId),
          ),
        );
      const days = countRow?.days ?? 0;

      // Conditional update guards against concurrent check-ins double-awarding:
      // only the request whose UPDATE actually flips completed_at from NULL
      // wins and creates the achievement row.
      let completedNow = false;
      if (days >= challenge.targetCheckins) {
        const won = await db
          .update(groupChallengeParticipants)
          .set({ completedAt: new Date() })
          .where(
            and(
              eq(groupChallengeParticipants.id, me.id),
              isNull(groupChallengeParticipants.completedAt),
            ),
          )
          .returning({ id: groupChallengeParticipants.id });
        completedNow = won.length > 0;
      }
      if (completedNow) {
        try {
          // Idempotent at the DB level too: a partial unique index on
          // achievements (user, type, metadata->>'challengeId') guarantees at
          // most one completion badge per (user, challenge) even if another
          // code path races us — see migrations/0039.
          await db
            .insert(achievements)
            .values({
              userId,
              achievementType: "group_challenge",
              title: challenge.badgeTitle ?? `${challenge.title} Finisher`,
              description: `Completed the "${challenge.title}" group challenge (${challenge.targetCheckins} check-ins).`,
              metadata: { challengeId: challenge.id, month: challenge.month },
            })
            .onConflictDoNothing();
        } catch (err) {
          console.error("Award challenge badge error:", err);
        }
      }

      res.json({ checkedIn: true, dateKey, totalDays: days, completedNow });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
      }
      console.error("Challenge check-in error:", error);
      res.status(500).json({ error: "Failed to check in" });
    }
  });

  // Create the challenge's community discussion thread if missing. Any
  // participant with a community profile can start it; the thread lives on
  // the "Leveling Up" board.
  app.post("/api/group-challenges/:id/discussion", requireAuth, challengeWriteLimiter, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [challenge] = await db
        .select()
        .from(groupChallenges)
        .where(eq(groupChallenges.id, req.params.id))
        .limit(1);
      if (!challenge || challenge.status !== "published") {
        return res.status(404).json({ error: "Challenge not found" });
      }
      if (challenge.discussionPostId) {
        return res.json({ postId: challenge.discussionPostId });
      }

      const [me] = await db
        .select()
        .from(groupChallengeParticipants)
        .where(
          and(
            eq(groupChallengeParticipants.challengeId, challenge.id),
            eq(groupChallengeParticipants.userId, userId),
            isNull(groupChallengeParticipants.leftAt),
          ),
        )
        .limit(1);
      if (!me) return res.status(403).json({ error: "Join the challenge first." });
      const [profile] = await db
        .select()
        .from(communityProfiles)
        .where(eq(communityProfiles.userId, userId))
        .limit(1);
      if (!profile) {
        return res.status(403).json({
          error: "profile_required",
          message: "Set up your community profile to start the discussion.",
        });
      }

      const [board] = await db
        .select()
        .from(communityBoards)
        .where(eq(communityBoards.slug, "leveling-up"))
        .limit(1);
      if (!board) return res.status(500).json({ error: "Community board missing" });

      const postId = await db.transaction(async (tx) => {
        // Re-check inside the transaction to avoid duplicate threads on a race.
        const [fresh] = await tx
          .select({ discussionPostId: groupChallenges.discussionPostId })
          .from(groupChallenges)
          .where(eq(groupChallenges.id, challenge.id))
          .for("update");
        if (fresh?.discussionPostId) return fresh.discussionPostId;
        const [post] = await tx
          .insert(communityPosts)
          .values({
            boardId: board.id,
            userId,
            title: `${challenge.title} — ${challenge.month} challenge discussion`,
            body:
              `${challenge.theme ?? challenge.title}\n\n` +
              `${challenge.description ?? ""}\n\n` +
              `This is the official discussion thread for the "${challenge.title}" group challenge. Share how it's going, ask questions, and cheer each other on!`,
          })
          .returning({ id: communityPosts.id });
        await tx
          .update(groupChallenges)
          .set({ discussionPostId: post.id })
          .where(eq(groupChallenges.id, challenge.id));
        return post.id;
      });
      res.json({ postId });
    } catch (error) {
      console.error("Create challenge discussion error:", error);
      res.status(500).json({ error: "Failed to start discussion" });
    }
  });

  // ── Admin: monthly rollover ────────────────────────────────────────────────

  const publishSchema = z
    .object({
      title: z.string().trim().min(3).max(120),
      description: z.string().trim().max(2000).optional(),
      theme: z.string().trim().max(160).optional(),
      /** "YYYY-MM"; defaults to next month. */
      month: z.string().regex(/^\d{4}-\d{2}$/).optional(),
      activities: z
        .array(
          z.object({
            id: z.string().min(1).max(40),
            title: z.string().min(1).max(120),
            description: z.string().max(300).optional(),
          }),
        )
        .max(10)
        .default([]),
      targetCheckins: z.number().int().min(1).max(31).default(20),
      badgeTitle: z.string().trim().max(120).optional(),
    })
    .strict();

  // Publish a new monthly challenge (admin).
  app.post("/api/group-challenges", requireAdmin, async (req, res) => {
    try {
      const data = publishSchema.parse(req.body);
      const month =
        data.month ?? monthKey(new Date(new Date().getFullYear(), new Date().getMonth() + 1, 15));
      const [y, m] = month.split("-").map(Number);
      const startDate = new Date(Date.UTC(y, m - 1, 1));
      const endDate = new Date(Date.UTC(y, m, 0, 23, 59, 59));

      const [challenge] = await db
        .insert(groupChallenges)
        .values({
          title: data.title,
          description: data.description ?? null,
          theme: data.theme ?? null,
          month,
          startDate,
          endDate,
          activities: data.activities,
          targetCheckins: data.targetCheckins,
          badgeTitle: data.badgeTitle ?? null,
          createdBy: req.session.userId!,
          status: "published",
        })
        .returning();
      res.json({ challenge });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
      }
      console.error("Publish challenge error:", error);
      res.status(500).json({ error: "Failed to publish challenge" });
    }
  });

  // AI-suggest next month's challenge from common role-map themes (admin).
  app.post("/api/group-challenges/suggest", requireAdmin, async (_req, res) => {
    try {
      const recentRoles = await db
        .select({ targetRole: roleMaps.targetRole })
        .from(roleMaps)
        .where(eq(roleMaps.status, "active"))
        .orderBy(desc(roleMaps.createdAt))
        .limit(50);
      const themes = recentRoles.map((r) => r.targetRole).filter(Boolean);

      const response = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        max_tokens: 600,
        messages: [
          {
            role: "system",
            content:
              "You design monthly group wellness challenges. Given the roles members are leveling up toward, suggest ONE themed month-long challenge. Respond as JSON: {\"title\": string (<=80 chars), \"theme\": string (<=120 chars, like '30 days of X'), \"description\": string (2-3 sentences), \"activities\": [{\"id\": short-slug, \"title\": string, \"description\": string} x3], \"targetCheckins\": int (15-25), \"badgeTitle\": string}.",
          },
          {
            role: "user",
            content: themes.length
              ? `Members are currently leveling up toward these roles: ${themes.slice(0, 30).join(", ")}. Suggest next month's challenge.`
              : "No role data available. Suggest a broadly appealing wellness group challenge for next month.",
          },
        ],
      });
      const suggestion = JSON.parse(response.choices[0]?.message?.content ?? "{}");
      res.json({ suggestion });
    } catch (error) {
      console.error("Suggest challenge error:", error);
      res.status(500).json({ error: "Failed to suggest a challenge" });
    }
  });
}
