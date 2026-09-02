import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express, { type Express, type NextFunction, type Request, type Response } from "express";
import type { Server } from "http";
import {
  applyFocusWindowGuardrail,
  createFocusWindow,
  normalizeAssignments,
  recommendPriorityAssignments,
  type OnboardingProfileContext,
  type PrioritizationSnapshot,
} from "@shared/onboardingPrioritization";

const TEST_USER_ID = "u_prioritization_test";
const dbState: {
  profile?: {
    id: string;
    userId: string;
    priorities?: string[];
    profileContext?: OnboardingProfileContext;
    prioritySnapshot?: PrioritizationSnapshot;
  };
} = {};

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
  getOnboardingProfile: vi.fn(async () => undefined),
  createOnboardingProfile: vi.fn(async () => ({ id: "profile-1" })),
  updateOnboardingProfile: vi.fn(async () => ({ id: "profile-1" })),
};

vi.mock("../storage", () => ({ storage: storageStub }));
vi.mock("../db", () => ({
  db: {
    transaction: async (
      callback: (tx: {
        execute: () => Promise<unknown[]>;
        select: () => {
          from: () => {
            where: () => {
              limit: () => Promise<unknown[]>;
            };
          };
        };
        update: () => {
          set: (data: Record<string, unknown>) => {
            where: () => Promise<void>;
          };
        };
        insert: () => {
          values: (data: Record<string, unknown>) => Promise<void>;
        };
      }) => Promise<unknown>
    ) =>
      callback({
        execute: async () => [],
        select: () => ({
          from: () => ({
            where: () => ({
              limit: async () => (dbState.profile ? [dbState.profile] : []),
            }),
          }),
        }),
        update: () => ({
          set: (data) => ({
            where: async () => {
              dbState.profile = {
                ...(dbState.profile ?? { id: "profile-1", userId: TEST_USER_ID }),
                ...data,
              };
            },
          }),
        }),
        insert: () => ({
          values: async (data) => {
            dbState.profile = {
              id: "profile-1",
              userId: TEST_USER_ID,
              ...data,
            } as typeof dbState.profile;
          },
        }),
      }),
  },
}));

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
  dbState.profile = undefined;
});

describe("recommendPriorityAssignments", () => {
  it("always returns 3 protect and 2 active growth assignments", () => {
    const result = recommendPriorityAssignments([
      { areaId: "physical", currentState: 3, importance: 10, urgency: true, energyDrain: true },
      { areaId: "mental", currentState: 4, importance: 9, urgency: true, energyDrain: false },
      { areaId: "spiritual", currentState: 7, importance: 5, urgency: false, energyDrain: false },
      { areaId: "financial", currentState: 2, importance: 8, urgency: true, energyDrain: true },
      {
        areaId: "relationships",
        currentState: 6,
        importance: 9,
        urgency: false,
        energyDrain: true,
      },
      { areaId: "career", currentState: 5, importance: 8, urgency: false, energyDrain: false },
      { areaId: "learning", currentState: 5, importance: 6, urgency: false, energyDrain: false },
      { areaId: "environment", currentState: 8, importance: 4, urgency: false, energyDrain: false },
      { areaId: "creativity", currentState: 4, importance: 7, urgency: false, energyDrain: true },
      { areaId: "fun", currentState: 8, importance: 3, urgency: false, energyDrain: false },
      { areaId: "rest", currentState: 3, importance: 10, urgency: true, energyDrain: true },
      { areaId: "identity", currentState: 4, importance: 8, urgency: false, energyDrain: true },
    ]);

    expect(result.assignments.filter((item) => item.bucket === "protect")).toHaveLength(3);
    expect(result.assignments.filter((item) => item.bucket === "active_growth")).toHaveLength(2);
    expect(result.assignments.filter((item) => item.bucket === "background")).toHaveLength(7);
  });
});

