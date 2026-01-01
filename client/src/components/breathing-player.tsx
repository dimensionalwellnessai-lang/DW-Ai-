import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Play, Pause, X, Wind, Moon, Focus, Sparkles } from "lucide-react";

type BreathPhase = "inhale" | "hold" | "exhale" | "holdOut" | "complete";

interface BreathPattern {
  id: string;
  name: string;
  description: string;
  inhale: number;
  holdIn: number;
  exhale: number;
  holdOut: number;
}

const BREATH_PATTERNS: BreathPattern[] = [
  {
    id: "box",
    name: "Box Breathing",
    description: "Calming 4-4-4-4 pattern used by Navy SEALs",
    inhale: 4,
    holdIn: 4,
    exhale: 4,
    holdOut: 4,
  },
  {
    id: "478",
    name: "4-7-8 Breathing",
    description: "Relaxation technique for sleep and anxiety",
    inhale: 4,
    holdIn: 7,
    exhale: 8,
    holdOut: 0,
  },
  {
    id: "calm",
    name: "Calm Reset",
    description: "Simple 5 in, 5 out for quick calm",
    inhale: 5,
    holdIn: 0,
    exhale: 5,
    holdOut: 0,
  },
  {
    id: "quick",
    name: "Quick Grounding",
    description: "Fast 3-3-3 for immediate relief",
    inhale: 3,
    holdIn: 3,
    exhale: 3,
    holdOut: 0,
  },
];

const DURATIONS = [
  { value: 1, label: "1 min" },
  { value: 3, label: "3 min" },
  { value: 5, label: "5 min" },
  { value: 10, label: "10 min" },
];

const GOALS = [
  { id: "calm", label: "Calm down", icon: Wind },
  { id: "focus", label: "Focus", icon: Focus },
  { id: "sleep", label: "Sleep", icon: Moon },
];

interface BreathingPlayerProps {
  open: boolean;
  onClose: () => void;
  onComplete?: (pattern: string, duration: number) => void;
}

