import { useState, useRef, useEffect } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  Play,
  Trash2,
  Check,
  BookOpen,
  ChevronRight,
  Clock,
  ListTodo,
  Plus,
  Loader2,
  X,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  getSavedRoutines,
  deleteRoutine,
  updateRoutineLastUsed,
  updateSavedRoutineSteps,
  addGuestTask,
} from "@/lib/guest-storage";
import { apiRequest } from "@/lib/queryClient";

export default function RoutineDetailPage() {
  usePageMeta("Routine", "Follow your personalized wellness routine step by step.");
  const params = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const routineId = params.id;
  const [routine, setRoutine] = useState(() =>
    getSavedRoutines().find((r) => r.id === routineId) ?? null
  );

  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [addingTaskIdx, setAddingTaskIdx] = useState<number | null>(null);
  const [showAddStep, setShowAddStep] = useState(false);
  const [newStepText, setNewStepText] = useState("");
  const newStepInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showAddStep) {
      setTimeout(() => newStepInputRef.current?.focus(), 50);
    }
  }, [showAddStep]);

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

  const routineData = routine.data as Record<string, unknown> | null | undefined;
  const steps: string[] =
    Array.isArray(routineData?.steps)
      ? (routineData.steps as unknown[]).filter((s): s is string => typeof s === "string")
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
      description: "Tap the circle next to each step as you complete it.",
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

  const handleAddStepAsTask = async (step: string, idx: number) => {
    setAddingTaskIdx(idx);
    try {
      const res = await apiRequest("POST", "/api/tasks", {
        title: step,
        dwSuggested: false,
        linkedRoute: "/routines",
      });
      if (res.ok) {
        toast({ title: "Added to tasks", description: `"${step}" is now in your task list.` });
      } else {
        throw new Error("api_failed");
      }
    } catch {
      addGuestTask(step, "saved-routine");
      toast({ title: "Added to tasks", description: `"${step}" saved to your tasks.` });
    } finally {
      setAddingTaskIdx(null);
    }
  };

  const handleAddCustomStep = () => {
    const text = newStepText.trim();
    if (!text) return;
    const updatedSteps = [...steps, text];
    updateSavedRoutineSteps(routine.id, updatedSteps);
    setRoutine((prev) =>
      prev
        ? { ...prev, data: { ...(prev.data as Record<string, unknown>), steps: updatedSteps } }
        : prev
    );
    setNewStepText("");
    setShowAddStep(false);
    toast({ title: "Step added", description: `"${text}" added to ${routine.title}.` });
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

          {/* Progress bar */}
          {steps.length > 0 && checkedSteps.size > 0 && (
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Progress</span>
                <span>{completedCount}/{steps.length} steps</span>
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
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Steps ({steps.length})
            </h2>

            {steps.length > 0 ? (
              <div className="space-y-2">
                {steps.map((step, idx) => (
                  <Card
                    key={idx}
                    className={`transition-all ${
                      checkedSteps.has(idx) ? "opacity-60 bg-muted/50" : "hover-elevate"
                    }`}
                    data-testid={`step-${idx}`}
                  >
                    <CardContent className="p-4 flex items-center gap-3">
                      <div
                        className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          checkedSteps.has(idx)
                            ? "bg-primary border-primary"
                            : "border-muted-foreground"
                        }`}
                        onClick={() => toggleStep(idx)}
                      >
                        {checkedSteps.has(idx) && (
                          <Check className="w-3.5 h-3.5 text-primary-foreground" />
                        )}
                      </div>
                      <p
                        className={`text-sm flex-1 cursor-pointer ${
                          checkedSteps.has(idx)
                            ? "line-through text-muted-foreground"
                            : ""
                        }`}
                        onClick={() => toggleStep(idx)}
                      >
                        {step}
                      </p>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 shrink-0 text-muted-foreground hover:text-primary"
                        disabled={addingTaskIdx === idx}
                        onClick={(e) => { e.stopPropagation(); handleAddStepAsTask(step, idx); }}
                        title="Add this step as a task"
                        data-testid={`button-add-task-${idx}`}
                      >
                        {addingTaskIdx === idx
                          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          : <ListTodo className="w-3.5 h-3.5" />
                        }
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No steps yet — add one below.
              </div>
            )}

            {/* Add custom step */}
            {showAddStep ? (
              <Card className="border-dashed border-primary/40">
                <CardContent className="p-3 flex items-center gap-2">
                  <Input
                    ref={newStepInputRef}
                    placeholder="Describe the step…"
                    value={newStepText}
                    onChange={(e) => setNewStepText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddCustomStep();
                      if (e.key === "Escape") { setShowAddStep(false); setNewStepText(""); }
                    }}
                    className="flex-1 h-8 text-sm"
                    data-testid="input-new-step"
                  />
                  <Button size="sm" className="h-8 px-3" onClick={handleAddCustomStep} disabled={!newStepText.trim()} data-testid="button-confirm-new-step">
                    Add
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => { setShowAddStep(false); setNewStepText(""); }}>
                    <X className="w-3.5 h-3.5" />
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <Button
                variant="ghost"
                className="w-full h-9 text-sm text-muted-foreground border border-dashed"
                onClick={() => setShowAddStep(true)}
                data-testid="button-add-step"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add a step
              </Button>
            )}

            {steps.length > 0 && (
              <p className="text-xs text-muted-foreground text-center pt-1">
                Tap the circle to mark done · Tap <ListTodo className="inline w-3 h-3 mx-0.5" /> to add a step as a task
              </p>
            )}
          </div>
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
