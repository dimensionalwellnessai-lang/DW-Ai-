import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { generateLifeSystemRecommendations, openai } from "../openai";

import { type OnboardingProfile } from "@shared/schema";

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

export function registerOnboardingRoutes(app: Express): void {
  app.post("/api/onboarding/complete", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
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
        relationshipGoals 
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

      await storage.updateUser(userId, { onboardingCompleted: true, systemName: systemName || "My Life System" });

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
      const { messages } = req.body as { messages?: Array<{ role: string; content: string }> };

      if (!messages || !Array.isArray(messages) || messages.length === 0) {
        await storage.updateUser(userId, { onboardingCompleted: true });
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

      await storage.updateUser(userId, { onboardingCompleted: true, ...(extracted.firstName && typeof extracted.firstName === "string" ? { firstName: extracted.firstName.trim().slice(0, 50) } : {}) });

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
          suggestedStructure: (extracted.suggestions ?? []) as unknown as OnboardingProfile["suggestedStructure"],
          onboardingVersion: "v2",
          completedAt: new Date(),
        };

        if (existingOnboarding) {
          await storage.updateOnboardingProfile(existingOnboarding.id, profileData);
        } else {
          await storage.createOnboardingProfile({
            userId,
            responsibilities: [],
            priorities: [],
            longTermGoals: "",
            relationshipGoals: "",
            lifeAreaDetails: {},
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

  // Accept suggestions from onboarding and populate My Life
  app.post("/api/onboarding/accept-suggestions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const { suggestions } = req.body as {
        suggestions: Array<{
          id: string;
          type: "focus_point" | "path" | "system" | "plan" | "project";
          title: string;
          description: string;
          sourceReason: string;
          status: "accepted" | "edited" | "deferred" | "removed";
          editedTitle?: string;
        }>;
      };

      if (!Array.isArray(suggestions)) {
        return res.status(400).json({ error: "suggestions must be an array" });
      }

      const accepted = suggestions.filter((s) => s.status === "accepted" || s.status === "edited");
      const finalTitle = (s: typeof accepted[0]) => {
        return (s.status === "edited" && s.editedTitle?.trim()) ? s.editedTitle.trim() : s.title.trim();
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

      // Projects/Plans -> Projects
      const projectSuggestions = validAccepted.filter((s) => s.type === "project" || s.type === "plan");
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
        const incomingMap: Record<string, { status: OnboardingSuggestion["status"]; editedTitle?: string }> = {};
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
      prompt: "Tell me a bit more about your schedule — what does a typical week look like for you?",
      context: "We want to understand your available bandwidth so suggestions actually fit your life.",
    },
    {
      id: "barriers",
      shouldShow: (p) =>
        !p.barrierTags?.length || p.uncertaintyFlags?.barriersUnknown === true,
      prompt: "What usually throws your day off? Even small things count.",
      context: "Knowing your friction points helps DW build systems around them instead of ignoring them.",
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
        return suggestions.filter((s) => s.type === "system" && (s.status === "accepted" || s.status === "edited")).length === 0;
      },
      prompt: "Want help creating your first system — something repeatable that makes a real area of your life easier?",
      context: "Systems are the backbone of a sustainable life setup. One good one changes everything.",
    },
    {
      id: "curiosity",
      shouldShow: (p) => !p.curiosityTopics?.length,
      prompt: "Is there something you've been wanting to learn more about lately — even if it feels unrelated to your goals?",
      context: "Curiosity is data. DW can weave your interests into the learning layer.",
    },
    {
      id: "direction",
      shouldShow: (p) => !p.generatedDirection && p.uncertaintyFlags?.goalsUnclear === true,
      prompt: "If things could be different in six months, what's the first thing you'd want to see change?",
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

      const next = PROGRESSIVE_PROMPTS.find(
        (p) => !dismissed.has(p.id) && p.shouldShow(profile),
      );

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
