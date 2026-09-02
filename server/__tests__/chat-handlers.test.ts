/**
 * Integration tests for /api/chat and /api/chat/smart. Mounts the
 * extracted handlers (./routes/chat-handlers.ts) on a fresh Express app
 * and asserts validation, the dwMode payload, modeLock override,
 * previousMode pass-through, and the dw_role_picks log row. All heavy
 * collaborators are mocked — no DB, no network.
 */

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "http";
import type { LogPickArgs } from "../lib/dw-role-pick-log";
import type { AdaptiveDWModeResult } from "../lib/dw-role-picker";

/**
 * Express adds `session` to `Request` via declaration merging from
 * express-session, but with all the SessionData fields required. The chat
 * handlers only ever read `req.session.userId`, so the test middleware
 * coerces the request through this helper instead of `as any`.
 */
function attachStubSession(req: Request, userId?: string): void {
  (req as Request & { session: { userId?: string } }).session = { userId };
}

/**
 * Build a fully-typed `LogPickArgs.{mode,source,...}` partial without
 * `as any`. Matches the shape `resolveAdaptiveDWMode` returns in its
 * `logFields` field.
 */
type LogFieldsShape = Pick<
  LogPickArgs,
  "mode" | "source" | "confidence" | "reason" | "locked" | "applied"
>;

/**
 * Build a fully-typed `AdaptiveDWModeResult` for use as a vi.fn() return
 * value. Defaults reflect the most common case (rules-driven companion
 * pick that crossed the apply threshold). Tests pass a partial override
 * to focus on the field that matters for that case.
 */
function buildAdaptiveResult(
  overrides: Partial<AdaptiveDWModeResult> & {
    dwMode?: Partial<AdaptiveDWModeResult["dwMode"]>;
    logFields?: Partial<LogFieldsShape>;
  } = {},
): AdaptiveDWModeResult {
  const baseDwMode: AdaptiveDWModeResult["dwMode"] = {
    id: "companion",
    label: "Companion",
    locked: false,
    reason: "test default",
    confidence: 0.9,
  };
  const baseLog: LogFieldsShape = {
    mode: "companion",
    source: "rules",
    confidence: 0.9,
    reason: "test default",
    locked: false,
    applied: true,
  };
  return {
    mode: "companion",
    modeDef: { id: "companion", label: "Companion", systemAddendum: "" } as AdaptiveDWModeResult["modeDef"],
    modeAddendum: "",
    lockedMode: null,
    picked: { mode: "companion", confidence: 0.9, reason: "test default", source: "rules" },
    applied: true,
    ...overrides,
    dwMode: { ...baseDwMode, ...(overrides.dwMode ?? {}) },
    logFields: { ...baseLog, ...(overrides.logFields ?? {}) },
  };
}

// Avoid pulling DATABASE_URL during transitive imports.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.SESSION_SECRET ||= "test-secret";

// ─── Mocks (declared with hoisted spy refs so we can assert on them) ─────────

const generateChatResponse = vi.fn();
const detectIntentAndRespond = vi.fn();
const enforceOneQuestion = vi.fn((s: string) => s);
const getAiConfigStatus = vi.fn(() => ({ configured: true }));

vi.mock("../openai", () => ({
  generateChatResponse,
  detectIntentAndRespond,
  enforceOneQuestion,
  getAiConfigStatus,
}));

const getUserContextSnapshot = vi.fn();
const toUserLifeContext = vi.fn(() => ({
  // Minimal stub — handler just forwards this into the AI call.
  identity: { name: "Test User" },
}));

vi.mock("../lib/user-context", () => ({
  getUserContextSnapshot,
  toUserLifeContext,
}));

const resolveAdaptiveDWMode = vi.fn();
vi.mock("../lib/dw-role-picker", () => ({
  resolveAdaptiveDWMode,
}));

const buildCompanionContext = vi.fn(async () => ({
  zones: {},
  currents: {},
  energyType: null,
  interests: { deepDives: [], currentObsessions: [], popCulture: [] },
}));
const emptyCompanionContext = vi.fn(() => ({
  zones: {},
  currents: {},
  energyType: null,
  interests: { deepDives: [], currentObsessions: [], popCulture: [] },
}));
const serializeCompanionContext = vi.fn(() => "");
const companionContextPromptBlock = vi.fn(() => "");
vi.mock("../lib/companion-context", () => ({
  buildCompanionContext,
  emptyCompanionContext,
  serializeCompanionContext,
  companionContextPromptBlock,
}));

const logDwRolePick = vi.fn();
vi.mock("../lib/dw-role-pick-log", () => ({
  logDwRolePick,
}));

vi.mock("../routes/trigger-detection", () => ({
  detectTriggerSuggestion: vi.fn(() => null),
}));

