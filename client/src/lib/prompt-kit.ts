/**
 * DW Prompt Kit
 *
 * Switch-aware and energy-aware guided prompts for use throughout the app.
 * Prompts are selected based on the user's current switch status and energy
 * level so DW always starts conversations with relevant, contextual questions.
 *
 * Usage:
 *   import { getPromptForSwitch, getEnergyPrompt, getDailyPrompt } from "@/lib/prompt-kit";
 */

import type { SwitchId, SwitchStatus } from "@/lib/switch-storage";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface GuidedPrompt {
  /** Short opening question or observation from DW */
  text: string;
  /** What this prompt is trying to surface */
  intent: "reflection" | "planning" | "clarity" | "momentum";
  /** Optional follow-up suggestion after initial response */
  followUp?: string;
}

export type EnergyLevel = "low" | "medium" | "high" | null;

// ── Switch-aware prompts ──────────────────────────────────────────────────────

const SWITCH_PROMPTS: Record<SwitchId, Record<SwitchStatus, GuidedPrompt[]>> = {
  body: {
    off: [
      {
        text: "What does your body actually need right now — not what you think you should do?",
        intent: "reflection",
        followUp: "Let's start with one small thing that's realistic today.",
      },
      {
        text: "When did physical energy last feel like something you had rather than chased?",
        intent: "reflection",
      },
    ],
    flickering: [
      {
        text: "You're showing up for your body. What's making it feel inconsistent right now?",
        intent: "clarity",
        followUp: "Let's remove one obstacle this week.",
      },
      {
        text: "What's the smallest physical action that would signal progress to you today?",
        intent: "momentum",
      },
    ],
    stable: [
      {
        text: "Your body routine is holding. What would it look like to build on what's working?",
        intent: "planning",
      },
      {
        text: "Is your current physical approach supporting your energy or just maintaining it?",
        intent: "reflection",
      },
    ],
    powered: [
      {
        text: "Your body feels powered up. How are you protecting this momentum?",
        intent: "planning",
      },
      {
        text: "Physical energy is high. What life area does that unlock for you right now?",
        intent: "clarity",
      },
    ],
  },

  mind: {
    off: [
      {
        text: "What's the loudest thought that keeps returning? You don't have to fix it — just name it.",
        intent: "reflection",
      },
      {
        text: "When the mental noise is this high, what has helped you find even a moment of quiet before?",
        intent: "reflection",
        followUp: "Let's build one small mental reset into today.",
      },
    ],
    flickering: [
      {
        text: "Your mind is starting to clear. What's the thought pattern you most want to interrupt?",
        intent: "clarity",
      },
      {
        text: "What's one thing you keep overthinking that you could decide on today?",
        intent: "momentum",
      },
    ],
    stable: [
      {
        text: "Mental clarity is holding. What are you avoiding thinking about that actually needs attention?",
        intent: "reflection",
      },
      {
        text: "When your mind is stable, what big question becomes clearer to you?",
        intent: "planning",
      },
    ],
    powered: [
      {
        text: "Your mental space is clear. What decision have you been postponing that you can make now?",
        intent: "planning",
      },
      {
        text: "This is your clearest thinking. What do you want to build or decide while you're here?",
        intent: "planning",
      },
    ],
  },

  time: {
    off: [
      {
        text: "What's taking most of your time that doesn't feel worth it?",
        intent: "reflection",
      },
      {
        text: "If you had one protected hour today, what would you actually use it for?",
        intent: "clarity",
      },
    ],
    flickering: [
      {
        text: "You're building structure. What's the one thing that still keeps falling through?",
        intent: "clarity",
        followUp: "Let's block time for it this week.",
      },
      {
        text: "Where is your time going that you haven't consciously chosen?",
        intent: "reflection",
      },
    ],
    stable: [
      {
        text: "Your time structure is working. What would you add or protect right now?",
        intent: "planning",
      },
      {
        text: "Are you spending time on what's actually important — or what's just urgent?",
        intent: "reflection",
      },
    ],
    powered: [
      {
        text: "Time feels structured. What long-term project gets easier when you have this clarity?",
        intent: "planning",
      },
      {
        text: "You've built strong time discipline. Who else in your life benefits from this energy?",
        intent: "reflection",
      },
    ],
  },

  purpose: {
    off: [
      {
        text: "What would you be doing right now if money and time weren't part of the equation?",
        intent: "reflection",
      },
      {
        text: "What used to excite you that you've slowly stopped making time for?",
        intent: "reflection",
      },
    ],
    flickering: [
      {
        text: "Purpose is starting to pull you somewhere. What direction is it pointing?",
        intent: "clarity",
      },
      {
        text: "What's one small action this week that would feel genuinely meaningful?",
        intent: "momentum",
      },
    ],
    stable: [
      {
        text: "Your direction feels clear. What's the most aligned next step right now?",
        intent: "planning",
      },
      {
        text: "What part of your current path still feels out of alignment?",
        intent: "reflection",
      },
    ],
    powered: [
      {
        text: "Purpose is powering your decisions. What legacy are you actively building right now?",
        intent: "planning",
      },
      {
        text: "When purpose is this clear, what becomes easier to say no to?",
        intent: "reflection",
      },
    ],
  },

  money: {
    off: [
      {
        text: "What's one financial situation you've been avoiding that needs your attention?",
        intent: "clarity",
      },
      {
        text: "When you think about money right now, is the feeling more fear, avoidance, or overwhelm?",
        intent: "reflection",
      },
    ],
    flickering: [
      {
        text: "You're starting to get a handle on money. What's the area that still feels unstable?",
        intent: "clarity",
      },
      {
        text: "What's one financial decision you keep delaying that you could simplify today?",
        intent: "momentum",
      },
    ],
    stable: [
      {
        text: "Financial stability is building. What are you working toward that feels within reach?",
        intent: "planning",
      },
      {
        text: "What does financial freedom actually look like for you — not the number, the feeling?",
        intent: "reflection",
      },
    ],
    powered: [
      {
        text: "Money is working well. What choice does that stability unlock for you right now?",
        intent: "planning",
      },
      {
        text: "When finances are powered, what investment — in yourself or your future — feels ready?",
        intent: "planning",
      },
    ],
  },

  relationships: {
    off: [
      {
        text: "Which relationship in your life needs the most honest attention right now?",
        intent: "reflection",
      },
      {
        text: "What do you need from the people around you that you haven't asked for?",
        intent: "clarity",
      },
    ],
    flickering: [
      {
        text: "Connection is starting to improve. What's the relationship you want to invest more in?",
        intent: "planning",
      },
      {
        text: "Where are you overextending in relationships — and where are you pulling back more than you want to?",
        intent: "reflection",
      },
    ],
    stable: [
      {
        text: "Your relationships feel grounded. What boundary is still soft that needs firming up?",
        intent: "clarity",
      },
      {
        text: "Who in your life deserves more of your energy right now?",
        intent: "planning",
      },
    ],
    powered: [
      {
        text: "Relationships are strong. How are you showing up for people who matter most to you?",
        intent: "reflection",
      },
      {
        text: "Connection feels solid. What does that support system make possible in your life?",
        intent: "planning",
      },
    ],
  },

  environment: {
    off: [
      {
        text: "What about your physical space is creating resistance for you right now?",
        intent: "reflection",
      },
      {
        text: "Is your environment helping you become who you want to be — or pulling you backward?",
        intent: "clarity",
      },
    ],
    flickering: [
      {
        text: "Your space is starting to reflect what you want. What's the next thing to address?",
        intent: "momentum",
      },
      {
        text: "What environmental change would have the biggest positive effect on your daily energy?",
        intent: "planning",
      },
    ],
    stable: [
      {
        text: "Your environment is working for you. What would elevate it from functional to inspiring?",
        intent: "planning",
      },
      {
        text: "Does your space support your best thinking and recovery — or just your routine?",
        intent: "reflection",
      },
    ],
    powered: [
      {
        text: "Your environment is aligned. What does it make possible that felt out of reach before?",
        intent: "reflection",
      },
      {
        text: "Space powered up. What creative or meaningful work does this unlock for you?",
        intent: "planning",
      },
    ],
  },

  identity: {
    off: [
      {
        text: "Who are you becoming — versus who you've always been expected to be?",
        intent: "reflection",
      },
      {
        text: "What part of yourself have you been suppressing to fit what's expected of you?",
        intent: "reflection",
      },
    ],
    flickering: [
      {
        text: "Your sense of self is forming more clearly. What belief is being challenged right now?",
        intent: "clarity",
      },
      {
        text: "What part of your identity are you reclaiming or building that matters most to you?",
        intent: "reflection",
      },
    ],
    stable: [
      {
        text: "You know who you are. What part of that self is easiest to abandon under pressure?",
        intent: "reflection",
      },
      {
        text: "Your identity feels grounded. What values are you actively protecting in your decisions?",
        intent: "planning",
      },
    ],
    powered: [
      {
        text: "You're operating from a clear sense of self. What does that make you capable of now?",
        intent: "planning",
      },
      {
        text: "Identity is powered. What's the next level of who you're becoming?",
        intent: "reflection",
      },
    ],
  },
};

