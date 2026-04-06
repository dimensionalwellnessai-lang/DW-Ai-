import { openai } from "./openai";

export interface ParsedLifeSystem {
  goals: ParsedGoal[];
  coreRules: ParsedCoreRule[];
  morningRoutine: ParsedRoutine | null;
  windDownRoutine: ParsedRoutine | null;
  weeklySchedule: Record<string, ParsedDaySchedule>;
  groceryList: ParsedGroceryList;
  mealPrepItems: string[];
  rawTitle: string;
}

export interface ParsedGoal {
  title: string;
  description: string;
  wellnessDimension: string;
}

export interface ParsedCoreRule {
  text: string;
  wellnessDimension: string;
  context: string;
}

export interface ParsedMacros {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface ParsedRoutine {
  name: string;
  steps: Array<{ title: string; duration: string; time?: string }>;
}

export interface ParsedDaySchedule {
  meals: {
    breakfast: string[];
    breakfastMacros?: ParsedMacros;
    lunch: string[];
    lunchMacros?: ParsedMacros;
    dinner: string[];
    dinnerMacros?: ParsedMacros;
    snack: string[];
    snackMacros?: ParsedMacros;
  };
  workout: {
    title: string;
    time: string;
    exercises: Array<{ name: string; sets: string; reps: string; notes: string }>;
  } | null;
  appWork: {
    title: string;
    time: string;
    durationMinutes: number;
    tasks: string[];
  } | null;
  otherEvents: Array<{
    title: string;
    time: string;
    endTime: string;
    steps: string[];
    notes: string;
    dimension?: string;
  }>;
}

export interface ParsedGroceryList {
  protein: string[];
  carbs: string[];
  produce: string[];
  extras: string[];
}

export async function parseLifeSystemText(text: string): Promise<ParsedLifeSystem> {
  const systemPrompt = `You are a life system parser. Extract structured data from a life system / daily schedule document.

Return ONLY valid JSON matching this exact structure (no markdown, no explanation):
{
  "rawTitle": "title of the life system if present",
  "goals": [
    { "title": "short goal title", "description": "detail", "wellnessDimension": "physical|emotional|financial|social|spiritual|intellectual|environmental|purpose" }
  ],
  "coreRules": [
    {
      "text": "rule text exactly as written",
      "wellnessDimension": "physical|emotional|financial|social|spiritual|intellectual|environmental|purpose",
      "context": "one sentence explaining which part of life this rule governs and why it matters"
    }
  ],
  "morningRoutine": {
    "name": "Morning Routine",
    "steps": [{ "title": "step name", "duration": "10 min", "time": "6:05 AM" }]
  },
  "windDownRoutine": {
    "name": "Wind Down",
    "steps": [{ "title": "step name", "duration": "10 min", "time": "" }]
  },
  "weeklySchedule": {
    "monday": {
      "meals": {
        "breakfast": ["4 eggs with paprika", "2 slices toast", "1 banana"],
        "breakfastMacros": { "calories": 480, "protein": 30, "carbs": 55, "fat": 15 },
        "lunch": ["7 oz chicken", "1 cup rice", "broccoli"],
        "lunchMacros": { "calories": 520, "protein": 50, "carbs": 45, "fat": 8 },
        "dinner": ["ground turkey with taco seasoning", "roasted potatoes", "mixed veggies"],
        "dinnerMacros": { "calories": 540, "protein": 45, "carbs": 40, "fat": 16 },
        "snack": ["Greek yogurt", "honey"],
        "snackMacros": { "calories": 150, "protein": 12, "carbs": 18, "fat": 3 }
      },
      "workout": {
        "title": "Upper Push — Bands",
        "time": "18:00",
        "exercises": [
          { "name": "Band Chest Press", "sets": "4", "reps": "12", "notes": "anchor at chest height" },
          { "name": "Pushups", "sets": "4", "reps": "10-15", "notes": "" }
        ]
      },
      "appWork": {
        "title": "System Review",
        "time": "19:45",
        "durationMinutes": 45,
        "tasks": ["go screen by screen", "write down bugs", "note awkward flows"]
      },
      "otherEvents": [
        { "title": "Clean Reset Routine", "time": "17:30", "endTime": "17:45", "steps": ["wash dishes or load dishes", "take out trash if full", "wipe counters", "pick up anything left out"], "notes": "dishes, trash, quick pickup, wipe counter", "dimension": "environmental" },
        { "title": "Wake Up Reset", "time": "06:00", "endTime": "06:05", "steps": ["get out of bed immediately", "drink water", "do not open phone", "open blinds or turn on light"], "notes": "drink water, no phone", "dimension": "physical" }
      ]
    },
    "tuesday": {},
    "wednesday": {},
    "thursday": {},
    "friday": {},
    "saturday": {},
    "sunday": {}
  },
  "groceryList": {
    "protein": ["2-3 lbs chicken", "1-2 lbs ground turkey", "2 salmon portions", "12 eggs", "Greek yogurt", "protein powder"],
    "carbs": ["rice", "potatoes", "oats", "bread"],
    "produce": ["broccoli", "mixed veggies", "bananas", "fruit"],
    "extras": ["honey", "soy sauce", "garlic powder", "onion powder", "paprika", "taco seasoning"]
  },
  "mealPrepItems": ["chicken (3-4 meals, seasoned)", "ground turkey (2-3 meals)", "4 cups cooked rice", "roasted potatoes", "broccoli or mixed veggies"]
}

CRITICAL RULES:
- For coreRules: assign each rule a wellnessDimension. physical=body/fitness/food, intellectual=app/work/learning, environmental=home/clean, emotional=stress/mind, financial=money, social=people, spiritual=meditation/faith.
- For macros: estimate realistic macros for every meal based on the specific food items and amounts listed. Use actual nutrition knowledge — do not guess randomly.
- For exercises: capture every exercise listed including warm-up and finisher movements. Always include sets and reps exactly as written.
- GROCERY LIST: Look for a section titled "WEEKLY GROCERY SYSTEM", "Buy", or "Grocery". Extract every single item listed under Protein, Carbs, Produce, and any other category. These are NOT meal items — they are shopping items to buy weekly. Put condiments/seasonings/extras in "extras". Put fruit/vegetables in "produce".
- mealPrepItems: Only put FOOD PREP instructions here (cook chicken, prep rice, etc.). Do NOT put app work tasks or weekly planning tasks here.
- If a day has no workout, set workout to null.
- If a day has no app work block, set appWork to null.
- Keep exact food items for each meal — list every item separately in the array.
- For EVERY otherEvent, assign a "dimension" field: physical (wake up, water, shower, grooming, walk, movement, meal prep), environmental (clean reset, laundry, dishes, trash), spiritual (meditation, breathwork, reflection, spiritual learning), financial (money block, finances), intellectual (app work, planning, study), social (going out, social time, friends). Never leave dimension empty.
- For EVERY otherEvent, extract ALL bullet points and action items into the "steps" array as individual strings — exactly as written in the document. If a routine has 4 bullet points, steps should have 4 items. Never leave steps empty; if no bullets are listed, include at least one step summarizing the block.
- otherEvents should include ALL non-workout, non-meal, non-appWork events: wake up, meditation, activation, shower, grooming, clean reset, walk, money block, spiritual learning, grocery run, deep clean, social blocks, etc.`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.1,
    response_format: { type: "json_object" },
  }, { timeout: 55_000 });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as ParsedLifeSystem;

  if (!parsed.weeklySchedule) parsed.weeklySchedule = {};
  if (!parsed.goals) parsed.goals = [];
  if (!parsed.coreRules) parsed.coreRules = [];
  if (!parsed.groceryList) parsed.groceryList = { protein: [], carbs: [], produce: [], extras: [] };
  if (!parsed.mealPrepItems) parsed.mealPrepItems = [];

  // Back-compat: if coreRules came back as plain strings, convert them
  parsed.coreRules = (parsed.coreRules as any[]).map((r) => {
    if (typeof r === "string") {
      return { text: r, wellnessDimension: "purpose", context: r };
    }
    return r;
  });

  return parsed;
}

export function getScheduleDates(
  frequency: "weekly" | "biweekly" | "every3weeks" | "monthly",
  startDate: Date
): Date[] {
  const dates: Date[] = [];
  const weeks =
    frequency === "weekly" ? 1 :
    frequency === "biweekly" ? 2 :
    frequency === "every3weeks" ? 3 : 4;

  for (let w = 0; w < weeks; w++) {
    dates.push(new Date(startDate.getTime() + w * 7 * 24 * 60 * 60 * 1000));
  }
  return dates;
}

export function getDayDate(weekStart: Date, dayName: string): Date {
  const dayMap: Record<string, number> = {
    monday: 0, tuesday: 1, wednesday: 2, thursday: 3,
    friday: 4, saturday: 5, sunday: 6,
  };
  const offset = dayMap[dayName.toLowerCase()] ?? 0;
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset);
  return d;
}

export function formatDateStr(date: Date, timeStr: string): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}T${timeStr || "00:00"}:00`;
}

export function getWeekMondayStart(referenceDate: Date): Date {
  const d = new Date(referenceDate);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}
