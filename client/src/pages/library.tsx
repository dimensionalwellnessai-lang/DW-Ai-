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
import {
  AddToSheet,
  type AddToSheetItem,
  type WorkoutLibraryMetadata,
  type MealLibraryMetadata,
  type MeditationLibraryMetadata,
  type LibraryItemMetadata,
} from "@/components/add-to-sheet";
import {
  Bookmark, BookmarkX, Dumbbell, Utensils, Sparkles, CheckSquare, Target, Plus, Clock,
  ExternalLink,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { SavedContent } from "@shared/schema";

type LibraryType = "workout" | "meal" | "meditation" | "habit" | "goal";

const stringArray = (v: unknown): string[] | undefined =>
  Array.isArray(v) && v.every((x) => typeof x === "string") ? (v as string[]) : undefined;
const stringField = (v: unknown): string | undefined =>
  typeof v === "string" ? v : undefined;
const numberField = (v: unknown): number | undefined =>
  typeof v === "number" && !isNaN(v) ? v : undefined;

function parseWorkoutMetadata(raw: unknown): WorkoutLibraryMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  return {
    intensity: stringField(m.intensity),
    tags: stringArray(m.tags),
    steps: stringArray(m.steps),
    equipment: stringArray(m.equipment),
    tips: stringArray(m.tips),
    youtubeVideoId: stringField(m.youtubeVideoId),
    youtubeSearch: stringField(m.youtubeSearch),
  };
}

function parseMealMetadata(raw: unknown): MealLibraryMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  const rawNutrition = m.nutrition && typeof m.nutrition === "object" ? m.nutrition as Record<string, unknown> : undefined;
  const nutrition = rawNutrition ? {
    calories: numberField(rawNutrition.calories),
    protein: numberField(rawNutrition.protein),
    carbs: numberField(rawNutrition.carbs),
    fat: numberField(rawNutrition.fat),
    fiber: numberField(rawNutrition.fiber),
  } : undefined;
  return {
    ingredients: stringArray(m.ingredients),
    instructions: stringArray(m.instructions),
    prepTime: numberField(m.prepTime),
    tags: stringArray(m.tags),
    nutrition,
    planTitle: stringField(m.planTitle),
    youtubeVideoId: stringField(m.youtubeVideoId),
    youtubeSearch: stringField(m.youtubeSearch),
  };
}

function parseMeditationMetadata(raw: unknown): MeditationLibraryMetadata | null {
  if (!raw || typeof raw !== "object") return null;
  const m = raw as Record<string, unknown>;
  return {
    steps: stringArray(m.steps),
    guidance: stringField(m.guidance),
    category: stringField(m.category),
    practices: stringArray(m.practices),
    forNeeds: stringArray(m.forNeeds),
    tags: stringArray(m.tags),
    script: stringField(m.script),
  };
}

function hasMealDetail(m: MealLibraryMetadata | null): boolean {
  if (!m) return false;
  return (m.ingredients?.length ?? 0) > 0 ||
    (m.instructions?.length ?? 0) > 0 ||
    !!m.nutrition;
}

function hasMeditationDetail(m: MeditationLibraryMetadata | null): boolean {
  if (!m) return false;
  return (m.steps?.length ?? 0) > 0 ||
    !!m.guidance ||
    !!m.script;
}

