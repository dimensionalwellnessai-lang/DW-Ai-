import { getGuestData, getBodyProfile, getSoftOnboardingMood, type SoftOnboardingMood } from "./guest-storage";

export type EnergyLevel = "low" | "medium" | "high";
export type ClarityLevel = "low" | "medium" | "high";

const CLARITY_STORAGE_KEY = "fts_current_clarity";

export interface EnergyContext {
  energy: EnergyLevel;
  mood: string | null;
  clarity: ClarityLevel;
  bodyGoal: string | null;
  hasBodyScan: boolean;
  recentSkips: number;
  recentAccepts: number;
  energySource: "mood_log" | "body_scan" | "soft_onboarding" | "default";
}

export function mapNumericToLevel(value: number, max: number = 10): EnergyLevel | ClarityLevel {
  const normalized = value / max;
  if (normalized <= 0.33) return "low";
  if (normalized <= 0.66) return "medium";
  return "high";
}

export function saveCurrentClarity(clarityValue: number, max: number = 10): void {
  try {
    const level = mapNumericToLevel(clarityValue, max);
    localStorage.setItem(CLARITY_STORAGE_KEY, level);
  } catch {
    // Ignore storage errors
  }
}

export function getCurrentClarity(): ClarityLevel {
  try {
    const stored = localStorage.getItem(CLARITY_STORAGE_KEY);
    if (stored === "low" || stored === "medium" || stored === "high") {
      return stored;
    }
  } catch {
    // Ignore storage errors
  }
  return "medium";
}

function mapBodyScanEnergy(energyLevel: string): EnergyLevel {
  switch (energyLevel) {
    case "low":
      return "low";
    case "fluctuating":
      return "medium";
    case "stable":
      return "medium";
    case "high":
      return "high";
    default:
      return "medium";
  }
}

function mapSoftOnboardingMood(mood: SoftOnboardingMood): EnergyLevel {
  switch (mood) {
    case "heavy":
    case "scattered":
      return "low";
    case "unsure":
    case "pushing":
      return "medium";
    case "calm":
      return "high";
    default:
      return "medium";
  }
}

export function getCurrentEnergyContext(): EnergyContext {
  const guestData = getGuestData();
  const bodyProfile = getBodyProfile();
  const softMood = getSoftOnboardingMood();
  
  let energy: EnergyLevel = "medium";
  let clarity: ClarityLevel = getCurrentClarity();
  let mood: string | null = null;
  let energySource: EnergyContext["energySource"] = "default";
  
  if (guestData?.mood) {
    mood = guestData.mood;
  }
  
  if (softMood) {
    energy = mapSoftOnboardingMood(softMood);
    mood = softMood;
    energySource = "soft_onboarding";
    if (softMood === "scattered") {
      clarity = "low";
    }
  }
  
  if (bodyProfile?.energyLevel) {
    energy = mapBodyScanEnergy(bodyProfile.energyLevel);
    energySource = "body_scan";
  }
  
  return {
    energy,
    mood,
    clarity,
    bodyGoal: bodyProfile?.bodyGoal || null,
    hasBodyScan: !!bodyProfile?.bodyGoal,
    recentSkips: 0,
    recentAccepts: 0,
    energySource,
  };
}

export function getEnergyContextForAPI(): Record<string, unknown> {
  const ctx = getCurrentEnergyContext();
  return {
    currentEnergy: ctx.energy,
    currentMood: ctx.mood,
    currentClarity: ctx.clarity,
    bodyGoal: ctx.bodyGoal,
    hasBodyScan: ctx.hasBodyScan,
    energySource: ctx.energySource,
  };
}

export function getEnergyToneGuidance(energy: EnergyLevel): string {
  switch (energy) {
    case "low":
      return `CURRENT ENERGY: LOW
The user appears to have low energy right now.
- Keep suggestions to 1-2 options maximum
- Use gentle, slower pacing
- Prioritize grounding, recovery, or simplicity
- Avoid planning stacks or future pressure
- Example tone: "Let's keep this light today. Based on your energy, one small step is enough."`;
    
    case "medium":
      return `CURRENT ENERGY: MEDIUM
The user has moderate capacity today.
- Offer balanced, collaborative options
- Light planning is okay, nothing heavy
- Use supportive, balanced tone
- Example tone: "You've got some capacity today. We can do a little, or keep it simple. What feels right?"`;
    
    case "high":
      return `CURRENT ENERGY: HIGH
The user's energy is up today.
- Can offer more opportunities (still not demands)
- Remind them they can save energy too
- Avoid stacking too many actions
- Use encouraging but grounded tone
- Example tone: "Your energy is up today. We could use it, or save it — either works. Want to explore a couple options?"`;
    
    default:
      return "";
  }
}

export function getTransparencyPrefix(energy: EnergyLevel, hasBodyScan: boolean): string {
  if (!hasBodyScan && energy === "medium") {
    return "";
  }
  
  const sources: string[] = [];
  if (hasBodyScan) sources.push("your body scan");
  
  switch (energy) {
    case "low":
      return sources.length > 0 
        ? `Based on ${sources.join(" and ")}, your energy seems lower right now. `
        : "Your energy seems lower right now. ";
    case "high":
      return sources.length > 0
        ? `Based on ${sources.join(" and ")}, your energy is up today. `
        : "Your energy is up today. ";
    default:
      return "";
  }
}
