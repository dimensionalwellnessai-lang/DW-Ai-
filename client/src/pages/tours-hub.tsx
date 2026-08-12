import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { CheckCircle2, PlayCircle, RotateCcw } from "lucide-react";
import { usePageMeta } from "@/hooks/use-page-meta";

interface TourDefinition {
  id: string;
  label: string;
  description: string;
}

const TOURS: TourDefinition[] = [
  {
    id: "global",
    label: "App Tour",
    description: "A quick walkthrough of the main areas of dwai and what each section is for.",
  },
  {
    id: "home",
    label: "Home Screen",
    description: "Learn about the capacity selector, today card, and quick actions on the home screen.",
  },
  {
    id: "anchors",
    label: "Anchors",
    description: "Understand what anchors are, how behaviors work, and how to set your minimum day.",
  },
  {
    id: "life-system",
    label: "Life Blueprint",
    description: "Explore your life system pillars, projects, and how they connect to your standards.",
  },
  {
    id: "talk",
    label: "Talk to DW",
    description: "How to use the conversation space effectively — prompts, mood tracking, and insights.",
  },
  {
    id: "reminders",
    label: "Reminder Center",
    description: "Set up reminders, respond to them, and review your completion history.",
  },
];

interface TourProgressRow {
  tourId: string;
  completedAt: string | null;
  replayCount: number;
}

export default function ToursHubPage() {
  usePageMeta("Tours & Help", "Replay any tour or get a quick orientation for each page.");
  const qc = useQueryClient();

  const { data } = useQuery<{ tours: TourProgressRow[] }>({
    queryKey: ["/api/tour-progress"],
    queryFn: async () => {
      const res = await fetch("/api/tour-progress", { credentials: "include" });
      if (!res.ok) return { tours: [] };
      return res.json();
    },
    staleTime: 60_000,
  });

  const progressMap = new Map(
    (data?.tours ?? []).map((t) => [t.tourId, t]),
  );

  const completeTour = useMutation({
    mutationFn: async (tourId: string) => {
      const res = await fetch(`/api/tour-progress/${tourId}/complete`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to record tour");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/tour-progress"] }),
  });

  return (
    <div className="dw-premium-bg">
      <PageHeader title="Tours & Help" showBack />
      <div className="p-4 pb-24 space-y-4 max-w-lg mx-auto">
        <p className="text-sm text-muted-foreground">
          Replay any tour at any time to refresh your memory on how each area works.
        </p>

        {TOURS.map((tour) => {
          const progress = progressMap.get(tour.id);
          const isDone = !!progress?.completedAt;

          return (
            <Card key={tour.id} className="card-modern">
              <CardContent className="p-4 flex items-start gap-4">
                <div
                  className={`p-2 rounded-lg mt-0.5 ${
                    isDone ? "bg-green-500/10" : "bg-muted"
                  }`}
                >
                  {isDone ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <PlayCircle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{tour.label}</p>
                    {isDone && (
                      <Badge variant="outline" className="text-xs text-green-600 border-green-500/30">
                        Done
                      </Badge>
                    )}
                    {progress && progress.replayCount > 0 && (
                      <Badge variant="outline" className="text-xs">
                        ×{progress.replayCount + 1}
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {tour.description}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant={isDone ? "outline" : "default"}
                  className="shrink-0"
                  onClick={() => completeTour.mutate(tour.id)}
                  disabled={completeTour.isPending}
                >
                  {isDone ? (
                    <>
                      <RotateCcw className="h-3 w-3 mr-1.5" />
                      Replay
                    </>
                  ) : (
                    <>
                      <PlayCircle className="h-3 w-3 mr-1.5" />
                      Start
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
