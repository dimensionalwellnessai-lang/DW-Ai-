import type {
  OnboardingIntent,
  OnboardingLifeAreaId,
  OnboardingReasonId,
  PriorityAssignment,
} from "@shared/onboardingPrioritization";
import type { HomeSummary } from "./types";

export type AdaptiveMode = "reset" | "maintain" | "assistant";
export type AdaptiveLane = "stabilize" | "understand" | "plan" | "expand" | "execute";

export interface DashboardContext {
  intents?: OnboardingIntent[];
  selectedReasons?: OnboardingReasonId[];
  priorityAssignments?: PriorityAssignment[];
  directionLine?: string | null;
}

export interface AdaptiveCard {
  id: string;
  title: string;
  description: string;
  path: string;
  lane: AdaptiveLane;
  score: number;
}

export interface DashboardAdaptiveState {
  mode: AdaptiveMode;
  whereIStand: {
    title: string;
    body: string;
    pulse: "steady" | "watch" | "recover";
  };
  whatToDoNow: AdaptiveCard;
  whyItMatters: string;
  realign: {
    quickPath: string;
    resetPath: string;
  };
  calendar: {
    type: "upcoming_prep" | "focus_window" | "overload_recovery" | "no_calendar";
    title: string;
    body: string;
    path: string;
  };
  lanes: Array<{
    lane: AdaptiveLane;
    label: string;
    cards: AdaptiveCard[];
  }>;
  telemetry: {
    topLane: AdaptiveLane;
    cardCount: number;
    calendarState: "connected" | "none" | "overloaded";
  };
}

const LANE_LABELS: Record<AdaptiveLane, string> = {
  stabilize: "Stabilize",
  understand: "Understand",
  plan: "Plan",
  expand: "Expand",
  execute: "Execute",
};

const MODE_LANE_PRIORITY: Record<AdaptiveMode, AdaptiveLane[]> = {
  reset: ["stabilize", "understand", "plan", "execute", "expand"],
  maintain: ["execute", "plan", "understand", "expand", "stabilize"],
  assistant: ["plan", "execute", "stabilize", "understand", "expand"],
};

const BASE_LANE_SCORES: Record<AdaptiveMode, Record<AdaptiveLane, number>> = {
  reset: { stabilize: 60, understand: 46, plan: 34, execute: 22, expand: 12 },
  maintain: { stabilize: 24, understand: 34, plan: 46, expand: 36, execute: 52 },
  assistant: { stabilize: 34, understand: 30, plan: 62, expand: 20, execute: 50 },
};

const LANE_CARD_LIMIT: Record<AdaptiveMode, number> = {
  reset: 2,
  maintain: 3,
  assistant: 3,
};

const AREA_LANE_BONUS: Record<OnboardingLifeAreaId, AdaptiveLane> = {
  rest: "stabilize",
  mental: "stabilize",
  environment: "stabilize",
  spiritual: "understand",
  identity: "understand",
  career: "plan",
  financial: "plan",
  relationships: "expand",
  creativity: "expand",
  learning: "expand",
  fun: "expand",
  physical: "execute",
};

function toMs(value: string | undefined): number | null {
  if (!value) return null;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : null;
}

