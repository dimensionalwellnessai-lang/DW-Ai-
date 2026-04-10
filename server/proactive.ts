import { storage } from "./storage";

export interface ProactiveNudge {
  type:
    | "morning-briefing"
    | "energy-suggestion"
    | "goal-reminder"
    | "workout-suggestion"
    | "meal-suggestion"
    | "wind-down"
    | "pattern-insight"
    | "check-in-prompt"
    | "inactivity-reminder"
    | "context-suggestion"
    | "habit-reminder"
    | "cross-domain"
    | "weekly-summary"
    | "low-mood-outreach"
    | "habit-from-goal";
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
  const dayOfWeek = now.getDay(); // 0=Sun, 1=Mon…6=Sat

  try {
    const todayMood = await storage.getTodaysMoodLog(userId);
    const goals = await storage.getGoals(userId);
    const habits = await storage.getHabits(userId);
    const scheduleBlocks = await storage.getScheduleBlocks(userId);
    const moodLogs = await storage.getMoodLogs(userId);

    const todaysBlocks = scheduleBlocks.filter(b => b.dayOfWeek === now.getDay());
    const activeGoals = goals.filter(g => g.isActive);
    const activeHabits = habits.filter(h => h.isActive !== false);

    // ── Morning check-in prompt ────────────────────────────────────────────
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

    // ── Low energy suggestion ──────────────────────────────────────────────
    if (todayMood && todayMood.energyLevel !== null && todayMood.energyLevel <= 4) {
      nudges.push({
        type: "energy-suggestion",
        title: "Your energy is running low",
        message: "Based on your check-in, a short walk or 5-minute breathwork might restore some energy.",
        actionLabel: "See options",
        actionRoute: "/recovery",
        priority: "medium",
      });
    }

    // ── High energy → workout ─────────────────────────────────────────────
    if (hour >= 6 && hour < 10 && todayMood && todayMood.energyLevel && todayMood.energyLevel >= 6) {
      nudges.push({
        type: "workout-suggestion",
        title: "Great energy for movement",
        message: "Your energy is high — this is a great window for a workout.",
        actionLabel: "Find a workout",
        actionRoute: "/workout",
        priority: "medium",
      });
    }

    // ── Evening wind-down ─────────────────────────────────────────────────
    if (hour >= 18 && hour < 22) {
      nudges.push({
        type: "wind-down",
        title: "Time to wind down",
        message: "Evening is approaching. Would you like to journal or do a quick review of your day?",
        actionLabel: "Journal",
        actionRoute: "/journal",
        priority: "low",
      });
    }

    // ── Goal reminder if nothing scheduled ───────────────────────────────
    if (activeGoals.length > 0 && todaysBlocks.length === 0 && hour >= 9 && hour < 16) {
      nudges.push({
        type: "goal-reminder",
        title: "Nothing on your calendar today",
        message: `You have ${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""}. Want help planning a small step?`,
        actionLabel: "Plan my day",
        actionRoute: "/goals",
        priority: "medium",
      });
    }

    // ── Lunchtime meal suggestion ─────────────────────────────────────────
    if (hour >= 11 && hour < 14) {
      nudges.push({
        type: "meal-suggestion",
        title: "Lunchtime approaching",
        message: "Planning a nutritious meal now supports your afternoon energy and your overall goals.",
        actionLabel: "Meal ideas",
        actionRoute: "/meal-prep",
        priority: "low",
      });
    }

    // ── Inactivity reminder ───────────────────────────────────────────────
    const recentLogs = moodLogs.filter(log => {
      if (!log.createdAt) return false;
      const hoursSince = (now.getTime() - new Date(log.createdAt).getTime()) / 3600000;
      return hoursSince <= 24;
    });

    if (recentLogs.length === 0 && hour >= 9 && hour < 20) {
      nudges.push({
        type: "inactivity-reminder",
        title: "Haven't seen you today",
        message: "A quick check-in helps me support you better. How are you feeling?",
        actionLabel: "Check in",
        actionRoute: "/mood-tracker",
        priority: "medium",
      });
    }

    // ── Yesterday was low energy → light day suggestion ──────────────────
    if (moodLogs.length > 0) {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toISOString().split("T")[0];
      const yesterdayMood = moodLogs.find(log =>
        log.createdAt && log.createdAt.toString().startsWith(yesterdayStr)
      );

      if (yesterdayMood && yesterdayMood.energyLevel !== null && yesterdayMood.energyLevel <= 4 && hour >= 6 && hour < 11) {
        nudges.push({
          type: "context-suggestion",
          title: "Yesterday was tiring",
          message: "You felt tired yesterday. Let's plan light activities today — no pressure.",
          actionLabel: "See gentle options",
          actionRoute: "/recovery",
          priority: "high",
        });
      }
    }

    // ── Low mood for 2+ consecutive days → outreach ──────────────────────
    if (moodLogs.length >= 2) {
      const sortedLogs = [...moodLogs].sort((a, b) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      const recent2 = sortedLogs.slice(0, 2);
      const bothLow = recent2.every(l => l.energyLevel !== null && (l.energyLevel ?? 10) <= 4);
      if (bothLow && hour >= 9 && hour < 18) {
        nudges.push({
          type: "low-mood-outreach",
          title: "DW checking in on you",
          message: "You've been feeling low energy for a couple of days. I'm here — want to talk about what's going on?",
          actionLabel: "Talk to DW",
          actionRoute: "/talk",
          priority: "high",
        });
      }
    }

    // ── Habits incomplete reminder (evening) ─────────────────────────────
    if (hour >= 17 && hour < 21) {
      const todaysHabitLogs = await storage.getTodayHabitLogsByUser(userId);
      const completedIds = new Set(todaysHabitLogs.map((l: any) => l.habitId));
      const incomplete = activeHabits.filter(h => !completedIds.has(h.id));
      if (incomplete.length > 0) {
        nudges.push({
          type: "habit-reminder",
          title: `${incomplete.length} habit${incomplete.length > 1 ? "s" : ""} left today`,
          message: `You still have: ${incomplete.slice(0, 2).map(h => h.title).join(", ")}${incomplete.length > 2 ? ", and more" : ""}. Still time to check them off!`,
          actionLabel: "View habits",
          actionRoute: "/habits",
          priority: "medium",
        });
      }
    }

    // ── Goals without supporting habits → suggest creating one ───────────
    if (activeGoals.length > 0 && activeHabits.length === 0 && hour >= 8 && hour < 20) {
      nudges.push({
        type: "habit-from-goal",
        title: "Turn your goal into a habit",
        message: `Goals stick when backed by daily habits. Want to create a small daily action for "${activeGoals[0].title}"?`,
        actionLabel: "Create habit",
        actionRoute: "/habits",
        priority: "medium",
      });
    }

    // ── Financial goal → suggest supportive habit ─────────────────────────
    const financialGoals = activeGoals.filter(g => g.wellnessDimension === "financial");
    const financialHabits = activeHabits.filter(h => h.wellnessDimension === "financial");
    if (financialGoals.length > 0 && financialHabits.length === 0 && hour >= 9 && hour < 17) {
      nudges.push({
        type: "cross-domain",
        title: "Build a money habit",
        message: `You have a financial goal: "${financialGoals[0].title}". A daily habit like reviewing spending can make a real difference.`,
        actionLabel: "Create financial habit",
        actionRoute: "/habits",
        priority: "medium",
      });
    }

    // ── Sunday weekly summary ─────────────────────────────────────────────
    if (dayOfWeek === 0 && hour >= 8 && hour < 12) {
      const habitStreak = activeHabits.length > 0
        ? Math.max(...activeHabits.map(h => (h.streak ?? 0)))
        : 0;
      nudges.push({
        type: "weekly-summary",
        title: "Your week at a glance",
        message: `This week: ${activeGoals.length} active goal${activeGoals.length !== 1 ? "s" : ""}, ${activeHabits.length} habit${activeHabits.length !== 1 ? "s" : ""} running${habitStreak > 0 ? `, and a ${habitStreak}-day streak` : ""}. How do you want to approach the week ahead?`,
        actionLabel: "Plan the week",
        actionRoute: "/calendar",
        priority: "high",
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
    const habits = await storage.getHabits(userId);
    const user = await storage.getUser(userId);

    const todaysBlocks = scheduleBlocks.filter(b => b.dayOfWeek === now.getDay());
    const activeGoals = goals.filter(g => g.isActive);
    const activeHabits = habits.filter(h => h.isActive !== false);

    const userName = user?.firstName || user?.username || "";
    const fullGreeting = userName ? `${greeting}, ${userName}` : greeting;

    let energySummary: string | null = null;
    if (todayMood?.energyLevel) {
      if (todayMood.energyLevel >= 7) {
        energySummary = "You're feeling energized today";
      } else if (todayMood.energyLevel >= 4) {
        energySummary = "Your energy is moderate";
      } else {
        energySummary = "Your energy is low — be gentle with yourself";
      }
    }

    const todayFocus: string[] = [];
    if (activeGoals.length > 0) {
      todayFocus.push(`${activeGoals.length} active goal${activeGoals.length > 1 ? "s" : ""} to work on`);
    }
    if (todaysBlocks.length > 0) {
      todayFocus.push(`${todaysBlocks.length} scheduled item${todaysBlocks.length > 1 ? "s" : ""}`);
    }
    if (activeHabits.length > 0) {
      todayFocus.push(`${activeHabits.length} habit${activeHabits.length > 1 ? "s" : ""} to complete`);
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
