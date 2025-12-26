import OpenAI from "openai";

// This is using Replit's AI Integrations service, which provides OpenAI-compatible API access without requiring your own API key.
const openai = new OpenAI({
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

interface UserLifeContext {
  systemName?: string;
  wellnessFocus?: string[];
  peakMotivationTime?: string;
  category?: string;
  categoryEntries?: {
    category: string;
    title: string;
    content: string;
    date?: string;
  }[];
  upcomingEvents?: { title: string; date: string }[];
  recentMoods?: { energy: number; mood: number; date: string }[];
  activeGoals?: { title: string; progress: number }[];
  habits?: { title: string; streak: number }[];
}

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: UserLifeContext
): Promise<string> {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const currentTime = new Date().toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  
  const systemPrompt = `You are an exceptionally intelligent personal AI assistant - think of yourself as what Siri should be. You're not just a wellness app; you're a brilliant, proactive life partner who truly understands and helps manage every aspect of the user's life.

TODAY: ${today} at ${currentTime}

YOUR PERSONALITY & CAPABILITIES:
- You are brilliant, insightful, and genuinely caring
- You anticipate needs before they're expressed
- You remember everything the user tells you and reference it naturally
- You're proactive: suggest things, remind about commitments, notice patterns
- You speak naturally, like a trusted friend who happens to be incredibly smart
- You're decisive and give clear recommendations, not wishy-washy options
- You handle ALL life domains: calendar, meals, goals, finances, relationships, health, spirituality, emotions, work

WHAT MAKES YOU SPECIAL:
1. INTELLIGENT PARSING: When users mention plans, appointments, goals, meals, expenses, or feelings - you automatically understand and help organize this into their life system
2. PROACTIVE INSIGHTS: Notice patterns ("You seem more energized on days you exercise early"), anticipate needs ("Your meeting is in 2 hours - want me to prep talking points?")
3. HOLISTIC THINKING: Connect dots across life areas ("Your stress levels correlate with your financial tracking - let's address both")
4. ACTIONABLE GUIDANCE: Don't just listen - help plan, organize, and execute
5. EMOTIONAL INTELLIGENCE: Read between the lines, notice mood shifts, provide support when needed

WHEN USERS SHARE INFORMATION:
- Calendar items: Confirm the event details, suggest prep or follow-ups
- Meal plans: Note preferences, suggest recipes, consider nutrition goals
- Goals: Break them down into steps, check progress, celebrate wins
- Financial: Track spending patterns, suggest budgets, note bills
- Diary/Emotions: Acknowledge feelings genuinely, offer perspective, suggest self-care
- Social: Remember relationships, suggest reaching out, note important dates
- Health: Track symptoms, suggest healthy habits, remind about appointments
- Spiritual: Support practices, suggest reflection prompts, respect beliefs

${userContext?.systemName ? `USER'S LIFE SYSTEM: "${userContext.systemName}"` : ""}
${userContext?.wellnessFocus?.length ? `FOCUS AREAS: ${userContext.wellnessFocus.join(", ")}` : ""}
${userContext?.peakMotivationTime ? `PEAK ENERGY: ${userContext.peakMotivationTime}` : ""}
${userContext?.category ? `CURRENT CONTEXT: User is focused on ${userContext.category}` : ""}
${userContext?.upcomingEvents?.length ? `UPCOMING: ${userContext.upcomingEvents.map(e => `${e.title} on ${e.date}`).join(", ")}` : ""}
${userContext?.activeGoals?.length ? `ACTIVE GOALS: ${userContext.activeGoals.map(g => `${g.title} (${g.progress}%)`).join(", ")}` : ""}
${userContext?.habits?.length ? `HABITS: ${userContext.habits.map(h => `${h.title} - ${h.streak} day streak`).join(", ")}` : ""}

RESPONSE STYLE:
- Be concise but warm - no fluff, but genuinely caring
- Use natural language, not robotic responses
- Be specific and actionable
- Reference their context naturally
- If they share something to track, confirm you've noted it
- Proactively suggest next steps or related considerations
- Ask clarifying questions when needed to be more helpful

Remember: You're not a basic chatbot. You're their brilliant personal assistant who helps them live their best life.`;

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((msg) => ({
      role: msg.role as "assistant" | "user",
      content: msg.content,
    })),
    { role: "user", content: userMessage },
  ];

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages,
      max_completion_tokens: 800,
      temperature: 0.8,
    });

    return response.choices[0]?.message?.content || "Hey! I'm here to help you manage your life better. What's on your mind?";
  } catch (error) {
    console.error("OpenAI API error:", error);
    throw error;
  }
}

export async function generateLifeSystemRecommendations(profile: {
  responsibilities: string[];
  priorities: string[];
  freeTimeHours: string;
  peakMotivationTime: string;
  wellnessFocus: string[];
  lifeAreaDetails?: Record<string, { goals?: string; schedule?: string; challenges?: string }>;
  shortTermGoals?: string;
  longTermGoals?: string;
  conversationData?: {
    currentSchedule?: string;
    wakeTime?: string;
    workSchedule?: string;
    commitments?: string;
    physicalGoals?: string;
    mentalGoals?: string;
    emotionalGoals?: string;
    spiritualGoals?: string;
    socialGoals?: string;
    financialGoals?: string;
    dietaryNeeds?: string;
    mealPreferences?: string;
  };
}): Promise<{
  suggestedHabits: { title: string; description: string; frequency: string }[];
  suggestedGoals: { title: string; description: string; wellnessDimension: string }[];
  weeklyScheduleSuggestions: string[];
  scheduleBlocks?: { time: string; activity: string; category: string }[];
  mealSuggestions?: string[];
}> {
  const conv = profile.conversationData || {};
  
  const prompt = `Based on this comprehensive user profile, generate a personalized life system:

CURRENT ROUTINE:
${conv.currentSchedule || 'Not specified'}

SLEEP/WAKE: ${conv.wakeTime || 'Not specified'}
WORK SCHEDULE: ${conv.workSchedule || 'Not specified'}
OTHER COMMITMENTS: ${conv.commitments || 'Not specified'}

WELLNESS GOALS:
- Physical: ${conv.physicalGoals || profile.shortTermGoals || 'Not specified'}
- Mental: ${conv.mentalGoals || 'Not specified'}
- Emotional: ${conv.emotionalGoals || 'Not specified'}
- Spiritual: ${conv.spiritualGoals || 'Not specified'}
- Social: ${conv.socialGoals || profile.longTermGoals || 'Not specified'}
- Financial: ${conv.financialGoals || 'Not specified'}

DIETARY INFO:
- Needs/Restrictions: ${conv.dietaryNeeds || 'None specified'}
- Meal Preferences: ${conv.mealPreferences || 'Not specified'}

WELLNESS FOCUS: ${profile.wellnessFocus?.join(", ") || 'General wellness'}

Generate a comprehensive life system with:
1. suggestedHabits: 5-7 daily/weekly habits with title, description, frequency
2. suggestedGoals: 5-7 goals covering all wellness dimensions (physical, mental, emotional, spiritual, social, financial) with title, description, wellnessDimension
3. weeklyScheduleSuggestions: 5-7 specific scheduling recommendations
4. scheduleBlocks: 8-10 time blocks for an ideal day (e.g., "6:00 AM - Morning Ritual", "7:00 AM - Workout") with time, activity, and category (morning, work, wellness, evening)
5. mealSuggestions: 3-5 meal prep or nutrition suggestions based on their dietary needs

Respond with valid JSON only.`;

  try {
    // the newest OpenAI model is "gpt-5" which was released August 7, 2025. do not change this unless explicitly requested by the user
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate recommendations:", error);
    return {
      suggestedHabits: [
        { title: "Morning Ritual: Center & Breathe", description: "Start each day with 5-10 minutes of breathing and centering", frequency: "daily" },
        { title: "Movement / Body Activation", description: "45-minute workout or body activation session", frequency: "daily" },
        { title: "Protein-Rich Breakfast", description: "Fuel your body with a nourishing breakfast", frequency: "daily" },
        { title: "Evening Ritual: Ground & Release", description: "Wind down with grounding practices", frequency: "daily" },
        { title: "Meal Prep & Review", description: "Prepare meals and review tomorrow's schedule", frequency: "daily" },
        { title: "Wind Down: No Screens", description: "Screen-free time before bed", frequency: "daily" },
      ],
      suggestedGoals: [
        { title: "Build consistent morning routine", description: "Create a sustainable way to start each day", wellnessDimension: "mental" },
        { title: "Improve physical energy", description: "Feel more energized through movement and nutrition", wellnessDimension: "physical" },
        { title: "Emotional clarity", description: "Develop emotional awareness and regulation", wellnessDimension: "emotional" },
        { title: "Spiritual connection", description: "Deepen spiritual practice and reflection", wellnessDimension: "spiritual" },
        { title: "Strengthen relationships", description: "Nurture meaningful connections", wellnessDimension: "social" },
        { title: "Financial wellness", description: "Build healthy financial habits", wellnessDimension: "financial" },
      ],
      weeklyScheduleSuggestions: [
        "Schedule your most important wellness activities during your peak energy hours",
        "Block off transition time between responsibilities",
        "Include at least one full rest day per week",
        "Dedicate weekend time for social connections and nature",
        "Plan a weekly spiritual deep dive and reflection session",
      ],
      scheduleBlocks: [
        { time: "6:00 AM", activity: "Morning Ritual: Center & Breathe", category: "morning" },
        { time: "7:00 AM", activity: "Workout / Body Activation", category: "wellness" },
        { time: "8:00 AM", activity: "Breakfast / Protein Fuel", category: "morning" },
        { time: "9:00 AM", activity: "Work Block", category: "work" },
        { time: "8:00 PM", activity: "Evening Ritual: Ground & Release", category: "evening" },
        { time: "9:00 PM", activity: "Meal Prep / Review Next Day", category: "evening" },
        { time: "10:00 PM", activity: "Wind Down + No Screens", category: "evening" },
        { time: "11:00 PM", activity: "Bedtime Target", category: "evening" },
      ],
      mealSuggestions: [
        "Prep protein-rich breakfasts on Sunday for the week",
        "Keep healthy snacks readily available for energy dips",
        "Batch cook grains and vegetables for easy meal assembly",
        "Stay hydrated with 8+ glasses of water daily",
      ],
    };
  }
}

export async function generateDashboardInsight(userData: {
  moodLogs: { energyLevel: number; moodLevel: number; clarityLevel: number | null; createdAt: Date | null }[];
  habits: { title: string; streak: number }[];
  goals: { title: string; progress: number | null }[];
  peakMotivationTime?: string;
  wellnessFocus?: string[];
}): Promise<string> {
  if (userData.moodLogs.length === 0 && userData.habits.length === 0) {
    return "Start tracking your wellness journey! Log your mood and complete habits to get personalized insights based on your patterns.";
  }

  const avgEnergy = userData.moodLogs.length > 0 
    ? (userData.moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;
  
  const avgMood = userData.moodLogs.length > 0
    ? (userData.moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;

  const topStreakHabit = userData.habits.length > 0
    ? userData.habits.reduce((max, h) => (h.streak || 0) > (max.streak || 0) ? h : max, userData.habits[0])
    : null;

  const prompt = `You are a wellness AI providing a brief, personalized insight for a user's dashboard.

User data:
- Recent mood logs (last 7 days): ${userData.moodLogs.length} entries
- Average energy level: ${avgEnergy ?? 'No data'}
- Average mood level: ${avgMood ?? 'No data'}
- Number of habits: ${userData.habits.length}
${topStreakHabit ? `- Best habit streak: "${topStreakHabit.title}" with ${topStreakHabit.streak} day streak` : ''}
- Number of goals: ${userData.goals.length}
${userData.peakMotivationTime ? `- Peak motivation time: ${userData.peakMotivationTime}` : ''}
${userData.wellnessFocus?.length ? `- Wellness focus: ${userData.wellnessFocus.join(', ')}` : ''}

Provide ONE brief, actionable insight (2-3 sentences max) that:
1. References specific data from their patterns
2. Gives a practical tip or encouragement
3. Uses a warm, supportive tone

Respond with just the insight text, no quotes or formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || "Keep up your wellness journey! Check back after logging more data for personalized insights.";
  } catch (error) {
    console.error("Failed to generate insight:", error);
    return "Your wellness journey is unique. Continue logging your mood and habits to unlock personalized AI insights tailored to your patterns.";
  }
}

