export type CurrentType =
  | "gut"
  | "wave"
  | "spark"
  | "will"
  | "voice"
  | "mind"
  | "flow"
  | "drive"
  | "light";

export type CurrentState = "hardwired" | "variable" | "open";
export type EnergyType = "Builder" | "Guide" | "Initiator" | "Observer";
export type DecisionCompass = "Gut" | "Wave" | "Spark" | "Will" | "Self";

export interface BirthCircuitInput {
  birthDate?: string | null;
  birthTime?: string | null;
  birthPlace?: string | null;
}

export interface EnergyCurrentsResult {
  energyType: EnergyType;
  decisionCompass: DecisionCompass;
  currents: Record<CurrentType, CurrentState>;
  activeCurrents: string[];
  moonPhase: string;
}

const MERCURY_RETROGRADE_WINDOWS: Record<number, Array<{ start: string; end: string }>> = {
  2026: [
    { start: "2026-03-25T00:00:00Z", end: "2026-04-14T23:59:59Z" },
    { start: "2026-08-05T00:00:00Z", end: "2026-08-28T23:59:59Z" },
  ],
};

const CURRENT_ORDER: CurrentType[] = [
  "gut",
  "wave",
  "spark",
  "will",
  "voice",
  "mind",
  "flow",
  "drive",
  "light",
];

function stableHash(seed: string): number {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash >>> 0);
}

export function getCurrentMoonPhase(now = new Date()): string {
  const knownNewMoon = new Date("2024-01-11T00:00:00Z").getTime();
  const daysSince = (now.getTime() - knownNewMoon) / 86400000;
  const phases = [
    "New Moon",
    "Waxing Crescent",
    "First Quarter",
    "Waxing Gibbous",
    "Full Moon",
    "Waning Gibbous",
    "Last Quarter",
    "Waning Crescent",
  ] as const;
  const idx = Math.floor((daysSince % 29.53) / (29.53 / phases.length)) % phases.length;
  return phases[(idx + phases.length) % phases.length];
}

export function isMercuryRetrogradeWindow(now = new Date()): boolean {
  const year = now.getFullYear();
  const t = now.getTime();
  const windows = MERCURY_RETROGRADE_WINDOWS[year] ?? [];
  return windows.some(({ start, end }) => {
    const startTs = new Date(start).getTime();
    const endTs = new Date(end).getTime();
    return t >= startTs && t <= endTs;
  });
}

export function calculateEnergyCurrents(input: BirthCircuitInput, now = new Date()): EnergyCurrentsResult {
  const normalizedSeed = [input.birthDate ?? "", input.birthTime ?? "", input.birthPlace ?? ""]
    .join("|")
    .toLowerCase()
    .trim();

  const hash = stableHash(normalizedSeed || "dw-default-circuit");

  const energyTypes: EnergyType[] = ["Builder", "Guide", "Initiator", "Observer"];
  const decisionCompass: DecisionCompass[] = ["Gut", "Wave", "Spark", "Will", "Self"];

  const currents = {} as Record<CurrentType, CurrentState>;
  for (let i = 0; i < CURRENT_ORDER.length; i += 1) {
    const bucket = (hash + i * 17) % 9;
    currents[CURRENT_ORDER[i]] = bucket <= 2 ? "hardwired" : bucket <= 5 ? "variable" : "open";
  }

  const moonPhase = getCurrentMoonPhase(now);
  const activeCurrents: string[] = [];

  if (moonPhase === "Full Moon" || moonPhase === "Waxing Gibbous") {
    activeCurrents.push("Wave Current");
  }
  if (isMercuryRetrogradeWindow(now)) {
    activeCurrents.push("Mercury Retrograde");
    activeCurrents.push("Voice Current Static");
  }

  return {
    energyType: energyTypes[hash % energyTypes.length],
    decisionCompass: decisionCompass[hash % decisionCompass.length],
    currents,
    activeCurrents,
    moonPhase,
  };
}
