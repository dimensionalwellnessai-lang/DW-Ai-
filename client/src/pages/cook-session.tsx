import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { PageHeader } from "@/components/page-header";
import { IngredientSubstitutesDialog } from "@/components/ingredient-substitutes-dialog";
import { useToast } from "@/hooks/use-toast";
import {
  ChefHat,
  Play,
  Pause,
  SkipForward,
  SkipBack,
  Timer,
  Check,
  ArrowRightLeft,
  Sparkles,
  History,
  AlertTriangle,
  Loader2,
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Flag,
  MessageCircle,
  Zap,
  BookOpen,
  Clock,
  Users,
  Utensils,
} from "lucide-react";
import {
  getMealPrepPreferences,
  getActiveCookSession,
  getCookSessionHistory,
  upsertCookSessionHistoryEntry,
  deleteCookSessionHistoryEntry,
  type CookSessionRecipe,
  type CookSessionHistoryEntry,
  type CookMismatchReport,
  type CookSessionIngredient,
} from "@/lib/guest-storage";
import { usePageMeta } from "@/hooks/use-page-meta";


// ─── helpers ────────────────────────────────────────────────────────────────

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function buildRecipeFromAIResult(result: Record<string, unknown>): CookSessionRecipe {
  const rawIngredients = Array.isArray(result.ingredients)
    ? (result.ingredients as { name: string; amount: string; unit: string; notes?: string }[])
    : [];
  return {
    id: generateId(),
    title: (result.title as string) ?? "Recipe",
    description: (result.description as string) ?? "",
    servings: (result.servings as number) ?? 2,
    prepTimeMinutes: (result.prepTimeMinutes as number) ?? 10,
    cookTimeMinutes: (result.cookTimeMinutes as number) ?? 20,
    tags: Array.isArray(result.tags) ? (result.tags as string[]) : [],
    dietaryTags: Array.isArray(result.dietaryTags) ? (result.dietaryTags as string[]) : [],
    ingredients: rawIngredients.map((ing) => ({
      id: generateId(),
      name: ing.name,
      amount: ing.amount,
      unit: ing.unit,
      notes: ing.notes,
    })),
    steps: Array.isArray(result.steps)
      ? (result.steps as { stepNumber: number; instruction: string; timerSeconds?: number; ingredientsUsed: string[] }[])
      : [],
    tips: Array.isArray(result.tips) ? (result.tips as string[]) : [],
    source: "ai-generated",
    createdAt: Date.now(),
  };
}

// ─── sub-components ─────────────────────────────────────────────────────────

interface StepTimerProps {
  totalSeconds: number;
  onDone: () => void;
}

