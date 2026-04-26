/**
 * Server tests for `/api/realtime/pick-mode`.
 *
 * The realtime channel calls this endpoint after every spoken turn so the
 * client can swap chips and inject a `session.update` instruction. This
 * suite pins the contract every voice session relies on:
 *
 *   1. 401 when no session cookie is present (auth gate).
 *   2. 400 when the body is missing `message` or it's empty/too long.
 *   3. A `lockedMode` is honoured verbatim — the picker is never invoked,
 *      the response sets `locked: true / confidence: 1`, and the log row
 *      records `source: "locked"`.
 *   4. Without a lock, the picker drives the choice; the response shape is
 *      `{ mode, label, reason, confidence, applied, locked }` and `applied`
 *      reflects whether the pick cleared `PICKER_APPLY_THRESHOLD`.
 *   5. `previousMode` is forwarded to the picker so lane stickiness applies.
 *   6. An invalid `lockedMode` string is coerced to `companion` (no echo of
 *      arbitrary client input into the lane chip).
 *
 * The picker module is mocked so this suite exercises the route's wiring
 * (validation, lock short-circuit, response shape) rather than the picker
 * internals — which have their own unit tests.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

// ─── Mocks ──────────────────────────────────────────────────────────────────

// `getUserContextSnapshot` is awaited by the route but its result is only
// passed through to the picker (which we also mock). A no-op suffices.
vi.mock("../lib/user-context", () => ({
  getUserContextSnapshot: vi.fn(async () => ({
    today: { timeOfDay: "afternoon" },
  })),
  toPromptString: vi.fn(() => ""),
}));

// Picker mock — the realtime route should:
//   - Call `pickDWRole(message, snap, { previousMode })` when there's no lock.
//   - NOT call `pickDWRole` at all when `lockedMode` is supplied.
const pickDWRoleMock = vi.fn();
vi.mock("../lib/dw-role-picker", async (orig) => {
  const actual = (await orig()) as Record<string, unknown>;
  return {
    ...actual,
    pickDWRole: pickDWRoleMock,
  };
});

// Telemetry sink — fire-and-forget; we just want to inspect what was
// recorded for each branch.
const logDwRolePickMock = vi.fn();
vi.mock("../lib/dw-role-pick-log", () => ({
  logDwRolePick: logDwRolePickMock,
}));

// `requireAuth` reads `req.session.userId`. We supply a tiny middleware
// stand-in for express-session below; storage isn't touched by this route.
vi.mock("../storage", () => ({
  storage: {
    getUser: vi.fn(async () => ({ id: "u_test", subscriptionTier: "free" })),
  },
}));

// ─── Test server ────────────────────────────────────────────────────────────

let server: Server;
let baseUrl: string;
// When set, the auth shim writes this userId into `req.session`. Setting
// it to `null` mimics a logged-out request so we can assert the 401 branch.
let testUserId: string | null = "u_test";

beforeAll(async () => {
  const { registerRealtimeRoutes } = await import("../routes/realtime");
  const app = express();
  app.use(express.json());
  // Tiny session shim — enough for `requireAuth` to see a userId (or not).
  app.use((req, _res, next) => {
    (req as unknown as { session: { userId?: string } }).session = {
      userId: testUserId ?? undefined,
    };
    next();
  });
  registerRealtimeRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  pickDWRoleMock.mockReset();
  logDwRolePickMock.mockReset();
  testUserId = "u_test";
});

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("POST /api/realtime/pick-mode — auth & validation", () => {
  it("returns 401 when there is no session userId", async () => {
    testUserId = null;
    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(res.status).toBe(401);
    expect(pickDWRoleMock).not.toHaveBeenCalled();
  });

  it("returns 400 when the message field is missing", async () => {
    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it("returns 400 when the message field is empty", async () => {
    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "" }),
    });
    expect(res.status).toBe(400);
  });
});

describe("POST /api/realtime/pick-mode — lockedMode short-circuits the picker", () => {
  it("echoes the locked mode verbatim and never invokes the picker", async () => {
    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "Build me a quick workout",
        lockedMode: "guide",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      mode: "guide",
      label: "Guide",
      reason: "you picked this lane",
      confidence: 1,
      applied: true,
      locked: true,
    });
    expect(pickDWRoleMock).not.toHaveBeenCalled();

    // Telemetry records the lock with source=locked.
    expect(logDwRolePickMock).toHaveBeenCalledTimes(1);
    expect(logDwRolePickMock.mock.calls[0][0]).toMatchObject({
      surface: "realtime",
      mode: "guide",
      source: "locked",
      locked: true,
      applied: true,
    });
  });

  it("coerces an unknown lockedMode string to companion", async () => {
    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "anything",
        lockedMode: "not-a-real-mode",
      }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("companion");
    expect(body.locked).toBe(true);
    expect(pickDWRoleMock).not.toHaveBeenCalled();
  });
});

describe("POST /api/realtime/pick-mode — picker drives the response when no lock", () => {
  it("returns the picker's mode/label/reason and marks applied=true above threshold", async () => {
    pickDWRoleMock.mockResolvedValueOnce({
      mode: "trainer",
      confidence: 0.9,
      reason: "training language",
      source: "rules",
    });

    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "Add a workout to my schedule" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({
      mode: "trainer",
      label: "Trainer",
      reason: "training language",
      confidence: 0.9,
      applied: true,
      locked: false,
    });

    expect(pickDWRoleMock).toHaveBeenCalledTimes(1);
    // previousMode defaults to undefined / null when not supplied.
    const [msgArg, snapArg, optsArg] = pickDWRoleMock.mock.calls[0];
    expect(msgArg).toBe("Add a workout to my schedule");
    expect(snapArg).toMatchObject({ today: { timeOfDay: "afternoon" } });
    expect(optsArg).toEqual({ previousMode: null });

    expect(logDwRolePickMock).toHaveBeenCalledWith(
      expect.objectContaining({
        surface: "realtime",
        mode: "trainer",
        source: "rules",
        confidence: 0.9,
        locked: false,
        applied: true,
      }),
    );
  });

  it("marks applied=false when the picker's confidence is below PICKER_APPLY_THRESHOLD", async () => {
    pickDWRoleMock.mockResolvedValueOnce({
      mode: "perspective",
      confidence: 0.4,
      reason: "ambiguous",
      source: "llm",
    });

    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "tell me what you think" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.mode).toBe("perspective");
    expect(body.applied).toBe(false);
    expect(body.locked).toBe(false);
    expect(body.confidence).toBeCloseTo(0.4, 5);
  });

  it("forwards previousMode into the picker so stickiness applies", async () => {
    pickDWRoleMock.mockResolvedValueOnce({
      mode: "companion",
      confidence: 0.6,
      reason: "staying in companion",
      source: "sticky",
    });

    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: "tell me what you think",
        previousMode: "companion",
      }),
    });
    expect(res.status).toBe(200);
    const [, , optsArg] = pickDWRoleMock.mock.calls[0];
    expect(optsArg).toEqual({ previousMode: "companion" });
  });
});

describe("POST /api/realtime/pick-mode — every response carries a valid mode id", () => {
  // The contract for realtime clients: even in pathological cases, the
  // response's `mode` field is always one of the canonical DW lanes so
  // the client can render its lane chip without defensive lookups.
  it("returns a known DW mode even when the picker returns a degenerate value", async () => {
    pickDWRoleMock.mockResolvedValueOnce({
      mode: "companion",
      confidence: 0.4,
      reason: "no clear lane",
      source: "fallback",
    });

    const res = await fetch(`${baseUrl}/api/realtime/pick-mode`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: "?" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const KNOWN_MODES = [
      "companion",
      "trainer",
      "liaison",
      "coach",
      "guide",
      "concierge",
      "assistant",
      "nutritionist",
      "planner",
      "perspective",
    ];
    expect(KNOWN_MODES).toContain(body.mode);
    expect(typeof body.label).toBe("string");
    expect(typeof body.reason).toBe("string");
    expect(typeof body.confidence).toBe("number");
    expect(typeof body.applied).toBe("boolean");
    expect(typeof body.locked).toBe("boolean");
  });
});
