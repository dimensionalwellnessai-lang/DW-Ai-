// Starter Template content for the Life System.
//
// This is content, not code — it's safe to edit the prose here without
// touching application logic. Adopting this template via the My Life System
// page (or via the onboarding "Adopt the Starter Template" alternate path)
// pre-fills every pillar with the language and structure of the user's
// original ChatGPT-built template.
import type { LifeSystemPillarId } from "./lifeSystemTaxonomy";

export interface StarterPillarContent {
  description: string;
  laws?: string[];
  nonNegotiables?: string[];
  weeklyRhythm?: string;
  /** Pillar-specific extra fields. */
  extras?: Record<string, unknown>;
}

export interface StarterProject {
  name: string;
  description: string;
  currentFocus?: string;
  weeklyCadence?: string;
  nextAction?: string;
  status?: "vision" | "active" | "paused" | "done";
}

export interface StarterTemplate {
  identityStatement: string;
  finalStatement: string;
  weeklyNonNegotiables: string[];
  minimumDayChecklist: string[];
  commandments: string[];
  pillars: Partial<Record<LifeSystemPillarId, StarterPillarContent>>;
  projects: StarterProject[];
}

export const STARTER_TEMPLATE: StarterTemplate = {
  identityStatement:
    "I am a person who chooses, on purpose. My life runs on systems I've built — not on accident. I take care of my body, my mind, my space, my people, and my work, and I keep building what's mine to build.",

  finalStatement:
    "This is my operating system. It evolves with me. The layers stack — the foundation holds the day, the day holds the week, the week holds the life. As long as I tend to it, it tends to me.",

  weeklyNonNegotiables: [
    "Move my body at least 4 days",
    "One real meal cooked at home",
    "One full reset of my space",
    "One real conversation with someone who matters",
    "One block of personal-advancement time",
    "One stretch of stillness with no input",
  ],

  minimumDayChecklist: [
    "Get out of bed and open the curtains",
    "Drink water before anything else",
    "Move for 10 minutes — walk counts",
    "Eat one real meal",
    "Make the bed and clear one surface",
    "Sleep at a decent hour",
  ],

  commandments: [
    "Stabilize the foundation before chasing the dream.",
    "Recovery is part of the work, not a break from it.",
    "Treat the body like the only one I'll ever get.",
    "Surround myself with people who lift, not drain.",
    "Build slow. Build real. Build mine.",
    "Show up on the hard days at least at the minimum.",
    "Money serves the life, not the other way around.",
    "Spirituality is how I stay connected to what matters.",
    "Aliveness is non-negotiable — chase the things that light me up.",
    "What I do today is what I become tomorrow.",
  ],

  pillars: {
    foundation: {
      description:
        "The bedrock. Who I am, what I stand for, the laws I live by — the non-negotiables that hold the rest of the system up.",
      laws: [
        "I keep my word to myself first.",
        "I rest before I break.",
        "I take care of the body that carries me.",
        "I tell the truth, especially to myself.",
        "I build the life I actually want, not the one I was handed.",
      ],
      nonNegotiables: [
        "Sleep enough to function clearly",
        "Move my body during the week",
        "Tend my space",
        "Speak honestly with the people who matter",
      ],
    },

    daily_rhythm: {
      description:
        "Mon–Thu is structured for output: 8:30 AM to 5:00 PM with deep work, training, and meals built in. Friday is my personal-advancement day — catch-up, learn, build, recover. Weekends are people, aliveness, and reset.",
      weeklyRhythm:
        "Mon–Thu: work day 8:30–5. Fri: personal advancement, no meetings. Sat: people + outside. Sun: reset + plan.",
      extras: {
        wakeTarget: "6:30 AM",
        sleepTarget: "11:00 PM",
        deepWorkBlocks: ["9:00–11:00 AM", "2:00–4:00 PM"],
      },
    },

    physical_health: {
      description:
        "Strength, energy, and a body I trust. A 4-day training split, real food I prep at the start of the week, and enough sleep to actually recover.",
      weeklyRhythm:
        "Mon: push. Tue: pull. Wed: legs. Thu: full-body / conditioning. Fri/Sat/Sun: walks, mobility, play.",
      extras: {
        trainingSplit: ["Push (Mon)", "Pull (Tue)", "Legs (Wed)", "Conditioning (Thu)"],
        nutrition: {
          structure: "3 meals + 1–2 snacks",
          principles: ["Protein at every meal", "Cook 4+ nights at home", "Hydrate before caffeine"],
        },
      },
    },

    mental_emotional: {
      description:
        "Clarity, regulation, and not letting the inside spin out of control. Four moves I rotate through when things get loud: notice, name, breathe, choose.",
      laws: [
        "Notice the feeling before reacting.",
        "Name what's actually going on.",
        "Breathe — give the body a second.",
        "Choose the next move on purpose, not on impulse.",
      ],
      extras: {
        reset_practices: ["5-min breathwork", "10-min walk with no phone", "Brain dump on paper", "Talk it out with DW"],
      },
    },

    physical_environment: {
      description:
        "My space reflects how I'm doing — and shapes how I do. A daily 5-minute reset and a real Sunday reset keep it from running me.",
      weeklyRhythm:
        "Daily: 5-min reset before bed. Weekly (Sunday): full reset — laundry, dishes, surfaces, plants, restock.",
      nonNegotiables: [
        "Bed made each morning",
        "Kitchen reset before sleep",
        "Sunday full-space reset",
      ],
    },

    social_environment: {
      description:
        "The people around me shape who I become. I keep the aligned ones close, stay neutral with the neutral, protect myself from the draining, and seek out the ones I'm growing toward.",
      weeklyRhythm:
        "1 deep conversation, 1 social outing, 1 check-in with family.",
      extras: {
        categories: ["Aligned", "Neutral", "Draining", "Growth"],
        post_interaction_check: "Lighter or heavier?",
      },
    },

    responsibility: {
      description:
        "What I owe — to myself, my work, my people, my future. The boring, important things that don't get a parade but hold everything together.",
      nonNegotiables: [
        "Bills handled on time",
        "Inbox cleared weekly",
        "Commitments kept or renegotiated honestly",
      ],
    },

    recovery: {
      description:
        "Recovery is part of the build. Walks, music, stillness, lighter days, phone boundaries. When life is heavy, I drop to my Minimum Day and protect the system instead of pushing through.",
      extras: {
        tools: ["Slow walks", "Music with no lyrics", "Stillness — no input", "Lighter training days", "Phone in another room"],
        minimum_day_mode: "Toggle on hard days. Softens nudges, surfaces the minimum-day checklist.",
      },
    },

    growth: {
      description:
        "I'm always becoming. Reading, building, reflecting, taking new shots. Friday is the day I formally invest in growth — but the curiosity runs the whole week.",
      weeklyRhythm: "Fri: 2-hour growth block. Daily: read 20 min before sleep.",
    },

    spiritual: {
      description:
        "Three layers: a daily moment of stillness, a weekly bigger practice, and a felt sense that I'm part of something larger than the day's to-do list.",
      extras: {
        layers: {
          daily: "Morning quiet — 5 minutes, no phone.",
          weekly: "One longer practice — nature, meditation, ritual.",
          ongoing: "Live like I'm connected to something bigger.",
        },
      },
    },

    work_school: {
      description:
        "Mon–Thu is for output. Friday is for catch-up, learning, and the longer-horizon stuff. I protect deep work blocks and keep meetings out of the morning when I can.",
      weeklyRhythm: "Mon–Thu deep work. Fri catch-up + learning + plan next week.",
    },

    money: {
      description:
        "Five buckets: Living, Saving, Investing, Generosity, and Fun. Money serves the life — not the other way around.",
      extras: {
        buckets: ["Living", "Saving", "Investing", "Generosity", "Fun"],
      },
    },

    aliveness: {
      description:
        "The things that make me feel most me. Rooftops, music, friends, being outside, creative work, movement, being seen.",
      extras: {
        seedTags: ["rooftop", "music", "friends", "outside", "creative work", "movement", "being seen"],
      },
    },

    purpose: {
      description:
        "Who I am becoming. What my life is about. This is direction, not a to-do list — it evolves slowly, on purpose.",
    },

    projects: {
      description:
        "The Creation layer. What I'm actively putting into the world right now. Projects come and go — Purpose stays.",
    },
  },

  projects: [
    {
      name: "Living my Life System",
      description: "Treat my own life as the project. Run the system, refine it, let it evolve.",
      currentFocus: "Get the system real and running for at least 30 days.",
      weeklyCadence: "Daily check-in, weekly review on Sundays.",
      nextAction: "Adopt the Starter Template and run it for the week.",
      status: "active",
    },
  ],
};
