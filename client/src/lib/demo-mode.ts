/**
 * Demo Mode - Pre-populated wellness data for app reviewers
 * Creates a complete demo experience showcasing all features
 */

import {
  saveConversation,
  saveProfileSetup,
  saveCalendarEvent,
  saveMoodLog,
  saveUserResource,
  saveBodyProfile,
  saveMealPrepPreferences,
  saveWorkoutPreferences,
  saveFinanceProfile,
  saveSpiritualProfile,
  type ChatMessage,
  type WellnessDimension,
} from "./guest-storage";

export const DEMO_CREDENTIALS = {
  username: "demo@dimensionalwellness.app",
  password: "",
  note: "Demo mode runs locally on your device - no password required"
};

/**
 * Initialize demo mode with comprehensive pre-filled data
 * This creates a realistic wellness journey for reviewers to explore
 */
export function initializeDemoMode(): void {
  // Clear only demo-related keys to preserve user settings
  const keysToRemove: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && (key.startsWith("fts:") || key === "guestData")) {
      keysToRemove.push(key);
    }
  }
  keysToRemove.forEach(key => localStorage.removeItem(key));
  
  // Set demo mode flag
  localStorage.setItem("fts:demo_mode", "true");
  
  // Create profile setup (as if user completed onboarding)
  saveProfileSetup({
    scheduleType: "9to5",
    busiestDays: [1, 2, 3, 4, 5], // Monday-Friday
    wakeTime: "6:30 AM",
    windDownTime: "10:00 PM",
    focusArea: "body",
    completedAt: Date.now() - (7 * 24 * 60 * 60 * 1000), // 7 days ago
    metDW: true,
    skipped: false,
  });
  
  // Mark as returning user
  localStorage.setItem("fts:isReturning", "1");
  
  // Create demo conversations
  createDemoConversations();
  
  // Create demo wellness data
  createDemoWellnessData();
  
  // Create demo calendar events
  createDemoCalendarEvents();
  
  // Create demo mood logs
  createDemoMoodLogs();
  
  // Create demo profiles
  createDemoProfiles();
}

function createDemoConversations(): void {
  const conversations = [
    {
      id: "demo-conv-1",
      title: "Getting Started with DW",
      category: "general",
      messages: [
        {
          role: "user" as const,
          content: "Hi! I'm new here and want to improve my wellness.",
          timestamp: Date.now() - (6 * 24 * 60 * 60 * 1000),
        },
        {
          role: "assistant" as const,
          content: "Welcome! I'm here to help you build a sustainable wellness system. Let's start by understanding your current rhythm. What does a typical day look like for you?",
          timestamp: Date.now() - (6 * 24 * 60 * 60 * 1000) + 1000,
        },
        {
          role: "user" as const,
          content: "I work 9-5, feel tired most days, and want to be more active.",
          timestamp: Date.now() - (6 * 24 * 60 * 60 * 1000) + 2000,
        },
        {
          role: "assistant" as const,
          content: "Thank you for sharing that. Low energy with a desk job is common, and we can definitely work on that. I notice you mentioned wanting to be more active - that's a great starting point. Would you like to:\n\n1. Start with gentle morning movement to boost energy\n2. Add midday breaks to counter desk fatigue\n3. Create an evening routine to improve sleep quality\n\nWhat feels most aligned with your energy right now?",
          timestamp: Date.now() - (6 * 24 * 60 * 60 * 1000) + 3000,
        },
      ],
      createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
      lastMessageAt: Date.now() - (6 * 24 * 60 * 60 * 1000) + 3000,
    },
    {
      id: "demo-conv-2",
      title: "Meal Planning Help",
      category: "nutrition",
      messages: [
        {
          role: "user" as const,
          content: "I want to eat healthier but I'm always too tired to cook.",
          timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000),
        },
        {
          role: "assistant" as const,
          content: "I hear you - meal planning when you're already tired can feel overwhelming. Let's make this easier:\n\n**Quick wins for busy schedules:**\n- Prep once, eat multiple times (batch cooking on Sunday)\n- Focus on 3-ingredient meals to start\n- Keep 5 go-to recipes that take under 20 minutes\n\nWould you like me to suggest some simple meal prep ideas that match your energy level?",
          timestamp: Date.now() - (3 * 24 * 60 * 60 * 1000) + 1000,
        },
      ],
      createdAt: Date.now() - (3 * 24 * 60 * 60 * 1000),
      lastMessageAt: Date.now() - (3 * 24 * 60 * 60 * 1000) + 1000,
    },
    {
      id: "demo-conv-3",
      title: "Stress Management",
      category: "emotional",
      messages: [
        {
          role: "user" as const,
          content: "I've been feeling overwhelmed lately. How can I manage stress better?",
          timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000),
        },
        {
          role: "assistant" as const,
          content: "Thank you for sharing that. Feeling overwhelmed is a signal your nervous system needs support. Let's build in some gentle practices:\n\n**Immediate relief:**\n- 2-minute breathing exercise (4 counts in, 6 counts out)\n- Step outside for 5 minutes\n- Name what you're feeling without judgment\n\n**Longer-term support:**\n- Daily 10-minute journal session\n- Set boundaries around work hours\n- Schedule weekly 'unplug' time\n\nWhich of these feels most accessible to you right now?",
          timestamp: Date.now() - (1 * 24 * 60 * 60 * 1000) + 1000,
        },
      ],
      createdAt: Date.now() - (1 * 24 * 60 * 60 * 1000),
      lastMessageAt: Date.now() - (1 * 24 * 60 * 60 * 1000) + 1000,
    },
  ];
  
  conversations.forEach(conv => {
    saveConversation(conv.id, conv.title, conv.category, conv.messages);
  });
}

