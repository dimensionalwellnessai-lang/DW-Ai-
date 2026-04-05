import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  ArrowLeft, CheckCircle2, Loader2,
  Target, Repeat2, CalendarDays, UtensilsCrossed,
  ShoppingCart, Sunrise, Moon, Dumbbell, Laptop2,
  ChefHat,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────
type Frequency = "weekly" | "biweekly" | "every3weeks" | "monthly";
type Step = "paste" | "review" | "done";

interface ParsedDay {
  meals: { breakfast: string[]; lunch: string[]; dinner: string[]; snack: string[] };
  workout: { title: string; time: string; exercises: any[] } | null;
  appWork: { title: string; time: string; durationMinutes: number; tasks: string[] } | null;
  otherEvents: { title: string; time: string; endTime: string; notes: string }[];
}

interface ParsedData {
  rawTitle: string;
  detectedTypes: string[];
  goals: { title: string; description: string; wellnessDimension: string }[];
  coreRules: string[];
  morningRoutine: { name: string; steps: { title: string; duration: string; time?: string }[] } | null;
  windDownRoutine: { name: string; steps: { title: string; duration: string; time?: string }[] } | null;
  weeklySchedule: Record<string, ParsedDay>;
  groceryList: { protein: string[]; carbs: string[]; produce: string[]; extras: string[] };
  mealPrepItems: string[];
  journalEntries: any[];
  affirmations: string[];
  readingList: any[];
  financialGoals: any[];
  projectTasks: any[];
  notes: string;
  notesTags: string[];
}

const DAYS = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];
const DAY_LABEL = (d: string) => d[0].toUpperCase() + d.slice(1);

const FREQ_OPTS: { value: Frequency; label: string }[] = [
  { value: "weekly",       label: "1 week"  },
  { value: "biweekly",    label: "2 weeks" },
  { value: "every3weeks", label: "3 weeks" },
  { value: "monthly",     label: "4 weeks" },
];

// ── Per-category counts ───────────────────────────────────────────────────────
const countWorkouts    = (s: Record<string, ParsedDay>) => DAYS.filter(d => s[d]?.workout?.title).length;
const countMeals       = (s: Record<string, ParsedDay>) => DAYS.reduce((n, d) => {
  const m = s[d]?.meals; if (!m) return n;
  return n + (m.breakfast?.length?1:0) + (m.lunch?.length?1:0) + (m.dinner?.length?1:0) + (m.snack?.length?1:0);
}, 0);
const countAppWork     = (s: Record<string, ParsedDay>) => DAYS.filter(d => s[d]?.appWork?.title).length;
const countOtherEvents = (s: Record<string, ParsedDay>) => DAYS.reduce((n, d) => n + (s[d]?.otherEvents?.length ?? 0), 0);
const countGrocery     = (g: ParsedData["groceryList"]) =>
  (g?.protein?.length??0) + (g?.carbs?.length??0) + (g?.produce?.length??0) + (g?.extras?.length??0);

const hasSchedule = (p: ParsedData) =>
  countWorkouts(p.weeklySchedule) > 0 || countMeals(p.weeklySchedule) > 0 ||
  countAppWork(p.weeklySchedule) > 0 || countOtherEvents(p.weeklySchedule) > 0;

