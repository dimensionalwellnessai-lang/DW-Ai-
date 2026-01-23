import { db } from "../server/db";
import { wellnessContent } from "../shared/schema";

const WELLNESS_CONTENT_SEED_DATA = [
  // Workout content
  {
    title: "Morning Energy Flow",
    description: "Start your day with gentle movement to wake up body and mind. Perfect for building a sustainable morning routine.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-morning-flow",
    duration: 15,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["energy", "mobility", "morning-routine"],
    moodTags: ["tired", "scattered", "low-energy"],
    dietTags: [],
    instructions: {
      steps: [
        "Start with gentle neck rolls and shoulder stretches",
        "Move into cat-cow stretches for spine mobility",
        "Flow through sun salutations for 5 minutes",
        "End with standing stretches and deep breathing"
      ]
    },
    isActive: true,
  },
  {
    title: "Strength Builder",
    description: "Full body workout to build muscle and confidence. Designed for progressive strength development.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-strength",
    duration: 30,
    difficulty: "intermediate",
    equipment: ["dumbbells", "mat"],
    goalTags: ["muscle-gain", "strength", "confidence"],
    moodTags: ["motivated", "energetic"],
    dietTags: [],
    instructions: {
      steps: [
        "Warm up with 5 minutes of dynamic stretching",
        "3 sets of squats with dumbbells",
        "3 sets of push-ups",
        "3 sets of bent-over rows",
        "Core work: planks and bicycle crunches",
        "Cool down with stretching"
      ]
    },
    isActive: true,
  },
  {
    title: "Quick HIIT",
    description: "High intensity interval training for busy schedules. Maximum results in minimum time.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-hiit",
    duration: 12,
    difficulty: "advanced",
    equipment: [],
    goalTags: ["fat-loss", "endurance", "time-efficient"],
    moodTags: ["energetic", "motivated", "rushed"],
    dietTags: [],
    instructions: {
      steps: [
        "30 seconds jumping jacks",
        "30 seconds burpees",
        "30 seconds mountain climbers",
        "30 seconds rest",
        "Repeat circuit 3 times"
      ]
    },
    isActive: true,
  },
  {
    title: "Yoga for Flexibility",
    description: "Gentle yoga flow focused on improving flexibility and reducing tension throughout the body.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-yoga",
    duration: 25,
    difficulty: "beginner",
    equipment: ["mat"],
    goalTags: ["flexibility", "stress-relief", "mobility"],
    moodTags: ["tense", "stressed", "tired"],
    dietTags: [],
    instructions: {
      steps: [
        "Begin in child's pose for centering",
        "Flow through gentle sun salutations",
        "Hold warrior poses for strength",
        "Seated forward folds for hamstrings",
        "Finish with savasana"
      ]
    },
    isActive: true,
  },
  {
    title: "Core Conditioning",
    description: "Targeted core workout for building strength and stability. Essential foundation for all movement.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-core",
    duration: 20,
    difficulty: "intermediate",
    equipment: ["mat"],
    goalTags: ["strength", "core", "stability"],
    moodTags: ["motivated", "focused"],
    dietTags: [],
    instructions: {
      steps: [
        "Plank variations: 3x45 seconds",
        "Bicycle crunches: 3x20 reps",
        "Russian twists: 3x30 seconds",
        "Leg raises: 3x12 reps",
        "Dead bug: 3x10 reps each side"
      ]
    },
    isActive: true,
  },
  {
    title: "Evening Wind Down",
    description: "Gentle movement to release the day's tension and prepare for restful sleep.",
    contentType: "workout",
    category: "workout",
    thumbnailUrl: "/api/placeholder/workout-evening",
    duration: 15,
    difficulty: "beginner",
    equipment: ["mat"],
    goalTags: ["sleep", "relaxation", "flexibility"],
    moodTags: ["tired", "tense", "restless"],
    dietTags: [],
    instructions: {
      steps: [
        "Gentle spinal twists",
        "Hip openers",
        "Legs up the wall pose",
        "Gentle forward folds",
        "Final relaxation"
      ]
    },
    isActive: true,
  },
  
  // Meditation content
  {
    title: "Calm Mind Meditation",
    description: "A guided session to reduce anxiety and find inner peace. Perfect for overwhelming moments.",
    contentType: "meditation",
    category: "meditation",
    thumbnailUrl: "/api/placeholder/meditation-calm",
    duration: 10,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["stress-relief", "focus", "mental-health"],
    moodTags: ["anxious", "overwhelmed", "scattered"],
    dietTags: [],
    instructions: {
      steps: [
        "Find a comfortable seated position",
        "Close your eyes and take 3 deep breaths",
        "Focus on the sensation of breathing",
        "When thoughts arise, gently return to the breath",
        "Gradually deepen your awareness"
      ]
    },
    isActive: true,
  },
  {
    title: "Sleep Preparation",
    description: "Wind down routine to prepare for restful sleep. Calms the nervous system and releases tension.",
    contentType: "meditation",
    category: "meditation",
    thumbnailUrl: "/api/placeholder/meditation-sleep",
    duration: 20,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["sleep", "relaxation", "recovery"],
    moodTags: ["tired", "restless", "anxious"],
    dietTags: [],
    instructions: {
      steps: [
        "Lie down in a comfortable position",
        "Progressive muscle relaxation from toes to head",
        "Guided body scan meditation",
        "Breath counting exercise",
        "Visualization for peaceful sleep"
      ]
    },
    isActive: true,
  },
  {
    title: "Focus Boost",
    description: "Quick meditation to enhance concentration and mental clarity for work or study.",
    contentType: "meditation",
    category: "meditation",
    thumbnailUrl: "/api/placeholder/meditation-focus",
    duration: 8,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["focus", "productivity", "mental-clarity"],
    moodTags: ["scattered", "distracted", "overwhelmed"],
    dietTags: [],
    instructions: {
      steps: [
        "Sit upright with alert posture",
        "Set intention for focused awareness",
        "Breath of fire breathing technique",
        "Single-point concentration practice",
        "Gently open eyes and return"
      ]
    },
    isActive: true,
  },
  {
    title: "Body Scan Relaxation",
    description: "Deep relaxation through systematic body awareness. Release physical and mental tension.",
    contentType: "meditation",
    category: "meditation",
    thumbnailUrl: "/api/placeholder/meditation-body-scan",
    duration: 15,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["stress-relief", "relaxation", "body-awareness"],
    moodTags: ["tense", "stressed", "disconnected"],
    dietTags: [],
    instructions: {
      steps: [
        "Lie down in a quiet space",
        "Begin with awareness of breathing",
        "Systematically scan each body part",
        "Notice sensations without judgment",
        "Complete with full body integration"
      ]
    },
    isActive: true,
  },
  
  // Mindfulness content
  {
    title: "Gratitude Practice",
    description: "Cultivate appreciation and positive mindset. Transform your perspective with daily gratitude.",
    contentType: "mindfulness",
    category: "mindfulness",
    thumbnailUrl: "/api/placeholder/mindfulness-gratitude",
    duration: 8,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["mental-health", "positivity", "happiness"],
    moodTags: ["low", "neutral", "negative"],
    dietTags: [],
    instructions: {
      steps: [
        "Find a quiet moment",
        "Reflect on 3 things you're grateful for",
        "Notice the feelings that arise",
        "Journal your gratitudes (optional)",
        "Carry this awareness through your day"
      ]
    },
    isActive: true,
  },
  {
    title: "Mindful Walking",
    description: "Transform a simple walk into a moving meditation. Connect with your body and surroundings.",
    contentType: "mindfulness",
    category: "mindfulness",
    duration: 20,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["stress-relief", "presence", "movement"],
    moodTags: ["restless", "scattered", "stressed"],
    dietTags: [],
    instructions: {
      steps: [
        "Choose a quiet walking path",
        "Begin walking at a natural pace",
        "Notice the sensation of each step",
        "Observe your surroundings with fresh eyes",
        "Return to the present moment repeatedly"
      ]
    },
    isActive: true,
  },
  {
    title: "Breathing Space",
    description: "Quick mindfulness exercise to create calm in busy moments. Your portable peace practice.",
    contentType: "mindfulness",
    category: "mindfulness",
    thumbnailUrl: "/api/placeholder/mindfulness-breathing",
    duration: 5,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["stress-relief", "presence", "quick-reset"],
    moodTags: ["overwhelmed", "anxious", "rushed"],
    dietTags: [],
    instructions: {
      steps: [
        "Pause whatever you're doing",
        "Notice your current state (thoughts, feelings, body)",
        "Narrow focus to your breathing for 2 minutes",
        "Expand awareness to your whole body",
        "Return to your activity with renewed presence"
      ]
    },
    isActive: true,
  },
  
  // Recovery content
  {
    title: "Foam Rolling Recovery",
    description: "Self-myofascial release to reduce muscle soreness and improve mobility.",
    contentType: "recovery",
    category: "recovery",
    thumbnailUrl: "/api/placeholder/recovery-foam-rolling",
    duration: 15,
    difficulty: "beginner",
    equipment: ["foam-roller"],
    goalTags: ["recovery", "mobility", "pain-relief"],
    moodTags: ["sore", "tense", "tired"],
    dietTags: [],
    instructions: {
      steps: [
        "Roll each major muscle group slowly",
        "Pause on tender spots for 30 seconds",
        "Focus on quads, hamstrings, calves, and back",
        "Breathe deeply during rolling",
        "Finish with gentle stretching"
      ]
    },
    isActive: true,
  },
  {
    title: "Active Recovery Flow",
    description: "Light movement to promote blood flow and reduce soreness without straining muscles.",
    contentType: "recovery",
    category: "recovery",
    thumbnailUrl: "/api/placeholder/recovery-active",
    duration: 20,
    difficulty: "beginner",
    equipment: ["mat"],
    goalTags: ["recovery", "mobility", "circulation"],
    moodTags: ["sore", "tired", "low-energy"],
    dietTags: [],
    instructions: {
      steps: [
        "Gentle joint rotations",
        "Easy walking or cycling",
        "Light dynamic stretching",
        "Breathing exercises",
        "Cool down and hydrate"
      ]
    },
    isActive: true,
  },
  {
    title: "Restorative Yoga",
    description: "Deeply relaxing yoga practice using props to support the body in restful poses.",
    contentType: "recovery",
    category: "recovery",
    thumbnailUrl: "/api/placeholder/recovery-restorative",
    duration: 30,
    difficulty: "beginner",
    equipment: ["mat", "blocks", "blanket"],
    goalTags: ["recovery", "relaxation", "stress-relief"],
    moodTags: ["exhausted", "stressed", "overwhelmed"],
    dietTags: [],
    instructions: {
      steps: [
        "Set up props for supported poses",
        "Hold each pose for 5-7 minutes",
        "Focus on deep, slow breathing",
        "Allow complete relaxation",
        "End with extended savasana"
      ]
    },
    isActive: true,
  },
  
  // Nutrition content
  {
    title: "Meal Prep Basics",
    description: "Learn efficient strategies for weekly meal preparation. Save time and eat healthier.",
    contentType: "nutrition",
    category: "nutrition",
    thumbnailUrl: "/api/placeholder/nutrition-meal-prep",
    duration: 45,
    difficulty: "beginner",
    equipment: ["kitchen-basics"],
    goalTags: ["nutrition", "time-management", "healthy-eating"],
    moodTags: ["motivated", "organized"],
    dietTags: ["general", "balanced"],
    instructions: {
      steps: [
        "Choose 3-4 recipes for the week",
        "Create shopping list",
        "Batch cook proteins",
        "Prepare vegetables",
        "Store in portioned containers"
      ]
    },
    isActive: true,
  },
  {
    title: "Hydration Challenge",
    description: "Build the habit of drinking enough water daily. Simple strategies for staying hydrated.",
    contentType: "nutrition",
    category: "nutrition",
    thumbnailUrl: "/api/placeholder/nutrition-hydration",
    duration: 10,
    difficulty: "beginner",
    equipment: ["water-bottle"],
    goalTags: ["nutrition", "habits", "energy"],
    moodTags: ["tired", "low-energy", "motivated"],
    dietTags: ["general"],
    instructions: {
      steps: [
        "Calculate your hydration goal",
        "Set reminders throughout the day",
        "Track your intake",
        "Pair water drinking with daily activities",
        "Notice improvements in energy and focus"
      ]
    },
    isActive: true,
  },
  {
    title: "Mindful Eating Practice",
    description: "Transform your relationship with food through awareness and presence during meals.",
    contentType: "nutrition",
    category: "nutrition",
    thumbnailUrl: "/api/placeholder/nutrition-mindful-eating",
    duration: 15,
    difficulty: "beginner",
    equipment: [],
    goalTags: ["nutrition", "mindfulness", "healthy-habits"],
    moodTags: ["stressed", "rushed", "neutral"],
    dietTags: ["general"],
    instructions: {
      steps: [
        "Remove distractions before eating",
        "Observe the appearance and smell of food",
        "Take small bites and chew thoroughly",
        "Notice hunger and fullness cues",
        "Express gratitude for the meal"
      ]
    },
    isActive: true,
  },
];

