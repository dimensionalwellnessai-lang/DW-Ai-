/**
 * Tests for the mood-insights background refresh paths:
 *
 *   - runScheduledMoodInsightsRefresh: only recomputes for users whose
 *     cached computedAt is older than the staleness window AND only for
 *     users in this instance's shard.
 *
 *   - maybeRefreshAfterMoodLog: triggers when the user's first-ever log
 *     lands or when N+ new logs have arrived since the last computedAt;
 *     skips quietly when below the threshold.
 *
 * The DB layer is mocked along the same lines as scheduler-health.test.ts:
 * the chained drizzle calls are routed by the keys of the `select({...})`
 * projection (each query in the module under test uses a unique key —
 * `userId`, `computedAt`, or `count` — so the mock can dispatch without
 * having to parse SQL).
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

// ── Per-test mutable state the db mock reads from ──────────────────────────
interface FakeState {
  activeUsers: string[];
  computedAtQueue: (Date | null)[];
  newLogsCountQueue: number[];
}
const fakeState: FakeState = {
  activeUsers: [],
  computedAtQueue: [],
  newLogsCountQueue: [],
};

// ── Mocks ──────────────────────────────────────────────────────────────────
type Row = Record<string, unknown>;
interface PromiseLikeChain {
  from: (..._a: unknown[]) => PromiseLikeChain;
  where: (..._a: unknown[]) => PromiseLikeChain | Promise<Row[]>;
  orderBy?: (..._a: unknown[]) => PromiseLikeChain;
  groupBy?: (..._a: unknown[]) => Promise<Row[]>;
  limit?: (..._a: unknown[]) => Promise<Row[]>;
}

vi.mock("../db", () => {
  return {
    db: {
      select: (cols?: Record<string, unknown>): PromiseLikeChain => {
        const key = cols ? Object.keys(cols)[0] : "";
        if (key === "userId") {
          // findActiveUserIds: select({userId}).from(moodLogs).where(...).groupBy(...)
          const c: PromiseLikeChain = {
            from: () => c,
            where: () => c,
            groupBy: () =>
              Promise.resolve(fakeState.activeUsers.map((u) => ({ userId: u }))),
          };
          return c;
        }
        if (key === "computedAt") {
          // getLatestComputedAt: select({computedAt}).from(moodInsights).where(...).orderBy(...).limit(1)
          const c: PromiseLikeChain = {
            from: () => c,
            where: () => c,
            orderBy: () => c,
            limit: () => {
              const next = fakeState.computedAtQueue.shift();
              const computedAt = next ?? null;
              return Promise.resolve(
                computedAt ? [{ computedAt }] : ([] as Row[]),
              );
            },
          };
          return c;
        }
        if (key === "count") {
          // post-log count: select({count}).from(moodLogs).where(and(...))
          const c: PromiseLikeChain = {
            from: () => c,
            where: () => {
              const next = fakeState.newLogsCountQueue.shift() ?? 0;
              return Promise.resolve([{ count: next }]);
            },
          };
          return c;
        }
        throw new Error(`Unexpected select projection keys: ${key}`);
      },
    },
    pool: {},
  };
});

const computeMoodInsights = vi.fn(async (_userId: string) => {});
vi.mock("../mood-insights", () => ({
  computeMoodInsights: (uid: string) => computeMoodInsights(uid),
}));

const isUserInShard = vi.fn((_userId: string) => true);
vi.mock("../push", () => ({
  isUserInShard: (uid: string) => isUserInShard(uid),
}));

// Schema imports run after mocks so they pick up the test DATABASE_URL.
const { runScheduledMoodInsightsRefresh, maybeRefreshAfterMoodLog } =
  await import("../mood-insights-scheduler");

// ── Helpers ────────────────────────────────────────────────────────────────
function resetState() {
  fakeState.activeUsers = [];
  fakeState.computedAtQueue = [];
  fakeState.newLogsCountQueue = [];
  computeMoodInsights.mockClear();
  isUserInShard.mockReset();
  isUserInShard.mockImplementation(() => true);
}

// maybeRefreshAfterMoodLog is fire-and-forget. Awaiting a couple of
// microtask flushes is enough to let the inner IIFE (which awaits two
// Promise.resolved values) settle before the assertion.
async function flushFireAndForget() {
  for (let i = 0; i < 5; i++) {
    await Promise.resolve();
  }
}

beforeEach(() => {
  resetState();
});

afterEach(() => {
  resetState();
});

// ── runScheduledMoodInsightsRefresh ────────────────────────────────────────
describe("runScheduledMoodInsightsRefresh", () => {
  it("recomputes only for stale users in this instance's shard", async () => {
    const STALE = new Date(Date.now() - 25 * 60 * 60 * 1000); // 25h old
    const FRESH = new Date(Date.now() - 1 * 60 * 60 * 1000); //  1h old

    fakeState.activeUsers = ["u-stale", "u-fresh", "u-other-shard"];
    // Order matches the for-loop over `owned` (which is filter-stable on
    // activeUsers). u-other-shard is filtered out before any computedAt
    // lookup, so the queue only needs entries for the two owned users.
    fakeState.computedAtQueue = [STALE, FRESH];

    isUserInShard.mockImplementation((uid: string) => uid !== "u-other-shard");

    await runScheduledMoodInsightsRefresh();

    expect(computeMoodInsights).toHaveBeenCalledTimes(1);
    expect(computeMoodInsights).toHaveBeenCalledWith("u-stale");
    // u-other-shard was filtered before any DB work happened.
    expect(isUserInShard).toHaveBeenCalledWith("u-other-shard");
  });

  it("recomputes a user that has no cached row yet", async () => {
    fakeState.activeUsers = ["u-newcomer"];
    fakeState.computedAtQueue = [null];

    await runScheduledMoodInsightsRefresh();

    expect(computeMoodInsights).toHaveBeenCalledTimes(1);
    expect(computeMoodInsights).toHaveBeenCalledWith("u-newcomer");
  });

  it("does nothing when there are no active users", async () => {
    fakeState.activeUsers = [];

    await runScheduledMoodInsightsRefresh();

    expect(computeMoodInsights).not.toHaveBeenCalled();
    expect(isUserInShard).not.toHaveBeenCalled();
  });

  it("does nothing when no active users belong to this shard", async () => {
    fakeState.activeUsers = ["u1", "u2"];
    isUserInShard.mockImplementation(() => false);

    await runScheduledMoodInsightsRefresh();

    expect(computeMoodInsights).not.toHaveBeenCalled();
  });

  it("does not throw when computeMoodInsights fails for one user", async () => {
    const STALE = new Date(Date.now() - 30 * 60 * 60 * 1000);
    fakeState.activeUsers = ["u-broken", "u-ok"];
    fakeState.computedAtQueue = [STALE, STALE];
    computeMoodInsights.mockImplementationOnce(async () => {
      throw new Error("boom");
    });

    await expect(runScheduledMoodInsightsRefresh()).resolves.toBeUndefined();

    // Both users were attempted — the first errored, the second succeeded.
    expect(computeMoodInsights).toHaveBeenCalledTimes(2);
  });
});

// ── maybeRefreshAfterMoodLog ───────────────────────────────────────────────
describe("maybeRefreshAfterMoodLog", () => {
  it("triggers a recompute on the user's first-ever log (no prior cache)", async () => {
    fakeState.computedAtQueue = [null];

    maybeRefreshAfterMoodLog("u-newcomer");
    await flushFireAndForget();

    expect(computeMoodInsights).toHaveBeenCalledTimes(1);
    expect(computeMoodInsights).toHaveBeenCalledWith("u-newcomer");
  });

  it("skips when fewer than the threshold's worth of new logs have landed", async () => {
    const RECENT = new Date(Date.now() - 60 * 60 * 1000);
    fakeState.computedAtQueue = [RECENT];
    fakeState.newLogsCountQueue = [4]; // POST_LOG_REFRESH_THRESHOLD is 5

    maybeRefreshAfterMoodLog("u-active");
    await flushFireAndForget();

    expect(computeMoodInsights).not.toHaveBeenCalled();
  });

  it("triggers once the new-log count reaches the threshold", async () => {
    const RECENT = new Date(Date.now() - 60 * 60 * 1000);
    fakeState.computedAtQueue = [RECENT];
    fakeState.newLogsCountQueue = [5];

    maybeRefreshAfterMoodLog("u-active");
    await flushFireAndForget();

    expect(computeMoodInsights).toHaveBeenCalledTimes(1);
    expect(computeMoodInsights).toHaveBeenCalledWith("u-active");
  });

  it("triggers when many new logs have piled up since the last refresh", async () => {
    const RECENT = new Date(Date.now() - 60 * 60 * 1000);
    fakeState.computedAtQueue = [RECENT];
    fakeState.newLogsCountQueue = [42];

    maybeRefreshAfterMoodLog("u-active");
    await flushFireAndForget();

    expect(computeMoodInsights).toHaveBeenCalledTimes(1);
  });
});
