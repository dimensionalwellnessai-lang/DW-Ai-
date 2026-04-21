// Lightweight keyword detector for the DW Trigger Protocol hook.
// When a chat message reads as emotionally charged, the chat API attaches a
// `suggestion: { kind: "trigger_protocol" }` field to its response so the
// client can render a "Start trigger reset" affordance.
const TRIGGER_KEYWORDS = [
  "triggered", "anxious", "panicking", "spiraling", "spiralling",
  "jealous", "cheating", "cheat on me", "lying to me", "lied to me",
  "ignoring me", "ghosting me", "disrespect", "disrespected",
  "they don't care", "she doesn't care", "he doesn't care",
  "i feel like", "i feel so", "i'm so angry", "i'm furious",
  "betray", "betrayed", "rejected", "abandoned",
  "want to scream", "about to lose it", "can't even",
];

// Spiritual prompt detector — surfaces meditation / prayer suggestions when a
// message reads as a search-for-meaning, longing, or grief moment.
const SPIRITUAL_KEYWORDS = [
  "praying for", "praying that", "meaning of life", "what's my purpose",
  "what is my purpose", "feeling lost", "feel lost", "lost in life",
  "i need a sign", "send me a sign", "spiritually", "soul searching",
  "feeling empty", "feel empty", "what's the point", "whats the point",
  "miss them so much", "grieving", "in mourning", "feel disconnected",
  "feeling disconnected", "need stillness", "need to meditate",
  "ground myself", "want to pray",
];

export interface TriggerSuggestion {
  kind: "trigger_protocol";
  reason: string;
}

export interface SpiritualSuggestion {
  kind: "spiritual_prompt";
  reason: string;
  // Suggested entry point on the spiritual page: "meditate" | "pray".
  mode: "meditate" | "pray";
}

export type ChatSuggestion = TriggerSuggestion | SpiritualSuggestion;

export function detectTriggerSuggestion(message: unknown): ChatSuggestion | null {
  if (typeof message !== "string") return null;
  const lower = message.toLowerCase();

  // Trigger keywords win over spiritual ones — emotional safety first.
  if (TRIGGER_KEYWORDS.some(k => lower.includes(k))) {
    return {
      kind: "trigger_protocol",
      reason: "Sounds heavy — want to slow this down with a quick reset?",
    };
  }

  if (SPIRITUAL_KEYWORDS.some(k => lower.includes(k))) {
    // Pick "pray" for grief / longing / praying language; default to "meditate".
    const prayWords = ["praying", "grieving", "mourning", "miss them", "want to pray"];
    const mode: "meditate" | "pray" = prayWords.some(w => lower.includes(w))
      ? "pray"
      : "meditate";
    return {
      kind: "spiritual_prompt",
      reason: mode === "pray"
        ? "Want to write a quick intention or gratitude note?"
        : "Want to take a few minutes for a guided practice?",
      mode,
    };
  }

  return null;
}
