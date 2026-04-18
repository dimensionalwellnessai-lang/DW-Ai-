// Three-level pillar taxonomy for the Life System.
//
// Level meaning:
//   - core       → "The systems every life needs to stay stable, functional, and grounded."
//                  9 pillars. Always on. The user can't turn them off — only choose how
//                  intentionally they manage them.
//   - expression → "The areas where your identity, priorities, and lifestyle take shape."
//                  5 pillars. User opts in to which ones are part of their system.
//   - creation   → "What you're actively building and putting into the world."
//                  1 container pillar (Projects) with user-defined sub-projects.
//
// DW's tone shifts per level:
//   - core       → "Let's stabilize this."
//   - expression → "Let's align this."
//   - creation   → "Let's execute this."
import type { LifeSystemLevel } from "./schema";

export type LifeSystemPillarId =
  // core
  | "foundation"
  | "daily_rhythm"
  | "physical_health"
  | "mental_emotional"
  | "physical_environment"
  | "social_environment"
  | "responsibility"
  | "recovery"
  | "growth"
  // expression
  | "spiritual"
  | "work_school"
  | "money"
  | "aliveness"
  | "purpose"
  // creation
  | "projects";

export interface PillarDefinition {
  id: LifeSystemPillarId;
  level: LifeSystemLevel;
  label: string;
  shortLabel?: string;
  /** One-line summary shown on the My Life System card. */
  summary: string;
  /** The single warm question DW opens with during onboarding for this pillar. */
  openingQuestion: string;
  /** Whether the user can turn this pillar on or off. Core = false, Expression = true, Creation = false (container). */
  toggleable: boolean;
  /** Default-on at adoption time. */
  defaultOn: boolean;
  /** Tailwind/HSL accent for cards and ring nodes. */
  color: string;
  /** Lucide icon name (looked up on the client). */
  icon: string;
}

export const LEVEL_META: Record<LifeSystemLevel, {
  label: string;
  tagline: string;
  toneVerb: string; // stabilize / align / execute
  toneSentence: string;
  ringColor: string;
}> = {
  core: {
    label: "Core System",
    tagline: "The systems every life needs to stay stable, functional, and grounded.",
    toneVerb: "stabilize",
    toneSentence: "Let's stabilize this.",
    ringColor: "hsl(252 76% 58%)",
  },
  expression: {
    label: "Life Expression",
    tagline: "The areas where your identity, priorities, and lifestyle take shape.",
    toneVerb: "align",
    toneSentence: "Let's align this.",
    ringColor: "hsl(186 84% 56%)",
  },
  creation: {
    label: "Creation",
    tagline: "What you're actively building and putting into the world.",
    toneVerb: "execute",
    toneSentence: "Let's execute this.",
    ringColor: "hsl(38 92% 60%)",
  },
};

