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
    error: "Something glitched. Try that again.",
    success: "Locked in.",
  },

  actions: {
    continue: "Continue",
    back: "Back",
    skip: "Skip for now",
    done: "Done",
  },

  microcopy: {
    trackMood: "Notice the pattern.",
    getRecommendations: "See another way to look at this.",
    aiResponse: "Perspective shift.",
    dailyCheckin: "Energy check.",
  }
};
