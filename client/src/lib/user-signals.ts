import type { SwitchId } from "./switch-storage";
import type { TimeBand, Mode } from "@/config/plan-library";

export type EnergyLevel = "low" | "medium" | "high";
export type StressLevel = "low" | "medium" | "high";

export interface UserFlags {
  overwhelmFlag: boolean;
  timeChaosFlag: boolean;
  moneyStressFlag: boolean;
  relationshipDrainFlag: boolean;
  envMessFlag: boolean;
  lowEnergyFlag: boolean;
  lowMotivationFlag: boolean;
  sleepDebtFlag: boolean;
}

export interface FlagCounts {
  overwhelm: number;
  timeChaos: number;
  moneyStress: number;
  relationshipDrain: number;
  envMess: number;
  lowEnergy: number;
  lowMotivation: number;
  sleepDebt: number;
}

export interface UserSignals {
  energyLevel: EnergyLevel;
  stressLevel: StressLevel;
  timeBand: TimeBand;
  primarySwitchId: SwitchId | null;
  supportSwitchId: SwitchId | null;
  modeBias: Mode;
  flags: UserFlags;
  flagCounts14d: FlagCounts;
  lastUpdated: number;
}

const STORAGE_KEY = "fts_user_signals";

const DEFAULT_FLAGS: UserFlags = {
  overwhelmFlag: false,
  timeChaosFlag: false,
  moneyStressFlag: false,
  relationshipDrainFlag: false,
  envMessFlag: false,
  lowEnergyFlag: false,
  lowMotivationFlag: false,
  sleepDebtFlag: false,
};

const DEFAULT_FLAG_COUNTS: FlagCounts = {
  overwhelm: 0,
  timeChaos: 0,
  moneyStress: 0,
  relationshipDrain: 0,
  envMess: 0,
  lowEnergy: 0,
  lowMotivation: 0,
  sleepDebt: 0,
};

const DEFAULT_SIGNALS: UserSignals = {
  energyLevel: "medium",
  stressLevel: "medium",
  timeBand: "small",
  primarySwitchId: null,
  supportSwitchId: null,
  modeBias: "training",
  flags: { ...DEFAULT_FLAGS },
  flagCounts14d: { ...DEFAULT_FLAG_COUNTS },
  lastUpdated: Date.now(),
};

export function getUserSignals(): UserSignals {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return { ...DEFAULT_SIGNALS, ...JSON.parse(stored) };
    }
  } catch (e) {
    console.error("Error reading user signals:", e);
  }
  return { ...DEFAULT_SIGNALS };
}

export function saveUserSignals(signals: Partial<UserSignals>): void {
  const current = getUserSignals();
  const updated = {
    ...current,
    ...signals,
    lastUpdated: Date.now(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
}

export function updateEnergyLevel(level: EnergyLevel): void {
  const current = getUserSignals();
  const updates: Partial<UserSignals> = { energyLevel: level };
  
  if (level === "low") {
    updates.flags = {
      ...current.flags,
      lowEnergyFlag: true,
    };
    updates.modeBias = "restoring";
  } else if (level === "medium" || level === "high") {
    updates.flags = {
      ...current.flags,
      lowEnergyFlag: false,
    };
    if (!current.flags.overwhelmFlag && current.stressLevel !== "high") {
      updates.modeBias = "training";
    }
  }
  saveUserSignals(updates);
}

export function updateTimeBand(band: TimeBand): void {
  saveUserSignals({ timeBand: band });
}

export function setPrimarySwitches(primary: SwitchId, support?: SwitchId): void {
  saveUserSignals({
    primarySwitchId: primary,
    supportSwitchId: support || null,
  });
}

export function setFlag(flagKey: keyof UserFlags, value: boolean): void {
  const current = getUserSignals();
  saveUserSignals({
    flags: {
      ...current.flags,
      [flagKey]: value,
    },
  });
}

export function incrementFlagCount(countKey: keyof FlagCounts): void {
  const current = getUserSignals();
  saveUserSignals({
    flagCounts14d: {
      ...current.flagCounts14d,
      [countKey]: (current.flagCounts14d[countKey] || 0) + 1,
    },
  });
}

export function deriveRecommendedSwitch(signals: UserSignals): { 
  recommendedSwitchId: SwitchId; 
  alternativeSwitchId: SwitchId;
  reason: string;
} {
  const { energyLevel, stressLevel, flags, flagCounts14d, primarySwitchId, supportSwitchId } = signals;

  if (energyLevel === "low") {
    if (stressLevel === "high") {
      return {
        recommendedSwitchId: "mind",
        alternativeSwitchId: "body",
        reason: "Your mind's overloaded — let's quiet the noise so you can move."
      };
    }
    return {
      recommendedSwitchId: "body",
      alternativeSwitchId: "mind",
      reason: "Your energy is low — let's charge the battery first."
    };
  }

  if (flags.overwhelmFlag || flags.timeChaosFlag) {
    return {
      recommendedSwitchId: "time",
      alternativeSwitchId: "mind",
      reason: "Structure reduces overwhelm fast — one block changes the whole day."
    };
  }

  if (flagCounts14d.moneyStress >= 2 || flags.moneyStressFlag) {
    return {
      recommendedSwitchId: "money",
      alternativeSwitchId: "time",
      reason: "Clarity lowers money stress — we'll take one small control step."
    };
  }

  if (flags.relationshipDrainFlag) {
    return {
      recommendedSwitchId: "relationships",
      alternativeSwitchId: "mind",
      reason: "A boundary or connection move can stop the drain."
    };
  }

  if (flags.envMessFlag) {
    return {
      recommendedSwitchId: "environment",
      alternativeSwitchId: "time",
      reason: "Removing friction makes everything easier to start."
    };
  }

  return {
    recommendedSwitchId: primarySwitchId || "body",
    alternativeSwitchId: supportSwitchId || "mind",
    reason: primarySwitchId 
      ? `Based on your focus, let's train your ${primarySwitchId} switch.`
      : "Energy first. Then everything else."
  };
}

export function deriveMode(signals: UserSignals): Mode {
  if (signals.energyLevel === "low" || signals.flags.lowEnergyFlag) {
    return "restoring";
  }
  if (signals.stressLevel === "high" || signals.flags.overwhelmFlag) {
    return "restoring";
  }
  return signals.modeBias || "training";
}
