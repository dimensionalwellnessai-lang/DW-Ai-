import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Trash2,
  Check,
  BookOpen,
  ChevronRight,
  Clock,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  getSavedRoutines,
  deleteRoutine,
  updateRoutineLastUsed,
} from "@/lib/guest-storage";

export default function RoutineDetailPage() {
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const routineId = params.id;
  const [routine, setRoutine] = useState(() =>
    getSavedRoutines().find((r) => r.id === routineId) ?? null
  );

  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());

  if (!routine) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Routine" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium">Routine not found</p>
            <p className="text-sm text-muted-foreground">
              This routine may have been deleted.
            </p>
            <Button variant="outline" onClick={() => setLocation("/routines")}>
              Back to Routines
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const steps: string[] =
    Array.isArray((routine.data as any)?.steps)
      ? (routine.data as any).steps
      : [];

  const toggleStep = (idx: number) => {
    setCheckedSteps((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleUse = () => {
    updateRoutineLastUsed(routine.id);
    setCheckedSteps(new Set());
    toast({
      title: "Routine started",
      description: "Tap each step as you complete it.",
    });
  };

  const handleDelete = () => {
    deleteRoutine(routine.id);
    toast({
      title: "Routine deleted",
      description: `${routine.title} has been removed.`,
    });
    setLocation("/routines");
  };

  const completedCount = checkedSteps.size;
  const progress = steps.length > 0 ? (completedCount / steps.length) * 100 : 0;

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Routine" />

      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
          {/* Header card */}
          <Card>
            <CardContent className="p-6 space-y-3">
              <h1 className="text-xl font-semibold">{routine.title}</h1>
              {routine.description && (
                <p className="text-sm text-muted-foreground">
                  {routine.description}
                </p>
              )}
              {routine.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {routine.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              {routine.lastUsedAt && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock className="w-3 h-3" />
                  <span>
                    Last used:{" "}
                    {new Date(routine.lastUsedAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Progress bar (only shown if steps exist) */}
          {steps.length > 0 && checkedSteps.size > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>
                  {completedCount}/{steps.length} steps
                </span>
              </div>
              <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          {/* Steps list */}
          {steps.length > 0 ? (
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                Steps ({steps.length})
              </h2>
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <Card
                    key={idx}
                    className={`hover-elevate cursor-pointer transition-all ${
                      checkedSteps.has(idx) ? "opacity-60 bg-muted/50" : ""
                    }`}
                    onClick={() => toggleStep(idx)}
                    data-testid={`step-${idx}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors ${
                          checkedSteps.has(idx)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {checkedSteps.has(idx) && (
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        )}
                      </div>
                      <p
                        className={`text-sm flex-1 ${
                          checkedSteps.has(idx)
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                      >
                        {step}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              No steps recorded for this routine.
            </div>
          )}
        </div>
      </div>

      {/* Sticky action bar */}
      <div
        className="border-t bg-background p-4 space-y-2"
        style={{ paddingBottom: "calc(1rem + var(--bottom-nav-total-height, 88px))" }}
      >
        <Button
          className="w-full"
          size="lg"
          onClick={handleUse}
          data-testid="button-use-routine"
        >
          <Play className="w-4 h-4 mr-2" />
          Start Routine
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setLocation("/routines")}
            data-testid="button-back"
          >
            <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
            Back
          </Button>
          <Button
            variant="outline"
            className="text-destructive hover:text-destructive border-destructive/30"
            onClick={handleDelete}
            data-testid="button-delete-routine"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete
          </Button>
        </div>
      </div>
    </div>
  );
}
