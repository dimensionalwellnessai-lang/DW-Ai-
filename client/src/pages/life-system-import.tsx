import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ArrowLeft, CheckCircle2, Loader2, Target, Repeat2, CalendarDays, UtensilsCrossed, ShoppingCart, Sunrise, Moon } from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────────
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
const FREQ_OPTS: { value: Frequency; label: string }[] = [
  { value: "weekly",      label: "1 week"  },
  { value: "biweekly",   label: "2 weeks" },
  { value: "every3weeks", label: "3 weeks" },
  { value: "monthly",    label: "4 weeks" },
];

function countMeals(schedule: Record<string, ParsedDay>): number {
  let n = 0;
  for (const d of DAYS) {
    const m = schedule[d]?.meals;
    if (!m) continue;
    if (m.breakfast?.length) n++;
    if (m.lunch?.length) n++;
    if (m.dinner?.length) n++;
    if (m.snack?.length) n++;
  }
  return n;
}

function countScheduleEvents(schedule: Record<string, ParsedDay>): number {
  let n = 0;
  for (const d of DAYS) {
    const day = schedule[d];
    if (!day) continue;
    if (day.workout?.title) n++;
    if (day.appWork?.title) n++;
    n += day.otherEvents?.length ?? 0;
  }
  return n;
}

