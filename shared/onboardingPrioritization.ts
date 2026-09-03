const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_MS = 7 * DAY_MS;

export const ONBOARDING_INTENTS = [
  "reset",
  "maintain",
  "assistant_support",
] as const;

export type OnboardingIntent = (typeof ONBOARDING_INTENTS)[number];

export const ONBOARDING_REASON_OPTIONS = [
  { id: "overwhelmed", label: "I feel overwhelmed" },
  { id: "stuck", label: "I feel stuck" },
  { id: "reset_routines", label: "I want a reset" },
  { id: "protect_progress", label: "I want to protect what's working" },
  { id: "clarify_focus", label: "I need clarity on what matters" },
  { id: "support_decisions", label: "I want DW to help me decide" },
] as const;

export type OnboardingReasonId = (typeof ONBOARDING_REASON_OPTIONS)[number]["id"];

export const PRIORITY_BUCKETS = [
  "protect",
  "active_growth",
  "background",
] as const;

export type PriorityBucket = (typeof PRIORITY_BUCKETS)[number];

export const ONBOARDING_LIFE_AREAS = [
  { id: "physical", label: "Physical health" },
  { id: "mental", label: "Mental & emotional" },
  { id: "spiritual", label: "Spiritual" },
  { id: "financial", label: "Money" },
  { id: "relationships", label: "Relationships" },
  { id: "career", label: "Work & career" },
  { id: "learning", label: "Learning" },
  { id: "environment", label: "Environment" },
  { id: "creativity", label: "Creativity" },
  { id: "fun", label: "Fun" },
  { id: "rest", label: "Rest & recovery" },
  { id: "identity", label: "Identity & purpose" },
] as const;

export type OnboardingLifeAreaId = (typeof ONBOARDING_LIFE_AREAS)[number]["id"];

export interface LifeAreaSignal {
  areaId: OnboardingLifeAreaId;
  currentState: number;
  importance: number;
  urgency: boolean;
  energyDrain: boolean;
}

export interface PriorityAssignment {
  areaId: OnboardingLifeAreaId;
  bucket: PriorityBucket;
  score: number;
  why: string;
  recommended: boolean;
}

export interface FocusWindowAdjustment {
  weekIndex: number;
  count: number;
  changedAreaIds: OnboardingLifeAreaId[];
  adjustedAt: string;
}

export interface FocusWindowState {
  startAt: string;
  endAt: string;
  adjustments: FocusWindowAdjustment[];
  overrideCount: number;
  lastAdjustedAt: string | null;
}

export interface OnboardingProfileContext {
  intents: OnboardingIntent[];
  selectedReasons: OnboardingReasonId[];
  reasonFreeText: string | null;
  userLanguageInputs: {
    reasonNarrative: string | null;
    lastUpdatedAt: string;
  };
}

export interface PrioritizationSnapshot {
  mode: "manual" | "choose_for_me";
  formula: string;
  signals: LifeAreaSignal[];
  assignments: PriorityAssignment[];
  focusWindow: FocusWindowState;
  recommendedAt: string;
}

export interface RecommendationResult {
  assignments: PriorityAssignment[];
  formula: string;
}

export interface GuardrailResult {
  allowed: boolean;
  status: "created" | "unchanged" | "adjusted" | "override_required" | "override_applied";
  focusWindow: FocusWindowState;
  changedAreaIds: OnboardingLifeAreaId[];
  message: string;
  requiresOverride: boolean;
}

export const PRIORITIZATION_FORMULA =
  "score = 0.45×importance + 0.35×(11-current state) + 2×urgency + 1.5×energy drain";

const LIFE_AREA_ID_SET = new Set<OnboardingLifeAreaId>(
  ONBOARDING_LIFE_AREAS.map((area) => area.id),
);

const REASON_ID_SET = new Set<OnboardingReasonId>(
  ONBOARDING_REASON_OPTIONS.map((reason) => reason.id),
);

const INTENT_SET = new Set<OnboardingIntent>(ONBOARDING_INTENTS);

const BUCKET_BY_INDEX: PriorityBucket[] = [
  "protect",
  "protect",
  "protect",
  "active_growth",
  "active_growth",
];

function clampScale(value: number): number {
  return Math.max(1, Math.min(10, Math.round(value)));
}

function uniqueBy<T>(items: readonly T[]): T[] {
  return Array.from(new Set(items));
}

function areaLabel(areaId: OnboardingLifeAreaId): string {
  return ONBOARDING_LIFE_AREAS.find((area) => area.id === areaId)?.label ?? areaId;
}

export function sanitizeReasonText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed ? trimmed.slice(0, 280) : null;
}

