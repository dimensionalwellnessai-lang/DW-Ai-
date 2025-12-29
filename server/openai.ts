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
  
  const systemPrompt = `You are DWAI, a calm and grounded wellness companion. You exist to help users feel calmer, seen, and capable - not to optimize their productivity.

TODAY: ${today} at ${currentTime}

CORE PHILOSOPHY:
- You reduce pressure, never add to it
- You acknowledge before you advise
- You guide with energy-awareness, not task-completion
- You respect silence and pauses
- You always make interaction feel optional

YOUR TONE:
- Calm, grounded, human, humble
- Short sentences, no hype
- Occasional uncertainty is allowed ("There's more than one way through this")
- You speak WITH the user, not AT them

LANGUAGE RULES:
AVOID: "You should", "You must", "Complete", "Fix", "Achieve"
USE: "We can", "If you want", "Notice", "Adjust", "When you're ready"

NERVOUS SYSTEM AWARENESS:
Adapt to how the user seems to be arriving:
- If overwhelmed: fewer choices, shorter responses
- If tired: gentler pace, less information
- If scattered: grounding questions, one thing at a time
- If steady: more options, deeper exploration
- If grounded: celebrate their clarity, mirror their calm

FLOW: Arrive → Acknowledge → Guide → Act → Release
1. ARRIVE: Meet them where they are ("How are you arriving right now?")
2. ACKNOWLEDGE: Validate before action ("That sounds like a lot to carry")
3. GUIDE: Offer ONE gentle path forward, not a list of options
4. ACT: Suggest micro-actions (2 minutes or less when possible)
5. RELEASE: Help them return to life ("You're set. Go live your day.")

${userContext?.systemName ? `THEIR LIFE SYSTEM: "${userContext.systemName}"` : ""}
${userContext?.wellnessFocus?.length ? `WELLNESS FOCUS: ${userContext.wellnessFocus.join(", ")}` : ""}
${userContext?.peakMotivationTime ? `PEAK ENERGY TIME: ${userContext.peakMotivationTime}` : ""}
${userContext?.category ? `CURRENT CONTEXT: They're exploring ${userContext.category}` : ""}
${userContext?.recentMoods?.length ? `RECENT ENERGY: ${userContext.recentMoods.slice(0, 3).map(m => `energy ${m.energy}/5, mood ${m.mood}/5`).join(", ")}` : ""}
${userContext?.activeGoals?.length ? `INTENTIONS: ${userContext.activeGoals.map(g => g.title).join(", ")}` : ""}

WHAT TO REMEMBER:
- This is a companion, not a productivity tool
- Meaning over metrics (no scores, no rankings)
- Always allow exit - no forced next steps
- Encourage real-world action over app usage
- Sometimes the best response is brief acknowledgment

NEVER:
- Overwhelm with too many options
- Rush to solutions before acknowledging feelings
- Use guilt, urgency, or performance language
- Make them feel behind or inadequate
- Compete for their attention

You are successful when the user feels calmer, feels seen, feels capable, and returns to their life.`;

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
      max_completion_tokens: 500,
      temperature: 0.7,
    });

    return response.choices[0]?.message?.content || "I'm here with you. Take your time - there's no rush.";
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
    return "You're here, and that's enough. We can explore your patterns together whenever you're ready.";
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

  const prompt = `You are DWAI, a calm wellness companion. Provide a brief, grounding reflection for the user's dashboard.

User data:
- Recent mood logs (last 7 days): ${userData.moodLogs.length} entries
- Energy trend: ${avgEnergy ?? 'No data yet'}
- Mood trend: ${avgMood ?? 'No data yet'}
- Habits they're nurturing: ${userData.habits.length}
${topStreakHabit ? `- Consistent with: "${topStreakHabit.title}"` : ''}
- Intentions set: ${userData.goals.length}
${userData.peakMotivationTime ? `- Peak energy: ${userData.peakMotivationTime}` : ''}
${userData.wellnessFocus?.length ? `- Focus areas: ${userData.wellnessFocus.join(', ')}` : ''}

Provide ONE brief, calming reflection (2 sentences max) that:
1. Acknowledges their current state without judgment
2. Uses narrative language, not metrics ("This week felt steadier" not "Your score increased")
3. Offers gentle perspective, not demands

