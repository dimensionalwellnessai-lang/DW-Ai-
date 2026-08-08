/**
 * Tests for the daily growth-snapshots sweep (runGrowthSnapshotsTick):
 *
 *   - Users with recent usage_meters activity get exactly one snapshot per
 *     UTC day: the first tick writes, a second tick reports skipped.
 *   - Inactive users (no usage rows inside the 30-day lookback) are never
 *     scanned or snapshotted (the active-user query filters by dateKey).
 *   - Shard filtering excludes users not owned by this instance.
 *   - Per-user failures are swallowed and don't stall the sweep.
 *
 * The DB layer is mocked along the same lines as
 * mood-insights-scheduler.test.ts: chained drizzle calls are routed by the
 * keys of the projection passed to select()/selectDistinct(). The module
 * under test uses `userId` (active-user query) and `id` (snapshot-exists
 * check), so the mock can dispatch without parsing SQL. A per-test
 * `snapshots` set backs the exists-check, and the mocked
 * upsertTodayGrowthSnapshot writes into that same set — so running the tick
 * twice exercises the real write-then-skip behavior.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const TODAY_KEY = new Date().toISOString().slice(0, 10);

// ── Per-test mutable state the db mock reads from ──────────────────────────
interface FakeState {
  /** userId -> most recent usage dateKey (YYYY-MM-DD). */
  usage: Map<string, string>;
  /** Set of `${userId}:${dateKey}` snapshot rows that "exist". */
  snapshots: Set<string>;
  /** Queue of userIds the exists-check is about to be asked about. */
  pendingExistsChecks: string[];
}
const fakeState: FakeState = {
  usage: new Map(),
  snapshots: new Set(),
  pendingExistsChecks: [],
};

// ── Mocks ──────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;

// The active-user query filters usage_meters by dateKey >= sinceKey. The
// mock can't parse the SQL condition, so it captures sinceKey via the
// gte() call arguments — see the drizzle-orm spy below.
let capturedSinceKey: string | null = null;

vi.mock("drizzle-orm", async (importOriginal) => {
  const actual = await importOriginal<typeof import("drizzle-orm")>();
  return {
    ...actual,
    gte: (col: unknown, value: unknown) => {
      if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
        capturedSinceKey = value;
      }
      return actual.gte(col as never, value as never);
    },
  };
});

vi.mock("../db", () => {
  return {
    db: {
      selectDistinct: (cols?: Record<string, unknown>) => {
        const key = cols ? Object.keys(cols)[0] : "";
        if (key !== "userId") throw new Error(`Unexpected selectDistinct keys: ${key}`);
        const c = {
          from: () => c,
          where: () => {
            // Apply the captured lookback filter like the real query would.
            const since = capturedSinceKey ?? "0000-00-00";
            const rows: Row[] = [];
            for (const [userId, lastUsageKey] of fakeState.usage) {
              if (lastUsageKey >= since) rows.push({ userId });
            }
            return Promise.resolve(rows);
          },
        };
        return c;
      },
      select: (cols?: Record<string, unknown>) => {
        const key = cols ? Object.keys(cols)[0] : "";
        if (key !== "id") throw new Error(`Unexpected select projection keys: ${key}`);
        const c = {
          from: () => c,
          where: () => c,
          limit: () => {
            const userId = fakeState.pendingExistsChecks.shift();
            if (!userId) throw new Error("exists-check queue underflow");
            const exists = fakeState.snapshots.has(`${userId}:${TODAY_KEY}`);
            return Promise.resolve(exists ? [{ id: "snap-1" }] : ([] as Row[]));
          },
        };
        return c;
      },
    },
    pool: {},
  };
});

const computeGrowthMetrics = vi.fn(async (_userId: string) => ({}) as never);
const upsertTodayGrowthSnapshot = vi.fn(async (userId: string) => {
  fakeState.snapshots.add(`${userId}:${TODAY_KEY}`);
});
vi.mock("../lib/growth-metrics", () => ({
  computeGrowthMetrics: (uid: string) => computeGrowthMetrics(uid),
  upsertTodayGrowthSnapshot: (uid: string, m: unknown) =>
    upsertTodayGrowthSnapshot(uid, m as never),
}));

const isUserInShard = vi.fn((_userId: string) => true);
vi.mock("../push", () => ({
  isUserInShard: (uid: string) => isUserInShard(uid),
}));

const { runGrowthSnapshotsTick } = await import("../growth-snapshots-scheduler");

// ── Helpers ────────────────────────────────────────────────────────────────
const DAY_MS = 86_400_000;
function daysAgoKey(days: number): string {
  return new Date(Date.now() - days * DAY_MS).toISOString().slice(0, 10);
}

