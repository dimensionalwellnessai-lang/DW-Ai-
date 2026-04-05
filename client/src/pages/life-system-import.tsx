import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Loader2, Sparkles, CheckCircle2, AlertTriangle, Calendar,
  Target, Dumbbell, UtensilsCrossed, ShoppingCart, BookOpen,
  ChevronRight, ChevronLeft, Zap, RotateCcw, ListChecks,
  BookMarked, DollarSign, FolderKanban, StickyNote, Star,
  Lock, Scan,
} from "lucide-react";

type Frequency = "weekly" | "biweekly" | "every3weeks" | "monthly";
type ConflictResolution = "keep_existing" | "use_new";

interface ParsedGoal { title: string; description: string; wellnessDimension: string }
interface ParsedExercise { name: string; sets: string; reps: string; notes: string }
interface ParsedDaySchedule {
  meals: { breakfast: string[]; lunch: string[]; dinner: string[]; snack: string[] };
  workout: { title: string; time: string; exercises: ParsedExercise[] } | null;
  appWork: { title: string; time: string; durationMinutes: number; tasks: string[] } | null;
  otherEvents: Array<{ title: string; time: string; endTime: string; notes: string }>;
}
interface JournalEntry { title: string; date?: string; mood?: string; content: string; tags: string[] }
interface ReadingItem { title: string; author?: string; type: string; notes?: string }
interface FinancialGoal { title: string; description: string; target?: string; timeline?: string }
interface ProjectTask { title: string; description?: string; dueDate?: string; priority?: string }

interface ParsedImport {
  rawTitle: string;
  detectedTypes: string[];
  // Life system
  goals: ParsedGoal[];
  coreRules: string[];
  morningRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  windDownRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  weeklySchedule: Record<string, ParsedDaySchedule>;
  groceryList: { protein: string[]; carbs: string[]; produce: string[]; extras: string[] };
  mealPrepItems: string[];
  // New types
  journalEntries: JournalEntry[];
  affirmations: string[];
  readingList: ReadingItem[];
  financialGoals: FinancialGoal[];
  projectTasks: ProjectTask[];
  notes: string;
  notesTags: string[];
}
interface Conflict {
  newGoal: { title: string; description: string };
  existingGoal: { id: string; title: string; description?: string | null };
}

// All possible review step types
type ReviewStep =
  | "review-goals" | "review-workouts" | "review-meals" | "review-events" | "review-grocery"
  | "review-journal" | "review-affirmations" | "review-reading" | "review-financial"
  | "review-project" | "review-notes";

type Step = "paste" | ReviewStep | "schedule-freq" | "conflicts" | "confirm" | "done";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);
const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "1 week", biweekly: "2 weeks", every3weeks: "3 weeks", monthly: "4 weeks",
};

function countCalendarEvents(schedule: Record<string, ParsedDaySchedule>, freq: Frequency) {
  const weeks = { weekly: 1, biweekly: 2, every3weeks: 3, monthly: 4 }[freq] ?? 1;
  let count = 0;
  for (const day of DAYS) {
    const d = schedule?.[day];
    if (!d) continue;
    if (d.workout?.title) count++;
    if (d.meals?.breakfast?.length) count++;
    if (d.meals?.lunch?.length) count++;
    if (d.meals?.dinner?.length) count++;
    if (d.meals?.snack?.length) count++;
    if (d.appWork?.title) count++;
    count += d.otherEvents?.length ?? 0;
  }
  return count * weeks;
}

