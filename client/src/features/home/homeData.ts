/**
 * homeData.ts – mock data for the Home Command Center.
 *
 * Used as fallback/demo values when real API data is unavailable (guest
 * mode or first load). All fields match the shape expected by card components.
 */

export const MOCK_HOME_DATA = {
  today: {
    nextEvent: { title: "Morning stand-up", time: "9:00 AM" },
    priority: "Finish onboarding flow",
    workoutStatus: "Workout scheduled",
    caloriesTarget: 2100,
  },
  insight: {
    text: "You've been choosing depth over distraction in your relationships.",
    tag: "Relationships",
    badge: "•",
  },
  plan: {
    title: "Energy Stabilization Plan",
    progress: 30,
    nextStep: "Complete morning routine",
    badge: "30%",
  },
  health: {
    caloriesRemaining: 850,
    proteinStatus: "Protein intake low",
    badge: "850",
  },
  momentum: {
    streakLabel: "Workout streak: 4 days",
    brokenNote: null as string | null,
    badge: "4d",
  },
  followUp: {
    lastTopic: "Emotional boundaries",
    prompt: "Want to continue this conversation?",
    badge: "1",
  },
} as const;

export type MockHomeData = typeof MOCK_HOME_DATA;
