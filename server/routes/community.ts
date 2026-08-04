import type { Express, Request, Response } from "express";
import { and, desc, eq, inArray, lt, notInArray, sql as dsql } from "drizzle-orm";
import { z } from "zod";
import rateLimit from "express-rate-limit";

import { db } from "../db";
import { storage } from "../storage";
import { requireAuth, requirePaidOrQuota } from "./_shared";
import {
  communityBlocks,
  communityBoards,
  communityPosts,
  communityProfiles,
  communityReactions,
  communityReplies,
  communityReports,
  roleMaps,
  type CommunityProfile,
} from "@shared/schema";

// ─── Rate limits ─────────────────────────────────────────────────────────────

const communityWriteLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "You're posting fast — take a breath and try again in a minute." },
});

// ─── Validation ──────────────────────────────────────────────────────────────

const profileSchema = z
  .object({
    displayName: z.string().trim().min(2).max(40),
    avatarEmoji: z.string().trim().min(1).max(8).optional(),
    bio: z.string().trim().max(280).nullable().optional(),
    shareRoleMapLevel: z.boolean().optional(),
  })
  .strict();

const postSchema = z
  .object({
    title: z.string().trim().min(3).max(160),
    body: z.string().trim().min(1).max(5000),
  })
  .strict();

const replySchema = z
  .object({
    body: z.string().trim().min(1).max(3000),
    parentReplyId: z.string().max(64).optional(),
  })
  .strict();

const REACTION_KINDS = ["encourage", "celebrate", "insight"] as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getProfile(userId: string): Promise<CommunityProfile | null> {
  const [row] = await db
    .select()
    .from(communityProfiles)
    .where(eq(communityProfiles.userId, userId))
    .limit(1);
  return row ?? null;
}

async function getBlockedUserIds(userId: string): Promise<string[]> {
  const rows = await db
    .select({ blockedUserId: communityBlocks.blockedUserId })
    .from(communityBlocks)
    .where(eq(communityBlocks.blockerId, userId));
  return rows.map((r) => r.blockedUserId);
}

interface PublicAuthor {
  userId: string;
  displayName: string;
  avatarEmoji: string;
  roleMapBadge: string | null;
}

/**
 * Build a userId → public author map for the given user ids. Users without a
 * community profile show as "Member" (can happen for admin-authored content
 * or legacy rows); role-map badges only appear when the author opted in.
 */
async function getAuthorMap(userIds: string[]): Promise<Map<string, PublicAuthor>> {
  const map = new Map<string, PublicAuthor>();
  const unique = Array.from(new Set(userIds));
  if (!unique.length) return map;

  const profiles = await db
    .select()
    .from(communityProfiles)
    .where(inArray(communityProfiles.userId, unique));

  const sharers = profiles.filter((p) => p.shareRoleMapLevel).map((p) => p.userId);
  const badges = new Map<string, string>();
  if (sharers.length) {
    const maps = await db
      .select({
        userId: roleMaps.userId,
        targetRole: roleMaps.targetRole,
        currentLevel: roleMaps.currentLevel,
      })
      .from(roleMaps)
      .where(and(inArray(roleMaps.userId, sharers), eq(roleMaps.status, "active")));
    for (const m of maps) {
      badges.set(m.userId, `Lv ${m.currentLevel} · ${m.targetRole}`);
    }
  }

  for (const uid of unique) {
    const p = profiles.find((x) => x.userId === uid);
    map.set(uid, {
      userId: uid,
      displayName: p?.displayName ?? "Member",
      avatarEmoji: p?.avatarEmoji ?? "👤",
      roleMapBadge: p ? (badges.get(uid) ?? null) : null,
    });
  }
  return map;
}

/**
 * Middleware: require an opt-in community profile before any write.
 * Runs BEFORE the quota meter so a rejected attempt doesn't burn free-tier quota.
 */
async function requireProfileMw(
  req: Request,
  res: Response,
  next: () => void,
): Promise<void> {
  try {
    const profile = await getProfile(req.session.userId!);
    if (!profile) {
      res.status(403).json({
        error: "profile_required",
        message: "Set up your community profile before posting.",
      });
      return;
    }
    next();
  } catch (error) {
    console.error("Community profile check error:", error);
    res.status(500).json({ error: "Failed to verify community profile" });
  }
}

