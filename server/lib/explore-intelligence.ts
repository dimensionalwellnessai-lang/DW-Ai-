export type EvidenceState =
  | "Observed"
  | "User reported"
  | "Inferred"
  | "Predicted"
  | "Hypothesized"
  | "Unknown"
  | "Symbolic interpretation";

export type ConfidenceLevel = "high" | "medium" | "low";

export interface ExploreBaseCard {
  id: string;
  type: "article" | "video" | "quote" | "fact" | "spiritual" | "lesson" | "topic";
  bucket: "for_you" | "explore" | "random";
  title: string;
  summary: string;
  synopsis: string;
  dwConnection: string;
  url: string;
  source: string;
  dimension: string;
  readTime: string;
}

export interface SavedContentItem {
  id: string;
  contentType: string | null;
  title: string;
  description: string | null;
  url: string | null;
  source: string | null;
  duration: string | null;
}

export interface ExploreIntelligenceCard extends ExploreBaseCard {
  recommendationClass: "strong" | "adjacent" | "timely" | "discovery";
  explainLabel: string;
  evidenceState: EvidenceState;
  confidence: ConfidenceLevel;
  lens: "observed" | "symbolic";
  explainConnection: string;
}

export interface ExploreSection {
  key:
    | "continue_exploring"
    | "most_relevant"
    | "from_interests"
    | "connections"
    | "something_new"
    | "world_talking"
    | "happening_near"
    | "browse_topics";
  title:
    | "Continue Exploring"
    | "Most Relevant to You Now"
    | "From Your Interests"
    | "Connections You May Not Have Noticed"
    | "Something New"
    | "What the World Is Talking About"
    | "Happening Near You"
    | "Browse All Topics";
  cards: ExploreIntelligenceCard[];
}

export interface ExploreMixWeights {
  strong: number;
  adjacent: number;
  timely: number;
  discovery: number;
}

export interface ExploreIntelligenceBuildInput {
  cards: ExploreBaseCard[];
  savedContent: SavedContentItem[];
  interests: string[];
  goals: string[];
  astrologyEnabled: boolean;
  interactionCounts: {
    moreLikeThis: number;
    lessLikeThis: number;
    notInterested: number;
    saved: number;
  };
  configurableWeights?: Partial<ExploreMixWeights>;
}

const DEFAULT_WEIGHTS: ExploreMixWeights = {
  strong: 50,
  adjacent: 25,
  timely: 15,
  discovery: 10,
};

function normalizeWeights(weights: ExploreMixWeights): ExploreMixWeights {
  const total = Math.max(1, weights.strong + weights.adjacent + weights.timely + weights.discovery);
  return {
    strong: (weights.strong / total) * 100,
    adjacent: (weights.adjacent / total) * 100,
    timely: (weights.timely / total) * 100,
    discovery: (weights.discovery / total) * 100,
  };
}

export function applyAdaptiveWeights(
  baseWeights: ExploreMixWeights,
  interactionCounts: ExploreIntelligenceBuildInput["interactionCounts"],
): ExploreMixWeights {
  const adjusted = { ...baseWeights };

  const positiveSignal = interactionCounts.saved + interactionCounts.moreLikeThis;
  const negativeSignal = interactionCounts.notInterested + interactionCounts.lessLikeThis;

  if (positiveSignal > negativeSignal) {
    adjusted.strong += 8;
    adjusted.adjacent += 3;
    adjusted.discovery -= 4;
    adjusted.timely -= 2;
  }

  if (negativeSignal > positiveSignal) {
    adjusted.strong += 10;
    adjusted.adjacent -= 3;
    adjusted.discovery -= 4;
    adjusted.timely -= 3;
  }

  adjusted.strong = Math.max(35, adjusted.strong);
  adjusted.adjacent = Math.max(10, adjusted.adjacent);
  adjusted.timely = Math.max(5, adjusted.timely);
  adjusted.discovery = Math.max(5, adjusted.discovery);

  return normalizeWeights(adjusted);
}

function createExplainLabel(card: ExploreBaseCard, goals: string[], interests: string[]): string {
  const firstGoal = goals[0];
  const firstInterest = interests[0];

  if (card.bucket === "for_you" && firstGoal) {
    return `Because you're building ${firstGoal.toLowerCase()}`;
  }
  if (card.bucket === "explore" && firstInterest) {
    return `Connected to your ${firstInterest.toLowerCase()} interests`;
  }
  if (card.bucket === "random") {
    return "A new direction for you";
  }
  return "Useful this week";
}