function DimensionBadge({ dim }: { dim: string }) {
  const colors: Record<string, string> = {
    physical: "bg-green-500/10 text-green-600 dark:text-green-400",
    emotional: "bg-pink-500/10 text-pink-600 dark:text-pink-400",
    financial: "bg-yellow-500/10 text-yellow-600 dark:text-yellow-400",
    social: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    spiritual: "bg-purple-500/10 text-purple-600 dark:text-purple-400",
    intellectual: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400",
    environmental: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
    purpose: "bg-orange-500/10 text-orange-600 dark:text-orange-400",
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${colors[dim] ?? "bg-muted text-muted-foreground"}`}>
      {dim}
    </span>
  );
}

const CONTENT_TYPE_META: Record<string, { label: string; color: string }> = {
  life_system:    { label: "Life System",    color: "bg-primary/15 text-primary" },
  journal_entry:  { label: "Journal Entry",  color: "bg-pink-500/15 text-pink-600 dark:text-pink-400" },
  workout_plan:   { label: "Workout Plan",   color: "bg-green-500/15 text-green-600 dark:text-green-400" },
  meal_plan:      { label: "Meal Plan",      color: "bg-orange-500/15 text-orange-600 dark:text-orange-400" },
  grocery_list:   { label: "Grocery List",   color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400" },
  goals:          { label: "Goals",          color: "bg-blue-500/15 text-blue-600 dark:text-blue-400" },
  affirmations:   { label: "Affirmations",   color: "bg-purple-500/15 text-purple-600 dark:text-purple-400" },
  reading_list:   { label: "Reading List",   color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400" },
  financial_plan: { label: "Financial Plan", color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" },
  project_plan:   { label: "Project Plan",   color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400" },
  notes:          { label: "Notes",          color: "bg-muted text-muted-foreground" },
};

function buildFilteredParsed(
  parsed: ParsedImport,
  goalSel: boolean[], ruleSel: boolean[],
  workoutDays: Record<string, boolean>,
  mealDays: Record<string, Record<string, boolean>>,
  eventDays: Record<string, boolean[]>,
  grocerySel: Record<string, boolean[]>,
  journalSel: boolean[],
  affirmationSel: boolean[],
  readingSel: boolean[],
  financialSel: boolean[],
  projectSel: boolean[],
): ParsedImport {
  const goals = parsed.goals.filter((_, i) => goalSel[i] !== false);
  const coreRules = parsed.coreRules.filter((_, i) => ruleSel[i] !== false);
  const weeklySchedule: Record<string, ParsedDaySchedule> = {};
  for (const day of DAYS) {
    const d = parsed.weeklySchedule?.[day];
    if (!d) continue;
    const mealTypes = mealDays[day] ?? {};
    weeklySchedule[day] = {
      meals: {
        breakfast: mealTypes.breakfast !== false ? (d.meals?.breakfast ?? []) : [],
        lunch: mealTypes.lunch !== false ? (d.meals?.lunch ?? []) : [],
        dinner: mealTypes.dinner !== false ? (d.meals?.dinner ?? []) : [],
        snack: mealTypes.snack !== false ? (d.meals?.snack ?? []) : [],
      },
      workout: workoutDays[day] !== false ? d.workout : null,
      appWork: d.appWork,
      otherEvents: (d.otherEvents ?? []).filter((_, i) => (eventDays[day] ?? [])[i] !== false),
    };
  }
  const gl = parsed.groceryList ?? { protein: [], carbs: [], produce: [], extras: [] };
  const groceryList = {
    protein: gl.protein.filter((_, i) => (grocerySel.protein ?? [])[i] !== false),
    carbs: gl.carbs.filter((_, i) => (grocerySel.carbs ?? [])[i] !== false),
    produce: gl.produce.filter((_, i) => (grocerySel.produce ?? [])[i] !== false),
    extras: gl.extras.filter((_, i) => (grocerySel.extras ?? [])[i] !== false),
  };
  return {
    ...parsed,
    goals, coreRules, weeklySchedule, groceryList,
    journalEntries: parsed.journalEntries.filter((_, i) => journalSel[i] !== false),
    affirmations: parsed.affirmations.filter((_, i) => affirmationSel[i] !== false),
    readingList: parsed.readingList.filter((_, i) => readingSel[i] !== false),
    financialGoals: parsed.financialGoals.filter((_, i) => financialSel[i] !== false),
    projectTasks: parsed.projectTasks.filter((_, i) => projectSel[i] !== false),
  };
}

export default function DWSmartImportPage() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("paste");
  const [pastedText, setPastedText] = useState("");
  const [parsed, setParsed] = useState<ParsedImport | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); const day = d.getDay();
    d.setDate(d.getDate() + (day === 0 ? 1 : 8 - day));
    return d.toISOString().slice(0, 10);
  });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applyResults, setApplyResults] = useState<Record<string, number> | null>(null);

  // Selection state
  const [goalSel, setGoalSel] = useState<boolean[]>([]);
  const [ruleSel, setRuleSel] = useState<boolean[]>([]);
  const [workoutDays, setWorkoutDays] = useState<Record<string, boolean>>({});
  const [mealDays, setMealDays] = useState<Record<string, Record<string, boolean>>>({});
  const [eventDays, setEventDays] = useState<Record<string, boolean[]>>({});
  const [grocerySel, setGrocerySel] = useState<Record<string, boolean[]>>({});
  const [journalSel, setJournalSel] = useState<boolean[]>([]);
  const [affirmationSel, setAffirmationSel] = useState<boolean[]>([]);
  const [readingSel, setReadingSel] = useState<boolean[]>([]);
  const [financialSel, setFinancialSel] = useState<boolean[]>([]);
  const [projectSel, setProjectSel] = useState<boolean[]>([]);
  const [loadingStage, setLoadingStage] = useState(0);

  useEffect(() => {
    try {
      const prepaste = sessionStorage.getItem("dw_ls_prepaste");
      if (prepaste) { setPastedText(prepaste); sessionStorage.removeItem("dw_ls_prepaste"); }
    } catch {}
  }, []);

  function initSelections(p: ParsedImport) {
    setGoalSel(p.goals.map(() => true));
    setRuleSel(p.coreRules.map(() => true));
    const wd: Record<string, boolean> = {};
    const md: Record<string, Record<string, boolean>> = {};
    const ed: Record<string, boolean[]> = {};
    for (const day of DAYS) {
      const d = p.weeklySchedule?.[day];
      if (!d) continue;
      wd[day] = !!d.workout;
      md[day] = {
        breakfast: (d.meals?.breakfast?.length ?? 0) > 0,
        lunch: (d.meals?.lunch?.length ?? 0) > 0,
        dinner: (d.meals?.dinner?.length ?? 0) > 0,
        snack: (d.meals?.snack?.length ?? 0) > 0,
      };
      ed[day] = (d.otherEvents ?? []).map(() => true);
    }
    setWorkoutDays(wd); setMealDays(md); setEventDays(ed);
    const gl = p.groceryList ?? { protein: [], carbs: [], produce: [], extras: [] };
    setGrocerySel({ protein: gl.protein.map(() => true), carbs: gl.carbs.map(() => true), produce: gl.produce.map(() => true), extras: gl.extras.map(() => true) });
    setJournalSel(p.journalEntries.map(() => true));
    setAffirmationSel(p.affirmations.map(() => true));
    setReadingSel(p.readingList.map(() => true));
    setFinancialSel(p.financialGoals.map(() => true));
    setProjectSel(p.projectTasks.map(() => true));
  }

  // Content presence helpers
  const has = (p: ParsedImport) => ({
    goals: p.goals?.length > 0 || p.coreRules?.length > 0,
    workouts: DAYS.some(d => !!p.weeklySchedule?.[d]?.workout?.title),
    meals: DAYS.some(d => { const m = p.weeklySchedule?.[d]?.meals; return m && (m.breakfast?.length || m.lunch?.length || m.dinner?.length || m.snack?.length); }),
    events: DAYS.some(d => (p.weeklySchedule?.[d]?.otherEvents?.length ?? 0) > 0 || !!p.weeklySchedule?.[d]?.appWork?.title),
    grocery: (p.groceryList?.protein?.length || p.groceryList?.carbs?.length || p.groceryList?.produce?.length || p.groceryList?.extras?.length || p.mealPrepItems?.length) > 0,
    journal: p.journalEntries?.length > 0,
    affirmations: p.affirmations?.length > 0,
    reading: p.readingList?.length > 0,
    financial: p.financialGoals?.length > 0,
    project: p.projectTasks?.length > 0,
    notes: !!p.notes,
  });

  // Build ordered review steps based on detected content
  function getReviewSteps(p: ParsedImport): ReviewStep[] {
    const h = has(p);
    const steps: ReviewStep[] = [];
    if (h.journal) steps.push("review-journal");
    if (h.goals) steps.push("review-goals");
    if (h.affirmations) steps.push("review-affirmations");
    if (h.workouts) steps.push("review-workouts");
    if (h.meals) steps.push("review-meals");
    if (h.events) steps.push("review-events");
    if (h.grocery) steps.push("review-grocery");
    if (h.reading) steps.push("review-reading");
    if (h.financial) steps.push("review-financial");
    if (h.project) steps.push("review-project");
    if (h.notes) steps.push("review-notes");
    return steps;
  }

  const reviewSteps = parsed ? getReviewSteps(parsed) : [];
  const needsSchedule = parsed ? (has(parsed).workouts || has(parsed).meals || has(parsed).events) : false;

  function navigate(from: ReviewStep | "schedule-freq", direction: "next" | "back") {
    if (!parsed) return;
    const allSteps: Step[] = [
      ...reviewSteps,
      ...(needsSchedule ? ["schedule-freq" as Step] : []),
      ...(conflicts.length > 0 ? ["conflicts" as Step] : []),
      "confirm",
    ];
    const idx = allSteps.indexOf(from);
    if (direction === "next") {
      const next = allSteps[idx + 1] ?? "confirm";
      setStep(next);
    } else {
      const prev = allSteps[idx - 1] ?? "paste";
      setStep(prev);
    }
  }

  const parseMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/life-system/import/parse", { text: pastedText }).then(r => r.json()),
    onSuccess: async (data: any) => {
      const p: ParsedImport = data.parsed;
      setParsed(p);
      initSelections(p);
      const steps = getReviewSteps(p);
      setStep(steps[0] ?? (needsSchedule ? "schedule-freq" : "confirm"));
      if (p.goals?.length) conflictMutation.mutate(p.goals);
    },
  });

  const LOADING_STAGES = [
    "Reading your content...",
    "Identifying content types...",
    "Extracting key details...",
    "Building your personalized plan...",
  ];

  useEffect(() => {
    if (!parseMutation.isPending) { setLoadingStage(0); return; }
    const iv = setInterval(() => setLoadingStage(s => Math.min(s + 1, LOADING_STAGES.length - 1)), 1900);
    return () => clearInterval(iv);
  }, [parseMutation.isPending]);

  const conflictMutation = useMutation({
    mutationFn: (goals: ParsedGoal[]) =>
      apiRequest("POST", "/api/life-system/import/check-conflicts", { goals }).then(r => r.json()),
    onSuccess: (data: any) => {
      setConflicts(data.conflicts ?? []);
      const defaultRes: Record<string, ConflictResolution> = {};
      for (const c of data.conflicts ?? []) defaultRes[c.newGoal.title] = "keep_existing";
      setResolutions(defaultRes);
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const filtered = buildFilteredParsed(
        parsed!, goalSel, ruleSel, workoutDays, mealDays, eventDays, grocerySel,
        journalSel, affirmationSel, readingSel, financialSel, projectSel
      );
      return apiRequest("POST", "/api/life-system/import/apply", {
        parsed: filtered,
        scheduleFrequency: frequency,
        startDate,
        conflictResolutions: resolutions,
      }).then(r => r.json());
    },
    onSuccess: (data: any) => { setApplyResults(data.results); setStep("done"); },
  });

  const filteredParsed = parsed
    ? buildFilteredParsed(parsed, goalSel, ruleSel, workoutDays, mealDays, eventDays, grocerySel, journalSel, affirmationSel, readingSel, financialSel, projectSel)
    : null;
  const totalEvents = filteredParsed ? countCalendarEvents(filteredParsed.weeklySchedule ?? {}, frequency) : 0;
  const groceryCount = filteredParsed
    ? (filteredParsed.groceryList?.protein?.length ?? 0) + (filteredParsed.groceryList?.carbs?.length ?? 0) + (filteredParsed.groceryList?.produce?.length ?? 0) + (filteredParsed.groceryList?.extras?.length ?? 0) + (filteredParsed.mealPrepItems?.length ?? 0)
    : 0;

  const REVIEW_STEP_LABELS: Record<ReviewStep, string> = {
    "review-journal": "Journal", "review-goals": "Goals & Habits",
    "review-affirmations": "Affirmations", "review-workouts": "Workouts",
    "review-meals": "Meals", "review-events": "Events",
    "review-grocery": "Grocery", "review-reading": "Reading",
    "review-financial": "Financial", "review-project": "Projects",
    "review-notes": "Notes",
  };

  const allWizardSteps: Step[] = [
    ...reviewSteps,
    ...(needsSchedule ? ["schedule-freq" as Step] : []),
    ...(conflicts.length > 0 ? ["conflicts" as Step] : []),
    "confirm",
  ];
  const currentIdx = allWizardSteps.indexOf(step as any);

  const isReviewStep = (s: Step): s is ReviewStep => s.startsWith("review-");
  const currentReviewStep = isReviewStep(step) ? step : null;

  // Auth gate — must be signed in to use import
  if (authLoading) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <PageHeader title="DW Smart Import" showBack />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-col h-full overflow-hidden bg-background">
        <PageHeader title="DW Smart Import" showBack />
        <div className="flex-1 overflow-y-auto flex items-center justify-center p-6">
          <div className="text-center space-y-5 max-w-xs mx-auto">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div className="space-y-2">
              <h2 className="font-bold text-xl">Sign in to use DW Smart Import</h2>
              <p className="text-sm text-muted-foreground leading-relaxed">
                DW Smart Import saves your content directly to your account. Sign in first so nothing gets lost.
              </p>
            </div>
            <div className="space-y-2">
              <Button className="w-full" onClick={() => setLocation("/login")} data-testid="button-signin-import">
                Sign In
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={() => setLocation("/")}>
                Back to home
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <PageHeader title="DW Smart Import" showBack />
      <div className="flex-1 overflow-y-auto">

        {/* ── LOADING OVERLAY ── */}
        {parseMutation.isPending && step === "paste" && (
          <div className="flex flex-col items-center justify-center min-h-[75vh] p-8 space-y-8 max-w-sm mx-auto">
            <div className="relative flex items-center justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-9 w-9 text-primary animate-pulse" />
              </div>
              <div className="absolute inset-0 rounded-full border border-primary/25 animate-ping" style={{ animationDuration: "2s" }} />
            </div>

            <div className="text-center space-y-1 w-full">
              <p className="font-semibold text-foreground text-base transition-all duration-500">
                {LOADING_STAGES[loadingStage]}
              </p>
              <p className="text-sm text-muted-foreground">DW is analyzing your content</p>
            </div>

            <div className="w-full space-y-3">
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-700 ease-in-out"
                  style={{ width: `${Math.round(((loadingStage + 1) / LOADING_STAGES.length) * 100)}%` }}
                />
              </div>

              <div className="space-y-2.5 pt-1">
                {LOADING_STAGES.map((label, i) => (
                  <div
                    key={i}
                    className={`flex items-center gap-3 transition-all duration-300 ${i <= loadingStage ? "opacity-100" : "opacity-25"}`}
                  >
                    {i < loadingStage
                      ? <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      : i === loadingStage
                        ? <Loader2 className="h-4 w-4 text-primary animate-spin shrink-0" />
                        : <div className="h-4 w-4 rounded-full border border-muted-foreground/40 shrink-0" />}
                    <span className={`text-sm ${i === loadingStage ? "text-foreground font-medium" : "text-muted-foreground"}`}>
                      {label}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ── PASTE ── */}
        {step === "paste" && !parseMutation.isPending && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Scan className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Paste anything for DW to read</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                DW automatically detects what you paste — a life system, journal entry, reading list, workout plan, affirmations, financial goals, or anything else — and walks you through adding it to your account.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="import-text" className="text-sm font-medium">Paste your content</Label>
              <Textarea
                id="import-text"
                data-testid="textarea-life-system"
                placeholder="Paste anything here…&#10;&#10;DW can handle:&#10;• Life systems / weekly schedules&#10;• Journal entries &amp; reflections&#10;• Workout plans&#10;• Meal plans &amp; grocery lists&#10;• Goals &amp; affirmations&#10;• Reading lists&#10;• Financial plans&#10;• Project plans &amp; tasks&#10;• General notes"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[280px] text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">{pastedText.length} characters</p>
            </div>

            <Button
              data-testid="button-parse-life-system"
              className="w-full" size="lg"
              disabled={pastedText.trim().length < 20}
              onClick={() => parseMutation.mutate()}
            >
              <Sparkles className="h-4 w-4 mr-2" />Let DW Read This
            </Button>

            {parseMutation.isError && (
              <p className="text-sm text-destructive text-center">{parseApiError(parseMutation.error)}</p>
            )}

            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">DW recognizes</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { icon: Target, label: "Goals & plans" },
                  { icon: Dumbbell, label: "Workouts" },
                  { icon: UtensilsCrossed, label: "Meals & grocery" },
                  { icon: BookMarked, label: "Journal entries" },
                  { icon: Star, label: "Affirmations" },
                  { icon: BookOpen, label: "Reading lists" },
                  { icon: DollarSign, label: "Financial plans" },
                  { icon: FolderKanban, label: "Projects" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary/70" /><span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress pills for review steps */}
        {parsed && step !== "paste" && step !== "done" && (
          <div className="px-4 pt-3 pb-0 max-w-lg mx-auto space-y-2">
            {/* Detected types banner */}
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-xs text-muted-foreground">DW found:</span>
              {parsed.detectedTypes.map(t => {
                const meta = CONTENT_TYPE_META[t] ?? { label: t, color: "bg-muted text-muted-foreground" };
                return (
                  <span key={t} className={`text-xs px-2 py-0.5 rounded-full font-medium ${meta.color}`}>
                    {meta.label}
                  </span>
                );
              })}
            </div>
            {/* Step progress */}
            <div className="flex gap-1.5 flex-wrap">
              {allWizardSteps.filter(s => s !== "conflicts" && s !== "confirm").map((s, i) => {
                const label = isReviewStep(s) ? REVIEW_STEP_LABELS[s] : s === "schedule-freq" ? "Schedule" : s;
                return (
                  <div key={s} className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
                    step === s ? "bg-primary text-primary-foreground" :
                    currentIdx > i ? "bg-primary/15 text-primary" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {currentIdx > i && <CheckCircle2 className="h-3 w-3" />}
                    {label}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── JOURNAL ENTRIES ── */}
        {currentReviewStep === "review-journal" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <BookMarked className="h-5 w-5 text-pink-500" /> Journal
                {parsed.journalEntries.length > 1 && <span className="text-sm text-muted-foreground font-normal">({parsed.journalEntries.length} entries)</span>}
              </h2>
              <p className="text-sm text-muted-foreground">Select which entries to save to your DW journal.</p>
            </div>
            <div className="space-y-3">
              {parsed.journalEntries.map((je, i) => {
                const included = journalSel[i] !== false;
                return (
                  <div key={i} className={`rounded-xl border px-4 py-3 space-y-2 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                    onClick={() => setJournalSel(s => { const n = [...s]; n[i] = !n[i]; return n; })}
                    data-testid={`journal-entry-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={included} onCheckedChange={v => setJournalSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <p className="text-sm font-semibold">{je.title || "Journal Entry"}</p>
                          {je.date && <span className="text-xs text-muted-foreground">{je.date}</span>}
                          {je.mood && <Badge variant="secondary" className="text-xs">{je.mood}</Badge>}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">{je.content}</p>
                        {je.tags?.length > 0 && (
                          <div className="flex gap-1 flex-wrap mt-2">
                            {je.tags.map((tag, ti) => <Badge key={ti} variant="outline" className="text-xs">{tag}</Badge>)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-journal", "back")} data-testid="button-back-journal"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-journal", "next")} data-testid="button-journal-next">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── GOALS & HABITS ── */}
        {currentReviewStep === "review-goals" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Target className="h-5 w-5 text-primary" /> Goals & Daily Habits</h2>
              <p className="text-sm text-muted-foreground">DW found {parsed.goals?.length ?? 0} goal{parsed.goals?.length !== 1 ? "s" : ""} and {parsed.coreRules?.length ?? 0} daily rule{parsed.coreRules?.length !== 1 ? "s" : ""}. Uncheck anything you don't want.</p>
            </div>
            {parsed.goals?.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Goals</p>
                <div className="space-y-2">
                  {parsed.goals.map((g, i) => (
                    <div key={i} className={`rounded-xl border px-3 py-2.5 cursor-pointer transition-opacity ${goalSel[i] !== false ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                      onClick={() => setGoalSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`goal-item-${i}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox checked={goalSel[i] !== false} onCheckedChange={v => setGoalSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="mt-0.5 shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug">{g.title}</p>
                            {g.description && <p className="text-xs text-muted-foreground mt-0.5">{g.description}</p>}
                          </div>
                        </div>
                        <DimensionBadge dim={g.wellnessDimension} />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {parsed.coreRules?.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Daily Habits</p>
                <div className="space-y-1.5">
                  {parsed.coreRules.map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-opacity ${ruleSel[i] !== false ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                      onClick={() => setRuleSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`rule-item-${i}`}
                    >
                      <Checkbox checked={ruleSel[i] !== false} onCheckedChange={v => setRuleSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="shrink-0" />
                      <p className="text-sm flex-1">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {conflictMutation.isPending && <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Loader2 className="h-3 w-3 animate-spin" /> Checking for goal conflicts…</p>}
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-goals", "back")} data-testid="button-back-goals"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-goals", "next")} data-testid="button-goals-next">Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── AFFIRMATIONS ── */}
        {currentReviewStep === "review-affirmations" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Star className="h-5 w-5 text-purple-500" /> Affirmations</h2>
              <p className="text-sm text-muted-foreground">These will be saved as spiritual goals in your account. Uncheck any you want to skip.</p>
            </div>
            <div className="space-y-2">
              {parsed.affirmations.map((a, i) => (
                <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${affirmationSel[i] !== false ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                  onClick={() => setAffirmationSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`affirmation-${i}`}
                >
                  <Checkbox checked={affirmationSel[i] !== false} onCheckedChange={v => setAffirmationSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="shrink-0" />
                  <p className="text-sm italic flex-1">{a}</p>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-affirmations", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-affirmations", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── WORKOUTS ── */}
        {currentReviewStep === "review-workouts" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Dumbbell className="h-5 w-5 text-primary" /> Workout Plan</h2>
              <p className="text-sm text-muted-foreground">These workouts will repeat for <strong>{FREQ_LABELS[frequency]}</strong>. Uncheck any day to skip.</p>
            </div>
            <div className="space-y-3">
              {DAYS.map(day => {
                const d = parsed.weeklySchedule?.[day];
                if (!d?.workout?.title) return null;
                const included = workoutDays[day] !== false;
                return (
                  <div key={day} className={`rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                    onClick={() => setWorkoutDays(s => ({ ...s, [day]: !s[day] }))} data-testid={`workout-day-${day}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox checked={included} onCheckedChange={v => setWorkoutDays(s => ({ ...s, [day]: !!v }))} className="shrink-0" />
                        <p className="text-sm font-semibold">{dayLabel(day)}</p>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">{d.workout!.title}</span>
                      {d.workout?.time && <span className="text-xs text-muted-foreground font-mono">{d.workout.time}</span>}
                    </div>
                    {d.workout!.exercises?.length > 0 && (
                      <div className="pl-6 space-y-0.5">
                        {d.workout!.exercises.slice(0, 4).map((ex, i) => (
                          <p key={i} className="text-xs text-muted-foreground">{ex.name}{ex.sets ? ` — ${ex.sets}×${ex.reps}` : ""}</p>
                        ))}
                        {d.workout!.exercises.length > 4 && <p className="text-xs text-muted-foreground">+{d.workout!.exercises.length - 4} more</p>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{Object.values(workoutDays).filter(Boolean).length} workouts</span> per week × {FREQ_LABELS[frequency]} = <span className="font-medium text-foreground">{Object.values(workoutDays).filter(Boolean).length * ({ weekly: 1, biweekly: 2, every3weeks: 3, monthly: 4 }[frequency] ?? 1)} events</span>
              </p>
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-workouts", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-workouts", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── MEALS ── */}
        {currentReviewStep === "review-meals" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><UtensilsCrossed className="h-5 w-5 text-primary" /> Meal Plan</h2>
              <p className="text-sm text-muted-foreground">Meals repeat for <strong>{FREQ_LABELS[frequency]}</strong> as calendar events. Uncheck any you don't want scheduled.</p>
            </div>
            <div className="space-y-4">
              {DAYS.map(day => {
                const d = parsed.weeklySchedule?.[day]; const meals = d?.meals;
                if (!meals) return null;
                const hasMeal = meals.breakfast?.length || meals.lunch?.length || meals.dinner?.length || meals.snack?.length;
                if (!hasMeal) return null;
                const dayMeal = mealDays[day] ?? {};
                return (
                  <div key={day} className="rounded-xl border border-border/40 bg-card px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold">{dayLabel(day)}</p>
                    <div className="space-y-1.5">
                      {(["breakfast", "lunch", "dinner", "snack"] as const).map(type => {
                        const items = meals[type]; if (!items?.length) return null;
                        const included = dayMeal[type] !== false;
                        return (
                          <div key={type} className={`flex items-center gap-2.5 py-1 cursor-pointer transition-opacity ${!included ? "opacity-40" : ""}`}
                            onClick={() => setMealDays(s => ({ ...s, [day]: { ...(s[day] ?? {}), [type]: !dayMeal[type] } }))}
                          >
                            <Checkbox checked={included} onCheckedChange={v => setMealDays(s => ({ ...s, [day]: { ...(s[day] ?? {}), [type]: !!v } }))} className="shrink-0" />
                            <span className="text-xs font-semibold capitalize text-muted-foreground w-16">{type}</span>
                            <span className="text-sm flex-1 truncate">{items.join(", ")}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-meals", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-meals", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── CALENDAR EVENTS ── */}
        {currentReviewStep === "review-events" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Calendar Events</h2>
              <p className="text-sm text-muted-foreground">Repeating for <strong>{FREQ_LABELS[frequency]}</strong>. Uncheck any events you don't want.</p>
            </div>
            <div className="space-y-4">
              {DAYS.map(day => {
                const d = parsed.weeklySchedule?.[day]; const events = d?.otherEvents ?? []; const appWork = d?.appWork;
                if (!events.length && !appWork) return null;
                return (
                  <div key={day} className="rounded-xl border border-border/40 bg-card px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold">{dayLabel(day)}</p>
                    <div className="space-y-1.5">
                      {appWork && (
                        <div className="flex items-center gap-2.5 py-1 text-sm">
                          <div className="h-1.5 w-1.5 rounded-full bg-blue-500 shrink-0 ml-1" />
                          <span className="text-xs text-muted-foreground font-mono w-12">{appWork.time}</span>
                          <span className="flex-1">{appWork.title}</span>
                          <Badge variant="secondary" className="text-xs">App Work</Badge>
                        </div>
                      )}
                      {events.map((ev, i) => {
                        const included = (eventDays[day] ?? [])[i] !== false;
                        return (
                          <div key={i} className={`flex items-center gap-2.5 py-1 cursor-pointer transition-opacity ${!included ? "opacity-40" : ""}`}
                            onClick={() => setEventDays(s => { const arr = [...(s[day] ?? events.map(() => true))]; arr[i] = !arr[i]; return { ...s, [day]: arr }; })}
                          >
                            <Checkbox checked={included} onCheckedChange={v => setEventDays(s => { const arr = [...(s[day] ?? events.map(() => true))]; arr[i] = !!v; return { ...s, [day]: arr }; })} className="shrink-0" />
                            <span className="text-xs text-muted-foreground font-mono w-12">{ev.time}</span>
                            <span className="text-sm flex-1">{ev.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-events", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-events", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── GROCERY ── */}
        {currentReviewStep === "review-grocery" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><ShoppingCart className="h-5 w-5 text-primary" /> Grocery List</h2>
              <p className="text-sm text-muted-foreground">Uncheck anything you don't need.</p>
            </div>
            {(["protein", "carbs", "produce", "extras"] as const).map(cat => {
              const items = parsed.groceryList?.[cat] ?? []; if (!items.length) return null;
              return (
                <section key={cat} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{cat}</p>
                  <div className="space-y-1.5">
                    {items.map((item, i) => {
                      const included = (grocerySel[cat] ?? [])[i] !== false;
                      return (
                        <div key={i} className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                          onClick={() => setGrocerySel(s => { const arr = [...(s[cat] ?? items.map(() => true))]; arr[i] = !arr[i]; return { ...s, [cat]: arr }; })}
                        >
                          <Checkbox checked={included} onCheckedChange={v => setGrocerySel(s => { const arr = [...(s[cat] ?? items.map(() => true))]; arr[i] = !!v; return { ...s, [cat]: arr }; })} className="shrink-0" />
                          <span className="text-sm">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-grocery", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-grocery", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── READING LIST ── */}
        {currentReviewStep === "review-reading" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><BookOpen className="h-5 w-5 text-indigo-500" /> Reading & Watch List</h2>
              <p className="text-sm text-muted-foreground">These will be saved as intellectual goals. Uncheck any you want to skip.</p>
            </div>
            <div className="space-y-2">
              {parsed.readingList.map((item, i) => {
                const included = readingSel[i] !== false;
                return (
                  <div key={i} className={`flex items-center gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                    onClick={() => setReadingSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`reading-item-${i}`}
                  >
                    <Checkbox checked={included} onCheckedChange={v => setReadingSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="text-xs text-muted-foreground">{[item.author ? `by ${item.author}` : "", item.type, item.notes].filter(Boolean).join(" · ")}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs capitalize shrink-0">{item.type || "item"}</Badge>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-reading", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-reading", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── FINANCIAL GOALS ── */}
        {currentReviewStep === "review-financial" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><DollarSign className="h-5 w-5 text-emerald-500" /> Financial Goals</h2>
              <p className="text-sm text-muted-foreground">Saved as financial goals in your account.</p>
            </div>
            <div className="space-y-2">
              {parsed.financialGoals.map((fg, i) => {
                const included = financialSel[i] !== false;
                return (
                  <div key={i} className={`rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                    onClick={() => setFinancialSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`financial-goal-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={included} onCheckedChange={v => setFinancialSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{fg.title}</p>
                        <p className="text-xs text-muted-foreground">{[fg.description, fg.target ? `Target: ${fg.target}` : "", fg.timeline].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-financial", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-financial", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── PROJECT TASKS ── */}
        {currentReviewStep === "review-project" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><FolderKanban className="h-5 w-5 text-cyan-500" /> Project Tasks</h2>
              <p className="text-sm text-muted-foreground">Saved as purpose goals in your account.</p>
            </div>
            <div className="space-y-2">
              {parsed.projectTasks.map((pt, i) => {
                const included = projectSel[i] !== false;
                const priorityColor = pt.priority === "high" ? "text-red-500" : pt.priority === "medium" ? "text-yellow-500" : "text-muted-foreground";
                return (
                  <div key={i} className={`rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"}`}
                    onClick={() => setProjectSel(s => { const n = [...s]; n[i] = !n[i]; return n; })} data-testid={`project-task-${i}`}
                  >
                    <div className="flex items-start gap-3">
                      <Checkbox checked={included} onCheckedChange={v => setProjectSel(s => { const n = [...s]; n[i] = !!v; return n; })} className="mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{pt.title}</p>
                        <p className="text-xs text-muted-foreground">{pt.description}</p>
                        <div className="flex gap-2 mt-1">
                          {pt.dueDate && <span className="text-xs text-muted-foreground">Due: {pt.dueDate}</span>}
                          {pt.priority && <span className={`text-xs font-medium capitalize ${priorityColor}`}>{pt.priority}</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-project", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-project", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── NOTES ── */}
        {currentReviewStep === "review-notes" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><StickyNote className="h-5 w-5 text-muted-foreground" /> Notes</h2>
              <p className="text-sm text-muted-foreground">DW captured this as a general note. It will be saved to your journal.</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card px-4 py-4">
              {parsed.rawTitle && <p className="text-sm font-semibold mb-2">{parsed.rawTitle}</p>}
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">{parsed.notes}</p>
              {parsed.notesTags?.length > 0 && (
                <div className="flex gap-1 flex-wrap mt-3">
                  {parsed.notesTags.map((tag, i) => <Badge key={i} variant="outline" className="text-xs">{tag}</Badge>)}
                </div>
              )}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("review-notes", "back")}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("review-notes", "next")}>Next <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── SCHEDULE FREQUENCY ── */}
        {step === "schedule-freq" && parsed && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg flex items-center gap-2"><Calendar className="h-5 w-5 text-primary" /> Schedule Frequency</h2>
              <p className="text-sm text-muted-foreground">How far out should DW schedule your week?</p>
            </div>
            <RadioGroup value={frequency} onValueChange={v => setFrequency(v as Frequency)} className="space-y-3" data-testid="radio-frequency">
              {[
                { value: "weekly", label: "This week only", sub: "1 week of events" },
                { value: "biweekly", label: "2 weeks", sub: "Next 2 weeks scheduled out" },
                { value: "every3weeks", label: "3 weeks", sub: "Full 3-week block" },
                { value: "monthly", label: "Full month", sub: "4 weeks scheduled out" },
              ].map(opt => (
                <label key={opt.value} htmlFor={`freq-${opt.value}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${frequency === opt.value ? "border-primary bg-primary/5" : "border-border/40 bg-card"}`}
                  data-testid={`option-frequency-${opt.value}`}
                >
                  <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                  <div><p className="text-sm font-medium">{opt.label}</p><p className="text-xs text-muted-foreground">{opt.sub}</p></div>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">~{countCalendarEvents(parsed.weeklySchedule ?? {}, opt.value as Frequency)} events</span>
                </label>
              ))}
            </RadioGroup>
            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">Start week (Monday)</Label>
              <input id="start-date" type="date" data-testid="input-start-date" value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => navigate("schedule-freq", "back")} data-testid="button-back-schedule"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => navigate("schedule-freq", "next")} data-testid="button-schedule-next">Review Summary <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── CONFLICTS ── */}
        {step === "conflicts" && conflicts.length > 0 && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-yellow-500" /><h2 className="font-semibold text-lg">Goal Conflicts</h2></div>
              <p className="text-sm text-muted-foreground">These goals already exist in DW. Choose what to do with each one.</p>
            </div>
            <div className="space-y-4">
              {conflicts.map((c, i) => (
                <div key={i} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                  <p className="text-sm font-semibold">{c.newGoal.title}</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="rounded-lg bg-background/60 px-3 py-2"><p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">Existing</p><p>{c.existingGoal.description || c.existingGoal.title}</p></div>
                    <div className="rounded-lg bg-background/60 px-3 py-2"><p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px] mb-0.5">From import</p><p>{c.newGoal.description}</p></div>
                  </div>
                  <RadioGroup value={resolutions[c.newGoal.title] ?? "keep_existing"} onValueChange={v => setResolutions(prev => ({ ...prev, [c.newGoal.title]: v as ConflictResolution }))} data-testid={`conflict-resolution-${i}`}>
                    <div className="flex items-center gap-2"><RadioGroupItem value="keep_existing" id={`keep-${i}`} /><Label htmlFor={`keep-${i}`} className="text-sm cursor-pointer">Keep existing goal</Label></div>
                    <div className="flex items-center gap-2"><RadioGroupItem value="use_new" id={`use-new-${i}`} /><Label htmlFor={`use-new-${i}`} className="text-sm cursor-pointer">Replace with imported version</Label></div>
                  </RadioGroup>
                </div>
              ))}
            </div>
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep(allWizardSteps[allWizardSteps.indexOf("conflicts") - 1] as Step)}><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" onClick={() => setStep("confirm")} data-testid="button-conflicts-next">Continue <ChevronRight className="h-4 w-4 ml-1" /></Button>
            </div>
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && filteredParsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2"><ListChecks className="h-5 w-5 text-primary" /><h2 className="font-semibold text-lg">Ready to save</h2></div>
              <p className="text-sm text-muted-foreground">Here's everything DW will add to your account.</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
              {[
                filteredParsed.journalEntries?.length > 0 && { icon: BookMarked, label: "Journal entries", count: filteredParsed.journalEntries.length, sub: "Saved to your DW journal", color: "text-pink-500" },
                filteredParsed.goals?.length > 0 && { icon: Target, label: "Goals", count: filteredParsed.goals.length, sub: "Added to your goals page", color: "text-primary" },
                filteredParsed.coreRules?.length > 0 && { icon: Zap, label: "Daily habits", count: filteredParsed.coreRules.length, sub: "Your core rules as trackable habits", color: "text-primary" },
                filteredParsed.affirmations?.length > 0 && { icon: Star, label: "Affirmations", count: filteredParsed.affirmations.length, sub: "Saved as spiritual goals", color: "text-purple-500" },
                (filteredParsed.morningRoutine || filteredParsed.windDownRoutine) && { icon: BookOpen, label: "Routines", count: (filteredParsed.morningRoutine ? 1 : 0) + (filteredParsed.windDownRoutine ? 1 : 0), sub: "Morning + wind-down routines", color: "text-primary" },
                totalEvents > 0 && { icon: Calendar, label: "Calendar events", count: totalEvents, sub: `${FREQ_LABELS[frequency]} starting ${new Date(startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, color: "text-primary" },
                groceryCount > 0 && { icon: ShoppingCart, label: "Grocery items", count: groceryCount, sub: "Added to your shopping list", color: "text-primary" },
                filteredParsed.readingList?.length > 0 && { icon: BookOpen, label: "Reading/watch list", count: filteredParsed.readingList.length, sub: "Saved as intellectual goals", color: "text-indigo-500" },
                filteredParsed.financialGoals?.length > 0 && { icon: DollarSign, label: "Financial goals", count: filteredParsed.financialGoals.length, sub: "Saved as financial goals", color: "text-emerald-500" },
                filteredParsed.projectTasks?.length > 0 && { icon: FolderKanban, label: "Project tasks", count: filteredParsed.projectTasks.length, sub: "Saved as purpose goals", color: "text-cyan-500" },
                filteredParsed.notes && { icon: StickyNote, label: "Notes", count: 1, sub: "Saved to your journal", color: "text-muted-foreground" },
              ].filter(Boolean).map((item: any) => (
                <div key={item.label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                  </div>
                  <div className="flex-1 min-w-0"><p className="text-sm font-medium">{item.label}</p><p className="text-xs text-muted-foreground">{item.sub}</p></div>
                  <span className="text-lg font-bold text-primary shrink-0">{item.count}</span>
                </div>
              ))}
            </div>
            {applyMutation.isError && <p className="text-sm text-destructive text-center">{parseApiError(applyMutation.error)}</p>}
            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep(allWizardSteps[allWizardSteps.length - 2] as Step)} data-testid="button-back-confirm"><ChevronLeft className="h-4 w-4 mr-1" /> Back</Button>
              <Button className="flex-1" size="lg" disabled={applyMutation.isPending} onClick={() => applyMutation.mutate()} data-testid="button-apply-life-system">
                {applyMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin mr-2" />Saving…</> : <><Sparkles className="h-4 w-4 mr-2" />Save to DW</>}
              </Button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && applyResults && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="text-center pt-6 space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto"><CheckCircle2 className="h-8 w-8 text-primary" /></div>
              <h2 className="font-bold text-2xl">All saved.</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">Everything has been added to your DW account and is ready to use.</p>
            </div>
            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
              {Object.entries(applyResults).map(([key, count]) => count > 0 && (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <p className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                  <Badge variant="secondary">{count} created</Badge>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 pt-2 pb-6">
              {[
                { label: "View Calendar", route: "/calendar", icon: Calendar },
                { label: "My Goals", route: "/goals", icon: Target },
                { label: "Workout Plan", route: "/workout", icon: Dumbbell },
                { label: "Grocery List", route: "/meal-prep", icon: ShoppingCart },
              ].map(({ label, route, icon: Icon }) => (
                <Button key={route} variant="outline" className="h-auto py-3 flex-col gap-1" onClick={() => setLocation(route)} data-testid={`button-goto-${route.replace("/", "")}`}>
                  <Icon className="h-4 w-4 text-primary" /><span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>
            <div className="pb-6">
              <Button variant="ghost" className="w-full text-sm text-muted-foreground"
                onClick={() => { setPastedText(""); setParsed(null); setConflicts([]); setResolutions({}); setApplyResults(null); setStep("paste"); }}
                data-testid="button-import-another"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Import another
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