function countGrocery(g: ParsedData["groceryList"]): number {
  return (g?.protein?.length ?? 0) + (g?.carbs?.length ?? 0) + (g?.produce?.length ?? 0) + (g?.extras?.length ?? 0);
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function DWSmartImportPage() {
  const [, navigate] = useLocation();
  const [step, setStep] = useState<Step>("paste");
  const [text, setText] = useState(() => {
    try { const pre = sessionStorage.getItem("dw_ls_prepaste"); if (pre) { sessionStorage.removeItem("dw_ls_prepaste"); return pre; } } catch { /* ignore */ }
    return "";
  });
  const [parsed, setParsed] = useState<ParsedData | null>(null);
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [include, setInclude] = useState({
    goals: true, habits: true, schedule: true,
    meals: true, grocery: true,
    morningRoutine: true, windDown: true,
  });
  const [applyResult, setApplyResult] = useState<Record<string, number> | null>(null);
  const [parseError, setParseError] = useState("");

  // ── Parse mutation ─────────────────────────────────────────────────────────
  const parseMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/life-system/import/parse", { text });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setParsed(data.parsed);
      setParseError("");
      setStep("review");
    },
    onError: (err: any) => {
      setParseError(err.message || "Could not read your document. Please try again.");
    },
  });

  // ── Apply mutation ─────────────────────────────────────────────────────────
  const applyMutation = useMutation({
    mutationFn: async () => {
      if (!parsed) throw new Error("No parsed data");

      // Filter parsed data based on toggles before sending
      const filtered: ParsedData = {
        ...parsed,
        goals:           include.goals   ? parsed.goals           : [],
        coreRules:       include.habits  ? parsed.coreRules        : [],
        morningRoutine:  include.morningRoutine ? parsed.morningRoutine : null,
        windDownRoutine: include.windDown       ? parsed.windDownRoutine : null,
        groceryList:     include.grocery ? parsed.groceryList : { protein: [], carbs: [], produce: [], extras: [] },
        mealPrepItems:   include.grocery ? parsed.mealPrepItems : [],
        weeklySchedule:  {} as Record<string, ParsedDay>,
      };

      // Build filtered schedule
      for (const day of DAYS) {
        const d = parsed.weeklySchedule?.[day];
        if (!d) { filtered.weeklySchedule[day] = { meals: { breakfast: [], lunch: [], dinner: [], snack: [] }, workout: null, appWork: null, otherEvents: [] }; continue; }
        filtered.weeklySchedule[day] = {
          meals: include.meals ? d.meals : { breakfast: [], lunch: [], dinner: [], snack: [] },
          workout:     include.schedule ? d.workout     : null,
          appWork:     include.schedule ? d.appWork     : null,
          otherEvents: include.schedule ? d.otherEvents : [],
        };
      }

      const res = await apiRequest("POST", "/api/life-system/import/apply", {
        parsed: filtered,
        scheduleFrequency: frequency,
        startDate: new Date().toISOString().slice(0, 10),
        conflictResolutions: {},
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `Error ${res.status}`);
      }
      return res.json();
    },
    onSuccess: (data) => {
      setApplyResult(data.results);
      setStep("done");
    },
    onError: (err: any) => {
      setParseError(err.message || "Failed to import. Please try again.");
    },
  });

  const toggle = (key: keyof typeof include) =>
    setInclude(prev => ({ ...prev, [key]: !prev[key] }));

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col min-h-full bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe-top pt-4 pb-3 border-b border-border/40">
        <button onClick={() => navigate("/")} className="p-1 -ml-1 text-muted-foreground" data-testid="btn-back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-base font-semibold">DW Smart Import</h1>
          {step === "paste" && <p className="text-xs text-muted-foreground">Paste any document and DW reads it</p>}
          {step === "review" && <p className="text-xs text-muted-foreground">Choose what to bring in</p>}
          {step === "done" && <p className="text-xs text-muted-foreground">All done</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">

        {/* ── STEP 1: PASTE ─────────────────────────────────────────────── */}
        {step === "paste" && (
          <div className="p-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Paste your life system, meal plan, weekly schedule, grocery list, journal entry, or anything else. DW will read it and pull out the important parts.
            </p>

            <Textarea
              data-testid="textarea-import"
              placeholder="Paste your document here…"
              value={text}
              onChange={e => { setText(e.target.value); setParseError(""); }}
              rows={14}
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
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reading…</>
                : "Read My Document"}
            </Button>
          </div>
        )}

        {/* ── STEP 2: REVIEW ─────────────────────────────────────────────── */}
        {step === "review" && parsed && (
          <div className="p-4 space-y-3">
            {parsed.rawTitle && (
              <p className="text-sm font-medium text-foreground/70 truncate">{parsed.rawTitle}</p>
            )}

            {/* Category rows */}
            <CategoryRow
              icon={<Target className="w-4 h-4 text-violet-400" />}
              label="Goals"
              count={parsed.goals.length}
              enabled={include.goals}
              onToggle={() => toggle("goals")}
              items={parsed.goals.map(g => g.title)}
            />

            <CategoryRow
              icon={<Repeat2 className="w-4 h-4 text-blue-400" />}
              label="Daily Habits"
              count={parsed.coreRules.length}
              enabled={include.habits}
              onToggle={() => toggle("habits")}
              items={parsed.coreRules}
            />

            {parsed.morningRoutine?.steps?.length ? (
              <CategoryRow
                icon={<Sunrise className="w-4 h-4 text-amber-400" />}
                label="Morning Routine"
                count={parsed.morningRoutine.steps.length}
                enabled={include.morningRoutine}
                onToggle={() => toggle("morningRoutine")}
                items={parsed.morningRoutine.steps.map(s => s.title)}
              />
            ) : null}

            {parsed.windDownRoutine?.steps?.length ? (
              <CategoryRow
                icon={<Moon className="w-4 h-4 text-indigo-400" />}
                label="Wind Down Routine"
                count={parsed.windDownRoutine.steps.length}
                enabled={include.windDown}
                onToggle={() => toggle("windDown")}
                items={parsed.windDownRoutine.steps.map(s => s.title)}
              />
            ) : null}

            {countScheduleEvents(parsed.weeklySchedule) > 0 && (
              <CategoryRow
                icon={<CalendarDays className="w-4 h-4 text-green-400" />}
                label="Schedule Events"
                count={countScheduleEvents(parsed.weeklySchedule)}
                enabled={include.schedule}
                onToggle={() => toggle("schedule")}
                items={DAYS.flatMap(d => {
                  const day = parsed.weeklySchedule[d];
                  if (!day) return [];
                  const items: string[] = [];
                  if (day.workout?.title) items.push(`${d[0].toUpperCase()}${d.slice(1)}: ${day.workout.title}`);
                  if (day.appWork?.title) items.push(`${d[0].toUpperCase()}${d.slice(1)}: ${day.appWork.title}`);
                  return items;
                })}
              />
            )}

            {countMeals(parsed.weeklySchedule) > 0 && (
              <CategoryRow
                icon={<UtensilsCrossed className="w-4 h-4 text-orange-400" />}
                label="Meal Plan"
                count={countMeals(parsed.weeklySchedule)}
                enabled={include.meals}
                onToggle={() => toggle("meals")}
                items={DAYS.flatMap(d => {
                  const m = parsed.weeklySchedule[d]?.meals;
                  if (!m) return [];
                  const items: string[] = [];
                  if (m.breakfast?.length) items.push(`${d[0].toUpperCase()}${d.slice(1)} Breakfast: ${m.breakfast[0]}`);
                  if (m.lunch?.length) items.push(`${d[0].toUpperCase()}${d.slice(1)} Lunch: ${m.lunch[0]}`);
                  if (m.dinner?.length) items.push(`${d[0].toUpperCase()}${d.slice(1)} Dinner: ${m.dinner[0]}`);
                  return items;
                })}
              />
            )}

            {countGrocery(parsed.groceryList) > 0 && (
              <CategoryRow
                icon={<ShoppingCart className="w-4 h-4 text-teal-400" />}
                label="Grocery List"
                count={countGrocery(parsed.groceryList)}
                enabled={include.grocery}
                onToggle={() => toggle("grocery")}
                items={[
                  ...parsed.groceryList.protein.map(i => `Protein: ${i}`),
                  ...parsed.groceryList.carbs.map(i => `Carbs: ${i}`),
                  ...parsed.groceryList.produce.map(i => `Produce: ${i}`),
                  ...parsed.groceryList.extras.map(i => `Other: ${i}`),
                ]}
              />
            )}

            {/* Nothing found notice */}
            {parsed.goals.length === 0 && parsed.coreRules.length === 0 &&
              countScheduleEvents(parsed.weeklySchedule) === 0 &&
              countMeals(parsed.weeklySchedule) === 0 &&
              countGrocery(parsed.groceryList) === 0 && (
              <div className="rounded-xl border border-border/40 p-4 text-center text-sm text-muted-foreground">
                DW couldn't find any structured data to import. Try pasting a document with goals, a weekly schedule, or a grocery list.
              </div>
            )}

            {/* Frequency selector — only shown if schedule or meals exist */}
            {(countScheduleEvents(parsed.weeklySchedule) > 0 || countMeals(parsed.weeklySchedule) > 0) &&
              (include.schedule || include.meals) && (
              <div className="rounded-xl border border-border/40 p-4 space-y-2">
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
              <p className="text-sm text-destructive" data-testid="text-apply-error">{parseError}</p>
            )}

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => { setStep("paste"); setParseError(""); }}
                data-testid="btn-back-paste"
              >
                Back
              </Button>
              <Button
                className="flex-2 flex-1"
                disabled={applyMutation.isPending}
                onClick={() => applyMutation.mutate()}
                data-testid="btn-import"
              >
                {applyMutation.isPending
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing…</>
                  : "Import into DW"}
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 3: DONE ──────────────────────────────────────────────── */}
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
function CategoryRow({
  icon, label, count, enabled, onToggle, items,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  enabled: boolean;
  onToggle: () => void;
  items: string[];
}) {
  const [expanded, setExpanded] = useState(false);
  if (count === 0) return null;

  return (
    <div className="rounded-xl border border-border/40 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        {icon}
        <button
          className="flex-1 flex items-center gap-2 text-left"
          onClick={() => setExpanded(e => !e)}
          data-testid={`btn-expand-${label.toLowerCase().replace(/\s/g, "-")}`}
        >
          <span className="text-sm font-medium">{label}</span>
          <span className="text-xs text-muted-foreground">({count})</span>
          <span className="text-xs text-muted-foreground ml-auto">{expanded ? "▲" : "▼"}</span>
        </button>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          data-testid={`switch-${label.toLowerCase().replace(/\s/g, "-")}`}
        />
      </div>
      {expanded && (
        <div className="border-t border-border/30 px-4 py-2 space-y-1 bg-muted/20">
          {items.slice(0, 20).map((item, i) => (
            <p key={i} className="text-xs text-muted-foreground py-0.5">• {item}</p>
          ))}
          {items.length > 20 && (
            <p className="text-xs text-muted-foreground pt-1">…and {items.length - 20} more</p>
          )}
        </div>
      )}
    </div>
  );
}