function hasWorkoutDetail(m: WorkoutLibraryMetadata | null): boolean {
  if (!m) return false;
  return (m.steps?.length ?? 0) > 0 ||
    !!m.youtubeVideoId ||
    !!m.youtubeSearch ||
    (m.tips?.length ?? 0) > 0 ||
    (m.equipment?.length ?? 0) > 0;
}

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
  const [detailItem, setDetailItem] = useState<SavedContent | null>(null);

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
              const workoutMeta = it.contentType === "workout" ? parseWorkoutMetadata(it.metadata) : null;
              const mealMeta = it.contentType === "meal" ? parseMealMetadata(it.metadata) : null;
              const meditationMeta = it.contentType === "meditation" ? parseMeditationMetadata(it.metadata) : null;
              const combinedMeta: LibraryItemMetadata | undefined =
                workoutMeta ?? mealMeta ?? meditationMeta ?? undefined;
              const hasDetail =
                hasWorkoutDetail(workoutMeta) ||
                hasMealDetail(mealMeta) ||
                hasMeditationDetail(meditationMeta);
              return (
                <Card key={it.id} data-testid={`library-item-${it.id}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-muted shrink-0">
                        <Icon className={`h-5 w-5 ${meta?.tone ?? ""}`} aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <button
                            type="button"
                            className={`font-medium truncate text-left ${hasDetail ? "hover:underline" : "cursor-default"}`}
                            onClick={() => hasDetail && setDetailItem(it)}
                            disabled={!hasDetail}
                            data-testid={`text-title-${it.id}`}
                          >
                            {it.title}
                          </button>
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
                          {hasDetail && (
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setDetailItem(it)}
                              data-testid={`button-open-${it.id}`}
                            >
                              Open
                            </Button>
                          )}
                          <Button
                            size="sm"
                            onClick={() => setAddItem({
                              title: it.title,
                              type: it.contentType as LibraryType,
                              description: it.description ?? undefined,
                              duration: it.duration ? Number(it.duration) || undefined : undefined,
                              metadata: combinedMeta,
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

      <SavedDetailDialog
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onAddToDay={(it) => {
          setDetailItem(null);
          const meta: LibraryItemMetadata | undefined =
            it.contentType === "workout" ? (parseWorkoutMetadata(it.metadata) ?? undefined) :
            it.contentType === "meal" ? (parseMealMetadata(it.metadata) ?? undefined) :
            it.contentType === "meditation" ? (parseMeditationMetadata(it.metadata) ?? undefined) :
            undefined;
          setAddItem({
            title: it.title,
            type: it.contentType as LibraryType,
            description: it.description ?? undefined,
            duration: it.duration ? Number(it.duration) || undefined : undefined,
            metadata: meta,
          });
        }}
      />
    </div>
  );
}

function SavedDetailDialog({
  item,
  onClose,
  onAddToDay,
}: {
  item: SavedContent | null;
  onClose: () => void;
  onAddToDay: (it: SavedContent) => void;
}) {
  const workoutMeta = item?.contentType === "workout" ? parseWorkoutMetadata(item.metadata) : null;
  const mealMeta = item?.contentType === "meal" ? parseMealMetadata(item.metadata) : null;
  const meditationMeta = item?.contentType === "meditation" ? parseMeditationMetadata(item.metadata) : null;

  const tags = workoutMeta?.tags ?? mealMeta?.tags ?? meditationMeta?.tags ?? [];
  const youtubeVideoId = workoutMeta?.youtubeVideoId ?? mealMeta?.youtubeVideoId;
  const youtubeSearch = workoutMeta?.youtubeSearch ?? mealMeta?.youtubeSearch;

  return (
    <Dialog open={!!item} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" data-testid="dialog-library-detail">
        {item && (
          <>
            <DialogHeader>
              <DialogTitle data-testid="text-detail-title">{item.title}</DialogTitle>
              {item.description && (
                <DialogDescription>{item.description}</DialogDescription>
              )}
            </DialogHeader>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {item.duration && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5" />
                    {item.duration}{!isNaN(Number(item.duration)) ? " min" : ""}
                  </span>
                )}
                {workoutMeta?.intensity && (
                  <Badge variant="secondary" className="capitalize">{workoutMeta.intensity}</Badge>
                )}
                {meditationMeta?.category && (
                  <Badge variant="secondary">{meditationMeta.category}</Badge>
                )}
                {mealMeta?.planTitle && (
                  <Badge variant="outline">{mealMeta.planTitle}</Badge>
                )}
              </div>

              {youtubeVideoId && (
                <div className="aspect-video w-full overflow-hidden rounded-md border bg-black">
                  <iframe
                    src={`https://www.youtube.com/embed/${youtubeVideoId}`}
                    title={item.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    className="w-full h-full"
                    data-testid="iframe-youtube"
                  />
                </div>
              )}

              {/* Workout: steps / equipment / tips */}
              {workoutMeta && (workoutMeta.steps?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Steps</h4>
                  <ol className="space-y-1 list-decimal list-inside" data-testid="list-steps">
                    {workoutMeta.steps!.map((step, idx) => (
                      <li key={idx} className="text-sm text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {workoutMeta && (workoutMeta.equipment?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Equipment</h4>
                  <div className="flex flex-wrap gap-1" data-testid="list-equipment">
                    {workoutMeta.equipment!.map((e, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{e}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {workoutMeta && (workoutMeta.tips?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Tips</h4>
                  <ul className="space-y-1 list-disc list-inside" data-testid="list-tips">
                    {workoutMeta.tips!.map((tip, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{tip}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Meal: nutrition / ingredients / instructions */}
              {mealMeta?.nutrition && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Nutrition</h4>
                  <div className="grid grid-cols-4 gap-2 p-2 rounded-md bg-muted/40 border" data-testid="meal-nutrition">
                    <NutritionCell label="kcal" value={mealMeta.nutrition.calories} />
                    <NutritionCell label="Protein" value={mealMeta.nutrition.protein} unit="g" />
                    <NutritionCell label="Carbs" value={mealMeta.nutrition.carbs} unit="g" />
                    <NutritionCell label="Fat" value={mealMeta.nutrition.fat} unit="g" />
                  </div>
                </div>
              )}

              {mealMeta && (mealMeta.ingredients?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Ingredients</h4>
                  <ul className="space-y-1 list-disc list-inside" data-testid="list-ingredients">
                    {mealMeta.ingredients!.map((ing, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{ing}</li>
                    ))}
                  </ul>
                </div>
              )}

              {mealMeta && (mealMeta.instructions?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Instructions</h4>
                  <ol className="space-y-1 list-decimal list-inside" data-testid="list-instructions">
                    {mealMeta.instructions!.map((inst, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{inst}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Meditation: guidance / steps / script / for-needs */}
              {meditationMeta?.guidance && (
                <div className="bg-primary/5 rounded-md p-3" data-testid="text-guidance">
                  <p className="text-sm italic text-muted-foreground leading-relaxed">{meditationMeta.guidance}</p>
                </div>
              )}

              {meditationMeta && (meditationMeta.steps?.length ?? 0) > 0 && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Step-by-step</h4>
                  <ol className="space-y-1 list-decimal list-inside" data-testid="list-meditation-steps">
                    {meditationMeta.steps!.map((step, i) => (
                      <li key={i} className="text-sm text-muted-foreground">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              {meditationMeta?.script && (
                <div>
                  <h4 className="font-medium mb-2 text-sm">Guided script</h4>
                  <p className="text-sm leading-relaxed whitespace-pre-line text-muted-foreground" data-testid="text-meditation-script">
                    {meditationMeta.script}
                  </p>
                </div>
              )}

              {meditationMeta && (meditationMeta.forNeeds?.length ?? 0) > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Great for:</span>
                  {meditationMeta.forNeeds!.map((n) => (
                    <Badge key={n} variant="secondary" className="text-xs capitalize">{n}</Badge>
                  ))}
                </div>
              )}

              {tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-2 pt-2">
                <Button onClick={() => onAddToDay(item)} data-testid="button-detail-add">
                  <Plus className="h-4 w-4 mr-1" />
                  Add to my day
                </Button>
                {youtubeSearch && (
                  <Button
                    variant="outline"
                    onClick={() =>
                      window.open(
                        `https://www.youtube.com/results?search_query=${encodeURIComponent(youtubeSearch)}`,
                        "_blank",
                      )
                    }
                    data-testid="button-detail-youtube"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    More videos
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function NutritionCell({ label, value, unit }: { label: string; value?: number; unit?: string }) {
  if (value === undefined) return <div className="text-center text-muted-foreground/50">—</div>;
  return (
    <div className="text-center">
      <div className="font-semibold text-foreground text-sm">{value}{unit ?? ""}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
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
