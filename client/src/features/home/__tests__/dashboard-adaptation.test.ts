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

  it("returns no-calendar fallback when no schedule context exists", () => {
    const state = buildDashboardAdaptiveState(makeSummary(), {});
    expect(state.calendar.type).toBe("no_calendar");
    expect(state.calendar.path).toBe("/calendar");
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
