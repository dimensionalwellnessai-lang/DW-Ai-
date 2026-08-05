/**
 * Unit tests for the level-up progress model (growth-metrics).
 *
 * The DB layer is mocked along the same lines as mood-insights-scheduler:
 * chained drizzle calls are dispatched by the keys of the `select({...})`
 * projection (`dateKey`, `metricKind`, `count` are each unique to one query),
 * and bare `select()` calls are dispatched by the table passed to `.from()`.
 *
 * Covered:
 *  - habit consistency math + the DISTINCT (habit, day) dedupe guard so
 *    duplicate same-day logs can't inflate the score
 *  - goal progress capped at 100 with custom targetValue
 *  - levelProgressPct at max level and with empty milestones
 *  - challenge check-in same-day dedupe
 *  - buildGrowthReview focus priority order
 *  - snapshot upsert idempotency (stable conflict target, set mirrors values)
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

// ── Per-test mutable state the db mock reads from ──────────────────────────
const fake = vi.hoisted(() => ({
  state: {
    roleMaps: [] as any[],
    habits: [] as any[],
    goals: [] as any[],
    checkins: [] as any[],
    wearables: [] as any[],
    habitLogCount: 0,
  },
  lastCountProjection: null as unknown,
  insertCalls: [] as Array<{ values: any; config: any }>,
}));

vi.mock("../../db", async () => {
  const { getTableName } = await import("drizzle-orm");

  const makeChain = (resolve: () => any[]) => {
    const chain: any = {
      from: () => chain,
      where: () => chain,
      innerJoin: () => chain,
      groupBy: () => chain,
      orderBy: () => chain,
      limit: () => chain,
      then: (onF: any, onR: any) => Promise.resolve(resolve()).then(onF, onR),
    };
    return chain;
  };

  return {
    db: {
      select: (cols?: Record<string, unknown>) => {
        const key = cols ? Object.keys(cols)[0] : "";
        if (key === "dateKey") return makeChain(() => fake.state.checkins);
        if (key === "metricKind") return makeChain(() => fake.state.wearables);
        if (key === "count") {
          fake.lastCountProjection = cols!.count;
          return makeChain(() => [{ count: fake.state.habitLogCount }]);
        }
        // Bare select(): dispatch on the table handed to .from().
        return {
          from: (table: any) => {
            const name = getTableName(table);
            const rows =
              name === "role_maps"
                ? fake.state.roleMaps
                : name === "habits"
                  ? fake.state.habits
                  : name === "goals"
                    ? fake.state.goals
                    : [];
            return makeChain(() => rows);
          },
        };
      },
      insert: () => ({
        values: (values: any) => ({
          onConflictDoUpdate: (config: any) => {
            fake.insertCalls.push({ values, config });
            return Promise.resolve();
          },
        }),
      }),
    },
  };
});

import {
  buildGrowthReview,
  computeGrowthMetrics,
  upsertTodayGrowthSnapshot,
  type GrowthMetrics,
} from "../growth-metrics";
import type { GrowthSnapshot } from "@shared/schema";

beforeEach(() => {
  fake.state.roleMaps = [];
  fake.state.habits = [];
  fake.state.goals = [];
  fake.state.checkins = [];
  fake.state.wearables = [];
  fake.state.habitLogCount = 0;
  fake.lastCountProjection = null;
  fake.insertCalls.length = 0;
});

/** Flatten a drizzle SQL template into plain text for assertions. */
function sqlText(chunk: any): string {
  if (!chunk) return "";
  if (Array.isArray(chunk.value)) return chunk.value.join("");
  if (Array.isArray(chunk.queryChunks)) return chunk.queryChunks.map(sqlText).join(" ");
  return "";
}

const habit = (id: string) => ({ id, userId: "u1", isActive: true });

describe("computeGrowthMetrics — habit consistency", () => {
  it("computes completions over active habits × 7 days", async () => {
    fake.state.habits = [habit("h1"), habit("h2")];
    fake.state.habitLogCount = 5; // deduped (habit, day) completions
    const m = await computeGrowthMetrics("u1");
    expect(m.activeHabitCount).toBe(2);
    expect(m.habitConsistencyPct).toBe(Math.round((5 / 14) * 100)); // 36
  });

  it("guards against duplicate same-day logs via DISTINCT (habit, day) in SQL", async () => {
    fake.state.habits = [habit("h1")];
    fake.state.habitLogCount = 3;
    await computeGrowthMetrics("u1");
    const text = sqlText(fake.lastCountProjection).toLowerCase();
    expect(text).toContain("distinct");
    expect(text).toContain("date_trunc('day'");
  });

  it("caps consistency at 100 even if the count somehow exceeds possible", async () => {
    fake.state.habits = [habit("h1")];
    fake.state.habitLogCount = 999;
    const m = await computeGrowthMetrics("u1");
    expect(m.habitConsistencyPct).toBe(100);
  });

  it("is 0 with no active habits (and never queries logs)", async () => {
    const m = await computeGrowthMetrics("u1");
    expect(m.habitConsistencyPct).toBe(0);
    expect(fake.lastCountProjection).toBeNull();
  });
});