vi.mock("../routes/relationships", () => ({
  buildPersonSuggestion: vi.fn(async () => null),
}));

vi.mock("../routes/wearables", () => ({
  getYesterdayHeadlineMetrics: vi.fn(async () => null),
  safeGetWearablesYesterday: vi.fn(async () => null),
}));

// `_shared` is heavy (imports z, drizzle types, etc) but we only need the
// real exports for CONTEXT_SYSTEM_OVERRIDES + DW_MAX_MESSAGE_CONTENT_LENGTH
// + the two extract* helpers. Stub the latter to no-ops so they don't try to
// match against the dummy AI response.
vi.mock("../routes/_shared", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../routes/_shared")>();
  return {
    ...actual,
    extractCategoryData: vi.fn(() => []),
    extractSyncableItems: vi.fn(() => []),
  };
});

const storageStub = {
  createScheduleBlock: vi.fn(async () => undefined),
  createMoodLog: vi.fn(async () => undefined),
  createGoal: vi.fn(async () => undefined),
  createHabit: vi.fn(async () => undefined),
  createCategoryEntry: vi.fn(async () => undefined),
  getActiveSyncSession: vi.fn(async () => null),
  createSyncSession: vi.fn(async () => ({ id: "sess_test" })),
  createSyncItems: vi.fn(async () => undefined),
  getSyncItems: vi.fn(async () => []),
  updateSyncSession: vi.fn(async () => undefined),
  getImportedDocument: vi.fn(async () => null),
  createDwJournalEntry: vi.fn(async () => undefined),
  getTodaysHabitLog: vi.fn(async () => null),
  createHabitLog: vi.fn(async () => undefined),
  createReminder: vi.fn(async () => undefined),
  createRoutine: vi.fn(async () => undefined),
  updateGoal: vi.fn(async () => undefined),
};

vi.mock("../storage", () => ({
  storage: storageStub,
}));

const { chatHandler, smartChatHandler } = await import("../routes/chat-handlers");

// ─── Test app ────────────────────────────────────────────────────────────────

let app: Express;
let server: Server;
let baseUrl: string;
const TEST_USER_ID = "u_chat_test";
let mockUserId: string | undefined = TEST_USER_ID;

beforeAll(async () => {
  app = express();
  app.use(express.json());

  // Fake auth middleware: every request is authenticated as `mockUserId`.
  // We don't run real express-session here — the chat handlers only ever read
  // `req.session.userId`, so this stub is enough.
  app.use((req: Request, _res: Response, next: NextFunction) => {
    attachStubSession(req, mockUserId);
    next();
  });

  app.post("/api/chat", chatHandler);
  app.post("/api/chat/smart", smartChatHandler);

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const addr = server.address();
  if (typeof addr === "object" && addr) {
    baseUrl = `http://127.0.0.1:${addr.port}`;
  } else {
    throw new Error("Failed to bind test server");
  }
});

afterAll(async () => {
  await new Promise<void>((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
});

beforeEach(() => {
  mockUserId = TEST_USER_ID;
  // Default snapshot — real shape doesn't matter, the picker / AI both
  // see it through mocks.
  getUserContextSnapshot.mockResolvedValue({
    userId: mockUserId,
    spirit: { cosmicConsent: { useAstrologyInGuidance: false, useNumerologyInGuidance: false } },
  });

  // Default picker output: companion, applied, no lock.
  resolveAdaptiveDWMode.mockResolvedValue(buildAdaptiveResult());

  generateChatResponse.mockResolvedValue("ok response");
  detectIntentAndRespond.mockResolvedValue({ response: "smart ok response", toolCalls: [] });
  buildCompanionContext.mockResolvedValue({
    zones: {},
    currents: {},
    energyType: null,
    interests: { deepDives: [], currentObsessions: [], popCulture: [] },
  });
  emptyCompanionContext.mockReturnValue({
    zones: {},
    currents: {},
    energyType: null,
    interests: { deepDives: [], currentObsessions: [], popCulture: [] },
  });
  serializeCompanionContext.mockReturnValue("");
  getAiConfigStatus.mockReturnValue({ configured: true });
});

afterEach(() => {
  generateChatResponse.mockReset();
  detectIntentAndRespond.mockReset();
  resolveAdaptiveDWMode.mockReset();
  buildCompanionContext.mockReset();
  emptyCompanionContext.mockReset();
  serializeCompanionContext.mockReset();
  logDwRolePick.mockReset();
  getUserContextSnapshot.mockReset();
  for (const fn of Object.values(storageStub)) fn.mockClear();
});

// ─── /api/chat ───────────────────────────────────────────────────────────────

describe("POST /api/chat — request validation", () => {
  it("returns 400 when message is missing", async () => {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toMatch(/Message is required/i);
  });

  it("returns 400 when message is whitespace only", async () => {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "   " }),
    });
    expect(r.status).toBe(400);
  });

  it("returns 400 when message exceeds the 100k limit", async () => {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "x".repeat(100_001) }),
    });
    expect(r.status).toBe(400);
    const body = await r.json();
    expect(body.error).toMatch(/too long/i);
  });
});

