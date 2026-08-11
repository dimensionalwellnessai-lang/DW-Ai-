import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
}

const FILTERS = [
  { id: "all", label: "All" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Videos" },
  { id: "exercise", label: "Exercises" },
  { id: "emotional", label: "Emotional" },
  { id: "physical", label: "Physical" },
];

export default function FeedPage() {
  usePageMeta("Feed", "A unified, supportive feed of wellness ideas, reflections, and practical next steps.");

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sort, setSort] = useState<"relevant" | "latest">("relevant");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("filter", filter);
    params.set("sort", sort);
    return params.toString();
  }, [filter, search, sort]);

  const feedQuery = useQuery<{ items: FeedItem[] }>({
    queryKey: ["/api/feed", queryString],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/feed?${queryString}`);
      return response.json();
    },
  });

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
        like: "We'll keep noticing what feels supportive.",
        favorite: "Added to your favorites signal.",
        save: "Saved for later.",
        hide: "We'll make a little more space from content like this.",
      };
      toast({ title: "Noted", description: messages[variables.action] });
    },
    onError: (error) => {
      toast({ title: "Couldn't update that yet", description: parseApiError(error), variant: "destructive" });
    },
  });

  const handleOpen = (item: FeedItem) => {
    if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.route) {
      setLocation(item.route);
    }
  };

  const items = feedQuery.data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader title="Feed" showBack={false} />
      <div className="mx-auto max-w-4xl space-y-4 px-4 pb-24 pt-4">
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search for something steadying, practical, or inspiring"
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
            </div>
          </CardContent>
        </Card>

        {feedQuery.isLoading && (
          <Card>
            <CardContent className="flex items-center gap-3 p-6 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Gathering a calm mix for your feed…
            </CardContent>
          </Card>
        )}

        {feedQuery.isError && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="font-medium text-foreground">Your feed needs a moment.</p>
              <p className="text-sm text-muted-foreground">Nothing is wrong on your end. Try again in a moment.</p>
              <Button variant="outline" onClick={() => feedQuery.refetch()}>Try again</Button>
            </CardContent>
          </Card>
        )}

        {!feedQuery.isLoading && !feedQuery.isError && items.length === 0 && (
          <Card>
            <CardContent className="space-y-2 p-6 text-center">
              <p className="font-medium text-foreground">Nothing matches that filter yet.</p>
              <p className="text-sm text-muted-foreground">Try a broader search or switch back to all so DW can offer a wider mix.</p>
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
                  {item.duration && <span className="text-xs text-muted-foreground">{item.duration}</span>}
                </div>
                <CardTitle className="text-lg leading-snug">{item.title}</CardTitle>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{item.source}</span>
                  {item.route && !item.url.startsWith("http") && <span>In app</span>}
                </div>

                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <Button variant={item.liked ? "default" : "outline"} size="sm" onClick={() => interactionMutation.mutate({ item, action: "like" })}>
                    <Heart className="mr-1.5 h-3.5 w-3.5" />
                    Like
                  </Button>
                  <Button variant={item.favorited ? "default" : "outline"} size="sm" onClick={() => interactionMutation.mutate({ item, action: "favorite" })}>
                    <Star className="mr-1.5 h-3.5 w-3.5" />
                    Favorite
                  </Button>
                  <Button variant={item.saved ? "secondary" : "outline"} size="sm" onClick={() => interactionMutation.mutate({ item, action: "save" })}>
                    <Bookmark className="mr-1.5 h-3.5 w-3.5" />
                    Save
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => interactionMutation.mutate({ item, action: "hide" })}>
                    <ShieldOff className="mr-1.5 h-3.5 w-3.5" />
                    Hide
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
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
