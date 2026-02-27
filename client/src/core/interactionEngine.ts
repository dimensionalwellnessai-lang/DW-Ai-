/**
 * Interaction Engine – MVP skeleton
 *
 * Provides:
 *  - detectIntent:          heuristic intent classification
 *  - shapeAssistantResponse: lightweight A→B→C structure wrapper
 *  - applyTwoQuestionMax:   enforces a maximum of 2 questions in any response
 *
 * All functions are pure and free of side-effects so they can be unit-tested
 * without a DOM or a running server.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type IntentType =
  | "journal"
  | "planning"
  | "research"
  | "problem_solving"
  | "exploration"
  | "update_check"
  | "general_chat";

export type Palace =
  | "Body"
  | "Mind"
  | "Time"
  | "Purpose"
  | "Money"
  | "Relationships"
  | "Environment"
  | "Identity";

export interface ShapedResponse {
  fullText: string;
  directAnswer?: string;
  nextSteps?: string[];
}

export interface TwoQuestionResult {
  fullText: string;
  questionsRemoved: number;
}

// ─── detectIntent ─────────────────────────────────────────────────────────────

const EMOTIONAL_KEYWORDS =
  /\b(feel|feeling|felt|emotion|sad|anxious|depressed|stressed|overwhelmed|happy|angry|hurt|lost|scared|worried|numb|exhausted|grief|lonely)\b/i;

const PLANNING_KEYWORDS =
  /\b(plan|schedule|routine|todo|to-do|organize|prioritize|goal|goals|week|daily|habit|task|calendar|deadline|reminder)\b/i;

const RESEARCH_KEYWORDS =
  /\b(latest|today|news|price|law|regulation|study|research|current|recent|update|updates|status|fact|statistics)\b/i;

const UPDATE_CHECK_KEYWORDS =
  /\b(what('?s| is) (new|happening|going on|the status)|any updates|check[- ]?in|progress)\b/i;

/**
 * Heuristic intent detection (MVP).
 * Returns the most specific intent that matches, falling back to "general_chat".
 */
export function detectIntent({
  message,
  conversationHistory,
}: {
  message: string;
  conversationHistory?: Array<{ role: string; content: string }>;
}): IntentType {
  const text = message.trim();
  const isEmotional = EMOTIONAL_KEYWORDS.test(text);

  // Journal: long message with emotional content (checked before research to
  // avoid "today" in a journal entry being mis-classified as research)
  if (text.split(/\s+/).length > 100 && isEmotional) {
    return "journal";
  }

  // Emotional but short → exploration (takes priority over research keywords
  // like "today" to avoid false positives on personal messages)
  if (isEmotional) return "exploration";

  if (UPDATE_CHECK_KEYWORDS.test(text)) return "update_check";
  if (RESEARCH_KEYWORDS.test(text)) return "research";
  if (PLANNING_KEYWORDS.test(text)) return "planning";

  return "general_chat";
}

// ─── applyTwoQuestionMax ──────────────────────────────────────────────────────

/** Matches a sentence (or sentence fragment) that ends with a question mark. */
const QUESTION_SENTENCE_RE = /[^.!?]*\?/g;

/**
 * If the assistant text contains more than 2 questions, keep the first two and
 * convert subsequent question sentences into declarative statements or next-step
 * suggestions.
 *
 * The conversion is intentionally conservative: we simply drop the trailing "?"
 * and prefix "Consider:" to signal a suggestion rather than a demand.
 */
export function applyTwoQuestionMax({
  assistantText,
}: {
  assistantText: string;
}): TwoQuestionResult {
  const questions = assistantText.match(QUESTION_SENTENCE_RE) ?? [];

  if (questions.length <= 2) {
    return { fullText: assistantText, questionsRemoved: 0 };
  }

  let questionsRemoved = 0;
  let questionsSeen = 0;
  let result = assistantText;

  for (const q of questions) {
    questionsSeen++;
    if (questionsSeen <= 2) continue;

    // Replace the question with a declarative next-step suggestion
    const declarative = q.replace(/\?$/, "").trim();
    const replacement = `Consider: ${declarative}.`;
    result = result.replace(q, replacement);
    questionsRemoved++;
  }

  return { fullText: result, questionsRemoved };
}

// ─── shapeAssistantResponse ───────────────────────────────────────────────────

/**
 * Returns true if the text already contains structured formatting (bullet
 * lists, numbered lists, or clear section headers) that we should leave alone.
 */
function isAlreadyStructured(text: string): boolean {
  return /^[-*•]\s|\n[-*•]\s|^\d+\.\s|\n\d+\.\s|^#+\s|\n#+\s/m.test(text);
}

/**
 * Split text into sentences using common punctuation boundaries.
 */
function splitSentences(text: string): string[] {
  // Split on whitespace that follows a sentence-ending punctuation mark.
  // Using a simple replace+split pattern to avoid lookbehind for compatibility.
  return text
    .replace(/([.!?])\s+/g, "$1\x00")
    .split("\x00")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Lightweight A→B→C wrapper (MVP, non-hallucinatory).
 *
 * A) Direct answer  – first 1-3 sentences of the original response.
 * B) Next steps     – generic action bullets derived from remaining content.
 * C) Optional tie-in – omitted in v1.
 *
 * If the text is already structured we return it unchanged.
 */
export function shapeAssistantResponse({
  assistantText,
}: {
  assistantText: string;
  intentType?: IntentType;
  conversationHistory?: Array<{ role: string; content: string }>;
}): ShapedResponse {
  const trimmed = assistantText.trim();

  // Preserve existing structure to avoid double-formatting
  if (isAlreadyStructured(trimmed)) {
    return { fullText: trimmed };
  }

  const sentences = splitSentences(trimmed);

  if (sentences.length <= 3) {
    // Short response – no reshaping needed
    return { fullText: trimmed };
  }

  const directAnswerSentences = sentences.slice(0, 3);
  const remainingSentences = sentences.slice(3);

  const directAnswer = directAnswerSentences.join(" ");

  // Build generic next-step bullets from remaining sentences (max 3).
  // We avoid inventing new facts: we either re-use a sentence as a next step
  // or produce a generic "Tell me more about …" prompt.
  const nextSteps: string[] = remainingSentences.slice(0, 3).map((s) => {
    // If it's already a short, actionable phrase keep it; otherwise generalise.
    if (s.split(/\s+/).length <= 12) return s;
    return `Explore this further: "${s.slice(0, 60)}${s.length > 60 ? "..." : ""}"`;
  });

  const fullText = [
    directAnswer,
    "",
    "**Next steps:**",
    ...nextSteps.map((step) => `- ${step}`),
  ].join("\n");

  return { fullText, directAnswer, nextSteps };
}
