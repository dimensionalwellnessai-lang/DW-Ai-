import { useMemo, useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { AddToSheet, type AddToSheetItem } from "@/components/add-to-sheet";
import {
  Bookmark, BookmarkX, Dumbbell, Utensils, Sparkles, CheckSquare, Target, Plus, Clock,
} from "lucide-react";
import type { SavedContent } from "@shared/schema";

type LibraryType = "workout" | "meal" | "meditation" | "habit" | "goal";

const TYPE_META: Record<LibraryType, { label: string; icon: typeof Dumbbell; tone: string }> = {
  workout:    { label: "Workouts",    icon: Dumbbell,    tone: "text-blue-600 dark:text-blue-400" },
  meal:       { label: "Meals",       icon: Utensils,    tone: "text-orange-600 dark:text-orange-400" },
  meditation: { label: "Meditations", icon: Sparkles,    tone: "text-violet-600 dark:text-violet-400" },
  habit:      { label: "Habits",      icon: CheckSquare, tone: "text-emerald-600 dark:text-emerald-400" },
  goal:       { label: "Goals",       icon: Target,      tone: "text-amber-600 dark:text-amber-400" },
};

const FILTERS: Array<{ key: LibraryType | "all"; label: string }> = [
  { key: "all",        label: "All" },
  { key: "workout",    label: "Workouts" },
  { key: "meal",       label: "Meals" },
  { key: "meditation", label: "Meditations" },
  { key: "habit",      label: "Habits" },
  { key: "goal",       label: "Goals" },
];

export default function LibraryPage() {
  usePageMeta("Library", "Your saved workouts, meals, meditations, habits, and goals — ready to add to your day.");
  const { toast } = useToast();

  const [filter, setFilter] = useState<LibraryType | "all">("all");
  const [addItem, setAddItem] = useState<AddToSheetItem | null>(null);

  const { data: items = [], isLoading } = useQuery<SavedContent[]>({
    queryKey: ["/api/library"],
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/library/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/library"] });
      toast({ title: "Removed from Library" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove item.", variant: "destructive" });
    },
  });

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((it) => it.contentType === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: items.length };
    for (const it of items) c[it.contentType] = (c[it.contentType] ?? 0) + 1;
    return c;
  }, [items]);

  return (
    <div className="flex flex-col h-full bg-gradient-to-b from-background to-muted/20">
      <PageHeader title="My Library" />

      <div className="px-4 pt-3 pb-2 flex gap-2 overflow-x-auto" data-testid="library-filters">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          const count = counts[f.key] ?? 0;
          return (
            <Button
              key={f.key}
              size="sm"
              variant={active ? "default" : "outline"}
              onClick={() => setFilter(f.key)}
              className="shrink-0"
              data-testid={`filter-${f.key}`}
            >
              {f.label}
              {count > 0 && (
                <Badge variant="secondary" className="ml-2 px-1.5 py-0 text-[10px]">
                  {count}
                </Badge>
              )}
            </Button>
          );
        })}
      </div>

      <main className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="grid gap-3">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState filter={filter} />
        ) : (
          <div className="grid gap-3">
            {filtered.map((it) => {
              const meta = TYPE_META[it.contentType as LibraryType];
              const Icon = meta?.icon ?? Bookmark;
              return (
                <Card key={it.id} data-testid={`library-item-${it.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <Icon className={`h-5 w-5 ${meta?.tone ?? ""}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="font-medium truncate" data-testid={`text-title-${it.id}`}>
                            {it.title}
                          </p>
                          <Badge variant="outline" className="text-[10px] capitalize">
                            {it.contentType}
                          </Badge>
                        </div>
                        {it.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {it.description}
                          </p>
                        )}
                        {it.duration && (
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {it.duration}{!isNaN(Number(it.duration)) ? " min" : ""}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-2 mt-3">
                          <Button
                            size="sm"
                            onClick={() => setAddItem({
                              title: it.title,
                              type: it.contentType as LibraryType,
                              description: it.description ?? undefined,
                              duration: it.duration ? Number(it.duration) || undefined : undefined,
                            })}
                            data-testid={`button-add-${it.id}`}
                          >
                            <Plus className="h-3.5 w-3.5 mr-1" />
                            Add to my day
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeMutation.mutate(it.id)}
                            disabled={removeMutation.isPending}
                            data-testid={`button-remove-${it.id}`}
                          >
                            <BookmarkX className="h-3.5 w-3.5 mr-1" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>

      {addItem && (
        <AddToSheet
          item={addItem}
          open={!!addItem}
          onOpenChange={(open) => { if (!open) setAddItem(null); }}
        />
      )}
    </div>
  );
}

function EmptyState({ filter }: { filter: LibraryType | "all" }) {
  const label = filter === "all" ? "items" : (TYPE_META[filter]?.label.toLowerCase() ?? "items");
  return (
    <div className="text-center py-16" data-testid="library-empty">
      <Bookmark className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
      <p className="font-medium mb-1">No {label} saved yet</p>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
        Tap "Save to Library" anywhere in the app to bookmark workouts, meals, meditations, habits,
        or goals. They'll wait here until you're ready to add them to your day.
      </p>
    </div>
  );
}
