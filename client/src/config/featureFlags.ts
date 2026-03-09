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
  HOME_CONSOLIDATION: boolean;      // ✅ Unified home, remove switchboard
  APP_TOUR: boolean;                // ✅ Tooltip-based app tour
  INTERACTION_ENGINE: boolean;      // ⏸️ Client-side interaction engine (A→B→C shaping, 2-question max)
  CONVERSATION_INSIGHTS: boolean;   // ⏸️ DW-generated insight cards from high-signal exchanges
  DW_INSIGHT_JOURNAL: boolean;      // ⏸️ DW Insight + Journal Intelligence System (PR #2)
  JOURNAL_AUTOGEN: boolean;         // ⏸️ Auto-generate journal entries + insight cards (PR #2)
  ELEVATION_ENGINE: boolean;        // ⏸️ Stagnation detector + 7-day Elevation Plan prompt (PR #3)
  ELEVATION_PLAN: boolean;          // ⏸️ 7-day Elevation Plan builder (PR #5)
  DAILY_CHECKIN: boolean;           // ⏸️ Daily Check-in card (2 questions, Home + Talk) (PR #6)
  REMINDERS: boolean;               // ⏸️ Reminder scheduling and banner (PR #7)
  DW_LEARNS: boolean;               // ✅ Personalization + "DW learns" layer (PR #8)
  WEEKLY_REVIEW: boolean;           // ⏸️ Weekly review + next-week plan proposal (PR #15)
  /**
   * Multi-plan support + plan history (PR #17).
   * Requires ELEVATION_PLAN to be useful — enables /plan-history route, the
   * "View History" link on the plan page, and the allPlans query in useElevationPlan.
   */
  MULTI_PLAN: boolean;
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

/**
 * Resolves the initial value for the ELEVATION_ENGINE feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_elevation_engine', 'true')  — persists across sessions
 *   ?ee=1 query param                                     — one-time, per URL
 */
function resolveElevationEngineFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_elevation_engine") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("ee") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the DAILY_CHECKIN feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_daily_checkin_enabled', 'true')  — persists across sessions
 *   ?dc=1 query param                                          — one-time, per URL
 */
function resolveDailyCheckinFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_daily_checkin_enabled") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("dc") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the JOURNAL_AUTOGEN feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_journal_autogen', 'true')  — persists across sessions
 *   ?ja=1 query param                                    — one-time, per URL
 */
function resolveJournalAutogenFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_journal_autogen") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("ja") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the ELEVATION_PLAN feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_elevation_plan', 'true')  — persists across sessions
 *   ?ep=1 query param                                   — one-time, per URL
 */
function resolveElevationPlanFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_elevation_plan") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("ep") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the WEEKLY_REVIEW feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_weekly_review', 'true')  — persists across sessions
 *   ?wr=1 query param                                  — one-time, per URL
 */
function resolveWeeklyReviewFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_weekly_review") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("wr") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the REMINDERS feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_reminders_enabled', 'true')  — persists across sessions
 *   ?rm=1 query param                                       — one-time, per URL
 */
function resolveRemindersFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_reminders_enabled") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("rm") === "1";
    }
  } catch {
    // URL parsing failed – fail safely
  }

  return false;
}

/**
 * Resolves the initial value for the MULTI_PLAN feature flag.
 * Default is OFF; enable locally via:
 *   localStorage.setItem('dw_multi_plan', 'true')  — persists across sessions
 *   ?mp=1 query param                               — one-time, per URL
 */
function resolveMultiPlanFlag(): boolean {
  try {
    if (typeof localStorage !== "undefined" && localStorage.getItem("dw_multi_plan") === "true") {
      return true;
    }
  } catch {
    // Blocked storage or restricted environment – ignore and fall back to query param
  }

  try {
    if (typeof location !== "undefined") {
      return new URLSearchParams(location.search).get("mp") === "1";
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
  HOME_CONSOLIDATION: true,
  APP_TOUR: true,
  INTERACTION_ENGINE: resolveInteractionEngineFlag(),
  CONVERSATION_INSIGHTS: resolveConversationInsightsFlag(),
  DW_INSIGHT_JOURNAL: resolveDwInsightJournalFlag(),
  JOURNAL_AUTOGEN: resolveJournalAutogenFlag(),
  ELEVATION_ENGINE: resolveElevationEngineFlag(),
  ELEVATION_PLAN: resolveElevationPlanFlag(),
  DAILY_CHECKIN: resolveDailyCheckinFlag(),
  REMINDERS: resolveRemindersFlag(),
  DW_LEARNS: true,
  WEEKLY_REVIEW: resolveWeeklyReviewFlag(),
  MULTI_PLAN: resolveMultiPlanFlag(),
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
