import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { 
  Moon, 
  ChevronLeft,
  Clock,
  Monitor,
  PenLine,
  Heart,
  Sparkles,
  Check,
  BookOpen
} from "lucide-react";
import { useLocation } from "wouter";
import { useSystemPreferences } from "@/hooks/use-systems-data";

interface WindDownStep {
  id: string;
  title: string;
  description: string;
  duration: string;
  icon: typeof Moon;
  isOptional: boolean;
  requiresFeature?: "journalingEnabled" | "spiritualEnabled";
  hasInput?: boolean;
  inputPlaceholder?: string;
}

const WIND_DOWN_STEPS: WindDownStep[] = [
  {
    id: "screen-reduction",
    title: "Screen Reduction",
    description: "Put away devices or enable night mode",
    duration: "Ongoing",
    icon: Monitor,
    isOptional: false,
  },
  {
    id: "reflection",
    title: "Day Reflection",
    description: "What went well today? What would you do differently?",
    duration: "5 min",
    icon: BookOpen,
    isOptional: false,
    hasInput: true,
    inputPlaceholder: "What are you grateful for today?",
  },
  {
    id: "journaling",
    title: "Evening Journal",
    description: "Free-write your thoughts and feelings",
    duration: "10-15 min",
    icon: PenLine,
    isOptional: true,
    requiresFeature: "journalingEnabled",
    hasInput: true,
    inputPlaceholder: "Write freely about your day...",
  },
  {
    id: "spiritual",
    title: "Spiritual Practice",
    description: "Evening prayer, meditation, or gratitude",
    duration: "5-10 min",
    icon: Heart,
    isOptional: true,
    requiresFeature: "spiritualEnabled",
  },
  {
    id: "sleep-prep",
    title: "Sleep Preparation",
    description: "Lower lights, comfortable temperature, calming environment",
    duration: "10 min",
    icon: Moon,
    isOptional: false,
  },
];

export default function WindDownSystemPage() {
  const [, setLocation] = useLocation();
  const { prefs, isLoading } = useSystemPreferences();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [journalEntries, setJournalEntries] = useState<Record<string, string>>({});

  const visibleSteps = WIND_DOWN_STEPS.filter(step => {
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

  const handleJournalChange = (stepId: string, value: string) => {
    setJournalEntries(prev => ({ ...prev, [stepId]: value }));
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
            <h1 className="text-2xl font-display font-bold">Evening Transition</h1>
            <p className="text-muted-foreground">
              Wind down and prepare for rest
            </p>
          </div>
        </div>

        {prefs.preferredSleepTime && (
          <Card className="bg-indigo-500/5 border-indigo-500/20">
            <CardContent className="p-4 flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-500" />
              <div>
                <p className="text-sm font-medium">Target bedtime: {prefs.preferredSleepTime}</p>
                <p className="text-xs text-muted-foreground">Start winding down 1-2 hours before</p>
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base">Tonight's Progress</CardTitle>
              <Badge variant={progressPercent === 100 ? "default" : "secondary"}>
                {completedCount}/{totalSteps} complete
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-3">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
            Wind-Down Steps
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
                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start gap-4">
                      <Checkbox
                        checked={isCompleted}
                        onCheckedChange={() => toggleStep(step.id)}
                        className="mt-1"
                        data-testid={`checkbox-step-${step.id}`}
                      />
                      <div className={`w-10 h-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0`}>
                        {isCompleted ? (
                          <Check className="w-5 h-5 text-indigo-500" />
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
                    {step.hasInput && !isCompleted && (
                      <Textarea
                        placeholder={step.inputPlaceholder}
                        value={journalEntries[step.id] || ""}
                        onChange={(e) => handleJournalChange(step.id, e.target.value)}
                        className="min-h-[80px] text-sm"
                        data-testid={`textarea-${step.id}`}
                      />
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {progressPercent === 100 && (
          <Card className="bg-indigo-500/10 border-indigo-500/20">
            <CardContent className="p-4 text-center">
              <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
              <h3 className="font-semibold">Ready for Rest</h3>
              <p className="text-sm text-muted-foreground">
                You've prepared your mind and body for restful sleep
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </ScrollArea>
  );
}
