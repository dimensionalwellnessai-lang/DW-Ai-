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
  INTERACTION_ENGINE: boolean;      // ⏸️ Client-side interaction engine (A→B→C shaping, 2-question max)
  CONVERSATION_INSIGHTS: boolean;   // ⏸️ DW-generated insight cards from high-signal exchanges
  DW_INSIGHT_JOURNAL: boolean;      // ⏸️ DW Insight + Journal Intelligence System (PR #2)
  ELEVATION_PLAN: boolean;          // ✅ Elevation Plan Builder 7-day (PR #5)
}

/**
 * Resolves the initial value for the INTERACTION_ENGINE feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_interaction_engine', 'true')  — persists across sessions
 *   ?ie=1 query param                                       — one-time, per URL
 */
function resolveInteractionEngineFlag(): boolean {
  if (typeof localStorage === "undefined") return false;
  if (localStorage.getItem("dw_interaction_engine") === "true") return true;
  if (typeof location !== "undefined") {
    return new URLSearchParams(location.search).get("ie") === "1";
  }
  return false;
}

/**
 * Resolves the initial value for the CONVERSATION_INSIGHTS feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_conversation_insights_enabled', 'true')  — persists across sessions
 *   ?ci=1 query param                                                  — one-time, per URL
 */
function resolveConversationInsightsFlag(): boolean {
  // Check persisted flag first (localStorage may throw in blocked-storage environments)
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_conversation_insights_enabled") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  // Always attempt the URL param check as a fallback
  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("ci") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the DW_INSIGHT_JOURNAL feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_insight_journal_enabled', 'true')  — persists across sessions
 *   ?dij=1 query param                                           — one-time, per URL
 */
function resolveDwInsightJournalFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_insight_journal_enabled") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("dij") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

export const FEATURE_FLAGS: FeatureFlags = {
  NEW_NAVIGATION: true,
  NEW_ONBOARDING: true,
  ALL_FEATURES_VIEW: true,
  AI_PERSONALIZATION: true,
  LIFE_BLUEPRINT: false,
  HOME_CONSOLIDATION: true,
  APP_TOUR: true,
  INTERACTION_ENGINE: resolveInteractionEngineFlag(),
  CONVERSATION_INSIGHTS: resolveConversationInsightsFlag(),
  DW_INSIGHT_JOURNAL: resolveDwInsightJournalFlag(),
  ELEVATION_PLAN: true,
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
