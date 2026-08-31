import { describe, expect, it } from "vitest";
import { rankFeedItems, type FeedEngineItem } from "../../feed-engine";

const context = {
  currents: {
    gut: "hardwired",
    wave: "variable",
    spark: "open",
    will: "variable",
    voice: "open",
    mind: "hardwired",
    flow: "variable",
    drive: "hardwired",
    light: "open",
  } as const,
  energyType: "Guide" as const,
  decisionCompass: "Wave" as const,
  zones: {
    physical: { level: 2, trend: "dim" },
    mental: { level: 3, trend: "flickering" },
    spiritual: { level: 3, trend: "flickering" },
    financial: { level: 3, trend: "flickering" },
    relationships: { level: 3, trend: "flickering" },
    career: { level: 3, trend: "flickering" },
    learning: { level: 3, trend: "flickering" },
    environment: { level: 3, trend: "flickering" },
    creativity: { level: 3, trend: "flickering" },
    fun: { level: 3, trend: "flickering" },
    community: { level: 3, trend: "flickering" },
    rest: { level: 2, trend: "dim" },
    identity: { level: 3, trend: "flickering" },
  },
  cosmicWeather: { activeCurrents: ["Wave Current"], moonPhase: "Full Moon" },
  interests: { deepDives: ["fitness"], currentObsessions: [], popCulture: [], spiritualCuriosity: [] },
  patterns: {},
};

const items: FeedEngineItem[] = [
  {
    id: "1",
    title: "Body reset walk",
    description: "Light physical routine",
    type: "article",
    category: "physical",
    source: "DW",
    duration: null,
    thumbnail: null,
    url: "https://example.com/a",
    route: null,
    createdAt: "2026-01-01",
  },
  {
    id: "2",
    title: "Communication meme throwback",
    description: "nostalgia meme",
    type: "meme",
    category: "fun",
    source: "DW",
    duration: null,
    thumbnail: null,
    url: "https://example.com/b",
    route: null,
    createdAt: "2026-01-02",
  },
];

describe("rankFeedItems", () => {
  it("adds why-for-you and paging metadata", () => {
    const result = rankFeedItems(items, {
      context,
      query: "",
      filter: "all",
      sort: "relevant",
      offset: 0,
      limit: 1,
    });

    expect(result.items).toHaveLength(1);
    expect(result.items[0].whyForYou).toContain("Zone");
    expect(typeof result.hasMore).toBe("boolean");
  });

  it("filters searches by text match before personalization boosts", () => {
    const result = rankFeedItems(
      [
        {
          ...items[0],
          favorited: true,
        },
      ],
      {
        context,
        query: "nostalgia",
        filter: "all",
        sort: "relevant",
        offset: 0,
        limit: 5,
      },
    );

    expect(result.items).toHaveLength(0);
  });

  it("preserves latest ordering within each bucket while balancing the mix", () => {
    const result = rankFeedItems(
      [
        {
          ...items[0],
          id: "constructive-new",
          createdAt: "2026-01-04",
        },
        {
          ...items[0],
          id: "constructive-old",
          createdAt: "2026-01-01",
        },
        {
          ...items[1],
          id: "recreational-new",
          createdAt: "2026-01-03",
        },
        {
          ...items[1],
          id: "recreational-old",
          createdAt: "2026-01-02",
        },
      ],
      {
        context,
        query: "",
        filter: "all",
        sort: "latest",
        offset: 0,
        limit: 4,
      },
    );

    expect(result.items.map((item) => item.id)).toEqual([
      "constructive-new",
      "recreational-new",
      "constructive-old",
      "recreational-old",
    ]);
  });
});
