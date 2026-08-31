import type { CompanionContext, ZoneId } from "./lib/companion-context";

export type FeedStreamBucket = "constructive" | "recreational" | "social";

export interface FeedEngineItem {
  id: string;
  title: string;
  description: string;
  type: string;
  category: string | null;
  source: string;
  duration: string | null;
  thumbnail: string | null;
  url: string;
  route: string | null;
  createdAt: string | null;
  liked?: boolean;
  favorited?: boolean;
  saved?: boolean;
}

export interface RankedFeedItem extends FeedEngineItem {
  relevance: number;
  streamBucket: FeedStreamBucket;
  whyForYou: string;
}

const ZONE_KEYWORDS: Array<{ zone: ZoneId; keywords: string[] }> = [
  { zone: "physical", keywords: ["physical", "body", "fitness", "nutrition", "workout", "food"] },
  { zone: "mental", keywords: ["mental", "mind", "emotional", "clarity"] },
  { zone: "spiritual", keywords: ["spiritual", "purpose", "meaning"] },
  { zone: "financial", keywords: ["financial", "money", "budget"] },
  { zone: "relationships", keywords: ["social", "relationship", "community"] },
  { zone: "career", keywords: ["career", "work", "occupational"] },
  { zone: "learning", keywords: ["learning", "intellectual", "study"] },
  { zone: "environment", keywords: ["environment", "nature", "space"] },
  { zone: "creativity", keywords: ["creative", "art"] },
  { zone: "fun", keywords: ["fun", "meme", "pop"] },
  { zone: "community", keywords: ["community", "group"] },
  { zone: "rest", keywords: ["rest", "sleep", "recovery"] },
  { zone: "identity", keywords: ["identity", "self"] },
];

function scoreText(value: string | null | undefined, query: string): number {
  const haystack = (value ?? "").toLowerCase();
  if (!haystack || !query) return 0;
  if (haystack === query) return 40;
  if (haystack.startsWith(query)) return 20;
  if (haystack.includes(query)) return 10;
  return 0;
}

function inferZone(item: FeedEngineItem): ZoneId {
  const hay = `${item.title} ${item.description} ${item.category ?? ""} ${item.type}`.toLowerCase();
  for (const row of ZONE_KEYWORDS) {
    if (row.keywords.some((k) => hay.includes(k))) return row.zone;
  }
  return "learning";
}

function inferBucket(item: FeedEngineItem): FeedStreamBucket {
  const type = item.type.toLowerCase();
  const category = (item.category ?? "").toLowerCase();
  if (type.includes("meme") || type.includes("quote") || category.includes("fun")) return "recreational";
  if (category.includes("community") || category.includes("social")) return "social";
  if (type.includes("audio") || type.includes("video") || type.includes("article")) return "constructive";
  return "recreational";
}

function buildWhyForYou(item: FeedEngineItem, context: CompanionContext): string {
  const zone = inferZone(item);
  const zoneState = context.zones[zone];
  const zoneLine = `${zone[0].toUpperCase()}${zone.slice(1)} Zone is ${zoneState.trend}`;
  const currentLine = context.cosmicWeather.activeCurrents[0]
    ? `${context.cosmicWeather.activeCurrents[0]} is active`
    : `${context.decisionCompass} decision compass timing`;

  const interest =
    context.interests.deepDives[0] ??
    context.interests.currentObsessions[0] ??
    context.interests.popCulture[0] ??
    "your current focus";

  return `${zoneLine} • ${currentLine} • matches ${interest}`;
}

function withElectricalRules(score: number, item: FeedEngineItem, context: CompanionContext): number {
  let next = score;
  const text = `${item.title} ${item.description} ${item.category ?? ""}`.toLowerCase();

  if (context.zones.physical.trend === "dim" && (text.includes("physical") || text.includes("workout") || text.includes("food"))) {
    next += 8;
  }

  if (
    context.cosmicWeather.activeCurrents.includes("Wave Current") &&
    (text.includes("emotional") || text.includes("reflection") || text.includes("long"))
  ) {
    next += 7;
  }

  if (context.cosmicWeather.activeCurrents.includes("Mercury Retrograde") && (text.includes("throwback") || text.includes("nostalgia") || text.includes("meme"))) {
    next += 6;
  }

  return next;
}

function rebalanceMix(items: RankedFeedItem[], limit: number): RankedFeedItem[] {
  const targets = {
    constructive: Math.round(limit * 0.4),
    recreational: Math.round(limit * 0.4),
    social: Math.max(1, limit - Math.round(limit * 0.4) - Math.round(limit * 0.4)),
  } as const;

  const pools: Record<FeedStreamBucket, RankedFeedItem[]> = {
    constructive: [],
    recreational: [],
    social: [],
  };

  for (const item of items) pools[item.streamBucket].push(item);
  (Object.keys(pools) as FeedStreamBucket[]).forEach((k) => pools[k].sort((a, b) => b.relevance - a.relevance));

  const picked: RankedFeedItem[] = [];
  (Object.keys(targets) as FeedStreamBucket[]).forEach((bucket) => {
    picked.push(...pools[bucket].slice(0, targets[bucket]));
  });

  if (picked.length < limit) {
    const remaining = items.filter((item) => !picked.includes(item));
    picked.push(...remaining.slice(0, limit - picked.length));
  }

  return picked.slice(0, limit);
}

export function rankFeedItems(
  items: FeedEngineItem[],
  options: {
    context: CompanionContext;
    query: string;
    filter: string;
    sort: "relevant" | "latest";
    offset: number;
    limit: number;
  },
): { items: RankedFeedItem[]; hasMore: boolean; nextCursor: number | null } {
  const ranked = items
    .map((item) => {
      const base =
        scoreText(item.title, options.query) +
        scoreText(item.description, options.query) +
        scoreText(item.category, options.query) +
        (item.favorited ? 3 : 0) +
        (item.liked ? 1 : 0);

      const relevance = withElectricalRules(base, item, options.context);
      return {
        ...item,
        relevance,
        streamBucket: inferBucket(item),
        whyForYou: buildWhyForYou(item, options.context),
      };
    })
    .filter((item) => {
      if (options.filter === "all") return true;
      const normalized = options.filter.toLowerCase();
      return item.type.toLowerCase() === normalized || (item.category ?? "").toLowerCase() === normalized;
    })
    .filter((item) => (options.query ? item.relevance > 0 : true))
    .sort((a, b) => {
      if (options.sort === "latest") {
        return (b.createdAt ?? "").localeCompare(a.createdAt ?? "");
      }
      return b.relevance - a.relevance || a.title.localeCompare(b.title);
    });

  const mixed = rebalanceMix(ranked, ranked.length);
  const paged = mixed.slice(options.offset, options.offset + options.limit);
  const nextOffset = options.offset + options.limit;

  return {
    items: paged,
    hasMore: nextOffset < mixed.length,
    nextCursor: nextOffset < mixed.length ? nextOffset : null,
  };
}
