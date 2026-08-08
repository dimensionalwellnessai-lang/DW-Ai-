/**
 * Integration test: a finisher can never earn the same group-challenge
 * completion badge twice.
 *
 * Runs against the real dev database (DATABASE_URL) because the guarantees
 * under test are concurrency + persistence-level:
 *   1. Two simultaneous check-ins that both cross the completion threshold
 *      produce exactly ONE completedAt transition (`completedNow: true` on
 *      exactly one response) and exactly ONE achievements row.
 *   2. The partial unique index from migrations/0039 rejects a duplicate
 *      (user, group_challenge, challengeId) achievement no matter which
 *      code path inserts it.
 *
 * All rows are created with unique IDs and cleaned up in afterAll.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";
import { and, eq } from "drizzle-orm";

const shouldRun = !!process.env.DATABASE_URL && !process.env.DATABASE_URL.includes("localhost:5432/test");
const d = shouldRun ? describe : describe.skip;

d("group-challenge completion badge uniqueness", () => {
  let server: Server;
  let baseUrl: string;
  let db: (typeof import("../db"))["db"];
  let pool: (typeof import("../db"))["pool"];
  let schema: typeof import("@shared/schema");

  let userId: string;
  let challengeId: string;

  beforeAll(async () => {
    ({ db, pool } = await import("../db"));
    schema = await import("@shared/schema");

    // Seed: user + published challenge (target 2 check-ins) + participant +
    // no prior check-ins.
    const [user] = await db
      .insert(schema.users)
      .values({ email: `badge-unique-${Date.now()}@test.local`, password: "x" })
      .returning({ id: schema.users.id });
    userId = user.id;

    const now = Date.now();
    const [challenge] = await db
      .insert(schema.groupChallenges)
      .values({
        title: "Badge Unique Test Challenge",
        month: new Date().toISOString().slice(0, 7),
        status: "published",
        startDate: new Date(now - 7 * 86400_000),
        endDate: new Date(now + 7 * 86400_000),
        targetCheckins: 2,
        activities: [],
      })
      .returning({ id: schema.groupChallenges.id });
    challengeId = challenge.id;

    await db
      .insert(schema.groupChallengeParticipants)
      .values({ challengeId, userId });

    const { registerGroupChallengeRoutes } = await import(
      "../routes/group-challenges"
    );
    const app = express();
    app.use(express.json());
    // Fake session so requireAuth passes for our seeded user.
    app.use((req, _res, next) => {
      (req as any).session = { userId };
      next();
    });
    registerGroupChallengeRoutes(app);
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => resolve());
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterAll(async () => {
    if (server) await new Promise<void>((r) => server.close(() => r()));
    if (db && userId) {
      await db.delete(schema.achievements).where(eq(schema.achievements.userId, userId));
      await db
        .delete(schema.groupChallengeCheckins)
        .where(eq(schema.groupChallengeCheckins.userId, userId));
      await db
        .delete(schema.groupChallengeParticipants)
        .where(eq(schema.groupChallengeParticipants.userId, userId));
      if (challengeId) {
        await db
          .delete(schema.groupChallenges)
          .where(eq(schema.groupChallenges.id, challengeId));
      }
      await db.delete(schema.users).where(eq(schema.users.id, userId));
    }
    await pool?.end();
  });

  it("two simultaneous threshold check-ins → one completedAt flip, one badge", async () => {
    // Fire two concurrent check-ins for distinct days; each on its own pushes
    // distinct-day count to the target of 2, so both race the completion path.
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400_000).toISOString().slice(0, 10);

    const [resA, resB] = await Promise.all(
      [today, yesterday].map((dateKey) =>
        fetch(`${baseUrl}/api/group-challenges/${challengeId}/checkin`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dateKey }),
        }),
      ),
    );
    expect(resA.status).toBe(200);
    expect(resB.status).toBe(200);
    const bodies = [await resA.json(), await resB.json()];
    expect(bodies.every((b) => b.checkedIn)).toBe(true);

    // Exactly one request wins the completedAt transition.
    const completedNowCount = bodies.filter((b) => b.completedNow).length;
    expect(completedNowCount).toBe(1);

    // Exactly one participant row, completed once.
    const participants = await db
      .select()
      .from(schema.groupChallengeParticipants)
      .where(
        and(
          eq(schema.groupChallengeParticipants.challengeId, challengeId),
          eq(schema.groupChallengeParticipants.userId, userId),
        ),
      );
    expect(participants).toHaveLength(1);
    expect(participants[0].completedAt).not.toBeNull();

    // Exactly one achievement row.
    const badges = await db
      .select()
      .from(schema.achievements)
      .where(
        and(
          eq(schema.achievements.userId, userId),
          eq(schema.achievements.achievementType, "group_challenge"),
        ),
      );
    const forThisChallenge = badges.filter(
      (b) => (b.metadata as any)?.challengeId === challengeId,
    );
    expect(forThisChallenge).toHaveLength(1);
  });

  it("DB unique index rejects a duplicate badge from any code path", async () => {
    // Bypass the route entirely: a raw duplicate insert must violate the
    // partial unique index (or be a no-op with onConflictDoNothing).
    let thrown: unknown;
    try {
      await db.insert(schema.achievements).values({
        userId,
        achievementType: "group_challenge",
        title: "Duplicate Badge Attempt",
        metadata: { challengeId },
      });
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeDefined();
    // Drizzle wraps the pg error; the unique-violation detail is on `cause`.
    const cause = (thrown as { cause?: { code?: string; constraint?: string } })
      .cause;
    expect(cause?.code).toBe("23505");
    expect(cause?.constraint).toBe("achievements_group_challenge_unique_idx");

    const inserted = await db
      .insert(schema.achievements)
      .values({
        userId,
        achievementType: "group_challenge",
        title: "Duplicate Badge Attempt",
        metadata: { challengeId },
      })
      .onConflictDoNothing()
      .returning({ id: schema.achievements.id });
    expect(inserted).toHaveLength(0);
  });
});