// ── Component ─────────────────────────────────────────────────────────────────
export default function DWSmartImportPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("paste");

  // Pre-fill from chat detection
  const [text, setText] = useState(() => {
    try {
      const pre = sessionStorage.getItem("dw_ls_prepaste");
      if (pre) { sessionStorage.removeItem("dw_ls_prepaste"); return pre; }
    } catch { /* ignore */ }
    return "";
  });

  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [parseError, setParseError] = useState("");

  // One toggle per category
  const [include, setInclude] = useState({
    goals:          true,
    habits:         true,
    morningRoutine: true,
    windDown:       true,
    workouts:       true,
    meals:          true,
    appWork:        true,
    events:         true,
    grocery:        true,
    mealPrep:       true,
  });
  const toggle = (k: keyof typeof include) => setInclude(p => ({ ...p, [k]: !p[k] }));

  const [applyResult, setApplyResult] = useState<Record<string, number> | null>(null);

  // ── Parse ─────────────────────────────────────────────────────────────────
  const parseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/life-system/import/parse", { text });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => { setParsed(data.parsed); setParseError(""); setStep("review"); },
    onError: (err: any) => setParseError(err.message || "Could not read your document."),
  });

  // ── Apply ─────────────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No parsed data");

      // Build a filtered copy respecting toggles
      const filtered: ParsedData = {
        ...parsed,
        goals:           include.goals    ? parsed.goals           : [],
        coreRules:       include.habits   ? parsed.coreRules       : [],
        morningRoutine:  include.morningRoutine ? parsed.morningRoutine : null,
        windDownRoutine: include.windDown       ? parsed.windDownRoutine : null,
        groceryList:     include.grocery
          ? parsed.groceryList
          : { protein: [], carbs: [], produce: [], extras: [] },
        mealPrepItems: include.mealPrep ? parsed.mealPrepItems : [],
        weeklySchedule: Object.fromEntries(
          DAYS.map(day => {
            const d = parsed.weeklySchedule?.[day];
            if (!d) return [day, { meals: { breakfast:[], lunch:[], dinner:[], snack:[] }, workout: null, appWork: null, otherEvents:[] }];
            return [day, {
              meals:       include.meals    ? d.meals       : { breakfast:[], lunch:[], dinner:[], snack:[] },
              workout:     include.workouts ? d.workout     : null,
              appWork:     include.appWork  ? d.appWork     : null,
              otherEvents: include.events   ? d.otherEvents : [],
            }];
          })
        ),
      };

      const res = await apiRequest("POST", "/api/life-system/import/apply", {
        parsed: filtered,
        scheduleFrequency: frequency,
        startDate: new Date().toISOString().slice(0, 10),
        conflictResolutions: {},
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.error || `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => { setApplyResult(data.results); setStep("done"); },
    onError: (err: any) => setParseError(err.message || "Failed to import. Please try again."),
  });

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-border/40 shrink-0">
        <button onClick={() => navigate("/")} className="p-1 -ml-1 text-muted-foreground" data-testid="btn-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold">DW Smart Import</h1>
          <p className="text-xs text-muted-foreground">
            {step === "paste" && "Paste any document and DW reads it"}
            {step === "review" && "Choose what to bring in"}
            {step === "done" && "Successfully imported"}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── STEP 1: PASTE ───────────────────────────────────────────────── */}
        {step === "paste" && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Paste your full life system — goals, schedule, workouts, meals, grocery list, routines. DW will read it and pull every piece into your account.
            </p>

            <Textarea
              data-testid="textarea-import"
              placeholder="Paste your full life system document here…"
              value={text}
              onChange={e => { setText(e.target.value); setParseError(""); }}
              rows={15}
              className="resize-none font-mono text-xs"
            />

            {parseError && (
              <p className="text-sm text-destructive" data-testid="text-parse-error">{parseError}</p>
            )}

            <Button
              data-testid="btn-read"
              className="w-full"
              size="lg"
              disabled={text.trim().length < 20 || parseMutation.isPending}
              onClick={() => parseMutation.mutate()}
            >
              {parseMutation.isPending
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Reading your document…</>
                : "Read My Document"}
            </Button>
          </div>
        )}

        {/* ── STEP 2: REVIEW ──────────────────────────────────────────────── */}
        {step === "review" && parsed && (
          <div className="p-4 space-y-2.5">
            {parsed.rawTitle && (
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide pb-1 truncate">
                {parsed.rawTitle}
              </p>
            )}

            {/* 1. Goals */}
            <CatRow
              icon={<Target className="w-4 h-4 text-violet-400" />}
              label="Goals"
              count={parsed.goals.length}
              enabled={include.goals}
              onToggle={() => toggle("goals")}
              items={parsed.goals.map(g => `${g.title} (${g.wellnessDimension})`)}
              testId="goals"
            />

            {/* 2. Daily Habits */}
            <CatRow
              icon={<Repeat2 className="w-4 h-4 text-blue-400" />}
              label="Daily Habits"
              count={parsed.coreRules.length}
              enabled={include.habits}
              onToggle={() => toggle("habits")}
              items={parsed.coreRules}
              testId="habits"
            />

            {/* 3. Morning Routine */}
            <CatRow
              icon={<Sunrise className="w-4 h-4 text-amber-400" />}
              label="Morning Routine"
              count={parsed.morningRoutine?.steps?.length ?? 0}
              enabled={include.morningRoutine}
              onToggle={() => toggle("morningRoutine")}
              items={parsed.morningRoutine?.steps?.map(s => s.title) ?? []}
              testId="morning-routine"
            />

            {/* 4. Wind Down Routine */}
            <CatRow
              icon={<Moon className="w-4 h-4 text-indigo-400" />}
              label="Wind Down Routine"
              count={parsed.windDownRoutine?.steps?.length ?? 0}
              enabled={include.windDown}
              onToggle={() => toggle("windDown")}
              items={parsed.windDownRoutine?.steps?.map(s => s.title) ?? []}
              testId="wind-down"
            />

            {/* 5. Workouts */}
            <CatRow
              icon={<Dumbbell className="w-4 h-4 text-rose-400" />}
              label="Workouts"
              count={countWorkouts(parsed.weeklySchedule)}
              enabled={include.workouts}
              onToggle={() => toggle("workouts")}
              items={DAYS.flatMap(d => {
                const w = parsed.weeklySchedule[d]?.workout;
                if (!w?.title) return [];
                const exs = w.exercises?.map(e =>
                  `  • ${e.name}${e.sets && e.reps ? ` ${e.sets}×${e.reps}` : ""}`
                ) ?? [];
                return [`${DAY_LABEL(d)}: ${w.title}`, ...exs];
              })}
              testId="workouts"
            />

            {/* 6. Meal Plan */}
            <CatRow
              icon={<UtensilsCrossed className="w-4 h-4 text-orange-400" />}
              label="Meal Plan"
              count={countMeals(parsed.weeklySchedule)}
              enabled={include.meals}
              onToggle={() => toggle("meals")}
              items={DAYS.flatMap(d => {
                const m = parsed.weeklySchedule[d]?.meals;
                if (!m) return [];
                const out: string[] = [];
                if (m.breakfast?.length) out.push(`${DAY_LABEL(d)} Breakfast: ${m.breakfast.join(", ")}`);
                if (m.lunch?.length)     out.push(`${DAY_LABEL(d)} Lunch: ${m.lunch.join(", ")}`);
                if (m.dinner?.length)    out.push(`${DAY_LABEL(d)} Dinner: ${m.dinner.join(", ")}`);
                if (m.snack?.length)     out.push(`${DAY_LABEL(d)} Snack: ${m.snack.join(", ")}`);
                return out;
              })}
              testId="meals"
            />

            {/* 7. App Work */}
            <CatRow
              icon={<Laptop2 className="w-4 h-4 text-cyan-400" />}
              label="App Work Sessions"
              count={countAppWork(parsed.weeklySchedule)}
              enabled={include.appWork}
              onToggle={() => toggle("appWork")}
              items={DAYS.flatMap(d => {
                const a = parsed.weeklySchedule[d]?.appWork;
                if (!a?.title) return [];
                return [`${DAY_LABEL(d)}: ${a.title} (${a.durationMinutes}min)`, ...(a.tasks?.map(t => `  • ${t}`) ?? [])];
              })}
              testId="app-work"
            />

            {/* 8. Other Schedule Events */}
            <CatRow
              icon={<CalendarDays className="w-4 h-4 text-green-400" />}
              label="Other Schedule Events"
              count={countOtherEvents(parsed.weeklySchedule)}
              enabled={include.events}
              onToggle={() => toggle("events")}
              items={DAYS.flatMap(d =>
                (parsed.weeklySchedule[d]?.otherEvents ?? []).map(e => `${DAY_LABEL(d)}: ${e.title} @ ${e.time}`)
              )}
              testId="events"
            />

            {/* 9. Grocery List */}
            <CatRow
              icon={<ShoppingCart className="w-4 h-4 text-teal-400" />}
              label="Grocery List"
              count={countGrocery(parsed.groceryList)}
              enabled={include.grocery}
              onToggle={() => toggle("grocery")}
              items={[
                ...( parsed.groceryList?.protein ?? []).map(i => `Protein: ${i}`),
                ...( parsed.groceryList?.carbs   ?? []).map(i => `Carbs: ${i}`),
                ...( parsed.groceryList?.produce ?? []).map(i => `Produce: ${i}`),
                ...( parsed.groceryList?.extras  ?? []).map(i => `Other: ${i}`),
              ]}
              testId="grocery"
            />

            {/* 10. Meal Prep */}
            <CatRow
              icon={<ChefHat className="w-4 h-4 text-yellow-400" />}
              label="Meal Prep"
              count={parsed.mealPrepItems?.length ?? 0}
              enabled={include.mealPrep}
              onToggle={() => toggle("mealPrep")}
              items={parsed.mealPrepItems ?? []}
              testId="meal-prep"
            />

            {/* Nothing found notice */}
            {parsed.goals.length === 0 && parsed.coreRules.length === 0 &&
              !hasSchedule(parsed) && countGrocery(parsed.groceryList) === 0 && (
              <div className="rounded-xl border border-border/40 p-5 text-center space-y-1">
                <p className="text-sm font-medium">Nothing structured found</p>
                <p className="text-xs text-muted-foreground">Try pasting your full life system — it should include things like "YOUR TARGET", "CORE RULES", day headers (MONDAY, TUESDAY…), and "WEEKLY GROCERY SYSTEM".</p>
              </div>
            )}

            {/* Frequency selector — shown when any schedule/meal content enabled */}
            {hasSchedule(parsed) && (include.workouts || include.meals || include.appWork || include.events) && (
              <div className="rounded-xl border border-border/40 p-4 space-y-2 mt-1">
                <p className="text-sm font-medium">How many weeks to schedule?</p>
                <div className="flex gap-2 flex-wrap">
                  {FREQ_OPTS.map(opt => (
                    <button
                      key={opt.value}
                      data-testid={`btn-freq-${opt.value}`}
                      onClick={() => setFrequency(opt.value)}
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        frequency === opt.value
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border/60 text-muted-foreground"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {parseError && (
              <p className="text-sm text-destructive pt-1" data-testid="text-apply-error">{parseError}</p>
            )}

            <div className="flex gap-2 pt-2 pb-4">
              <Button
                variant="outline"
                onClick={() => { setStep("paste"); setParseError(""); }}
                data-testid="btn-back-paste"
              >
                Back
              </Button>
              <Button
                className="flex-1"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
                data-testid="btn-import"
              >
                {applyMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
                  : "Import into DW"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ────────────────────────────────────────────────── */}
        {step === "done" && applyResult && (
          <div className="p-6 flex flex-col items-center gap-5 text-center">
            <CheckCircle2 className="w-16 h-16 text-green-500 mt-4" />
            <div>
              <h2 className="text-xl font-semibold mb-1">All done!</h2>
              <p className="text-sm text-muted-foreground">Your life system is now in DW.</p>
            </div>

            <div className="w-full rounded-xl border border-border/40 divide-y divide-border/40 text-sm">
              {Object.entries(applyResult).map(([key, count]) =>
                (count as number) > 0 ? (
                  <div key={key} className="flex items-center justify-between px-4 py-3">
                    <span className="capitalize text-foreground/80">{key.replace(/([A-Z])/g, " $1")}</span>
                    <span className="font-semibold text-primary">{count as number} added</span>
                  </div>
                ) : null
              )}
            </div>

            <Button className="w-full" size="lg" onClick={() => navigate("/")} data-testid="btn-done">
              Go to Command Center
            </Button>

            <button
              className="text-sm text-muted-foreground underline"
              onClick={() => { setStep("paste"); setText(""); setParsed(null); setApplyResult(null); setParseError(""); }}
              data-testid="btn-import-another"
            >
              Import another document
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Category row ──────────────────────────────────────────────────────────────
function CatRow({
  icon, label, count, enabled, onToggle, items, testId,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  enabled: boolean;
  onToggle: () => void;
  items: string[];
  testId: string;
}) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="shrink-0">{icon}</div>
        <button
          className="flex-1 flex items-center gap-2 text-left min-w-0"
          onClick={() => setExpanded(e => !e)}
          data-testid={`btn-expand-${testId}`}
        >
          <span className="text-sm font-medium truncate">{label}</span>
          <span className="text-xs text-muted-foreground shrink-0">({count})</span>
          <span className="text-xs text-muted-foreground ml-auto shrink-0">{expanded ? "▲" : "▼"}</span>
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          data-testid={`switch-${testId}`}
        />
      </div>

      {expanded && (
        <div className="border-t border-border/30 px-4 py-2 space-y-0.5 bg-muted/20 max-h-48 overflow-y-auto">
          {items.slice(0, 50).map((item, i) => (
            <p key={i} className={`text-xs py-0.5 ${item.startsWith("  •") ? "text-muted-foreground pl-2" : "text-foreground/80"}`}>
              {item.startsWith("  •") ? item : `• ${item}`}
            </p>
          ))}
          {items.length > 50 && (
            <p className="text-xs text-muted-foreground pt-1">…and {items.length - 50} more</p>
          )}
        </div>
      )}
    </div>
  );
}
