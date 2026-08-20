import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Server } from "http";

const TEST_USER_ID = "u_accept_test";

vi.mock("../routes/_shared", () => ({
  requireAuth: (req: Request, _res: Response, next: NextFunction) => {
    (req as Request & { session: { userId: string } }).session = { userId: TEST_USER_ID };
    next();
  },
}));

vi.mock("../openai", () => ({
  openai: { chat: { completions: { create: vi.fn() } } },
  generateLifeSystemRecommendations: vi.fn(),
}));

const storageStub = {
  createGoals: vi.fn(async () => []),
  createHabits: vi.fn(async () => []),
  createRoutine: vi.fn(async () => ({ id: "routine-1" })),
  createCalendarEvent: vi.fn(async () => ({ id: "event-1" })),
  createProject: vi.fn(async () => ({ id: "project-1" })),
  getOnboardingProfile: vi.fn(async () => ({
    id: "profile-1",
    suggestedStructure: [],
  })),
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
  storageStub.createRoutine.mockResolvedValue({ id: "routine-1" });
});

describe("POST /api/onboarding/accept-suggestions", () => {
  it("installs accepted system suggestions as routines and recurring calendar entries", async () => {
    const res = await fetch(`${baseUrl}/api/onboarding/accept-suggestions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        suggestions: [
          {
            id: "sys-1",
            type: "system",
            title: "Morning reset",
            description: "A short morning routine to settle into the day.",
            sourceReason: "Suggested because mornings feel scattered.",
            status: "accepted",
          },
          {
            id: "plan-1",
            type: "plan",
            title: "Weekly planning",
            description: "A simple weekly reset.",
            sourceReason: "Suggested because you want more clarity.",
            status: "accepted",
          },
        ],
      }),
    });

    expect(res.status).toBe(200);
    expect(storageStub.createHabits).toHaveBeenCalledTimes(1);
    expect(storageStub.createRoutine).toHaveBeenCalledTimes(1);
    expect(storageStub.createRoutine).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        name: "Morning reset",
        dataSource: "onboarding",
      }),
    );
    expect(storageStub.createCalendarEvent).toHaveBeenCalledTimes(1);
    expect(storageStub.createCalendarEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: TEST_USER_ID,
        title: "Morning reset",
        eventType: "routine",
        isRecurring: true,
        linkedRoute: "/routines",
      }),
    );
    expect(storageStub.createProject).toHaveBeenCalledTimes(1);
  });
});
