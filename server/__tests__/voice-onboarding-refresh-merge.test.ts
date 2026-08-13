/**
 * Regression tests for POST /api/onboarding/voice-complete with
 * mode:"refresh" — the "Full life refresh" merge-preserving update.
 *
 * The contract under test: a short refresh conversation whose AI
 * extraction comes back empty (or fails entirely) must NEVER clobber an
 * established onboarding profile. Prior fields (desiredFeelings,
 * activeLifeAreas, generatedSummary, shortTermGoals, suggestedStructure,
 * ...) must survive, array fields must union with any new values, and
 * completedAt must still be bumped so the staleness card resets.
 *
 * Mounts registerOnboardingRoutes on a fresh Express app with storage,
 * openai, and requireAuth mocked — no DB, no network.
 */

import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type Request, type Response, type NextFunction } from "express";
import type { Server } from "http";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";
process.env.SESSION_SECRET ||= "test-secret";

// ─── Mocks ───────────────────────────────────────────────────────────────────

const TEST_USER_ID = "u_refresh_test";

vi.mock("../routes/_shared", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { session: { userId: string } }).session = { userId: TEST_USER_ID };
    next();
  },
}));

const chatCreate = vi.fn();
vi.mock("../openai", () => ({
  openai: { chat: { completions: { create: chatCreate } } },
  generateLifeSystemRecommendations: vi.fn(),
}));

const storageStub = {
  updateUser: vi.fn(async () => undefined),
  getOnboardingProfile: vi.fn(async () => null as unknown),
  updateOnboardingProfile: vi.fn(async () => undefined),
  createOnboardingProfile: vi.fn(async () => undefined),
};
vi.mock("../storage", () => ({ storage: storageStub }));

const { registerOnboardingRoutes } = await import("../routes/onboarding");

// ─── Fixtures ────────────────────────────────────────────────────────────────

/** A rich, established profile as it would exist after a full onboarding. */
function richProfile() {
  return {
    id: "prof_1",
    userId: TEST_USER_ID,
    wellnessFocus: ["emotional"],
    shortTermGoals: "Get mornings under control",
    desiredFeelings: ["organized", "calmer"],
    currentStateTags: ["overwhelmed"],
    activeLifeAreas: ["school", "fitness"],
    barrierTags: ["procrastination"],
    supportNeeds: ["staying on track"],
    curiosityTopics: ["budgeting"],
    generatedSummary: "You want steadier mornings and less chaos.",
    generatedDirection: "Toward consistent routines.",
    currentCapacity: "a few focused changes",
    tonePreference: "gentle",
    uncertaintyFlags: { barriersUnknown: false },
    suggestedStructure: [
      {
        id: "fp-1",
        type: "focus_point",
        title: "Morning Reset",
        description: "A short morning routine.",
        sourceReason: "Suggested because mornings feel chaotic.",
        status: "accepted",
      },
    ],
    onboardingVersion: "v2",
    completedAt: new Date("2026-01-01T00:00:00Z"),
  };
}

/** AI extraction response wrapper. */
function aiResponse(payload: Record<string, unknown>) {
  return { choices: [{ message: { content: JSON.stringify(payload) } }] };
}

const NEAR_EMPTY_MESSAGES = [
  { role: "assistant", content: "Let's take stock — what's changed in your life lately?" },
  { role: "user", content: "Not much really." },
];

// ─── Test app ────────────────────────────────────────────────────────────────

let app: Express;
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  app = express();
  app.use(express.json());
  registerOnboardingRoutes(app);
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
  vi.clearAllMocks();
});

