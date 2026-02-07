/**
 * Feature flags for controlling new UI/UX features
 * 
 * These flags allow us to toggle features on/off for gradual rollout
 * and easy rollback if issues arise.
 */

export interface FeatureFlags {
  NEW_NAVIGATION: boolean;          // ✅ Context-aware hamburger menu
  NEW_ONBOARDING: boolean;          // ✅ Conversational onboarding flow
  ALL_FEATURES_VIEW: boolean;       // ✅ Searchable feature directory
  AI_PERSONALIZATION: boolean;      // ✅ "Most Used" learning
  LIFE_BLUEPRINT: boolean;          // ⏸️ Wait for PR #3
  HOME_CONSOLIDATION: boolean;      // ✅ Unified home, remove switchboard
  APP_TOUR: boolean;                // ✅ Tooltip-based app tour
}

export const FEATURE_FLAGS: FeatureFlags = {
  NEW_NAVIGATION: true,
  NEW_ONBOARDING: true,
  ALL_FEATURES_VIEW: true,
  AI_PERSONALIZATION: true,
  LIFE_BLUEPRINT: false,
  HOME_CONSOLIDATION: true,
  APP_TOUR: true,
};

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof FeatureFlags): boolean {
  return FEATURE_FLAGS[feature] === true;
}

/**
 * Get all enabled features
 */
export function getEnabledFeatures(): (keyof FeatureFlags)[] {
  return Object.entries(FEATURE_FLAGS)
    .filter(([_, enabled]) => enabled)
    .map(([feature]) => feature as keyof FeatureFlags);
}

/**
 * Check if multiple features are all enabled
 */
export function areAllFeaturesEnabled(...features: (keyof FeatureFlags)[]): boolean {
  return features.every(feature => FEATURE_FLAGS[feature]);
}
