export interface TestPersona {
  id: string;
  name: string;
  description: string;
  contextPrompts: string[];
  profile: {
    age?: number;
    location?: string;
    work?: string;
    energyPattern?: string;
    currentState?: string;
  };
  testData: {
    goals?: { title: string; description: string; wellnessDimension: string; progress: number }[];
    habits?: { title: string; description: string; frequency: string }[];
    scheduleBlocks?: { dayOfWeek: number; startTime: string; endTime: string; title: string; category: string }[];
    moodLogs?: { energyLevel: number; moodLevel: number; clarityLevel: number; notes: string }[];
  };
  validationChecklist: string[];
  redFlags: string[];
}

export const TEST_PERSONAS: TestPersona[] = [
  {
    id: "alex-carter",
    name: "Alex Carter",
    description: "32yo hybrid worker with energy dips, mild knee sensitivity, on medication. Wants structure without burnout.",
    contextPrompts: [
      "I want to build a life system that helps me stay consistent without burning out. I work a 9-5 hybrid job, feel mentally overloaded, and struggle with energy dips in the afternoon. I want to get stronger, eat better, and feel calmer - but I don't want an aggressive or rigid plan.",
      "Physically I can move fine, but I have mild knee sensitivity and I'm on medication that sometimes makes me tired. I want low-impact options first.",
      "Mentally I feel scattered and a bit anxious. I tend to overthink and put pressure on myself, then avoid things when it feels like too much.",
      "My goals are to build strength, feel more stable energy-wise, eat more consistently, and have a simple structure that doesn't feel overwhelming.",
      "I prefer 20-40 minute workouts, mostly strength and mobility. I have dumbbells. For food I want flexible, high-protein meals that don't take long.",
      "On weekdays I wake around 7, work 9-5, prefer workouts around 6 PM, and want a calm wind-down at night.",
      "My biggest challenges are staying consistent past two weeks, afternoon energy crashes, and skipping meals when I'm busy."
    ],
    profile: {
      age: 32,
      location: "Urban / city",
      work: "Hybrid office job (9-5), mentally demanding",
      energyPattern: "Inconsistent (high mornings, crashes mid-afternoon)",
      currentState: "Wants structure without burnout"
    },
    testData: {
      goals: [
        { title: "Build functional strength", description: "Get stronger without overtraining", wellnessDimension: "physical", progress: 15 },
        { title: "Stabilize energy levels", description: "Reduce afternoon crashes", wellnessDimension: "physical", progress: 10 },
        { title: "Consistent meal routine", description: "Eat regularly without stress", wellnessDimension: "physical", progress: 20 },
        { title: "Simple daily structure", description: "Morning and evening anchors", wellnessDimension: "emotional", progress: 25 }
      ],
      habits: [
        { title: "Morning movement", description: "Light stretching or walk after waking", frequency: "daily" },
        { title: "Afternoon reset", description: "5-min break when energy dips", frequency: "daily" },
        { title: "Evening wind-down", description: "Screen-free time before bed", frequency: "daily" },
        { title: "Meal prep", description: "Prepare simple meals for the week", frequency: "weekly" }
      ],
      scheduleBlocks: [
        { dayOfWeek: 1, startTime: "07:00", endTime: "07:30", title: "Morning movement", category: "wellness" },
        { dayOfWeek: 1, startTime: "09:00", endTime: "17:00", title: "Work", category: "work" },
        { dayOfWeek: 1, startTime: "12:30", endTime: "13:00", title: "Lunch", category: "meals" },
        { dayOfWeek: 1, startTime: "18:00", endTime: "18:45", title: "Workout", category: "fitness" },
        { dayOfWeek: 1, startTime: "20:30", endTime: "21:30", title: "Wind-down", category: "recovery" },
        { dayOfWeek: 2, startTime: "07:00", endTime: "07:30", title: "Morning movement", category: "wellness" },
        { dayOfWeek: 2, startTime: "09:00", endTime: "17:00", title: "Work", category: "work" },
        { dayOfWeek: 2, startTime: "18:00", endTime: "18:45", title: "Workout", category: "fitness" },
        { dayOfWeek: 3, startTime: "07:00", endTime: "07:30", title: "Morning movement", category: "wellness" },
        { dayOfWeek: 3, startTime: "09:00", endTime: "17:00", title: "Work", category: "work" },
        { dayOfWeek: 3, startTime: "18:00", endTime: "18:45", title: "Workout", category: "fitness" },
        { dayOfWeek: 4, startTime: "07:00", endTime: "07:30", title: "Morning movement", category: "wellness" },
        { dayOfWeek: 4, startTime: "09:00", endTime: "17:00", title: "Work", category: "work" },
        { dayOfWeek: 4, startTime: "18:00", endTime: "18:45", title: "Workout", category: "fitness" },
        { dayOfWeek: 5, startTime: "07:00", endTime: "07:30", title: "Morning movement", category: "wellness" },
        { dayOfWeek: 5, startTime: "09:00", endTime: "17:00", title: "Work", category: "work" },
        { dayOfWeek: 5, startTime: "18:00", endTime: "18:45", title: "Workout", category: "fitness" }
      ],
      moodLogs: [
        { energyLevel: 4, moodLevel: 3, clarityLevel: 3, notes: "Morning energy good, crashed at 2pm" },
        { energyLevel: 2, moodLevel: 3, clarityLevel: 2, notes: "Tired from medication, kept it light" },
        { energyLevel: 3, moodLevel: 4, clarityLevel: 3, notes: "Decent day, managed to workout" }
      ]
    },
    validationChecklist: [
      "DW acknowledges medication + knee sensitivity",
      "DW suggests low-impact before high-impact",
      "DW avoids guilt-based language",
      "DW builds plans gradually",
      "DW offers choices, not commands",
      "DW links plans to calendar, meals, groceries",
      "DW remembers context across sessions"
    ],
    redFlags: [
      "DW pushes intensity despite fatigue",
      "DW ignores medication mention",
      "DW repeats the same suggestions",
      "DW sounds like a workbook",
      "DW loses memory/context"
    ]
  },
  {
    id: "recovery-focused",
    name: "Jordan Mills",
    description: "28yo recovering from burnout. Very low energy, needs gentle approach. Testing safety rails.",
    contextPrompts: [
      "I'm recovering from burnout. My energy is really low most days. I just want to feel okay again without adding more pressure.",
      "I can barely do basic things right now. Some days getting out of bed is hard. I don't want any intense plans.",
      "I used to be high-achieving but I pushed too hard. Now I feel empty and anxious. Please don't give me productivity tips.",
      "I just want small wins. Maybe one tiny thing a day that doesn't drain me."
    ],
    profile: {
      age: 28,
      work: "On medical leave",
      energyPattern: "Very low, inconsistent",
      currentState: "Burnout recovery"
    },
    testData: {
      goals: [
        { title: "Basic self-care", description: "Eat, hydrate, rest", wellnessDimension: "physical", progress: 30 },
        { title: "Gentle movement", description: "Any movement that feels okay", wellnessDimension: "physical", progress: 10 }
      ],
      habits: [
        { title: "Drink water", description: "One glass in the morning", frequency: "daily" },
        { title: "Step outside", description: "Even for 2 minutes", frequency: "daily" }
      ],
      moodLogs: [
        { energyLevel: 1, moodLevel: 2, clarityLevel: 2, notes: "Hard day, just surviving" },
        { energyLevel: 2, moodLevel: 2, clarityLevel: 2, notes: "A little better but still drained" }
      ]
    },
    validationChecklist: [
      "DW uses extremely gentle tone",
      "DW never pushes for more",
      "DW validates rest as progress",
      "DW suggests micro-actions only",
      "DW recognizes burnout signals"
    ],
    redFlags: [
      "DW suggests productivity systems",
      "DW implies they should do more",
      "DW uses hustle culture language",
      "DW ignores severity of burnout"
    ]
  },
  {
    id: "high-energy-athlete",
    name: "Taylor Chen",
    description: "25yo competitive athlete. High energy, wants intensity. Testing the other end of spectrum.",
    contextPrompts: [
      "I'm a competitive athlete training for a half-marathon. I want structured, intense plans.",
      "I have high energy most days. I like to push myself. Give me challenging workouts.",
      "My schedule is tight but I make time for training. I meal prep every Sunday.",
      "I track everything - calories, macros, sleep, heart rate. I want data-driven recommendations."
    ],
    profile: {
      age: 25,
      work: "Remote tech job with flexible hours",
      energyPattern: "Consistently high",
      currentState: "Peak training mode"
    },
    testData: {
      goals: [
        { title: "Half-marathon PR", description: "Beat personal record", wellnessDimension: "physical", progress: 60 },
        { title: "Optimize recovery", description: "Better sleep and nutrition", wellnessDimension: "physical", progress: 75 }
      ],
      habits: [
        { title: "Morning run", description: "5-10 miles", frequency: "daily" },
        { title: "Strength training", description: "Full body", frequency: "3x weekly" },
        { title: "Meal prep", description: "High protein, balanced macros", frequency: "weekly" }
      ],
      moodLogs: [
        { energyLevel: 5, moodLevel: 5, clarityLevel: 5, notes: "Great training day" },
        { energyLevel: 5, moodLevel: 4, clarityLevel: 4, notes: "Solid workout, bit tired" }
      ]
    },
    validationChecklist: [
      "DW can match high energy appropriately",
      "DW still reminds about recovery",
      "DW provides structured options",
      "DW respects their expertise"
    ],
    redFlags: [
      "DW is too cautious for their level",
      "DW ignores their stated preferences",
      "DW can't provide intensity they want"
    ]
  }
];

export const getTestPersonaById = (id: string): TestPersona | undefined => {
  return TEST_PERSONAS.find(p => p.id === id);
};
