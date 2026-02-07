import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserInterest = 
  | 'get-healthier'
  | 'stay-organized'
  | 'build-habits'
  | 'meal-planning'
  | 'reflect-journal'
  | 'explore-wellness'
  | 'manage-money'
  | 'just-exploring';

export type OnboardingStep = 
  | 'welcome'
  | 'interests'
  | 'fitness-setup'
  | 'meal-setup'
  | 'wellness-setup'
  | 'organization-setup'
  | 'complete';

interface OnboardingState {
  completed: boolean;
  interests: UserInterest[];
  currentStep: OnboardingStep;
  skippedSteps: OnboardingStep[];
  completionPercentage: number;
  
  setInterests: (interests: UserInterest[]) => void;
  setCurrentStep: (step: OnboardingStep) => void;
  skipStep: (step: OnboardingStep) => void;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
  calculateCompletionPercentage: () => number;
}

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
      completed: false,
      interests: [],
      currentStep: 'welcome',
      skippedSteps: [],
      completionPercentage: 0,
      
      setInterests: (interests: UserInterest[]) => {
        set({ interests });
        get().calculateCompletionPercentage();
      },
      
      setCurrentStep: (step: OnboardingStep) => {
        set({ currentStep: step });
        get().calculateCompletionPercentage();
      },
      
      skipStep: (step: OnboardingStep) => {
        set((state) => {
          // Prevent duplicate skipped steps
          if (state.skippedSteps.includes(step)) {
            return state;
          }
          return {
            skippedSteps: [...state.skippedSteps, step],
          };
        });
        get().calculateCompletionPercentage();
      },
      
      completeOnboarding: () => {
        set({ 
          completed: true,
          currentStep: 'complete',
          completionPercentage: 100,
        });
      },
      
      resetOnboarding: () => {
        set({
          completed: false,
          interests: [],
          currentStep: 'welcome',
          skippedSteps: [],
          completionPercentage: 0,
        });
      },
      
      calculateCompletionPercentage: () => {
        const state = get();
        if (state.completed) return 100;
        
        // Calculate based on interests selected and steps completed
        const totalSteps = state.interests.length + 2; // interests + welcome + complete
        const completedSteps = state.currentStep === 'welcome' ? 0 : 
                               state.currentStep === 'complete' ? totalSteps : 
                               state.skippedSteps.length + 1;
        
        // Clamp percentage to [0, 100]
        const percentage = Math.min(100, Math.max(0, Math.round((completedSteps / totalSteps) * 100)));
        set({ completionPercentage: percentage });
        return percentage;
      },
    }),
    {
      name: 'dw-onboarding-storage',
    }
  )
);
