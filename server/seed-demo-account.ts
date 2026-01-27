/**
 * Demo Account Seeder for App Store Review
 * 
 * This script creates a demo account with pre-populated data across all features
 * for App Store reviewers to test the app.
 * 
 * Demo Account Credentials:
 * Email: demo@fliptheswitch.app
 * Password: AppStore2026!
 */

import bcrypt from "bcrypt";
import { db } from "./storage";
import { 
  users, 
  goals, 
  habits, 
  routines, 
  scheduleBlocks, 
  moodLogs,
  checkIns,
  mealPlans,
  workouts,
  conversations,
  messages
} from "../shared/schema";
import { eq } from "drizzle-orm";

const SALT_ROUNDS = 10;

const DEMO_EMAIL = "demo@fliptheswitch.app";
const DEMO_PASSWORD = "AppStore2026!";

async function seedDemoAccount() {
  console.log("Starting demo account seeding...");

  try {
    // 1. Check if demo user already exists
    const existingUser = await db.select().from(users).where(eq(users.email, DEMO_EMAIL)).limit(1);
    
    let userId: string;
    
    if (existingUser.length > 0) {
      console.log("Demo user already exists, updating data...");
      userId = existingUser[0].id;
      
      // Update password in case it changed
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
      await db.update(users)
        .set({ 
          password: hashedPassword,
          onboardingCompleted: true,
          systemName: "Life Balance System"
        })
        .where(eq(users.id, userId));
    } else {
      console.log("Creating new demo user...");
      const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
      const [newUser] = await db.insert(users).values({
        email: DEMO_EMAIL,
        password: hashedPassword,
        firstName: "Demo",
        username: "demo_user",
        systemName: "Life Balance System",
        onboardingCompleted: true,
        role: "user",
      }).returning();
      userId = newUser.id;
    }

    console.log(`Demo user ID: ${userId}`);

    // 2. Clear existing demo data for fresh seed
    await db.delete(goals).where(eq(goals.userId, userId));
    await db.delete(habits).where(eq(habits.userId, userId));
    await db.delete(routines).where(eq(routines.userId, userId));
    await db.delete(scheduleBlocks).where(eq(scheduleBlocks.userId, userId));
    await db.delete(moodLogs).where(eq(moodLogs.userId, userId));
    await db.delete(checkIns).where(eq(checkIns.userId, userId));
    await db.delete(mealPlans).where(eq(mealPlans.userId, userId));
    await db.delete(workouts).where(eq(workouts.userId, userId));
    await db.delete(messages).where(eq(messages.userId, userId));
    await db.delete(conversations).where(eq(conversations.userId, userId));

    console.log("Cleared existing demo data");

    // 3. Create Goals
    const demoGoals = [
      {
        userId,
        title: "Run a 5K",
        category: "physical",
        status: "in_progress" as const,
        priority: "high" as const,
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        notes: "Training for my first 5K race. Following a 12-week beginner plan.",
      },
      {
        userId,
        title: "Daily Meditation Practice",
        category: "spiritual",
        status: "in_progress" as const,
        priority: "medium" as const,
        notes: "Building a consistent 10-minute morning meditation habit.",
      },
      {
        userId,
        title: "Save $5000 Emergency Fund",
        category: "financial",
        status: "in_progress" as const,
        priority: "high" as const,
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 6 months
        notes: "Setting aside $200/month for emergency savings.",
      },
    ];

    await db.insert(goals).values(demoGoals);
    console.log("Created demo goals");

    // 4. Create Habits
    const demoHabits = [
      {
        userId,
        name: "Morning Stretch",
        frequency: "daily" as const,
        timeOfDay: "morning" as const,
        streak: 12,
        lastCompleted: new Date(),
        notes: "5-minute morning stretching routine",
      },
      {
        userId,
        name: "Drink 8 Glasses of Water",
        frequency: "daily" as const,
        streak: 7,
        lastCompleted: new Date(),
      },
      {
        userId,
        name: "Read for 30 Minutes",
        frequency: "daily" as const,
        timeOfDay: "evening" as const,
        streak: 5,
        lastCompleted: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
        notes: "Currently reading 'Atomic Habits'",
      },
    ];

    await db.insert(habits).values(demoHabits);
    console.log("Created demo habits");

    // 5. Create Routines
    const demoRoutines = [
      {
        userId,
        name: "Morning Energizer",
        description: "My energizing morning routine to start the day right",
        tasks: JSON.stringify([
          { id: "1", text: "Drink glass of water", completed: false },
          { id: "2", text: "5-minute stretch", completed: false },
          { id: "3", text: "Meditation (10 min)", completed: false },
          { id: "4", text: "Healthy breakfast", completed: false },
        ]),
        isActive: true,
      },
      {
        userId,
        name: "Evening Wind Down",
        description: "Calm evening routine for better sleep",
        tasks: JSON.stringify([
          { id: "1", text: "Put away devices", completed: false },
          { id: "2", text: "Journal reflection", completed: false },
          { id: "3", text: "Read for 30 minutes", completed: false },
          { id: "4", text: "Bedtime stretch", completed: false },
        ]),
        isActive: true,
      },
    ];

    await db.insert(routines).values(demoRoutines);
    console.log("Created demo routines");

    // 6. Create Schedule Blocks
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const demoScheduleBlocks = [
      {
        userId,
        title: "Morning Workout",
        startTime: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7 AM
        endTime: new Date(today.getTime() + 8 * 60 * 60 * 1000), // 8 AM
        category: "physical",
        isRecurring: true,
        recurrencePattern: JSON.stringify({ frequency: "daily" }),
      },
      {
        userId,
        title: "Work Focus Block",
        startTime: new Date(today.getTime() + 9 * 60 * 60 * 1000), // 9 AM
        endTime: new Date(today.getTime() + 12 * 60 * 60 * 1000), // 12 PM
        category: "professional",
        isRecurring: true,
        recurrencePattern: JSON.stringify({ frequency: "weekdays" }),
      },
      {
        userId,
        title: "Meal Prep Sunday",
        startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM
        endTime: new Date(today.getTime() + 16 * 60 * 60 * 1000), // 4 PM
        category: "physical",
        notes: "Prepare meals for the week",
      },
    ];

    await db.insert(scheduleBlocks).values(demoScheduleBlocks);
    console.log("Created demo schedule blocks");

    // 7. Create Mood Logs
    const demoMoodLogs = [
      {
        userId,
        energy: 8,
        mood: 7,
        clarity: 8,
        notes: "Great start to the day! Morning routine really helps.",
        timestamp: new Date(),
      },
      {
        userId,
        energy: 6,
        mood: 6,
        clarity: 7,
        notes: "Feeling good after workout, ready for the day.",
        timestamp: new Date(Date.now() - 24 * 60 * 60 * 1000), // yesterday
      },
      {
        userId,
        energy: 5,
        mood: 6,
        clarity: 5,
        notes: "Midday slump, need to remember afternoon walk.",
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
      },
    ];

    await db.insert(moodLogs).values(demoMoodLogs);
    console.log("Created demo mood logs");

    // 8. Create Check-ins
    const demoCheckIns = [
      {
        userId,
        weekNumber: getCurrentWeekNumber(),
        physicalWellness: 8,
        emotionalWellness: 7,
        socialWellness: 6,
        financialWellness: 7,
        spiritualWellness: 7,
        notes: "Feeling balanced overall. Exercise is going well, could improve social connections.",
        completedAt: new Date(),
      },
    ];

    await db.insert(checkIns).values(demoCheckIns);
    console.log("Created demo check-ins");

    // 9. Create Meal Plans
    const demoMealPlans = [
      {
        userId,
        name: "Healthy Week Meal Plan",
        meals: JSON.stringify([
          {
            day: "Monday",
            breakfast: "Greek yogurt with berries and granola",
            lunch: "Grilled chicken salad",
            dinner: "Baked salmon with roasted vegetables",
          },
          {
            day: "Tuesday",
            breakfast: "Oatmeal with banana and almonds",
            lunch: "Turkey wrap with hummus",
            dinner: "Stir-fry with brown rice",
          },
        ]),
        isActive: true,
      },
    ];

    await db.insert(mealPlans).values(demoMealPlans);
    console.log("Created demo meal plans");

    // 10. Create Workouts
    const demoWorkouts = [
      {
        userId,
        name: "Beginner 5K Training - Week 1",
        description: "Easy run/walk intervals",
        exercises: JSON.stringify([
          { name: "Warm-up walk", duration: "5 minutes" },
          { name: "Run/Walk intervals", duration: "20 minutes", notes: "1 min run, 2 min walk" },
          { name: "Cool-down walk", duration: "5 minutes" },
        ]),
        difficulty: "beginner",
      },
      {
        userId,
        name: "Full Body Strength",
        description: "Basic strength training routine",
        exercises: JSON.stringify([
          { name: "Push-ups", reps: "3 sets x 10 reps" },
          { name: "Squats", reps: "3 sets x 15 reps" },
          { name: "Plank", duration: "3 sets x 30 seconds" },
          { name: "Lunges", reps: "3 sets x 10 reps each leg" },
        ]),
        difficulty: "beginner",
      },
    ];

    await db.insert(workouts).values(demoWorkouts);
    console.log("Created demo workouts");

    // 11. Create AI Conversation
    const [conversation] = await db.insert(conversations).values({
      userId,
      title: "Getting Started with DW",
    }).returning();

    const demoMessages = [
      {
        userId,
        conversationId: conversation.id,
        role: "user" as const,
        content: "Hi! I'm interested in building a more balanced wellness routine. Can you help me get started?",
      },
      {
        userId,
        conversationId: conversation.id,
        role: "assistant" as const,
        content: "Hello! I'd be happy to help you build a balanced wellness routine. I can see you've already set up some great goals around physical fitness, meditation, and financial wellness.\n\nLet's focus on what matters most to you right now. I notice you're training for a 5K - that's exciting! How are you feeling about your current energy levels and overall wellness? This will help me provide more personalized guidance.\n\nI can help you with:\n- Creating sustainable daily routines\n- Planning meals that support your goals\n- Building meditation and mindfulness practices\n- Managing your schedule and energy\n- Tracking progress across all wellness dimensions\n\nWhat area would you like to focus on first?",
      },
      {
        userId,
        conversationId: conversation.id,
        role: "user" as const,
        content: "I'd like to make sure I'm eating well to support my running training. Can you help with meal planning?",
      },
      {
        userId,
        conversationId: conversation.id,
        role: "assistant" as const,
        content: "Absolutely! Nutrition is key for running performance and recovery. I can see you already have a 'Healthy Week Meal Plan' set up, which is a great start.\n\nFor 5K training, focus on:\n- **Complex carbs** for energy (oats, brown rice, sweet potatoes)\n- **Lean protein** for muscle recovery (chicken, fish, legumes)\n- **Hydration** - aim for 8+ glasses of water daily\n- **Timing** - eat a light carb-rich snack 1-2 hours before runs\n\nWould you like me to help you:\n1. Expand your meal plan with running-specific recipes?\n2. Create a pre/post-workout nutrition guide?\n3. Set up meal prep reminders for Sundays?\n\nI notice you have 'Meal Prep Sunday' already scheduled - that's perfect timing!",
      },
    ];

    await db.insert(messages).values(demoMessages);
    console.log("Created demo AI conversation");

    console.log("\n✅ Demo account seeding complete!");
    console.log("\n📧 Demo Account Credentials:");
    console.log("Email: demo@fliptheswitch.app");
    console.log("Password: AppStore2026!");
    console.log("\nThis account has pre-populated data including:");
    console.log("- 3 active goals (fitness, meditation, savings)");
    console.log("- 3 daily habits with streak tracking");
    console.log("- 2 wellness routines (morning & evening)");
    console.log("- Daily schedule blocks");
    console.log("- Mood tracking entries");
    console.log("- Weekly check-in data");
    console.log("- Meal plans and workouts");
    console.log("- AI conversation history");

  } catch (error) {
    console.error("Error seeding demo account:", error);
    throw error;
  }
}

function getCurrentWeekNumber(): number {
  // Simple week number calculation for demo purposes
  // Week 1 is the first week of the year
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

// Run the seeder if this file is executed directly
// Using require.main === module pattern for better compatibility
const isMainModule = process.argv[1]?.includes('seed-demo-account');

if (isMainModule) {
  seedDemoAccount()
    .then(() => {
      console.log("Seeding completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Seeding failed:", error);
      process.exit(1);
    });
}

export { seedDemoAccount, DEMO_EMAIL, DEMO_PASSWORD };
