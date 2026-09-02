import type { Express } from "express";

import { db } from "../db";
import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { generateLifeSystemRecommendations, openai } from "../openai";
import { onboardingProfiles, type OnboardingProfile } from "@shared/schema";
import {
  ONBOARDING_INTENTS,
  ONBOARDING_LIFE_AREAS,
  ONBOARDING_REASON_OPTIONS,
  PRIORITY_BUCKETS,
  PRIORITIZATION_FORMULA,
  applyFocusWindowGuardrail,
  normalizeAssignments,
  normalizeIntents,
  normalizeReasonIds,
  normalizeSignals,
  recommendPriorityAssignments,
  sanitizeReasonText,
  type OnboardingProfileContext,
  type PrioritizationSnapshot,
} from "@shared/onboardingPrioritization";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";

// ─── Onboarding suggestion types ─────────────────────────────────────────────

export interface OnboardingSuggestion {
  id: string;
  type: "focus_point" | "path" | "system" | "plan" | "project";
  title: string;
  description: string;
  sourceReason: string;
  status: "pending" | "accepted" | "edited" | "deferred" | "removed";
  editedTitle?: string;
}

export interface StructuredOnboardingExtraction {
  firstName?: string | null;
  desiredFeelings?: string[] | null;
  currentStateTags?: string[] | null;
  activeLifeAreas?: string[] | null;
  barrierTags?: string[] | null;
  supportNeeds?: string[] | null;
  curiosityTopics?: string[] | null;
  generatedSummary?: string | null;
  generatedDirection?: string | null;
  currentCapacity?: string | null;
  tonePreference?: string | null;
  uncertaintyFlags?: {
    barriersUnknown?: boolean;
    goalsUnclear?: boolean;
    capacityUnclear?: boolean;
    everythingConnected?: boolean;
  } | null;
  suggestions?: OnboardingSuggestion[] | null;
  wellnessFocus?: string | null;
  shortTermGoals?: string | null;
}

const WEEKDAY_CODES = ["SU", "MO", "TU", "WE", "TH", "FR", "SA"] as const;
const WEEKDAY_NAMES = [
  "sunday",
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
] as const;

function inferRoutineTiming(text: string): {
  cadence: "daily" | "weekly";
  dayOfWeek?: number;
  startTime: string;
  durationMinutes: number;
} | null {
  const normalized = text.toLowerCase();
  const explicitDay = WEEKDAY_NAMES.findIndex((day) => normalized.includes(day));
  const dayOfWeek = explicitDay >= 0 ? explicitDay : undefined;

  const withCadence = (
    startTime: string,
    cadence: "daily" | "weekly" = dayOfWeek !== undefined ? "weekly" : "daily"
  ) => ({
    cadence,
    ...(dayOfWeek !== undefined ? { dayOfWeek } : {}),
    startTime,
    durationMinutes: 30,
  });

  if (normalized.includes("morning")) {
    return withCadence("07:00");
  }
  if (
    normalized.includes("afternoon") ||
    normalized.includes("lunch") ||
    normalized.includes("midday")
  ) {
    return withCadence("12:00");
  }
  if (
    normalized.includes("evening") ||
    normalized.includes("night") ||
    normalized.includes("wind down") ||
    normalized.includes("wind-down")
  ) {
    return withCadence("20:00");
  }
  if (normalized.includes("weekly") || dayOfWeek !== undefined) {
    return {
      cadence: "weekly",
      dayOfWeek: dayOfWeek ?? 1,
      startTime: "09:00",
      durationMinutes: 30,
    };
  }
  return null;
}