describe("computeGrowthMetrics — goal progress", () => {
  it("caps each goal at 100% with custom targetValue before averaging", async () => {
    fake.state.goals = [
      { id: "g1", progress: 500, targetValue: 200, isActive: true }, // 250% → 100
      { id: "g2", progress: 50, targetValue: null, isActive: true }, // default target 100 → 50
    ];
    const m = await computeGrowthMetrics("u1");
    expect(m.goalProgressAvg).toBe(75);
    expect(m.activeGoalCount).toBe(2);
  });

  it("is 0 with no active goals", async () => {
    const m = await computeGrowthMetrics("u1");
    expect(m.goalProgressAvg).toBe(0);
  });
});

describe("computeGrowthMetrics — role map / levelProgressPct", () => {
  it("falls back to the current level's milestones at max level", async () => {
    fake.state.roleMaps = [
      {
        id: "rm1",
        targetRole: "CTO",
        currentLevel: 3,
        levels: [
          { level: 2, title: "L2", milestones: [{ id: "a", title: "A", done: true }] },
          {
            level: 3,
            title: "L3 (max)",
            milestones: [
              { id: "b", title: "B", done: true },
              { id: "c", title: "C", done: false },
            ],
          },
        ],
      },
    ];
    const m = await computeGrowthMetrics("u1");
    expect(m.roleMap?.maxLevel).toBe(3);
    expect(m.roleMap?.nextLevelTitle).toBe("L3 (max)");
    expect(m.roleMap?.milestonesTotal).toBe(2);
    expect(m.levelProgressPct).toBe(50);
  });

  it("is 0 (not NaN) when the next level has no milestones", async () => {
    fake.state.roleMaps = [
      {
        id: "rm1",
        targetRole: "CTO",
        currentLevel: 1,
        levels: [
          { level: 1, title: "L1", milestones: [] },
          { level: 2, title: "L2", milestones: [] },
        ],
      },
    ];
    const m = await computeGrowthMetrics("u1");
    expect(m.levelProgressPct).toBe(0);
    expect(m.roleMap?.milestonesTotal).toBe(0);
  });

  it("handles an empty levels array without blowing up", async () => {
    fake.state.roleMaps = [
      { id: "rm1", targetRole: "CTO", currentLevel: 1, levels: [] },
    ];
    const m = await computeGrowthMetrics("u1");
    expect(m.levelProgressPct).toBe(0);
    expect(m.roleMap?.maxLevel).toBe(1);
  });

  it("levelProgressPct is 0 with no role map", async () => {
    const m = await computeGrowthMetrics("u1");
    expect(m.roleMap).toBeNull();
    expect(m.levelProgressPct).toBe(0);
  });
});

describe("computeGrowthMetrics — challenge check-ins", () => {
  it("dedupes same-day check-ins across challenges", async () => {
    fake.state.checkins = [
      { dateKey: "2026-08-01" },
      { dateKey: "2026-08-01" },
      { dateKey: "2026-08-02" },
    ];
    const m = await computeGrowthMetrics("u1");
    expect(m.challengeCheckins7d).toBe(2);
  });
});

// ── Snapshot upsert idempotency ─────────────────────────────────────────────

function metrics(overrides: Partial<GrowthMetrics> = {}): GrowthMetrics {
  return {
    roleMap: null,
    levelProgressPct: 0,
    habitConsistencyPct: 0,
    activeHabitCount: 0,
    goalProgressAvg: 0,
    activeGoalCount: 0,
    challengeCheckins7d: 0,
    wearable: null,
    contributions: [],
    ...overrides,
  };
}

describe("upsertTodayGrowthSnapshot", () => {
  it("writes identical rows on repeat calls (idempotent for the same day)", async () => {
    const m = metrics({ levelProgressPct: 40, habitConsistencyPct: 70, goalProgressAvg: 55 });
    await upsertTodayGrowthSnapshot("u1", m);
    await upsertTodayGrowthSnapshot("u1", m);
    expect(fake.insertCalls).toHaveLength(2);
    const [a, b] = fake.insertCalls;
    expect(a.values).toEqual(b.values);
    expect(a.values.dateKey).toBe(new Date().toISOString().slice(0, 10));
    // Conflict target is the (userId, dateKey) pair — repeat writes update in place.
    expect(a.config.target).toHaveLength(2);
    // The update `set` mirrors the inserted metrics exactly, so a conflict
    // can never leave stale numbers behind.
    const { userId, dateKey, ...metricFields } = a.values;
    expect(a.config.set).toEqual(metricFields);
  });
});