function toCard(
  card: ExploreBaseCard,
  recommendationClass: ExploreIntelligenceCard["recommendationClass"],
  goals: string[],
  interests: string[],
): ExploreIntelligenceCard {
  const evidenceState: EvidenceState =
    recommendationClass === "strong"
      ? "Observed"
      : recommendationClass === "adjacent"
        ? "Inferred"
        : recommendationClass === "timely"
          ? "Predicted"
          : "Hypothesized";

  const confidence: ConfidenceLevel =
    recommendationClass === "strong"
      ? "high"
      : recommendationClass === "adjacent"
        ? "medium"
        : "low";

  return {
    ...card,
    recommendationClass,
    explainLabel: createExplainLabel(card, goals, interests),
    evidenceState,
    confidence,
    lens: "observed",
    explainConnection: card.dwConnection,
  };
}

function pickUnique<T extends { id: string }>(items: T[], count: number, used: Set<string>): T[] {
  const selected: T[] = [];
  for (const item of items) {
    if (selected.length >= count) break;
    if (used.has(item.id)) continue;
    used.add(item.id);
    selected.push(item);
  }
  return selected;
}

function quotaFromWeights(weights: ExploreMixWeights, total: number): ExploreMixWeights {
  return {
    strong: Math.max(1, Math.round((weights.strong / 100) * total)),
    adjacent: Math.max(1, Math.round((weights.adjacent / 100) * total)),
    timely: Math.max(1, Math.round((weights.timely / 100) * total)),
    discovery: Math.max(1, Math.round((weights.discovery / 100) * total)),
  };
}

