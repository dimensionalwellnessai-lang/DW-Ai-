import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
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
interface ParsedLifeSystem {
  rawTitle: string;
  goals: ParsedGoal[];
  coreRules: string[];
  morningRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  windDownRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  weeklySchedule: Record<string, ParsedDaySchedule>;
  groceryList: { protein: string[]; carbs: string[]; produce: string[]; extras: string[] };
  mealPrepItems: string[];
}
interface Conflict {
  newGoal: { title: string; description: string };
  existingGoal: { id: string; title: string; description?: string | null };
}

type Step =
  | "paste"
  | "review-goals"
  | "review-workouts"
  | "review-meals"
  | "review-events"
  | "review-grocery"
  | "schedule-freq"
  | "conflicts"
  | "confirm"
  | "done";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

const FREQ_LABELS: Record<Frequency, string> = {
  weekly: "1 week",
  biweekly: "2 weeks",
  every3weeks: "3 weeks",
  monthly: "4 weeks",
};

function countCalendarEvents(schedule: Record<string, ParsedDaySchedule>, freq: Frequency) {
  const weeks = freq === "weekly" ? 1 : freq === "biweekly" ? 2 : freq === "every3weeks" ? 3 : 4;
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

function StepPill({ label, active, done }: { label: string; active: boolean; done: boolean }) {
  return (
    <div className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium transition-colors ${
      done ? "bg-primary/15 text-primary" : active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
    }`}>
      {done && <CheckCircle2 className="h-3 w-3" />}
      {label}
    </div>
  );
}

// Build a filtered copy of parsed based on current selections
function buildFilteredParsed(
  parsed: ParsedLifeSystem,
  goalSel: boolean[],
  ruleSel: boolean[],
  workoutDays: Record<string, boolean>,
  mealDays: Record<string, Record<string, boolean>>,
  eventDays: Record<string, boolean[]>,
  grocerySel: Record<string, boolean[]>,
): ParsedLifeSystem {
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
  return { ...parsed, goals, coreRules, weeklySchedule, groceryList };
}

export default function LifeSystemImportPage() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("paste");
  const [pastedText, setPastedText] = useState("");
  const [parsed, setParsed] = useState<ParsedLifeSystem | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    const day = d.getDay();
    const diff = day === 0 ? 1 : 8 - day;
    d.setDate(d.getDate() + diff);
    return d.toISOString().slice(0, 10);
  });
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [applyResults, setApplyResults] = useState<Record<string, number> | null>(null);

  // Per-category selection state (true = include)
  const [goalSel, setGoalSel] = useState<boolean[]>([]);
  const [ruleSel, setRuleSel] = useState<boolean[]>([]);
  const [workoutDays, setWorkoutDays] = useState<Record<string, boolean>>({});
  const [mealDays, setMealDays] = useState<Record<string, Record<string, boolean>>>({});
  const [eventDays, setEventDays] = useState<Record<string, boolean[]>>({});
  const [grocerySel, setGrocerySel] = useState<Record<string, boolean[]>>({});

  useEffect(() => {
    try {
      const prepaste = sessionStorage.getItem("dw_ls_prepaste");
      if (prepaste) {
        setPastedText(prepaste);
        sessionStorage.removeItem("dw_ls_prepaste");
      }
    } catch {}
  }, []);

  // Initialize selection state when parsed data arrives
  function initSelections(p: ParsedLifeSystem) {
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
    setWorkoutDays(wd);
    setMealDays(md);
    setEventDays(ed);
    const gl = p.groceryList ?? { protein: [], carbs: [], produce: [], extras: [] };
    setGrocerySel({
      protein: gl.protein.map(() => true),
      carbs: gl.carbs.map(() => true),
      produce: gl.produce.map(() => true),
      extras: gl.extras.map(() => true),
    });
  }

  const parseMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/life-system/import/parse", { text: pastedText }).then((res) => res.json()),
    onSuccess: async (data: any) => {
      const p: ParsedLifeSystem = data.parsed;
      setParsed(p);
      initSelections(p);
      // Determine first non-empty review step
      if (p.goals?.length > 0 || p.coreRules?.length > 0) {
        setStep("review-goals");
      } else if (hasWorkouts(p)) {
        setStep("review-workouts");
      } else if (hasMeals(p)) {
        setStep("review-meals");
      } else {
        setStep("review-events");
      }
      if (p.goals?.length) {
        conflictMutation.mutate(p.goals);
      }
    },
    onError: (err) => {
      console.error("Parse error:", err);
    },
  });

  const conflictMutation = useMutation({
    mutationFn: (goals: ParsedGoal[]) =>
      apiRequest("POST", "/api/life-system/import/check-conflicts", { goals }).then((res) => res.json()),
    onSuccess: (data: any) => {
      setConflicts(data.conflicts ?? []);
      const defaultRes: Record<string, ConflictResolution> = {};
      for (const c of data.conflicts ?? []) {
        defaultRes[c.newGoal.title] = "keep_existing";
      }
      setResolutions(defaultRes);
    },
  });

  const applyMutation = useMutation({
    mutationFn: () => {
      const filtered = buildFilteredParsed(parsed!, goalSel, ruleSel, workoutDays, mealDays, eventDays, grocerySel);
      return apiRequest("POST", "/api/life-system/import/apply", {
        parsed: filtered,
        scheduleFrequency: frequency,
        startDate,
        conflictResolutions: resolutions,
      }).then((res) => res.json());
    },
    onSuccess: (data: any) => {
      setApplyResults(data.results);
      setStep("done");
    },
  });

  function hasWorkouts(p: ParsedLifeSystem) {
    return DAYS.some(d => !!p.weeklySchedule?.[d]?.workout?.title);
  }
  function hasMeals(p: ParsedLifeSystem) {
    return DAYS.some(d => {
      const m = p.weeklySchedule?.[d]?.meals;
      return m && (m.breakfast?.length || m.lunch?.length || m.dinner?.length || m.snack?.length);
    });
  }
  function hasEvents(p: ParsedLifeSystem) {
    return DAYS.some(d => (p.weeklySchedule?.[d]?.otherEvents?.length ?? 0) > 0
      || !!p.weeklySchedule?.[d]?.appWork?.title);
  }
  function hasGrocery(p: ParsedLifeSystem) {
    const gl = p.groceryList;
    return (gl?.protein?.length || gl?.carbs?.length || gl?.produce?.length || gl?.extras?.length || p.mealPrepItems?.length) > 0;
  }

  function nextAfterGoals() {
    if (!parsed) return;
    if (hasWorkouts(parsed)) setStep("review-workouts");
    else if (hasMeals(parsed)) setStep("review-meals");
    else if (hasEvents(parsed)) setStep("review-events");
    else if (hasGrocery(parsed)) setStep("review-grocery");
    else setStep("schedule-freq");
  }
  function nextAfterWorkouts() {
    if (!parsed) return;
    if (hasMeals(parsed)) setStep("review-meals");
    else if (hasEvents(parsed)) setStep("review-events");
    else if (hasGrocery(parsed)) setStep("review-grocery");
    else setStep("schedule-freq");
  }
  function nextAfterMeals() {
    if (!parsed) return;
    if (hasEvents(parsed)) setStep("review-events");
    else if (hasGrocery(parsed)) setStep("review-grocery");
    else setStep("schedule-freq");
  }
  function nextAfterEvents() {
    if (!parsed) return;
    if (hasGrocery(parsed)) setStep("review-grocery");
    else setStep("schedule-freq");
  }
  function nextAfterGrocery() {
    setStep("schedule-freq");
  }
  function nextAfterSchedule() {
    if (conflicts.length > 0) setStep("conflicts");
    else setStep("confirm");
  }

  const reviewSteps = parsed ? [
    (parsed.goals?.length > 0 || parsed.coreRules?.length > 0) && "Goals & Habits",
    hasWorkouts(parsed) && "Workouts",
    hasMeals(parsed) && "Meals",
    (hasEvents(parsed)) && "Events",
    hasGrocery(parsed) && "Grocery",
    "Schedule",
  ].filter(Boolean) as string[] : [];

  const stepOrder: Step[] = ["review-goals", "review-workouts", "review-meals", "review-events", "review-grocery", "schedule-freq", "conflicts", "confirm"];
  const currentStepIdx = stepOrder.indexOf(step);

  const filteredParsed = parsed
    ? buildFilteredParsed(parsed, goalSel, ruleSel, workoutDays, mealDays, eventDays, grocerySel)
    : null;
  const totalEvents = filteredParsed ? countCalendarEvents(filteredParsed.weeklySchedule ?? {}, frequency) : 0;
  const groceryCount = filteredParsed
    ? (filteredParsed.groceryList?.protein?.length ?? 0) +
      (filteredParsed.groceryList?.carbs?.length ?? 0) +
      (filteredParsed.groceryList?.produce?.length ?? 0) +
      (filteredParsed.groceryList?.extras?.length ?? 0) +
      (filteredParsed.mealPrepItems?.length ?? 0)
    : 0;

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <PageHeader title="Build My Life System" showBack />
      <div className="flex-1 overflow-y-auto">

        {/* ── STEP 1: PASTE ── */}
        {step === "paste" && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="space-y-2 pt-2">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <Sparkles className="h-4 w-4 text-primary" />
                </div>
                <h2 className="font-semibold text-lg">Paste your life system</h2>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Copy and paste your full life plan — workouts, meals, schedule, goals, grocery list, everything.
                DW will read it and walk you through each category to confirm what to build.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="life-system-text" className="text-sm font-medium">Your life system</Label>
              <Textarea
                id="life-system-text"
                data-testid="textarea-life-system"
                placeholder="Paste your full life system here...&#10;&#10;DW will extract:&#10;• Goals &amp; targets&#10;• Daily workouts (exercises, sets, reps)&#10;• Meals (breakfast, lunch, dinner, snack)&#10;• Morning &amp; wind-down routines&#10;• App work blocks&#10;• Core rules / habits&#10;• Weekly grocery list"
                value={pastedText}
                onChange={(e) => setPastedText(e.target.value)}
                className="min-h-[280px] text-base font-mono text-sm resize-none"
              />
              <p className="text-xs text-muted-foreground">{pastedText.length} characters</p>
            </div>

            <Button
              data-testid="button-parse-life-system"
              className="w-full"
              size="lg"
              disabled={pastedText.trim().length < 50 || parseMutation.isPending}
              onClick={() => parseMutation.mutate()}
            >
              {parseMutation.isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin mr-2" />DW is reading your system…</>
              ) : (
                <><Sparkles className="h-4 w-4 mr-2" />Let DW Build This Out</>
              )}
            </Button>

            {parseMutation.isError && (
              <p className="text-sm text-destructive text-center">
                {parseApiError(parseMutation.error)}
              </p>
            )}

            <div className="rounded-xl border border-border/40 bg-muted/30 p-4 space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What DW will build</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                {[
                  { icon: Target, label: "Goals" },
                  { icon: Dumbbell, label: "Workout events" },
                  { icon: UtensilsCrossed, label: "Meal events" },
                  { icon: BookOpen, label: "Routines" },
                  { icon: ShoppingCart, label: "Grocery list" },
                  { icon: Calendar, label: "Calendar schedule" },
                ].map(({ icon: Icon, label }) => (
                  <div key={label} className="flex items-center gap-2 text-muted-foreground">
                    <Icon className="h-3.5 w-3.5 text-primary/70" />
                    <span>{label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Progress bar shown during review steps */}
        {parsed && step !== "paste" && step !== "done" && (
          <div className="px-4 pt-3 pb-1 max-w-lg mx-auto">
            <div className="flex gap-1.5 flex-wrap">
              {reviewSteps.map((label) => {
                const stepMap: Record<string, Step> = {
                  "Goals & Habits": "review-goals",
                  "Workouts": "review-workouts",
                  "Meals": "review-meals",
                  "Events": "review-events",
                  "Grocery": "review-grocery",
                  "Schedule": "schedule-freq",
                };
                const s = stepMap[label];
                const sIdx = stepOrder.indexOf(s);
                return (
                  <StepPill
                    key={label}
                    label={label}
                    active={step === s}
                    done={currentStepIdx > sIdx}
                  />
                );
              })}
            </div>
          </div>
        )}

        {/* ── REVIEW: GOALS & HABITS ── */}
        {step === "review-goals" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">Category 1 of {reviewSteps.length}</p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" /> Goals & Daily Habits
              </h2>
              <p className="text-sm text-muted-foreground">
                DW found {parsed.goals?.length ?? 0} goal{parsed.goals?.length !== 1 ? "s" : ""} and {parsed.coreRules?.length ?? 0} core rule{parsed.coreRules?.length !== 1 ? "s" : ""}.
                Uncheck anything you don't want added.
              </p>
            </div>

            {parsed.goals?.length > 0 && (
              <section className="space-y-2">
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-xs">Goals</p>
                <div className="space-y-2">
                  {parsed.goals.map((g, i) => (
                    <div
                      key={i}
                      className={`rounded-xl border px-3 py-2.5 space-y-0.5 transition-opacity cursor-pointer ${
                        goalSel[i] !== false ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"
                      }`}
                      onClick={() => setGoalSel(s => { const n = [...s]; n[i] = !n[i]; return n; })}
                      data-testid={`goal-item-${i}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-start gap-2 flex-1 min-w-0">
                          <Checkbox
                            checked={goalSel[i] !== false}
                            onCheckedChange={(v) => setGoalSel(s => { const n = [...s]; n[i] = !!v; return n; })}
                            className="mt-0.5 shrink-0"
                            data-testid={`checkbox-goal-${i}`}
                          />
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
                <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wide text-xs">Daily Habits (Core Rules)</p>
                <div className="space-y-1.5">
                  {parsed.coreRules.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-opacity ${
                        ruleSel[i] !== false ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"
                      }`}
                      onClick={() => setRuleSel(s => { const n = [...s]; n[i] = !n[i]; return n; })}
                      data-testid={`rule-item-${i}`}
                    >
                      <Checkbox
                        checked={ruleSel[i] !== false}
                        onCheckedChange={(v) => setRuleSel(s => { const n = [...s]; n[i] = !!v; return n; })}
                        className="shrink-0"
                        data-testid={`checkbox-rule-${i}`}
                      />
                      <p className="text-sm flex-1">{r}</p>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {conflictMutation.isPending && (
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <Loader2 className="h-3 w-3 animate-spin" /> Checking for goal conflicts…
              </p>
            )}

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep("paste")} data-testid="button-back-to-paste">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterGoals} data-testid="button-goals-next">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── REVIEW: WORKOUTS ── */}
        {step === "review-workouts" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Category {reviewSteps.indexOf("Workouts") + 1} of {reviewSteps.length}
              </p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Dumbbell className="h-5 w-5 text-primary" /> Workout Plan
              </h2>
              <p className="text-sm text-muted-foreground">
                These workouts will repeat for <strong>{FREQ_LABELS[frequency]}</strong> on your calendar.
                Uncheck any day you want to skip.
              </p>
            </div>

            <div className="space-y-3">
              {DAYS.map((day) => {
                const d = parsed.weeklySchedule?.[day];
                if (!d?.workout?.title) return null;
                const included = workoutDays[day] !== false;
                return (
                  <div
                    key={day}
                    className={`rounded-xl border px-4 py-3 cursor-pointer transition-opacity ${
                      included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"
                    }`}
                    onClick={() => setWorkoutDays(s => ({ ...s, [day]: !s[day] }))}
                    data-testid={`workout-day-${day}`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={included}
                          onCheckedChange={(v) => setWorkoutDays(s => ({ ...s, [day]: !!v }))}
                          className="shrink-0"
                          data-testid={`checkbox-workout-${day}`}
                        />
                        <p className="text-sm font-semibold">{dayLabel(day)}</p>
                      </div>
                      <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full font-medium">
                        {d.workout!.title}
                      </span>
                      {d.workout?.time && (
                        <span className="text-xs text-muted-foreground font-mono">{d.workout.time}</span>
                      )}
                    </div>
                    {d.workout!.exercises?.length > 0 && (
                      <div className="pl-6 space-y-0.5">
                        {d.workout!.exercises.slice(0, 4).map((ex, i) => (
                          <p key={i} className="text-xs text-muted-foreground">
                            {ex.name}{ex.sets ? ` — ${ex.sets}×${ex.reps}` : ""}
                          </p>
                        ))}
                        {d.workout!.exercises.length > 4 && (
                          <p className="text-xs text-muted-foreground">+{d.workout!.exercises.length - 4} more</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3">
              <p className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{Object.values(workoutDays).filter(Boolean).length} workouts</span> per week ×{" "}
                {frequency === "weekly" ? "1 week" : frequency === "biweekly" ? "2 weeks" : frequency === "every3weeks" ? "3 weeks" : "4 weeks"} =
                <span className="font-medium text-foreground"> {Object.values(workoutDays).filter(Boolean).length * (frequency === "weekly" ? 1 : frequency === "biweekly" ? 2 : frequency === "every3weeks" ? 3 : 4)} workout events</span> added to your calendar
              </p>
            </div>

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep(parsed.goals?.length || parsed.coreRules?.length ? "review-goals" : "paste")} data-testid="button-back-workouts">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterWorkouts} data-testid="button-workouts-next">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── REVIEW: MEALS ── */}
        {step === "review-meals" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Category {reviewSteps.indexOf("Meals") + 1} of {reviewSteps.length}
              </p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <UtensilsCrossed className="h-5 w-5 text-primary" /> Meal Plan
              </h2>
              <p className="text-sm text-muted-foreground">
                These meals will repeat for <strong>{FREQ_LABELS[frequency]}</strong> as calendar events. Uncheck any meal you don't want scheduled.
              </p>
            </div>

            <div className="space-y-4">
              {DAYS.map((day) => {
                const d = parsed.weeklySchedule?.[day];
                const meals = d?.meals;
                if (!meals) return null;
                const hasMeal = meals.breakfast?.length || meals.lunch?.length || meals.dinner?.length || meals.snack?.length;
                if (!hasMeal) return null;
                const dayMeal = mealDays[day] ?? {};
                return (
                  <div key={day} className="rounded-xl border border-border/40 bg-card px-4 py-3 space-y-2">
                    <p className="text-sm font-semibold">{dayLabel(day)}</p>
                    <div className="space-y-1.5">
                      {(["breakfast", "lunch", "dinner", "snack"] as const).map((type) => {
                        const items = meals[type];
                        if (!items?.length) return null;
                        const included = dayMeal[type] !== false;
                        return (
                          <div
                            key={type}
                            className={`flex items-center gap-2.5 py-1 cursor-pointer transition-opacity ${!included ? "opacity-40" : ""}`}
                            onClick={() => setMealDays(s => ({
                              ...s,
                              [day]: { ...(s[day] ?? {}), [type]: !dayMeal[type] }
                            }))}
                            data-testid={`meal-${day}-${type}`}
                          >
                            <Checkbox
                              checked={included}
                              onCheckedChange={(v) => setMealDays(s => ({
                                ...s,
                                [day]: { ...(s[day] ?? {}), [type]: !!v }
                              }))}
                              className="shrink-0"
                            />
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
              <Button variant="ghost" size="sm" onClick={() => hasWorkouts(parsed) ? setStep("review-workouts") : setStep("review-goals")} data-testid="button-back-meals">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterMeals} data-testid="button-meals-next">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── REVIEW: CALENDAR EVENTS ── */}
        {step === "review-events" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Category {reviewSteps.indexOf("Events") + 1} of {reviewSteps.length}
              </p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Calendar Events
              </h2>
              <p className="text-sm text-muted-foreground">
                These events will repeat for <strong>{FREQ_LABELS[frequency]}</strong>. Uncheck any you don't want on your calendar.
              </p>
            </div>

            <div className="space-y-4">
              {DAYS.map((day) => {
                const d = parsed.weeklySchedule?.[day];
                const events = d?.otherEvents ?? [];
                const appWork = d?.appWork;
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
                          <div
                            key={i}
                            className={`flex items-center gap-2.5 py-1 cursor-pointer transition-opacity ${!included ? "opacity-40" : ""}`}
                            onClick={() => setEventDays(s => {
                              const arr = [...(s[day] ?? events.map(() => true))];
                              arr[i] = !arr[i];
                              return { ...s, [day]: arr };
                            })}
                            data-testid={`event-${day}-${i}`}
                          >
                            <Checkbox
                              checked={included}
                              onCheckedChange={(v) => setEventDays(s => {
                                const arr = [...(s[day] ?? events.map(() => true))];
                                arr[i] = !!v;
                                return { ...s, [day]: arr };
                              })}
                              className="shrink-0"
                            />
                            <span className="text-xs text-muted-foreground font-mono w-12">{ev.time}</span>
                            <span className="text-sm flex-1">{ev.title}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
              {!DAYS.some(d => (parsed.weeklySchedule?.[d]?.otherEvents?.length ?? 0) > 0 || parsed.weeklySchedule?.[d]?.appWork) && (
                <p className="text-sm text-muted-foreground text-center py-4">No other calendar events found.</p>
              )}
            </div>

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => hasMeals(parsed) ? setStep("review-meals") : hasWorkouts(parsed) ? setStep("review-workouts") : setStep("review-goals")} data-testid="button-back-events">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterEvents} data-testid="button-events-next">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── REVIEW: GROCERY ── */}
        {step === "review-grocery" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Category {reviewSteps.indexOf("Grocery") + 1} of {reviewSteps.length}
              </p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-primary" /> Grocery List
              </h2>
              <p className="text-sm text-muted-foreground">
                Uncheck anything you don't need this week.
              </p>
            </div>

            {(["protein", "carbs", "produce", "extras"] as const).map((cat) => {
              const items = parsed.groceryList?.[cat] ?? [];
              if (!items.length) return null;
              return (
                <section key={cat} className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground capitalize">{cat}</p>
                  <div className="space-y-1.5">
                    {items.map((item, i) => {
                      const included = (grocerySel[cat] ?? [])[i] !== false;
                      return (
                        <div
                          key={i}
                          className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 cursor-pointer transition-opacity ${
                            included ? "border-border/40 bg-card" : "border-border/20 bg-muted/20 opacity-50"
                          }`}
                          onClick={() => setGrocerySel(s => {
                            const arr = [...(s[cat] ?? items.map(() => true))];
                            arr[i] = !arr[i];
                            return { ...s, [cat]: arr };
                          })}
                          data-testid={`grocery-${cat}-${i}`}
                        >
                          <Checkbox
                            checked={included}
                            onCheckedChange={(v) => setGrocerySel(s => {
                              const arr = [...(s[cat] ?? items.map(() => true))];
                              arr[i] = !!v;
                              return { ...s, [cat]: arr };
                            })}
                            className="shrink-0"
                          />
                          <span className="text-sm">{item}</span>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}

            {parsed.mealPrepItems?.length > 0 && (
              <section className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Meal Prep</p>
                <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
                  {parsed.mealPrepItems.map((item, i) => (
                    <div key={i} className="px-3 py-2 text-sm">{item}</div>
                  ))}
                </div>
              </section>
            )}

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => hasEvents(parsed) ? setStep("review-events") : hasMeals(parsed) ? setStep("review-meals") : setStep("review-workouts")} data-testid="button-back-grocery">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterGrocery} data-testid="button-grocery-next">
                Next — Choose Schedule <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── SCHEDULE FREQUENCY ── */}
        {step === "schedule-freq" && parsed && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Category {reviewSteps.indexOf("Schedule") + 1} of {reviewSteps.length}
              </p>
              <h2 className="font-semibold text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" /> Schedule Frequency
              </h2>
              <p className="text-sm text-muted-foreground">
                How far out should DW schedule your full week?
              </p>
            </div>

            <RadioGroup
              value={frequency}
              onValueChange={(v) => setFrequency(v as Frequency)}
              className="space-y-3"
              data-testid="radio-frequency"
            >
              {[
                { value: "weekly", label: "This week only", sub: "1 week of events" },
                { value: "biweekly", label: "2 weeks", sub: "Next 2 weeks scheduled out" },
                { value: "every3weeks", label: "3 weeks", sub: "Full 3-week block" },
                { value: "monthly", label: "Full month", sub: "4 weeks scheduled out" },
              ].map((opt) => (
                <label
                  key={opt.value}
                  htmlFor={`freq-${opt.value}`}
                  className={`flex items-center gap-3 rounded-xl border px-4 py-3.5 cursor-pointer transition-colors ${
                    frequency === opt.value
                      ? "border-primary bg-primary/5"
                      : "border-border/40 bg-card"
                  }`}
                  data-testid={`option-frequency-${opt.value}`}
                >
                  <RadioGroupItem value={opt.value} id={`freq-${opt.value}`} />
                  <div>
                    <p className="text-sm font-medium">{opt.label}</p>
                    <p className="text-xs text-muted-foreground">{opt.sub}</p>
                  </div>
                  <span className="ml-auto text-xs text-muted-foreground font-mono">
                    ~{countCalendarEvents(parsed.weeklySchedule ?? {}, opt.value as Frequency)} events
                  </span>
                </label>
              ))}
            </RadioGroup>

            <div className="space-y-2">
              <Label htmlFor="start-date" className="text-sm font-medium">Start week (Monday)</Label>
              <input
                id="start-date"
                type="date"
                data-testid="input-start-date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-border/40 bg-card px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-muted-foreground">Events will be created starting this Monday.</p>
            </div>

            <div className="flex gap-2 pt-2 pb-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => hasGrocery(parsed) ? setStep("review-grocery") : hasEvents(parsed) ? setStep("review-events") : hasMeals(parsed) ? setStep("review-meals") : setStep("review-workouts")}
                data-testid="button-back-schedule"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={nextAfterSchedule} data-testid="button-schedule-next">
                Review Summary <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── CONFLICTS ── */}
        {step === "conflicts" && conflicts.length > 0 && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h2 className="font-semibold text-lg">Goal Conflicts</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                These goals already exist in DW. Choose what to do with each one.
              </p>
            </div>

            <div className="space-y-4">
              {conflicts.map((c, i) => (
                <div key={i} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                  <p className="text-sm font-semibold">{c.newGoal.title}</p>
                  <div className="grid grid-cols-1 gap-2 text-xs">
                    <div className="rounded-lg bg-background/60 px-3 py-2 space-y-0.5">
                      <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">Existing</p>
                      <p>{c.existingGoal.description || c.existingGoal.title}</p>
                    </div>
                    <div className="rounded-lg bg-background/60 px-3 py-2 space-y-0.5">
                      <p className="font-medium text-muted-foreground uppercase tracking-wide text-[10px]">From your life system</p>
                      <p>{c.newGoal.description}</p>
                    </div>
                  </div>
                  <RadioGroup
                    value={resolutions[c.newGoal.title] ?? "keep_existing"}
                    onValueChange={(v) =>
                      setResolutions((prev) => ({ ...prev, [c.newGoal.title]: v as ConflictResolution }))
                    }
                    data-testid={`conflict-resolution-${i}`}
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="keep_existing" id={`keep-${i}`} />
                      <Label htmlFor={`keep-${i}`} className="text-sm cursor-pointer">Keep existing goal</Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="use_new" id={`use-new-${i}`} />
                      <Label htmlFor={`use-new-${i}`} className="text-sm cursor-pointer">Replace with life system version</Label>
                    </div>
                  </RadioGroup>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep("schedule-freq")} data-testid="button-back-conflicts">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep("confirm")} data-testid="button-conflicts-next">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── CONFIRM ── */}
        {step === "confirm" && filteredParsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ListChecks className="h-5 w-5 text-primary" />
                <h2 className="font-semibold text-lg">Ready to build</h2>
              </div>
              <p className="text-sm text-muted-foreground">Here's your confirmed life system summary.</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
              {[
                { icon: Target, label: "Goals", count: filteredParsed.goals?.length ?? 0, sub: "Added to your goals page" },
                { icon: Zap, label: "Daily habits", count: filteredParsed.coreRules?.length ?? 0, sub: "Your core rules as trackable habits" },
                { icon: BookOpen, label: "Routines", count: (filteredParsed.morningRoutine ? 1 : 0) + (filteredParsed.windDownRoutine ? 1 : 0), sub: "Morning + wind-down routines" },
                { icon: Calendar, label: "Calendar events", count: totalEvents, sub: `${FREQ_LABELS[frequency]} of your schedule, starting ${new Date(startDate + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })}` },
                { icon: ShoppingCart, label: "Grocery items", count: groceryCount, sub: "Added to your shopping list" },
              ].map(({ icon: Icon, label, count, sub }) => count > 0 && (
                <div key={label} className="flex items-center gap-3 px-4 py-3.5">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{sub}</p>
                  </div>
                  <span className="text-lg font-bold text-primary shrink-0">{count}</span>
                </div>
              ))}
            </div>

            {applyMutation.isError && (
              <p className="text-sm text-destructive text-center">{parseApiError(applyMutation.error)}</p>
            )}

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep(conflicts.length > 0 ? "conflicts" : "schedule-freq")} data-testid="button-back-confirm">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button
                className="flex-1"
                size="lg"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
                data-testid="button-apply-life-system"
              >
                {applyMutation.isPending ? (
                  <><Loader2 className="h-4 w-4 animate-spin mr-2" />Building your system…</>
                ) : (
                  <><Sparkles className="h-4 w-4 mr-2" />Build My Life System</>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* ── DONE ── */}
        {step === "done" && applyResults && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="text-center pt-6 space-y-3">
              <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-bold text-2xl">Your system is live.</h2>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto leading-relaxed">
                DW has built everything out. Your goals, habits, routines, schedule, and grocery list are all set up and ready.
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
              {Object.entries(applyResults).map(([key, count]) => (
                count > 0 && (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <p className="text-sm capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                    <Badge variant="secondary">{count} created</Badge>
                  </div>
                )
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 pb-6">
              {[
                { label: "View Calendar", route: "/calendar", icon: Calendar },
                { label: "My Goals", route: "/goals", icon: Target },
                { label: "Workout Plan", route: "/workout", icon: Dumbbell },
                { label: "Grocery List", route: "/meal-prep", icon: ShoppingCart },
              ].map(({ label, route, icon: Icon }) => (
                <Button
                  key={route}
                  variant="outline"
                  className="h-auto py-3 flex-col gap-1"
                  onClick={() => setLocation(route)}
                  data-testid={`button-goto-${route.replace("/", "")}`}
                >
                  <Icon className="h-4 w-4 text-primary" />
                  <span className="text-xs">{label}</span>
                </Button>
              ))}
            </div>

            <div className="pb-6">
              <Button
                variant="ghost"
                className="w-full text-sm text-muted-foreground"
                onClick={() => {
                  setPastedText("");
                  setParsed(null);
                  setConflicts([]);
                  setResolutions({});
                  setApplyResults(null);
                  setStep("paste");
                }}
                data-testid="button-import-another"
              >
                <RotateCcw className="h-3.5 w-3.5 mr-2" /> Import another system
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
