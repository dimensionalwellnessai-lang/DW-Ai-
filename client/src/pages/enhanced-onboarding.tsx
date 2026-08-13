import { OnboardingWizard, type OnboardingData } from "@/components/onboarding-wizard";
import { useLocation } from "wouter";
import { saveEnhancedOnboarding, isEnhancedOnboardingComplete } from "@/lib/guest-storage";
import { trackEvent, EVENTS, markActivated } from "@/lib/analytics";
import { useState, useLayoutEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { loadBirthDataFor } from "@/lib/birth-data-storage";
import { persistBirthData } from "@/lib/birth-data-sync";
import { usePageMeta } from "@/hooks/use-page-meta";

const GOAL_HABIT_MAP: Record<string, { title: string; frequency: string }> = {
  health: { title: "30-minute workout", frequency: "daily" },
  habits: { title: "Morning routine check-in", frequency: "daily" },
  stress: { title: "5-minute meditation or breathing", frequency: "daily" },
  sleep: { title: "Wind down 30 min before bed", frequency: "daily" },
  mindset: { title: "Journaling reflection", frequency: "daily" },
  career: { title: "1 focused work block", frequency: "daily" },
  relationships: { title: "Reach out to someone I care about", frequency: "weekly" },
  finances: { title: "Review my budget", frequency: "weekly" },
  purpose: { title: "Review my goals", frequency: "weekly" },
  spiritual: { title: "Mindfulness or gratitude practice", frequency: "daily" },
};

const GOAL_TITLE_MAP: Record<string, string> = {
  health: "Improve my health & fitness",
  habits: "Build better daily habits",
  stress: "Manage stress & anxiety",
  sleep: "Get better sleep",
  mindset: "Shift my mindset and perspective",
  career: "Grow professionally",
  relationships: "Strengthen my relationships",
  finances: "Improve my financial situation",
  purpose: "Find more purpose and direction",
  spiritual: "Build a spiritual practice",
};

export default function EnhancedOnboardingPage() {
  usePageMeta("Getting Started", "Set up your personalized Dimensional Wellness experience.");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const [redirecting, setRedirecting] = useState(false);

  useLayoutEffect(() => {
    if (isEnhancedOnboardingComplete()) {
      setRedirecting(true);
      setLocation("/");
    }
  }, [setLocation]);

  if (redirecting) return null;

  const handleOnboardingComplete = async (data: OnboardingData, _takeTour: boolean) => {
    saveEnhancedOnboarding(data);

    // Bridge birth data → Cosmic page (owner-scoped; synced to the account
    // when logged in so details follow the user across devices).
    if (data.birthDate) {
      const ownerId = user?.id ?? null;
      const existingBirthChart = loadBirthDataFor(ownerId);
      if (!existingBirthChart?.birthDate) {
        void persistBirthData({
          birthDate: data.birthDate,
          birthTime: data.birthTime ?? "",
          birthPlace: data.birthLocation ?? "",
          houseSystem: "whole-sign",
          zodiacSystem: "tropical",
        }, ownerId);
      }
      const existingNumerology = JSON.parse(localStorage.getItem("dw_cosmic_numerology") || "null");
      if (!existingNumerology?.birthDate) {
        localStorage.setItem("dw_cosmic_numerology", JSON.stringify({
          fullName: data.name ?? "",
          birthDate: data.birthDate,
        }));
      }
    }

    // Update name on user record
    if (data.name) {
      try {
        await apiRequest("PATCH", "/api/users/me", { firstName: data.name.trim().slice(0, 50) });
      } catch { }
    }

    // Map new fields to onboarding profile schema
    const responsibilities = data.profession ? [data.profession] : [];
    const priorities = data.lifeGoals ?? [];
    const wellnessFocus: string[] = [];
    if (data.lifeGoals?.includes("health") || data.lifeGoals?.includes("habits")) wellnessFocus.push("physical");
    if (data.lifeGoals?.includes("stress") || data.lifeGoals?.includes("mindset")) wellnessFocus.push("emotional");
    if (data.lifeGoals?.includes("purpose") || data.lifeGoals?.includes("spiritual")) wellnessFocus.push("spiritual");
    if (data.lifeGoals?.includes("career")) wellnessFocus.push("occupational");
    if (data.lifeGoals?.includes("relationships")) wellnessFocus.push("social");
    if (data.lifeGoals?.includes("finances")) wellnessFocus.push("financial");

    // Submit to backend
    try {
      await apiRequest("POST", "/api/onboarding/complete", {
        responsibilities,
        priorities,
        wellnessFocus: wellnessFocus.length > 0 ? wellnessFocus : ["physical"],
        shortTermGoals: data.lifeGoals?.slice(0, 3).join(", ") ?? "",
        longTermGoals: data.lifeGoals?.slice(3).join(", ") ?? "",
        schedule: {
          wakeTime: data.wakeTime,
          sleepTime: data.sleepTime,
          preferredWorkoutDays: data.preferredWorkoutDays,
        },
        lifeAreaDetails: {
          birthDate: data.birthDate,
          birthTime: data.birthTime,
          birthLocation: data.birthLocation,
          currentLocation: data.currentLocation,
          profession: data.profession,
          preferredWorkoutDays: data.preferredWorkoutDays,
          wakeTime: data.wakeTime,
          sleepTime: data.sleepTime,
          dimensionSnapshot: data.dimensionSnapshot,
        },
        systemName: data.name ? `${data.name}'s Life Blueprint` : "My Life Blueprint",
      });
    } catch { }

    // Phase 2 setup: create starter goals and habits based on selected life goals
    if (data.lifeGoals && data.lifeGoals.length > 0) {
      const topGoals = data.lifeGoals.slice(0, 3);

      // Create a goal for each top priority (non-fatal)
      const goalCreations = topGoals.map(goalId => {
        const title = GOAL_TITLE_MAP[goalId];
        if (!title) return Promise.resolve();
        return apiRequest("POST", "/api/goals", {
          title,
          description: `Added from onboarding — ${new Date().toLocaleDateString()}`,
          status: "active",
        }).catch(() => {});
      });

      // Create one starter habit per top goal (non-fatal)
      const habitCreations = topGoals
        .map(goalId => GOAL_HABIT_MAP[goalId])
        .filter(Boolean)
        .slice(0, 3)
        .map(habit =>
          apiRequest("POST", "/api/habits", {
            title: habit.title,
            frequency: habit.frequency,
            isActive: true,
          }).catch(() => {})
        );

      await Promise.allSettled([...goalCreations, ...habitCreations]);
    }

    // Seed Life Blueprint dimension blueprints from snapshot + goals
    // Combine dimensionSnapshot (current challenge areas) + goal dimensions into set
    const GOAL_DIMENSION_MAP: Record<string, string> = {
      health: "body", habits: "mind", stress: "mind", sleep: "body",
      mindset: "mind", career: "purpose", relationships: "relationships",
      finances: "money", purpose: "purpose", spiritual: "identity",
    };
    const DIMENSION_VISION_MAP: Record<string, string> = {
      body: "I feel strong, energized, and at home in my body. My health habits support everything else I do.",
      mind: "I am clear, calm, and mentally resilient. My mind works for me — not against me.",
      time: "My time reflects my values. I am intentional with every hour.",
      purpose: "I know what I am building and why. Each day moves me closer to my vision.",
      money: "I have financial clarity and confidence. Money flows in alignment with my life.",
      relationships: "I invest in the people who matter. My connections are deep and reciprocal.",
      environment: "My spaces support my growth. Where I live and work reflects who I am becoming.",
      identity: "I know who I am and what I stand for. I act from my values, not my fears.",
    };
    const dimensionsToBuild = new Set<string>([
      ...(data.dimensionSnapshot ?? []),
      ...Object.entries(GOAL_DIMENSION_MAP)
        .filter(([goalId]) => data.lifeGoals?.includes(goalId))
        .map(([, dim]) => dim),
    ]);
    if (dimensionsToBuild.size > 0) {
      const blueprintCreations = Array.from(dimensionsToBuild).map(dim =>
        apiRequest("POST", "/api/dimension-blueprints", {
          dimension: dim,
          whenAtMyBest: DIMENSION_VISION_MAP[dim] ?? null,
          whatIStandFor: [],
          howThisSupportsMe: [],
        }).catch(() => {})
      );
      await Promise.allSettled(blueprintCreations);
    }

    trackEvent(EVENTS.QUICK_SETUP_COMPLETED, {
      completedAt: Date.now(),
      takesTour: false,
    } as any);

    markActivated({
      actionType: "starter_object_created",
      source: "welcome",
      tsLocal: new Date().toISOString(),
    });

    localStorage.setItem("dw:isReturning", "1");
    localStorage.setItem("dw_onboarding_completed", "1");
    setLocation("/");
  };

  const handleSkip = () => {
    saveEnhancedOnboarding({ completedAt: Date.now() });
    localStorage.setItem("dw:onboarding_skipped", "true");
    localStorage.setItem("dw_onboarding_completed", "1");
    setLocation("/");
  };

  return (
    <OnboardingWizard
      onComplete={handleOnboardingComplete}
      onSkip={handleSkip}
    />
  );
}
