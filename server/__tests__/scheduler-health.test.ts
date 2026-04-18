import { beforeEach, describe, expect, it, vi } from "vitest";

// Drizzle's sql template tag uses `now()` to compute timestamps; for testing
// we replace it with the wall clock at execute time so cooldown comparisons
// are deterministic relative to vi.setSystemTime.
function extractAlertSqlInfo(
  sqlObj: unknown,
): { kind: "insert" | "delete" | "other"; alertType?: string; cutoff?: Date } {
  // Drizzle stores its template parts in `queryChunks` — alternating
  // StringChunk (literal SQL) and parameter values.
  const chunks: unknown[] =
    (sqlObj as { queryChunks?: unknown[] })?.queryChunks ?? [];
  const literalParts: string[] = [];
  const params: unknown[] = [];
  for (const c of chunks) {
    // Drizzle's literal SQL fragments are StringChunk objects whose `value`
    // is an array of joined string parts; everything else (including bare
    // primitive strings) is a parameter value.
    const v = (c as { value?: unknown })?.value;
    if (
      c &&
      typeof c === "object" &&
      Array.isArray(v) &&
      typeof v[0] === "string"
    ) {
      literalParts.push(v[0]);
    } else {
      params.push(c);
    }
  }
  const sqlStr = literalParts.join(" ");
  if (sqlStr.includes("INSERT INTO monitoring_alerts")) {
    return {
      kind: "insert",
      alertType: params[0] as string,
      cutoff: params[1] as Date,
    };
  }
  if (sqlStr.includes("DELETE FROM monitoring_alerts")) {
    return { kind: "delete", alertType: params[0] as string };
  }
  return { kind: "other" };
}

interface FakeLease {
  slotIndex: number;
  instanceId: string;
  lastHeartbeatAt: Date;
}

const fakeState: {
  leases: FakeLease[];
  monitoringAlerts: Map<string, number>;
  selectShouldThrow: boolean;
} = {
  leases: [],
  monitoringAlerts: new Map(),
  selectShouldThrow: false,
};

// Mock the database layer. The shape here matches just the chained calls
// runSchedulerHealthCheck performs:
//   db.select().from(...).orderBy(...)
//   db.execute(sqlObj)
vi.mock("../db", () => {
  const selectChain = {
    from() {
      return this;
    },
    orderBy() {
      if (fakeState.selectShouldThrow) {
        return Promise.reject(new Error("simulated db outage"));
      }
      return Promise.resolve(fakeState.leases);
    },
  };
  return {
    db: {
      select: () => selectChain,
      execute: vi.fn(async (sqlObj: unknown) => {
        const info = extractAlertSqlInfo(sqlObj);
        if (info.kind === "insert" && info.alertType && info.cutoff) {
          const existing = fakeState.monitoringAlerts.get(info.alertType);
          if (existing === undefined) {
            fakeState.monitoringAlerts.set(info.alertType, Date.now());
            return { rowCount: 1 };
          }
          if (existing < info.cutoff.getTime()) {
            fakeState.monitoringAlerts.set(info.alertType, Date.now());
            return { rowCount: 1 };
          }
          return { rowCount: 0 };
        }
        if (info.kind === "delete" && info.alertType) {
          const had = fakeState.monitoringAlerts.delete(info.alertType);
          return { rowCount: had ? 1 : 0 };
        }
        return { rowCount: 0 };
      }),
    },
    pool: {},
  };
});

vi.mock("../email", () => ({
  sendOperatorAlertEmail: vi.fn(async () => true),
}));

// Avoid pulling in DATABASE_URL during module load.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const pushModule = await import("../push");
const emailModule = await import("../email");
const sendOperatorAlertEmail = emailModule.sendOperatorAlertEmail as unknown as ReturnType<
  typeof vi.fn
>;
const { __testRunSchedulerHealthCheck, stopSchedulerHealthMonitor } = pushModule;

