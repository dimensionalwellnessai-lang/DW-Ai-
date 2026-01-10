import { 
  saveCalendarEvent, 
  saveOnboardingLog,
  saveRoutine,
  getProfileSetup,
  type CalendarEvent,
  type OnboardingLog,
  type SavedRoutine,
  type FocusArea,
} from "./guest-storage";

const TONIGHT_PLAN_KEY_PREFIX = "fts:tonightPlanCreated:";
const WEEKLY_SKELETON_KEY_PREFIX = "fts:weeklySkeletonCreated:";
const WEEKLY_SIMPLE_KEY_PREFIX = "fts:weeklySimpleCreated:";
const NEXT_STEP_CREATED_KEY_PREFIX = "fts:nextStepCreated:";
const HIGHLIGHT_NEXT_KEY = "fts:highlightNext";

function getTodayKey(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getISOWeekKey(): string {
  const d = new Date();
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

export interface CreatedObject {
  id: string;
  type: "calendar_event" | "log" | "routine";
  routeToView: string;
}

export function ensureOnce<T>(key: string, fn: () => T): { created: boolean; result: T | null; existingId: string | null } {
  const existing = localStorage.getItem(key);
  if (existing) {
    return { created: false, result: null, existingId: existing };
  }
  const result = fn();
  return { created: true, result, existingId: null };
}

function getBlockTitleForFocus(focusArea: FocusArea | null | undefined, defaultTitle: string): string {
  if (!focusArea) return defaultTitle;
  const focusTitles: Record<FocusArea, string> = {
    work: "Weekly Focus Block",
    body: "Strength Session",
    food: "Meal Prep / Plan",
    mind: "Reset + Reflection",
    spirit: "Reset + Reflection",
    money: "Money Check",
  };
  return focusTitles[focusArea] || defaultTitle;
}

export function createTonightPlanBlock(): CreatedObject | null {
  const todayKey = getTodayKey();
  const storageKey = `${TONIGHT_PLAN_KEY_PREFIX}${todayKey}`;
  
  const existingId = localStorage.getItem(storageKey);
  if (existingId) {
    return { id: existingId, type: "calendar_event", routeToView: "/plans" };
  }
  
  const now = new Date();
  let startTime: Date;
  
  if (now.getHours() < 20) {
    startTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 19, 30, 0);
  } else {
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    startTime = new Date(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 19, 30, 0);
  }
  
  const endTime = new Date(startTime.getTime() + 30 * 60 * 1000);
  
  const event = saveCalendarEvent({
    title: "Tonight Plan (30 min)",
    description: "5 min settle → 20 min focus → 5 min pause",
    dimension: null,
    startTime: startTime.getTime(),
    endTime: endTime.getTime(),
    isAllDay: false,
    location: null,
    virtualLink: null,
    reminders: [],
    recurring: false,
    recurrencePattern: null,
    relatedFoundationIds: [],
    tags: ["momentum", "tonight"],
  });
  
  localStorage.setItem(storageKey, event.id);
  
  return { id: event.id, type: "calendar_event", routeToView: "/plans" };
}

export function getTonightPlanCreatedId(): string | null {
  const todayKey = getTodayKey();
  return localStorage.getItem(`${TONIGHT_PLAN_KEY_PREFIX}${todayKey}`);
}

export function createWeeklySkeleton(simple: boolean = false): CreatedObject | null {
  const weekKey = getISOWeekKey();
  const storageKey = simple 
    ? `${WEEKLY_SIMPLE_KEY_PREFIX}${weekKey}`
    : `${WEEKLY_SKELETON_KEY_PREFIX}${weekKey}`;
  
  const existingId = localStorage.getItem(storageKey);
  if (existingId) {
    return { id: existingId, type: "calendar_event", routeToView: "/plans" };
  }
  
  const profile = getProfileSetup();
  const focusArea = profile?.focusArea;
  const blockTitle = getBlockTitleForFocus(focusArea, "Weekly Anchor");
  
  const today = new Date();
  const currentDayOfWeek = today.getDay();
  const currentHour = today.getHours();
  
  const targetDays = simple ? [1] : [1, 3, 5];
  const eventIds: string[] = [];
  
  for (const targetDay of targetDays) {
    let daysUntilTarget = targetDay - currentDayOfWeek;
    if (daysUntilTarget < 0 || (daysUntilTarget === 0 && currentHour >= 9)) {
      daysUntilTarget += 7;
    }
    
    const eventDate = new Date(today);
    eventDate.setDate(today.getDate() + daysUntilTarget);
    eventDate.setHours(9, 0, 0, 0);
    
    const endTime = new Date(eventDate.getTime() + 30 * 60 * 1000);
    
    const event = saveCalendarEvent({
      title: blockTitle,
      description: "Protect this time. Small wins stack.",
      dimension: null,
      startTime: eventDate.getTime(),
      endTime: endTime.getTime(),
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: ["momentum", "weekly", "anchor"],
    });
    
    eventIds.push(event.id);
  }
  
  localStorage.setItem(storageKey, eventIds[0]);
  
  return { id: eventIds[0], type: "calendar_event", routeToView: "/plans" };
}

export function getWeeklySkeletonCreatedId(simple: boolean = false): string | null {
  const weekKey = getISOWeekKey();
  const storageKey = simple 
    ? `${WEEKLY_SIMPLE_KEY_PREFIX}${weekKey}`
    : `${WEEKLY_SKELETON_KEY_PREFIX}${weekKey}`;
  return localStorage.getItem(storageKey);
}

export type NextStepRule = "plan" | "reset" | "priority";

export function createNextBestStepObject(rule: NextStepRule): CreatedObject | null {
  const todayKey = getTodayKey();
  const storageKey = `${NEXT_STEP_CREATED_KEY_PREFIX}${todayKey}`;
  
  const existingId = localStorage.getItem(storageKey);
  if (existingId) {
    const routeMap: Record<NextStepRule, string> = {
      plan: "/plans",
      reset: "/journal",
      priority: "/plans",
    };
    return { id: existingId, type: rule === "reset" ? "log" : "calendar_event", routeToView: routeMap[rule] };
  }
  
  let createdObject: CreatedObject;
  
  switch (rule) {
    case "plan": {
      const now = new Date();
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(9, 0, 0, 0);
      
      const endTime = new Date(tomorrow.getTime() + 30 * 60 * 1000);
      
      const event = saveCalendarEvent({
        title: "Focus Block",
        description: "30 minutes of protected time for what matters.",
        dimension: null,
        startTime: tomorrow.getTime(),
        endTime: endTime.getTime(),
        isAllDay: false,
        location: null,
        virtualLink: null,
        reminders: [],
        recurring: false,
        recurrencePattern: null,
        relatedFoundationIds: [],
        tags: ["work", "productivity", "momentum"],
      });
      
      localStorage.setItem(storageKey, event.id);
      createdObject = { id: event.id, type: "calendar_event", routeToView: "/plans" };
      break;
    }
    
    case "reset": {
      const log = saveOnboardingLog({
        type: "grounding_practice",
        title: "2-Minute Reset",
        content: "One breath. One unclench. One step.",
        actionStep: "Take a breath and notice one thing you can let go of.",
        energyStates: ["calm"],
        backgroundContext: ["momentum"],
        dimensionTags: ["mind", "emotional"],
      });
      
      localStorage.setItem(storageKey, log.id);
      createdObject = { id: log.id, type: "log", routeToView: "/journal" };
      break;
    }
    
    case "priority": {
      const routine = saveRoutine({
        type: "meditation",
        title: "Today: 1 priority",
        description: "Name it. Keep it small. Finish it.",
        data: { dueDate: getTodayKey() },
        tags: ["productivity", "momentum"],
        dimensionSignals: ["occupational"],
      });
      
      localStorage.setItem(storageKey, routine.id);
      createdObject = { id: routine.id, type: "routine", routeToView: "/plans" };
      break;
    }
  }
  
  return createdObject;
}

export function getNextStepCreatedId(): string | null {
  const todayKey = getTodayKey();
  return localStorage.getItem(`${NEXT_STEP_CREATED_KEY_PREFIX}${todayKey}`);
}

export function setHighlightNext(id: string, type: "calendar_event" | "log" | "routine", route: string): void {
  localStorage.setItem(HIGHLIGHT_NEXT_KEY, JSON.stringify({ id, type, route, setAt: Date.now() }));
}

export function consumeHighlightNext(expectedRoute: string): { id: string; type: "calendar_event" | "log" | "routine" } | null {
  const raw = localStorage.getItem(HIGHLIGHT_NEXT_KEY);
  if (!raw) return null;
  
  try {
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.setAt > 30000) {
      localStorage.removeItem(HIGHLIGHT_NEXT_KEY);
      return null;
    }
    if (parsed.route !== expectedRoute) {
      return null;
    }
    localStorage.removeItem(HIGHLIGHT_NEXT_KEY);
    return { id: parsed.id, type: parsed.type };
  } catch {
    localStorage.removeItem(HIGHLIGHT_NEXT_KEY);
    return null;
  }
}