describe("POST /api/chat — adaptive DW mode integration", () => {
  it("returns the picker's dwMode payload to the client", async () => {
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.dwMode).toEqual({
      id: "companion",
      label: "Companion",
      locked: false,
      reason: "test default",
      confidence: 0.9,
    });
    expect(body.response).toBe("ok response");
  });

  it("forwards modeLock straight through to resolveAdaptiveDWMode", async () => {
    resolveAdaptiveDWMode.mockResolvedValueOnce(buildAdaptiveResult({
      mode: "trainer",
      modeAddendum: "TRAINER PROMPT",
      lockedMode: "trainer",
      picked: null,
      dwMode: { id: "trainer", label: "Trainer", reason: "user-locked lane", confidence: 1, locked: true },
      logFields: { mode: "trainer", source: "locked", confidence: 1, reason: "user-locked lane", locked: true },
    }));
    const r = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "anything", modeLock: "trainer" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.dwMode.locked).toBe(true);
    expect(body.dwMode.id).toBe("trainer");

    expect(resolveAdaptiveDWMode).toHaveBeenCalledTimes(1);
    const call = resolveAdaptiveDWMode.mock.calls[0][0];
    expect(call).toMatchObject({ message: "anything", modeLock: "trainer" });
  });

  it("forwards previousMode for picker stickiness", async () => {
    await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "still vibing", previousMode: "companion" }),
    });
    expect(resolveAdaptiveDWMode).toHaveBeenCalledTimes(1);
    expect(resolveAdaptiveDWMode.mock.calls[0][0]).toMatchObject({ previousMode: "companion" });
  });

  it("logs exactly one dw_role_picks row per request with surface=chat", async () => {
    await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    expect(logDwRolePick).toHaveBeenCalledTimes(1);
    expect(logDwRolePick.mock.calls[0][0]).toMatchObject({
      userId: mockUserId,
      surface: "chat",
      message: "hi",
      mode: "companion",
      source: "rules",
      applied: true,
      locked: false,
    });
  });
});

// ─── /api/chat/smart ─────────────────────────────────────────────────────────

describe("POST /api/chat/smart — request validation", () => {
  it("returns 400 when message is missing", async () => {
    const r = await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });
    expect(r.status).toBe(400);
  });

  it("returns the friendly unconfigured-AI response without calling detectIntentAndRespond", async () => {
    getAiConfigStatus.mockReturnValueOnce({ configured: false });
    const r = await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.response).toMatch(/small moment/i);
    expect(detectIntentAndRespond).not.toHaveBeenCalled();
  });
});

describe("POST /api/chat/smart — adaptive DW mode integration", () => {
  it("returns a real DW response for a signed-out guest without loading account data", async () => {
    mockUserId = undefined;
    const r = await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "I need a calm moment" }),
    });

    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.response).toBe("smart ok response");
    expect(getUserContextSnapshot).not.toHaveBeenCalled();
    expect(buildCompanionContext).not.toHaveBeenCalled();
    expect(logDwRolePick).not.toHaveBeenCalled();
  });

  it("returns the picker's dwMode payload to the client", async () => {
    const r = await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hi" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.dwMode).toMatchObject({ id: "companion", locked: false });
    expect(body.response).toBe("smart ok response");
  });

  it("forwards modeLock through resolveAdaptiveDWMode", async () => {
    resolveAdaptiveDWMode.mockResolvedValueOnce(buildAdaptiveResult({
      mode: "guide",
      modeAddendum: "GUIDE PROMPT",
      lockedMode: "guide",
      picked: null,
      dwMode: { id: "guide", label: "Guide", reason: "user-locked lane", confidence: 1, locked: true },
      logFields: { mode: "guide", source: "locked", confidence: 1, reason: "user-locked lane", locked: true },
    }));
    const r = await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "wind down with me", modeLock: "guide" }),
    });
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.dwMode.locked).toBe(true);
    expect(body.dwMode.id).toBe("guide");
    expect(resolveAdaptiveDWMode.mock.calls[0][0]).toMatchObject({ modeLock: "guide" });
  });

  it("logs exactly one dw_role_picks row per request with surface=smart", async () => {
    await fetch(`${baseUrl}/api/chat/smart`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ message: "hello smart" }),
    });
    expect(logDwRolePick).toHaveBeenCalledTimes(1);
    expect(logDwRolePick.mock.calls[0][0]).toMatchObject({
      userId: mockUserId,
      surface: "smart",
      message: "hello smart",
    });
  });
});