function formatTime(value: string | number | Date): string {
  const dt = new Date(value);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

function hasOverloadedScheduleSignals(summary: HomeSummary): boolean {
  return summary.todayEvents.length >= 6 || summary.todayScheduleBlocks.length >= 7;
}

function hasOverwhelmedSignals(summary: HomeSummary, context: DashboardContext): boolean {
  const intentSet = new Set(context.intents ?? []);
  const reasonIds = new Set(context.selectedReasons ?? []);
  return Boolean(
    intentSet.has("reset") ||
    reasonIds.has("overwhelmed") ||
    reasonIds.has("stuck") ||
    reasonIds.has("reset_routines") ||
    summary.energyLevel !== null && summary.energyLevel <= 4 ||
    summary.moodLevel !== null && summary.moodLevel <= 4 ||
    summary.momentumData?.status === "red",
  );
}

function hasAssistantCentricSignals(summary: HomeSummary, context: DashboardContext): boolean {
  const intentSet = new Set(context.intents ?? []);
  const reasonSet = new Set(context.selectedReasons ?? []);
  return Boolean(
    intentSet.has("assistant_support") ||
    reasonSet.has("support_decisions") ||
    summary.todayEvents.length >= 5 ||
    summary.todayScheduleBlocks.length >= 6,
  );
}

export function deriveAdaptiveMode(summary: HomeSummary, context: DashboardContext): AdaptiveMode {
  if (hasOverwhelmedSignals(summary, context) || hasOverloadedScheduleSignals(summary)) return "reset";
  if (hasAssistantCentricSignals(summary, context)) return "assistant";
  return "maintain";
}

function normalizeTimedItems(summary: HomeSummary) {
  const deduped = new Map<string, { title: string; startTime: string; start: number; end: number | null }>();
  const items = [...summary.todayEvents, ...summary.todayScheduleBlocks]
    .map((item) => ({
      title: item.title,
      startTime: item.startTime,
      start: toMs(item.startTime),
      end: toMs(item.endTime),
    }))
    .filter((item): item is { title: string; startTime: string; start: number; end: number | null } => item.start !== null);

  for (const item of items) {
    const key = `${item.title.trim().toLowerCase()}|${item.start}|${item.end ?? ""}`;
    if (!deduped.has(key)) {
      deduped.set(key, item);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => left.start - right.start);
}

function buildCalendarSuggestion(summary: HomeSummary): DashboardAdaptiveState["calendar"] {
  const now = Date.now();
  const timedItems = normalizeTimedItems(summary);
  const hasCalendarData = summary.todayEvents.length > 0 || summary.todayScheduleBlocks.length > 0;
  const overloaded = hasOverloadedScheduleSignals(summary);

  if (!hasCalendarData) {
    return {
      type: "no_calendar",
      title: "No calendar context yet",
      body: "Connect or map your day to unlock prep prompts and focus windows.",
      path: "/calendar",
    };
  }

  if (overloaded) {
    return {
      type: "overload_recovery",
      title: "Schedule pressure is high",
      body: "Protect one recovery pocket so the day stays sustainable.",
      path: "/recovery",
    };
  }

  const upcoming = timedItems.find((entry) => entry.start > now && entry.start - now <= 2 * 60 * 60 * 1000);
  if (upcoming) {
    return {
      type: "upcoming_prep",
      title: `Prep for ${upcoming.title}`,
      body: `Starts at ${formatTime(upcoming.startTime)}. A 5-minute reset now will help.`,
      path: "/calendar?view=day",
    };
  }

  for (let i = 0; i < timedItems.length - 1; i += 1) {
    const currentEnd = timedItems[i].end ?? (timedItems[i].start + 60 * 60 * 1000);
    const nextStart = timedItems[i + 1].start;
    const windowStart = Math.max(currentEnd, now);
    const gapMinutes = (nextStart - windowStart) / (1000 * 60);
    if (gapMinutes >= 45 && nextStart > windowStart) {
      return {
        type: "focus_window",
        title: "Focus window available",
        body: `${Math.round(gapMinutes)} free minutes around ${formatTime(new Date(windowStart).toISOString())}.`,
        path: "/calendar?view=day",
      };
    }
  }

  return {
    type: "focus_window",
    title: "Use your next open block",
    body: "Pick one action for the next available window.",
    path: "/daily-schedule",
  };
}

function stableSortCards(cards: AdaptiveCard[]): AdaptiveCard[] {
  return [...cards].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score;
    return left.id.localeCompare(right.id);
  });
}