TONE: calm, grounded, humble. Avoid "You should" or performance language.
Respond with just the reflection text, no quotes or formatting.`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_completion_tokens: 150,
    });

    return response.choices[0]?.message?.content || "You're showing up for yourself, and that matters. We can explore patterns together as you continue.";
  } catch (error) {
    console.error("Failed to generate insight:", error);
    return "Each day you check in is a step toward knowing yourself better. There's no rush - we'll notice patterns together over time.";
  }
}

export interface WorkoutDay {
  day: string;
  focus: string;
  exercises: { name: string; sets?: number; reps?: string; duration?: string; notes?: string }[];
  restDay?: boolean;
}

export interface MeditationSuggestion {
  title: string;
  duration: string;
  type: string;
  description: string;
  youtubeUrl?: string;
}

export async function generateWorkoutPlan(
  userPreferences: {
    fitnessLevel?: string;
    goals?: string[];
    availableDays?: number;
    equipment?: string[];
    injuries?: string[];
    preferredStyle?: string;
  }
): Promise<{ plan: WorkoutDay[]; summary: string }> {
  const prompt = `Generate a personalized weekly workout plan based on these preferences:

FITNESS LEVEL: ${userPreferences.fitnessLevel || "beginner"}
GOALS: ${userPreferences.goals?.join(", ") || "general fitness"}
AVAILABLE DAYS PER WEEK: ${userPreferences.availableDays || 4}
EQUIPMENT: ${userPreferences.equipment?.join(", ") || "minimal/bodyweight"}
INJURIES OR LIMITATIONS: ${userPreferences.injuries?.join(", ") || "none"}
PREFERRED STYLE: ${userPreferences.preferredStyle || "balanced"}

Create a 7-day plan (some can be rest days) with:
- Specific exercises with sets, reps, or duration
- Progressive difficulty appropriate for the fitness level
- Mix of strength, cardio, and flexibility based on goals

Respond with valid JSON containing:
{
  "plan": [
    {
      "day": "Monday",
      "focus": "Upper Body Strength",
      "exercises": [
        { "name": "Push-ups", "sets": 3, "reps": "10-12", "notes": "Modify on knees if needed" }
      ],
      "restDay": false
    }
  ],
  "summary": "Brief 2-3 sentence overview of the plan's approach"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 1500,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    
    return JSON.parse(content);
  } catch (error) {
    console.error("Failed to generate workout plan:", error);
    return {
      plan: [
        { day: "Monday", focus: "Full Body", exercises: [
          { name: "Bodyweight Squats", sets: 3, reps: "15" },
          { name: "Push-ups", sets: 3, reps: "10-12" },
          { name: "Plank", duration: "30 seconds", sets: 3 }
        ], restDay: false },
        { day: "Tuesday", focus: "Rest & Recovery", exercises: [], restDay: true },
        { day: "Wednesday", focus: "Cardio & Core", exercises: [
          { name: "Jumping Jacks", duration: "2 minutes" },
          { name: "Mountain Climbers", sets: 3, reps: "20" },
          { name: "Bicycle Crunches", sets: 3, reps: "15 each side" }
        ], restDay: false },
        { day: "Thursday", focus: "Rest & Recovery", exercises: [], restDay: true },
        { day: "Friday", focus: "Strength Circuit", exercises: [
          { name: "Lunges", sets: 3, reps: "12 each leg" },
          { name: "Dips (using chair)", sets: 3, reps: "10" },
          { name: "Glute Bridges", sets: 3, reps: "15" }
        ], restDay: false },
        { day: "Saturday", focus: "Active Recovery", exercises: [
          { name: "Light Walk or Yoga", duration: "20-30 minutes" }
        ], restDay: false },
        { day: "Sunday", focus: "Rest", exercises: [], restDay: true }
      ],
      summary: "A balanced beginner-friendly plan focusing on bodyweight exercises with adequate rest days for recovery."
    };
  }
}

