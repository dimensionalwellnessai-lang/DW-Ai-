import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  Check,
  Plus,
  BookOpen,
  ChevronRight,
  Sparkles,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import { saveRoutine } from "@/lib/guest-storage";
import { apiRequest } from "@/lib/queryClient";
import { SUGGESTED_ROUTINES } from "@/lib/routine-templates";

export default function RoutineTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const templateId = params.templateId;
  const template = SUGGESTED_ROUTINES.find((r) => r.id === templateId);

  const [steps, setSteps] = useState<string[]>(template?.defaultSteps ?? []);
  const [whySuggested, setWhySuggested] = useState<string | null>(null);
  const [aiGenerated, setAiGenerated] = useState(false);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

  // Reset all derived state and re-fetch whenever the template changes so that
  // navigating between /routines/templates/:id paths never shows stale data.
  useEffect(() => {
    if (!template) return;

    // Reset to defaults immediately so the UI is never in a stale state
    setSteps(template.defaultSteps);
    setWhySuggested(null);
    setAiGenerated(false);
    setCheckedSteps(new Set());

    let cancelled = false;

    async function fetchAiSteps() {
      if (!template) return;
      setLoadingSteps(true);
      try {
        const res = await apiRequest("POST", "/api/routines/generate-steps", {
          templateId: template.id,
          templateTitle: template.title,
          defaultSteps: template.defaultSteps,
        });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.steps) && data.steps.length > 0) {
            setSteps(data.steps);
            setAiGenerated(!!data.aiGenerated);
            setWhySuggested(data.whySuggested ?? null);
          }
        }
      } catch {
        // Silent fallback – defaults already shown
      } finally {
        if (!cancelled) setLoadingSteps(false);
      }
    }

    fetchAiSteps();
    return () => { cancelled = true; };
  }, [templateId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!template) {
    return (
      <div className="flex flex-col h-full bg-background">
        <PageHeader title="Routine" />
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center space-y-3">
            <BookOpen className="w-12 h-12 mx-auto text-muted-foreground/40" />
            <p className="font-medium">Routine not found</p>
            <Button variant="outline" onClick={() => setLocation("/routines")}>
              Back to Routines
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const Icon = template.icon;

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

  const handleRefreshSteps = async () => {
    setLoadingSteps(true);
    setCheckedSteps(new Set());
    try {
      const res = await apiRequest("POST", "/api/routines/generate-steps", {
        templateId: template.id,
        templateTitle: template.title,
        defaultSteps: template.defaultSteps,
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.steps) && data.steps.length > 0) {
          setSteps(data.steps);
          setAiGenerated(!!data.aiGenerated);
          setWhySuggested(data.whySuggested ?? null);
          toast({ title: "Steps refreshed", description: "Your routine has been updated." });
        }
      }
    } catch {
      toast({ title: "Could not refresh", description: "Using current steps.", variant: "destructive" });
    } finally {
      setLoadingSteps(false);
    }
  };

  const handleAddToRoutines = () => {
    setAdding(true);
    try {
      const saved = saveRoutine({
        type: template.routineType,
        title: template.title,
        description: whySuggested ?? template.description,
        data: { steps, templateId, aiGenerated },
        tags: template.tags,
        dimensionSignals: template.tags,
      });

      toast({
        title: "Routine added!",
        description: `${template.title} has been saved to your routines.`,
      });

      setLocation(`/routines?selected=${encodeURIComponent(saved.id)}`);
    } catch {
      toast({
        title: "Error",
        description: "Could not save routine. Please try again.",
        variant: "destructive",
      });
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader title="Routine Preview" />

      <div className="flex-1 overflow-auto">
        <div className="p-4 max-w-2xl mx-auto space-y-6 pb-24">
          {/* Hero card */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div
                  className={`w-14 h-14 rounded-xl ${template.bgColor} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-7 h-7 ${template.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-xl font-semibold">{template.title}</h1>
                  <p className="text-sm text-muted-foreground mt-1">
                    {whySuggested ?? template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {aiGenerated && (
                      <Badge variant="outline" className="text-xs gap-1 border-primary/40 text-primary">
                        <Sparkles className="w-3 h-3" />
                        AI personalized
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps list */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                {loadingSteps ? "Personalizing steps…" : `Steps (${steps.length})`}
              </h2>
              {!loadingSteps && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs text-muted-foreground"
                  onClick={handleRefreshSteps}
                  data-testid="button-refresh-steps"
                >
                  <RefreshCw className="w-3 h-3 mr-1" />
                  Refresh
                </Button>
              )}
            </div>

            {loadingSteps ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-4 flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-muted shrink-0" />
                      <div className="h-4 bg-muted rounded flex-1" />
                    </CardContent>
                  </Card>
                ))}
                <div className="flex items-center gap-2 justify-center py-2 text-xs text-muted-foreground">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  AI is personalizing your routine…
                </div>
              </div>
            ) : (
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
                      <span className="text-xs text-muted-foreground shrink-0">
                        Step {idx + 1}
                      </span>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Tip card */}
          {!loadingSteps && (
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Tip: </span>
                  Tap any step to mark it complete. Hit "Refresh" to get a new
                  AI-generated variation, or "Add to My Routines" to save this
                  version.
                </p>
              </CardContent>
            </Card>
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
          onClick={handleAddToRoutines}
          disabled={adding || loadingSteps}
          data-testid="button-add-to-routines"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add to My Routines
        </Button>
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setLocation("/routines")}
          data-testid="button-back-to-routines"
        >
          <ChevronRight className="w-4 h-4 mr-2 rotate-180" />
          Back to Routines
        </Button>
      </div>
    </div>
  );
}
