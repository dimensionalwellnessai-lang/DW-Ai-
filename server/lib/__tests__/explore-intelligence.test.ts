import { describe, expect, it } from "vitest";

import { applyAdaptiveWeights, buildExploreIntelligenceFeed } from "../explore-intelligence";

describe("explore intelligence mix", () => {
  it("keeps configured weights normalized and adaptive", () => {
    const adjusted = applyAdaptiveWeights(
      { strong: 50, adjacent: 25, timely: 15, discovery: 10 },
      { moreLikeThis: 3, lessLikeThis: 0, notInterested: 0, saved: 2 },
    );

    const total = adjusted.strong + adjusted.adjacent + adjusted.timely + adjusted.discovery;
    expect(Math.round(total)).toBe(100);
    expect(adjusted.strong).toBeGreaterThan(50);
  });

  it("builds required sections and keeps symbolic interpretation separate", () => {
    const feed = buildExploreIntelligenceFeed({
      cards: [
        {
          id: "1",
          type: "article",
          bucket: "for_you",
          title: "App architecture deep dive",
          summary: "Useful for your build.",
          synopsis: "Useful for your build.",
          dwConnection: "Connected to your active build work.",
          url: "https://example.com/a",
          source: "Web",
          dimension: "purpose",
          readTime: "5 min",
        },
        {
          id: "2",
          type: "video",
          bucket: "explore",
          title: "Yoruba history and modern identity",
          summary: "Adjacent to your interests.",
          synopsis: "Adjacent to your interests.",
          dwConnection: "Connected to your Yoruba studies.",
          url: "https://example.com/b",
          source: "YouTube",
          dimension: "social",
          readTime: "Watch",
        },
        {
          id: "3",
          type: "fact",
          bucket: "random",
          title: "Unexpected perspective",
          summary: "A new direction.",
          synopsis: "A new direction.",
          dwConnection: "Intentional discovery.",
          url: "",
          source: "DW",
          dimension: "intellectual",
          readTime: "1 min",
        },
      ],
      savedContent: [],
      interests: ["Yoruba studies"],
      goals: ["your app"],
      astrologyEnabled: true,
      interactionCounts: {
        moreLikeThis: 0,
        lessLikeThis: 0,
        notInterested: 0,
        saved: 0,
      },
    });

    const titles = feed.sections.map((section) => section.title);
    expect(titles).toContain("Most Relevant to You Now");
    expect(titles).toContain("From Your Interests");
    expect(titles).toContain("Something New");
    expect(titles).toContain("What the World Is Talking About");
    expect(titles).toContain("Connections You May Not Have Noticed");

    const symbolicCard = feed.cards.find((card) => card.lens === "symbolic");
    expect(symbolicCard?.evidenceState).toBe("Symbolic interpretation");
    expect(symbolicCard?.explainLabel).toContain("Symbolic interpretation");
  });
});
