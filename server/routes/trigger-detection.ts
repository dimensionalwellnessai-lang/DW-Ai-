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

export interface TriggerSuggestion {
  kind: "trigger_protocol";
  reason: string;
}

export function detectTriggerSuggestion(message: unknown): TriggerSuggestion | null {
  if (typeof message !== "string") return null;
  const lower = message.toLowerCase();
  const hit = TRIGGER_KEYWORDS.some(k => lower.includes(k));
  if (!hit) return null;
  return {
    kind: "trigger_protocol",
    reason: "Sounds heavy — want to slow this down with a quick reset?",
  };
}