function createDemoWellnessData(): void {
  // Create demo goals
  saveUserResource({
    id: "demo-goal-1",
    type: "goal",
    title: "Exercise 3x per week",
    description: "Build a consistent movement practice with 3 workouts weekly",
    dimension: "physical",
    status: "active",
    tags: ["fitness", "routine"],
    createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now() - (1 * 24 * 60 * 60 * 1000),
  });
  
  saveUserResource({
    id: "demo-goal-2",
    type: "goal",
    title: "Daily journaling",
    description: "Reflect each evening on what went well and what I learned",
    dimension: "emotional",
    status: "active",
    tags: ["mindfulness", "reflection"],
    createdAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now(),
  });
  
  // Create demo habits
  saveUserResource({
    id: "demo-habit-1",
    type: "habit",
    title: "Morning stretch routine",
    description: "10-minute gentle stretching to wake up the body",
    dimension: "physical",
    status: "active",
    tags: ["morning", "movement"],
    createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now(),
  });
  
  saveUserResource({
    id: "demo-habit-2",
    type: "habit",
    title: "Drink water first thing",
    description: "16oz water before coffee to rehydrate",
    dimension: "physical",
    status: "active",
    tags: ["morning", "hydration"],
    createdAt: Date.now() - (6 * 24 * 60 * 60 * 1000),
    updatedAt: Date.now(),
  });
}

function createDemoCalendarEvents(): void {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Morning workout (today at 7 AM)
  const morningWorkout = new Date(today);
  morningWorkout.setHours(7, 0, 0, 0);
  saveCalendarEvent({
    title: "Morning Workout",
    description: "30-minute strength training session",
    dimension: "physical",
    startTime: morningWorkout.getTime(),
    endTime: morningWorkout.getTime() + (30 * 60 * 1000),
    isAllDay: false,
    location: "Home Gym",
    virtualLink: null,
    reminders: [15],
    recurring: true,
    recurrencePattern: "Mon, Wed, Fri",
    relatedFoundationIds: [],
    tags: ["workout", "routine"],
  });
  
  // Lunch break walk (today at 12:30 PM)
  const lunchWalk = new Date(today);
  lunchWalk.setHours(12, 30, 0, 0);
  saveCalendarEvent({
    title: "Midday Walk",
    description: "15-minute walk to reset and recharge",
    dimension: "physical",
    startTime: lunchWalk.getTime(),
    endTime: lunchWalk.getTime() + (15 * 60 * 1000),
    isAllDay: false,
    location: null,
    virtualLink: null,
    reminders: [5],
    recurring: true,
    recurrencePattern: "Daily",
    relatedFoundationIds: [],
    tags: ["movement", "break"],
  });
  
  // Evening journaling (today at 9 PM)
  const eveningJournal = new Date(today);
  eveningJournal.setHours(21, 0, 0, 0);
  saveCalendarEvent({
    title: "Evening Reflection",
    description: "10 minutes of journaling and gratitude",
    dimension: "emotional",
    startTime: eveningJournal.getTime(),
    endTime: eveningJournal.getTime() + (10 * 60 * 1000),
    isAllDay: false,
    location: null,
    virtualLink: null,
    reminders: [10],
    recurring: true,
    recurrencePattern: "Daily",
    relatedFoundationIds: [],
    tags: ["journaling", "mindfulness"],
  });
  
  // Weekly meal prep (Sunday at 2 PM)
  const mealPrep = new Date(today);
  const daysUntilSunday = (7 - today.getDay()) % 7;
  mealPrep.setDate(today.getDate() + daysUntilSunday);
  mealPrep.setHours(14, 0, 0, 0);
  saveCalendarEvent({
    title: "Meal Prep Session",
    description: "Prepare healthy meals for the week ahead",
    dimension: "physical",
    startTime: mealPrep.getTime(),
    endTime: mealPrep.getTime() + (90 * 60 * 1000),
    isAllDay: false,
    location: "Kitchen",
    virtualLink: null,
    reminders: [60],
    recurring: true,
    recurrencePattern: "Weekly on Sunday",
    relatedFoundationIds: [],
    tags: ["meal-prep", "nutrition"],
  });
}