describe("applyFocusWindowGuardrail", () => {
  it("allows one weekly micro-adjustment but blocks a second change in the same week", () => {
    const start = new Date("2026-09-01T00:00:00.000Z");
    const baseAssignments = normalizeAssignments([]);
    const firstShift = baseAssignments.map((assignment) =>
      assignment.areaId === "physical" ? { ...assignment, bucket: "protect" as const } : assignment
    );

    const first = applyFocusWindowGuardrail({
      existingFocusWindow: createFocusWindow(start),
      previousAssignments: baseAssignments,
      nextAssignments: firstShift,
      now: new Date("2026-09-03T12:00:00.000Z"),
    });

    expect(first.allowed).toBe(true);
    expect(first.status).toBe("adjusted");

    const secondShift = firstShift.map((assignment) =>
      assignment.areaId === "mental" ? { ...assignment, bucket: "protect" as const } : assignment
    );
    const second = applyFocusWindowGuardrail({
      existingFocusWindow: first.focusWindow,
      previousAssignments: firstShift,
      nextAssignments: secondShift,
      now: new Date("2026-09-05T12:00:00.000Z"),
    });

    expect(second.allowed).toBe(false);
    expect(second.requiresOverride).toBe(true);
  });
});

describe("POST /api/onboarding/prioritization", () => {
  it("persists multi-select reasons, free text, and a focused priority snapshot", async () => {
    const res = await fetch(`${baseUrl}/api/onboarding/prioritization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intents: ["reset", "assistant_support"],
        selectedReasons: ["overwhelmed", "clarify_focus"],
        reasonFreeText: "I'm juggling a lot and need help deciding what to protect first.",
        mode: "choose_for_me",
        signals: [
          { areaId: "physical", currentState: 3, importance: 10, urgency: true, energyDrain: true },
          { areaId: "mental", currentState: 4, importance: 9, urgency: true, energyDrain: false },
          {
            areaId: "spiritual",
            currentState: 7,
            importance: 5,
            urgency: false,
            energyDrain: false,
          },
          { areaId: "financial", currentState: 2, importance: 8, urgency: true, energyDrain: true },
          {
            areaId: "relationships",
            currentState: 6,
            importance: 9,
            urgency: false,
            energyDrain: true,
          },
          { areaId: "career", currentState: 5, importance: 8, urgency: false, energyDrain: false },
          {
            areaId: "learning",
            currentState: 5,
            importance: 6,
            urgency: false,
            energyDrain: false,
          },
          {
            areaId: "environment",
            currentState: 8,
            importance: 4,
            urgency: false,
            energyDrain: false,
          },
          {
            areaId: "creativity",
            currentState: 4,
            importance: 7,
            urgency: false,
            energyDrain: true,
          },
          { areaId: "fun", currentState: 8, importance: 3, urgency: false, energyDrain: false },
          { areaId: "rest", currentState: 3, importance: 10, urgency: true, energyDrain: true },
          { areaId: "identity", currentState: 4, importance: 8, urgency: false, energyDrain: true },
        ],
      }),
    });

    expect(res.status).toBe(200);
    const created = dbState.profile as {
      profileContext: Record<string, unknown>;
      prioritySnapshot: PrioritizationSnapshot;
      priorities: string[];
    };

    expect(created.profileContext).toMatchObject({
      intents: ["reset", "assistant_support"],
      selectedReasons: ["overwhelmed", "clarify_focus"],
      reasonFreeText: "I'm juggling a lot and need help deciding what to protect first.",
    });
    expect(
      created.prioritySnapshot.assignments.filter((item) => item.bucket === "protect")
    ).toHaveLength(3);
    expect(
      created.prioritySnapshot.assignments.filter((item) => item.bucket === "active_growth")
    ).toHaveLength(2);
    expect(created.prioritySnapshot.assignments[0].why).toContain("scored");
    expect(created.priorities).toHaveLength(5);
  });

  it("rejects a full reshuffle during an active focus window unless override is explicit", async () => {
    const focusWindowStart = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
    const baseRecommendations = recommendPriorityAssignments([
      { areaId: "physical", currentState: 4, importance: 10, urgency: true, energyDrain: true },
      { areaId: "mental", currentState: 4, importance: 9, urgency: true, energyDrain: false },
      { areaId: "spiritual", currentState: 6, importance: 5, urgency: false, energyDrain: false },
      { areaId: "financial", currentState: 5, importance: 8, urgency: true, energyDrain: true },
      {
        areaId: "relationships",
        currentState: 5,
        importance: 9,
        urgency: false,
        energyDrain: true,
      },
      { areaId: "career", currentState: 5, importance: 8, urgency: false, energyDrain: false },
      { areaId: "learning", currentState: 5, importance: 6, urgency: false, energyDrain: false },
      { areaId: "environment", currentState: 8, importance: 4, urgency: false, energyDrain: false },
      { areaId: "creativity", currentState: 4, importance: 7, urgency: false, energyDrain: true },
      { areaId: "fun", currentState: 8, importance: 3, urgency: false, energyDrain: false },
      { areaId: "rest", currentState: 4, importance: 10, urgency: true, energyDrain: true },
      { areaId: "identity", currentState: 5, importance: 8, urgency: false, energyDrain: true },
    ]);
    dbState.profile = {
      id: "profile-1",
      userId: TEST_USER_ID,
      prioritySnapshot: {
        mode: "choose_for_me",
        formula: baseRecommendations.formula,
        signals: [],
        assignments: baseRecommendations.assignments,
        focusWindow: createFocusWindow(focusWindowStart),
        recommendedAt: focusWindowStart.toISOString(),
      },
    };

    const swapped = baseRecommendations.assignments.map((assignment, index) => ({
      ...assignment,
      bucket: index < 4 ? "background" : assignment.bucket,
    }));

    const res = await fetch(`${baseUrl}/api/onboarding/prioritization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intents: ["maintain"],
        selectedReasons: ["protect_progress"],
        reasonFreeText: "I only want to change things if I really need to.",
        mode: "manual",
        assignments: swapped,
      }),
    });

    expect(res.status).toBe(409);
    expect(dbState.profile?.prioritySnapshot?.assignments).toEqual(baseRecommendations.assignments);
  });

  it("persists the submitted choose-for-me assignments instead of recomputing them on save", async () => {
    const displayedSignals = [
      { areaId: "physical", currentState: 3, importance: 10, urgency: true, energyDrain: true },
      { areaId: "mental", currentState: 4, importance: 9, urgency: true, energyDrain: false },
      { areaId: "spiritual", currentState: 7, importance: 5, urgency: false, energyDrain: false },
      { areaId: "financial", currentState: 2, importance: 8, urgency: true, energyDrain: true },
      {
        areaId: "relationships",
        currentState: 6,
        importance: 9,
        urgency: false,
        energyDrain: true,
      },
      { areaId: "career", currentState: 5, importance: 8, urgency: false, energyDrain: false },
      { areaId: "learning", currentState: 5, importance: 6, urgency: false, energyDrain: false },
      { areaId: "environment", currentState: 8, importance: 4, urgency: false, energyDrain: false },
      { areaId: "creativity", currentState: 4, importance: 7, urgency: false, energyDrain: true },
      { areaId: "fun", currentState: 8, importance: 3, urgency: false, energyDrain: false },
      { areaId: "rest", currentState: 3, importance: 10, urgency: true, energyDrain: true },
      { areaId: "identity", currentState: 4, importance: 8, urgency: false, energyDrain: true },
    ] as const;
    const displayedAssignments = recommendPriorityAssignments(displayedSignals).assignments;
    const changedSignals = displayedSignals.map((signal) =>
      signal.areaId === "physical"
        ? { ...signal, currentState: 10, importance: 1, urgency: false, energyDrain: false }
        : signal
    );

    const res = await fetch(`${baseUrl}/api/onboarding/prioritization`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        intents: ["assistant_support"],
        selectedReasons: ["support_decisions"],
        reasonFreeText: "Keep the recommendation I already reviewed.",
        mode: "choose_for_me",
        signals: changedSignals,
        assignments: displayedAssignments,
      }),
    });
    expect(res.status).toBe(200);
    expect(res.status).toBe(200);
    const created = dbState.profile as {
      prioritySnapshot: PrioritizationSnapshot;
    };

    expect(created.prioritySnapshot.assignments).toEqual(displayedAssignments);
  });
});
