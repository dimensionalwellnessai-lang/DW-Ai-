import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  Loader2, Sparkles, CheckCircle2, AlertTriangle, Calendar,
  Target, Dumbbell, UtensilsCrossed, ShoppingCart, BookOpen,
  ChevronRight, ChevronLeft, Zap, RotateCcw, ArrowRight,
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

type Step = "paste" | "preview" | "schedule" | "conflicts" | "confirm" | "done";

const DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

const dayLabel = (d: string) => d.charAt(0).toUpperCase() + d.slice(1);

function countCalendarEvents(schedule: Record<string, ParsedDaySchedule>, freq: Frequency) {
  const weeks = freq === "weekly" ? 1 : freq === "biweekly" ? 2 : freq === "every3weeks" ? 3 : 4;
  let count = 0;
  for (const day of DAYS) {
    const d = schedule?.[day];
    if (!d) continue;
    if (d.workout?.title) count++;
    const meals = d.meals;
    if (meals?.breakfast?.length) count++;
    if (meals?.lunch?.length) count++;
    if (meals?.dinner?.length) count++;
    if (meals?.snack?.length) count++;
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

  useEffect(() => {
    try {
      const prepaste = sessionStorage.getItem("dw_ls_prepaste");
      if (prepaste) {
        setPastedText(prepaste);
        sessionStorage.removeItem("dw_ls_prepaste");
      }
    } catch {}
  }, []);

  const parseMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/life-system/import/parse", { text: pastedText }).then((res) => res.json()),
    onSuccess: async (data: any) => {
      const p: ParsedLifeSystem = data.parsed;
      setParsed(p);
      setStep("preview");
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
    mutationFn: () =>
      apiRequest("POST", "/api/life-system/import/apply", {
        parsed,
        scheduleFrequency: frequency,
        startDate,
        conflictResolutions: resolutions,
      }).then((res) => res.json()),
    onSuccess: (data: any) => {
      setApplyResults(data.results);
      setStep("done");
    },
  });

  const totalEvents = parsed ? countCalendarEvents(parsed.weeklySchedule ?? {}, frequency) : 0;
  const groceryCount =
    (parsed?.groceryList?.protein?.length ?? 0) +
    (parsed?.groceryList?.carbs?.length ?? 0) +
    (parsed?.groceryList?.produce?.length ?? 0) +
    (parsed?.groceryList?.extras?.length ?? 0) +
    (parsed?.mealPrepItems?.length ?? 0);

  function goToScheduleOrConflict() {
    if (conflicts.length > 0) {
      setStep("conflicts");
    } else {
      setStep("schedule");
    }
  }

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
                DW will read it and build it all out for you automatically.
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
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">What DW will create</p>
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

        {/* ── STEP 2: PREVIEW ── */}
        {step === "preview" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">DW extracted</p>
              <h2 className="font-semibold text-lg leading-snug">{parsed.rawTitle || "Your Life System"}</h2>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[
                { icon: Target, count: parsed.goals?.length ?? 0, label: "Goals" },
                { icon: BookOpen, count: (parsed.coreRules?.length ?? 0), label: "Rules/Habits" },
                { icon: Calendar, count: totalEvents, label: "Cal Events" },
              ].map(({ icon: Icon, count, label }) => (
                <div key={label} className="rounded-xl border border-border/40 bg-muted/30 p-3 text-center">
                  <Icon className="h-4 w-4 text-primary mx-auto mb-1" />
                  <div className="text-xl font-bold">{count}</div>
                  <div className="text-xs text-muted-foreground">{label}</div>
                </div>
              ))}
            </div>

            {/* Goals */}
            {parsed.goals?.length > 0 && (
              <section className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Target className="h-3.5 w-3.5 text-primary" /> Goals
                </p>
                <div className="space-y-2">
                  {parsed.goals.map((g, i) => (
                    <div key={i} className="rounded-xl border border-border/40 bg-card px-3 py-2.5 space-y-0.5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium leading-snug">{g.title}</p>
                        <DimensionBadge dim={g.wellnessDimension} />
                      </div>
                      {g.description && <p className="text-xs text-muted-foreground">{g.description}</p>}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Core Rules */}
            {parsed.coreRules?.length > 0 && (
              <section className="space-y-2">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5 text-primary" /> Core Rules (saved as daily habits)
                </p>
                <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
                  {parsed.coreRules.map((r, i) => (
                    <div key={i} className="px-3 py-2 text-sm">{r}</div>
                  ))}
                </div>
              </section>
            )}

            {/* Weekly schedule summary */}
            <section className="space-y-2">
              <p className="text-sm font-semibold flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-primary" /> Weekly Schedule Preview
              </p>
              <div className="space-y-2">
                {DAYS.map((day) => {
                  const d = parsed.weeklySchedule?.[day];
                  if (!d) return null;
                  const hasWorkout = !!d.workout?.title;
                  const mealCount = [d.meals?.breakfast, d.meals?.lunch, d.meals?.dinner, d.meals?.snack].filter(m => m?.length).length;
                  const hasApp = !!d.appWork?.title;
                  if (!hasWorkout && mealCount === 0 && !hasApp && !d.otherEvents?.length) return null;
                  return (
                    <div key={day} className="rounded-xl border border-border/40 bg-card px-3 py-2.5">
                      <p className="text-sm font-semibold mb-1.5">{dayLabel(day)}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {hasWorkout && (
                          <span className="text-xs bg-green-500/10 text-green-600 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Dumbbell className="h-2.5 w-2.5" />{d.workout!.title}
                          </span>
                        )}
                        {mealCount > 0 && (
                          <span className="text-xs bg-orange-500/10 text-orange-600 dark:text-orange-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <UtensilsCrossed className="h-2.5 w-2.5" />{mealCount} meal{mealCount !== 1 ? "s" : ""}
                          </span>
                        )}
                        {hasApp && (
                          <span className="text-xs bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <BookOpen className="h-2.5 w-2.5" />{d.appWork!.title}
                          </span>
                        )}
                        {d.otherEvents?.map((o, i) => (
                          <span key={i} className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full">{o.title}</span>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Grocery */}
            {groceryCount > 0 && (
              <section className="space-y-1.5">
                <p className="text-sm font-semibold flex items-center gap-1.5">
                  <ShoppingCart className="h-3.5 w-3.5 text-primary" /> Grocery List ({groceryCount} items)
                </p>
                <div className="rounded-xl border border-border/40 bg-card px-3 py-2.5">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      ...parsed.groceryList?.protein ?? [],
                      ...parsed.groceryList?.carbs ?? [],
                      ...parsed.groceryList?.produce ?? [],
                      ...parsed.groceryList?.extras ?? [],
                    ].map((item, i) => (
                      <Badge key={i} variant="secondary" className="text-xs">{item}</Badge>
                    ))}
                  </div>
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
              <Button
                className="flex-1"
                onClick={goToScheduleOrConflict}
                disabled={conflictMutation.isPending}
                data-testid="button-preview-next"
              >
                Next — Choose Schedule <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFLICTS ── */}
        {step === "conflicts" && conflicts.length > 0 && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                <h2 className="font-semibold text-lg">Goal Conflicts</h2>
              </div>
              <p className="text-sm text-muted-foreground">
                These goals in your life system already exist in DW. Choose what to do with each one.
              </p>
            </div>

            <div className="space-y-4">
              {conflicts.map((c, i) => (
                <div key={i} className="rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4 space-y-3">
                  <div className="space-y-1">
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
              <Button variant="ghost" size="sm" onClick={() => setStep("preview")} data-testid="button-back-to-preview">
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep("schedule")} data-testid="button-conflicts-next">
                Continue <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: SCHEDULE ── */}
        {step === "schedule" && parsed && (
          <div className="p-4 space-y-6 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg">How long should DW schedule this?</h2>
              <p className="text-sm text-muted-foreground">
                DW will create calendar events for your full week across the chosen period.
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
                onClick={() => setStep(conflicts.length > 0 ? "conflicts" : "preview")}
                data-testid="button-back-to-conflicts"
              >
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
              <Button className="flex-1" onClick={() => setStep("confirm")} data-testid="button-schedule-next">
                Review & Confirm <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 5: CONFIRM ── */}
        {step === "confirm" && parsed && (
          <div className="p-4 space-y-5 max-w-lg mx-auto">
            <div className="space-y-1">
              <h2 className="font-semibold text-lg">Ready to build your system</h2>
              <p className="text-sm text-muted-foreground">Here's everything DW will create when you tap the button below.</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card divide-y divide-border/30">
              {[
                { icon: Target, label: "Goals", count: parsed.goals?.length ?? 0, sub: "Added to your goals page" },
                { icon: Zap, label: "Daily habits", count: parsed.coreRules?.length ?? 0, sub: "Your core rules as trackable habits" },
                { icon: BookOpen, label: "Routines", count: (parsed.morningRoutine ? 1 : 0) + (parsed.windDownRoutine ? 1 : 0), sub: "Morning + wind-down routines" },
                { icon: Calendar, label: "Calendar events", count: totalEvents, sub: `${frequency === "weekly" ? "1 week" : frequency === "biweekly" ? "2 weeks" : frequency === "every3weeks" ? "3 weeks" : "4 weeks"} of your schedule` },
                { icon: ShoppingCart, label: "Grocery items", count: groceryCount, sub: "Added to your shopping list" },
              ].map(({ icon: Icon, label, count, sub }) => (
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

            <div className="rounded-xl border border-border/40 bg-muted/30 px-4 py-3 space-y-1">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Schedule</p>
              <p className="text-sm">
                Starting <span className="font-medium">{new Date(startDate + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}</span>
                {" "}for <span className="font-medium">
                  {frequency === "weekly" ? "1 week" : frequency === "biweekly" ? "2 weeks" : frequency === "every3weeks" ? "3 weeks" : "4 weeks"}
                </span>
              </p>
            </div>

            {applyMutation.isError && (
              <p className="text-sm text-destructive text-center">{parseApiError(applyMutation.error)}</p>
            )}

            <div className="flex gap-2 pt-2 pb-6">
              <Button variant="ghost" size="sm" onClick={() => setStep("schedule")} data-testid="button-back-to-schedule">
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

        {/* ── STEP 6: DONE ── */}
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
