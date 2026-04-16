import type { Request, Response, NextFunction } from "express";
import { storage } from "../storage";

declare module "express-session" {
  interface SessionData {
    userId?: string;
    oauthState?: string;
  }
}

export const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

export const requireAdmin = async (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  try {
    const user = await storage.getUser(req.session.userId);
    if (!user || user.role !== "admin") {
      return res.status(403).json({ error: "Not authorized" });
    }
    next();
  } catch {
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
};

// Helper function to calculate search relevance score
export function calculateRelevance(
  title: string | null | undefined,
  description: string | null | undefined,
  searchTerm: string,
): number {
  let score = 0;
  const lowerSearch = searchTerm.toLowerCase();
  const titleLower = (title || "").toLowerCase();
  const descLower = (description || "").toLowerCase();

  if (titleLower === lowerSearch) score += 100;
  else if (titleLower.startsWith(lowerSearch)) score += 50;
  else if (titleLower.includes(lowerSearch)) score += 25;

  if (descLower.includes(lowerSearch)) score += 10;

  const searchWords = lowerSearch.split(/\s+/);
  searchWords.forEach((word) => {
    if (word.length > 2) {
      if (titleLower.includes(word)) score += 5;
      if (descLower.includes(word)) score += 2;
    }
  });

  return score;
}

// Infer wellness dimension from event title for "other" calendar events
export function inferDimensionFromTitle(title: string): string {
  const t = title.toLowerCase();
  if (/wake|sleep|water|shower|hygiene|dressed|hair|wrap|groom|breathe|stretch|mobility|activation|pushup|squat|plank|walk|hike|movement/.test(t)) return "physical";
  if (/meditat|spiritual|reflect|pray|journal|learning|study/.test(t)) return "spiritual";
  if (/clean|reset|laundry|dishes|trash|pickup|wipe|bathroom|floor|bedding|kitchen|tidy/.test(t)) return "environmental";
  if (/money|finance|account|debt|savings|budget|spending|pay|transport/.test(t)) return "financial";
  if (/app|plan|review|task|work|build|fix|test|code|dev|deploy/.test(t)) return "intellectual";
  if (/social|friend|date|out|explore|park|museum|dinner|lunch|restaurant/.test(t)) return "social";
  if (/meal prep|cook|prep/.test(t)) return "physical";
  return "environmental";
}

// Mood detection thresholds
export const MOOD_THRESHOLDS = {
  HIGH_STRESS: 70,
  LOW_STRESS: 30,
  CALM_HEART_RATE: 70,
  ENERGETIC_HEART_RATE: 90,
  MODERATE_STRESS_MIN: 30,
  MODERATE_STRESS_MAX: 60,
  MODERATE_HR_MIN: 70,
  MODERATE_HR_MAX: 90,
  GOOD_HRV: 70,
  MODERATE_STRESS_THRESHOLD: 50,
};

export function detectMoodFromBiometrics(
  heartRate: number,
  stressLevel: number,
  hrvScore?: number | null,
): string {
  if (stressLevel > MOOD_THRESHOLDS.HIGH_STRESS) return "stressed";
  if (stressLevel < MOOD_THRESHOLDS.LOW_STRESS && heartRate < MOOD_THRESHOLDS.CALM_HEART_RATE) return "calm";
  if (heartRate > MOOD_THRESHOLDS.ENERGETIC_HEART_RATE && stressLevel < MOOD_THRESHOLDS.MODERATE_STRESS_THRESHOLD) return "energetic";
  if (hrvScore && hrvScore > MOOD_THRESHOLDS.GOOD_HRV) return "relaxed";
  if (
    heartRate >= MOOD_THRESHOLDS.MODERATE_HR_MIN &&
    heartRate <= MOOD_THRESHOLDS.MODERATE_HR_MAX &&
    stressLevel >= MOOD_THRESHOLDS.MODERATE_STRESS_MIN &&
    stressLevel <= MOOD_THRESHOLDS.MODERATE_STRESS_MAX
  ) {
    return "focused";
  }
  return "neutral";
}

export function calculateEndTime(startTime: string, durationMinutes: number): string {
  const [hours, minutes] = startTime.split(":").map(Number);
  const totalMinutes = hours * 60 + minutes + durationMinutes;
  const endHours = Math.floor(totalMinutes / 60) % 24;
  const endMinutes = totalMinutes % 60;
  return `${endHours.toString().padStart(2, "0")}:${endMinutes.toString().padStart(2, "0")}`;
}

export function categorizeIngredient(ingredient: string): string {
  const lower = ingredient.toLowerCase();

  const categories: { [key: string]: string[] } = {
    produce: ["lettuce", "tomato", "onion", "garlic", "pepper", "carrot", "celery", "spinach", "kale", "broccoli", "cucumber", "avocado", "lemon", "lime", "apple", "banana", "orange", "berries", "potato", "sweet potato"],
    protein: ["chicken", "beef", "pork", "turkey", "fish", "salmon", "tuna", "shrimp", "tofu", "tempeh", "eggs", "egg"],
    dairy: ["milk", "cheese", "yogurt", "butter", "cream", "sour cream"],
    grains: ["rice", "pasta", "bread", "quinoa", "oats", "flour", "tortilla", "noodles"],
    pantry: ["oil", "vinegar", "soy sauce", "honey", "maple", "sugar", "salt", "pepper", "spice", "sauce", "broth", "stock", "beans", "lentils", "chickpeas"],
    frozen: ["frozen", "ice cream"],
    beverages: ["juice", "coffee", "tea", "water", "soda", "wine", "beer"],
  };

  for (const [category, keywords] of Object.entries(categories)) {
    if (keywords.some((keyword) => lower.includes(keyword))) {
      return category;
    }
  }

  return "other";
}
export interface ExtractedCategoryData {
  category: string;
  title: string;
  content?: string;
  date?: string;
  metadata?: Record<string, unknown>;
}

export interface ExtractedSyncItem {
  itemType: "event" | "goal" | "habit" | "task";
  title: string;
  description?: string;
  startTime?: Date;
  endTime?: Date;
  recurrencePattern?: string;
  recurrenceGroupKey?: string;
  dimensionTags?: string[];
  rawExtraction?: string;
}

export function extractSyncableItems(userMessage: string, aiResponse: string): ExtractedSyncItem[] {
  const items: ExtractedSyncItem[] = [];
  const combined = `${userMessage} ${aiResponse}`;
  const lowerCombined = combined.toLowerCase();
  
  const hasRecurringIntent = 
    /every\s+(day|week|month|morning|evening|night)/i.test(combined) ||
    /every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(combined) ||
    /\b(daily|weekly|monthly|weekdays|weekends)\b/i.test(combined) ||
    /every\s+other\s+(day|week)/i.test(combined);
  
  const hasScheduleIntent = 
    /(?:schedule|add|create|set\s+up|plan|remind)\s+/i.test(combined);
  
  if (hasScheduleIntent && hasRecurringIntent) {
    let eventTitle = "";
    let recurrencePattern = "";
    
    const titleMatch = combined.match(/(?:schedule|add|create|set\s+up|plan|remind)\s+(?:me\s+to\s+)?(?:a\s+)?(?:recurring\s+)?([^,\.]+?)(?:\s+every|\s+daily|\s+weekly|\s+on\s+)/i);
    if (titleMatch && titleMatch[1]) {
      eventTitle = titleMatch[1].trim();
    }
    
    if (!eventTitle) {
      const simpleMatch = combined.match(/(?:schedule|add|create)\s+([a-zA-Z\s]+?)(?:\s+at\s+|\s+for\s+|\s+every\s+)/i);
      if (simpleMatch && simpleMatch[1]) {
        eventTitle = simpleMatch[1].trim();
      }
    }
    
    if (/every\s+day|daily|every\s+morning|every\s+evening|every\s+night/i.test(combined)) {
      recurrencePattern = "Daily";
    } else if (/weekdays|every\s+weekday|monday\s+through\s+friday/i.test(combined)) {
      recurrencePattern = "Weekdays";
    } else if (/weekends|every\s+weekend/i.test(combined)) {
      recurrencePattern = "Weekends";
    } else if (/every\s+other\s+day/i.test(combined)) {
      recurrencePattern = "Every other day";
    } else if (/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i.test(combined)) {
      const dayMatch = combined.match(/every\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)/i);
      if (dayMatch) {
        recurrencePattern = `Weekly on ${dayMatch[1].charAt(0).toUpperCase() + dayMatch[1].slice(1).toLowerCase()}`;
      }
    } else if (/every\s+week|weekly/i.test(combined)) {
      recurrencePattern = "Weekly";
    } else if (/every\s+month|monthly/i.test(combined)) {
      recurrencePattern = "Monthly";
    }
    
    let timeDescription = "";
    const timeMatch = combined.match(/(?:at\s+)?(\d{1,2})(?::(\d{2}))?\s*(am|pm)/i);
    if (timeMatch) {
      const hour = parseInt(timeMatch[1]);
      const minute = timeMatch[2] || "00";
      const ampm = timeMatch[3].toLowerCase();
      timeDescription = `${hour}:${minute} ${ampm}`;
    } else if (/\bmorning\b/i.test(lowerCombined)) {
      timeDescription = "morning";
    } else if (/\bevening\b/i.test(lowerCombined)) {
      timeDescription = "evening";
    } else if (/\bnight\b/i.test(lowerCombined)) {
      timeDescription = "night";
    }
    
    if (eventTitle && recurrencePattern) {
      eventTitle = eventTitle.replace(/^(a|an|the|my)\s+/i, "").trim();
      
      if (eventTitle.length < 3 || eventTitle.length > 100) {
        return items;
      }
      
      const groupKey = `recurring-${eventTitle.toLowerCase().replace(/\s+/g, "-").slice(0, 30)}-${Date.now()}`;
      
      items.push({
        itemType: "event",
        title: eventTitle.slice(0, 100),
        description: timeDescription 
          ? `${recurrencePattern} at ${timeDescription}` 
          : recurrencePattern,
        recurrencePattern: timeDescription 
          ? `${recurrencePattern} at ${timeDescription}` 
          : recurrencePattern,
        recurrenceGroupKey: groupKey,
        rawExtraction: userMessage.slice(0, 300),
      });
    }
  }
  
  return items;
}

