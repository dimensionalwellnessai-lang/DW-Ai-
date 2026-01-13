import type { SwitchId } from "@/lib/switch-storage";

export type TimeBand = "tiny" | "small" | "medium" | "large";
export type Intensity = "light" | "moderate" | "deep";
export type Mode = "restoring" | "training" | "maintaining";

export interface PlanAction {
  title: string;
  steps: string[];
}

export interface SupportAction {
  switchId: SwitchId;
  title: string;
  steps: string[];
}

export interface PlanTemplate {
  estimateMinutes: number;
  intensity: Intensity;
  whyThisMatters: string;
  actionNow: PlanAction;
  routineBlock: {
    title: string;
    schedule: string;
    steps: string[];
  };
  supportAction: SupportAction;
  checkInQuestion: string;
}

export interface SwitchPlanLibrary {
  tiny: PlanTemplate;
  small: PlanTemplate;
  medium: PlanTemplate;
  large: PlanTemplate;
}

export const PLAN_LIBRARY: Record<SwitchId, SwitchPlanLibrary> = {
  body: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Energy comes before motivation. We're charging the battery.",
      actionNow: {
        title: "10-min body reset",
        steps: [
          "2 minutes: slow breathing + shoulder rolls",
          "6 minutes: light movement (walk in place, mobility, or stretching)",
          "2 minutes: water + quick protein/snack check"
        ]
      },
      routineBlock: {
        title: "Micro-move (3x this week)",
        schedule: "3x/week",
        steps: [
          "10 minutes total",
          "Pick: walk / mobility / stretching",
          "Stop while you still feel good"
        ]
      },
      supportAction: {
        switchId: "mind",
        title: "One thought reset",
        steps: ["Name the stress in 1 sentence", "Replace with 1 helpful sentence"]
      },
      checkInQuestion: "What thought came up about your body during this? Did anything shift?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "We're building energy and consistency without burnout.",
      actionNow: {
        title: "25-min strength + mobility",
        steps: [
          "5 min warm-up (mobility + easy pace)",
          "15 min strength circuit: push + pull + squat/hinge",
          "5 min cooldown + water"
        ]
      },
      routineBlock: {
        title: "Strength foundation (3x this week)",
        schedule: "3x/week",
        steps: [
          "20–30 min sessions",
          "Track: reps or time",
          "Add 1 small progression weekly"
        ]
      },
      supportAction: {
        switchId: "time",
        title: "Schedule the next session",
        steps: ["Pick 1 day + time", "Block 30 minutes", "Add a reminder"]
      },
      checkInQuestion: "What story did you tell yourself before starting? Is it still true after doing it?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "We're upgrading stamina + strength so the rest of life feels lighter.",
      actionNow: {
        title: "50-min full session",
        steps: [
          "8 min warm-up + mobility",
          "30 min strength (3–4 moves, 3–4 rounds)",
          "7 min light cardio finisher",
          "5 min stretch + recovery note"
        ]
      },
      routineBlock: {
        title: "Body performance week",
        schedule: "4x/week",
        steps: [
          "2 strength days, 1 mobility day, 1 cardio day",
          "Rest day rule: active recovery only",
          "Keep it sustainable"
        ]
      },
      supportAction: {
        switchId: "environment",
        title: "Set your workout space",
        steps: ["Put equipment visible", "Clear a 6x6 area", "Queue a playlist"]
      },
      checkInQuestion: "What would you tell yourself before starting, now that you've done it?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "We're building a strong base — this is system-level energy.",
      actionNow: {
        title: "90-min performance build",
        steps: [
          "10 min warm-up + activation",
          "45 min progressive strength blocks",
          "15 min conditioning",
          "10 min mobility",
          "10 min meal/fuel plan for next 24 hours"
        ]
      },
      routineBlock: {
        title: "Athlete week (5 sessions)",
        schedule: "5x/week",
        steps: [
          "3 strength, 1 conditioning, 1 mobility",
          "Track performance (reps/time)",
          "One full rest day"
        ]
      },
      supportAction: {
        switchId: "money",
        title: "Fuel budget check",
        steps: ["List 2 high-protein groceries", "Plan 1 simple meal", "Keep it affordable"]
      },
      checkInQuestion: "Did any limiting belief about your body get challenged today?"
    }
  },

  mind: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Not every thought deserves your belief. We're clearing noise.",
      actionNow: {
        title: "10-min mental reset",
        steps: [
          "2 min: breathe + unclench jaw/shoulders",
          "5 min: brain-dump (what's loud right now?)",
          "3 min: choose ONE thought to reframe"
        ]
      },
      routineBlock: {
        title: "Daily 5-minute de-noise",
        schedule: "daily",
        steps: ["Brain-dump 5 lines", "Circle the one you can act on", "Let the rest sit"]
      },
      supportAction: {
        switchId: "body",
        title: "Nervous system downshift",
        steps: ["Drink water", "30–60 seconds slow breathing"]
      },
      checkInQuestion: "What thought lost power when you named it out loud?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "We're training emotional clarity so stress stops running the system.",
      actionNow: {
        title: "25-min clarity session",
        steps: [
          "5 min: breathe + body scan",
          "10 min: journal (trigger → feeling → need)",
          "10 min: pick one boundary or next step"
        ]
      },
      routineBlock: {
        title: "Stress recovery loop",
        schedule: "3x/week",
        steps: ["10–20 minutes", "Name the pattern", "Choose one adjustment"]
      },
      supportAction: {
        switchId: "time",
        title: "Protect a calm block",
        steps: ["Block 15 minutes", "Label: MIND SWITCH", "No phone during block"]
      },
      checkInQuestion: "What pattern did you notice? What's a more balanced way to see it?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "We're rewiring thought patterns so you respond instead of react.",
      actionNow: {
        title: "50-min pattern break",
        steps: [
          "10 min: guided breathing/grounding",
          "15 min: write the recurring story you tell yourself",
          "15 min: challenge it with evidence",
          "10 min: write the new story (short + believable)"
        ]
      },
      routineBlock: {
        title: "Mind training week",
        schedule: "4x/week",
        steps: ["2 calm sessions", "1 reflection session", "1 boundary/practice session"]
      },
      supportAction: {
        switchId: "relationships",
        title: "One connection check",
        steps: ["Text one supportive person", "Keep it simple: 'Checking in'"]
      },
      checkInQuestion: "What thought has less power over you after this?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "This is deep perspective training — system-level clarity.",
      actionNow: {
        title: "90-min inner reset",
        steps: [
          "15 min: grounding + breathwork",
          "25 min: deep journaling (pattern → origin → cost)",
          "20 min: rewrite new belief system",
          "15 min: plan the next 7 days with one new boundary",
          "15 min: decompress (walk/stretch)"
        ]
      },
      routineBlock: {
        title: "Deep clarity cycle",
        schedule: "2x/week",
        steps: ["One deep session", "One follow-up action session"]
      },
      supportAction: {
        switchId: "environment",
        title: "Make space for calm",
        steps: ["Clear one surface", "Reduce one noise", "Set one comfort item"]
      },
      checkInQuestion: "What belief are you ready to stop carrying?"
    }
  },

  time: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Time isn't the problem — structure is. We're reducing overwhelm fast.",
      actionNow: {
        title: "10-min time reset",
        steps: [
          "Write your top 3 tasks",
          "Circle ONE priority",
          "Block 25 minutes for it (even if you start later)"
        ]
      },
      routineBlock: {
        title: "Daily 3–1 structure",
        schedule: "daily",
        steps: ["3 tasks list", "1 priority circle", "1 block protected"]
      },
      supportAction: {
        switchId: "mind",
        title: "Overwhelm release",
        steps: ["Say: 'One block at a time.'", "Breathe 60 seconds"]
      },
      checkInQuestion: "Did this make your day feel more manageable?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "We're building rhythm so you stop living in catch-up.",
      actionNow: {
        title: "25-min schedule rebuild",
        steps: [
          "List today's commitments",
          "Choose 1 focus block + 1 recovery break",
          "Assign times (realistic, not perfect)",
          "Set one boundary: what you're NOT doing today"
        ]
      },
      routineBlock: {
        title: "Weekly rhythm setup",
        schedule: "1x/week",
        steps: ["Pick 3 focus days", "Pick 2 lighter days", "Add one buffer block"]
      },
      supportAction: {
        switchId: "environment",
        title: "Remove one distraction",
        steps: ["Clear one tab/app", "Put phone away for the focus block"]
      },
      checkInQuestion: "What's the one boundary that helped most?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "We're building a real system, not a fantasy schedule.",
      actionNow: {
        title: "50-min life scheduling session",
        steps: [
          "10 min: brain dump everything",
          "15 min: group by category",
          "15 min: schedule the top 3 blocks",
          "10 min: add buffers + simplify"
        ]
      },
      routineBlock: {
        title: "Time system week",
        schedule: "2x/week",
        steps: ["Midweek reset", "Weekend plan"]
      },
      supportAction: {
        switchId: "identity",
        title: "Consistency identity cue",
        steps: ["Write one line: 'I'm the type of person who finishes blocks.'"]
      },
      checkInQuestion: "Does your schedule feel supportive or suffocating?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "We're upgrading your entire operating system.",
      actionNow: {
        title: "90-min full system rebuild",
        steps: [
          "15 min: full brain dump",
          "20 min: prioritize (must/should/could)",
          "25 min: build weekly structure (anchors + blocks)",
          "15 min: plan buffers + recovery",
          "15 min: lock next 3 days"
        ]
      },
      routineBlock: {
        title: "Weekly OS maintenance",
        schedule: "1x/week",
        steps: ["Sunday planning session", "Midweek check-in", "Friday wrap"]
      },
      supportAction: {
        switchId: "purpose",
        title: "Align to meaning",
        steps: ["Name one goal this serves", "Write why it matters"]
      },
      checkInQuestion: "Does this schedule protect what matters most?"
    }
  },

  purpose: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Without direction, effort feels empty. We're finding the next step.",
      actionNow: {
        title: "10-min direction check",
        steps: [
          "Write what's draining your energy",
          "Write what gives you energy",
          "Choose ONE aligned action for today"
        ]
      },
      routineBlock: {
        title: "Daily alignment check",
        schedule: "daily",
        steps: ["1 min: what matters today?", "1 action that reflects it"]
      },
      supportAction: {
        switchId: "mind",
        title: "Clear the noise",
        steps: ["Name one distraction", "Let it go for now"]
      },
      checkInQuestion: "Did this action feel connected to something bigger?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "Meaning is the engine that keeps consistency alive.",
      actionNow: {
        title: "25-min purpose session",
        steps: [
          "5 min: what do you want more of?",
          "10 min: write 3 values that matter most",
          "10 min: choose 1 action that reflects those values"
        ]
      },
      routineBlock: {
        title: "Weekly values check",
        schedule: "1x/week",
        steps: ["Review: did actions match values?", "Adjust for next week"]
      },
      supportAction: {
        switchId: "time",
        title: "Protect purpose time",
        steps: ["Block 20 minutes for something meaningful", "Label it"]
      },
      checkInQuestion: "Do your actions feel more aligned after this?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "Direction turns effort into progress — one aligned step at a time.",
      actionNow: {
        title: "50-min life direction session",
        steps: [
          "10 min: what's working right now?",
          "15 min: what needs to change?",
          "15 min: define your next quarter priority",
          "10 min: break it into 3 milestones"
        ]
      },
      routineBlock: {
        title: "Purpose training week",
        schedule: "2x/week",
        steps: ["One reflection session", "One action session"]
      },
      supportAction: {
        switchId: "identity",
        title: "Reinforce who you're becoming",
        steps: ["Write: 'I'm becoming someone who...'"]
      },
      checkInQuestion: "Does your direction feel clearer now?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "This is vision work — shaping the life you're building.",
      actionNow: {
        title: "90-min life vision session",
        steps: [
          "20 min: write your ideal day 1 year from now",
          "20 min: identify gaps between now and then",
          "20 min: define 3 priorities for the next 90 days",
          "15 min: break priority 1 into weekly actions",
          "15 min: schedule the first week"
        ]
      },
      routineBlock: {
        title: "Monthly vision review",
        schedule: "1x/month",
        steps: ["Review progress", "Adjust priorities", "Celebrate wins"]
      },
      supportAction: {
        switchId: "relationships",
        title: "Share your vision",
        steps: ["Tell one person what you're working toward", "Ask for support"]
      },
      checkInQuestion: "Does this vision excite you?"
    }
  },

  money: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Clarity lowers money stress — one small control step at a time.",
      actionNow: {
        title: "10-min money check",
        steps: [
          "Check your account balance (just look)",
          "Write 1 bill due this week",
          "Set 1 tiny savings goal ($5-20)"
        ]
      },
      routineBlock: {
        title: "Weekly balance check",
        schedule: "1x/week",
        steps: ["Look at accounts", "Note upcoming expenses", "Celebrate stability"]
      },
      supportAction: {
        switchId: "mind",
        title: "Release money shame",
        steps: ["Say: 'I'm learning, not failing.'", "Breathe"]
      },
      checkInQuestion: "Did looking at your money feel less scary?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "Instability buys stress — stability buys choices.",
      actionNow: {
        title: "25-min money clarity session",
        steps: [
          "5 min: list all accounts + balances",
          "10 min: list bills + due dates",
          "10 min: identify 1 expense to cut or reduce"
        ]
      },
      routineBlock: {
        title: "Bi-weekly money review",
        schedule: "2x/month",
        steps: ["Review spending", "Adjust budget", "Move money to savings"]
      },
      supportAction: {
        switchId: "time",
        title: "Schedule money time",
        steps: ["Block 15 min for bills/planning", "Make it routine"]
      },
      checkInQuestion: "Do you feel more in control of your money?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "We're building a system for financial peace, not perfection.",
      actionNow: {
        title: "50-min budget build",
        steps: [
          "10 min: list all income sources",
          "15 min: list all fixed expenses",
          "15 min: allocate remaining (needs, wants, savings)",
          "10 min: identify 2 automation opportunities"
        ]
      },
      routineBlock: {
        title: "Monthly money review",
        schedule: "1x/month",
        steps: ["Review budget vs actual", "Adjust categories", "Set next month's goal"]
      },
      supportAction: {
        switchId: "environment",
        title: "Organize money space",
        steps: ["Create a bills folder", "Set up notifications"]
      },
      checkInQuestion: "Does your money system feel sustainable?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "This is financial foundation work — building real stability.",
      actionNow: {
        title: "90-min financial foundation",
        steps: [
          "15 min: net worth snapshot (assets - debts)",
          "20 min: create 3-month spending plan",
          "20 min: debt payoff strategy (if applicable)",
          "20 min: emergency fund plan",
          "15 min: set 3 financial goals for the quarter"
        ]
      },
      routineBlock: {
        title: "Quarterly financial review",
        schedule: "1x/quarter",
        steps: ["Review net worth", "Celebrate progress", "Adjust goals"]
      },
      supportAction: {
        switchId: "purpose",
        title: "Connect money to meaning",
        steps: ["Write: 'Money gives me...'" , "Name what you're building toward"]
      },
      checkInQuestion: "Do you feel more hopeful about your financial future?"
    }
  },

  relationships: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "A boundary or connection move can stop the drain.",
      actionNow: {
        title: "10-min relationship reset",
        steps: [
          "Who drained you recently? (Name 1)",
          "Who energized you? (Name 1)",
          "One micro-action: reach out OR step back"
        ]
      },
      routineBlock: {
        title: "Weekly connection check",
        schedule: "1x/week",
        steps: ["Identify 1 draining dynamic", "Identify 1 nourishing connection", "Act on one"]
      },
      supportAction: {
        switchId: "mind",
        title: "Process the feeling",
        steps: ["Name the emotion", "Let yourself feel it for 60 seconds"]
      },
      checkInQuestion: "Did this make your relationships feel more balanced?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "Connection should feel safe, not draining.",
      actionNow: {
        title: "25-min boundary session",
        steps: [
          "5 min: list relationships that drain energy",
          "10 min: identify 1 boundary you need",
          "10 min: write how you'll communicate it"
        ]
      },
      routineBlock: {
        title: "Relationship maintenance",
        schedule: "2x/week",
        steps: ["One nurturing action", "One boundary protection"]
      },
      supportAction: {
        switchId: "identity",
        title: "Reinforce your worth",
        steps: ["Say: 'I deserve relationships that support me.'"]
      },
      checkInQuestion: "Do you feel more protected in your relationships?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "You can't out-hustle a lack of support or constant conflict.",
      actionNow: {
        title: "50-min relationship audit",
        steps: [
          "10 min: list your 5 closest relationships",
          "15 min: rate each: draining / neutral / nourishing",
          "15 min: identify 2 boundaries needed",
          "10 min: plan 1 repair or 1 deepening action"
        ]
      },
      routineBlock: {
        title: "Weekly relationship focus",
        schedule: "1x/week",
        steps: ["Check in with one supportive person", "Hold one boundary"]
      },
      supportAction: {
        switchId: "time",
        title: "Schedule connection time",
        steps: ["Block 30 min for someone who matters"]
      },
      checkInQuestion: "Are your relationships moving toward health?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "Deep relationship work changes everything else.",
      actionNow: {
        title: "90-min relationship deep dive",
        steps: [
          "20 min: relationship inventory (all key people)",
          "20 min: identify patterns (what you give, what you get)",
          "20 min: write 3 boundaries you need system-wide",
          "15 min: plan 2 repair conversations",
          "15 min: schedule quality time with 2 supportive people"
        ]
      },
      routineBlock: {
        title: "Monthly relationship review",
        schedule: "1x/month",
        steps: ["Review boundaries held", "Celebrate healthy dynamics", "Address one conflict"]
      },
      supportAction: {
        switchId: "mind",
        title: "Process relationship stress",
        steps: ["Journal about one dynamic", "Identify what you need"]
      },
      checkInQuestion: "Do you feel more in control of your relationship patterns?"
    }
  },

  environment: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Removing friction makes everything easier to start.",
      actionNow: {
        title: "10-min space reset",
        steps: [
          "Clear one surface (desk, counter, table)",
          "Put 5 things away",
          "Remove 1 distraction from view"
        ]
      },
      routineBlock: {
        title: "Daily 5-min tidy",
        schedule: "daily",
        steps: ["One surface clear", "One thing put away", "Done"]
      },
      supportAction: {
        switchId: "mind",
        title: "Breathe in the space",
        steps: ["Look at what you cleared", "Take 3 breaths"]
      },
      checkInQuestion: "Does your space feel even slightly calmer?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "Your space is either helping you or quietly working against you.",
      actionNow: {
        title: "25-min friction removal",
        steps: [
          "5 min: identify your biggest friction zone",
          "15 min: clear and organize that zone",
          "5 min: set up one thing for easier access"
        ]
      },
      routineBlock: {
        title: "Weekly zone reset",
        schedule: "1x/week",
        steps: ["Pick one zone", "15-min reset", "Maintain through week"]
      },
      supportAction: {
        switchId: "time",
        title: "Schedule reset time",
        steps: ["Block 15 min for environment maintenance"]
      },
      checkInQuestion: "Is your main friction zone working better now?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "We're designing your space to support your goals.",
      actionNow: {
        title: "50-min environment design",
        steps: [
          "10 min: list 3 daily activities",
          "15 min: set up each activity space for zero friction",
          "15 min: remove clutter from all three areas",
          "10 min: add 1 comfort or inspiration element"
        ]
      },
      routineBlock: {
        title: "Environment maintenance week",
        schedule: "2x/week",
        steps: ["Quick reset of activity zones", "One improvement per week"]
      },
      supportAction: {
        switchId: "identity",
        title: "Claim your space",
        steps: ["Say: 'This space supports who I'm becoming.'"]
      },
      checkInQuestion: "Does your environment feel more intentional?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "This is full environment optimization — designing for success.",
      actionNow: {
        title: "90-min space transformation",
        steps: [
          "15 min: walk through your space with fresh eyes",
          "20 min: list everything that adds friction",
          "25 min: tackle the top 3 friction points",
          "15 min: set up systems (homes for things, routines)",
          "15 min: add 2-3 elements that inspire you"
        ]
      },
      routineBlock: {
        title: "Monthly environment audit",
        schedule: "1x/month",
        steps: ["Review what's working", "Fix what's not", "One upgrade"]
      },
      supportAction: {
        switchId: "body",
        title: "Make movement easy",
        steps: ["Put workout gear visible", "Clear space for movement"]
      },
      checkInQuestion: "Does your environment now support your best self?"
    }
  },

  identity: {
    tiny: {
      estimateMinutes: 10,
      intensity: "light",
      whyThisMatters: "Consistency starts with identity — one proof action today.",
      actionNow: {
        title: "10-min identity check",
        steps: [
          "Write: 'I am someone who...' (1 trait you want)",
          "Name 1 small action that proves it",
          "Do that action now"
        ]
      },
      routineBlock: {
        title: "Daily identity proof",
        schedule: "daily",
        steps: ["1 small action", "That matches who you're becoming"]
      },
      supportAction: {
        switchId: "mind",
        title: "Challenge old story",
        steps: ["Name 1 limiting belief", "Write 1 counter-evidence"]
      },
      checkInQuestion: "Did this action feel like the real you?"
    },
    small: {
      estimateMinutes: 25,
      intensity: "moderate",
      whyThisMatters: "Change sticks when it matches who you believe you are.",
      actionNow: {
        title: "25-min identity session",
        steps: [
          "5 min: who do you want to become?",
          "10 min: list 3 traits of that person",
          "10 min: plan 1 action per trait for this week"
        ]
      },
      routineBlock: {
        title: "Weekly identity training",
        schedule: "3x/week",
        steps: ["One trait-aligned action", "Notice how it feels"]
      },
      supportAction: {
        switchId: "time",
        title: "Protect identity time",
        steps: ["Block time for one growth activity"]
      },
      checkInQuestion: "Are you acting more like the person you want to be?"
    },
    medium: {
      estimateMinutes: 50,
      intensity: "moderate",
      whyThisMatters: "Your identity decides what you repeat.",
      actionNow: {
        title: "50-min identity design",
        steps: [
          "10 min: who were you raised to be?",
          "15 min: who do you actually want to be?",
          "15 min: identify 3 old patterns to release",
          "10 min: replace with 3 new identity statements"
        ]
      },
      routineBlock: {
        title: "Identity training week",
        schedule: "4x/week",
        steps: ["Read identity statements morning", "Act on one daily"]
      },
      supportAction: {
        switchId: "relationships",
        title: "Tell someone who you're becoming",
        steps: ["Share 1 identity goal", "Ask for support"]
      },
      checkInQuestion: "Do you believe more in who you're becoming?"
    },
    large: {
      estimateMinutes: 90,
      intensity: "deep",
      whyThisMatters: "This is deep identity work — rewriting your operating system.",
      actionNow: {
        title: "90-min identity transformation",
        steps: [
          "20 min: write your current self-concept (honest)",
          "20 min: write your ideal self-concept (1 year out)",
          "20 min: identify 5 belief shifts needed",
          "15 min: plan 5 proof actions (1 per belief)",
          "15 min: schedule the first 3"
        ]
      },
      routineBlock: {
        title: "Monthly identity review",
        schedule: "1x/month",
        steps: ["Review beliefs", "Celebrate shifts", "Adjust focus"]
      },
      supportAction: {
        switchId: "purpose",
        title: "Connect identity to purpose",
        steps: ["Write: 'I'm becoming this because...'"]
      },
      checkInQuestion: "Are you closer to the person you want to be?"
    }
  }
};

export const TIME_BAND_CAPS: Record<TimeBand, number> = {
  tiny: 10,
  small: 30,
  medium: 60,
  large: 90
};

export const MAX_STEPS_BY_TIME_BAND: Record<TimeBand, number> = {
  tiny: 3,
  small: 4,
  medium: 6,
  large: 9
};
