import { openai } from "./openai";

export interface ParsedLifeSystem {
  goals: ParsedGoal[];
  coreRules: string[];
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

export interface ParsedRoutine {
  name: string;
  steps: Array<{ title: string; duration: string; time?: string }>;
}

export interface ParsedDaySchedule {
  meals: {
    breakfast: string[];
    lunch: string[];
    dinner: string[];
    snack: string[];
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
    notes: string;
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
  "coreRules": ["rule text as-is"],
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
        "breakfast": ["item 1", "item 2"],
        "lunch": ["item 1"],
        "dinner": ["item 1"],
        "snack": ["item 1"]
      },
      "workout": {
        "title": "Push Day — Bands",
        "time": "18:00",
        "exercises": [
          { "name": "Band Chest Press", "sets": "4", "reps": "12", "notes": "anchor behind" }
        ]
      },
      "appWork": {
        "title": "System Review",
        "time": "19:45",
        "durationMinutes": 45,
        "tasks": ["open app", "go screen by screen", "write down what feels off"]
      },
      "otherEvents": [
        { "title": "Clean Reset", "time": "17:30", "endTime": "17:45", "notes": "" }
      ]
    },
    "tuesday": { ... },
    "wednesday": { ... },
    "thursday": { ... },
    "friday": { ... },
    "saturday": { ... },
    "sunday": { ... }
  },
  "groceryList": {
    "protein": ["2-3 lbs chicken"],
    "carbs": ["rice"],
    "produce": ["broccoli"],
    "extras": ["yogurt"]
  },
  "mealPrepItems": ["chicken (seasoned, 3-4 meals)", "rice (4 cups cooked)"]
}

Rules:
- If a day has no workout, set workout to null
- If a day has no app work block, set appWork to null
- If a day has no meal info, use empty arrays for meals
- Keep exercise names exactly as written
- Wellness dimensions: physical (fitness/body/health), emotional (mood/stress/feelings), financial (money/spending), social (community/relationships), spiritual (cosmic/meditation/faith), intellectual (learning/app/work), environmental (home/clean/space), purpose (goals/meaning)
- Goals should map to specific, measurable things mentioned (weight loss, visible muscle, clean space consistently, etc.)
- Core rules are the non-negotiable daily rules (no phone first 30 min, 3 meals + 1 snack, etc.)`;

  const response = await openai.chat.completions.create({
    model: "gpt-4o",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: text },
    ],
    temperature: 0.2,
    response_format: { type: "json_object" },
  });

  const content = response.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(content) as ParsedLifeSystem;

  if (!parsed.weeklySchedule) parsed.weeklySchedule = {};
  if (!parsed.goals) parsed.goals = [];
  if (!parsed.coreRules) parsed.coreRules = [];
  if (!parsed.groceryList) parsed.groceryList = { protein: [], carbs: [], produce: [], extras: [] };
  if (!parsed.mealPrepItems) parsed.mealPrepItems = [];

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
