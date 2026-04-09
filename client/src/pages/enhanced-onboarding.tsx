import { OnboardingWizard, type OnboardingData } from "@/components/onboarding-wizard";
import { OnboardingValuePreview } from "@/components/onboarding-value-preview";
import { useInteractiveTour } from "@/components/interactive-tour";
import { useLocation } from "wouter";
import { saveEnhancedOnboarding, isEnhancedOnboardingComplete } from "@/lib/guest-storage";
import { trackEvent, EVENTS, markActivated } from "@/lib/analytics";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useState, useLayoutEffect } from "react";

export default function EnhancedOnboardingPage() {
  const [, setLocation] = useLocation();
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();
  const [showPreview, setShowPreview] = useState(isFeatureEnabled("ONBOARDING_VALUE_PREVIEW"));
  const [redirecting, setRedirecting] = useState(false);

  // If already completed, redirect to main app before any paint to avoid a flash
  useLayoutEffect(() => {
    if (isEnhancedOnboardingComplete()) {
      setRedirecting(true);
      setLocation("/");
    }
  }, [setLocation]);

  if (redirecting) return null;

  const handleOnboardingComplete = (data: OnboardingData, takeTour: boolean) => {
    // Save onboarding data
    saveEnhancedOnboarding(data);

    // Bridge birth data → Cosmic page so users don't have to re-enter it
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

    // Track completion - simplified event without mismatched payload
    trackEvent(EVENTS.QUICK_SETUP_COMPLETED, {
      completedAt: Date.now(),
      takesTour: takeTour,
    } as any); // Using 'any' to avoid payload mismatch - this is a new onboarding flow

    // Mark as activated
    markActivated({
      actionType: "starter_object_created",
      source: "welcome",
      tsLocal: new Date().toISOString(),
    });

    // Mark as returning user
    localStorage.setItem("dw:isReturning", "1");

    if (takeTour) {
      // Start tour
      startTour();
    } else {
      // Skip to main app
      setLocation("/");
    }
  };

  const handleSkip = () => {
    // Save as skipped
    saveEnhancedOnboarding({
      completedAt: Date.now(),
    });

    // Mark as skipped to prevent re-showing
    localStorage.setItem("dw:onboarding_skipped", "true");

    // Navigate to app
    setLocation("/");
  };

  const handleTourComplete = () => {
    // Mark tour as completed
    saveEnhancedOnboarding({ tourCompleted: true });
    completeTour();

    // Navigate to main app
    setLocation("/");
  };

  const handleTourSkip = () => {
    skipTour();
    // Navigate to main app
    setLocation("/");
  };

  // Show value preview layer before the wizard when the feature flag is on
  if (showPreview) {
    return (
      <OnboardingValuePreview
        onBegin={() => setShowPreview(false)}
        onSkip={handleSkip}
      />
    );
  }

  return (
    <>
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={handleSkip}
      />
    </>
  );
}