export function BreathingPlayer({ open, onClose, onComplete }: BreathingPlayerProps) {
  const [step, setStep] = useState<"setup" | "breathing" | "checkin">("setup");
  const [selectedPattern, setSelectedPattern] = useState<BreathPattern>(BREATH_PATTERNS[0]);
  const [selectedDuration, setSelectedDuration] = useState(3);
  const [selectedGoal, setSelectedGoal] = useState("calm");
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentPhase, setCurrentPhase] = useState<BreathPhase>("inhale");
  const [phaseProgress, setPhaseProgress] = useState(0);
  const [totalElapsed, setTotalElapsed] = useState(0);
  const [cycleCount, setCycleCount] = useState(0);

  const totalDurationSeconds = selectedDuration * 60;

  const getPhaseInstruction = (phase: BreathPhase): string => {
    switch (phase) {
      case "inhale":
        return "Breathe in...";
      case "hold":
        return "Hold...";
      case "exhale":
        return "Breathe out...";
      case "holdOut":
        return "Hold...";
      case "complete":
        return "Complete";
      default:
        return "";
    }
  };

  const getPhaseDuration = useCallback((phase: BreathPhase): number => {
    switch (phase) {
      case "inhale":
        return selectedPattern.inhale;
      case "hold":
        return selectedPattern.holdIn;
      case "exhale":
        return selectedPattern.exhale;
      case "holdOut":
        return selectedPattern.holdOut;
      default:
        return 0;
    }
  }, [selectedPattern]);

  const getNextPhase = useCallback((current: BreathPhase): BreathPhase => {
    switch (current) {
      case "inhale":
        return selectedPattern.holdIn > 0 ? "hold" : "exhale";
      case "hold":
        return "exhale";
      case "exhale":
        return selectedPattern.holdOut > 0 ? "holdOut" : "inhale";
      case "holdOut":
        return "inhale";
      default:
        return "inhale";
    }
  }, [selectedPattern]);

  useEffect(() => {
    if (!isPlaying || step !== "breathing") return;

    const interval = setInterval(() => {
      setPhaseProgress((prev) => {
        const phaseDuration = getPhaseDuration(currentPhase);
        if (prev >= phaseDuration) {
          const nextPhase = getNextPhase(currentPhase);
          if (nextPhase === "inhale") {
            setCycleCount((c) => c + 1);
          }
          setCurrentPhase(nextPhase);
          return 0;
        }
        return prev + 0.1;
      });

      setTotalElapsed((prev) => {
        if (prev >= totalDurationSeconds) {
          setIsPlaying(false);
          setStep("checkin");
          return prev;
        }
        return prev + 0.1;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, step, currentPhase, getPhaseDuration, getNextPhase, totalDurationSeconds]);

  const startSession = () => {
    setStep("breathing");
    setCurrentPhase("inhale");
    setPhaseProgress(0);
    setTotalElapsed(0);
    setCycleCount(0);
    setIsPlaying(true);
  };

  const togglePause = () => {
    setIsPlaying(!isPlaying);
  };

  const endSession = () => {
    setIsPlaying(false);
    setStep("checkin");
  };

  const handleComplete = () => {
    onComplete?.(selectedPattern.name, selectedDuration);
    onClose();
    setStep("setup");
    setTotalElapsed(0);
  };

  const handleClose = () => {
    setIsPlaying(false);
    setStep("setup");
    setTotalElapsed(0);
    onClose();
  };

  const progressPercent = (totalElapsed / totalDurationSeconds) * 100;
  const phasePercent = (phaseProgress / getPhaseDuration(currentPhase)) * 100;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Wind className="h-5 w-5 text-primary" />
            Guided Breathing
          </DialogTitle>
        </DialogHeader>

        {step === "setup" && (
          <div className="space-y-6">
            <div>
              <p className="text-sm font-medium mb-3">Choose a pattern</p>
              <div className="grid gap-2">
                {BREATH_PATTERNS.map((pattern) => (
                  <button
                    key={pattern.id}
                    onClick={() => setSelectedPattern(pattern)}
                    className={`p-3 rounded-lg text-left transition-colors ${
                      selectedPattern.id === pattern.id
                        ? "bg-primary/10 border border-primary"
                        : "bg-muted/50 border border-transparent hover-elevate"
                    }`}
                    data-testid={`button-pattern-${pattern.id}`}
                  >
                    <div className="font-medium text-sm">{pattern.name}</div>
                    <div className="text-xs text-muted-foreground">{pattern.description}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Duration</p>
              <div className="flex gap-2">
                {DURATIONS.map((d) => (
                  <Button
                    key={d.value}
                    variant={selectedDuration === d.value ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedDuration(d.value)}
                    data-testid={`button-duration-${d.value}`}
                  >
                    {d.label}
                  </Button>
                ))}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-3">Goal</p>
              <div className="flex gap-2">
                {GOALS.map((g) => {
                  const Icon = g.icon;
                  return (
                    <Button
                      key={g.id}
                      variant={selectedGoal === g.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedGoal(g.id)}
                      className="gap-1"
                      data-testid={`button-goal-${g.id}`}
                    >
                      <Icon className="h-3 w-3" />
                      {g.label}
                    </Button>
                  );
                })}
              </div>
            </div>

            <Button onClick={startSession} className="w-full" data-testid="button-start-breathing">
              <Play className="h-4 w-4 mr-2" />
              Start
            </Button>
          </div>
        )}

        {step === "breathing" && (
          <div className="space-y-6 py-4">
            <div className="text-center">
              <Badge variant="secondary" className="mb-4">
                {selectedPattern.name}
              </Badge>
              
              <div className="relative w-48 h-48 mx-auto mb-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="8"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    strokeDasharray={553}
                    strokeDashoffset={553 - (553 * phasePercent) / 100}
                    strokeLinecap="round"
                    className="transition-all duration-100"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-display font-bold">
                    {Math.ceil(getPhaseDuration(currentPhase) - phaseProgress)}
                  </span>
                  <span className="text-muted-foreground text-sm">
                    {getPhaseInstruction(currentPhase)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary/50 transition-all duration-100"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{Math.floor(totalElapsed / 60)}:{String(Math.floor(totalElapsed % 60)).padStart(2, "0")}</span>
                  <span>Cycle {cycleCount + 1}</span>
                  <span>{selectedDuration}:00</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={endSession}
                className="flex-1"
                data-testid="button-end-session"
              >
                <X className="h-4 w-4 mr-2" />
                End
              </Button>
              <Button
                onClick={togglePause}
                className="flex-1"
                data-testid="button-toggle-pause"
              >
                {isPlaying ? (
                  <>
                    <Pause className="h-4 w-4 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Resume
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === "checkin" && (
          <div className="space-y-6 py-4 text-center">
            <div className="inline-flex p-4 rounded-full bg-primary/10">
              <Sparkles className="h-10 w-10 text-primary" />
            </div>
            
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">
                Nice work
              </h3>
              <p className="text-muted-foreground text-sm">
                You completed {cycleCount} breathing cycles in {selectedDuration} minutes.
              </p>
            </div>

            <Card className="text-left">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">How do you feel now?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Take a moment to notice any shifts in your body or mind. Even small changes matter.
                </p>
              </CardContent>
            </Card>

            <Button onClick={handleComplete} className="w-full" data-testid="button-finish-breathing">
              Done
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