function createTopicCards(goals: string[], interests: string[]): ExploreIntelligenceCard[] {
  const topics = [...goals.slice(0, 2), ...interests.slice(0, 4)].filter(Boolean);
  return topics.map((topic, index) => ({
    id: `topic-${index}-${topic.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    type: "topic",
    bucket: "explore",
    title: topic,
    summary: "Browse resources connected to this topic.",
    synopsis: `This topic is kept in Explore so you can browse deliberately when the timing feels right.`,
    dwConnection: "Quality over quantity: return when this topic is relevant.",
    url: "",
    source: "DW Topics",
    dimension: "general",
    readTime: "Browse",
    recommendationClass: "adjacent",
    explainLabel: `Connected to your ${topic.toLowerCase()} interests`,
    evidenceState: "User reported",
    confidence: "high",
    lens: "observed",
    explainConnection: "Added because you explicitly shared this interest or active direction.",
  }));
}

function createLocalCards(interests: string[]): ExploreIntelligenceCard[] {
  const seeds = interests.slice(0, 2);
  if (seeds.length === 0) return [];

  return seeds.map((interest, index) => ({
    id: `local-${index}-${interest.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    type: "article",
    bucket: "explore",
    title: `${interest} events near you`,
    summary: `A gentle prompt to check nearby opportunities related to ${interest.toLowerCase()}.`,
    synopsis: `Try one local search this week for ${interest.toLowerCase()} meetups, workshops, or community events. You can save it for later if now isn't the right moment.`,
    dwConnection: "Local context can make follow-through easier than purely online browsing.",
    url: "",
    source: "DW Local",
    dimension: "social",
    readTime: "5 min",
    recommendationClass: "timely",
    explainLabel: "Useful this week",
    evidenceState: "User reported",
    confidence: "medium",
    lens: "observed",
    explainConnection: "Built from interests you shared so discovery stays practical and nearby.",
  }));
}

function createSymbolicCard(interests: string[]): ExploreIntelligenceCard {
  const focus = interests[0] || "reflection";
  return {
    id: `symbolic-${focus.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    type: "spiritual",
    bucket: "random",
    title: `Symbolic lens: ${focus}`,
    summary: "Optional astrology-inspired reflection prompt for this week.",
    synopsis:
      "Symbolic interpretation only: this is not observed fact. If this framing feels useful, use it as a reflection prompt alongside your observed context.",
    dwConnection: "Separate symbolic insight from observed data and choose what feels supportive.",
    url: "",
    source: "DW Symbolic",
    dimension: "spiritual",
    readTime: "1 min",
    recommendationClass: "discovery",
    explainLabel: "Symbolic interpretation only",
    evidenceState: "Symbolic interpretation",
    confidence: "low",
    lens: "symbolic",
    explainConnection: "Included only because astrology is enabled in your settings.",
  };
}

export function buildExploreIntelligenceFeed(input: ExploreIntelligenceBuildInput): {
  cards: ExploreIntelligenceCard[];
  sections: ExploreSection[];
  mixWeights: ExploreMixWeights;
} {
  const configured: ExploreMixWeights = normalizeWeights({
    strong: input.configurableWeights?.strong ?? DEFAULT_WEIGHTS.strong,
    adjacent: input.configurableWeights?.adjacent ?? DEFAULT_WEIGHTS.adjacent,
    timely: input.configurableWeights?.timely ?? DEFAULT_WEIGHTS.timely,
    discovery: input.configurableWeights?.discovery ?? DEFAULT_WEIGHTS.discovery,
  });
  const adaptiveWeights = applyAdaptiveWeights(configured, input.interactionCounts);

  const strongPool = input.cards.filter((card) => card.bucket === "for_you").map((card) => toCard(card, "strong", input.goals, input.interests));
  const adjacentPool = input.cards.filter((card) => card.bucket === "explore").map((card) => toCard(card, "adjacent", input.goals, input.interests));
  const discoveryPool = input.cards.filter((card) => card.bucket === "random").map((card) => toCard(card, "discovery", input.goals, input.interests));

  const timelySource = [...strongPool, ...adjacentPool].filter(
    (card) => /youtube|ted|news|harvard|today|week/i.test(`${card.source} ${card.title}`),
  );
  const timelyPool = (timelySource.length > 0 ? timelySource : [...strongPool]).map((card) => ({
    ...card,
    recommendationClass: "timely" as const,
    evidenceState: "Predicted" as const,
    confidence: "low" as const,
    explainLabel: "Useful this week",
  }));

  const quotas = quotaFromWeights(adaptiveWeights, 12);
  const used = new Set<string>();

  const mostRelevant = pickUnique(strongPool, quotas.strong, used);
  const fromInterests = pickUnique(adjacentPool, quotas.adjacent, used);
  const worldTalking = timelyPool.slice(0, quotas.timely).map((card) => ({
    ...card,
    id: `${card.id}-timely`,
  }));
  const somethingNew = pickUnique(discoveryPool, quotas.discovery, used);

  const continueExploring = input.savedContent.slice(0, 4).map((item, index) => ({
    id: `continue-${item.id || index}`,
    type: item.contentType === "video" ? "video" : "article",
    bucket: "for_you" as const,
    title: item.title,
    summary: item.description || "Saved earlier for a calmer return when timing is right.",
    synopsis: item.description || "Saved earlier for a calmer return when timing is right.",
    dwConnection: "You saved this earlier. Continue only if it still feels useful.",
    url: item.url || "",
    source: item.source || "Saved",
    dimension: "general",
    readTime: item.duration || "Resume",
    recommendationClass: "strong" as const,
    explainLabel: "Because you saved this earlier",
    evidenceState: "Observed" as const,
    confidence: "high" as const,
    lens: "observed" as const,
    explainConnection: "Directly based on your prior save action.",
  }));

  const connections = [...mostRelevant.slice(0, 1), ...fromInterests.slice(0, 2)].map((card) => ({
    ...card,
    id: `${card.id}-connection`,
    recommendationClass: "adjacent" as const,
    evidenceState: "Inferred" as const,
    confidence: "medium" as const,
    explainLabel: card.explainLabel.startsWith("Connected") ? card.explainLabel : `Connected to your ${card.dimension} patterns`,
    explainConnection: `${card.dwConnection} This connection is inferred from your goals, interests, and prior interactions.`,
  }));

  if (input.astrologyEnabled) {
    connections.unshift(createSymbolicCard(input.interests));
  }

  const happeningNear = createLocalCards(input.interests);
  const browseTopics = createTopicCards(input.goals, input.interests);

  const sections: ExploreSection[] = [
    { key: "continue_exploring", title: "Continue Exploring", cards: continueExploring },
    { key: "most_relevant", title: "Most Relevant to You Now", cards: mostRelevant },
    { key: "from_interests", title: "From Your Interests", cards: fromInterests },
    { key: "connections", title: "Connections You May Not Have Noticed", cards: connections },
    { key: "something_new", title: "Something New", cards: somethingNew },
    { key: "world_talking", title: "What the World Is Talking About", cards: worldTalking },
    { key: "happening_near", title: "Happening Near You", cards: happeningNear },
    { key: "browse_topics", title: "Browse All Topics", cards: browseTopics },
  ].filter((section) => section.cards.length > 0);

  const cards = sections.flatMap((section) => section.cards);

  return {
    cards,
    sections,
    mixWeights: adaptiveWeights,
  };
}
