/**
 * Journal AI Service
 * Provides AI-powered categorization and title generation for journal entries
 */

export type JournalCategory = 
  | "brainstorming"
  | "venting"
  | "planning"
  | "reflection"
  | "gratitude"
  | "processing"
  | "decision-making"
  | "creative"
  | "problem-solving"
  | "celebration"
  | "general";

export interface JournalCategoryInfo {
  id: JournalCategory;
  label: string;
  description: string;
  color: string;
  emoji: string;
}

export const JOURNAL_CATEGORIES: JournalCategoryInfo[] = [
  {
    id: "brainstorming",
    label: "Brainstorming",
    description: "Exploring ideas and possibilities",
    color: "hsl(45, 96%, 56%)",
    emoji: "💡",
  },
  {
    id: "venting",
    label: "Venting",
    description: "Releasing emotions and frustrations",
    color: "hsl(4, 64%, 66%)",
    emoji: "💨",
  },
  {
    id: "planning",
    label: "Planning",
    description: "Organizing thoughts and creating action plans",
    color: "hsl(231, 82%, 69%)",
    emoji: "📋",
  },
  {
    id: "reflection",
    label: "Reflection",
    description: "Looking back and processing experiences",
    color: "hsl(256, 100%, 83%)",
    emoji: "🌙",
  },
  {
    id: "gratitude",
    label: "Gratitude",
    description: "Appreciating and acknowledging the good",
    color: "hsl(158, 51%, 59%)",
    emoji: "🙏",
  },
  {
    id: "processing",
    label: "Processing",
    description: "Working through complex emotions or situations",
    color: "hsl(174, 57%, 56%)",
    emoji: "🔄",
  },
  {
    id: "decision-making",
    label: "Decision Making",
    description: "Weighing options and choices",
    color: "hsl(215, 20%, 65%)",
    emoji: "⚖️",
  },
  {
    id: "creative",
    label: "Creative",
    description: "Free-form creative expression",
    color: "hsl(262, 83%, 58%)",
    emoji: "🎨",
  },
  {
    id: "problem-solving",
    label: "Problem Solving",
    description: "Finding solutions to challenges",
    color: "hsl(141, 53%, 63%)",
    emoji: "🧩",
  },
  {
    id: "celebration",
    label: "Celebration",
    description: "Celebrating wins and achievements",
    color: "hsl(45, 96%, 48%)",
    emoji: "🎉",
  },
  {
    id: "general",
    label: "General",
    description: "Everyday thoughts and musings",
    color: "hsl(218, 11%, 65%)",
    emoji: "📝",
  },
];

/**
 * Detect journal category based on content using keyword analysis
 * This is a client-side heuristic approach for fast categorization
 */
export function detectJournalCategory(content: string): JournalCategory {
  const lowerContent = content.toLowerCase();
  
  // Keyword patterns for each category
  const patterns: Record<JournalCategory, string[]> = {
    brainstorming: ["idea", "what if", "could we", "possibility", "imagine", "maybe", "explore", "potential"],
    venting: ["frustrated", "angry", "annoyed", "upset", "ugh", "hate", "can't believe", "so done", "tired of"],
    planning: ["plan", "need to", "will do", "schedule", "todo", "next step", "action", "organize", "prepare"],
    reflection: ["realized", "noticed", "thinking about", "looking back", "learned", "understand now", "reflection"],
    gratitude: ["grateful", "thankful", "appreciate", "blessed", "fortunate", "lucky", "glad", "happy about"],
    processing: ["feel", "emotion", "trying to", "working through", "struggle", "complex", "confused", "unclear"],
    "decision-making": ["should i", "or should", "option", "choice", "decision", "which one", "pros and cons", "weighing"],
    creative: ["creative", "write", "story", "poem", "imagine", "vision", "dream", "art"],
    "problem-solving": ["problem", "challenge", "solution", "how to", "fix", "resolve", "overcome", "tackle"],
    celebration: ["excited", "won", "achieved", "success", "proud", "accomplished", "yay", "celebrate", "milestone"],
    general: [],
  };
  
  // Score each category
  const scores: Record<JournalCategory, number> = Object.keys(patterns).reduce((acc, cat) => {
    acc[cat as JournalCategory] = 0;
    return acc;
  }, {} as Record<JournalCategory, number>);
  
  for (const [category, keywords] of Object.entries(patterns)) {
    for (const keyword of keywords) {
      if (lowerContent.includes(keyword)) {
        scores[category as JournalCategory] += 1;
      }
    }
  }
  
  // Find highest scoring category
  let maxScore = 0;
  let detectedCategory: JournalCategory = "general";
  
  for (const [category, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      detectedCategory = category as JournalCategory;
    }
  }
  
  return detectedCategory;
}