function buildNextOccurrence(
  timing: {
    cadence: "daily" | "weekly";
    dayOfWeek?: number;
    startTime: string;
    durationMinutes: number;
  },
  timeZone: string
) {
  const getDateParts = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      weekday: "short",
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
    const weekdayMap: Record<string, number> = {
      sun: 0,
      mon: 1,
      tue: 2,
      wed: 3,
      thu: 4,
      fri: 5,
      sat: 6,
    };
    return {
      year: Number(get("year")),
      month: Number(get("month")),
      day: Number(get("day")),
      weekday: weekdayMap[get("weekday").toLowerCase()] ?? 0,
    };
  };
  const getTimeZoneOffsetMs = (date: Date) => {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(date);
    const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "0";
    const localAsUtc = Date.UTC(
      Number(get("year")),
      Number(get("month")) - 1,
      Number(get("day")),
      Number(get("hour")),
      Number(get("minute")),
      Number(get("second"))
    );
    return localAsUtc - date.getTime();
  };
  const zonedDateTimeToUtc = (
    year: number,
    month: number,
    day: number,
    hour: number,
    minute: number
  ) => {
    const utcGuess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
    const guessDate = new Date(utcGuess);
    const offset = getTimeZoneOffsetMs(guessDate);
    const instant = new Date(utcGuess - offset);
    const adjustedOffset = getTimeZoneOffsetMs(instant);
    return adjustedOffset === offset ? instant : new Date(utcGuess - adjustedOffset);
  };

  const now = new Date();
  const [hour, minute] = timing.startTime.split(":").map(Number);
  const localNow = getDateParts(now);
  const localDateUtc = new Date(Date.UTC(localNow.year, localNow.month - 1, localNow.day));
  let daysUntil = 0;
  let recurrenceWeekday = timing.dayOfWeek ?? localNow.weekday;

  if (timing.cadence === "daily") {
    const todayStart = zonedDateTimeToUtc(
      localNow.year,
      localNow.month,
      localNow.day,
      hour,
      minute
    );
    if (todayStart.getTime() <= now.getTime()) daysUntil = 1;
  } else {
    const targetDay = timing.dayOfWeek ?? localNow.weekday;
    recurrenceWeekday = targetDay;
    daysUntil = targetDay - localNow.weekday;
    const thisWeekStart = zonedDateTimeToUtc(
      localNow.year,
      localNow.month,
      localNow.day,
      hour,
      minute
    );
    if (daysUntil < 0 || (daysUntil === 0 && thisWeekStart.getTime() <= now.getTime())) {
      daysUntil += 7;
    }
  }

  if (daysUntil !== 0) {
    localDateUtc.setUTCDate(localDateUtc.getUTCDate() + daysUntil);
  }

  const startYear = localDateUtc.getUTCFullYear();
  const startMonth = localDateUtc.getUTCMonth() + 1;
  const startDay = localDateUtc.getUTCDate();
  const start = zonedDateTimeToUtc(startYear, startMonth, startDay, hour, minute);
  start.setSeconds(0, 0);

  const end = new Date(start);
  end.setMinutes(end.getMinutes() + timing.durationMinutes);

  const recurrenceRule =
    timing.cadence === "daily"
      ? "FREQ=DAILY"
      : `FREQ=WEEKLY;BYDAY=${WEEKDAY_CODES[recurrenceWeekday]}`;

  return { start, end, recurrenceRule };
}

function normalizeIanaTimezone(timezone: unknown): string | null {
  if (typeof timezone !== "string") return null;
  const trimmed = timezone.trim();
  if (!trimmed || trimmed.length > 80) return null;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: trimmed }).format(new Date());
    return trimmed;
  } catch {
    return null;
  }
}

const prioritizationAreaEnum = z.enum(
  ONBOARDING_LIFE_AREAS.map((area) => area.id) as [string, ...string[]]
);
const prioritizationBucketEnum = z.enum(PRIORITY_BUCKETS);
const prioritizationIntentEnum = z.enum(ONBOARDING_INTENTS);
const prioritizationReasonEnum = z.enum(
  ONBOARDING_REASON_OPTIONS.map((reason) => reason.id) as [string, ...string[]]
);

const prioritizationRequestSchema = z.object({
  intents: z.array(prioritizationIntentEnum).default([]),
  selectedReasons: z.array(prioritizationReasonEnum).default([]),
  reasonFreeText: z.string().max(280).nullish(),
  mode: z.enum(["manual", "choose_for_me"]).default("manual"),
  assignments: z
    .array(
      z.object({
        areaId: prioritizationAreaEnum,
        bucket: prioritizationBucketEnum,
        score: z.number().optional(),
        why: z.string().max(280).optional(),
        recommended: z.boolean().optional(),
      })
    )
    .optional(),
  signals: z
    .array(
      z.object({
        areaId: prioritizationAreaEnum,
        currentState: z.number().int().min(1).max(10),
        importance: z.number().int().min(1).max(10),
        urgency: z.boolean(),
        energyDrain: z.boolean(),
      })
    )
    .optional(),
  override: z.boolean().optional(),
});