// ── Energy-aware prompts ──────────────────────────────────────────────────────

const ENERGY_PROMPTS: Record<NonNullable<EnergyLevel>, GuidedPrompt[]> = {
  low: [
    {
      text: "Energy is low today. What's one thing you can protect — not push?",
      intent: "clarity",
    },
    {
      text: "Low energy is information, not failure. What is your body or mind trying to tell you?",
      intent: "reflection",
    },
    {
      text: "What would a day that actually honors your energy look like right now?",
      intent: "reflection",
    },
  ],
  medium: [
    {
      text: "Energy is steady today. What's the most important thing to focus it on?",
      intent: "planning",
    },
    {
      text: "You've got capacity. What's been waiting for a window like this?",
      intent: "momentum",
    },
    {
      text: "What would you want to complete today that would make tomorrow lighter?",
      intent: "planning",
    },
  ],
  high: [
    {
      text: "Energy is strong. What's worth channeling this into — something that actually matters?",
      intent: "planning",
    },
    {
      text: "High energy days are rare. What would be a powerful use of this one?",
      intent: "planning",
    },
    {
      text: "You have momentum right now. What's the most important door to push through?",
      intent: "momentum",
    },
  ],
};

// ── Time-of-day prompts ───────────────────────────────────────────────────────

const TIME_OF_DAY_PROMPTS: Record<string, GuidedPrompt[]> = {
  morning: [
    {
      text: "What's the one thing that would make today feel like a win?",
      intent: "planning",
    },
    {
      text: "Morning question: What are you carrying from yesterday that you want to set down?",
      intent: "reflection",
    },
    {
      text: "What does today need to look like for you to feel good about it by tonight?",
      intent: "planning",
    },
  ],
  afternoon: [
    {
      text: "Midday check: How are you actually doing right now?",
      intent: "reflection",
    },
    {
      text: "What's still undone that genuinely matters? Not everything — the one thing.",
      intent: "clarity",
    },
    {
      text: "Is the afternoon going in the direction you wanted this morning?",
      intent: "reflection",
    },
  ],
  evening: [
    {
      text: "Wind down: What's worth keeping from today, and what are you releasing?",
      intent: "reflection",
    },
    {
      text: "What did today teach you about what you need more of?",
      intent: "reflection",
    },
    {
      text: "One thing you'd tell yourself before tomorrow starts.",
      intent: "reflection",
    },
  ],
};

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Returns a contextual guided prompt for a specific switch and its current status.
 * Uses a deterministic daily rotation so the prompt feels fresh without randomness.
 */
