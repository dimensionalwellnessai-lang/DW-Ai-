/**
 * The Current — `/feed`
 *
 * Feed stream for `/feed`.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { Constellation } from "@/components/constellation";
import {
  Bookmark, ExternalLink, Heart, Loader2, ShieldOff, RefreshCw, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ZoneId } from "@/components/constellation";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedItem {
  id: string;
  title: string;
  description: string;
  type: string;
  /** "constructive" | "recreational" | "social" */
  mix?: string;
  category: string | null;
  source: string;
  duration: string | null;
  thumbnail: string | null;
  url: string;
  route: string | null;
  liked: boolean;
  favorited: boolean;
  saved: boolean;
  /** Zone this item feeds */
  zone?: ZoneId;
  /** Human-readable reason this appears in the user's feed */
  whyForYou?: string;
  /** Optional cosmic timing note */
  timingNote?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

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

async function fetchFeed(filter: string): Promise<{ items: FeedItem[] }> {
  const params = new URLSearchParams();
  params.set("filter", filter);
  params.set("sort", "relevant");
  const res = await apiRequest("GET", `/api/feed?${params}`);
  return res.json();
}

// ── Component ─────────────────────────────────────────────────────────────────

const FILTERS = [
  { id: "all", label: "All" },
  { id: "article", label: "Articles" },
  { id: "video", label: "Videos" },
];

export default function FeedPage() {
  usePageMeta(
    "The Current",
    "A stream of things worth your attention — constructive, recreational, and in the moment."
  );

  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("all");
  const feedQuery = useQuery<{ items: FeedItem[] }>({
    queryKey: ["/api/feed", filter],
    queryFn: () => fetchFeed(filter),
    staleTime: 60_000,
  });

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

  const handleOpen = (item: FeedItem) => {
    if (item.url.startsWith("http://") || item.url.startsWith("https://")) {
      window.open(item.url, "_blank", "noopener,noreferrer");
      return;
    }
    if (item.route) setLocation(item.route);
  };

  const allItems = feedQuery.data?.items ?? [];

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="The Current"
        subtitle="Your stream — fuel and flow, not homework"
        showBack={false}
        icon={<Constellation state="idle" size={24} className="opacity-70" />}
      />

      {/* Filter chips */}
      <div className="px-4 pb-3 pt-1 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {FILTERS.map((chip) => (
            <button
              type="button"
              key={chip.id}
              onClick={() => setFilter(chip.id)}
              aria-pressed={filter === chip.id}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-medium border transition-all min-h-11",
                filter === chip.id
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border/50 text-muted-foreground hover:text-foreground"
              )}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mx-auto max-w-2xl px-4 pb-28 space-y-3">
        {/* Loading state */}
        {feedQuery.isLoading && (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2 text-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            Pulling your stream…
          </div>
        )}

        {/* Error state */}
        {feedQuery.isError && (
          <Card>
            <CardContent className="space-y-3 p-6">
              <p className="font-medium">The Current paused.</p>
              <p className="text-sm text-muted-foreground">
                Nothing wrong on your end — try refreshing.
              </p>
              <Button variant="outline" size="sm" onClick={() => feedQuery.refetch()}>
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                Refresh
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty state */}
        {!feedQuery.isLoading && !feedQuery.isError && allItems.length === 0 && (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <p>Nothing here yet.</p>
            <p className="mt-1 text-xs">Try a different filter or pull to refresh.</p>
          </div>
        )}

        {/* Feed cards */}
        {allItems.map((item) => (
          <FeedCard
            key={`${item.id}-${item.url}`}
            item={item}
            onOpen={handleOpen}
            onInteract={(action) => interactionMutation.mutate({ item, action })}
          />
        ))}
      </div>
    </div>
  );
}

// ── Feed Card ─────────────────────────────────────────────────────────────────

interface FeedCardProps {
  item: FeedItem;
  onOpen: (item: FeedItem) => void;
  onInteract: (action: "like" | "favorite" | "save" | "hide") => void;
}

function FeedCard({ item, onOpen, onInteract }: FeedCardProps) {
  const mixKey = item.mix && MIX_LABELS[item.mix] && MIX_COLORS[item.mix] ? item.mix : null;
  const mixLabel = mixKey ? MIX_LABELS[mixKey] : null;
  const mixColor = mixKey ? MIX_COLORS[mixKey] : null;

  return (
    <Card className="border-border/50 overflow-hidden">
      <CardContent className="p-4 space-y-3">
        {/* Top row: mix badge + zone constellation */}
        <div className="flex items-center justify-between">
          <div>
            {mixLabel && mixColor && (
              <span
                className={cn(
                  "text-[11px] font-medium px-2 py-0.5 rounded-full border",
                  mixColor
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

        {/* Content */}
        <div>
          <h3 className="font-semibold text-sm leading-snug">{item.title}</h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2">
            {item.description}
          </p>
        </div>

        {/* Why for you */}
        {item.whyForYou && (
          <div className="flex items-start gap-1.5 rounded-lg bg-muted/40 px-3 py-2">
            <Sparkles className="h-3 w-3 text-primary mt-0.5 shrink-0" />
            <p className="text-[11px] text-muted-foreground leading-snug">{item.whyForYou}</p>
          </div>
        )}

        {/* Timing note */}
        {item.timingNote && (
          <p className="text-[11px] text-muted-foreground/60 italic">{item.timingNote}</p>
        )}

        {/* Meta + actions */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-muted-foreground">{item.source}</span>
          <div className="flex items-center gap-1">
            {/* This hit my Zone */}
            <button
              type="button"
              onClick={() => onInteract("like")}
              aria-label="This hit my Zone"
              aria-pressed={item.liked}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                item.liked
                  ? "text-rose-500 bg-rose-500/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Heart className="h-4 w-4" strokeWidth={item.liked ? 2.5 : 1.8} />
            </button>

            {/* Save */}
            <button
              type="button"
              onClick={() => onInteract("save")}
              aria-label="Save"
              aria-pressed={item.saved}
              className={cn(
                "inline-flex h-11 w-11 items-center justify-center rounded-lg transition-colors",
                item.saved
                  ? "text-sky-500 bg-sky-500/10"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Bookmark className="h-4 w-4" strokeWidth={item.saved ? 2.5 : 1.8} />
            </button>

            {/* Hide */}
            <button
              type="button"
              onClick={() => onInteract("hide")}
              aria-label="Not for me"
              className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              <ShieldOff className="h-4 w-4" strokeWidth={1.8} />
            </button>

            {/* Open */}
            {(item.route || item.url.startsWith("http")) && (
              <button
                type="button"
                onClick={() => onOpen(item)}
                aria-label="Open"
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
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
