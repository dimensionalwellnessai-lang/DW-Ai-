/**
 * The Current — `/feed`
 *
 * Feed stream for `/feed`.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { Constellation, type ZoneId } from "@/components/constellation";
import {
  Bookmark,
  ExternalLink,
  Heart,
  Loader2,
  RefreshCw,
  Search,
  ShieldOff,
  Sparkles,
  Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface FeedItem {
  id: string;
  title: string;
  description: string;
  type: string;
  mix?: string;
  streamBucket?: "constructive" | "recreational" | "social";
  category: string | null;
  source: string;
  duration: string | null;
  thumbnail: string | null;
  url: string;
  route: string | null;
  liked: boolean;
  favorited: boolean;
  saved: boolean;
  zone?: ZoneId;
  whyForYou?: string;
  timingNote?: string;
}

interface FeedResponse {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

const MIX_LABELS: Record<string, string> = {
  constructive: "Zone fuel",
  recreational: "Enjoy",
  social: "What's happening",
};

const MIX_COLORS: Record<string, string> = {
  constructive: "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/20",
  recreational: "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/20",
  social: "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/20",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Videos" },
  { id: "meme", label: "Memes" },
  { id: "quote", label: "Quotes" },
  { id: "audio", label: "Audio" },
  { id: "cosmic_update", label: "Cosmic" },
  { id: "social", label: "Social" },
];

export default function FeedPage() {
  usePageMeta(
    "The Current",
    "A stream of things worth your attention — constructive, recreational, and in the moment.",
  );

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"relevant" | "latest">("relevant");
  const loaderRef = useRef<HTMLDivElement | null>(null);
  const pullStartRef = useRef<number | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("filter", filter);
    params.set("sort", sort);
    params.set("limit", "12");
    return params.toString();
  }, [filter, search, sort]);

  const feedQuery = useInfiniteQuery<FeedResponse>({
    queryKey: ["/api/feed", queryString],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const response = await apiRequest("GET", `/api/feed?${queryString}&cursor=${pageParam}`);
      return response.json();
    },
    getNextPageParam: (lastPage) => (lastPage.hasMore ? lastPage.nextCursor : undefined),
    staleTime: 60_000,
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, refetch } = feedQuery;

  const interactionMutation = useMutation<void, Error, {
    item: FeedItem;
    action: "like" | "favorite" | "save" | "hide";
  }>({
    mutationFn: async ({ item, action }) => {
      await apiRequest("POST", "/api/feed/interactions", {
        contentId: item.id,
        contentTitle: item.title,
        contentType: item.type,
        contentUrl: item.url,
        collectionKey: item.category ?? undefined,
        action,
      });

      if (action === "save" && !item.saved) {
        await apiRequest("POST", "/api/saved-content", {
          contentType: item.type,
          title: item.title,
          description: item.description,
          url: item.url,
          source: item.source,
          duration: item.duration ?? undefined,
          thumbnail: item.thumbnail ?? undefined,
        });
      }
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["/api/feed"] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-content"] });
      const messages: Record<string, string> = {
        like: "This hit your Zone — noted.",
        favorite: "Added to your signal.",
        save: "Saved.",
        hide: "Making space.",
      };
      toast({ title: "Got it", description: messages[variables.action] });
    },
    onError: (error) => {
      toast({
        title: "Couldn't update that yet",
        description: parseApiError(error),
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    const node = loaderRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0];
        if (first?.isIntersecting && hasNextPage && !isFetchingNextPage) {
          void fetchNextPage();
        }
      },
      { rootMargin: "300px" },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  useEffect(() => {
    const onTouchStart = (event: TouchEvent) => {
      if (window.scrollY <= 0) {
        pullStartRef.current = event.touches[0]?.clientY ?? null;
      }
    };

    const onTouchMove = (event: TouchEvent) => {
      if (pullStartRef.current === null || window.scrollY > 0 || isRefetching) return;
      const y = event.touches[0]?.clientY ?? pullStartRef.current;
      if (y - pullStartRef.current > 90) {
        pullStartRef.current = null;
        void refetch();
      }
    };

    const onTouchEnd = () => {
      pullStartRef.current = null;
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [isRefetching, refetch]);

  const handleOpen = (item: FeedItem) => {
    if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.route) setLocation(item.route);
  };

  const items = (feedQuery.data?.pages ?? []).flatMap((page) => page.items);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="The Current"
        subtitle="Your stream — fuel and flow, not homework"
        showBack={false}
        icon={<Constellation state="idle" size={24} className="opacity-70" />}
      />

      <div className="mx-auto max-w-2xl space-y-3 px-4 pb-28 pt-1">
        <Card className="border-border/50">
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search the current"
                className="pl-9"
              />
            </div>

            <div className="overflow-x-auto">
              <div className="flex min-w-max gap-2">
                {FILTERS.map((chip) => (
                  <button
                    type="button"
                    key={chip.id}
                    onClick={() => setFilter(chip.id)}
                    aria-pressed={filter === chip.id}
                    className={cn(
                      "rounded-full border px-4 py-1.5 text-xs font-medium transition-all min-h-11",
                      filter === chip.id
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border/50 text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Sort
              </span>
              <Button
                size="sm"
                variant={sort === "relevant" ? "default" : "ghost"}
                className="min-h-11"
                onClick={() => setSort("relevant")}
              >
                Relevant
              </Button>
              <Button
                size="sm"
                variant={sort === "latest" ? "default" : "ghost"}
                className="min-h-11"
                onClick={() => setSort("latest")}
              >
                Latest
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-h-11"
                disabled={isRefetching}
                onClick={() => void refetch()}
              >
                {isRefetching ? (
                  <>
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    Refreshing…
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {feedQuery.isLoading && (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Pulling your stream…
          </div>
        )}

        {feedQuery.isError && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="font-medium">The Current paused.</p>
              <p className="text-sm text-muted-foreground">
                Nothing wrong on your end — try refreshing.
              </p>
              <Button variant="outline" size="sm" onClick={() => void refetch()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 && (
          <div className="py-12 text-center text-sm text-muted-foreground">
            <p>Nothing here yet.</p>
            <p className="mt-1 text-xs">Try a different filter or pull to refresh.</p>
          </div>
        )}

        {items.map((item) => (
          <FeedCard
            key={`${item.id}-${item.url}`}
            item={item}
            onOpen={handleOpen}
            onInteract={(action) => interactionMutation.mutate({ item, action })}
          />
        ))}

        {!feedQuery.isLoading && !feedQuery.isError && (
          <div ref={loaderRef} className="py-6 text-center text-xs text-muted-foreground">
            {isFetchingNextPage ? (
              <Loader2 className="mx-auto h-4 w-4 animate-spin" />
            ) : hasNextPage ? (
              "Scroll for more"
            ) : (
              "You're caught up"
            )}
          </div>
        )}
      </div>
    </div>
  );
}

interface FeedCardProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  onInteract: (action: "like" | "favorite" | "save" | "hide") => void;
}

function FeedCard({ item, onOpen, onInteract }: FeedCardProps) {
  const mixKey =
    (item.mix && MIX_LABELS[item.mix] && MIX_COLORS[item.mix] ? item.mix : null) ??
    (item.streamBucket ? item.streamBucket : null);
  const mixLabel = mixKey ? MIX_LABELS[mixKey] : null;
  const mixColor = mixKey ? MIX_COLORS[mixKey] : null;

  return (
    <Card className="overflow-hidden border-border/50">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            {mixLabel && mixColor && (
              <span
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] font-medium",
                  mixColor,
                )}
              >
                {mixLabel}
              </span>
            )}
          </div>
          {item.zone && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Constellation zone={item.zone} state="idle" size={14} />
              <span className="capitalize">{item.zone}</span>
            </div>
          )}
        </div>

        <div>
          <h3 className="text-sm font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
            {item.description}
          </p>
          {item.duration && (
            <p className="mt-1 text-[11px] text-muted-foreground/70">{item.duration}</p>
          )}
        </div>

        {item.whyForYou && (
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/40 px-3 py-2">
            <Sparkles className="mt-0.5 h-3 w-3 shrink-0 text-primary" />
            <p className="text-[11px] leading-snug text-muted-foreground">{item.whyForYou}</p>
          </div>
        )}

        {item.timingNote && (
          <p className="text-[11px] italic text-muted-foreground/60">{item.timingNote}</p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <span className="text-[11px] text-muted-foreground">{item.source}</span>
          <div className="flex flex-wrap items-center justify-end gap-1">
            <button
              type="button"
              onClick={() => onInteract("like")}
              aria-label="This hit my Zone"
              aria-pressed={item.liked}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                item.liked
                  ? "bg-rose-500/10 text-rose-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Heart className="h-4 w-4" strokeWidth={item.liked ? 2.5 : 1.8} />
            </button>

            <button
              type="button"
              onClick={() => onInteract("favorite")}
              aria-label="Favorite"
              aria-pressed={item.favorited}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                item.favorited
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Star className="h-4 w-4" strokeWidth={item.favorited ? 2.4 : 1.8} />
            </button>

            <button
              type="button"
              onClick={() => onInteract("save")}
              aria-label="Save"
              aria-pressed={item.saved}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                item.saved
                  ? "bg-sky-500/10 text-sky-500"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Bookmark className="h-4 w-4" strokeWidth={item.saved ? 2.5 : 1.8} />
            </button>

            <button
              type="button"
              onClick={() => onInteract("hide")}
              aria-label="Not for me"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
            >
              <ShieldOff className="h-4 w-4" strokeWidth={1.8} />
            </button>

            {(item.route || item.url.startsWith("http")) && (
              <button
                type="button"
                onClick={() => onOpen(item)}
                aria-label="Open"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground"
              >
                <ExternalLink className="h-4 w-4" strokeWidth={1.8} />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
