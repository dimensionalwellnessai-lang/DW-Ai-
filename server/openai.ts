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

export async function generateChatResponse(
  userMessage: string,
  conversationHistory: ChatMessage[],
  userContext?: {
    systemName?: string;
    wellnessFocus?: string[];
    peakMotivationTime?: string;
  }
): Promise<string> {
  const systemPrompt = `You are a supportive wellness AI assistant for the Wellness Lifestyle AI app. Your role is to:
- Help users with their daily wellness check-ins
- Provide encouragement and motivation
- Offer practical wellness tips based on their goals
- Answer questions about habits, goals, and routines
- Be warm, supportive, and understanding

${userContext?.systemName ? `The user has named their life system "${userContext.systemName}".` : ""}
${userContext?.wellnessFocus?.length ? `Their wellness focus areas are: ${userContext.wellnessFocus.join(", ")}.` : ""}
${userContext?.peakMotivationTime ? `They feel most motivated during the ${userContext.peakMotivationTime}.` : ""}

Keep responses concise but helpful. Use a warm, encouraging tone. Focus on actionable advice when appropriate.`;

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
    });

    return response.choices[0]?.message?.content || "I'm here to help with your wellness journey. What would you like to discuss?";
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
}): Promise<{
  suggestedHabits: { title: string; description: string; frequency: string }[];
  suggestedGoals: { title: string; description: string; wellnessDimension: string }[];
  weeklyScheduleSuggestions: string[];
}> {
  const prompt = `Based on this user profile, generate personalized wellness recommendations:

Responsibilities: ${profile.responsibilities.join(", ")}
Personal priorities: ${profile.priorities.join(", ")}
Daily free time: ${profile.freeTimeHours}
Peak motivation time: ${profile.peakMotivationTime}
Wellness focus areas: ${profile.wellnessFocus.join(", ")}

Please provide JSON with:
1. suggestedHabits: array of 3-5 habits with title, description, and frequency (daily/weekly)
2. suggestedGoals: array of 3-5 goals with title, description, and wellnessDimension
3. weeklyScheduleSuggestions: array of 3-5 scheduling tips

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
        { title: "Morning Mindfulness", description: "Start each day with 5 minutes of breathing exercises", frequency: "daily" },
        { title: "Hydration Check", description: "Drink 8 glasses of water throughout the day", frequency: "daily" },
        { title: "Evening Reflection", description: "Journal about your day before bed", frequency: "daily" },
      ],
      suggestedGoals: [
        { title: "Build a consistent morning routine", description: "Create a sustainable way to start each day", wellnessDimension: "mental" },
        { title: "Improve energy levels", description: "Feel more energized throughout the day", wellnessDimension: "physical" },
      ],
      weeklyScheduleSuggestions: [
        "Schedule your most important wellness activities during your peak energy hours",
        "Block off transition time between responsibilities",
        "Include at least one full rest day per week",
      ],
    };
  }
}
