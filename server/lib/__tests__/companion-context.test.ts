import { beforeEach, describe, expect, it, vi } from "vitest";

const storageStub = {
  getBirthChart: vi.fn(async () => ({
    birthDate: "1990-01-01",
    birthTime: "08:30",
    birthCity: "Austin",
    birthState: "TX",
    birthCountry: "USA",
  })),
  getLifeDimensionAssessments: vi.fn(async () => ([
    { dimension: "physical", score: 5 },
    { dimension: "physical", score: 1 },
    { dimension: "social", score: 4 },
  ])),
  getUserInterests: vi.fn(async () => ({
    deepDives: ["fitness"],
    currentObsessions: ["gardening"],
    popCulture: ["music"],
    spiritualCuriosity: [],
  })),
  getWellnessPreferences: vi.fn(async () => ({
    useAstrologyInGuidance: false,
    traditions: ["Stoicism"],
  })),
  getOnboardingProfile: vi.fn(async () => ({
    peakMotivationTime: "morning",
  })),
  getGoals: vi.fn(async () => ([
    { wellnessDimension: "physical", title: "Walk at lunch" },
    { wellnessDimension: "social", title: "Call a friend" },
  ])),
};

vi.mock("../../storage", () => ({
  storage: storageStub,
}));

vi.mock("../energy-currents", () => ({
  calculateEnergyCurrents: vi.fn(() => ({
    currents: {
      gut: "hardwired",
      wave: "variable",
      spark: "open",
      will: "variable",
      voice: "open",
      mind: "hardwired",
      flow: "variable",
      drive: "open",
      light: "hardwired",
    },
    energyType: "Guide",
    decisionCompass: "Wave",
    activeCurrents: ["Mercury Retrograde"],
    moonPhase: "Full Moon",
  })),
}));

const { buildCompanionContext } = await import("../companion-context");

describe("buildCompanionContext", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("keeps the newest assessment per zone and sources interests from dedicated records", async () => {
    const context = await buildCompanionContext("user-1");

    expect(context.zones.physical.level).toBe(5);
    expect(context.zones.physical.lastAction).toBe("Walk at lunch");
    expect(context.zones.relationships.level).toBe(4);
    expect(context.interests.deepDives).toEqual(["fitness"]);
    expect(context.interests.spiritualCuriosity).toEqual(["Stoicism"]);
    expect(context.patterns.bestDecisionTime).toBe("morning");
  });

  it("omits cosmic weather when astrology consent is disabled", async () => {
    const context = await buildCompanionContext("user-1", { useAstrologyInGuidance: false });

    expect(context.cosmicWeather.activeCurrents).toEqual([]);
    expect(context.cosmicWeather.moonPhase).toBeNull();
  });
});
