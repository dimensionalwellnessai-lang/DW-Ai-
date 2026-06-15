/**
 * Guidance — Conversations
 *
 * Spec 13, PR C: Guidance as a real learning system.
 *
 * Lists saved Learning Threads — coaching conversations the user chose to keep.
 * Each thread can be re-opened in the Talk page or linked to a My Life object.
 *
 * Route: /guidance/conversations
 */

import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  MessageCircle,
  BookmarkPlus,
  Trash2,
  ChevronRight,
  Sparkles,
  Clock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface LearningThreadSummary {
  id: string;
  title: string;
  summary: string | null;
  tags: string[] | null;
  linkedToType: string | null;
  linkedToId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatRelativeDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

// ─── Thread card ──────────────────────────────────────────────────────────────

function ThreadCard({
  thread,
  onDelete,
}: {
  thread: LearningThreadSummary;
  onDelete: (id: string) => void;
}) {
  const [, navigate] = useLocation();

  return (
    <Card
      className="cursor-pointer transition-all hover:shadow-md active:scale-[0.99]"
      data-testid={`learning-thread-card-${thread.id}`}
    >
      <CardContent className="p-4 space-y-2">
        <div className="flex items-start gap-3">
          <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center mt-0.5">
            <MessageCircle className="h-4 w-4 text-emerald-500" aria-hidden="true" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-foreground leading-snug">
                {thread.title}
              </p>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(thread.id);
                  }}
                  className="p-1 rounded text-muted-foreground/50 hover:text-destructive transition-colors"
                  aria-label="Delete thread"
                  data-testid={`btn-delete-thread-${thread.id}`}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {thread.summary && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2 leading-relaxed">
                {thread.summary}
              </p>
            )}

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {formatRelativeDate(thread.createdAt)}
              </div>

              {thread.tags?.slice(0, 3).map((tag) => (
                <Badge key={tag} variant="secondary" className="text-[10px] h-4 px-1.5 py-0">
                  {tag}
                </Badge>
              ))}

              {thread.linkedToType && (
                <Badge
                  variant="outline"
                  className="text-[10px] h-4 px-1.5 py-0 text-primary border-primary/30"
                >
                  Linked to {thread.linkedToType}
                </Badge>
              )}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="sm"
            variant="ghost"
            className="h-7 text-xs gap-1 text-muted-foreground hover:text-foreground"
            onClick={() => navigate("/talk")}
            data-testid={`btn-open-thread-${thread.id}`}
          >
            Open conversation
            <ChevronRight className="h-3 w-3" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function GuidanceConversationsPage() {
  usePageMeta(
    "Conversations",
    "Your saved learning threads — coaching conversations worth keeping.",
  );
  const { toast } = useToast();

  const { data, isLoading } = useQuery<{ threads: LearningThreadSummary[] }>({
    queryKey: ["/api/learning-threads"],
    staleTime: 60_000,
  });

  const threads = data?.threads ?? [];

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiRequest("DELETE", `/api/learning-threads/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-threads"] });
      toast({ title: "Thread deleted" });
    },
    onError: () => {
      toast({
        title: "Couldn't delete that just now",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="pb-28">
      <PageHeader title="Conversations" showBack />

      <div className="px-4 space-y-5">
        {/* Intro */}
        <div className="flex items-center gap-2 pt-1">
          <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
          <p className="text-sm text-muted-foreground">
            Coaching conversations you've saved as learning threads.
          </p>
        </div>

        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && threads.length === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-2xl bg-muted flex items-center justify-center">
                <BookmarkPlus className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No saved threads yet</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[220px] mx-auto leading-relaxed">
                  Start a conversation in Talk, then tap{" "}
                  <span className="font-medium">Save as Learning Thread</span> to keep it here.
                </p>
              </div>
              <Button
                size="sm"
                variant="outline"
                className="mt-1"
                onClick={() => window.history.back()}
              >
                <MessageCircle className="h-3.5 w-3.5 mr-1.5" />
                Start a conversation
              </Button>
            </CardContent>
          </Card>
        )}

        {!isLoading && threads.length > 0 && (
          <div className="space-y-3">
            {threads.map((thread) => (
              <ThreadCard
                key={thread.id}
                thread={thread}
                onDelete={(id) => deleteMutation.mutate(id)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