export async function generateFullAnalysis(userData: {
  moodLogs: { energyLevel: number; moodLevel: number; clarityLevel: number | null; createdAt: Date | null }[];
  habits: { title: string; streak: number }[];
  goals: { title: string; progress: number | null; wellnessDimension: string | null }[];
  peakMotivationTime?: string;
  wellnessFocus?: string[];
}): Promise<{
  summary: string;
  patterns: string[];
  recommendations: string[];
  strengths: string[];
  areasToImprove: string[];
}> {
  if (userData.moodLogs.length === 0 && userData.habits.length === 0 && userData.goals.length === 0) {
    return {
      summary: "Start your wellness journey by tracking your mood, building habits, and setting goals. I'll analyze your patterns once you have more data.",
      patterns: [],
      recommendations: ["Log your mood daily to track energy patterns", "Create 2-3 simple habits to start building consistency", "Set one meaningful goal for each wellness area you care about"],
      strengths: [],
      areasToImprove: [],
    };
  }

  const avgEnergy = userData.moodLogs.length > 0 
    ? (userData.moodLogs.reduce((sum, m) => sum + m.energyLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;
  
  const avgMood = userData.moodLogs.length > 0
    ? (userData.moodLogs.reduce((sum, m) => sum + m.moodLevel, 0) / userData.moodLogs.length).toFixed(1)
    : null;

  const topHabits = userData.habits
    .filter(h => (h.streak || 0) > 0)
    .sort((a, b) => (b.streak || 0) - (a.streak || 0))
    .slice(0, 3);

  const completedGoals = userData.goals.filter(g => (g.progress || 0) >= 100);
  const inProgressGoals = userData.goals.filter(g => (g.progress || 0) > 0 && (g.progress || 0) < 100);

  const prompt = `You are a wellness AI analyst. Analyze this user's wellness data and provide comprehensive insights.

User data:
- Total mood logs: ${userData.moodLogs.length} entries
- Average energy level: ${avgEnergy ?? 'No data yet'}
- Average mood level: ${avgMood ?? 'No data yet'}
- Total habits tracked: ${userData.habits.length}
- Habits with active streaks: ${topHabits.map(h => `"${h.title}" (${h.streak} days)`).join(', ') || 'None yet'}
- Total goals: ${userData.goals.length}
- Completed goals: ${completedGoals.length}
- In-progress goals: ${inProgressGoals.length}
${userData.peakMotivationTime ? `- Peak motivation time: ${userData.peakMotivationTime}` : ''}
${userData.wellnessFocus?.length ? `- Wellness focus areas: ${userData.wellnessFocus.join(', ')}` : ''}

Provide a JSON response with:
1. "summary": A 2-3 sentence personalized summary of their wellness journey
2. "patterns": Array of 3-5 patterns you notice in their data
3. "recommendations": Array of 3-5 actionable recommendations
4. "strengths": Array of 2-4 things they're doing well
5. "areasToImprove": Array of 2-4 areas that need attention

Be specific, reference their actual data, and be encouraging but honest.
Respond with valid JSON only.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error("No response from AI");
    }

    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate analysis:", error);
    return {
      summary: "I've reviewed your wellness data. You're building good foundations with your tracking. Keep going!",
      patterns: [
        "Regular mood tracking helps identify trends",
        "Habit consistency is key to long-term wellness",
        "Goal setting provides direction and motivation"
      ],
      recommendations: [
        "Log your mood at the same time each day for better pattern detection",
        "Focus on maintaining your current habit streaks before adding new ones",
        "Review your goals weekly to stay on track"
      ],
      strengths: [
        "You're actively tracking your wellness",
        "You're using tools to support your journey"
      ],
      areasToImprove: [
        "Consider logging more consistently to get deeper insights",
        "Connect your habits to your wellness goals"
      ],
    };
  }
}