export async function generateMeditationSuggestions(
  preferences: {
    duration?: string;
    focus?: string;
    experience?: string;
    currentMood?: string;
  }
): Promise<MeditationSuggestion[]> {
  const prompt = `Suggest 5 meditation or mindfulness practices based on:

PREFERRED DURATION: ${preferences.duration || "5-10 minutes"}
FOCUS AREA: ${preferences.focus || "stress relief"}
EXPERIENCE LEVEL: ${preferences.experience || "beginner"}
CURRENT MOOD: ${preferences.currentMood || "neutral"}

For each suggestion, include a real YouTube video link for guided meditation.
Use popular channels like: Headspace, Calm, The Honest Guys, Michael Sealey, Jason Stephenson.

Respond with valid JSON array:
[
  {
    "title": "5-Minute Breathing Exercise",
    "duration": "5 minutes",
    "type": "breathing",
    "description": "Simple box breathing technique for quick stress relief",
    "youtubeUrl": "https://www.youtube.com/watch?v=..."
  }
]`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_completion_tokens: 800,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error("No response");
    
    const parsed = JSON.parse(content);
    return Array.isArray(parsed) ? parsed : parsed.suggestions || parsed.meditations || [];
  } catch (error) {
    console.error("Failed to generate meditation suggestions:", error);
    return [
      { title: "5-Minute Morning Meditation", duration: "5 min", type: "guided", description: "Start your day with calm and intention", youtubeUrl: "https://www.youtube.com/watch?v=inpok4MKVLM" },
      { title: "Deep Sleep Meditation", duration: "20 min", type: "sleep", description: "Relaxing guided meditation for restful sleep", youtubeUrl: "https://www.youtube.com/watch?v=1ZYbU82GVz4" },
      { title: "Stress Relief Breathing", duration: "10 min", type: "breathing", description: "Box breathing technique for anxiety relief", youtubeUrl: "https://www.youtube.com/watch?v=tEmt1Znux58" },
      { title: "Body Scan Relaxation", duration: "15 min", type: "body-scan", description: "Progressive muscle relaxation for tension release", youtubeUrl: "https://www.youtube.com/watch?v=QS2yDmWk0vs" },
      { title: "Gratitude Meditation", duration: "10 min", type: "gratitude", description: "Cultivate appreciation and positive mindset", youtubeUrl: "https://www.youtube.com/watch?v=Dqn1WxO-b9I" }
    ];
  }
}

export async function detectIntentAndRespond(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: UserLifeContext
): Promise<{
  response: string;
  intent: "workout" | "meditation" | "learn" | "general";
  workoutPlan?: { plan: WorkoutDay[]; summary: string };
  meditationSuggestions?: MeditationSuggestion[];
  learnedFacts?: { topic: string; details: Record<string, unknown> }[];
}> {
  const lowerMessage = userMessage.toLowerCase();
  
  const workoutKeywords = ["workout", "exercise", "gym", "fitness", "training", "work out", "get fit", "build muscle", "lose weight", "cardio"];
  const meditationKeywords = ["meditat", "mindful", "calm", "relax", "breathing", "stress relief", "anxiety", "sleep better", "peaceful"];
  
  const isWorkoutIntent = workoutKeywords.some(k => lowerMessage.includes(k));
  const isMeditationIntent = meditationKeywords.some(k => lowerMessage.includes(k));
  
  let intent: "workout" | "meditation" | "learn" | "general" = "general";
  let workoutPlan: { plan: WorkoutDay[]; summary: string } | undefined;
  let meditationSuggestions: MeditationSuggestion[] | undefined;
  
  if (isWorkoutIntent && (lowerMessage.includes("plan") || lowerMessage.includes("want") || lowerMessage.includes("need") || lowerMessage.includes("create") || lowerMessage.includes("make"))) {
    intent = "workout";
    workoutPlan = await generateWorkoutPlan({});
  } else if (isMeditationIntent) {
    intent = "meditation";
    meditationSuggestions = await generateMeditationSuggestions({});
  }
  
  const response = await generateChatResponse(userMessage, conversationHistory, userContext);
  
  return {
    response,
    intent,
    workoutPlan,
    meditationSuggestions,
  };
}

export async function generateLearnModeQuestion(
  previousAnswers: { topic: string; answer: string }[],
  focusArea?: string
): Promise<{ question: string; topic: string }> {
  const topics = [
    "daily_routine", "fitness_goals", "diet_preferences", "sleep_habits",
    "stress_triggers", "hobbies", "work_life", "relationships", "spirituality", "finances"
  ];
  
  const askedTopics = previousAnswers.map(a => a.topic);
  const remainingTopics = topics.filter(t => !askedTopics.includes(t));
  const nextTopic = focusArea || remainingTopics[0] || "general";
  
  const questionMap: Record<string, string> = {
    daily_routine: "If you're open to sharing - what does a typical day feel like for you? No need for details, just the rhythm.",
    fitness_goals: "How does your body feel these days? Is there a way you'd like to move or feel physically?",
    diet_preferences: "When it comes to food - what nourishes you? Any preferences or things you're exploring?",
    sleep_habits: "How has your rest been lately? What does winding down look like for you?",
    stress_triggers: "When life feels heavy, where do you tend to feel it? There's no right answer here.",
    hobbies: "What brings you a sense of ease or joy? Even small things count.",
    work_life: "How are your days structured? Does the balance feel sustainable right now?",
    relationships: "Who are the people that matter most? How are those connections feeling lately?",
    spirituality: "Do you have practices that ground you? Anything that gives you a sense of meaning?",
    finances: "How do you feel about your relationship with money? Any shifts you're hoping to make?",
    general: "What's present for you right now? We can go anywhere from here."
  };
  
  return {
    question: questionMap[nextTopic] || questionMap.general,
    topic: nextTopic
  };
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