export function normalizeIntents(value: unknown): OnboardingIntent[] {
  if (!Array.isArray(value)) return [];
  return uniqueBy(
    value.filter((intent): intent is OnboardingIntent => typeof intent === "string" && INTENT_SET.has(intent as OnboardingIntent)),
  );
}

export function normalizeReasonIds(value: unknown): OnboardingReasonId[] {
  if (!Array.isArray(value)) return [];
  return uniqueBy(
    value.filter((reason): reason is OnboardingReasonId => typeof reason === "string" && REASON_ID_SET.has(reason as OnboardingReasonId)),
  );
}

export function buildDefaultSignals(): LifeAreaSignal[] {
  return ONBOARDING_LIFE_AREAS.map((area) => ({
    areaId: area.id,
    currentState: 5,
    importance: 5,
    urgency: false,
    energyDrain: false,
  }));
}

export function normalizeSignals(value: unknown): LifeAreaSignal[] {
  const defaults = buildDefaultSignals();
  if (!Array.isArray(value)) return defaults;

  const byArea = new Map<OnboardingLifeAreaId, LifeAreaSignal>();
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const areaId = (entry as { areaId?: unknown }).areaId;
    if (typeof areaId !== "string" || !LIFE_AREA_ID_SET.has(areaId as OnboardingLifeAreaId)) continue;
    byArea.set(areaId as OnboardingLifeAreaId, {
      areaId: areaId as OnboardingLifeAreaId,
      currentState: clampScale(Number((entry as { currentState?: unknown }).currentState ?? 5)),
      importance: clampScale(Number((entry as { importance?: unknown }).importance ?? 5)),
      urgency: Boolean((entry as { urgency?: unknown }).urgency),
      energyDrain: Boolean((entry as { energyDrain?: unknown }).energyDrain),
    });
  }

  return defaults.map((fallback) => byArea.get(fallback.areaId) ?? fallback);
}

function scoreSignal(signal: LifeAreaSignal): number {
  const importanceComponent = signal.importance * 0.45;
  const instabilityComponent = (11 - signal.currentState) * 0.35;
  const urgencyComponent = signal.urgency ? 2 : 0;
  const drainComponent = signal.energyDrain ? 1.5 : 0;
  return Number((importanceComponent + instabilityComponent + urgencyComponent + drainComponent).toFixed(2));
}

function explanationFor(signal: LifeAreaSignal, score: number): string {
  const urgencyText = signal.urgency ? "Urgency added +2.00." : "No urgency boost.";
  const drainText = signal.energyDrain ? "Energy drain added +1.50." : "No energy-drain boost.";
  return `${areaLabel(signal.areaId)} scored ${score.toFixed(2)} from importance ${signal.importance}/10, current state ${signal.currentState}/10, ${(11 - signal.currentState).toFixed(0)} points of instability, ${urgencyText} ${drainText}`;
}

export function recommendPriorityAssignments(input: unknown): RecommendationResult {
  const signals = normalizeSignals(input);
  const scored = signals
    .map((signal) => {
      const score = scoreSignal(signal);
      return {
        areaId: signal.areaId,
        score,
        why: explanationFor(signal, score),
      };
    })
    .sort((a, b) => b.score - a.score || a.areaId.localeCompare(b.areaId));

  const assignments = scored.map((entry, index) => ({
    areaId: entry.areaId,
    bucket: BUCKET_BY_INDEX[index] ?? "background",
    score: entry.score,
    why: entry.why,
    recommended: true,
  }));

  return {
    assignments,
    formula: PRIORITIZATION_FORMULA,
  };
}

export function normalizeAssignments(
  value: unknown,
  signals: readonly LifeAreaSignal[] = buildDefaultSignals(),
): PriorityAssignment[] {
  const recommendedByArea = new Map(
    recommendPriorityAssignments(signals).assignments.map((assignment) => [assignment.areaId, assignment]),
  );
  const byArea = new Map<OnboardingLifeAreaId, PriorityAssignment>();

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (!entry || typeof entry !== "object") continue;
      const areaId = (entry as { areaId?: unknown }).areaId;
      const bucket = (entry as { bucket?: unknown }).bucket;
      if (
        typeof areaId !== "string" ||
        !LIFE_AREA_ID_SET.has(areaId as OnboardingLifeAreaId) ||
        typeof bucket !== "string" ||
        !PRIORITY_BUCKETS.includes(bucket as PriorityBucket)
      ) {
        continue;
      }
      const fallback = recommendedByArea.get(areaId as OnboardingLifeAreaId);
      byArea.set(areaId as OnboardingLifeAreaId, {
        areaId: areaId as OnboardingLifeAreaId,
        bucket: bucket as PriorityBucket,
        score: Number((entry as { score?: unknown }).score ?? fallback?.score ?? 0),
        why:
          typeof (entry as { why?: unknown }).why === "string" && (entry as { why?: string }).why?.trim()
            ? (entry as { why: string }).why.trim().slice(0, 280)
            : fallback?.why ?? "",
        recommended: Boolean((entry as { recommended?: unknown }).recommended),
      });
    }
  }

  return ONBOARDING_LIFE_AREAS.map((area) => {
    const existing = byArea.get(area.id);
    if (existing) return existing;
    const fallback = recommendedByArea.get(area.id)!;
    return {
      ...fallback,
      bucket: "background",
      recommended: false,
    };
  });
}

