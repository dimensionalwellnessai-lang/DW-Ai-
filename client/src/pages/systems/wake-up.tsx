import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Sun, 
  Droplets, 
  Wind, 
  Brain, 
  Heart, 
  Sparkles,
  ChevronLeft,
  Clock,
  Check
} from "lucide-react";
import { useLocation } from "wouter";
import { useSystemPreferences } from "@/hooks/use-systems-data";

interface RoutineStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: typeof Sun;
  isOptional: boolean;
  requiresFeature?: "meditationEnabled" | "spiritualEnabled" | "astrologyEnabled";
}

const MORNING_ROUTINE_STEPS: RoutineStep[] = [
  {
    id: "hydration",
    title: "Hydration",
    description: "Drink a glass of water to rehydrate after sleep",
    duration: "1 min",
    icon: Droplets,
    isOptional: false,
  },
  {
    id: "breathing",
    title: "Grounding Breath",
    description: "Take 3 deep breaths to center yourself",
    duration: "1 min",
    icon: Wind,
    isOptional: false,
  },
  {
    id: "movement",
    title: "Light Movement",
    description: "Gentle stretching or a short walk",
    duration: "5-10 min",
    icon: Sun,
    isOptional: false,
  },
  {
    id: "meditation",
    title: "Meditation Practice",
    description: "Guided or silent meditation to set your intention",
    duration: "5-15 min",
    icon: Brain,
    isOptional: true,
    requiresFeature: "meditationEnabled",
  },
  {
    id: "spiritual",
    title: "Spiritual Connection",
    description: "Prayer, gratitude, or spiritual reading",
    duration: "5-10 min",
    icon: Heart,
    isOptional: true,
    requiresFeature: "spiritualEnabled",
  },
  {
    id: "astrology",
    title: "Daily Insight",
    description: "Check your astrological guidance for today",
    duration: "2 min",
    icon: Sparkles,
    isOptional: true,
    requiresFeature: "astrologyEnabled",
  },
];

export default function WakeUpSystemPage() {
  const [, setLocation] = useLocation();
  const { prefs, isLoading } = useSystemPreferences();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  const visibleSteps = MORNING_ROUTINE_STEPS.filter(step => {
    if (!step.requiresFeature) return true;
    return prefs[step.requiresFeature] === true;
  });

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => 
      prev.includes(stepId) 
        ? prev.filter(id => id !== stepId)
        : [...prev, stepId]
    );
  };

  const completedCount = completedSteps.length;
  const totalSteps = visibleSteps.length;
  const progressPercent = totalSteps > 0 ? (completedCount / totalSteps) * 100 : 0;

  return (
    <ScrollArea className="h-full">
      <div className="p-6 max-w-2xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setLocation("/systems")}
            data-testid="button-back"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-display font-bold">Morning Anchor</h1>
            <p className="text-muted-foreground">
              Start your day with intention
            </p>
          </div>
        </div>

        {prefs.preferredWakeTime && (
          <Card className="bg-amber-500/5 border-amber-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-sm font-medium">Scheduled for {prefs.preferredWakeTime}</p>
                <p className="text-xs text-muted-foreground">Your preferred wake time</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Today's Progress</CardTitle>
              <Badge variant={progressPercent === 100 ? "default" : "secondary"}>
                {completedCount}/{totalSteps} complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Routine Steps
          </h2>
          <div className="space-y-2">
            {visibleSteps.map((step) => {
              const Icon = step.icon;
              const isCompleted = completedSteps.includes(step.id);
              
              return (
                <Card 
                  key={step.id}
                  className={`transition-all ${isCompleted ? "bg-muted/30" : ""}`}
                  data-testid={`card-step-${step.id}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleStep(step.id)}
                        className="mt-1"
                        data-testid={`checkbox-step-${step.id}`}
                      />
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                        {isCompleted ? (
                          <Check className="w-5 h-5 text-primary" />
                        ) : (
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className={`font-medium ${isCompleted ? "line-through text-muted-foreground" : ""}`}>
                            {step.title}
                          </h3>
                          {step.isOptional && (
                            <Badge variant="outline" className="text-xs">Optional</Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {step.description}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {step.duration}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {progressPercent === 100 && (
          <Card className="bg-primary/10 border-primary/20">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-8 h-8 text-primary mx-auto mb-2" />
              <h3 className="font-semibold">Morning Complete</h3>
              <p className="text-sm text-muted-foreground">
                You've anchored your day with intention
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
