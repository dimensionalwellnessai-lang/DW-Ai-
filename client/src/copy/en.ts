import { BRAND } from "../config/brand";

export const COPY = {
  appHeader: BRAND.appName,
  appSubheader: BRAND.descriptor,
  tagline: BRAND.tagline,

  onboarding: {
    screen1Title: "Pause for a second.",
    screen1Body: "You don't need to change anything right now. This space is about noticing — then choosing.",
    ctaStart: "Let's begin",

    energyPrompt: "Where are you at, honestly?",
    energyHelper: "Pick as many as apply. No pressure.",
    energyOptions: ["Calm but present", "Heavy, loud mind", "Scattered energy", "Pushing through it", "Not sure yet"],

    backgroundPrompt: "What's running in the background?",
    backgroundHelper: "Pick what's true right now.",
    backgroundOptions: ["Stress or pressure", "Overthinking loop", "Low motivation", "Emotional weight", "Just observing"],

    boundaryTitle: "You're in control here.",
    boundaryBody: "I'm not here to tell you what to feel. I help you slow things down, look at what's happening, and choose how you want to respond.",
    boundaryCTA: "That works for me",

    closeTitle: "Use this when you want clarity.",
    closeBody: "Not every day. Just when it helps.",
    closeCTA: "Enter DW",
  },

  states: {
    loading: "Hold on — pulling it together.",
    empty: "Nothing here yet. That's okay.",
    error: "That didn't work.",
    errorSubtext: "You can try again, or come back later.",
    success: "Done.",
    offline: "Saved on this device.",
    offlineSubtext: "We'll sync when you're connected.",
    unavailable: "This isn't ready yet.",
  },

  actions: {
    continue: "Continue",
    back: "Back",
    skip: "Skip for now",
    done: "Done",
    notNow: "Not right now",
    cancel: "Cancel",
    finishLater: "Finish later",
  },

  buttons: {
    saveToSystem: "Save this",
    addToCalendar: "Add to calendar",
    activatePlan: "Activate this",
    confirmAdd: "Yes, add it",
    saveChanges: "Save changes",
    saved: "Saved",
    added: "Added",
    addToPlan: "Add to my plan",
    viewDetails: "See details",
    goBack: "Go back",
    returnHome: "Back to home",
  },

  microcopy: {
    trackMood: "Notice the pattern.",
    getRecommendations: "Here's another way to look at this.",
    aiResponse: "Here's a perspective.",
    dailyCheckin: "Quick energy check.",
    pickOne: "Pick one that fits.",
    pickOneToday: "Pick one for today.",
    pickOneDisabled: "Pick 1 to continue.",
    selectAll: "Select all that apply.",
    feelingsPrompt: "What's coming up for you right now?",
  },

  toasts: {
    saved: "Saved.",
    added: "Added to your system.",
    addedToday: "Added for today.",
    updated: "Updated.",
    noted: "Noted.",
    mealSaved: "Meal saved.",
    meditationSaved: "Added to meditation.",
    workoutAdded: "Workout added.",
    planSaved: "Plan saved.",
  },

  browse: {
    header: "Browse",
    searchPlaceholder: "Search here...",
    filters: "Filters",
    empty: "Nothing here yet. Try adjusting filters.",
    exploreCategory: (category: string) => `Explore ${category}.`,
  },

  tracking: {
    habitsEmpty: "No habits set up yet.",
    habitsEmptyCTA: "Set up habits",
  },

  moodTracker: {
    emptyToday: "Nothing logged yet today.",
  },

  actionCenter: {
    featureOff: "Start a conversation with DW to generate follow-ups.",
    pendingEmpty: "You're all caught up.",
    pendingEmptyCTA: "Talk to DW",
    why: "From your last conversation.",
  },

  lifeBlueprint: {
    dimensionEmpty: "Not defined yet.",
    resetEmpty: "No reset protocol set up.",
    assessmentEmpty: "Not assessed yet.",
    goalsEmpty: "No goals for this dimension.",
  },

  proactiveCards: {
    morningTitle: "Morning check-in",
    morningMessage: "A quick read of where you're at shapes your whole day.",
    morningWhy: "No check-in logged yet today.",
    energyTitle: "Energy low",
    energyMessage: "A short walk or 5-min reset can shift things.",
    energyWhy: "Based on your check-in.",
    windDownTitle: "Wind down",
    windDownMessage: "Review today, set tomorrow's intention.",
    windDownWhy: "It's evening — good time to close the loop.",
    goalTitle: "Open goals, no plan",
    goalMessage: "Want me to suggest one action to make progress?",
    goalWhy: "You have active goals but nothing on the schedule.",
    conversationStarters: [
      { title: "What's on your mind?", message: "Even one sentence helps me see your week clearly.", topic: "What's on my mind today" },
      { title: "Quick brain dump", message: "Spill anything weighing on you — I'll sort it.", topic: "Help me brain dump everything I'm carrying" },
      { title: "Talk it through", message: "Stuck on a decision? Let's walk through it together.", topic: "Help me think through a decision" },
      { title: "Wins from yesterday", message: "Tell me one thing that went right — small counts.", topic: "Help me notice yesterday's wins" },
      { title: "What feels off?", message: "If something's nagging at you, naming it shrinks it.", topic: "Something feels off and I want to talk it out" },
      { title: "One thing I'd love your help with", message: "Pick the smallest one — we'll start there.", topic: "Help me with one thing today" },
    ],
    pastConvoFollowUps: [
      { title: "Pick up where we left off", message: "We were talking about \"{topic}\" — want to continue?", topic: "Continue our conversation about {topic}" },
      { title: "How did it land?", message: "You mentioned \"{topic}\" recently. What changed since?", topic: "Following up on {topic} — what's changed" },
      { title: "Loop back", message: "Quick check-in on \"{topic}\" — still on your mind?", topic: "Check in on {topic}" },
    ],
    articlesToRead: [
      { title: "5-min read: sleep architecture", message: "Why the first 90 minutes set the tone for everything after.", topic: "Tell me what I should know about sleep architecture in 5 minutes" },
      { title: "Read: protein for energy", message: "How spreading protein across the day steadies your afternoons.", topic: "Explain protein timing for steady energy" },
      { title: "Read: micro-recovery", message: "Two-minute resets that actually move the needle.", topic: "Teach me micro-recovery techniques" },
      { title: "Read: focus without caffeine", message: "What works after the first cup wears off.", topic: "How do I sustain focus without more caffeine" },
      { title: "Read: zone-2 cardio", message: "The boring pace that quietly rebuilds your engine.", topic: "Explain zone-2 cardio and why it matters" },
      { title: "Read: morning sunlight", message: "Ten minutes outside before screens — here's why.", topic: "Why does morning sunlight matter so much" },
    ],
    topicsOfInterest: [
      { title: "Explore: {topic}", message: "Want to go deeper on this? I've got a few angles.", topic: "Let's go deeper on {topic}" },
      { title: "Worth a look: {topic}", message: "I noticed this keeps coming up for you.", topic: "Tell me more about {topic}" },
      { title: "Curious about {topic}?", message: "Five minutes here might shift how you think about it.", topic: "Help me explore {topic}" },
    ],
    reflectionPrompts: [
      { title: "Reflect", message: "What's one thing you're glad you did this week?", topic: "Help me reflect on what I'm glad I did this week" },
      { title: "Reflect", message: "Where did you spend energy that didn't pay off?", topic: "Help me reflect on energy that didn't pay off" },
      { title: "Reflect", message: "Who do you want to thank — even silently?", topic: "Help me think about gratitude" },
      { title: "Reflect", message: "What would 'enough' look like today?", topic: "Help me define what enough looks like today" },
      { title: "Reflect", message: "What's one thing you've been avoiding?", topic: "Help me face something I've been avoiding" },
      { title: "Reflect", message: "If you had a free hour right now, what would you choose?", topic: "What should I do with a free hour" },
    ],
    scheduleSuggestions: [
      { title: "Block 25 mins for deep work", message: "Your calendar has a quiet window — claim it before it's gone.", topic: "Help me schedule a deep-work block" },
      { title: "Pencil in tomorrow's workout", message: "Pre-decide the time and the choice gets easier.", topic: "Help me schedule tomorrow's workout" },
      { title: "Schedule a real lunch", message: "Even 20 minutes off-screen counts.", topic: "Help me schedule a proper lunch break" },
      { title: "Set tomorrow's first move", message: "One concrete first task makes mornings effortless.", topic: "Help me decide tomorrow's first task" },
      { title: "Plan a wind-down window", message: "30 minutes that protect tomorrow's energy.", topic: "Help me schedule a wind-down window" },
      { title: "Book recovery time", message: "Walk, stretch, sauna — pick one and put it on the calendar.", topic: "Help me schedule recovery time" },
    ],
    foodIdeas: [
      { title: "Quick: Greek yogurt bowl", message: "Yogurt + berries + nuts + honey. 3 minutes, 25g protein.", topic: "Give me the recipe for a Greek yogurt bowl" },
      { title: "Try: sheet-pan chicken & veg", message: "One pan, 30 min, leftovers handled. Want the recipe?", topic: "Give me a sheet-pan chicken and veg recipe" },
      { title: "Try: salmon rice bowl", message: "Salmon, rice, avocado, cucumber. Steady energy, easy macros.", topic: "Give me a salmon rice bowl recipe" },
      { title: "Quick: protein smoothie", message: "Banana, protein, oats, peanut butter, milk. Done in 2 min.", topic: "Give me a high-protein smoothie recipe" },
      { title: "Try: lentil soup", message: "Cheap, freezable, protein-dense. A weekly staple.", topic: "Give me a simple lentil soup recipe" },
      { title: "Try: stir-fry night", message: "Pick a protein, two veg, soy/ginger/garlic. 15 minutes flat.", topic: "Give me a quick stir-fry recipe" },
      { title: "Quick: eggs + greens", message: "Two eggs, big handful of greens, toast. Real meal in 5.", topic: "Give me a quick eggs and greens breakfast" },
      { title: "Try: overnight oats", message: "Tomorrow's breakfast, made tonight in 2 minutes.", topic: "Give me an overnight oats recipe" },
    ],
  },

  challenges: {
    viewDetails: "See details",
    addToPlan: "Add to my plan",
    addToCalendar: "Add to calendar",
  },

  tour: {
    start: "Show me around",
    next: "Next",
    tryIt: "Try it",
    skip: "Skip tour",
    dontShow: "Don't show again",
  },

  auth: {
    signIn: "Sign in",
    signUp: "Sign up",
    logOut: "Log out",
  },

  menu: {
    appTour: "App tour",
    feedback: "Feedback",
    settings: "Settings",
  },

  dw: {
    greeting: (name?: string) => name ? `Hey, ${name}.` : "Hey.",
    checkInPrompt: "What are we building right now?",
    checkInHelper: "Pick the one that feels most true today.",
    moodPrompt: "Where are you at, honestly?",
    moodHelper: "Pick as many as apply.",
    planPrompt: "Want me to map your next moves?",
    planHelper: "We can keep it simple or go deeper.",
    encouragement: "No pressure. We're just getting clarity.",
    twoOptions: "Two options.",
    hereIsTheMove: "Here's the move.",
    letsMakeItSimple: "Let's make it simple.",
    whyItMatters: "Why this matters:",
    suggestion: "DW suggestion:",
    whyLabel: "Why:",
  },

  bodyScan: {
    goalPrompt: "What are we working toward?",
    goalHelper: "Pick what feels right for now.",
    focusPrompt: "Where do you want to focus?",
    focusHelper: "Pick as many as apply.",
    energyPrompt: "How's your energy been lately?",
    energyHelper: "Be honest. This helps me calibrate.",
    measurementsPrompt: "Want to track measurements?",
    measurementsHelper: "Optional. Only if it helps you.",
    notesPrompt: "Anything else I should know?",
    notesHelper: "This is just for context.",
  },

  dimensions: {
    nutritionPrompt: "How's your relationship with food right now?",
    nutritionHelper: "No judgment. Just checking in.",
    fitnessPrompt: "How's movement feeling for you?",
    fitnessHelper: "Pick what's true today.",
    mentalPrompt: "How's your mental space?",
    mentalHelper: "Be real. This stays between us.",
    socialPrompt: "How are your connections feeling?",
    socialHelper: "Relationships, community, support.",
    financialPrompt: "How's your relationship with money?",
    financialHelper: "Just a quick check-in.",
    spiritualPrompt: "What's grounding you right now?",
    spiritualHelper: "This could be anything meaningful to you.",
  },

  planBuilder: {
    startPrompt: "What do you want to work on?",
    startHelper: "Pick what matters most right now.",
    timePrompt: "How much time do you have?",
    timeHelper: "Be realistic. Small steps count.",
    frequencyPrompt: "How often feels sustainable?",
    frequencyHelper: "Start small. You can adjust later.",
    confirmPrompt: "Here's your plan.",
    confirmHelper: "We can tweak this anytime.",
  },

  quickSetup: {
    title: "Quick Setup",
    subtitle: "Just a few questions to personalize your experience.",
    step1Title: "What's your weekly rhythm?",
    step1Helper: "This helps me time suggestions better.",
    busyDaysLabel: "Busiest days (optional)",
    schedules: {
      "9to5": "9-to-5 routine",
      nightShift: "Night shift / late hours",
      student: "Student schedule",
      mixed: "Mixed / varies",
      rebuilding: "Rebuilding from scratch",
    },
    step2Title: "Your daily anchors",
    step2Helper: "Approximate times are fine.",
    wakeLabel: "I usually wake up around",
    windDownLabel: "I start winding down around",
    step3Title: "Pick one area to start with",
    step3Helper: "We'll set up something small to begin.",
    focusAreas: {
      body: "Body",
      food: "Food",
      mind: "Mind",
      money: "Money",
      spirit: "Spirit",
      work: "School / Work",
    },
    step4Title: "Meet DW",
    step4Helper: "Your personal wellness companion.",
    dwSummary: (schedule: string, focus: string) => 
      `Got it. You're on a ${schedule} rhythm and want to start with ${focus}. I've got a few ideas already.`,
    createStarterCta: "Create my first starter block",
    skipForNow: "Skip for now",
    finishing: "Setting things up for you...",
    complete: "You're all set!",
    starterMessages: {
      body: "Added a starter workout block to your calendar.",
      food: "Added a meal prep reminder to get you started.",
      mind: "Added a 2-minute reset to your routines.",
      money: "Added a quick budget check-in to your plan.",
      spirit: "Added a reflection moment to your day.",
      work: "Added a 30-min focus block to your schedule.",
    },
  },

  starterSpotlight: {
    title: "Your first block is live.",
    subtitle: "You're officially not starting from zero.",
    bodyByFocus: {
      body: "I set up a simple movement block. Nothing extreme — just enough to get your body back online.",
      food: "I added a starter food check so meals don't turn into a last-minute scramble.",
      mind: "I dropped in a short reset. Two minutes to slow things down and clear the noise.",
      money: "I added a quick money check-in. Awareness first — decisions come easier after.",
      spirit: "I set aside a small reflection moment. No pressure. Just space.",
      work: "I created a focused work block so your energy has somewhere to go.",
    },
    meta: "Created just now.",
    ctaPrimary: "Take me to it",
    ctaSecondary: "I'll come back later",
    toastOnView: "Here it is.",
  },

  dwChat: {
    welcomeAfterSetup: (scheduleType: string, busyDays: string, focusArea: string) => 
      `Alright. I've got a feel for your rhythm now.\nYou're on a ${scheduleType} flow, busiest on ${busyDays}, and you want to start with ${focusArea}.\nI set something small up so you're not starting from zero.\nWant to look at what I made — or do you want help with tonight first?`,
  },

  lifeSystem: {
    cardTitle: "Build Your Life System",
    cardSubtitle: "Not just wellness \u2014 how everything in your life works together.",
    cardCTA: "Learn how this works",
    explanation: `A life system is the way all parts of your life support \u2014 or drain \u2014 each other.

Wellness is part of it, but not the whole thing.

Your energy, schedule, relationships, environment, money, habits, emotions, and purpose all interact.

DW helps you see those connections, not just track tasks.`,
    dimensionsNote: "We start with wellness dimensions because they affect everything else \u2014 but your life system goes deeper than that.",
    areas: [
      "Body & energy",
      "Emotions & mental state", 
      "Relationships & social life",
      "Environment & routines",
      "Work, money & responsibilities",
      "Purpose, meaning & growth",
    ],
    areasExplanation: "Wellness dimensions help regulate the system \u2014 they are not the system itself.",
    ctaShowAreas: "Show me the areas of a life system",
    ctaStartHere: "Help me start where I am",

    setupSuccess: {
      title: "You're set.",
      subtitle: "Small structure. Real momentum.",
      lines: {
        rhythm: "Weekly rhythm saved",
        anchors: "Wake + wind-down set",
        focus: (focusLabel: string) => `Focus: ${focusLabel}`,
        starterCreated: "Starter block created",
        starterReady: "Starter block ready when you are",
        editAnytime: "You can edit this anytime.",
      },
      buttons: {
        goToDW: "Go to DW",
        viewWhatYouMade: "View what you made",
      },
    },

    focusLabels: {
      body: "Body",
      food: "Food",
      mind: "Mind",
      money: "Money",
      spirit: "Spirit",
      work: "Work / School",
    } as Record<string, string>,
  },

  emptyStates: {
    habits: {
      title: "Nothing here yet.",
      body: "Small, consistent actions build momentum over time.",
      cta: "Add your first habit",
    },
    goals: {
      title: "Nothing here yet.",
      body: "Defining what you want makes it easier to move toward it.",
      cta: "Set your first goal",
    },
    schedule: {
      title: "Nothing scheduled today.",
      body: "Add an event or let DW suggest something.",
    },
    plans: {
      active: "No active plans. Start a new one whenever you're ready.",
      draft: "No drafts saved.",
      archived: "Nothing archived.",
    },
    insights: {
      title: "No insights yet.",
      body: "Start a conversation with DW to generate your first insight.",
    },
    journal: {
      title: "No entries yet.",
      body: "Talk with DW to create your first journal entry.",
    },
    browse: {
      title: "Nothing here yet.",
      body: "Try adjusting your filters.",
    },
    saved: {
      title: "Saved for later",
      body: "Content you save will appear here. Explore to get started.",
    },
    forYou: {
      title: "Personalized for you",
      body: "Based on your current energy and recent activity.",
    },
    streaks: {
      title: "No streaks yet.",
      body: "Show up consistently to start building one.",
    },
  },

  whySeeingThis: {
    habits: "These habits align with what you're working on.",
    goals: "Goals here reflect what you've told DW matters to you.",
    insights: "Generated from your conversations with DW.",
    recommendations: "Based on your current energy and recent activity.",
    schedule: "Events and blocks you've added or DW has suggested.",
    streaks: "Consistency across your habits and check-ins.",
  },

  dwReadingCard: {
    sectionLabel: "DW Reading",
    fallbackPrompt: "Where are you at right now — honestly?",
    orbLabel: "Talk to DW",
  },

  onboardingValuePreview: {
    skipLabel: "Skip",
    skipToAppLabel: "Skip to app",
    nextLabel: "Next",
    beginLabel: "Begin",
  },

  milestoneMoment: {
    reflectCTA: "Reflect with DW",
    dismissLabel: "Dismiss milestone",
  },
};