export function createFocusWindow(now: Date = new Date()): FocusWindowState {
  return {
    startAt: now.toISOString(),
    endAt: new Date(now.getTime() + 14 * DAY_MS).toISOString(),
    adjustments: [],
    overrideCount: 0,
    lastAdjustedAt: null,
  };
}

export function getChangedAreaIds(
  previousAssignments: readonly PriorityAssignment[] | undefined,
  nextAssignments: readonly PriorityAssignment[],
): OnboardingLifeAreaId[] {
  const previousMap = new Map((previousAssignments ?? []).map((assignment) => [assignment.areaId, assignment.bucket]));
  return nextAssignments
    .filter((assignment) => previousMap.get(assignment.areaId) !== assignment.bucket)
    .map((assignment) => assignment.areaId);
}

export function applyFocusWindowGuardrail(params: {
  existingFocusWindow?: FocusWindowState | null;
  previousAssignments?: readonly PriorityAssignment[];
  nextAssignments: readonly PriorityAssignment[];
  now?: Date;
  override?: boolean;
}): GuardrailResult {
  const now = params.now ?? new Date();
  const baseWindow = params.existingFocusWindow ?? null;

  if (!baseWindow || new Date(baseWindow.endAt).getTime() <= now.getTime()) {
    return {
      allowed: true,
      status: "created",
      focusWindow: createFocusWindow(now),
      changedAreaIds: getChangedAreaIds(params.previousAssignments, params.nextAssignments),
      message: "A new 14-day focus window has been created.",
      requiresOverride: false,
    };
  }

  const changedAreaIds = getChangedAreaIds(params.previousAssignments, params.nextAssignments);
  if (changedAreaIds.length === 0) {
    return {
      allowed: true,
      status: "unchanged",
      focusWindow: baseWindow,
      changedAreaIds,
      message: "Your current focus window stays in place.",
      requiresOverride: false,
    };
  }

  const startAt = new Date(baseWindow.startAt).getTime();
  const weekIndex = Math.floor(Math.max(0, now.getTime() - startAt) / WEEK_MS);
  const existingAdjustment = baseWindow.adjustments.find((entry) => entry.weekIndex === weekIndex);
  const isFullReshuffle = changedAreaIds.length > 1;

  if (!params.override) {
    if (isFullReshuffle) {
      return {
        allowed: false,
        status: "override_required",
        focusWindow: baseWindow,
        changedAreaIds,
        message: "This 14-day focus window is still active. Use an explicit override to fully reshuffle priorities.",
        requiresOverride: true,
      };
    }

    if ((existingAdjustment?.count ?? 0) >= 1) {
      return {
        allowed: false,
        status: "override_required",
        focusWindow: baseWindow,
        changedAreaIds,
        message: "You've already used this week's micro-adjustment. Wait for the next 7-day window or explicitly override.",
        requiresOverride: true,
      };
    }
  }

  const nextAdjustments = [...baseWindow.adjustments];
  if (params.override) {
    return {
      allowed: true,
      status: "override_applied",
      focusWindow: {
        ...baseWindow,
        overrideCount: baseWindow.overrideCount + 1,
        lastAdjustedAt: now.toISOString(),
      },
      changedAreaIds,
      message: "Override applied. Your focus window stayed active, but the priority map was updated.",
      requiresOverride: false,
    };
  }

  if (existingAdjustment) {
    existingAdjustment.count += 1;
    existingAdjustment.changedAreaIds = changedAreaIds;
    existingAdjustment.adjustedAt = now.toISOString();
  } else {
    nextAdjustments.push({
      weekIndex,
      count: 1,
      changedAreaIds,
      adjustedAt: now.toISOString(),
    });
  }

  return {
    allowed: true,
    status: "adjusted",
    focusWindow: {
      ...baseWindow,
      adjustments: nextAdjustments,
      lastAdjustedAt: now.toISOString(),
    },
    changedAreaIds,
    message: "Saved one weekly micro-adjustment inside the active focus window.",
    requiresOverride: false,
  };
}
