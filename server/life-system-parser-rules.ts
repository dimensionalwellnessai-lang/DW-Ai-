/**
 * Rule-based life system parser.
 * Extracts structured data from life system documents without requiring AI.
 * Handles the canonical format: day headers, time-tagged events, meal sections,
 * workout blocks, grocery lists, goal targets, and core rules.
 */

const DAY_NAMES = ["monday","tuesday","wednesday","thursday","friday","saturday","sunday"];

function parseTo24h(time: string, period: string): string {
  const [hStr, mStr] = time.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const p = period.toUpperCase();
  if (p === "PM" && h !== 12) h += 12;
  if (p === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

// Matches: "6:00–6:45 PM workout" or "6:00 PM workout" (em dash, en dash, or hyphen)
const TIME_LINE_RE = /^(\d{1,2}:\d{2})\s*[–—\-]\s*(\d{1,2}:\d{2})\s*(AM|PM)\s+(.+)/i;
const TIME_LINE_SINGLE_RE = /^(\d{1,2}:\d{2})\s*(AM|PM)\s+(.+)/i;
const BULLET_RE = /^[•·\-\*]\s+(.+)/;
const DAY_HEADER_RE = /^(MONDAY|TUESDAY|WEDNESDAY|THURSDAY|FRIDAY|SATURDAY|SUNDAY)\b/i;

export interface RulesParseResult {
  rawTitle: string;
  detectedTypes: string[];
  goals: Array<{ title: string; description: string; wellnessDimension: string }>;
  coreRules: string[];
  morningRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  windDownRoutine: { name: string; steps: Array<{ title: string; duration: string; time?: string }> } | null;
  weeklySchedule: Record<string, {
    meals: { breakfast: string[]; lunch: string[]; dinner: string[]; snack: string[] };
    workout: { title: string; time: string; exercises: Array<{ name: string; sets?: string; reps?: string; notes?: string }> } | null;
    appWork: { title: string; time: string; durationMinutes: number; tasks: string[] } | null;
    otherEvents: Array<{ title: string; time: string; endTime: string; notes: string }>;
  }>;
  groceryList: { protein: string[]; carbs: string[]; produce: string[]; extras: string[] };
  mealPrepItems: string[];
  journalEntries: any[];
  affirmations: any[];
  readingList: any[];
  financialGoals: any[];
  projectTasks: any[];
  notes: string;
  notesTags: string[];
}

export function parseLifeSystemRuleBased(text: string): RulesParseResult {
  const lines = text.split("\n").map(l => l.replace(/^\t+/, "").trim());
  const textLower = text.toLowerCase();

  // ── Detect content types ──────────────────────────────────────────
  const detectedTypes: string[] = [];
  if (DAY_NAMES.some(d => textLower.includes(d)) && (textLower.includes("workout") || textLower.includes("breakfast")))
    detectedTypes.push("life_system");
  if (textLower.includes("breakfast") || textLower.includes("lunch") || textLower.includes("dinner"))
    detectedTypes.push("meal_plan");
  if (textLower.includes("grocery") || textLower.includes("shopping list"))
    detectedTypes.push("grocery_list");
  if (textLower.includes("workout") || textLower.includes("sets") || textLower.includes("reps"))
    detectedTypes.push("workout_plan");
  if (textLower.includes("goal") || textLower.includes("target"))
    detectedTypes.push("goals");
  if (textLower.includes("financ") || textLower.includes("savings") || textLower.includes("budget"))
    detectedTypes.push("financial_plan");
  if (detectedTypes.length === 0) detectedTypes.push("notes");

  // ── Initialize output ─────────────────────────────────────────────
  const goals: RulesParseResult["goals"] = [];
  const coreRules: string[] = [];
  const groceryList: RulesParseResult["groceryList"] = { protein: [], carbs: [], produce: [], extras: [] };
  const mealPrepItems: string[] = [];
  const weeklySchedule: RulesParseResult["weeklySchedule"] = {};
  for (const d of DAY_NAMES) {
    weeklySchedule[d] = {
      meals: { breakfast: [], lunch: [], dinner: [], snack: [] },
      workout: null,
      appWork: null,
      otherEvents: [],
    };
  }

  // ── State machine ─────────────────────────────────────────────────
  type Zone = "preamble" | "targets" | "coreRules" | "day" | "grocery" | "mealPrep" | "other";
  let zone: Zone = "preamble";
  let currentDay: string | null = null;
  let currentMeal: "breakfast" | "lunch" | "dinner" | "snack" | null = null;
  let currentGroceryCat: keyof RulesParseResult["groceryList"] | null = null;
  let inWorkoutBlock = false;
  let inExerciseList = false;
  let lastEventTitle = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) { currentMeal = null; continue; }

    // ── Day header ────────────────────────────────────────────────
    const dayMatch = line.match(DAY_HEADER_RE);
    if (dayMatch) {
      zone = "day";
      currentDay = dayMatch[1].toLowerCase();
      currentMeal = null;
      inWorkoutBlock = false;
      inExerciseList = false;
      continue;
    }

    // ── Special section headers ───────────────────────────────────
    if (/YOUR TARGET/i.test(line)) { zone = "targets"; currentMeal = null; continue; }
    if (/CORE RULES/i.test(line)) { zone = "coreRules"; currentMeal = null; continue; }
    if (/WEEKLY GROCERY|GROCERY SYSTEM|GROCERY LIST|SHOPPING LIST/i.test(line)) { zone = "grocery"; currentGroceryCat = null; continue; }
    if (/MEAL PREP/i.test(line) && zone !== "day") { zone = "mealPrep"; continue; }
    if (/APP WORK SYSTEM/i.test(line)) { zone = "other"; continue; }
    if (/MONTHLY GROOMING|MONTHLY SHOPPING/i.test(line)) { zone = "other"; continue; }

    // ── Within-day section sub-headers (Morning, Evening, Food, etc.) ─
    if (zone === "day" && /^(Morning|Evening|Food and prep|Food|Day)\s*$/i.test(line)) {
      currentMeal = null;
      inWorkoutBlock = false;
      continue;
    }

    // ── Targets → Goals ───────────────────────────────────────────
    if (zone === "targets") {
      const b = line.match(BULLET_RE);
      if (b) {
        const title = b[1];
        let dim = "purpose";
        if (/lbs|weight|chest|arms|legs|workout|physic|muscle/i.test(title)) dim = "physical";
        else if (/home|clean|environment/i.test(title)) dim = "environmental";
        else if (/money|financ|saving|debt/i.test(title)) dim = "financial";
        else if (/social|friend|connect|life outside/i.test(title)) dim = "social";
        else if (/spiritual|mindful|spirit/i.test(title)) dim = "spiritual";
        else if (/disciplin|focus|app|build|progress/i.test(title)) dim = "purpose";
        goals.push({ title, description: "", wellnessDimension: dim });
      }
      continue;
    }

    // ── Core rules → Habits ───────────────────────────────────────
    if (zone === "coreRules") {
      const b = line.match(BULLET_RE);
      if (b) coreRules.push(b[1]);
      continue;
    }

    // ── Grocery list ──────────────────────────────────────────────
    if (zone === "grocery") {
      // Category headers — flexible detection (may or may not have colon)
      if (/\bprotein\b/i.test(line) && line.length < 30) { currentGroceryCat = "protein"; continue; }
      if (/\bcarb/i.test(line) && line.length < 30) { currentGroceryCat = "carbs"; continue; }
      if (/\bproduce\b|\bveget|\bfruit/i.test(line) && line.length < 30) { currentGroceryCat = "produce"; continue; }
      if (/\bflavor|\bcondiment|\bsauce|\bspice|\bother|\bmisc|\bseasoning|\bdairy|\bfat/i.test(line) && line.length < 30) { currentGroceryCat = "extras"; continue; }
      // Bullet item
      const b = line.match(BULLET_RE);
      if (b) {
        const cat = currentGroceryCat ?? "extras";
        groceryList[cat].push(b[1]);
        continue;
      }
      // Plain text lines that look like items (no category set yet, short lines)
      if (currentGroceryCat && line.length > 1 && line.length < 60 && !line.includes(":")) {
        groceryList[currentGroceryCat].push(line);
      }
      continue;
    }

    // ── Meal prep items ───────────────────────────────────────────
    if (zone === "mealPrep") {
      const b = line.match(BULLET_RE);
      if (b) mealPrepItems.push(b[1]);
      continue;
    }

    // ── Within a day ─────────────────────────────────────────────
    if (zone === "day" && currentDay) {
      const dayData = weeklySchedule[currentDay];

      // Workout exercise bullets
      const bullet = line.match(BULLET_RE);
      if (bullet) {
        const bText = bullet[1];
        if (inWorkoutBlock && dayData.workout) {
          // Try to parse as exercise: "Band chest press — 4x12"
          const exMatch = bText.match(/^(.+?)\s*[—\-]+\s*(\d+)x(\d+)/);
          if (exMatch) {
            dayData.workout.exercises.push({ name: exMatch[1].trim(), sets: exMatch[2], reps: exMatch[3] });
          } else {
            dayData.workout.exercises.push({ name: bText });
          }
        } else if (currentMeal) {
          dayData.meals[currentMeal].push(bText);
        } else if (inExerciseList && dayData.workout) {
          dayData.workout.exercises.push({ name: bText });
        } else if (dayData.appWork) {
          dayData.appWork.tasks.push(bText);
        }
        continue;
      }

      // Warm-up / Main / Finisher sub-headers inside workout
      if (/^(Warm.?up|Main|Finisher|Cool.?down):?$/i.test(line)) {
        inExerciseList = true;
        continue;
      }

      // Time-tagged line (range): "6:00–6:45 PM workout — upper push"
      const timeRange = line.match(TIME_LINE_RE);
      if (timeRange) {
        const [, startT, endT, period, title] = timeRange;
        const startTime = parseTo24h(startT, period);
        const endTime = parseTo24h(endT, period);
        processTimeEvent(dayData, startTime, endTime, title, currentDay);
        currentMeal = detectMealFromTitle(title);
        inWorkoutBlock = /workout|exercise|band/i.test(title) && !dayData.workout;
        if (inWorkoutBlock && !dayData.workout) {
          dayData.workout = { title: title.split(":")[0].trim(), time: startTime, exercises: [] };
          inWorkoutBlock = true;
        } else {
          inWorkoutBlock = false;
        }
        inExerciseList = false;
        if (/app work|system review|bug test|flow test|ui improv/i.test(title)) {
          const durMatch = line.match(/(\d+)\s*min/i);
          dayData.appWork = {
            title: title.trim(),
            time: startTime,
            durationMinutes: durMatch ? parseInt(durMatch[1]) : 45,
            tasks: [],
          };
        }
        lastEventTitle = title;
        continue;
      }

      // Time-tagged line (single): "10:30 PM sleep"
      const timeSingle = line.match(TIME_LINE_SINGLE_RE);
      if (timeSingle) {
        const [, startT, period, title] = timeSingle;
        const startTime = parseTo24h(startT, period);
        const endTime = parseTo24h(startT, period);
        processTimeEvent(dayData, startTime, endTime, title, currentDay);
        currentMeal = detectMealFromTitle(title);
        inWorkoutBlock = false;
        inExerciseList = false;
        lastEventTitle = title;
        continue;
      }

      // Meal headers without times (under Food section)
      if (/^breakfast:?$/i.test(line)) { currentMeal = "breakfast"; inWorkoutBlock = false; continue; }
      if (/^lunch:?$/i.test(line)) { currentMeal = "lunch"; inWorkoutBlock = false; continue; }
      if (/^dinner:?$/i.test(line)) { currentMeal = "dinner"; inWorkoutBlock = false; continue; }
      if (/^snack:?$/i.test(line)) { currentMeal = "snack"; inWorkoutBlock = false; continue; }

      // Grocery sub-section within Sunday meal prep context
      if (/^Cook exactly:/i.test(line)) { zone = "mealPrep"; continue; }
    }
  }

  // ── Extract title ─────────────────────────────────────────────────
  let rawTitle = "";
  const emojiTitle = text.match(/[🔒🎯📋]\s*(.+)/);
  if (emojiTitle) {
    rawTitle = emojiTitle[1].trim();
  } else {
    const firstLine = lines.find(l => l.length > 5 && !/^[•·\-\*]/.test(l));
    rawTitle = firstLine ? firstLine.slice(0, 60).trim() : "My Life System";
  }

  // ── Build morning / wind-down routines from Monday data ──────────
  let morningRoutine: RulesParseResult["morningRoutine"] = null;
  let windDownRoutine: RulesParseResult["windDownRoutine"] = null;

  const mondayEvents = weeklySchedule["monday"]?.otherEvents || [];
  const morningEvents = mondayEvents.filter(e => {
    const h = parseInt(e.time.split(":")[0], 10);
    return h < 10;
  });
  if (morningEvents.length >= 2) {
    morningRoutine = {
      name: "Morning Routine",
      steps: morningEvents.map(e => ({
        title: e.title,
        duration: "10",
        time: e.time,
      })),
    };
  }

  const windDownEvents = mondayEvents.filter(e => {
    const h = parseInt(e.time.split(":")[0], 10);
    return h >= 21;
  });
  if (windDownEvents.length >= 1) {
    windDownRoutine = {
      name: "Wind Down",
      steps: windDownEvents.map(e => ({
        title: e.title,
        duration: "10",
        time: e.time,
      })),
    };
  }

  return {
    rawTitle,
    detectedTypes: [...new Set(detectedTypes)],
    goals,
    coreRules,
    morningRoutine,
    windDownRoutine,
    weeklySchedule,
    groceryList,
    mealPrepItems,
    journalEntries: [],
    affirmations: [],
    readingList: [],
    financialGoals: [],
    projectTasks: [],
    notes: "",
    notesTags: [],
  };
}

