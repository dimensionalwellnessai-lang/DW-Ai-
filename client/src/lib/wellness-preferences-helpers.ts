/**
 * Shared helpers for the Wellness Preferences save/load cycle.
 *
 * Extracted from the page component so tests can exercise the exact same
 * normalisation and payload-building logic used at runtime.
 */

export interface WellnessPreferencesData {
  id: string;
  beliefSystem?: string | null;
  traditions?: string[] | null;
  otherTradition?: string | null;
  meditationEnabled: boolean | null;
  journalEnabled: boolean | null;
  astrologyEnabled: boolean | null;
  tarotEnabled: boolean | null;
  energyWorkEnabled: boolean | null;
  useAstrologyInGuidance: boolean | null;
  useNumerologyInGuidance: boolean | null;
}

export interface WellnessFormState {
  beliefSystem: string;
  traditions: string[];
  otherTradition: string;
  meditationEnabled: boolean;
  journalEnabled: boolean;
  astrologyEnabled: boolean;
  tarotEnabled: boolean;
  energyWorkEnabled: boolean;
  useAstrologyInGuidance: boolean;
  useNumerologyInGuidance: boolean;
}

/**
 * Converts a nullable API response into a fully-defined form state,
 * applying schema defaults for any null boolean values.
 */
export function normaliseApiResponse(prefs: WellnessPreferencesData): WellnessFormState {
  return {
    beliefSystem: prefs.beliefSystem || "",
    traditions: prefs.traditions || [],
    otherTradition: prefs.otherTradition || "",
    meditationEnabled: prefs.meditationEnabled ?? true,
    journalEnabled: prefs.journalEnabled ?? true,
    astrologyEnabled: prefs.astrologyEnabled ?? false,
    tarotEnabled: prefs.tarotEnabled ?? false,
    energyWorkEnabled: prefs.energyWorkEnabled ?? false,
    useAstrologyInGuidance: prefs.useAstrologyInGuidance ?? false,
    useNumerologyInGuidance: prefs.useNumerologyInGuidance ?? false,
  };
}

/**
 * Assembles the PATCH/POST payload from current form state.
 * Clears traditions when beliefSystem is not "religious" to prevent stale data.
 */
export function buildSavePayload(state: WellnessFormState): Omit<WellnessPreferencesData, "id"> {
  return {
    beliefSystem: state.beliefSystem,
    traditions: state.beliefSystem === "religious" ? state.traditions : [],
    otherTradition: state.beliefSystem === "religious" ? state.otherTradition : "",
    meditationEnabled: state.meditationEnabled,
    journalEnabled: state.journalEnabled,
    astrologyEnabled: state.astrologyEnabled,
    tarotEnabled: state.tarotEnabled,
    energyWorkEnabled: state.energyWorkEnabled,
    useAstrologyInGuidance: state.useAstrologyInGuidance,
    useNumerologyInGuidance: state.useNumerologyInGuidance,
  };
}