function makeLease(
  slotIndex: number,
  ageMs: number,
  instanceId = `inst-${slotIndex}`,
): FakeLease {
  return {
    slotIndex,
    instanceId,
    lastHeartbeatAt: new Date(Date.now() - ageMs),
  };
}

function resetState(leases: FakeLease[] = []) {
  fakeState.leases = leases;
  fakeState.monitoringAlerts.clear();
  fakeState.selectShouldThrow = false;
  sendOperatorAlertEmail.mockClear();
  sendOperatorAlertEmail.mockImplementation(async () => true);
  // Reset the per-process `lastObservedClusterSize` cached inside push.ts
  // by stopping the monitor (which also nulls the cluster-size memo).
  stopSchedulerHealthMonitor();
}

describe("scheduler health monitor alerts", () => {
  beforeEach(() => {
    resetState();
  });

  it("emails the operator and writes a cooldown row when the heartbeat is stale", async () => {
    // 10-minute-old heartbeat is well past the 5-minute stale threshold.
    resetState([makeLease(0, 10 * 60 * 1000)]);

    await __testRunSchedulerHealthCheck();

    expect(sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    const [subject] = sendOperatorAlertEmail.mock.calls[0];
    expect(subject).toMatch(/Reminder scheduler unhealthy/);
    expect(fakeState.monitoringAlerts.has("scheduler_stale_heartbeat")).toBe(
      true,
    );
  });

  it("emails the operator when the cluster shrinks by more than one slot", async () => {
    // Prime lastObservedClusterSize = 4 with a healthy run (fresh heartbeats,
    // so no stale-heartbeat alert leaks into this case).
    resetState([
      makeLease(0, 5_000),
      makeLease(1, 5_000),
      makeLease(2, 5_000),
      makeLease(3, 5_000),
    ]);
    await __testRunSchedulerHealthCheck();
    expect(sendOperatorAlertEmail).not.toHaveBeenCalled();

    // Cluster drops from 4 to 1 — a drop of 3 slots, which exceeds the
    // "lost more than one" trigger.
    fakeState.leases = [makeLease(0, 5_000)];
    await __testRunSchedulerHealthCheck();

    expect(sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    const [subject] = sendOperatorAlertEmail.mock.calls[0];
    expect(subject).toMatch(/cluster shrank by 3 slot/);
  });

  it("only sends one email when two parallel callers race within the cooldown", async () => {
    resetState([makeLease(0, 10 * 60 * 1000)]);

    // Fire two health-check passes concurrently, simulating two app
    // instances reaching the same stale-heartbeat condition at the same
    // moment.
    await Promise.all([
      __testRunSchedulerHealthCheck(),
      __testRunSchedulerHealthCheck(),
    ]);

    // The conditional UPSERT into monitoring_alerts is what dedups: only
    // the first caller mutates a row, so only one email goes out.
    expect(sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
  });

  it("does not alert when the leases table is empty (cold boot)", async () => {
    resetState([]);

    await __testRunSchedulerHealthCheck();

    expect(sendOperatorAlertEmail).not.toHaveBeenCalled();
    expect(fakeState.monitoringAlerts.size).toBe(0);
  });

  it("rolls back the cooldown row when the email send fails so the next tick can retry", async () => {
    resetState([makeLease(0, 10 * 60 * 1000)]);
    sendOperatorAlertEmail.mockImplementationOnce(async () => false);

    await __testRunSchedulerHealthCheck();

    expect(sendOperatorAlertEmail).toHaveBeenCalledTimes(1);
    // Failed send should not have left a cooldown row behind.
    expect(fakeState.monitoringAlerts.has("scheduler_stale_heartbeat")).toBe(
      false,
    );

    // Next tick should now successfully send (and persist the cooldown).
    await __testRunSchedulerHealthCheck();
    expect(sendOperatorAlertEmail).toHaveBeenCalledTimes(2);
    expect(fakeState.monitoringAlerts.has("scheduler_stale_heartbeat")).toBe(
      true,
    );
  });
});