async function seedWellnessContent() {
  console.log("🌱 Seeding wellness content...");
  
  try {
    // Check if content already exists
    const existingContent = await db.select().from(wellnessContent);
    
    if (existingContent.length > 0) {
      console.log(`ℹ️  Database already has ${existingContent.length} wellness content items`);
      console.log("   Skipping seed to avoid duplicates.");
      console.log("   To re-seed, manually clear the wellness_content table first.");
      return;
    }
    
    // Insert all seed data
    const inserted = await db.insert(wellnessContent).values(WELLNESS_CONTENT_SEED_DATA).returning();
    
    console.log(`✅ Successfully seeded ${inserted.length} wellness content items!`);
    console.log("\nContent breakdown:");
    
    const breakdown = WELLNESS_CONTENT_SEED_DATA.reduce((acc, item) => {
      acc[item.category] = (acc[item.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    Object.entries(breakdown).forEach(([category, count]) => {
      console.log(`   - ${category}: ${count} items`);
    });
    
  } catch (error) {
    console.error("❌ Error seeding wellness content:", error);
    throw error;
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedWellnessContent()
    .then(() => {
      console.log("\n✨ Seeding complete!");
      process.exit(0);
    })
    .catch((error) => {
      console.error("\n💥 Seeding failed:", error);
      process.exit(1);
    });
}

export { seedWellnessContent, WELLNESS_CONTENT_SEED_DATA };
