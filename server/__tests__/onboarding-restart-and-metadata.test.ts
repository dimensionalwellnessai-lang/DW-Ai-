import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Server } from "http";

const TEST_USER_ID = "u_onboarding_restart_test";

vi.mock("../routes/_shared", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { session: { userId: string } }).session = { userId: TEST_USER_ID };
    next();
  },
}));

vi.mock("../openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  generateLifeSystemRecommendations: vi.fn(async () => ({
    weeklyScheduleSuggestions: [],
    suggestedHabits: [],
    suggestedGoals: [],
    scheduleBlocks: [],
    mealSuggestions: [],
  })),
}));

const storageStub = {
  getUser: vi.fn(async () => ({ id: TEST_USER_ID, onboardingSource: null })),
  updateUser: vi.fn(async () => ({ id: TEST_USER_ID })),
  restartOnboarding: vi.fn(async () => undefined),
  createOnboardingProfile: vi.fn(async () => ({ id: "profile-1" })),
  createLifeSystem: vi.fn(async () => ({ id: "life-1" })),
  createHabits: vi.fn(async () => []),
  createGoals: vi.fn(async () => []),
  getOnboardingProfile: vi.fn(async () => undefined),
  updateOnboardingProfile: vi.fn(async () => undefined),
};
vi.mock("../storage", () => ({ storage: storageStub }));

const { registerOnboardingRoutes } = await import("../routes/onboarding");

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
  storageStub.getUser.mockResolvedValue({ id: TEST_USER_ID, onboardingSource: null });
});

describe("onboarding restart flow", () => {
  it("starts restart in preserve mode by default", async () => {
    const res = await fetch(`${baseUrl}/api/onboarding/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "preserve" }),
    });

    expect(res.status).toBe(200);
    expect(storageStub.restartOnboarding).toHaveBeenCalledWith(TEST_USER_ID, { resetGoals: false });
  });

  it("starts restart in reset mode only when requested", async () => {
    const res = await fetch(`${baseUrl}/api/onboarding/restart`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "reset" }),
    });

    expect(res.status).toBe(200);
    expect(storageStub.restartOnboarding).toHaveBeenCalledWith(TEST_USER_ID, { resetGoals: true });
  });
});

describe("onboarding completion metadata", () => {
  it("persists v2 metadata on voice completion", async () => {
    const res = await fetch(`${baseUrl}/api/onboarding/voice-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [], onboardingVersion: "v2" }),
    });

    expect(res.status).toBe(200);
    expect(storageStub.updateUser).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({
        onboardingCompleted: true,
        onboardingVersion: "v2",
        onboardingSource: "new_user",
      }),
    );
  });

  it("preserves manual_restart source when completing after restart", async () => {
    storageStub.getUser.mockResolvedValue({ id: TEST_USER_ID, onboardingSource: "manual_restart" });
    const res = await fetch(`${baseUrl}/api/onboarding/voice-complete`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: [] }),
    });

    expect(res.status).toBe(200);
    expect(storageStub.updateUser).toHaveBeenCalledWith(
      TEST_USER_ID,
      expect.objectContaining({
        onboardingSource: "manual_restart",
        onboardingVersion: "v1",
      }),
    );
  });
});