async function isAdmin(userId: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  return user?.role === "admin";
}

// ─── Routes ──────────────────────────────────────────────────────────────────

export function registerCommunityRoutes(app: Express): void {
  // ── Profile ────────────────────────────────────────────────────────────────

  app.get("/api/community/profile", requireAuth, async (req, res) => {
    try {
      const profile = await getProfile(req.session.userId!);
      res.json({ profile });
    } catch (error) {
      console.error("Get community profile error:", error);
      res.status(500).json({ error: "Failed to load profile" });
    }
  });

  app.put("/api/community/profile", requireAuth, async (req, res) => {
    try {
      const data = profileSchema.parse(req.body);
      const userId = req.session.userId!;
      const existing = await getProfile(userId);
      let profile: CommunityProfile;
      if (existing) {
        [profile] = await db
          .update(communityProfiles)
          .set({ ...data, updatedAt: new Date() })
          .where(eq(communityProfiles.userId, userId))
          .returning();
      } else {
        [profile] = await db
          .insert(communityProfiles)
          .values({ userId, ...data })
          .returning();
      }
      res.json({ profile });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
      }
      console.error("Save community profile error:", error);
      res.status(500).json({ error: "Failed to save profile" });
    }
  });

  // Leave the community: delete profile (posts remain, shown as "Member").
  app.delete("/api/community/profile", requireAuth, async (req, res) => {
    try {
      await db
        .delete(communityProfiles)
        .where(eq(communityProfiles.userId, req.session.userId!));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete community profile error:", error);
      res.status(500).json({ error: "Failed to delete profile" });
    }
  });

  // ── Boards ─────────────────────────────────────────────────────────────────

  app.get("/api/community/boards", requireAuth, async (_req, res) => {
    try {
      const boards = await db
        .select({
          id: communityBoards.id,
          slug: communityBoards.slug,
          name: communityBoards.name,
          description: communityBoards.description,
          icon: communityBoards.icon,
          dimension: communityBoards.dimension,
          sortOrder: communityBoards.sortOrder,
          postCount: dsql<number>`(
            SELECT count(*)::int FROM community_posts p
            WHERE p.board_id = ${communityBoards.id} AND p.status = 'visible'
          )`,
        })
        .from(communityBoards)
        .orderBy(communityBoards.sortOrder);
      res.json(boards);
    } catch (error) {
      console.error("List boards error:", error);
      res.status(500).json({ error: "Failed to load boards" });
    }
  });

  // ── Posts ──────────────────────────────────────────────────────────────────

  // List posts in a board (cursor pagination on lastActivityAt).
  app.get("/api/community/boards/:slug/posts", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [board] = await db
        .select()
        .from(communityBoards)
        .where(eq(communityBoards.slug, req.params.slug))
        .limit(1);
      if (!board) return res.status(404).json({ error: "Board not found" });

      const limit = Math.min(Math.max(Number(req.query.limit) || 20, 1), 50);
      const blocked = await getBlockedUserIds(userId);

      const conds = [
        eq(communityPosts.boardId, board.id),
        eq(communityPosts.status, "visible"),
      ];
      if (blocked.length) conds.push(notInArray(communityPosts.userId, blocked));

      // Cursor is "<ISO lastActivityAt>|<id>" so rows sharing a timestamp
      // can't be skipped or duplicated across pages.
      if (typeof req.query.cursor === "string" && req.query.cursor) {
        const [tsRaw, cursorId] = req.query.cursor.split("|");
        const ts = new Date(tsRaw);
        if (!Number.isNaN(ts.valueOf())) {
          conds.push(
            cursorId
              ? dsql`(${communityPosts.lastActivityAt}, ${communityPosts.id}) < (${ts}, ${cursorId})`
              : lt(communityPosts.lastActivityAt, ts),
          );
        }
      }

      const rows = await db
        .select()
        .from(communityPosts)
        .where(and(...conds))
        .orderBy(desc(communityPosts.lastActivityAt), desc(communityPosts.id))
        .limit(limit + 1);

      const hasMore = rows.length > limit;
      const page = rows.slice(0, limit);
      const authors = await getAuthorMap(page.map((p) => p.userId));

      res.json({
        board,
        posts: page.map((p) => ({
          id: p.id,
          title: p.title,
          body: p.body.slice(0, 300),
          replyCount: p.replyCount,
          reactionCount: p.reactionCount,
          createdAt: p.createdAt,
          lastActivityAt: p.lastActivityAt,
          isMine: p.userId === userId,
          author: authors.get(p.userId),
        })),
        nextCursor: hasMore
          ? `${page[page.length - 1]!.lastActivityAt?.toISOString()}|${page[page.length - 1]!.id}`
          : null,
      });
    } catch (error) {
      console.error("List posts error:", error);
      res.status(500).json({ error: "Failed to load posts" });
    }
  });

  // Create a post. Requires a community profile; free tier is metered.
  app.post(
    "/api/community/boards/:slug/posts",
    requireAuth,
    communityWriteLimiter,
    requireProfileMw,
    requirePaidOrQuota("community"),
    async (req, res) => {
      try {
        const [board] = await db
          .select()
          .from(communityBoards)
          .where(eq(communityBoards.slug, req.params.slug))
          .limit(1);
        if (!board) return res.status(404).json({ error: "Board not found" });

        const data = postSchema.parse(req.body);
        const [post] = await db
          .insert(communityPosts)
          .values({ boardId: board.id, userId: req.session.userId!, ...data })
          .returning();
        res.json({ post });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
        }
        console.error("Create post error:", error);
        res.status(500).json({ error: "Failed to create post" });
      }
    },
  );

  // Post detail with threaded replies.
  app.get("/api/community/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [post] = await db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.id, req.params.id))
        .limit(1);
      if (!post || post.status !== "visible") {
        return res.status(404).json({ error: "Post not found" });
      }
      const blocked = await getBlockedUserIds(userId);
      if (blocked.includes(post.userId)) {
        return res.status(404).json({ error: "Post not found" });
      }

      const replyConds = [
        eq(communityReplies.postId, post.id),
        eq(communityReplies.status, "visible"),
      ];
      if (blocked.length) replyConds.push(notInArray(communityReplies.userId, blocked));
      const replies = await db
        .select()
        .from(communityReplies)
        .where(and(...replyConds))
        .orderBy(communityReplies.createdAt);

      const authors = await getAuthorMap([post.userId, ...replies.map((r) => r.userId)]);

      // The viewer's own reactions on this thread, so the UI can highlight them.
      const targetIds = [post.id, ...replies.map((r) => r.id)];
      const myReactions = await db
        .select()
        .from(communityReactions)
        .where(
          and(
            eq(communityReactions.userId, userId),
            inArray(communityReactions.targetId, targetIds),
          ),
        );

      res.json({
        post: {
          id: post.id,
          boardId: post.boardId,
          title: post.title,
          body: post.body,
          replyCount: post.replyCount,
          reactionCount: post.reactionCount,
          createdAt: post.createdAt,
          isMine: post.userId === userId,
          authorUserId: post.userId,
          author: authors.get(post.userId),
        },
        replies: replies.map((r) => ({
          id: r.id,
          parentReplyId: r.parentReplyId,
          body: r.body,
          reactionCount: r.reactionCount,
          createdAt: r.createdAt,
          isMine: r.userId === userId,
          authorUserId: r.userId,
          author: authors.get(r.userId),
        })),
        myReactions: myReactions.map((r) => ({
          targetType: r.targetType,
          targetId: r.targetId,
          kind: r.kind,
        })),
      });
    } catch (error) {
      console.error("Get post error:", error);
      res.status(500).json({ error: "Failed to load post" });
    }
  });

  // Reply to a post (optionally nested under a top-level reply).
  app.post(
    "/api/community/posts/:id/replies",
    requireAuth,
    communityWriteLimiter,
    requireProfileMw,
    requirePaidOrQuota("community"),
    async (req, res) => {
      try {
        const [post] = await db
          .select()
          .from(communityPosts)
          .where(eq(communityPosts.id, req.params.id))
          .limit(1);
        if (!post || post.status !== "visible") {
          return res.status(404).json({ error: "Post not found" });
        }

        const data = replySchema.parse(req.body);
        let parentReplyId: string | null = null;
        if (data.parentReplyId) {
          const [parent] = await db
            .select()
            .from(communityReplies)
            .where(eq(communityReplies.id, data.parentReplyId))
            .limit(1);
          if (!parent || parent.postId !== post.id) {
            return res.status(400).json({ error: "Invalid parent reply" });
          }
          // Keep threads one level deep: nest under the top-level reply.
          parentReplyId = parent.parentReplyId ?? parent.id;
        }

        const reply = await db.transaction(async (tx) => {
          const [row] = await tx
            .insert(communityReplies)
            .values({
              postId: post.id,
              userId: req.session.userId!,
              parentReplyId,
              body: data.body,
            })
            .returning();
          await tx
            .update(communityPosts)
            .set({
              replyCount: dsql`${communityPosts.replyCount} + 1`,
              lastActivityAt: new Date(),
            })
            .where(eq(communityPosts.id, post.id));
          return row;
        });
        res.json({ reply });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
        }
        console.error("Create reply error:", error);
        res.status(500).json({ error: "Failed to reply" });
      }
    },
  );

  // Delete (soft-remove) a post — author or admin.
  app.delete("/api/community/posts/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [post] = await db
        .select()
        .from(communityPosts)
        .where(eq(communityPosts.id, req.params.id))
        .limit(1);
      if (!post) return res.status(404).json({ error: "Post not found" });
      if (post.userId !== userId && !(await isAdmin(userId))) {
        return res.status(403).json({ error: "Not allowed" });
      }
      await db
        .update(communityPosts)
        .set({ status: "removed", updatedAt: new Date() })
        .where(eq(communityPosts.id, post.id));
      res.json({ success: true });
    } catch (error) {
      console.error("Delete post error:", error);
      res.status(500).json({ error: "Failed to delete post" });
    }
  });

  // Delete (soft-remove) a reply — author or admin.
  app.delete("/api/community/replies/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [reply] = await db
        .select()
        .from(communityReplies)
        .where(eq(communityReplies.id, req.params.id))
        .limit(1);
      if (!reply) return res.status(404).json({ error: "Reply not found" });
      if (reply.userId !== userId && !(await isAdmin(userId))) {
        return res.status(403).json({ error: "Not allowed" });
      }
      await db.transaction(async (tx) => {
        // Only decrement the post's reply count when this call actually
        // transitions the reply from visible -> removed (idempotent deletes).
        const removed = await tx
          .update(communityReplies)
          .set({ status: "removed" })
          .where(and(eq(communityReplies.id, reply.id), eq(communityReplies.status, "visible")))
          .returning({ id: communityReplies.id });
        if (removed.length) {
          await tx
            .update(communityPosts)
            .set({ replyCount: dsql`GREATEST(${communityPosts.replyCount} - 1, 0)` })
            .where(eq(communityPosts.id, reply.postId));
        }
      });
      res.json({ success: true });
    } catch (error) {
      console.error("Delete reply error:", error);
      res.status(500).json({ error: "Failed to delete reply" });
    }
  });

  // ── Reactions ──────────────────────────────────────────────────────────────

  // Toggle a reaction on a post or reply.
  app.post(
    "/api/community/reactions/toggle",
    requireAuth,
    communityWriteLimiter,
    async (req, res) => {
      try {
        const schema = z
          .object({
            targetType: z.enum(["post", "reply"]),
            targetId: z.string().min(1).max(64),
            kind: z.enum(REACTION_KINDS).default("encourage"),
          })
          .strict();
        const { targetType, targetId, kind } = schema.parse(req.body);
        const userId = req.session.userId!;

        // Verify the target exists and is visible.
        if (targetType === "post") {
          const [p] = await db
            .select({ id: communityPosts.id, status: communityPosts.status })
            .from(communityPosts)
            .where(eq(communityPosts.id, targetId))
            .limit(1);
          if (!p || p.status !== "visible") return res.status(404).json({ error: "Not found" });
        } else {
          const [r] = await db
            .select({ id: communityReplies.id, status: communityReplies.status })
            .from(communityReplies)
            .where(eq(communityReplies.id, targetId))
            .limit(1);
          if (!r || r.status !== "visible") return res.status(404).json({ error: "Not found" });
        }

        // Toggle atomically: derive the count delta from the rows actually
        // changed inside the transaction so concurrent toggles can't inflate
        // or deflate the cached counter.
        const reacted = await db.transaction(async (tx) => {
          const matcher = and(
            eq(communityReactions.userId, userId),
            eq(communityReactions.targetType, targetType),
            eq(communityReactions.targetId, targetId),
            eq(communityReactions.kind, kind),
          );
          const deleted = await tx
            .delete(communityReactions)
            .where(matcher)
            .returning({ id: communityReactions.id });

          let delta: number;
          let nowReacted: boolean;
          if (deleted.length) {
            delta = -1;
            nowReacted = false;
          } else {
            const inserted = await tx
              .insert(communityReactions)
              .values({ userId, targetType, targetId, kind })
              .onConflictDoNothing()
              .returning({ id: communityReactions.id });
            delta = inserted.length ? 1 : 0;
            nowReacted = true;
          }

          if (delta !== 0) {
            if (targetType === "post") {
              await tx
                .update(communityPosts)
                .set({ reactionCount: dsql`GREATEST(${communityPosts.reactionCount} + ${delta}, 0)` })
                .where(eq(communityPosts.id, targetId));
            } else {
              await tx
                .update(communityReplies)
                .set({ reactionCount: dsql`GREATEST(${communityReplies.reactionCount} + ${delta}, 0)` })
                .where(eq(communityReplies.id, targetId));
            }
          }
          return nowReacted;
        });
        res.json({ reacted, kind });
      } catch (error) {
        if (error instanceof z.ZodError) {
          return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
        }
        console.error("Toggle reaction error:", error);
        res.status(500).json({ error: "Failed to react" });
      }
    },
  );

  // ── Safety: report + block ─────────────────────────────────────────────────

  app.post("/api/community/reports", requireAuth, communityWriteLimiter, async (req, res) => {
    try {
      const schema = z
        .object({
          targetType: z.enum(["post", "reply"]),
          targetId: z.string().min(1).max(64),
          reason: z.string().trim().max(500).optional(),
        })
        .strict();
      const data = schema.parse(req.body);
      await db.insert(communityReports).values({
        reporterId: req.session.userId!,
        targetType: data.targetType,
        targetId: data.targetId,
        reason: data.reason ?? null,
      });
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
      }
      console.error("Report error:", error);
      res.status(500).json({ error: "Failed to report" });
    }
  });

  app.post("/api/community/blocks", requireAuth, communityWriteLimiter, async (req, res) => {
    try {
      const schema = z.object({ blockedUserId: z.string().min(1).max(64) }).strict();
      const { blockedUserId } = schema.parse(req.body);
      const userId = req.session.userId!;
      if (blockedUserId === userId) {
        return res.status(400).json({ error: "You can't block yourself" });
      }
      await db
        .insert(communityBlocks)
        .values({ blockerId: userId, blockedUserId })
        .onConflictDoNothing();
      res.json({ success: true });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message ?? "Invalid input" });
      }
      console.error("Block error:", error);
      res.status(500).json({ error: "Failed to block user" });
    }
  });

  app.delete("/api/community/blocks/:blockedUserId", requireAuth, async (req, res) => {
    try {
      await db
        .delete(communityBlocks)
        .where(
          and(
            eq(communityBlocks.blockerId, req.session.userId!),
            eq(communityBlocks.blockedUserId, req.params.blockedUserId),
          ),
        );
      res.json({ success: true });
    } catch (error) {
      console.error("Unblock error:", error);
      res.status(500).json({ error: "Failed to unblock user" });
    }
  });

  // Admin: open reports queue with target snippets.
  app.get("/api/community/reports", requireAuth, async (req, res) => {
    try {
      if (!(await isAdmin(req.session.userId!))) {
        return res.status(403).json({ error: "Not authorized" });
      }
      const reports = await db
        .select()
        .from(communityReports)
        .where(eq(communityReports.status, "open"))
        .orderBy(desc(communityReports.createdAt))
        .limit(100);
      res.json({ reports });
    } catch (error) {
      console.error("List reports error:", error);
      res.status(500).json({ error: "Failed to load reports" });
    }
  });
}