export const PILLARS: PillarDefinition[] = [
  // ── Core (9) ───────────────────────────────────────────────────────────────
  {
    id: "foundation",
    level: "core",
    label: "Foundation",
    summary: "Identity, laws, and the non-negotiables you live by.",
    openingQuestion: "When you imagine the most grounded version of you, what is true about how you live?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Anchor",
  },
  {
    id: "daily_rhythm",
    level: "core",
    label: "Daily Rhythm",
    summary: "Wake, work, recover, sleep — the shape of your day.",
    openingQuestion: "Walk me through a normal day for you right now — when you wake, when you work, when you rest.",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Sunrise",
  },
  {
    id: "physical_health",
    level: "core",
    label: "Physical Health",
    summary: "How you move, eat, and treat the body that carries you.",
    openingQuestion: "How do you usually move your body, and how does eating fit into your week?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Heart",
  },
  {
    id: "mental_emotional",
    level: "core",
    label: "Mental & Emotional",
    summary: "How you think, feel, regulate, and stay clear.",
    openingQuestion: "When your head gets noisy or heavy, what actually helps you come back?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Brain",
  },
  {
    id: "physical_environment",
    level: "core",
    label: "Physical Environment",
    summary: "The spaces around you and how they make you feel.",
    openingQuestion: "What does the space around you feel like right now?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Home",
  },
  {
    id: "social_environment",
    level: "core",
    label: "Social Environment",
    summary: "Who you spend time with and how it shapes you.",
    openingQuestion: "Who lifts you up, and who tends to drain you?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Users",
  },
  {
    id: "responsibility",
    level: "core",
    label: "Responsibility",
    summary: "What you owe yourself, others, and your future.",
    openingQuestion: "What are you carrying right now that has to get done — even when no one's watching?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "ShieldCheck",
  },
  {
    id: "recovery",
    level: "core",
    label: "Recovery",
    summary: "The tools that bring you back when life gets heavy.",
    openingQuestion: "When you've gone too hard, what brings you back?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Waves",
  },
  {
    id: "growth",
    level: "core",
    label: "Growth",
    summary: "How you keep evolving — learning, reflecting, becoming.",
    openingQuestion: "What's something you're learning or trying to grow into right now?",
    toggleable: false,
    defaultOn: true,
    color: "252 76% 58%",
    icon: "Sprout",
  },

  // ── Expression (5) ─────────────────────────────────────────────────────────
  {
    id: "spiritual",
    level: "expression",
    label: "Spiritual",
    summary: "Your relationship with meaning, source, and the unseen.",
    openingQuestion: "What does the spiritual side of life look like for you — if anything?",
    toggleable: true,
    defaultOn: true,
    color: "186 84% 56%",
    icon: "Sparkles",
  },
  {
    id: "work_school",
    level: "expression",
    label: "Work & School",
    summary: "How you spend your weekday hours.",
    openingQuestion: "What does your work or school week actually look like right now?",
    toggleable: true,
    defaultOn: true,
    color: "186 84% 56%",
    icon: "Briefcase",
  },
  {
    id: "money",
    level: "expression",
    label: "Money",
    summary: "How you earn, spend, save, and feel about it.",
    openingQuestion: "How do you feel about money right now — tight, steady, growing?",
    toggleable: true,
    defaultOn: true,
    color: "186 84% 56%",
    icon: "Wallet",
  },
  {
    id: "aliveness",
    level: "expression",
    label: "Aliveness",
    summary: "The things that make you feel most yourself.",
    openingQuestion: "When was the last time you felt fully alive — what were you doing?",
    toggleable: true,
    defaultOn: true,
    color: "186 84% 56%",
    icon: "Flame",
  },
  {
    id: "purpose",
    level: "expression",
    label: "Purpose",
    summary: "Who you're becoming. What your life is about.",
    openingQuestion: "If you let yourself answer honestly — what is your life about right now?",
    toggleable: true,
    defaultOn: true,
    color: "186 84% 56%",
    icon: "Compass",
  },

  // ── Creation (1 container) ─────────────────────────────────────────────────
  {
    id: "projects",
    level: "creation",
    label: "Projects",
    summary: "What you're actively building right now.",
    openingQuestion: "What are you actually building right now — name 1 to 3 things.",
    toggleable: false,
    defaultOn: true,
    color: "38 92% 60%",
    icon: "Hammer",
  },
];

export const PILLAR_BY_ID: Record<LifeSystemPillarId, PillarDefinition> =
  PILLARS.reduce((acc, p) => {
    acc[p.id] = p;
    return acc;
  }, {} as Record<LifeSystemPillarId, PillarDefinition>);

export const PILLARS_BY_LEVEL: Record<LifeSystemLevel, PillarDefinition[]> = {
  core: PILLARS.filter(p => p.level === "core"),
  expression: PILLARS.filter(p => p.level === "expression"),
  creation: PILLARS.filter(p => p.level === "creation"),
};

export function isValidPillarId(id: string): id is LifeSystemPillarId {
  return id in PILLAR_BY_ID;
}

/** DW's per-layer voice modifier. Used wherever DW speaks about a pillar. */
export function toneForLevel(level: LifeSystemLevel): string {
  return LEVEL_META[level].toneSentence;
}
