import { BRAND } from "../config/brand";

export const COPY = {
  appHeader: BRAND.appName,
  appSubheader: BRAND.descriptor,
  tagline: BRAND.tagline,

  onboarding: {
    screen1Title: "Pause for a second.",
    screen1Body: "You don't need to change anything right now. This space is about noticing — then choosing.",
    ctaStart: "Let's flip the switch",

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
    closeCTA: "Enter Flip the Switch",
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
};