export function extractCategoryData(userMessage: string, aiResponse: string, context?: string): ExtractedCategoryData[] {
  const results: ExtractedCategoryData[] = [];
  const combined = `${userMessage} ${aiResponse}`.toLowerCase();
  
  const calendarPatterns = [
    /(?:schedule|plan|appointment|meeting|event)\s+(?:for|on|at)?\s*([a-zA-Z]+day|\d{1,2}(?:\/|-)\d{1,2})/gi,
    /(?:tomorrow|today|next\s+week|this\s+week)/gi,
  ];
  
  const mealPatterns = [
    /(?:breakfast|lunch|dinner|meal|recipe|cook|eat)\s+([^.!?]+)/gi,
    /(?:meal\s+prep|food\s+plan)/gi,
  ];
  
  const goalPatterns = [
    /(?:goal|want\s+to|aim\s+to|plan\s+to)\s+([^.!?]+)/gi,
    /(?:achieve|accomplish|complete)\s+([^.!?]+)/gi,
  ];
  
  const financialPatterns = [
    /(?:budget|save|spend|money|invest|payment|expense)\s+([^.!?]+)/gi,
    /\$\d+/gi,
  ];
  
  const diaryPatterns = [
    /(?:feeling|felt|i\s+feel|today\s+i|journal)\s+([^.!?]+)/gi,
  ];
  
  if (context === "calendar" || calendarPatterns.some(p => p.test(combined))) {
    const eventMatch = userMessage.match(/(?:schedule|plan|add|create|set)\s+(?:a\s+)?([^.!?]+)/i);
    if (eventMatch) {
      results.push({
        category: "calendar",
        title: eventMatch[1].trim().slice(0, 100),
        content: userMessage,
        date: new Date().toISOString().split('T')[0],
      });
    }
  }
  
  if (context === "meals" || mealPatterns.some(p => p.test(combined))) {
    const mealMatch = userMessage.match(/(?:make|cook|prepare|eat|try)\s+([^.!?]+)/i);
    if (mealMatch) {
      results.push({
        category: "meals",
        title: mealMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "goals" || goalPatterns.some(p => p.test(combined))) {
    const goalMatch = userMessage.match(/(?:goal|want\s+to|plan\s+to)\s+([^.!?]+)/i);
    if (goalMatch) {
      results.push({
        category: "goals",
        title: goalMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "financial" || financialPatterns.some(p => p.test(combined))) {
    const finMatch = userMessage.match(/(?:budget|save|spend)\s+([^.!?]+)/i);
    if (finMatch) {
      results.push({
        category: "financial",
        title: finMatch[1].trim().slice(0, 100),
        content: aiResponse,
      });
    }
  }
  
  if (context === "diary" || diaryPatterns.some(p => p.test(combined))) {
    results.push({
      category: "diary",
      title: `Entry - ${new Date().toLocaleDateString()}`,
      content: userMessage,
      date: new Date().toISOString().split('T')[0],
    });
  }
  
  if (context && results.length === 0 && userMessage.length > 20) {
    results.push({
      category: context,
      title: userMessage.slice(0, 50) + (userMessage.length > 50 ? "..." : ""),
      content: aiResponse,
      date: new Date().toISOString().split('T')[0],
    });
  }
  
  return results;
}

// ── DW Intelligence: pipeline thresholds ─────────────────────────────────────
/** Minimum number of messages in a conversation to trigger the DW pipeline. */
export const DW_MIN_MESSAGES = 4; // at least 2 user+assistant exchanges
/** Minimum total character count across all messages to trigger the pipeline. */
export const DW_MIN_TOTAL_CHARS = 200;
/** Maximum messages allowed in a single /api/dw/processConversation request. */
export const DW_MAX_CONVERSATION_MESSAGES = 100;
/** Maximum characters per individual message. */
export const DW_MAX_MESSAGE_CONTENT_LENGTH = 100_000;
/** Maximum total characters across all messages in a single request. */
export const DW_MAX_TOTAL_CONTENT_LENGTH = 100_000;

/**
 * Server-controlled system prompt overrides keyed by chat `context` value.
 * Clients send a context name (e.g. "voice-onboarding"); the server resolves
 * the actual prompt text, preventing arbitrary prompt injection from clients.
 */
export const CONTEXT_SYSTEM_OVERRIDES: Record<string, string> = {
  "voice-onboarding":
    "You are DW, a warm and grounding AI wellness companion.\n" +
    "You are meeting this person for the first time during voice onboarding.\n\n" +
    "Your role in this conversation:\n" +
    "- Introduce yourself briefly and warmly\n" +
    "- Learn what dimension of wellness matters most to them right now (physical, emotional, mental, financial, spiritual, occupational)\n" +
    "- Ask one thoughtful question at a time\n" +
    "- Help them feel heard and welcome\n" +
    "- Keep responses concise (2–4 sentences) and calm\n" +
    "- Avoid overwhelming them with information\n\n" +
    "Start by welcoming them and asking a single open question about how they're doing or what brought them here today.",
};

import crypto from "crypto";
export function makeIcalToken(userId: string): string {
  const payload = Buffer.from(userId).toString("base64url");
  const sig = crypto
    .createHmac("sha256", process.env.SESSION_SECRET || "dw-ical-secret")
    .update(payload)
    .digest("base64url")
    .slice(0, 24);
  return `${payload}.${sig}`;
}

export function verifyIcalToken(token: string): string | null {
  try {
    const [payload, sig] = token.split(".");
    if (!payload || !sig) return null;
    const expected = crypto
      .createHmac("sha256", process.env.SESSION_SECRET || "dw-ical-secret")
      .update(payload)
      .digest("base64url")
      .slice(0, 24);
    if (sig !== expected) return null;
    return Buffer.from(payload, "base64url").toString("utf8");
  } catch {
    return null;
  }
}

// ── Shared route helpers (extracted from inline definitions) ────────────────
import { z } from "zod";

export const dwMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(8000),
});

export const dwProcessSchema = z.object({
  messages: z.array(dwMessageSchema).min(1).max(200),
  conversationId: z.string().max(200).optional(),
});

export const elevationPlanAddToCalendarSchema = z.object({
  planDayIndex: z.number().int().min(1).max(7),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  planTitle: z.string().max(200).optional(),
});

export const elevationPlanAddToTasksSchema = z.object({
  planDayIndex: z.number().int().min(1).max(7),
  planStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
});

export function resolveActionHour(timeOfDay: string | null | undefined): number {
  if (!timeOfDay) return 9;
  const t = timeOfDay.toLowerCase();
  if (t.includes("morning")) return 8;
  if (t.includes("afternoon")) return 13;
  if (t.includes("evening") || t.includes("night")) return 18;
  const match12 = t.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)/);
  if (match12) {
    let h = parseInt(match12[1], 10);
    if (match12[3] === "pm" && h !== 12) h += 12;
    if (match12[3] === "am" && h === 12) h = 0;
    return h;
  }
  const match24 = t.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) return parseInt(match24[1], 10);
  return 9;
}

export function addCalendarDays(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d + days);
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function buildActionEventTimes(
  planStartDate: string,
  dayIndex: number,
  timeOfDay: string | null | undefined,
  durationMinutes: number | null | undefined
): { startTime: string; endTime: string } {
  const dateStr = addCalendarDays(planStartDate, dayIndex - 1);
  const hour = resolveActionHour(timeOfDay);
  const dur = durationMinutes ?? 30;
  const startMinutes = hour * 60;
  const endMinutes = startMinutes + dur;
  const endHour = Math.floor(endMinutes / 60) % 24;
  const endMin = endMinutes % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  const startTime = `${dateStr}T${pad(hour)}:00:00`;
  const endTime = `${addCalendarDays(planStartDate, dayIndex - 1 + (endMinutes >= 1440 ? 1 : 0))}T${pad(endHour)}:${pad(endMin)}:00`;
  return { startTime, endTime };
}

export function actionTypeToEventType(actionType: string): string {
  const map: Record<string, string> = {
    workout: "workout",
    nutrition: "meal",
    habit: "routine",
    reflection: "routine",
    schedule: "event",
  };
  return map[actionType] ?? "event";
}

export function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

import type { Habit as _Habit, Goal as _Goal, MoodLog as _MoodLog } from "@shared/schema";

export function computeMomentumStatus(
  habits: _Habit[],
  goals: _Goal[],
  recentMoods: _MoodLog[],
  hasPriorMoodLogs: boolean,
  learningProfile?: { preferredActionTypes?: string[]; frictionPoints?: string[]; wins?: string[] },
): { momentumStatus: "green" | "yellow" | "red"; reasons: string[]; suggestedFocus?: string } {
  const negativeSignals: string[] = [];
  const activeHabits = habits.filter((h) => h.isActive !== false);
  const activeGoals = goals.filter((g) => g.isActive !== false);
  if (activeHabits.length === 0 && activeGoals.length === 0) {
    return {
      momentumStatus: "red",
      reasons: ["No habits or goals are active yet"],
      suggestedFocus: "Start with one habit or goal to get things in motion",
    };
  }
  if (activeHabits.length > 0) {
    const maxStreak = activeHabits.reduce((max, h) => Math.max(max, h.streak ?? 0), 0);
    if (maxStreak === 0) {
      negativeSignals.push("Habits are set up but consistency has stalled");
    }
  }
  if (activeGoals.length > 0) {
    const allStuck = activeGoals.every((g) => {
      return typeof g.progress !== "number" || g.progress === 0;
    });
    if (allStuck) {
      negativeSignals.push("Goals are active but haven't moved yet");
    }
  }
  if (recentMoods.length === 0 && hasPriorMoodLogs) {
    negativeSignals.push("No energy check-ins in the last 7 days");
  }
  if (recentMoods.length > 0) {
    const avgMood = recentMoods.reduce((sum, m) => sum + m.moodLevel, 0) / recentMoods.length;
    if (avgMood <= 3) {
      negativeSignals.push("Energy has been lower than usual recently");
    }
  }
  const reasons = negativeSignals.slice(0, 2);
  let momentumStatus: "green" | "yellow" | "red";
  let suggestedFocus: string | undefined;
  if (negativeSignals.length >= 2) {
    momentumStatus = "red";
    const topActionType = learningProfile?.preferredActionTypes?.[0];
    suggestedFocus = topActionType
      ? `One small ${topActionType} action today can restart your momentum`
      : "One small action today can restart your momentum";
  } else if (negativeSignals.length === 1) {
    momentumStatus = "yellow";
    const knownFriction = learningProfile?.frictionPoints?.[0];
    suggestedFocus = knownFriction
      ? `You're close — even with ${knownFriction} challenges, one consistent action can shift things`
      : "You're close — one consistent action can shift things";
  } else {
    momentumStatus = "green";
    const recentWin = learningProfile?.wins?.[0];
    suggestedFocus = recentWin
      ? `Keep building on what worked (like "${recentWin}")`
      : "Keep building on what's working";
  }
  return { momentumStatus, reasons, suggestedFocus };
}