export function registerOnboardingRoutes(app: Express): void {
  app.post("/api/onboarding/restart", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const resetGoals = req.body?.mode === "reset";
      await storage.restartOnboarding(userId, { resetGoals });
      res.json({ success: true, mode: resetGoals ? "reset" : "preserve" });
    } catch (error) {
      console.error("Onboarding restart error:", error);
      res.status(500).json({ error: "Failed to restart onboarding" });
    }
  });

  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const onboardingSource =
        user?.onboardingSource === "manual_restart" ? "manual_restart" : "new_user";
      const {
        responsibilities,
        priorities,
        freeTimeHours,
        peakMotivationTime,
        wellnessFocus,
        systemName,
        lifeAreaDetails,
        shortTermGoals,
        longTermGoals,
        relationshipGoals,
      } = req.body;

      const { conversationData } = req.body;

      await storage.createOnboardingProfile({
        userId,
        responsibilities: responsibilities || [],
        priorities: priorities || [],
        freeTimeHours,
        peakMotivationTime,
        wellnessFocus: wellnessFocus || [],
        lifeAreaDetails: lifeAreaDetails || {},
        shortTermGoals: shortTermGoals || "",
        longTermGoals: longTermGoals || "",
        relationshipGoals: relationshipGoals || "",
        conversationData: conversationData || null,
        onboardingVersion: "v1",
        completedAt: new Date(),
      });

      const recommendations = await generateLifeSystemRecommendations({
        responsibilities: responsibilities || [],
        priorities: priorities || [],
        freeTimeHours,
        peakMotivationTime,
        wellnessFocus: wellnessFocus || [],
        lifeAreaDetails,
        shortTermGoals,
        longTermGoals,
        conversationData,
      });

      await storage.createLifeSystem({
        userId,
        name: systemName || "My Life System",
        weeklySchedule: recommendations.weeklyScheduleSuggestions,
        suggestedHabits: recommendations.suggestedHabits,
        suggestedTools: [],
        scheduleBlocks: recommendations.scheduleBlocks || [],
        mealSuggestions: recommendations.mealSuggestions || [],
      });

      await storage.createHabits(
        recommendations.suggestedHabits.map((habit) => ({
          userId,
          title: habit.title,
          description: habit.description,
          frequency: habit.frequency,
          isActive: true,
        }))
      );

      await storage.createGoals(
        recommendations.suggestedGoals.map((goal) => ({
          userId,
          title: goal.title,
          description: goal.description,
          wellnessDimension: goal.wellnessDimension,
          isActive: true,
        }))
      );

      await storage.updateUser(userId, {
        onboardingCompleted: true,
        systemName: systemName || "My Life System",
        onboardingVersion: "v1",
        onboardingCompletedAt: new Date(),
        onboardingSource,
      });

      res.json({ success: true });
    } catch (error) {
      console.error("Onboarding error:", error);
      res.status(500).json({ error: "Failed to complete onboarding" });
    }
  });

  // Voice-onboarding profile extraction — called when user taps Done
  app.post("/api/onboarding/voice-complete", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUser(userId);
      const onboardingSource =
        user?.onboardingSource === "manual_restart" ? "manual_restart" : "new_user";
      const { messages, onboardingVersion } = req.body as {
        messages?: Array<{ role: string; content: string }>;
        mode?: string;
        onboardingVersion?: string;
      };
      const selectedOnboardingVersion = onboardingVersion === "v2" ? "v2" : "v1";

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        await storage.updateUser(userId, {
          onboardingCompleted: true,
          onboardingVersion: selectedOnboardingVersion,
          onboardingCompletedAt: new Date(),
          onboardingSource,
        });
        return res.json({ success: true, suggestions: [] });
      }

      const transcript = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content}`)
        .join("\n");

      let extracted: StructuredOnboardingExtraction = {};

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `You are an expert life coach analyst. Extract structured profile information from this onboarding conversation.

Return a JSON object with these fields (all optional, use null if not clearly mentioned):

PROFILE FIELDS:
- firstName: user's first name (string or null)
- desiredFeelings: array of feelings the user wants (e.g. ["organized","calmer","more stable"]) — strings only, no null
- currentStateTags: array of tags describing their current state (e.g. ["overwhelmed","inconsistent","motivated but scattered"])
- activeLifeAreas: array of life areas they mentioned (e.g. ["school","fitness","finances","routines","relationships"])
- barrierTags: array of barriers they mentioned (e.g. ["procrastination","low energy","lack of time","I don't know"])
- supportNeeds: array of support types they need (e.g. ["making a plan","staying on track","understanding what's going on"])
- curiosityTopics: array of things they want to learn about (e.g. ["budgeting","studying","time management","consistency"])
- generatedSummary: 2-4 sentence warm, empathetic summary of what DW heard — like a life coach reflecting back (string or null)
- generatedDirection: 1-2 sentence statement of the direction the user wants to go (string or null)
- currentCapacity: one of "only small steps", "a few focused changes", "more structure", or "unclear" (string or null)
- tonePreference: one of "gentle", "balanced", "direct" — inferred from how they communicate (string or null)
- uncertaintyFlags: object with boolean fields: barriersUnknown, goalsUnclear, capacityUnclear, everythingConnected
- wellnessFocus: primary wellness dimension: physical, emotional, mental, financial, spiritual, occupational, social, environmental (string or null)
- shortTermGoals: plain-text summary of immediate goals (max 200 chars, string or null)