/**
 * Generate a title suggestion based on journal content
 * Uses simple NLP heuristics for client-side processing
 */
export function generateJournalTitle(content: string, category?: JournalCategory): string {
  if (!content.trim()) {
    return "Untitled Entry";
  }
  
  // Get first sentence or first 50 characters
  const sentences = content.split(/[.!?]+/);
  let firstSentence = sentences[0]?.trim() || "";
  
  // Remove common journal starter phrases
  const starterPhrases = [
    "today i",
    "i'm feeling",
    "i feel",
    "i think",
    "i'm thinking",
    "just wanted to",
    "need to",
    "so ",
    "well,",
    "okay,",
  ];
  
  let cleaned = firstSentence.toLowerCase();
  for (const phrase of starterPhrases) {
    if (cleaned.startsWith(phrase)) {
      cleaned = cleaned.substring(phrase.length).trim();
      break;
    }
  }
  
  // Capitalize first letter
  cleaned = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  
  // Limit length
  if (cleaned.length > 50) {
    cleaned = cleaned.substring(0, 47) + "...";
  }
  
  // If too short or generic, use category-based title
  if (cleaned.length < 10 || !cleaned) {
    const categoryInfo = JOURNAL_CATEGORIES.find(c => c.id === category);
    const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${categoryInfo?.emoji || "📝"} ${categoryInfo?.label || "Journal Entry"} - ${dateStr}`;
  }
  
  return cleaned;
}

/**
 * Get category info by ID
 */
export function getCategoryInfo(categoryId: JournalCategory): JournalCategoryInfo {
  return JOURNAL_CATEGORIES.find(c => c.id === categoryId) || JOURNAL_CATEGORIES[JOURNAL_CATEGORIES.length - 1];
}

/**
 * Suggest related prompts based on category
 */
export function getCategoryPrompts(category: JournalCategory): string[] {
  const prompts: Record<JournalCategory, string[]> = {
    brainstorming: [
      "What possibilities excite me right now?",
      "If there were no limits, what would I explore?",
      "What's one wild idea I've been sitting on?",
    ],
    venting: [
      "What's really frustrating me?",
      "What do I need to get off my chest?",
      "What would I say if no one was listening?",
    ],
    planning: [
      "What are my next three steps?",
      "What needs to happen for this to work?",
      "What's my timeline looking like?",
    ],
    reflection: [
      "What did I learn today?",
      "What patterns am I noticing?",
      "How have I grown recently?",
    ],
    gratitude: [
      "What am I grateful for today?",
      "Who made a difference in my day?",
      "What small joy did I experience?",
    ],
    processing: [
      "What am I feeling right now?",
      "What's beneath the surface?",
      "What do I need to make sense of?",
    ],
    "decision-making": [
      "What are my options?",
      "What matters most here?",
      "What would future me choose?",
    ],
    creative: [
      "What story wants to be told?",
      "What image is in my mind?",
      "What would I create if I could?",
    ],
    "problem-solving": [
      "What's the core issue?",
      "What solutions have I tried?",
      "What angle haven't I considered?",
    ],
    celebration: [
      "What went well today?",
      "What am I proud of?",
      "What milestone did I reach?",
    ],
    general: [
      "What's on my mind?",
      "What happened today?",
      "What do I want to remember?",
    ],
  };
  
  return prompts[category] || prompts.general;
}