function detectMealFromTitle(title: string): "breakfast" | "lunch" | "dinner" | "snack" | null {
  const t = title.toLowerCase();
  if (t.includes("breakfast")) return "breakfast";
  if (t.includes("lunch")) return "lunch";
  if (t.includes("dinner")) return "dinner";
  if (t.includes("snack")) return "snack";
  return null;
}

function processTimeEvent(
  dayData: RulesParseResult["weeklySchedule"][string],
  startTime: string,
  endTime: string,
  title: string,
  _day: string
) {
  const t = title.toLowerCase();

  // Skip pure meal events (handled via currentMeal)
  if (/^(breakfast|lunch|dinner|snack):?\s*$/i.test(title.trim())) return;

  // Workout
  if (/workout|upper push|lower body|upper pull|full.?body circuit|band circuit/i.test(t)) {
    if (!dayData.workout) {
      dayData.workout = {
        title: title.split(":")[0].replace(/^workout\s*[—\-]\s*/i, "").trim() || title,
        time: startTime,
        exercises: [],
      };
    }
    return;
  }

  // App work
  if (/app work|system review|bug test|flow test|ui improv/i.test(t)) {
    if (!dayData.appWork) {
      dayData.appWork = { title: title.trim(), time: startTime, durationMinutes: 45, tasks: [] };
    }
    return;
  }

  // Skip sleep/wake events and meal-time slots from otherEvents (they show up as meals)
  if (/^(sleep|wake up|drink water)$/i.test(title.trim())) return;

  // Add to other events
  dayData.otherEvents.push({ title: title.trim(), time: startTime, endTime, notes: "" });
}