SUGGESTIONS (generate based on what you heard, each with a sourceReason):
- suggestions: array of objects, each with:
  - id: unique string like "fp-1", "path-1", "sys-1", "plan-1", "proj-1"
  - type: one of "focus_point", "path", "system", "plan", "project"
  - title: short, actionable name (e.g. "Build a Study Routine", "Money Awareness", "Morning Reset")
  - description: 1 sentence description
  - sourceReason: warm, coach-like reason starting with "Suggested because" (e.g. "Suggested because you mentioned school and feeling behind on assignments.")
  - status: "pending"

Generate 3-7 suggestions total covering different types. Prioritize focus_point and system. Only add project if something specific and bounded was mentioned.

Return only valid JSON. Do not guess at things not mentioned. Keep suggestions realistic and grounded in what the user actually said.`,
            },
            {
              role: "user",
              content: `Onboarding conversation:\n${transcript}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 1200,
        });
        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          extracted = JSON.parse(raw);
        }
      } catch (aiErr) {
        console.error("Voice onboarding AI extraction error (non-fatal):", aiErr);
      }

      await storage.updateUser(userId, {
        onboardingCompleted: true,
        onboardingVersion: selectedOnboardingVersion,
        onboardingCompletedAt: new Date(),
        onboardingSource,
        ...(extracted.firstName && typeof extracted.firstName === "string"
          ? { firstName: extracted.firstName.trim().slice(0, 50) }
          : {}),
      });

      // Persist the full structured profile
      try {
        const existingOnboarding = await storage.getOnboardingProfile(userId);
        const profileData: Partial<OnboardingProfile> = {
          wellnessFocus: extracted.wellnessFocus ? [extracted.wellnessFocus] : [],
          shortTermGoals: extracted.shortTermGoals ?? extracted.generatedDirection ?? "",
          conversationData: messages as unknown as OnboardingProfile["conversationData"],
          // New structured fields
          desiredFeelings: extracted.desiredFeelings ?? [],
          currentStateTags: extracted.currentStateTags ?? [],
          activeLifeAreas: extracted.activeLifeAreas ?? [],
          barrierTags: extracted.barrierTags ?? [],
          supportNeeds: extracted.supportNeeds ?? [],
          curiosityTopics: extracted.curiosityTopics ?? [],
          generatedSummary: extracted.generatedSummary ?? null,
          generatedDirection: extracted.generatedDirection ?? null,
          currentCapacity: extracted.currentCapacity ?? null,
          tonePreference: extracted.tonePreference ?? null,
          uncertaintyFlags: extracted.uncertaintyFlags ?? null,
          suggestedStructure: (extracted.suggestions ??
            []) as unknown as OnboardingProfile["suggestedStructure"],
          onboardingVersion: selectedOnboardingVersion,
          completedAt: new Date(),
        };

        if (existingOnboarding) {
          // Merge-preserving update — applied whenever a profile already
          // exists, not only when the client sent mode:"refresh". A short
          // re-run conversation (deep link, stale bookmark, nav bug) must
          // never clobber an established profile with empty/default
          // extraction values — keep prior data wherever the new extraction
          // came back empty, and union array fields.
          const unionArr = (prev: unknown, next: unknown): string[] => {
            const p = Array.isArray(prev) ? (prev as string[]) : [];
            const n = Array.isArray(next) ? (next as string[]) : [];
            return Array.from(new Set([...p, ...n]));
          };
          const preferNew = <T>(
            next: T | null | undefined,
            prev: T | null | undefined
          ): T | null =>
            next !== null && next !== undefined && next !== ("" as unknown as T)
              ? next
              : (prev ?? null);

          const merged: Partial<OnboardingProfile> = {
            wellnessFocus: (profileData.wellnessFocus as string[])?.length
              ? profileData.wellnessFocus
              : existingOnboarding.wellnessFocus,
            shortTermGoals:
              preferNew(profileData.shortTermGoals, existingOnboarding.shortTermGoals) ?? "",
            conversationData: profileData.conversationData,
            desiredFeelings: unionArr(
              existingOnboarding.desiredFeelings,
              profileData.desiredFeelings
            ),
            currentStateTags: unionArr(
              existingOnboarding.currentStateTags,
              profileData.currentStateTags
            ),
            activeLifeAreas: unionArr(
              existingOnboarding.activeLifeAreas,
              profileData.activeLifeAreas
            ),
            barrierTags: unionArr(existingOnboarding.barrierTags, profileData.barrierTags),
            supportNeeds: unionArr(existingOnboarding.supportNeeds, profileData.supportNeeds),
            curiosityTopics: unionArr(
              existingOnboarding.curiosityTopics,
              profileData.curiosityTopics
            ),
            generatedSummary: preferNew(
              profileData.generatedSummary,
              existingOnboarding.generatedSummary
            ),
            generatedDirection: preferNew(
              profileData.generatedDirection,
              existingOnboarding.generatedDirection
            ),
            currentCapacity: preferNew(
              profileData.currentCapacity,
              existingOnboarding.currentCapacity
            ),
            tonePreference: preferNew(
              profileData.tonePreference,
              existingOnboarding.tonePreference
            ),
            uncertaintyFlags: (profileData.uncertaintyFlags ??
              existingOnboarding.uncertaintyFlags) as OnboardingProfile["uncertaintyFlags"],
            suggestedStructure: (profileData.suggestedStructure as unknown[])?.length
              ? profileData.suggestedStructure
              : existingOnboarding.suggestedStructure,
            onboardingVersion: profileData.onboardingVersion,
            completedAt: profileData.completedAt,
          };
          await storage.updateOnboardingProfile(existingOnboarding.id, merged);
        } else {
          await storage.createOnboardingProfile({
            userId,
            responsibilities: [],
            priorities: [],
            longTermGoals: "",
            relationshipGoals: "",
            lifeAreaDetails: {} as OnboardingProfile["lifeAreaDetails"],
            ...profileData,
          });
        }
      } catch (profileErr) {
        console.error("Voice onboarding profile save error (non-fatal):", profileErr);
      }

      res.json({
        success: true,
        extracted: {
          firstName: extracted.firstName,
          wellnessFocus: extracted.wellnessFocus,
          shortTermGoals: extracted.shortTermGoals,
        },
        summary: extracted.generatedSummary,
        direction: extracted.generatedDirection,
        suggestions: extracted.suggestions ?? [],
      });
    } catch (error) {
      console.error("Voice onboarding complete error:", error);
      res.status(500).json({ error: "Failed to complete voice onboarding" });
    }
  });

  // Get the user's structured onboarding profile (for My Life and Command Center)
  app.get("/api/onboarding/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getOnboardingProfile(userId);
      if (!profile) {
        return res.json({ profile: null });
      }
      // Omit conversationData — it can be large and is not needed by polling clients
      const { conversationData: _cd, ...profileDto } = profile;
      res.json({ profile: profileDto });
    } catch (error) {
      console.error("Get onboarding profile error:", error);
      res.status(500).json({ error: "Failed to get onboarding profile" });
    }
  });

  app.post("/api/onboarding/prioritization", requireAuth, async (req, res) => {
    try {
      const parsed = prioritizationRequestSchema.safeParse(req.body ?? {});
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid prioritization payload" });
      }

      const userId = req.session.userId!;
      const now = new Date();
      const signals = normalizeSignals(parsed.data.signals);
      const assignmentSource =
        parsed.data.mode === "choose_for_me" && !parsed.data.assignments?.length
          ? recommendPriorityAssignments(signals).assignments
          : parsed.data.assignments;
      const submittedOrder = new Map(
        (assignmentSource ?? []).map((assignment, index) => [assignment.areaId, index])
      );
      const assignments = normalizeAssignments(assignmentSource, signals).sort((left, right) => {
        const leftIndex = submittedOrder.get(left.areaId);
        const rightIndex = submittedOrder.get(right.areaId);
        if (leftIndex !== undefined && rightIndex !== undefined) return leftIndex - rightIndex;
        if (leftIndex !== undefined) return -1;
        if (rightIndex !== undefined) return 1;
        return left.areaId.localeCompare(right.areaId);
      });

      const profileContext: OnboardingProfileContext = {
        intents: normalizeIntents(parsed.data.intents),
        selectedReasons: normalizeReasonIds(parsed.data.selectedReasons),
        reasonFreeText: sanitizeReasonText(parsed.data.reasonFreeText),
        userLanguageInputs: {
          reasonNarrative: sanitizeReasonText(parsed.data.reasonFreeText),
          lastUpdatedAt: now.toISOString(),
        },
      };

      const prioritySnapshotBase = {
        mode: parsed.data.mode,
        formula: PRIORITIZATION_FORMULA,
        signals,
        assignments,
        recommendedAt: now.toISOString(),
      };

      const prioritizedAreas = assignments
        .filter((assignment) => assignment.bucket !== "background")
        .map((assignment) => assignment.areaId);

      const { guardrail } = await db.transaction(async (tx) => {
        await tx.execute(
          sql`SELECT pg_advisory_xact_lock(hashtext(${`onboarding-prioritization:${userId}`}))`
        );

        const [existingProfile] = await tx
          .select()
          .from(onboardingProfiles)
          .where(eq(onboardingProfiles.userId, userId))
          .limit(1);

        const guardrail = applyFocusWindowGuardrail({
          existingFocusWindow: existingProfile?.prioritySnapshot?.focusWindow ?? null,
          previousAssignments: existingProfile?.prioritySnapshot?.assignments ?? [],
          nextAssignments: assignments,
          now,
          override: parsed.data.override,
        });

        if (!guardrail.allowed) {
          return { guardrail };
        }

        const nextPrioritySnapshot: PrioritizationSnapshot = {
          ...prioritySnapshotBase,
          focusWindow: guardrail.focusWindow,
        };

        if (existingProfile) {
          await tx
            .update(onboardingProfiles)
            .set({
              priorities: prioritizedAreas,
              profileContext,
              prioritySnapshot: nextPrioritySnapshot,
            })
            .where(eq(onboardingProfiles.id, existingProfile.id));
        } else {
          await tx.insert(onboardingProfiles).values({
            userId,
            responsibilities: [],
            priorities: prioritizedAreas,
            wellnessFocus: [],
            lifeAreaDetails: {},
            shortTermGoals: "",
            longTermGoals: "",
            relationshipGoals: "",
            profileContext,
            prioritySnapshot: nextPrioritySnapshot,
            completedAt: now,
          });
        }

        return {
          guardrail,
          prioritySnapshot: nextPrioritySnapshot,
        };
      });

      if (!guardrail.allowed) {
        return res.status(409).json({
          success: false,
          requiresOverride: guardrail.requiresOverride,
          focusWindow: guardrail.focusWindow,
          message: guardrail.message,
        });
      }

      return res.json({
        success: true,
        profileContext,
        prioritySnapshot: {
          ...prioritySnapshotBase,
          focusWindow: guardrail.focusWindow,
        },
        focusWindowStatus: guardrail.status,
        changedAreaIds: guardrail.changedAreaIds,
        message: guardrail.message,
      });
    } catch (error) {
      console.error("Onboarding prioritization error:", error);
      return res.status(500).json({ error: "Failed to save prioritization" });
    }
  });

  // Accept suggestions from onboarding and populate My Life
  app.post("/api/onboarding/accept-suggestions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { suggestions, timezone } = req.body as {
        suggestions: Array<{
          id: string;
          type: "focus_point" | "path" | "system" | "plan" | "project";
          title: string;
          description: string;
          sourceReason: string;
          status: "accepted" | "edited" | "deferred" | "removed";
          editedTitle?: string;
        }>;
        timezone?: string;
      };

      if (!Array.isArray(suggestions)) {
        return res.status(400).json({ error: "suggestions must be an array" });
      }

      const accepted = suggestions.filter((s) => s.status === "accepted" || s.status === "edited");
      const requestTimezone = normalizeIanaTimezone(timezone) ?? "UTC";
      const finalTitle = (s: (typeof accepted)[0]) => {
        return s.status === "edited" && s.editedTitle?.trim()
          ? s.editedTitle.trim()
          : s.title.trim();
      };
      const validAccepted = accepted.filter((s) => finalTitle(s).length > 0);

      // Focus Points -> Goals
      const focusPoints = validAccepted.filter((s) => s.type === "focus_point");
      if (focusPoints.length > 0) {
        await storage.createGoals(
          focusPoints.map((s) => ({
            userId,
            title: finalTitle(s),
            description: `${s.description}\n\n${s.sourceReason}`,
            wellnessDimension: "general",
            isActive: true,
            dataSource: "onboarding",
            explainWhy: s.sourceReason,
          }))
        );
      }

      // Systems and Paths -> Habits (as repeatable structures)
      const systems = validAccepted.filter((s) => s.type === "system" || s.type === "path");
      if (systems.length > 0) {
        await storage.createHabits(
          systems.map((s) => ({
            userId,
            title: finalTitle(s),
            description: `${s.description}\n\n${s.sourceReason}`,
            frequency: "daily",
            isActive: true,
            dataSource: "onboarding",
            explainWhy: s.sourceReason,
          }))
        );
      }

      // Systems also become routines, with lightweight schedule inference when
      // the wording implies a recurring time of day or weekly cadence.
      const routineSystems = validAccepted.filter((s) => s.type === "system");
      for (const s of routineSystems) {
        try {
          const routineText = `${finalTitle(s)} ${s.description}`;
          const timing = inferRoutineTiming(routineText);
          const routine = await storage.createRoutine({
            userId,
            name: finalTitle(s),
            dimensionTags:
              timing?.cadence === "daily" && routineText.toLowerCase().includes("morning")
                ? ["morning"]
                : timing?.cadence === "daily" &&
                    (routineText.toLowerCase().includes("evening") ||
                      routineText.toLowerCase().includes("night") ||
                      routineText.toLowerCase().includes("wind down") ||
                      routineText.toLowerCase().includes("wind-down"))
                  ? ["evening"]
                  : [],
            steps: [],
            totalDurationMinutes: timing?.durationMinutes ?? 30,
            scheduleOptions: timing
              ? {
                  cadence: timing.cadence,
                  time: timing.startTime,
                  ...(timing.dayOfWeek !== undefined ? { dayOfWeek: timing.dayOfWeek } : {}),
                }
              : null,
            mode: "guided",
            isActive: true,
            dataSource: "onboarding",
            explainWhy: s.sourceReason,
          });

          if (timing) {
            const occurrence = buildNextOccurrence(timing, requestTimezone);
            await storage.createCalendarEvent({
              userId,
              title: finalTitle(s),
              description: `${s.description}\n\n${s.sourceReason}`,
              startTime: occurrence.start.toISOString(),
              endTime: occurrence.end.toISOString(),
              eventType: "routine",
              isRecurring: true,
              recurrenceRule: occurrence.recurrenceRule,
              linkedType: "routine",
              linkedId: routine.id,
              linkedRoute: "/routines",
            });
          }
        } catch (routineErr) {
          console.error("Failed to create routine from onboarding suggestion:", routineErr);
        }
      }

      // Projects/Plans -> Projects
      const projectSuggestions = validAccepted.filter(
        (s) => s.type === "project" || s.type === "plan"
      );
      for (const s of projectSuggestions) {
        try {
          await storage.createProject({
            userId,
            name: finalTitle(s),
            description: `${s.description}\n\n${s.sourceReason}`,
            status: "active",
            dataSource: "onboarding",
            explainWhy: s.sourceReason,
          });
        } catch (projErr) {
          console.error("Failed to create project from onboarding suggestion:", projErr);
        }
      }

      // Update the stored suggestions with their final statuses and editedTitle
      const profile = await storage.getOnboardingProfile(userId);
      if (profile) {
        const stored = (profile.suggestedStructure as OnboardingSuggestion[] | null) ?? [];
        const incomingMap: Record<
          string,
          { status: OnboardingSuggestion["status"]; editedTitle?: string }
        > = {};
        for (const s of suggestions) {
          incomingMap[s.id] = { status: s.status, editedTitle: s.editedTitle };
        }
        const updated = stored.map((item) => {
          const incoming = incomingMap[item.id];
          if (!incoming) return item;
          return {
            ...item,
            status: incoming.status ?? item.status,
            ...(incoming.editedTitle?.trim() ? { editedTitle: incoming.editedTitle.trim() } : {}),
          };
        });
        await storage.updateOnboardingProfile(profile.id, {
          suggestedStructure: updated as unknown as OnboardingProfile["suggestedStructure"],
        });
      }

      res.json({ success: true, created: validAccepted.length });
    } catch (error) {
      console.error("Accept suggestions error:", error);
      res.status(500).json({ error: "Failed to accept suggestions" });
    }
  });

  // ── Progressive onboarding follow-ups ───────────────────────────────────────
  // After the first conversational session, the Command Center surfaces one
  // follow-up card at a time to fill gaps in the onboarding profile.

  /** Catalogue of progressive follow-up prompts, keyed by a stable ID. */
  const PROGRESSIVE_PROMPTS: Array<{
    id: string;
    /** Condition that makes this prompt relevant — returns true when it should be shown. */
    shouldShow: (profile: OnboardingProfile) => boolean;
    prompt: string;
    context: string;
  }> = [
    {
      id: "schedule",
      shouldShow: (p) => !p.currentCapacity || p.uncertaintyFlags?.capacityUnclear === true,
      prompt:
        "Tell me a bit more about your schedule — what does a typical week look like for you?",
      context:
        "We want to understand your available bandwidth so suggestions actually fit your life.",
    },
    {
      id: "barriers",
      shouldShow: (p) => !p.barrierTags?.length || p.uncertaintyFlags?.barriersUnknown === true,
      prompt: "What usually throws your day off? Even small things count.",
      context:
        "Knowing your friction points helps DW build systems around them instead of ignoring them.",
    },
    {
      id: "hold_together",
      shouldShow: (p) =>
        !p.currentStateTags?.length || p.uncertaintyFlags?.everythingConnected === true,
      prompt: "What are you trying to hold together right now?",
      context: "This helps us understand where you're spending the most energy.",
    },
    {
      id: "first_system",
      shouldShow: (p) => {
        const suggestions = (p.suggestedStructure as OnboardingSuggestion[] | null) ?? [];
        return (
          suggestions.filter(
            (s) => s.type === "system" && (s.status === "accepted" || s.status === "edited")
          ).length === 0
        );
      },
      prompt:
        "Want help creating your first system — something repeatable that makes a real area of your life easier?",
      context:
        "Systems are the backbone of a sustainable life setup. One good one changes everything.",
    },
    {
      id: "curiosity",
      shouldShow: (p) => !p.curiosityTopics?.length,
      prompt:
        "Is there something you've been wanting to learn more about lately — even if it feels unrelated to your goals?",
      context: "Curiosity is data. DW can weave your interests into the learning layer.",
    },
    {
      id: "direction",
      shouldShow: (p) => !p.generatedDirection && p.uncertaintyFlags?.goalsUnclear === true,
      prompt:
        "If things could be different in six months, what's the first thing you'd want to see change?",
      context: "You don't need a plan — just a direction. We'll build from there.",
    },
  ];

  /**
   * GET /api/onboarding/next-prompt
   * Returns the next progressive follow-up prompt for the user, or null if all
   * prompts have been dismissed or no relevant gaps exist.
   */
  app.get("/api/onboarding/next-prompt", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const profile = await storage.getOnboardingProfile(userId);

      if (!profile || !profile.completedAt) {
        // Onboarding hasn't been completed yet — no follow-up needed
        return res.json({ prompt: null });
      }

      const dismissed = new Set<string>(profile.dismissedProgressivePrompts ?? []);

      const next = PROGRESSIVE_PROMPTS.find((p) => !dismissed.has(p.id) && p.shouldShow(profile));

      if (!next) {
        return res.json({ prompt: null });
      }

      res.json({
        prompt: {
          id: next.id,
          prompt: next.prompt,
          context: next.context,
        },
      });
    } catch (err) {
      console.error("GET /api/onboarding/next-prompt error:", err);
      res.status(500).json({ error: "Failed to get next prompt" });
    }
  });

  /**
   * POST /api/onboarding/dismiss-prompt
   * Marks a progressive prompt as dismissed (skipped or answered) so it won't
   * show again. When `answer` is provided, it is appended to the profile for
   * context in future AI interactions.
   */
  app.post("/api/onboarding/dismiss-prompt", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { promptId, answer } = req.body as { promptId?: string; answer?: string };

      if (!promptId || typeof promptId !== "string") {
        return res.status(400).json({ error: "promptId is required" });
      }

      const profile = await storage.getOnboardingProfile(userId);
      if (!profile) {
        return res.status(404).json({ error: "Onboarding profile not found" });
      }

      const existing = profile.dismissedProgressivePrompts ?? [];
      if (!existing.includes(promptId)) {
        const patch: Partial<OnboardingProfile> = {
          dismissedProgressivePrompts: [...existing, promptId],
        };

        // If an answer was provided, incorporate it into the relevant profile fields
        if (answer && typeof answer === "string" && answer.trim().length > 0) {
          const trimmedAnswer = answer.trim().slice(0, 500);
          // Append the answer to shortTermGoals as a plain-text addendum
          const existingGoals = profile.shortTermGoals ?? "";
          patch.shortTermGoals = existingGoals
            ? `${existingGoals}\n\n[Follow-up: ${trimmedAnswer}]`
            : `[Follow-up: ${trimmedAnswer}]`;
        }

        await storage.updateOnboardingProfile(profile.id, patch);
      }

      res.json({ success: true });
    } catch (err) {
      console.error("POST /api/onboarding/dismiss-prompt error:", err);
      res.status(500).json({ error: "Failed to dismiss prompt" });
    }
  });

  // AI-powered contextual search endpoint
}
