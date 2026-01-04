import { BRAND } from "../config/brand";

export const COPY = {
  appHeader: BRAND.appName,
  appSubheader: BRAND.descriptor,
  tagline: BRAND.tagline,

  onboarding: {
    screen1Title: "Pause for a second.",
    screen1Body: "You don't need to fix anything right now. This space is about noticing — then choosing.",
    ctaStart: "Let's flip the switch",

    energyPrompt: "What's the energy right now?",
    energyOptions: ["Calm but alert", "Heavy and loud", "Scattered", "Pushing through", "I don't know yet"],

    backgroundPrompt: "What's running in the background?",
    backgroundOptions: ["Stress / pressure", "Overthinking", "Low motivation", "Emotional weight", "Just observing"],

    boundaryTitle: "You're in control.",
    boundaryBody: "I'm not here to tell you what to feel. I help you slow things down, look at what's happening, and choose how you want to respond.",
    boundaryCTA: "That works",

    closeTitle: "You don't have to use this every day.",
    closeBody: "You use it when you want clarity.",
    closeCTA: "Enter Flip the Switch",
  },

  states: {
    loading: "Hold on — pulling it together.",
    empty: "Nothing here yet. That's okay.",
    error: "That didn't save just yet.",
    errorSubtext: "You can try again, or come back later.",
    success: "Saved.",
    offline: "Saved on this device.",
    offlineSubtext: "We'll sync when you're connected.",
    unavailable: "This isn't ready yet.",
  },

  actions: {
    continue: "Continue",
    back: "Back",
    skip: "Skip for now",
    done: "Done",
    notNow: "Not Now",
    cancel: "Cancel",
    finishLater: "Finish Later",
  },

  buttons: {
    saveToSystem: "Save to My System",
    addToCalendar: "Add to Calendar",
    activatePlan: "Activate Plan",
    confirmAdd: "Confirm & Add",
    saveChanges: "Save Changes",
    saved: "Saved",
    added: "Added",
    addToPlan: "Add to My Plan",
    viewDetails: "View Details",
    goBack: "Go Back",
    returnHome: "Return Home",
  },

  microcopy: {
    trackMood: "Notice the pattern.",
    getRecommendations: "See another way to look at this.",
    aiResponse: "Perspective shift.",
    dailyCheckin: "Energy check.",
    pickOne: "Pick one to save.",
    pickOneToday: "Pick one for today.",
    pickOneDisabled: "Pick 1 option to save.",
    selectAll: "Select all that apply.",
    feelingsPrompt: "What's coming up for you right now?",
  },

  toasts: {
    saved: "Saved.",
    added: "Added to your system.",
    addedToday: "Added to today.",
    updated: "Updated.",
    noted: "Noted.",
    mealSaved: "Meal saved.",
    meditationSaved: "Meditation saved.",
    workoutAdded: "Workout added.",
    planSaved: "Plan saved.",
  },

  browse: {
    header: "Browse",
    searchPlaceholder: "Search within this category...",
    filters: "Filters",
    empty: "Nothing here yet — try adjusting filters.",
    exploreCategory: (category: string) => `Explore resources for ${category}.`,
  },

  challenges: {
    viewDetails: "View Details",
    addToPlan: "Add to My Plan",
    addToCalendar: "Add to Calendar",
  },

  tour: {
    start: "Start Tour",
    next: "Next",
    tryIt: "Try It",
    skip: "Skip Tour",
    dontShow: "Don't Show Again",
  },

  auth: {
    signIn: "Sign In",
    signUp: "Sign Up",
    logOut: "Log Out",
  },

  menu: {
    appTour: "App Tour",
    feedback: "Feedback",
    settings: "Settings",
  },
};
