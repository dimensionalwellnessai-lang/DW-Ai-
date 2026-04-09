import { OnboardingWizard, type OnboardingData } from "@/components/onboarding-wizard";
import { useLocation } from "wouter";
import { saveEnhancedOnboarding, isEnhancedOnboardingComplete } from "@/lib/guest-storage";
import { trackEvent, EVENTS, markActivated } from "@/lib/analytics";
import { useState, useLayoutEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { usePageMeta } from "@/hooks/use-page-meta";

export default function EnhancedOnboardingPage() {
  usePageMeta("Getting Started", "Set up your personalized Dimensional Wellness experience.");
  const [, setLocation] = useLocation();
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

    // Bridge birth data → Cosmic page
    if (data.birthDate) {
      const existingBirthChart = JSON.parse(localStorage.getItem("dw_birth_chart") || "null");
      if (!existingBirthChart?.birthDate) {
        localStorage.setItem("dw_birth_chart", JSON.stringify({
          birthDate: data.birthDate,
          birthTime: data.birthTime ?? "",
          birthPlace: data.birthLocation ?? "",
          houseSystem: "whole-sign",
          zodiacSystem: "tropical",
        }));
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
      } catch { /* non-fatal */ }
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
        lifeAreaDetails: {
          birthDate: data.birthDate,
          birthTime: data.birthTime,
          birthLocation: data.birthLocation,
          profession: data.profession,
        },
        systemName: `${data.name ?? "My"} Life System`,
      });
    } catch { /* non-fatal — onboarding still completes locally */ }

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