export function getPromptForSwitch(id: SwitchId, status: SwitchStatus): GuidedPrompt {
  const prompts = SWITCH_PROMPTS[id]?.[status];
  if (!prompts || prompts.length === 0) {
    return {
      text: "What's happening in this area of your life right now?",
      intent: "reflection",
    };
  }
  const dayIndex = Math.floor(Date.now() / 86400000);
  return prompts[dayIndex % prompts.length];
}

/**
 * Returns an energy-aware prompt based on the user's current energy level.
 * Falls back to a generic reflection prompt if level is null.
 */
export function getEnergyPrompt(level: EnergyLevel): GuidedPrompt {
  if (level === null) {
    return {
      text: "Where are you at right now — honestly?",
      intent: "reflection",
    };
  }
  const prompts = ENERGY_PROMPTS[level];
  const dayIndex = Math.floor(Date.now() / 86400000);
  return prompts[dayIndex % prompts.length];
}

/**
 * Returns a time-of-day contextual prompt.
 */
export function getTimeOfDayPrompt(): GuidedPrompt {
  const hour = new Date().getHours();
  let slot: string;
  if (hour >= 5 && hour < 12) slot = "morning";
  else if (hour >= 12 && hour < 18) slot = "afternoon";
  else slot = "evening";

  const prompts = TIME_OF_DAY_PROMPTS[slot];
  const dayIndex = Math.floor(Date.now() / 86400000);
  return prompts[dayIndex % prompts.length];
}

/**
 * Returns the best available prompt for the current context.
 * Priority: active switch with non-off status → energy level → time of day.
 */
export function getDailyPrompt(
  switchStatuses: Partial<Record<SwitchId, SwitchStatus>>,
  energyLevel: EnergyLevel = null,
): GuidedPrompt {
  // Find the most active switch (highest status that isn't "off")
  const statusOrder: SwitchStatus[] = ["powered", "stable", "flickering", "off"];
  for (const status of statusOrder) {
    if (status === "off") break;
    const match = (Object.entries(switchStatuses) as [SwitchId, SwitchStatus][]).find(
      ([, s]) => s === status,
    );
    if (match) {
      return getPromptForSwitch(match[0], match[1]);
    }
  }

  // Fall back to energy-level prompt
  if (energyLevel !== null) {
    return getEnergyPrompt(energyLevel);
  }

  // Final fallback: time of day
  return getTimeOfDayPrompt();
}

/**
 * Returns all prompts for a given switch across all statuses — useful for
 * prompt preview or testing.
 */
export function getAllPromptsForSwitch(id: SwitchId): Record<SwitchStatus, GuidedPrompt[]> {
  return SWITCH_PROMPTS[id];
}