/**
 * The exists-check mock can't see which user the where() clause targets, so
 * tests pre-declare the scan order: the tick iterates active users in usage
 * insertion order (filtered by shard), one exists-check per scanned user.
 */
function expectScanOrder(...userIds: string[]) {
  fakeState.pendingExistsChecks = [...userIds];
}

function resetState() {
  fakeState.usage = new Map();
  fakeState.snapshots = new Set();
  fakeState.pendingExistsChecks = [];
  capturedSinceKey = null;
  computeGrowthMetrics.mockClear();
  upsertTodayGrowthSnapshot.mockClear();
  isUserInShard.mockReset();
  isUserInShard.mockImplementation(() => true);
}

beforeEach(() => resetState());
afterEach(() => resetState());

// ── Tests ──────────────────────────────────────────────────────────────────
describe("runGrowthSnapshotsTick", () => {
  it("writes exactly one snapshot per active user, and a second run skips them all", async () => {
    fakeState.usage.set("u-alice", daysAgoKey(1));
    fakeState.usage.set("u-bob", daysAgoKey(10));

    expectScanOrder("u-alice", "u-bob");
    const first = await runGrowthSnapshotsTick();
    expect(first).toEqual({ scanned: 2, written: 2, skipped: 0 });
    expect(computeGrowthMetrics).toHaveBeenCalledTimes(2);
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledWith("u-alice", expect.anything());
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledWith("u-bob", expect.anything());

    // Second sweep the same day: both users already have today's snapshot.
    computeGrowthMetrics.mockClear();
    upsertTodayGrowthSnapshot.mockClear();
    expectScanOrder("u-alice", "u-bob");
    const second = await runGrowthSnapshotsTick();
    expect(second).toEqual({ scanned: 2, written: 0, skipped: 2 });
    expect(computeGrowthMetrics).not.toHaveBeenCalled();
    expect(upsertTodayGrowthSnapshot).not.toHaveBeenCalled();
  });

  it("does not snapshot users with no usage in the 30-day lookback", async () => {
    fakeState.usage.set("u-active", daysAgoKey(5));
    fakeState.usage.set("u-dormant", daysAgoKey(45)); // outside lookback

    expectScanOrder("u-active");
    const result = await runGrowthSnapshotsTick();

    expect(result).toEqual({ scanned: 1, written: 1, skipped: 0 });
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledTimes(1);
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledWith("u-active", expect.anything());
    // Sanity: the lookback boundary the query used is ~30 days back.
    expect(capturedSinceKey).toBe(daysAgoKey(30));
  });

  it("skips a user whose snapshot was already written lazily (e.g. via /api/level-progress)", async () => {
    fakeState.usage.set("u-lazy", daysAgoKey(2));
    fakeState.snapshots.add(`u-lazy:${TODAY_KEY}`);

    expectScanOrder("u-lazy");
    const result = await runGrowthSnapshotsTick();

    expect(result).toEqual({ scanned: 1, written: 0, skipped: 1 });
    expect(computeGrowthMetrics).not.toHaveBeenCalled();
  });

  it("ignores active users outside this instance's shard", async () => {
    fakeState.usage.set("u-mine", daysAgoKey(1));
    fakeState.usage.set("u-other-shard", daysAgoKey(1));
    isUserInShard.mockImplementation((uid: string) => uid !== "u-other-shard");

    expectScanOrder("u-mine"); // shard filter happens before any exists-check
    const result = await runGrowthSnapshotsTick();

    expect(result).toEqual({ scanned: 1, written: 1, skipped: 0 });
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledTimes(1);
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledWith("u-mine", expect.anything());
    expect(isUserInShard).toHaveBeenCalledWith("u-other-shard");
  });

  it("does nothing when there are no active users", async () => {
    const result = await runGrowthSnapshotsTick();
    expect(result).toEqual({ scanned: 0, written: 0, skipped: 0 });
    expect(computeGrowthMetrics).not.toHaveBeenCalled();
  });

  it("swallows a per-user failure and continues to the next user", async () => {
    fakeState.usage.set("u-broken", daysAgoKey(1));
    fakeState.usage.set("u-ok", daysAgoKey(1));
    computeGrowthMetrics.mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    expectScanOrder("u-broken", "u-ok");
    const result = await runGrowthSnapshotsTick();

    // u-broken errored (neither written nor skipped); u-ok still succeeded.
    expect(result).toEqual({ scanned: 2, written: 1, skipped: 0 });
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledTimes(1);
    expect(upsertTodayGrowthSnapshot).toHaveBeenCalledWith("u-ok", expect.anything());
  });
});