// ── buildGrowthReview focus priority ────────────────────────────────────────

function currentWithRoleMap(over: Partial<GrowthMetrics> = {}): GrowthMetrics {
  return metrics({
    roleMap: {
      id: "rm1",
      targetRole: "CTO",
      currentLevel: 1,
      maxLevel: 3,
      nextLevelTitle: "L2",
      currentLevelTitle: "L1",
      milestonesDone: 1,
      milestonesTotal: 3,
      nextMilestones: [
        { id: "a", title: "Ship the thing", done: true },
        { id: "b", title: "Write the doc", done: false },
      ],
      ladder: [],
    },
    levelProgressPct: 33,
    ...over,
  });
}

describe("buildGrowthReview — focus priority order", () => {
  it("low habit consistency beats the next milestone", () => {
    const r = buildGrowthReview(
      "week",
      [],
      currentWithRoleMap({ habitConsistencyPct: 20, activeHabitCount: 2 }),
    );
    expect(r.focus?.title).toBe("Rebuild your daily habit rhythm");
    expect(r.focus?.route).toBe("/life-dashboard");
  });

  it("healthy habits → next undone milestone", () => {
    const r = buildGrowthReview(
      "week",
      [],
      currentWithRoleMap({ habitConsistencyPct: 80, activeHabitCount: 2 }),
    );
    expect(r.focus?.title).toBe('Finish "Write the doc"');
    expect(r.focus?.route).toBe("/role-map");
  });

  it("no role map → create-role-map focus, regardless of other levers", () => {
    const r = buildGrowthReview(
      "week",
      [],
      metrics({ habitConsistencyPct: 10, activeHabitCount: 3, challengeCheckins7d: 0 }),
    );
    expect(r.focus?.title).toBe("Create your role map");
    expect(r.focus?.route).toBe("/role-map");
  });

  it("milestones done → tighten habits when consistency < 60", () => {
    const r = buildGrowthReview(
      "week",
      [],
      currentWithRoleMap({
        levelProgressPct: 100,
        habitConsistencyPct: 50,
        activeHabitCount: 1,
      }),
    );
    expect(r.focus?.title).toBe("Tighten habit consistency");
  });

  it("milestones done + habits fine → challenge check-ins when < 3", () => {
    const r = buildGrowthReview(
      "week",
      [],
      currentWithRoleMap({
        levelProgressPct: 100,
        habitConsistencyPct: 80,
        activeHabitCount: 1,
        challengeCheckins7d: 1,
      }),
    );
    expect(r.focus?.title).toBe("Check in on your group challenge");
  });

  it("everything healthy → no focus", () => {
    const r = buildGrowthReview(
      "week",
      [],
      currentWithRoleMap({
        levelProgressPct: 100,
        habitConsistencyPct: 90,
        activeHabitCount: 1,
        challengeCheckins7d: 5,
      }),
    );
    expect(r.focus).toBeNull();
  });

  it("empty series → null deltas and null from/to", () => {
    const r = buildGrowthReview("month", [], currentWithRoleMap());
    expect(r.deltas).toBeNull();
    expect(r.from).toBeNull();
    expect(r.to).toBeNull();
  });

  it("computes deltas between oldest and newest snapshot", () => {
    const snap = (id: string, dateKey: string, over: Partial<GrowthSnapshot>) =>
      ({
        id,
        dateKey,
        levelProgressPct: 0,
        habitConsistencyPct: 0,
        goalProgressAvg: 0,
        challengeCheckins7d: 0,
        ...over,
      }) as GrowthSnapshot;
    const r = buildGrowthReview(
      "week",
      [
        snap("s1", "2026-07-29", { habitConsistencyPct: 40 }),
        snap("s2", "2026-08-04", { habitConsistencyPct: 60, levelProgressPct: 10 }),
      ],
      currentWithRoleMap(),
    );
    expect(r.deltas).toEqual({
      levelProgressPct: 10,
      habitConsistencyPct: 20,
      goalProgressAvg: 0,
      challengeCheckins7d: 0,
    });
    expect(r.wins).toContain("Habit consistency up 20 points");
    expect(r.from).toBe("2026-07-29");
    expect(r.to).toBe("2026-08-04");
  });
});
