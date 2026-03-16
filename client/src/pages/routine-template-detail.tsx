import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { useToast } from "@/hooks/use-toast";
import {
  Sun,
  Moon,
  Coffee,
  Briefcase,
  Check,
  Plus,
  BookOpen,
  ChevronRight,
} from "lucide-react";
import { useLocation, useParams } from "wouter";
import {
  saveRoutine,
  getGettingToKnowYou,
} from "@/lib/guest-storage";

/** Routine templates – kept in sync with the list in routines.tsx */
export const SUGGESTED_ROUTINES = [
  {
    id: "morning",
    title: "Morning Routine",
    icon: Sun,
    description: "Start your day with intention",
    defaultSteps: [
      "Wake up gently",
      "Hydrate with water",
      "5-min stretch",
      "Set daily intention",
      "Light breakfast",
    ],
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    tags: ["morning", "energy", "mindfulness"],
    routineType: "workout" as const, // closest type: physical morning wake-up
  },
  {
    id: "work",
    title: "Work Routine",
    icon: Briefcase,
    description: "Stay focused and productive",
    defaultSteps: [
      "Clear workspace",
      "Review priorities",
      "Deep work block",
      "Short break every 90 min",
      "End-of-day review",
    ],
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
    tags: ["productivity", "focus", "work"],
    routineType: "spiritual_practice" as const, // mindset/discipline practice
  },
  {
    id: "lunch",
    title: "Lunch Routine",
    icon: Coffee,
    description: "Recharge midday",
    defaultSteps: [
      "Step away from work",
      "Mindful eating",
      "Brief walk",
      "Quick reset meditation",
    ],
    color: "text-orange-500",
    bgColor: "bg-orange-500/10",
    tags: ["lunch", "reset", "mindfulness"],
    routineType: "meal_plan" as const, // nutrition/meal-based
  },
  {
    id: "evening",
    title: "Evening Routine",
    icon: Moon,
    description: "Wind down peacefully",
    defaultSteps: [
      "Limit screens 1hr before bed",
      "Light stretching",
      "Gratitude reflection",
      "Prepare for tomorrow",
      "Relaxing activity",
    ],
    color: "text-purple-500",
    bgColor: "bg-purple-500/10",
    tags: ["evening", "relaxation", "sleep"],
    routineType: "meditation" as const, // wind-down/relaxation practice
  },
];

function getPersonalizedSteps(routineId: string): string[] {
  const routine = SUGGESTED_ROUTINES.find((r) => r.id === routineId);
  if (!routine) return [];

  const steps = [...routine.defaultSteps];
  const gtky = getGettingToKnowYou();

  if (gtky?.peakEnergyTime === "morning" && routineId === "morning") {
    steps[0] = "Quick energizing workout";
  }
  if (gtky?.peakEnergyTime === "evening" && routineId === "evening") {
    steps.unshift("Light exercise");
  }
  if (gtky?.dayStructure === "scattered" && routineId === "work") {
    steps.unshift("Time block your day");
  }

  return steps;
}

export default function RoutineTemplateDetailPage() {
  const params = useParams<{ templateId: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const templateId = params.templateId;
  const template = SUGGESTED_ROUTINES.find((r) => r.id === templateId);

  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);

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
  const steps = getPersonalizedSteps(templateId);

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

  const handleAddToRoutines = () => {
    setAdding(true);
    try {
      const saved = saveRoutine({
        type: template.routineType,
        title: template.title,
        description: template.description,
        data: { steps, templateId },
        tags: template.tags,
        dimensionSignals: template.tags,
      });

      toast({
        title: "Routine added!",
        description: `${template.title} has been added to your routines.`,
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
                    {template.description}
                  </p>
                  <div className="flex flex-wrap gap-1 mt-3">
                    {template.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Steps list */}
          <div className="space-y-2">
            <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
              Steps ({steps.length})
            </h2>
            <div className="space-y-2">
              {steps.map((step, idx) => (
                <Card
                  key={idx}
                  className={`hover-elevate cursor-pointer transition-all ${
                    checkedSteps.has(idx)
                      ? "opacity-60 bg-muted/50"
                      : ""
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
          </div>

          {/* Tip card */}
          <Card className="bg-primary/5 border-primary/20">
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">Tip: </span>
                Tap any step to mark it as completed while following along. Add
                this routine to start tracking your progress.
              </p>
            </CardContent>
          </Card>
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
          disabled={adding}
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