async function postVoiceComplete(body: Record<string, unknown>) {
  const res = await fetch(`${baseUrl}/api/onboarding/voice-complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return { status: res.status, json: (await res.json()) as Record<string, unknown> };
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe("POST /api/onboarding/voice-complete mode:refresh", () => {
  it("preserves every prior field when a near-empty refresh conversation extracts nothing", async () => {
    const existing = richProfile();
    storageStub.getOnboardingProfile.mockResolvedValue(existing);
    chatCreate.mockResolvedValue(aiResponse({})); // AI found nothing new

    const before = Date.now();
    const { status, json } = await postVoiceComplete({
      messages: NEAR_EMPTY_MESSAGES,
      mode: "refresh",
    });

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(storageStub.createOnboardingProfile).not.toHaveBeenCalled();
    expect(storageStub.updateOnboardingProfile).toHaveBeenCalledTimes(1);

    const [id, merged] = storageStub.updateOnboardingProfile.mock.calls[0] as [string, Record<string, unknown>];
    expect(id).toBe(existing.id);

    // The five fields the task calls out explicitly:
    expect(merged.desiredFeelings).toEqual(["organized", "calmer"]);
    expect(merged.activeLifeAreas).toEqual(["school", "fitness"]);
    expect(merged.generatedSummary).toBe(existing.generatedSummary);
    expect(merged.shortTermGoals).toBe(existing.shortTermGoals);
    expect(merged.suggestedStructure).toEqual(existing.suggestedStructure);

    // ...and the rest of the profile survives too:
    expect(merged.wellnessFocus).toEqual(existing.wellnessFocus);
    expect(merged.currentStateTags).toEqual(existing.currentStateTags);
    expect(merged.barrierTags).toEqual(existing.barrierTags);
    expect(merged.supportNeeds).toEqual(existing.supportNeeds);
    expect(merged.curiosityTopics).toEqual(existing.curiosityTopics);
    expect(merged.generatedDirection).toBe(existing.generatedDirection);
    expect(merged.currentCapacity).toBe(existing.currentCapacity);
    expect(merged.tonePreference).toBe(existing.tonePreference);
    expect(merged.uncertaintyFlags).toEqual(existing.uncertaintyFlags);

    // completedAt is bumped to "now", not kept at the old date.
    expect(merged.completedAt).toBeInstanceOf(Date);
    expect((merged.completedAt as Date).getTime()).toBeGreaterThanOrEqual(before);
    expect((merged.completedAt as Date).getTime()).toBeGreaterThan(existing.completedAt.getTime());
  });

  it("preserves the prior profile even when the AI extraction call throws", async () => {
    const existing = richProfile();
    storageStub.getOnboardingProfile.mockResolvedValue(existing);
    chatCreate.mockRejectedValue(new Error("AI unavailable"));

    const { status } = await postVoiceComplete({ messages: NEAR_EMPTY_MESSAGES, mode: "refresh" });

    expect(status).toBe(200);
    expect(storageStub.updateOnboardingProfile).toHaveBeenCalledTimes(1);
    const merged = storageStub.updateOnboardingProfile.mock.calls[0][1] as Record<string, unknown>;
    expect(merged.desiredFeelings).toEqual(existing.desiredFeelings);
    expect(merged.activeLifeAreas).toEqual(existing.activeLifeAreas);
    expect(merged.generatedSummary).toBe(existing.generatedSummary);
    expect(merged.shortTermGoals).toBe(existing.shortTermGoals);
    expect(merged.suggestedStructure).toEqual(existing.suggestedStructure);
  });

  it("unions array fields and prefers new non-empty scalars when the refresh DID surface changes", async () => {
    const existing = richProfile();
    storageStub.getOnboardingProfile.mockResolvedValue(existing);
    chatCreate.mockResolvedValue(
      aiResponse({
        desiredFeelings: ["calmer", "energized"], // "calmer" dupes, "energized" is new
        activeLifeAreas: ["finances"],
        generatedSummary: "New chapter: money focus.",
        shortTermGoals: "Build a budget",
        suggestions: [
          {
            id: "sys-1",
            type: "system",
            title: "Money Awareness",
            description: "Weekly money check-in.",
            sourceReason: "Suggested because you mentioned finances.",
            status: "pending",
          },
        ],
      }),
    );

    await postVoiceComplete({ messages: NEAR_EMPTY_MESSAGES, mode: "refresh" });

    const merged = storageStub.updateOnboardingProfile.mock.calls[0][1] as Record<string, unknown>;
    // Arrays union (old ∪ new, deduped):
    expect(merged.desiredFeelings).toEqual(["organized", "calmer", "energized"]);
    expect(merged.activeLifeAreas).toEqual(["school", "fitness", "finances"]);
    // Non-empty new scalars win:
    expect(merged.generatedSummary).toBe("New chapter: money focus.");
    expect(merged.shortTermGoals).toBe("Build a budget");
    // New non-empty suggestions replace the old structure:
    expect((merged.suggestedStructure as unknown[]).length).toBe(1);
    // Fields the refresh didn't mention are preserved:
    expect(merged.tonePreference).toBe(existing.tonePreference);
    expect(merged.currentCapacity).toBe(existing.currentCapacity);
  });

  it("does not touch the stored profile at all when the conversation has zero messages", async () => {
    const { status, json } = await postVoiceComplete({ messages: [], mode: "refresh" });

    expect(status).toBe(200);
    expect(json.success).toBe(true);
    expect(storageStub.getOnboardingProfile).not.toHaveBeenCalled();
    expect(storageStub.updateOnboardingProfile).not.toHaveBeenCalled();
    expect(storageStub.createOnboardingProfile).not.toHaveBeenCalled();
  });

  it("without mode:refresh, an existing profile is still merge-preserved (plain re-run cannot clobber it)", async () => {
    const existing = richProfile();
    storageStub.getOnboardingProfile.mockResolvedValue(existing);
    chatCreate.mockResolvedValue(aiResponse({}));

    await postVoiceComplete({ messages: NEAR_EMPTY_MESSAGES });

    const merged = storageStub.updateOnboardingProfile.mock.calls[0][1] as Record<string, unknown>;
    // The server defaults to merge-preserving whenever a profile exists, so a
    // plain (non-refresh) re-run — deep link, stale bookmark, nav bug — can no
    // longer wipe an established profile with empty extraction values.
    expect(merged.desiredFeelings).toEqual(existing.desiredFeelings);
    expect(merged.generatedSummary).toBe(existing.generatedSummary);
    expect(merged.tonePreference).toBe(existing.tonePreference);
  });
});
