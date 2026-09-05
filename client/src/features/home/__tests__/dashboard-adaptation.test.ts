import { describe, expect, it } from "vitest";
import { buildDashboardAdaptiveState, deriveAdaptiveMode } from "../dashboard-adaptation";
import type { HomeSummary } from "../types";

function makeSummary(overrides: Partial<HomeSummary> = {}): HomeSummary {
  return {
    isLoading: false,
    userName: "Ari",
    nextEvent: null,
    activeGoals: [],
    activeHabits: [],
    latestInsight: null,
    latestJournalEntry: null,
    activeFollowUp: null,
    todayLabel: "Tuesday",
    nutritionSnapshot: null,
    lastConversationTopic: null,
    momentumData: {
      status: "green",
      reasons: [],
      suggestedFocus: null,
      isLoading: false,
      checkNow: () => {},
    },
    energyLevel: 7,
    moodLevel: 7,
    todayScheduleBlocks: [],
    todayEvents: [],
    proactiveCards: [],
    morningRoutines: [],
    eveningRoutines: [],
    ...overrides,
  };
}

describe("dashboard adaptation", () => {
  it("triggers reset mode for overwhelmed signals", () => {
    const summary = makeSummary({
      energyLevel: 3,
      momentumData: { status: "red", reasons: ["slipping"], suggestedFocus: null, isLoading: false, checkNow: () => {} },
    });
    const mode = deriveAdaptiveMode(summary, { selectedReasons: ["overwhelmed"] });
    expect(mode).toBe("reset");
  });

  it("triggers reset mode for an explicit reset intent", () => {
    const mode = deriveAdaptiveMode(makeSummary(), { intents: ["reset"] });
    expect(mode).toBe("reset");
  });

  it("returns no-calendar fallback when no schedule context exists", () => {
    const state = buildDashboardAdaptiveState(makeSummary(), {});
    expect(state.calendar.type).toBe("no_calendar");
    expect(state.calendar.path).toBe("/calendar");
  });

  it("uses schedule blocks for upcoming prep guidance", () => {
    const start = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    const end = new Date(Date.now() + 90 * 60 * 1000).toISOString();
    const state = buildDashboardAdaptiveState(
      makeSummary({
        todayScheduleBlocks: [{ id: 1, title: "Deep work", startTime: start, endTime: end }],
      }),
      {},
    );

    expect(state.calendar.type).toBe("upcoming_prep");
    expect(state.calendar.title).toBe("Prep for Deep work");
  });

  it("finds a focus window even when the previous block already started", () => {
    const state = buildDashboardAdaptiveState(
      makeSummary({
        todayEvents: [
          {
            id: 1,
            title: "Morning block",
            startTime: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
          },
          {
            id: 2,
            title: "Afternoon block",
            startTime: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
            endTime: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
          },
        ],
      }),
      {},
    );

    expect(state.calendar.type).toBe("focus_window");
    expect(state.calendar.body).toMatch(/free minutes around/i);
  });

  it("prioritizes recovery when schedule load is overloaded", () => {
    const state = buildDashboardAdaptiveState(
      makeSummary({
        todayEvents: Array.from({ length: 6 }, (_, index) => ({
          id: index + 1,
          title: `Event ${index + 1}`,
          startTime: new Date(Date.now() + (index + 1) * 60 * 60 * 1000).toISOString(),
          endTime: new Date(Date.now() + (index + 1) * 60 * 60 * 1000 + 30 * 60 * 1000).toISOString(),
        })),
        momentumData: { status: "green", reasons: [], suggestedFocus: null, isLoading: false, checkNow: () => {} },
      }),
      {
        priorityAssignments: [
          { areaId: "career", bucket: "protect", score: 8, why: "career", recommended: true },
          { areaId: "financial", bucket: "protect", score: 7, why: "financial", recommended: true },
        ],
      },
    );

    expect(state.mode).toBe("reset");
    expect(state.calendar.type).toBe("overload_recovery");
    expect(state.whatToDoNow.lane).toBe("stabilize");
  });

  it("uses globally ranked cards for what to do now", () => {
    const state = buildDashboardAdaptiveState(
      makeSummary({
        momentumData: { status: "green", reasons: [], suggestedFocus: null, isLoading: false, checkNow: () => {} },
      }),
      {
        priorityAssignments: [
          { areaId: "career", bucket: "protect", score: 8, why: "career", recommended: true },
          { areaId: "financial", bucket: "protect", score: 7, why: "financial", recommended: true },
        ],
      },
    );

    expect(state.whatToDoNow.id).toBe("calendar-plan");
    expect(state.telemetry.topLane).toBe("plan");
  });

  it("switches the habit recommendation to creation when no habits are active", () => {
    const state = buildDashboardAdaptiveState(makeSummary(), {});
    expect(state.whatToDoNow.id).toBe("habit-execute");
    expect(state.whatToDoNow.title).toBe("Create one habit");
  });

  it("applies environment and fun priority areas to ranking", () => {
    const state = buildDashboardAdaptiveState(
      makeSummary({
        momentumData: { status: "green", reasons: [], suggestedFocus: null, isLoading: false, checkNow: () => {} },
      }),
      {
        priorityAssignments: [
          { areaId: "environment", bucket: "protect", score: 8, why: "environment", recommended: true },
          { areaId: "fun", bucket: "protect", score: 7, why: "fun", recommended: true },
        ],
      },
    );

    const cardIds = state.lanes.flatMap((lane) => lane.cards.map((card) => card.id));
    expect(cardIds).toContain("recover-reset");
    expect(cardIds).toContain("feed-expand");
  });

  it("keeps ranking deterministic for identical inputs", () => {
    const summary = makeSummary({
      todayEvents: [
        { id: 1, title: "Planning", startTime: "2099-09-03T10:00:00.000Z", endTime: "2099-09-03T11:00:00.000Z" },
      ],
    });
    const context = {
      selectedReasons: ["clarify_focus"] as const,
      priorityAssignments: [{ areaId: "career", bucket: "protect", score: 8.2, why: "career urgent", recommended: true }],
    };
    const first = buildDashboardAdaptiveState(summary, context);
    const second = buildDashboardAdaptiveState(summary, context);
    expect(first.whatToDoNow.id).toBe(second.whatToDoNow.id);
    expect(first.lanes.map((lane) => lane.cards.map((card) => card.id))).toEqual(
      second.lanes.map((lane) => lane.cards.map((card) => card.id)),
    );
  });
});
