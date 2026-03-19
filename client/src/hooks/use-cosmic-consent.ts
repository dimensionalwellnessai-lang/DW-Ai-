import { useState, useCallback } from "react";

export const COSMIC_CONSENT_KEY = "dw_cosmic_consent";

export interface CosmicConsent {
  useAstrologyInGuidance: boolean;
  useNumerologyInGuidance: boolean;
}

const DEFAULT_CONSENT: CosmicConsent = {
  useAstrologyInGuidance: false,
  useNumerologyInGuidance: false,
};

export function loadConsent(): CosmicConsent {
  try {
    return JSON.parse(localStorage.getItem(COSMIC_CONSENT_KEY) ?? "null") ?? DEFAULT_CONSENT;
  } catch {
    return DEFAULT_CONSENT;
  }
}

export function saveConsent(consent: CosmicConsent): void {
  try {
    localStorage.setItem(COSMIC_CONSENT_KEY, JSON.stringify(consent));
  } catch {
    // Storage may be unavailable
  }
}

/**
 * Hook for reading and updating the user's cosmic-guidance consent preferences.
 * Consent is stored in localStorage under `dw_cosmic_consent` and drives both
 * the Settings UI and the AI chat system prompt.
 */
export function useCosmicConsent() {
  const [consent, setConsent] = useState<CosmicConsent>(loadConsent);

  const update = useCallback((key: keyof CosmicConsent, value: boolean) => {
    setConsent(prev => {
      const next = { ...prev, [key]: value };
      saveConsent(next);
      return next;
    });
  }, []);

  return { consent, update };
}

/** Read-only helper – returns the stored consent without subscribing to React state. */
export function getCosmicConsent(): CosmicConsent {
  return loadConsent();
}
