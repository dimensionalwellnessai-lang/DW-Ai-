import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FeatureFlags {
  NEW_NAVIGATION: boolean;
  NEW_ONBOARDING: boolean;
  LIFE_BLUEPRINT: boolean;
  AI_LEARNING: boolean;
  HOUSEHOLD_TASKS: boolean;
  VOICE_INTERACTION: boolean;
  PROACTIVE_NUDGES: boolean;
  WELLNESS_DASHBOARD: boolean;
  UNIFIED_SEARCH: boolean;
}

interface FeaturesStore {
  features: FeatureFlags;
  toggleFeature: (key: keyof FeatureFlags, value: boolean) => void;
  isFeatureEnabled: (key: keyof FeatureFlags) => boolean;
  resetFeatures: () => void;
}

const defaultFeatures: FeatureFlags = {
  NEW_NAVIGATION: true,
  NEW_ONBOARDING: true,
  LIFE_BLUEPRINT: false,
  AI_LEARNING: false,
  HOUSEHOLD_TASKS: false,
  VOICE_INTERACTION: true,
  PROACTIVE_NUDGES: true,
  WELLNESS_DASHBOARD: true,
  UNIFIED_SEARCH: true,
};

export const useFeaturesStore = create<FeaturesStore>()(
  persist(
    (set, get) => ({
      features: defaultFeatures,
      
      toggleFeature: (key, value) =>
        set((state) => ({
          features: { ...state.features, [key]: value },
        })),
      
      isFeatureEnabled: (key) => get().features[key],
      
      resetFeatures: () => set({ features: defaultFeatures }),
    }),
    {
      name: 'features-storage',
    }
  )
);