function createDemoMoodLogs(): void {
  // Create mood logs for the past 7 days
  for (let i = 6; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    date.setHours(20, 0, 0, 0);
    
    const moods = ["good", "great", "okay", "tired", "energized"];
    const energyLevels = [3, 4, 3, 2, 4];
    const clarityLevels = [4, 4, 3, 3, 5];
    
    saveMoodLog({
      mood: moods[i % moods.length],
      energy: energyLevels[i % energyLevels.length],
      clarity: clarityLevels[i % clarityLevels.length],
      tags: i === 0 ? ["productive", "focused"] : i === 3 ? ["tired", "stressed"] : ["balanced"],
      notes: i === 3 ? "Long day at work, need better sleep" : i === 0 ? "Great energy today!" : "",
      timestamp: date.getTime(),
    });
  }
}

function createDemoProfiles(): void {
  // Body profile
  saveBodyProfile({
    currentState: "Building a consistent fitness routine",
    bodyGoal: "tone",
    focusAreas: ["core strength", "flexibility", "endurance"],
    measurements: {
      weightKg: 70,
      heightCm: 170,
    },
    energyLevel: "moderate",
    notes: "Want to feel stronger and more energized throughout the day",
    updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
  });
  
  // Meal prep preferences
  saveMealPrepPreferences({
    dietaryStyle: "omnivore",
    restrictions: ["no gluten"],
    allergies: [],
    dislikedIngredients: ["mushrooms"],
    bannedIngredients: [],
    caloricTarget: 2000,
    mealsPerDay: 3,
    syncWithBodyGoal: true,
    notes: "Prefer simple, whole food ingredients",
    updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
  });
  
  // Workout preferences
  saveWorkoutPreferences({
    environment: "home",
    availableEquipment: ["dumbbells", "resistance bands", "yoga mat"],
    sessionLengthMinutes: 30,
    frequencyPerWeek: 3,
    intensity: "steady",
    focusMuscleGroups: ["core", "legs", "arms"],
    injuryNotes: "",
    prefersAiCoaching: true,
    updatedAt: Date.now() - (5 * 24 * 60 * 60 * 1000),
  });
  
  // Finance profile
  saveFinanceProfile({
    budgetTier: "moderate",
    moneyEmotion: "neutral",
    savingsGoal: "Build 3-month emergency fund",
    monthlyBudget: 3000,
    spendingBoundaries: ["track all expenses", "review weekly"],
    financialPriorities: ["emergency fund", "retirement", "health"],
    stressors: ["unexpected expenses"],
    notes: "Want to feel more confident about money decisions",
    updatedAt: Date.now() - (4 * 24 * 60 * 60 * 1000),
  });
  
  // Spiritual profile
  saveSpiritualProfile({
    practices: ["meditation", "journaling", "gratitude"],
    reflectionCadence: "daily",
    groundingNeeds: ["calm", "clarity"],
    beliefSystem: "mindfulness and personal growth",
    values: ["authenticity", "growth", "compassion", "balance"],
    dailyIntention: "Stay present and kind to myself",
    gratitudeAreas: ["health", "relationships", "opportunities"],
    notes: "Morning meditation helps set the tone for my day",
    updatedAt: Date.now() - (4 * 24 * 60 * 60 * 1000),
  });
}

/**
 * Check if currently in demo mode
 */
export function isDemoMode(): boolean {
  return localStorage.getItem("fts:demo_mode") === "true";
}

/**
 * Exit demo mode and clear demo data
 */
export function exitDemoMode(): void {
  const keysToRemove = [
    'demo_mode',
    'demo_user',
    'demo_profile',
    'demo_dimensions',
    'demo_mood_logs',
    'demo_conversations'
  ];
  keysToRemove.forEach(key => localStorage.removeItem(key));
}
