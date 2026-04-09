import { useState, useEffect, useRef, useCallback } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import {
  Dumbbell,
  Timer,
  Footprints,
  Wind,
  Waves,
  Wrench,
  Play,
  Pause,
  SkipForward,
  CheckCircle2,
  Volume2,
  VolumeX,
  X,
  ChevronRight,
  RotateCcw,
  History,
  Trash2,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { ExerciseAnimation } from "@/components/exercise-animation";
import { speakOpenAI, stop as stopTTS } from "@/lib/openai-tts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type StepType = "strength" | "timed" | "distance" | "breathwork" | "mobility" | "custom";

export interface SessionStep {
  title: string;
  stepType: StepType;
  /** For strength: target sets */
  sets?: number;
  /** For strength: target reps (string like "8-12") */
  reps?: string;
  /** For strength: target weight hint */
  weight?: string;
  /** For timed / breathwork / rest: target seconds */
  durationSeconds?: number;
  /** For distance: target metres */
  distanceMeters?: number;
  /** Animation id from exercise-animations.ts */
  animationId?: string;
  notes?: string;
}

export interface WorkoutSessionConfig {
  title: string;
  sessionType: StepType;
  steps: SessionStep[];
  workoutPlanId?: string;
}

interface LoggedStep {
  stepIndex: number;
  title: string;
  stepType: StepType;
  completed: boolean;
  setsCompleted?: number;
  repsPerSet?: number[];
  weightPerSet?: number[];
  durationSeconds?: number;
  distanceMeters?: number;
  notes?: string;
}

// ─── Voice coach helper ───────────────────────────────────────────────────────

function speak(text: string, enabled: boolean) {
  if (!enabled) return;
  stopTTS();
  speakOpenAI(text).catch(() => {});
}

// ─── Step type icon map ───────────────────────────────────────────────────────

const STEP_TYPE_ICONS: Record<StepType, React.ReactNode> = {
  strength: <Dumbbell className="h-4 w-4" />,
  timed: <Timer className="h-4 w-4" />,
  distance: <Footprints className="h-4 w-4" />,
  breathwork: <Wind className="h-4 w-4" />,
  mobility: <Waves className="h-4 w-4" />,
  custom: <Wrench className="h-4 w-4" />,
};

const STEP_TYPE_LABELS: Record<StepType, string> = {
  strength: "Strength",
  timed: "Timed",
  distance: "Distance",
  breathwork: "Breathwork",
  mobility: "Mobility",
  custom: "Custom",
};

// ─── Sub-component: Logging UI for a step ─────────────────────────────────────

interface StepLoggerProps {
  step: SessionStep;
  log: Partial<LoggedStep>;
  onChange: (update: Partial<LoggedStep>) => void;
}

function StrengthLogger({ step, log, onChange }: StepLoggerProps) {
  const targetSets = step.sets ?? 3;
  const reps = log.repsPerSet ?? Array(targetSets).fill(0);
  const weights = log.weightPerSet ?? Array(targetSets).fill(0);

  function updateSet(setIdx: number, field: "reps" | "weight", val: string) {
    const num = parseFloat(val) || 0;
    if (field === "reps") {
      const next = [...reps];
      next[setIdx] = num;
      onChange({ repsPerSet: next, setsCompleted: next.filter(Boolean).length });
    } else {
      const next = [...weights];
      next[setIdx] = num;
      onChange({ weightPerSet: next });
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">
        Target: {targetSets} sets × {step.reps ?? "—"} reps
        {step.weight ? ` @ ${step.weight}` : ""}
      </p>
      <div className="grid grid-cols-3 gap-1 text-xs font-medium text-muted-foreground px-1">
        <span>Set</span>
        <span>Reps</span>
        <span>Weight (kg)</span>
      </div>
      {Array.from({ length: targetSets }).map((_, i) => (
        <div key={i} className="grid grid-cols-3 gap-1 items-center">
          <span className="text-sm font-medium pl-1">{i + 1}</span>
          <Input
            type="number"
            min={0}
            placeholder={step.reps ?? "0"}
            value={reps[i] || ""}
            onChange={(e) => updateSet(i, "reps", e.target.value)}
            className="h-8 text-sm"
          />
          <Input
            type="number"
            min={0}
            step={0.5}
            placeholder="0"
            value={weights[i] || ""}
            onChange={(e) => updateSet(i, "weight", e.target.value)}
            className="h-8 text-sm"
          />
        </div>
      ))}
    </div>
  );
}

function TimedLogger({ step, log, onChange }: StepLoggerProps) {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(log.durationSeconds ?? 0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const target = step.durationSeconds ?? 0;

  useEffect(() => {
    // Always clear any existing interval before creating a new one
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (!running) return;

    intervalRef.current = setInterval(() => {
      setElapsed((prev) => {
        const next = prev + 1;
        onChange({ durationSeconds: next });
        return next;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [running, onChange]);

  function fmt(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  return (
    <div className="space-y-3">
      {target > 0 && (
        <p className="text-sm text-muted-foreground">Target: {fmt(target)}</p>
      )}
      <div className="flex items-center gap-4">
        <span className="text-3xl font-mono font-bold">{fmt(elapsed)}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setRunning((r) => !r)}
        >
          {running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setRunning(false);
            setElapsed(0);
            onChange({ durationSeconds: 0 });
          }}
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

function DistanceLogger({ step, log, onChange }: StepLoggerProps) {
  const target = step.distanceMeters;
  return (
    <div className="space-y-2">
      {target ? (
        <p className="text-sm text-muted-foreground">
          Target: {target >= 1000 ? `${(target / 1000).toFixed(1)} km` : `${target} m`}
        </p>
      ) : null}
      <div className="flex items-center gap-2">
        <Input
          type="number"
          min={0}
          step={10}
          placeholder="Distance (metres)"
          value={log.distanceMeters ?? ""}
          onChange={(e) =>
            onChange({ distanceMeters: parseFloat(e.target.value) || 0 })
          }
          className="max-w-[160px]"
        />
        <span className="text-sm text-muted-foreground">metres</span>
      </div>
    </div>
  );
}

function GenericLogger({ log, onChange }: StepLoggerProps) {
  return (
    <div className="space-y-2">
      <Label className="text-sm">Notes</Label>
      <Input
        placeholder="Add notes or observations…"
        value={log.notes ?? ""}
        onChange={(e) => onChange({ notes: e.target.value })}
      />
    </div>
  );
}

function StepLogger(props: StepLoggerProps) {
  switch (props.step.stepType) {
    case "strength":
      return <StrengthLogger {...props} />;
    case "timed":
    case "breathwork":
      return <TimedLogger {...props} />;
    case "distance":
      return <DistanceLogger {...props} />;
    default:
      return <GenericLogger {...props} />;
  }
}

// ─── Session History sub-component ────────────────────────────────────────────

interface SessionHistoryProps {
  open: boolean;
  onClose: () => void;
}

function SessionHistory({ open, onClose }: SessionHistoryProps) {
  const { data: sessions = [] } = useQuery<
    { id: string; title: string; status: string; startedAt: string; durationSeconds: number | null }[]
  >({
    queryKey: ["/api/workout-sessions"],
    enabled: open,
  });
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/workout-sessions/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
      toast({ title: "Session removed" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Session History</DialogTitle>
          <DialogDescription>Your recent workout sessions</DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-96">
          {sessions.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              No sessions yet. Start your first workout!
            </p>
          ) : (
            <div className="space-y-2 pr-2">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{s.title}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.startedAt).toLocaleDateString()}{" "}
                      {s.durationSeconds
                        ? `· ${Math.round(s.durationSeconds / 60)} min`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 ml-2">
                    <Badge
                      variant={s.status === "completed" ? "default" : "secondary"}
                      className="text-xs"
                    >
                      {s.status}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive"
                      onClick={() => deleteMutation.mutate(s.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

interface WorkoutSessionEngineProps {
  config: WorkoutSessionConfig;
  open: boolean;
  onClose: () => void;
  /** Whether the user is authenticated (needed for server-side save) */
  isAuthenticated?: boolean;
}

export function WorkoutSessionEngine({
  config,
  open,
  onClose,
  isAuthenticated = false,
}: WorkoutSessionEngineProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // ── State ──────────────────────────────────────────────────────────────────
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [logs, setLogs] = useState<Record<number, Partial<LoggedStep>>>({});
  const [showAnimation, setShowAnimation] = useState<string | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionStarted, setSessionStarted] = useState(false);
  const [sessionFinished, setSessionFinished] = useState(false);
  const sessionStartTime = useRef<number>(0);

  const currentStep = config.steps[currentIdx];
  const totalSteps = config.steps.length;

  // ── Server mutations ───────────────────────────────────────────────────────
  const createSession = useMutation({
    mutationFn: (body: object) =>
      apiRequest("POST", "/api/workout-sessions", body).then((r) => r.json()),
    onSuccess: (data: { id: string }) => {
      setSessionId(data.id);
    },
  });

  const updateSession = useMutation({
    mutationFn: ({ id, body }: { id: string; body: object }) =>
      apiRequest("PATCH", `/api/workout-sessions/${id}`, body),
  });

  const logStep = useMutation({
    mutationFn: ({
      id,
      stepIndex,
      body,
    }: {
      id: string;
      stepIndex: number;
      body: object;
    }) =>
      apiRequest("PUT", `/api/workout-sessions/${id}/steps/${stepIndex}`, body),
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  function updateLog(idx: number, patch: Partial<LoggedStep>) {
    setLogs((prev) => ({ ...prev, [idx]: { ...prev[idx], ...patch } }));
  }

  const persistStep = useCallback(
    (stepIdx: number) => {
      if (!isAuthenticated || !sessionId) return;
      const log = logs[stepIdx] ?? {};
      const step = config.steps[stepIdx];
      logStep.mutate({
        id: sessionId,
        stepIndex: stepIdx,
        body: {
          title: step.title,
          stepType: step.stepType,
          completed: log.completed ?? false,
          setsCompleted: log.setsCompleted ?? null,
          repsPerSet: log.repsPerSet ? JSON.stringify(log.repsPerSet) : null,
          weightPerSet: log.weightPerSet ? JSON.stringify(log.weightPerSet) : null,
          durationSeconds: log.durationSeconds ?? null,
          distanceMeters: log.distanceMeters ?? null,
          notes: log.notes ?? null,
        },
      });
    },
    [isAuthenticated, sessionId, logs, config.steps, logStep]
  );

  // ── Lifecycle ──────────────────────────────────────────────────────────────
  // Reset state when dialog opens with a new config
  useEffect(() => {
    if (open) {
      setCurrentIdx(0);
      setLogs({});
      setSessionStarted(false);
      setSessionFinished(false);
      setSessionId(null);
    }
  }, [open, config.title, config.sessionType, config.workoutPlanId, config.steps.length]);

  function handleStart() {
    setSessionStarted(true);
    sessionStartTime.current = Date.now();
    speak(`Starting ${config.title}. Let's go!`, voiceEnabled);

    if (isAuthenticated) {
      createSession.mutate({
        title: config.title,
        sessionType: config.sessionType,
        workoutPlanId: config.workoutPlanId ?? null,
        voiceCoachEnabled: voiceEnabled,
      });
    }
  }

  function handleMarkComplete() {
    const updatedLog = { ...logs[currentIdx], completed: true };
    updateLog(currentIdx, updatedLog);

    // Voice feedback per type
    const step = config.steps[currentIdx];
    if (step.stepType === "strength") {
      speak(
        `${step.title} done. ${updatedLog.setsCompleted ?? step.sets ?? 0} sets completed.`,
        voiceEnabled
      );
    } else if (step.stepType === "timed" || step.stepType === "breathwork") {
      speak(`${step.title} complete. Well done.`, voiceEnabled);
    } else {
      speak(`${step.title} logged.`, voiceEnabled);
    }

    // Persist
    if (isAuthenticated && sessionId) {
      logStep.mutate({
        id: sessionId,
        stepIndex: currentIdx,
        body: {
          title: step.title,
          stepType: step.stepType,
          completed: true,
          setsCompleted: updatedLog.setsCompleted ?? null,
          repsPerSet: updatedLog.repsPerSet ? JSON.stringify(updatedLog.repsPerSet) : null,
          weightPerSet: updatedLog.weightPerSet ? JSON.stringify(updatedLog.weightPerSet) : null,
          durationSeconds: updatedLog.durationSeconds ?? null,
          distanceMeters: updatedLog.distanceMeters ?? null,
          notes: updatedLog.notes ?? null,
        },
      });
    }
  }

  function handleNext() {
    // Persist current step if not yet done
    persistStep(currentIdx);

    if (currentIdx < totalSteps - 1) {
      const nextIdx = currentIdx + 1;
      setCurrentIdx(nextIdx);
      const nextStep = config.steps[nextIdx];
      speak(`Next: ${nextStep.title}`, voiceEnabled);
    } else {
      handleFinish();
    }
  }

  function handleFinish() {
    setSessionFinished(true);
    const durationSeconds = Math.round((Date.now() - sessionStartTime.current) / 1000);
    speak("Great work! Session complete.", voiceEnabled);

    if (isAuthenticated && sessionId) {
      updateSession.mutate({
        id: sessionId,
        body: {
          status: "completed",
          completedAt: new Date().toISOString(),
          durationSeconds,
        },
      });
      queryClient.invalidateQueries({ queryKey: ["/api/workout-sessions"] });
    }

    if (isAuthenticated) {
      toast({ title: "Session complete! 💪", description: "Your workout has been saved." });
    } else {
      toast({ title: "Session complete! 💪", description: "Session finished. Sign in to save your history." });
    }
  }

  function handleSkip() {
    if (currentIdx < totalSteps - 1) {
      setCurrentIdx((i) => i + 1);
      const nextTitle = config.steps[currentIdx + 1]?.title ?? "end of workout";
      speak(`Skipped. Next: ${nextTitle}`, voiceEnabled);
    }
  }

  // ── Render helpers ─────────────────────────────────────────────────────────
  const completedCount = Object.values(logs).filter((l) => l.completed).length;

  function renderPreSession() {
    return (
      <div className="space-y-4">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground text-sm">
            {totalSteps} steps · {STEP_TYPE_LABELS[config.sessionType]}
          </p>
          <p className="text-sm">
            Voice coach will guide you through each step.
          </p>
        </div>
        <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
          {config.steps.map((step, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-2 rounded-lg bg-muted/40 text-sm"
            >
              <span className="text-muted-foreground">{STEP_TYPE_ICONS[step.stepType]}</span>
              <span className="font-medium flex-1">{step.title}</span>
              <Badge variant="outline" className="text-xs">
                {STEP_TYPE_LABELS[step.stepType]}
              </Badge>
            </div>
          ))}
        </div>
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            {voiceEnabled ? (
              <Volume2 className="h-4 w-4 text-muted-foreground" />
            ) : (
              <VolumeX className="h-4 w-4 text-muted-foreground" />
            )}
            <Label className="text-sm">Voice coach</Label>
            <Switch
              checked={voiceEnabled}
              onCheckedChange={setVoiceEnabled}
            />
          </div>
        </div>
        <Button className="w-full" onClick={handleStart}>
          <Play className="h-4 w-4 mr-2" />
          Start Session
        </Button>
      </div>
    );
  }

  function renderFinished() {
    return (
      <div className="space-y-4 text-center">
        <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto" />
        <div>
          <p className="text-xl font-semibold">Session Complete! 💪</p>
          <p className="text-sm text-muted-foreground mt-1">
            {completedCount} of {totalSteps} steps logged
          </p>
        </div>
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={() => setShowHistory(true)}>
            <History className="h-4 w-4 mr-1" />
            History
          </Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    );
  }

  function renderActiveSession() {
    if (!currentStep) return null;
    const log = logs[currentIdx] ?? {};
    const isCompleted = !!log.completed;

    return (
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="w-full bg-muted rounded-full h-1.5">
          <div
            className="bg-primary h-1.5 rounded-full transition-all"
            style={{ width: `${((currentIdx + 1) / totalSteps) * 100}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground text-right">
          Step {currentIdx + 1} of {totalSteps}
        </p>

        {/* Step card */}
        <Card className={cn("border", isCompleted && "border-green-500/50 bg-green-50/30 dark:bg-green-900/10")}>
          <CardHeader className="pb-2 pt-4 px-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {STEP_TYPE_ICONS[currentStep.stepType]}
                <CardTitle className="text-base">{currentStep.title}</CardTitle>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {STEP_TYPE_LABELS[currentStep.stepType]}
                </Badge>
                {isCompleted && (
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-4 space-y-3">
            {/* Animation button */}
            {currentStep.animationId && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setShowAnimation(currentStep.animationId!)}
              >
                Show demo animation
              </Button>
            )}
            {/* Fallback: text description when no animation */}
            {!currentStep.animationId && currentStep.notes && (
              <p className="text-sm text-muted-foreground">{currentStep.notes}</p>
            )}

            {/* Logging UI */}
            <StepLogger
              step={currentStep}
              log={log}
              onChange={(patch) => updateLog(currentIdx, patch)}
            />
          </CardContent>
        </Card>

        {/* Action buttons */}
        <div className="flex gap-2">
          {!isCompleted ? (
            <Button className="flex-1" onClick={handleMarkComplete}>
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Mark Complete
            </Button>
          ) : (
            <Button variant="outline" className="flex-1" onClick={() => updateLog(currentIdx, { completed: false })}>
              Undo
            </Button>
          )}
          {currentIdx < totalSteps - 1 ? (
            <>
              <Button variant="outline" size="icon" onClick={handleSkip} aria-label="Skip step">
                <SkipForward className="h-4 w-4" aria-hidden="true" />
              </Button>
              <Button size="icon" onClick={handleNext} aria-label="Next step">
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            </>
          ) : (
            <Button variant="default" onClick={handleFinish} className="flex-1">
              Finish Session
            </Button>
          )}
        </div>

        {/* Voice toggle */}
        <div className="flex items-center gap-2 pt-1">
          {voiceEnabled ? (
            <Volume2 className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <VolumeX className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <Label className="text-xs text-muted-foreground">Voice coach</Label>
          <Switch
            checked={voiceEnabled}
            onCheckedChange={(v) => {
              setVoiceEnabled(v);
              if (v) speak("Voice coach enabled.", true);
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => { if (!v) { stopTTS(); onClose(); } }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="pr-6">{config.title}</DialogTitle>
              <div className="flex items-center gap-1">
                {isAuthenticated && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setShowHistory(true)}
                    title="Session history"
                  >
                    <History className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            {!sessionStarted && (
              <DialogDescription>
                Review your session and start when ready.
              </DialogDescription>
            )}
          </DialogHeader>

          {!sessionStarted && renderPreSession()}
          {sessionStarted && !sessionFinished && renderActiveSession()}
          {sessionFinished && renderFinished()}
        </DialogContent>
      </Dialog>

      {/* Exercise animation overlay */}
      {showAnimation && (
        <Dialog open={!!showAnimation} onOpenChange={() => setShowAnimation(null)}>
          <DialogContent>
            <ExerciseAnimation
              exerciseId={showAnimation}
              onClose={() => setShowAnimation(null)}
            />
          </DialogContent>
        </Dialog>
      )}

      {/* Session history dialog */}
      {isAuthenticated && (
        <SessionHistory open={showHistory} onClose={() => setShowHistory(false)} />
      )}
    </>
  );
}
