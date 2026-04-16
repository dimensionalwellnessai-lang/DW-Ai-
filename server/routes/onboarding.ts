import type { Express } from "express";

import { storage } from "../storage";

import { requireAuth } from "./_shared";

import { generateLifeSystemRecommendations, openai } from "../openai";

import { type OnboardingProfile } from "@shared/schema";

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
        return res.json({ success: true });
      }

      const transcript = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => `${m.role === "user" ? "User" : "DW"}: ${m.content}`)
        .join("\n");

      let extracted: {
        firstName?: string;
        wellnessFocus?: string;
        shortTermGoals?: string;
        energyLevel?: string;
      } = {};

      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: `Extract key profile information from this onboarding conversation. Return a JSON object with these optional fields:
- firstName: the user's first name if they mentioned it (string or null)
- wellnessFocus: the primary wellness dimension they care about, one of: physical, emotional, mental, financial, spiritual, occupational, social, environmental (string or null)
- shortTermGoals: a short plain-text summary of their immediate goals or what brought them here (string, max 200 chars, or null)
- energyLevel: their self-described energy level: low, medium, or high (string or null)

Return only valid JSON. Use null for fields not mentioned. Do not guess.`,
            },
            {
              role: "user",
              content: `Onboarding conversation:\n${transcript}`,
            },
          ],
          response_format: { type: "json_object" },
          max_tokens: 300,
        });
        const raw = completion.choices[0]?.message?.content;
        if (raw) {
          extracted = JSON.parse(raw);
        }
      } catch (aiErr) {
        console.error("Voice onboarding AI extraction error (non-fatal):", aiErr);
      }

      await storage.updateUser(userId, { onboardingCompleted: true, ...(extracted.firstName && typeof extracted.firstName === "string" ? { firstName: extracted.firstName.trim().slice(0, 50) } : {}) });

      if (extracted.wellnessFocus || extracted.shortTermGoals) {
        try {
          const existingOnboarding = await storage.getOnboardingProfile(userId);
          if (existingOnboarding) {
            const onboardingUpdates: Partial<OnboardingProfile> = {};
            if (extracted.wellnessFocus) onboardingUpdates.wellnessFocus = [extracted.wellnessFocus];
            if (extracted.shortTermGoals) onboardingUpdates.shortTermGoals = extracted.shortTermGoals;
            await storage.updateOnboardingProfile(existingOnboarding.id, onboardingUpdates);
          } else {
            await storage.createOnboardingProfile({
              userId,
              responsibilities: [],
              priorities: [],
              wellnessFocus: extracted.wellnessFocus ? [extracted.wellnessFocus] : [],
              shortTermGoals: extracted.shortTermGoals || "",
              longTermGoals: "",
              relationshipGoals: "",
              lifeAreaDetails: {},
              conversationData: null,
            });
          }
        } catch (profileErr) {
          console.error("Voice onboarding profile save error (non-fatal):", profileErr);
        }
      }

      res.json({ success: true, extracted });
    } catch (error) {
      console.error("Voice onboarding complete error:", error);
      res.status(500).json({ error: "Failed to complete voice onboarding" });
    }
  });

  // AI-powered contextual search endpoint
}
