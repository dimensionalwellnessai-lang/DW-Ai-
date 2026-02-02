/**
 * Demo Account Seed Script for Apple App Store Review
 * 
 * This script creates a comprehensive demo account with pre-populated data
 * to showcase all features of the Dimensional Wellness app.
 * 
 * Demo Credentials:
 * Email: demo@dimensionalwellness.app
 * Password: DemoWellness2026!
 * 
 * Usage: npm run seed:demo
 */

import bcrypt from "bcrypt";
import { storage } from "./storage";
import { db } from "./db";
import { users, goals, habits, habitLogs, moodLogs, routines, calendarEvents, userProfiles, conversations } from "@shared/schema";
import { eq } from "drizzle-orm";

const DEMO_EMAIL = "demo@dimensionalwellness.app";
const DEMO_PASSWORD = "DemoWellness2026!";
const SALT_ROUNDS = 10;

/**
 * Main seed function - creates or recreates the demo account
 */
async function seedDemoAccount() {
  console.log("🌟 Starting demo account seed...\n");

  try {
    // Step 1: Delete existing demo account if it exists (idempotent)
    console.log("1️⃣  Checking for existing demo account...");
    const existingUser = await storage.getUserByEmail(DEMO_EMAIL);
    
    if (existingUser) {
      console.log("   Found existing demo account, deleting...");
      // Delete all related data first
      await db.delete(conversations).where(eq(conversations.userId, existingUser.id));
      await db.delete(calendarEvents).where(eq(calendarEvents.userId, existingUser.id));
      await db.delete(routines).where(eq(routines.userId, existingUser.id));
      await db.delete(habitLogs).where(eq(habitLogs.userId, existingUser.id));
      await db.delete(habits).where(eq(habits.userId, existingUser.id));
      await db.delete(moodLogs).where(eq(moodLogs.userId, existingUser.id));
      await db.delete(goals).where(eq(goals.userId, existingUser.id));
      await db.delete(userProfiles).where(eq(userProfiles.userId, existingUser.id));
      await db.delete(users).where(eq(users.id, existingUser.id));
      console.log("   ✅ Existing demo account deleted\n");
    } else {
      console.log("   No existing demo account found\n");
    }

    // Step 2: Create demo user
    console.log("2️⃣  Creating demo user account...");
    const hashedPassword = await bcrypt.hash(DEMO_PASSWORD, SALT_ROUNDS);
    const user = await storage.createUser({
      email: DEMO_EMAIL,
      password: hashedPassword,
      username: "Demo User",
      firstName: "Demo",
      systemName: "My Wellness System",
      onboardingCompleted: true,
    });
    console.log(`   ✅ Demo user created (ID: ${user.id})\n`);

    // Step 3: Create user profile
    console.log("3️⃣  Creating user profile...");
    await storage.createUserProfile({
      userId: user.id,
      goals: ["improve fitness", "better sleep", "reduce stress"],
      fitnessGoal: "Build consistent exercise routine",
      experienceLevel: "beginner",
      workoutLocation: "home",
      workoutEquipment: ["dumbbells", "yoga mat", "resistance bands"],
      coachingTone: "encouraging",
      meditationStyle: "guided",
      meditationDurationMin: 5,
      meditationDurationMax: 15,
      reminderPreference: "morning",
      profileCompleteness: 80,
    });
    console.log("   ✅ User profile created\n");

    // Step 4: Create goals
    console.log("4️⃣  Creating wellness goals...");
    const goalData = [
      {
        userId: user.id,
        title: "Exercise 3x per week",
        description: "Build a consistent workout routine with strength training and cardio",
        dimension: "physical",
        targetDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000), // 90 days from now
        status: "in_progress",
        priority: "high",
      },
      {
        userId: user.id,
        title: "Meditate daily for 10 minutes",
        description: "Establish a morning meditation practice to reduce stress and improve focus",
        dimension: "emotional",
        targetDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000), // 60 days from now
        status: "in_progress",
        priority: "high",
      },
      {
        userId: user.id,
        title: "Read 2 books per month",
        description: "Dedicate time to personal growth and learning",
        dimension: "intellectual",
        targetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
        status: "in_progress",
        priority: "medium",
      },
      {
        userId: user.id,
        title: "Build emergency fund",
        description: "Save $5000 for financial security and peace of mind",
        dimension: "financial",
        targetDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000), // 180 days from now
        status: "in_progress",
        priority: "high",
      },
      {
        userId: user.id,
        title: "Weekly family time",
        description: "Dedicate quality time with family every weekend",
        dimension: "relational",
        targetDate: null,
        status: "in_progress",
        priority: "medium",
      },
    ];

    for (const goal of goalData) {
      await storage.createGoal(goal);
    }
    console.log(`   ✅ Created ${goalData.length} goals\n`);

    // Step 5: Create habits
    console.log("5️⃣  Creating habits with streak data...");
    const habitData = [
      {
        userId: user.id,
        title: "Morning Workout",
        description: "30 minutes of strength training or cardio",
        frequency: "Mon, Wed, Fri",
        timeOfDay: "morning",
        dimension: "physical",
        streak: 7,
        longestStreak: 12,
      },
      {
        userId: user.id,
        title: "Drink 8 glasses of water",
        description: "Stay hydrated throughout the day",
        frequency: "daily",
        timeOfDay: "all-day",
        dimension: "physical",
        streak: 14,
        longestStreak: 21,
      },
      {
        userId: user.id,
        title: "Evening Journaling",
        description: "Reflect on the day and practice gratitude",
        frequency: "daily",
        timeOfDay: "evening",
        dimension: "emotional",
        streak: 5,
        longestStreak: 10,
      },
      {
        userId: user.id,
        title: "Read for 20 minutes",
        description: "Personal development or leisure reading before bed",
        frequency: "daily",
        timeOfDay: "evening",
        dimension: "intellectual",
        streak: 3,
        longestStreak: 8,
      },
    ];

    const createdHabits = [];
    for (const habit of habitData) {
      const createdHabit = await storage.createHabit(habit);
      createdHabits.push(createdHabit);
    }
    console.log(`   ✅ Created ${habitData.length} habits\n`);

    // Step 6: Create habit logs for the past 7 days
    console.log("6️⃣  Creating habit logs...");
    let logCount = 0;
    for (const habit of createdHabits) {
      // Create logs for past 7 days (not all days - realistic streak)
      const daysToLog = habit.frequency === "daily" ? 7 : 3; // Daily habits get more logs
      for (let i = 0; i < daysToLog; i++) {
        const logDate = new Date();
        logDate.setDate(logDate.getDate() - i);
        logDate.setHours(12, 0, 0, 0);
        
        await storage.createHabitLog({
          habitId: habit.id,
          userId: user.id,
          completedAt: logDate,
          notes: i === 0 ? "Feeling great today!" : undefined,
        });
        logCount++;
      }
    }
    console.log(`   ✅ Created ${logCount} habit logs\n`);

    // Step 7: Create routines
    console.log("7️⃣  Creating routines...");
    const routineData = [
      {
        userId: user.id,
        title: "Morning Routine",
        description: "Energizing morning flow to start the day right",
        timeOfDay: "morning",
        estimatedDuration: 45,
        steps: [
          { order: 1, description: "Wake up at 6:30 AM", duration: 0 },
          { order: 2, description: "Drink water and stretch", duration: 5 },
          { order: 3, description: "Meditation practice", duration: 10 },
          { order: 4, description: "Morning workout", duration: 25 },
          { order: 5, description: "Healthy breakfast", duration: 15 },
        ],
        isActive: true,
      },
      {
        userId: user.id,
        title: "Evening Wind-Down",
        description: "Calming routine to prepare for restful sleep",
        timeOfDay: "evening",
        estimatedDuration: 30,
        steps: [
          { order: 1, description: "Stop screen time at 9 PM", duration: 0 },
          { order: 2, description: "Light stretching or yoga", duration: 10 },
          { order: 3, description: "Journaling and gratitude", duration: 10 },
          { order: 4, description: "Reading", duration: 20 },
          { order: 5, description: "Prepare for bed", duration: 10 },
        ],
        isActive: true,
      },
      {
        userId: user.id,
        title: "Sunday Reset",
        description: "Weekly planning and preparation routine",
        timeOfDay: "afternoon",
        estimatedDuration: 90,
        steps: [
          { order: 1, description: "Review past week's progress", duration: 15 },
          { order: 2, description: "Meal prep for the week", duration: 45 },
          { order: 3, description: "Plan schedule for upcoming week", duration: 20 },
          { order: 4, description: "Set weekly goals and intentions", duration: 10 },
        ],
        isActive: true,
      },
    ];

    for (const routine of routineData) {
      await storage.createRoutine(routine);
    }
    console.log(`   ✅ Created ${routineData.length} routines\n`);

    // Step 8: Create mood logs for past 7 days
    console.log("8️⃣  Creating mood logs...");
    const moods = [
      { value: 7, emoji: "😊", label: "energized", notes: "Great energy today!" },
      { value: 8, emoji: "😄", label: "happy", notes: "Accomplished a lot" },
      { value: 6, emoji: "😌", label: "content", notes: "Peaceful day" },
      { value: 5, emoji: "😐", label: "tired", notes: "Long work day" },
      { value: 7, emoji: "💪", label: "motivated", notes: "Crushing my goals" },
      { value: 6, emoji: "😌", label: "calm", notes: "Taking it easy" },
      { value: 8, emoji: "🌟", label: "hopeful", notes: "Excited for the week ahead" },
    ];

    for (let i = 0; i < 7; i++) {
      const logDate = new Date();
      logDate.setDate(logDate.getDate() - (6 - i)); // Start from 6 days ago to today
      logDate.setHours(20, 0, 0, 0); // Evening mood log
      
      const mood = moods[i];
      await storage.createMoodLog({
        userId: user.id,
        date: logDate,
        value: mood.value,
        emoji: mood.emoji,
        label: mood.label,
        notes: mood.notes,
      });
    }
    console.log("   ✅ Created 7 mood logs\n");

    // Step 9: Create calendar events
    console.log("9️⃣  Creating calendar events...");
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventData = [
      {
        userId: user.id,
        title: "Morning Workout",
        description: "Strength training session",
        dimension: "physical",
        startTime: new Date(today.getTime() + 7 * 60 * 60 * 1000), // 7 AM today
        endTime: new Date(today.getTime() + 7.5 * 60 * 60 * 1000), // 7:30 AM today
        isAllDay: false,
        recurring: true,
        recurrencePattern: "Mon, Wed, Fri",
      },
      {
        userId: user.id,
        title: "Meditation",
        description: "Morning mindfulness practice",
        dimension: "emotional",
        startTime: new Date(today.getTime() + 6.5 * 60 * 60 * 1000), // 6:30 AM today
        endTime: new Date(today.getTime() + 6.75 * 60 * 60 * 1000), // 6:45 AM today
        isAllDay: false,
        recurring: true,
        recurrencePattern: "Daily",
      },
      {
        userId: user.id,
        title: "Team Meeting",
        description: "Weekly sync with team",
        dimension: "professional",
        startTime: new Date(today.getTime() + 14 * 60 * 60 * 1000), // 2 PM today
        endTime: new Date(today.getTime() + 15 * 60 * 60 * 1000), // 3 PM today
        isAllDay: false,
        recurring: true,
        recurrencePattern: "Weekly on Monday",
      },
      {
        userId: user.id,
        title: "Meal Prep Sunday",
        description: "Prepare healthy meals for the week",
        dimension: "physical",
        startTime: new Date(today.getTime() + (7 - today.getDay()) * 24 * 60 * 60 * 1000 + 14 * 60 * 60 * 1000), // Next Sunday at 2 PM
        endTime: new Date(today.getTime() + (7 - today.getDay()) * 24 * 60 * 60 * 1000 + 15.5 * 60 * 60 * 1000), // Next Sunday at 3:30 PM
        isAllDay: false,
        recurring: true,
        recurrencePattern: "Weekly on Sunday",
      },
      {
        userId: user.id,
        title: "Family Dinner",
        description: "Quality time with family",
        dimension: "relational",
        startTime: new Date(today.getTime() + 18.5 * 60 * 60 * 1000), // 6:30 PM today
        endTime: new Date(today.getTime() + 20 * 60 * 60 * 1000), // 8 PM today
        isAllDay: false,
        recurring: false,
      },
    ];

    for (const event of eventData) {
      await storage.createCalendarEvent(event);
    }
    console.log(`   ✅ Created ${eventData.length} calendar events\n`);

    // Step 10: Create AI conversation
    console.log("🔟 Creating AI conversation...");
    const conversation = await storage.createConversation({
      userId: user.id,
      title: "Getting Started with Wellness",
      category: "wellness",
      messages: [
        {
          role: "user",
          content: "Hi! I want to build better habits and improve my overall wellness. Where should I start?",
          timestamp: Date.now() - (24 * 60 * 60 * 1000), // 1 day ago
        },
        {
          role: "assistant",
          content: "Welcome! I'm excited to help you build a sustainable wellness system. Let's start by understanding where you are now:\n\n**Your Current Energy:**\nHow would you describe your typical energy levels throughout the day? Are there specific times when you feel most or least energized?\n\n**Your Rhythm:**\nWhat does a typical day look like for you? When do you wake up, work, and wind down?\n\n**Your Priorities:**\nWhat areas of wellness feel most important to you right now - physical fitness, emotional balance, better sleep, or something else?\n\nTake your time answering - this helps me understand how to support you in a way that fits your life.",
          timestamp: Date.now() - (24 * 60 * 60 * 1000) + 30000, // 1 day ago + 30 seconds
        },
        {
          role: "user",
          content: "I wake up around 6:30 AM and work 9-5. I feel most energized in the morning but crash in the afternoon. I really want to focus on physical fitness and reducing stress.",
          timestamp: Date.now() - (23 * 60 * 60 * 1000), // 23 hours ago
        },
        {
          role: "assistant",
          content: "Perfect! You're already aware of your energy patterns - that's a great foundation. Here's what I'm noticing:\n\n**Your Morning Energy Window:**\nYou're naturally energized in the morning, which is ideal for:\n- Morning workouts (before work)\n- Setting daily intentions\n- Tackling challenging tasks\n\n**The Afternoon Dip:**\nThis is common! Let's work on:\n- Midday movement breaks (even 5-10 minutes helps)\n- Hydration and balanced meals\n- Short breathing exercises to reset\n\n**Your Focus Areas:**\nFor physical fitness + stress reduction, I recommend:\n1. Start with 3x/week morning workouts (20-30 min)\n2. Daily meditation or breathwork (10 min)\n3. Evening wind-down routine for better sleep\n\nWould you like me to help you set up a simple routine to get started? We'll keep it manageable so it fits your schedule.",
          timestamp: Date.now() - (23 * 60 * 60 * 1000) + 60000, // 23 hours ago + 1 minute
        },
        {
          role: "user",
          content: "Yes, that sounds great! Can you help me create a morning routine?",
          timestamp: Date.now() - (22 * 60 * 60 * 1000), // 22 hours ago
        },
        {
          role: "assistant",
          content: "Absolutely! Let's build a morning routine that energizes you:\n\n**Your Morning Routine (45 minutes):**\n\n⏰ **6:30 AM - Wake Up**\n- Keep alarm away from bed (forces you to get up)\n- Open curtains immediately for natural light\n\n💧 **6:35 AM - Hydrate & Stretch (5 min)**\n- Drink 16 oz of water\n- Light stretching to wake up your body\n\n🧘 **6:40 AM - Meditation (10 min)**\n- Guided meditation or simple breathwork\n- Set intention for the day\n\n💪 **6:50 AM - Workout (25 min)**\n- Mon/Wed/Fri: Strength training\n- Tue/Thu: Cardio or active rest\n- Sat/Sun: Your choice or rest\n\n🍳 **7:15 AM - Healthy Breakfast (15 min)**\n- Protein + complex carbs + fruit\n- Prep night before to save time\n\n**Pro Tips:**\n- Lay out workout clothes the night before\n- Prep breakfast ingredients ahead\n- Start with just 3 days/week if daily feels overwhelming\n\nI've added this to your routines! How does this feel? Any adjustments needed?",
          timestamp: Date.now() - (22 * 60 * 60 * 1000) + 90000, // 22 hours ago + 1.5 minutes
        },
      ],
    });
    console.log("   ✅ Created AI conversation with 6 messages\n");

    // Success!
    console.log("✅ Demo account seed complete!\n");
    console.log("═══════════════════════════════════════");
    console.log("Demo Account Credentials:");
    console.log("═══════════════════════════════════════");
    console.log(`Email: ${DEMO_EMAIL}`);
    console.log(`Password: ${DEMO_PASSWORD}`);
    console.log("═══════════════════════════════════════\n");
    console.log("✨ The demo account is ready for Apple App Store review!\n");

  } catch (error) {
    console.error("❌ Error seeding demo account:", error);
    process.exit(1);
  }
}

// Run the seed if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedDemoAccount()
    .then(() => {
      console.log("🎉 Seed completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 Seed failed:", error);
      process.exit(1);
    });
}

export { seedDemoAccount, DEMO_EMAIL, DEMO_PASSWORD };
