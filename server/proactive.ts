import { storage } from "./storage";

export interface ProactiveNudge {
  type: "morning-briefing" | "energy-suggestion" | "goal-reminder" | "workout-suggestion" | "meal-suggestion" | "wind-down" | "pattern-insight" | "check-in-prompt";
  title: string;
  message: string;
  actionLabel?: string;
  actionRoute?: string;
  priority: "high" | "medium" | "low";
  expiresAt?: number;
}

export async function generateProactiveNudges(userId: string): Promise<ProactiveNudge[]> {
  const nudges: ProactiveNudge[] = [];
  const now = new Date();
  const hour = now.getHours();

  try {
    const todayMood = await storage.getTodaysMoodLog(userId);
    const goals = await storage.getGoals(userId);
    const habits = await storage.getHabits(userId);
    const scheduleBlocks = await storage.getScheduleBlocks(userId);

    const todaysBlocks = scheduleBlocks.filter(b => b.dayOfWeek === now.getDay());
    const activeGoals = goals.filter(g => g.isActive);

    if (hour >= 5 && hour < 12 && !todayMood) {
      nudges.push({
        type: "morning-briefing",
        title: "Start your day with intention",
        message: "A quick check-in helps me personalize your day. How are you feeling right now?",
        actionLabel: "Check in",
        actionRoute: "/weekly-checkin",
        priority: "high",
      });
    }

    if (todayMood && todayMood.energyLevel !== null && todayMood.energyLevel <= 4) {
      nudges.push({
        type: "energy-suggestion",
        title: "Your energy is running low",
        message: "Based on your check-in, a short walk or 5-minute stretch might help restore some energy.",
        actionLabel: "See options",
        actionRoute: "/recovery",
        priority: "medium",
      });
    }

    if (hour >= 18 && hour < 22) {
      nudges.push({
        type: "wind-down",
        title: "Time to wind down",
        message: "Evening is approaching. Would you like to review today and prepare for tomorrow?",
        actionLabel: "Wind down",
        actionRoute: "/",
        priority: "low",
      });
    }

    if (activeGoals.length > 0 && todaysBlocks.length === 0) {
      nudges.push({
        type: "goal-reminder",
        title: "Nothing scheduled today",
        message: `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''}. Want me to suggest some actions?`,
        actionLabel: "Get suggestions",
        actionRoute: "/",
        priority: "medium",
      });
    }

    if (hour >= 11 && hour < 14) {
      nudges.push({
        type: "meal-suggestion",
        title: "Lunchtime approaching",
        message: "Planning a nutritious meal can support your energy for the afternoon.",
        actionLabel: "Meal ideas",
        actionRoute: "/meal-prep",
        priority: "low",
      });
    }

    if (hour >= 6 && hour < 10 && todayMood && todayMood.energyLevel && todayMood.energyLevel >= 6) {
      nudges.push({
        type: "workout-suggestion",
        title: "Great energy for movement",
        message: "Your energy is high - this could be a good time for a workout.",
        actionLabel: "Find workout",
        actionRoute: "/workout",
        priority: "medium",
      });
    }

    return nudges.slice(0, 5);
  } catch (error) {
    console.error("Error generating proactive nudges:", error);
    return [];
  }
}

export interface MorningBriefing {
  greeting: string;
  energySummary: string | null;
  todayFocus: string[];
  scheduledItems: number;
  activeGoals: number;
  suggestion: string;
}

export async function generateMorningBriefing(userId: string): Promise<MorningBriefing> {
  const now = new Date();
  const hour = now.getHours();

  let greeting = "Good morning";
  if (hour >= 12 && hour < 17) greeting = "Good afternoon";
  if (hour >= 17) greeting = "Good evening";

  try {
    const todayMood = await storage.getTodaysMoodLog(userId);
    const goals = await storage.getGoals(userId);
    const scheduleBlocks = await storage.getScheduleBlocks(userId);
    const user = await storage.getUser(userId);

    const todaysBlocks = scheduleBlocks.filter(b => b.dayOfWeek === now.getDay());
    const activeGoals = goals.filter(g => g.isActive);

    const userName = user?.firstName || user?.username || "";
    const fullGreeting = userName ? `${greeting}, ${userName}` : greeting;

    let energySummary: string | null = null;
    if (todayMood?.energyLevel) {
      if (todayMood.energyLevel >= 7) {
        energySummary = "You're feeling energized today";
      } else if (todayMood.energyLevel >= 4) {
        energySummary = "Your energy is moderate";
      } else {
        energySummary = "Your energy is low - be gentle with yourself";
      }
    }

    const todayFocus: string[] = [];
    if (activeGoals.length > 0) {
      todayFocus.push(`${activeGoals.length} active goal${activeGoals.length > 1 ? 's' : ''} to work on`);
    }
    if (todaysBlocks.length > 0) {
      todayFocus.push(`${todaysBlocks.length} scheduled item${todaysBlocks.length > 1 ? 's' : ''}`);
    }

    let suggestion = "Start by checking in with how you're feeling.";
    if (todayMood && !activeGoals.length) {
      suggestion = "Consider setting a small intention for today.";
    } else if (todayMood && activeGoals.length) {
      suggestion = "What's one small step you can take toward your goals?";
    }

    return {
      greeting: fullGreeting,
      energySummary,
      todayFocus,
      scheduledItems: todaysBlocks.length,
      activeGoals: activeGoals.length,
      suggestion,
    };
  } catch (error) {
    console.error("Error generating morning briefing:", error);
    return {
      greeting,
      energySummary: null,
      todayFocus: [],
      scheduledItems: 0,
      activeGoals: 0,
      suggestion: "How would you like to start your day?",
    };
  }
}