export function buildDashboardAdaptiveState(summary: HomeSummary, context: DashboardContext): DashboardAdaptiveState {
  const mode = deriveAdaptiveMode(summary, context);
  const calendarSuggestion = buildCalendarSuggestion(summary);
  const assignments = context.priorityAssignments ?? [];
  const protectAreas = assignments.filter((assignment) => assignment.bucket === "protect").map((assignment) => assignment.areaId);
  const growthAreas = assignments.filter((assignment) => assignment.bucket === "active_growth").map((assignment) => assignment.areaId);
  const momentumGreen = summary.momentumData?.status === "green";
  const lowEnergy = (summary.energyLevel ?? 6) <= 4 || (summary.moodLevel ?? 6) <= 4;
  const overloaded = calendarSuggestion.type === "overload_recovery";
  const hasActiveHabits = summary.activeHabits.length > 0;

  const candidateCards: Array<Omit<AdaptiveCard, "score"> & { tags?: string[] }> = [
    { id: "recover-reset", title: "Run a 2-minute reset", description: "Calm your nervous system before adding more tasks.", path: "/recovery", lane: "stabilize", tags: ["rest", "mental", "environment"] },
    { id: "mood-checkin", title: "Log how you feel", description: "A quick check-in helps DW adapt guidance automatically.", path: "/tracking", lane: "stabilize", tags: ["mental"] },
    { id: "talk-reflect", title: "Talk to DW", description: "Name what's heavy and choose one next move.", path: "/talk?prefill=I+need+help+realigning+today", lane: "understand", tags: ["identity", "mental"] },
    { id: "insight-review", title: "Review your insights", description: "Spot patterns before making the next decision.", path: "/insights", lane: "understand", tags: ["learning", "identity"] },
    { id: "calendar-plan", title: "Shape today's calendar", description: "Convert your priorities into real time blocks.", path: "/calendar?view=day", lane: "plan", tags: ["career", "financial"] },
    { id: "task-triage", title: "Triage tasks", description: "Keep only what matters for today in focus.", path: "/tasks", lane: "plan", tags: ["career", "identity"] },
    { id: "feed-expand", title: "Explore with intention", description: "Use Explore for ideas that support your current goals.", path: "/feed", lane: "expand", tags: ["learning", "creativity", "fun"] },
    { id: "relationship-touch", title: "Nurture one relationship", description: "A small message can strengthen your support system.", path: "/relationships", lane: "expand", tags: ["relationships"] },
    {
      id: "habit-execute",
      title: hasActiveHabits ? "Complete one habit" : "Create one habit",
      description: hasActiveHabits
        ? "Small execution keeps momentum alive."
        : "Start one repeatable action so today's momentum has somewhere to land.",
      path: "/habits",
      lane: "execute",
      tags: ["physical", "identity"],
    },
    { id: "workout-execute", title: "Start your workout block", description: "Use the next 20–40 minutes for body momentum.", path: "/workout", lane: "execute", tags: ["physical"] },
  ];

  const rankedCards = stableSortCards(candidateCards.map((card) => {
    let score = BASE_LANE_SCORES[mode][card.lane];
    if (lowEnergy && card.lane === "stabilize") score += 22;
    if (momentumGreen && (card.lane === "expand" || card.lane === "execute")) score += 14;
    if (overloaded && card.lane === "stabilize") score += 20;
    if (mode === "assistant" && (card.path.includes("/calendar") || card.path.includes("/tasks") || card.path.includes("/daily"))) {
      score += 18;
    }
    for (const area of protectAreas) {
      if (card.tags?.includes(area)) score += 12;
      if (AREA_LANE_BONUS[area] === card.lane) score += 8;
    }
    for (const area of growthAreas) {
      if (card.tags?.includes(area)) score += 8;
      if (AREA_LANE_BONUS[area] === card.lane) score += 4;
    }
    return { ...card, score };
  }));

  const byLane = new Map<AdaptiveLane, AdaptiveCard[]>(
    (Object.keys(LANE_LABELS) as AdaptiveLane[]).map((lane) => [lane, []]),
  );
  for (const card of rankedCards) {
    const laneCards = byLane.get(card.lane);
    if (laneCards) laneCards.push(card);
  }

  const lanes = MODE_LANE_PRIORITY[mode].map((lane) => ({
    lane,
    label: LANE_LABELS[lane],
    cards: (byLane.get(lane) ?? []).slice(0, LANE_CARD_LIMIT[mode]),
  })).filter((lane) => lane.cards.length > 0);

  const topCard = rankedCards[0] ?? { ...candidateCards[0], score: BASE_LANE_SCORES[mode][candidateCards[0].lane] };
  const topLane = topCard.lane;
  const protectLabel = protectAreas[0]?.replaceAll("_", " ");
  const modeLine =
    mode === "reset"
      ? "Your signals say simplify and recover first."
      : mode === "assistant"
        ? "Your schedule is driving decisions, so logistics comes first."
        : "You have momentum — keep progressing with focused execution.";
  const whereIStand = {
    title: mode === "reset" ? "Reset Mode" : mode === "assistant" ? "Assistant-Led Mode" : "Momentum Mode",
    body: modeLine,
    pulse: mode === "reset" ? "recover" : mode === "assistant" ? "watch" : "steady",
  } as const;

  const whyBits = [
    protectLabel ? `Protecting ${protectLabel}` : null,
    context.directionLine ? `Aligned with your direction: "${context.directionLine}"` : null,
    calendarSuggestion.type === "no_calendar"
      ? "Calendar context is unavailable, so guidance stays lightweight."
      : calendarSuggestion.type === "overload_recovery"
        ? "Schedule load is high, so recovery is prioritized."
        : "Calendar timing is shaping the recommendation.",
  ].filter(Boolean) as string[];

  const calendarState: DashboardAdaptiveState["telemetry"]["calendarState"] =
    calendarSuggestion.type === "no_calendar"
      ? "none"
      : calendarSuggestion.type === "overload_recovery"
        ? "overloaded"
        : "connected";

  return {
    mode,
    whereIStand,
    whatToDoNow: topCard,
    whyItMatters: whyBits.join(" "),
    realign: {
      quickPath: "/voice-onboarding?review=1",
      resetPath: "/voice-onboarding?refresh=1",
    },
    calendar: calendarSuggestion,
    lanes,
    telemetry: {
      topLane,
      cardCount: lanes.reduce((count, lane) => count + lane.cards.length, 0),
      calendarState,
    },
  };
}
