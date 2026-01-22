import { OnboardingWizard, type OnboardingData } from "@/components/onboarding-wizard";
import { InteractiveTour, useInteractiveTour } from "@/components/interactive-tour";
import { useLocation } from "wouter";
import { saveEnhancedOnboarding, isEnhancedOnboardingComplete } from "@/lib/guest-storage";
import { trackEvent, EVENTS, markActivated } from "@/lib/analytics";
import { useEffect } from "react";

export default function EnhancedOnboardingPage() {
  const [, setLocation] = useLocation();
  const { isOpen, startTour, completeTour, skipTour } = useInteractiveTour();

  // If already completed, redirect to main app
  useEffect(() => {
    if (isEnhancedOnboardingComplete()) {
      setLocation("/");
    }
  }, [setLocation]);

  const handleOnboardingComplete = (data: OnboardingData, takeTour: boolean) => {
    // Save onboarding data
    saveEnhancedOnboarding(data);

    // Track completion
    trackEvent(EVENTS.QUICK_SETUP_COMPLETED, {
      hasWellnessGoals: data.wellnessGoals.length > 0,
      hasBirthChart: !!(data.birthDate || data.birthTime || data.birthLocation),
      hasDietaryPrefs: data.dietaryPreferences.length > 0,
      hasFitnessGoals: data.fitnessGoals.length > 0,
      wearablePermission: data.wearableDataPermission,
      takesTour: takeTour,
    });

    // Mark as activated
    markActivated({
      actionType: "onboarding_completed",
      source: "enhanced-onboarding",
      tsLocal: new Date().toISOString(),
    });

    // Mark as returning user
    localStorage.setItem("fts:isReturning", "1");

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
    localStorage.setItem("fts:onboarding_skipped", "true");

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

  return (
    <>
      <OnboardingWizard
        onComplete={handleOnboardingComplete}
        onSkip={handleSkip}
      />
      <InteractiveTour
        open={isOpen}
        onComplete={handleTourComplete}
        onSkip={handleTourSkip}
      />
    </>
  );
}