function StepTimer({ totalSeconds, onDone }: StepTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [running, setRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stop = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    setRunning(false);
  }, []);

  const start = useCallback(() => {
    if (secondsLeft <= 0 || intervalRef.current) return;
    setRunning(true);
    intervalRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          stop();
          onDone();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [secondsLeft, onDone, stop]);

  useEffect(() => () => stop(), [stop]);

  const reset = () => {
    stop();
    setSecondsLeft(totalSeconds);
  };

  const pct = totalSeconds > 0 ? ((totalSeconds - secondsLeft) / totalSeconds) * 100 : 0;

  return (
    <div className="rounded-lg bg-muted/40 p-3 space-y-2">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-sm font-medium">
          <Timer className="h-4 w-4 text-primary" />
          {formatTime(secondsLeft)}
        </span>
        <div className="flex gap-1.5">
          {!running ? (
            <Button size="sm" variant="outline" onClick={start} disabled={secondsLeft <= 0} data-testid="button-timer-start">
              <Play className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button size="sm" variant="outline" onClick={stop} data-testid="button-timer-pause">
              <Pause className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={reset} data-testid="button-timer-reset">
            <RotateCcw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
      <Progress value={pct} className="h-1.5" />
    </div>
  );
}

// ─── mismatch report dialog ─────────────────────────────────────────────────

interface MismatchDialogProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  stepNumber?: number;
  onSubmit: (report: CookMismatchReport) => void;
}

function MismatchDialog({ open, onOpenChange, stepNumber, onSubmit }: MismatchDialogProps) {
  const [type, setType] = useState<CookMismatchReport["type"]>("other");
  const [detail, setDetail] = useState("");

  const handleSubmit = () => {
    if (!detail.trim()) return;
    onSubmit({ type, stepNumber, detail: detail.trim(), reportedAt: Date.now() });
    setDetail("");
    setType("other");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Report an issue
          </DialogTitle>
          <DialogDescription>
            {stepNumber ? `Step ${stepNumber}` : "Recipe"} — what's not working?
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            {(["ingredient-missing", "step-unclear", "time-off", "other"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`text-sm px-3 py-2 rounded-lg border transition-colors ${
                  type === t ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50"
                }`}
                data-testid={`button-mismatch-type-${t}`}
              >
                {t === "ingredient-missing" ? "Missing ingredient"
                  : t === "step-unclear" ? "Step unclear"
                  : t === "time-off" ? "Timer wrong"
                  : "Other"}
              </button>
            ))}
          </div>
          <Textarea
            placeholder="Describe the issue..."
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            rows={3}
            data-testid="textarea-mismatch-detail"
          />
          <Button className="w-full" onClick={handleSubmit} disabled={!detail.trim()} data-testid="button-mismatch-submit">
            Submit report
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── main page ───────────────────────────────────────────────────────────────

type PageView = "entry" | "session" | "history";
type EntryTab = "search" | "have" | "ai";

export default function CookSessionPage() {
  usePageMeta("Cook Session", "Active cooking session with step-by-step guidance.");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // ── view state
  const [view, setView] = useState<PageView>("entry");
  const [entryTab, setEntryTab] = useState<EntryTab>("search");
  const [sessionMode, setSessionMode] = useState<"lightweight" | "full">("full");

  // ── entry form state
  const [searchQuery, setSearchQuery] = useState("");
  const [haveIngredients, setHaveIngredients] = useState("");
  const [aiPrompt, setAiPrompt] = useState("");

  // ── active session
  const [session, setSession] = useState<CookSessionHistoryEntry | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<string>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [showIngredients, setShowIngredients] = useState(true);

  // ── substitutes dialog
  const [subDialog, setSubDialog] = useState<{ open: boolean; ingredient: CookSessionIngredient | null }>({
    open: false,
    ingredient: null,
  });

  // ── mismatch dialog
  const [mismatchDialog, setMismatchDialog] = useState<{ open: boolean; stepNumber?: number }>({
    open: false,
  });

  // ── conversation mode
  const [convMessages, setConvMessages] = useState<{ role: "assistant" | "user"; text: string }[]>([]);
  const [convInput, setConvInput] = useState("");
  const [showConv, setShowConv] = useState(false);

  // ── history
  const [history, setHistory] = useState<CookSessionHistoryEntry[]>([]);

  // ── preferences (for AI context)
  const prefs = getMealPrepPreferences();

  // Load history and check for active session
  useEffect(() => {
    setHistory(getCookSessionHistory());
    const active = getActiveCookSession();
    if (active) {
      setSession(active);
      setCurrentStep(active.currentStep);
      setCheckedIngredients(new Set(active.checkedIngredients));
      setCompletedSteps(new Set(active.completedSteps));
      setView("session");
    }
  }, []);

  // ── persist session state on change
  const persistSession = useCallback(
    (update: Partial<CookSessionHistoryEntry>) => {
      setSession((prev) => {
        if (!prev) return prev;
        const updated: CookSessionHistoryEntry = { ...prev, ...update };
        upsertCookSessionHistoryEntry(updated);
        return updated;
      });
    },
    []
  );

  // ── generate recipe mutation
  const generateMutation = useMutation({
    mutationFn: async (params: { query: string; preferences?: Record<string, unknown>; mode: string }) => {
      const response = await apiRequest("POST", "/api/ai/cook-session", params);
      return response.json();
    },
    onSuccess: (data) => {
      const recipe = buildRecipeFromAIResult(data);
      startSession(recipe);
    },
    onError: () => {
      toast({ title: "Couldn't generate recipe", description: "Please try again.", variant: "destructive" });
    },
  });

  // ── conversation AI mutation
  const convMutation = useMutation({
    mutationFn: async (message: string) => {
      if (!session?.recipe) return { reply: "No active recipe." };
      // Sanitize user input: strip angle brackets and newlines that could alter prompt context
      const safeMessage = message.replace(/[<>]/g, "").replace(/[\r\n]+/g, " ").trim();
      const stepsContext = session.recipe.steps
        .map((s) => `Step ${s.stepNumber}: ${s.instruction}`)
        .join("\n");
      const contextualMessage = `[Cooking: ${session.recipe.title}, step ${currentStep + 1}]\n${stepsContext}\n\nUser question: ${safeMessage}`;
      const conversationHistory = convMessages.map((m) => ({
        role: m.role as "assistant" | "user",
        content: m.text,
      }));
      const response = await apiRequest("POST", "/api/chat", {
        message: contextualMessage,
        conversationHistory,
        context: "meals",
      });
      return response.json();
    },
    onSuccess: (data) => {
      const reply = data?.response ?? data?.content ?? "Got it!";
      setConvMessages((prev) => [...prev, { role: "assistant", text: reply }]);
    },
    onError: () => {
      toast({ title: "Could not reach DW", variant: "destructive" });
    },
  });

  // ─── Start session ──────────────────────────────────────────────────────
  function startSession(recipe: CookSessionRecipe) {
    const entry: CookSessionHistoryEntry = {
      id: generateId(),
      recipe,
      startedAt: Date.now(),
      completedAt: null,
      currentStep: 0,
      status: "in-progress",
      checkedIngredients: [],
      completedSteps: [],
      notes: "",
      mismatchReports: [],
    };
    upsertCookSessionHistoryEntry(entry);
    setSession(entry);
    setCurrentStep(0);
    setCheckedIngredients(new Set());
    setCompletedSteps(new Set());
    setShowIngredients(true);
    setConvMessages([]);
    setView("session");
    setHistory(getCookSessionHistory());
  }

  function handleGenerate() {
    const preferences = {
      dietaryStyle: prefs?.dietaryStyle ?? undefined,
      restrictions: prefs?.restrictions ?? [],
      allergies: prefs?.allergies ?? [],
      bannedIngredients: prefs?.bannedIngredients ?? [],
    };
    let query = "";
    if (entryTab === "search") query = searchQuery.trim();
    else if (entryTab === "have") query = `Make something with: ${haveIngredients.trim()}`;
    else query = aiPrompt.trim() || "Suggest a healthy meal based on my preferences";
    if (!query) return;
    generateMutation.mutate({ query, preferences, mode: sessionMode });
  }

  // ─── Session control ────────────────────────────────────────────────────
  const recipe = session?.recipe;
  const totalSteps = recipe?.steps.length ?? 0;
  const currentStepData = recipe?.steps[currentStep];

  function goToStep(step: number) {
    const clamped = Math.max(0, Math.min(totalSteps - 1, step));
    setCurrentStep(clamped);
    persistSession({ currentStep: clamped });
  }

  function markStepDone() {
    const newCompleted = new Set(completedSteps);
    newCompleted.add(currentStep);
    setCompletedSteps(newCompleted);
    persistSession({ completedSteps: Array.from(newCompleted) });
    if (currentStep < totalSteps - 1) {
      goToStep(currentStep + 1);
    } else {
      // All steps done
      persistSession({
        completedSteps: Array.from(newCompleted),
        status: "completed",
        completedAt: Date.now(),
      });
      toast({ title: "🎉 Recipe complete!", description: "Enjoy your meal!" });
    }
  }

  function pauseSession() {
    persistSession({ status: "paused", currentStep });
    toast({ title: "Session paused", description: "You can resume anytime." });
  }

  function abandonSession() {
    persistSession({ status: "abandoned" });
    setSession(null);
    setView("entry");
    setHistory(getCookSessionHistory());
  }

  function toggleIngredient(id: string) {
    const next = new Set(checkedIngredients);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCheckedIngredients(next);
    persistSession({ checkedIngredients: Array.from(next) });
  }

  function handleSubstitute(original: string, substitute: string) {
    if (!session) return;
    const updatedIngredients = session.recipe.ingredients.map((ing) =>
      ing.name === original ? { ...ing, substituteFor: original, name: substitute } : ing
    );
    const updatedRecipe = { ...session.recipe, ingredients: updatedIngredients };
    persistSession({ recipe: updatedRecipe });
    toast({ title: `Substituted: ${original} → ${substitute}` });
  }

  function handleMismatch(report: CookMismatchReport) {
    if (!session) return;
    const reports = [...(session.mismatchReports ?? []), report];
    persistSession({ mismatchReports: reports });
    toast({ title: "Issue reported", description: "Thanks for the feedback." });
  }

  function sendConvMessage() {
    const msg = convInput.trim();
    if (!msg) return;
    setConvMessages((prev) => [...prev, { role: "user", text: msg }]);
    setConvInput("");
    convMutation.mutate(msg);
  }

  function resumeHistory(entry: CookSessionHistoryEntry) {
    const resumedEntry: CookSessionHistoryEntry = { ...entry, status: "in-progress" };
    upsertCookSessionHistoryEntry(resumedEntry);
    setSession(resumedEntry);
    setCurrentStep(resumedEntry.currentStep);
    setCheckedIngredients(new Set(resumedEntry.checkedIngredients));
    setCompletedSteps(new Set(resumedEntry.completedSteps));
    setShowIngredients(true);
    setConvMessages([]);
    setView("session");
  }

  function deleteHistory(id: string) {
    deleteCookSessionHistoryEntry(id);
    setHistory(getCookSessionHistory());
  }

  function handleRecookSession(recipe: CookSessionRecipe) {
    startSession({ ...recipe, id: generateId(), createdAt: Date.now() });
  }

  // ─── ENTRY SCREEN ────────────────────────────────────────────────────────
  if (view === "entry") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader
          title="Cook Session"
          rightContent={
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setHistory(getCookSessionHistory());
                setView("history");
              }}
              data-testid="button-history"
            >
              <History className="h-5 w-5" />
            </Button>
          }
        />

        <div className="px-4 pt-2 space-y-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-3 bg-muted/40 rounded-xl p-3">
            <Zap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground flex-1">Session mode</span>
            <div className="flex rounded-lg border overflow-hidden">
              <button
                onClick={() => setSessionMode("lightweight")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  sessionMode === "lightweight" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                data-testid="button-mode-lightweight"
              >
                Lightweight
              </button>
              <button
                onClick={() => setSessionMode("full")}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  sessionMode === "full" ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                }`}
                data-testid="button-mode-full"
              >
                Full
              </button>
            </div>
          </div>

          {/* Entry tabs */}
          <Tabs value={entryTab} onValueChange={(v) => setEntryTab(v as EntryTab)}>
            <TabsList className="w-full">
              <TabsTrigger value="search" className="flex-1" data-testid="tab-search">
                <BookOpen className="h-4 w-4 mr-1.5" />
                Recipe
              </TabsTrigger>
              <TabsTrigger value="have" className="flex-1" data-testid="tab-have">
                <Utensils className="h-4 w-4 mr-1.5" />
                What I have
              </TabsTrigger>
              <TabsTrigger value="ai" className="flex-1" data-testid="tab-ai">
                <Sparkles className="h-4 w-4 mr-1.5" />
                AI suggest
              </TabsTrigger>
            </TabsList>

            <TabsContent value="search" className="pt-3 space-y-3">
              <p className="text-sm text-muted-foreground">Name a recipe or describe a dish to cook.</p>
              <Input
                placeholder="e.g. chicken stir fry, pasta carbonara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
                data-testid="input-recipe-search"
              />
            </TabsContent>

            <TabsContent value="have" className="pt-3 space-y-3">
              <p className="text-sm text-muted-foreground">List the ingredients you have — DW will suggest what to make.</p>
              <Textarea
                placeholder="e.g. chicken breast, rice, garlic, olive oil, broccoli..."
                value={haveIngredients}
                onChange={(e) => setHaveIngredients(e.target.value)}
                rows={4}
                data-testid="textarea-have-ingredients"
              />
            </TabsContent>

            <TabsContent value="ai" className="pt-3 space-y-3">
              <p className="text-sm text-muted-foreground">
                Let DW suggest a recipe based on your values and preferences
                {prefs?.dietaryStyle ? ` (${prefs.dietaryStyle})` : ""}.
              </p>
              <Input
                placeholder="Any extra guidance? (optional)"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                data-testid="input-ai-prompt"
              />
            </TabsContent>
          </Tabs>

          <Button
            className="w-full"
            size="lg"
            onClick={handleGenerate}
            disabled={generateMutation.isPending}
            data-testid="button-start-cook"
          >
            {generateMutation.isPending ? (
              <>
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                Preparing recipe…
              </>
            ) : (
              <>
                <ChefHat className="h-5 w-5 mr-2" />
                Start cooking
              </>
            )}
          </Button>

          {/* Recent history preview */}
          {history.length > 0 && (
            <div className="pt-2">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Recent sessions</h3>
              <div className="space-y-2">
                {history.slice(0, 3).map((h) => (
                  <Card
                    key={h.id}
                    className="cursor-pointer hover-elevate"
                    onClick={() => resumeHistory(h)}
                    data-testid={`card-history-${h.id}`}
                  >
                    <CardContent className="p-3 flex items-center gap-3">
                      <ChefHat className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{h.recipe.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {h.status === "completed" ? "✓ Completed" : h.status === "paused" ? "⏸ Paused" : `Step ${h.currentStep + 1}/${h.recipe.steps.length}`}
                        </p>
                      </div>
                      <Badge variant={h.status === "completed" ? "default" : "outline"} className="text-xs">
                        {h.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ─── HISTORY SCREEN ──────────────────────────────────────────────────────
  if (view === "history") {
    return (
      <div className="min-h-screen bg-background pb-24">
        <PageHeader title="Cook History" backPath="/cook-session" />
        <div className="px-4 pt-2 space-y-3">
          {history.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-12">No sessions yet.</p>
          ) : (
            history.map((h) => (
              <Card key={h.id} data-testid={`card-history-detail-${h.id}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex items-start gap-2">
                    <CardTitle className="text-base flex-1">{h.recipe.title}</CardTitle>
                    <Badge variant={h.status === "completed" ? "default" : "secondary"} className="text-xs shrink-0">
                      {h.status}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(h.startedAt).toLocaleDateString()} · {h.recipe.steps.length} steps
                  </p>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <div className="flex gap-2">
                    {(h.status === "paused" || h.status === "in-progress") && (
                      <Button size="sm" variant="outline" onClick={() => resumeHistory(h)} data-testid={`button-resume-${h.id}`}>
                        <Play className="h-3.5 w-3.5 mr-1" />
                        Resume
                      </Button>
                    )}
                    {h.status === "completed" && (
                      <Button size="sm" variant="outline" onClick={() => handleRecookSession(h.recipe)} data-testid={`button-recook-${h.id}`}>
                        <RotateCcw className="h-3.5 w-3.5 mr-1" />
                        Cook again
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteHistory(h.id)}
                      data-testid={`button-delete-${h.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                  {h.mismatchReports.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-2">
                      <AlertTriangle className="inline h-3 w-3 mr-1" />
                      {h.mismatchReports.length} issue{h.mismatchReports.length !== 1 ? "s" : ""} reported
                    </p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    );
  }

  // ─── SESSION SCREEN ───────────────────────────────────────────────────────
  if (!recipe || !currentStepData) return null;

  const progress = totalSteps > 0 ? ((completedSteps.size) / totalSteps) * 100 : 0;

  return (
    <div className="min-h-screen bg-background pb-24">
      <PageHeader
        title={recipe.title}
        backPath="/cook-session"
        rightContent={
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowConv((v) => !v)}
              data-testid="button-conv-toggle"
              title="Talk it through"
            >
              <MessageCircle className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={pauseSession}
              data-testid="button-pause-session"
              title="Pause"
            >
              <Pause className="h-5 w-5" />
            </Button>
          </div>
        }
      />

      <div className="px-4 pt-1 space-y-4">
        {/* Recipe meta */}
        <div className="flex flex-wrap gap-2 items-center">
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {recipe.prepTimeMinutes + recipe.cookTimeMinutes} min
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            <Users className="h-3.5 w-3.5" />
            {recipe.servings} servings
          </span>
          {recipe.dietaryTags.map((t) => (
            <Badge key={t} variant="secondary" className="text-xs">
              {t}
            </Badge>
          ))}
        </div>

        {/* Overall progress */}
        <div className="space-y-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completedSteps.size}/{totalSteps} steps</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        {/* Ingredient checklist (collapsible) */}
        <Card>
          <button
            className="w-full flex items-center justify-between p-4 text-left"
            onClick={() => setShowIngredients((v) => !v)}
            data-testid="button-toggle-ingredients"
          >
            <span className="font-medium text-sm flex items-center gap-2">
              <Utensils className="h-4 w-4 text-muted-foreground" />
              Ingredients ({checkedIngredients.size}/{recipe.ingredients.length} checked)
            </span>
            {showIngredients ? <ChevronLeft className="h-4 w-4 -rotate-90" /> : <ChevronRight className="h-4 w-4 rotate-90" />}
          </button>
          {showIngredients && (
            <CardContent className="px-4 pb-4 pt-0 space-y-2">
              {recipe.ingredients.map((ing) => (
                <div key={ing.id} className="flex items-center gap-3">
                  <Checkbox
                    id={`ing-${ing.id}`}
                    checked={checkedIngredients.has(ing.id)}
                    onCheckedChange={() => toggleIngredient(ing.id)}
                    data-testid={`checkbox-ing-${ing.id}`}
                  />
                  <label
                    htmlFor={`ing-${ing.id}`}
                    className={`flex-1 text-sm cursor-pointer ${
                      checkedIngredients.has(ing.id) ? "line-through text-muted-foreground" : ""
                    }`}
                  >
                    <span className="font-medium">{ing.amount} {ing.unit}</span>{" "}
                    {ing.name}
                    {ing.notes && <span className="text-muted-foreground"> — {ing.notes}</span>}
                    {ing.substituteFor && (
                      <Badge variant="secondary" className="ml-1 text-xs">
                        sub for {ing.substituteFor}
                      </Badge>
                    )}
                  </label>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0"
                    onClick={() => setSubDialog({ open: true, ingredient: ing })}
                    data-testid={`button-sub-${ing.id}`}
                    title={`Substitute ${ing.name}`}
                  >
                    <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              ))}
            </CardContent>
          )}
        </Card>

        {/* Current step */}
        <Card className="border-primary/30">
          <CardHeader className="p-4 pb-2">
            <div className="flex items-center justify-between">
              <Badge className="text-xs">Step {currentStep + 1} of {totalSteps}</Badge>
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => setMismatchDialog({ open: true, stepNumber: currentStep + 1 })}
                  data-testid="button-report-step"
                  title="Report issue"
                >
                  <Flag className="h-3.5 w-3.5 text-muted-foreground" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4 pt-2 space-y-3">
            <p className="text-base leading-relaxed">{currentStepData.instruction}</p>

            {/* Ingredients used in this step */}
            {currentStepData.ingredientsUsed.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {currentStepData.ingredientsUsed.map((name) => (
                  <Badge key={name} variant="outline" className="text-xs">
                    {name}
                  </Badge>
                ))}
              </div>
            )}

            {/* Per-step timer */}
            {(sessionMode === "full" || currentStepData.timerSeconds) && currentStepData.timerSeconds ? (
              <StepTimer
                key={`timer-${currentStep}`}
                totalSeconds={currentStepData.timerSeconds}
                onDone={() => toast({ title: `Step ${currentStep + 1} timer done!` })}
              />
            ) : null}
          </CardContent>
        </Card>

        {/* Step navigation */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => goToStep(currentStep - 1)}
            disabled={currentStep === 0}
            data-testid="button-prev-step"
          >
            <SkipBack className="h-4 w-4 mr-1" />
            Back
          </Button>
          {currentStep < totalSteps - 1 ? (
            <Button
              className="flex-1"
              onClick={markStepDone}
              data-testid="button-next-step"
            >
              Done
              <SkipForward className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={markStepDone}
              data-testid="button-finish-recipe"
            >
              <Check className="h-4 w-4 mr-1" />
              Finish!
            </Button>
          )}
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-1.5 flex-wrap">
          {recipe.steps.map((_, i) => (
            <button
              key={i}
              onClick={() => goToStep(i)}
              className={`rounded-full transition-all ${
                i === currentStep
                  ? "w-5 h-2.5 bg-primary"
                  : completedSteps.has(i)
                  ? "w-2.5 h-2.5 bg-primary/40"
                  : "w-2.5 h-2.5 bg-muted"
              }`}
              data-testid={`dot-step-${i}`}
              aria-label={`Go to step ${i + 1}`}
            />
          ))}
        </div>

        {/* Tips */}
        {recipe.tips && recipe.tips.length > 0 && (
          <Card className="bg-muted/30">
            <CardContent className="p-3">
              <p className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Chef tips
              </p>
              <ul className="space-y-1">
                {recipe.tips.map((tip, i) => (
                  <li key={i} className="text-xs text-muted-foreground">
                    • {tip}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}

        {/* Abandon button */}
        <Button
          variant="ghost"
          size="sm"
          className="w-full text-muted-foreground"
          onClick={abandonSession}
          data-testid="button-abandon"
        >
          Stop cooking
        </Button>
      </div>

      {/* Conversation drawer */}
      {showConv && (
        <div className="fixed bottom-24 left-0 right-0 z-50 px-4">
          <Card className="shadow-lg border-primary/20">
            <CardHeader className="p-3 pb-1">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium flex items-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Walk me through it
                </span>
                <Button variant="ghost" size="sm" onClick={() => setShowConv(false)} data-testid="button-conv-close">
                  ×
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-3 pt-0 space-y-2">
              <div className="max-h-40 overflow-y-auto space-y-2">
                {convMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    Ask DW anything about this recipe — "what does sauté mean?", "can I skip this step?", etc.
                  </p>
                )}
                {convMessages.map((m, i) => (
                  <div
                    key={i}
                    className={`text-xs rounded-lg px-3 py-2 max-w-[85%] ${
                      m.role === "user"
                        ? "ml-auto bg-primary text-primary-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                {convMutation.isPending && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    DW is thinking…
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Ask something..."
                  value={convInput}
                  onChange={(e) => setConvInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && sendConvMessage()}
                  className="text-sm"
                  data-testid="input-conv"
                />
                <Button size="sm" onClick={sendConvMessage} disabled={convMutation.isPending || !convInput.trim()} data-testid="button-conv-send">
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Substitute dialog */}
      <IngredientSubstitutesDialog
        open={subDialog.open}
        onOpenChange={(v) => setSubDialog({ open: v, ingredient: subDialog.ingredient })}
        ingredient={subDialog.ingredient?.name ?? ""}
        context={recipe.title}
        excludedIngredients={[
          ...(prefs?.allergies ?? []),
          ...(prefs?.bannedIngredients ?? []),
          ...(prefs?.restrictions ?? []),
        ]}
        onSelectSubstitute={handleSubstitute}
      />

      {/* Mismatch dialog */}
      <MismatchDialog
        open={mismatchDialog.open}
        onOpenChange={(v) => setMismatchDialog({ open: v })}
        stepNumber={mismatchDialog.stepNumber}
        onSubmit={handleMismatch}
      />
    </div>
  );
}
