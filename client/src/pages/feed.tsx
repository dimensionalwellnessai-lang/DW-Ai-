import { useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { Bookmark, ExternalLink, Heart, Loader2, Search, ShieldOff, Star } from "lucide-react";

interface FeedItem {
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
  liked: boolean;
  favorited: boolean;
  saved: boolean;
  streamBucket?: "constructive" | "recreational" | "social";
  whyForYou?: string;
}

interface FeedResponse {
  items: FeedItem[];
  hasMore: boolean;
  nextCursor: number | null;
}

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
  usePageMeta("The Current", "An infinite stream blending growth, fun, and community momentum.");

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
  });
  const { fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching, refetch } = feedQuery;

  const interactionMutation = useMutation({
    mutationFn: async ({ item, action }: { item: FeedItem; action: "like" | "favorite" | "save" | "hide" }) => {
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
        like: "Signal recorded.",
        favorite: "Pinned to your current.",
        save: "Saved for later.",
        hide: "We'll tune this out.",
      };
      toast({ title: "Noted", description: messages[variables.action] });
    },
    onError: (error) => {
      toast({ title: "Couldn't update that yet", description: parseApiError(error), variant: "destructive" });
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
    if (item.route) {
      setLocation(item.route);
    }
  };

  const items = (feedQuery.data?.pages ?? []).flatMap((page) => page.items);

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="The Current" showBack={false} />
      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search currents"
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {FILTERS.map((chip) => (
                <Button
                  key={chip.id}
                  type="button"
                  size="sm"
                  variant={filter === chip.id ? "default" : "outline"}
                  onClick={() => setFilter(chip.id)}
                >
                  {chip.label}
                </Button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Sort</span>
              <Button size="sm" variant={sort === "relevant" ? "default" : "ghost"} onClick={() => setSort("relevant")}>Relevant</Button>
              <Button size="sm" variant={sort === "latest" ? "default" : "ghost"} onClick={() => setSort("latest")}>Latest</Button>
              <Button size="sm" variant="outline" onClick={() => refetch()}>
                Refresh
              </Button>
            </div>
          </CardContent>
        </Card>

        {feedQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Tuning your current…
            </CardContent>
          </Card>
        )}

        {feedQuery.isError && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="font-medium text-foreground">Your current needs a second.</p>
              <Button variant="outline" onClick={() => refetch()}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 && (
          <Card>
            <CardContent className="space-y-2 p-6 text-center">
              <p className="font-medium text-foreground">No matches yet.</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => (
            <Card key={`${item.id}-${item.url}`} className="h-full border-border/60">
              <CardHeader className="space-y-3 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary">{item.type}</Badge>
                  {item.category && <Badge variant="outline">{item.category}</Badge>}
                  {item.streamBucket && <Badge variant="outline">{item.streamBucket}</Badge>}
                  {item.duration && <span className="text-xs text-muted-foreground">{item.duration}</span>}
                </div>
                <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                {item.whyForYou && (
                  <div className="rounded-md border border-primary/20 bg-primary/5 p-2 text-xs text-primary">
                    Why for you: {item.whyForYou}
                  </div>
                )}

                <div className="grid grid-cols-3 gap-2 sm:grid-cols-3">
                  <Button variant={item.saved ? "secondary" : "outline"} size="sm" onClick={() => interactionMutation.mutate({ item, action: "save" })}>
                    <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => interactionMutation.mutate({ item, action: "hide" })}>
                    <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                    Hide
                  </Button>
                  <Button variant={item.liked ? "default" : "outline"} size="sm" onClick={() => interactionMutation.mutate({ item, action: "like" })}>
                    <Heart className="mr-1.5 h-3.5 w-3.5" />
                    Engage
                  </Button>
                </div>

                <Button
                  className="w-full"
                  variant="ghost"
                  onClick={() => handleOpen(item)}
                  disabled={!item.route && !item.url.startsWith("http")}
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open
                </Button>

                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  <Button
                    variant={item.favorited ? "default" : "ghost"}
                    size="sm"
                    onClick={() => interactionMutation.mutate({ item, action: "favorite" })}
                  >
                    <Star className="mr-1.5 h-3.5 w-3.5" />Favorite
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div ref={loaderRef} className="py-6 text-center text-xs text-muted-foreground">
          {feedQuery.isFetchingNextPage ? <Loader2 className="mx-auto h-4 w-4 animate-spin" /> : feedQuery.hasNextPage ? "Scroll for more" : "You're caught up"}
        </div>
      </div>
    </div>
  );
}
