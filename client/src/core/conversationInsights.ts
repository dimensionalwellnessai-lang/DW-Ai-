/**
 * Conversation Insight Cards – core module
 *
 * Provides:
 *  - shouldCaptureInsight:  high-signal gate (heuristic, no extra AI call)
 *  - buildInsight:          constructs a small, stable Insight object
 *  - saveInsight:           persists to localStorage (guest/local-only v1)
 *  - getInsights:           retrieves stored insights
 *
 * All functions are fail-safe and will not throw even if localStorage is
 * unavailable.
 */

import { detectIntent, type IntentType } from "./interactionEngine";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface InsightSource {
  surface: "main" | "talk";
  conversationId?: string;
  messageTimestamp?: number;
  messageIndex?: number;
}

export interface Insight {
  id: string;
  createdAt: number;
  source: InsightSource;
  category: IntentType;
  title: string;
  summary: string;
  pinned?: boolean;
  pinnedAt?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STORAGE_KEY = "dw_conversation_insights";
const FREQUENCY_KEY = "dw_conversation_insights_frequency";
const MAX_INSIGHTS = 50;
const MIN_WORD_COUNT = 20;
const MIN_WORD_COUNT_NORMAL = 12;

// Trivial exchanges to skip (short / acknowledgement-only user messages)
const TRIVIAL_USER_RE =
  /^(ok|okay|thanks|thank you|got it|sounds good|sure|cool|great|yes|no|yep|nope|alright|k|lol|haha|nice|wow|hmm|hm|i see|understood)\s*[.!]*$/i;

// High-signal patterns that justify creating an insight
const EMOTIONAL_PROCESSING_RE =
  /\b(feel|feeling|felt|emotion|sad|anxious|stressed|overwhelmed|grief|lonely|scared|hurt|angry|lost|exhausted|depressed|worried|numb)\b/i;

const DECISION_RE =
  /\b(decide|decided|decision|commit|committed|commitment|choose|chose|choice|going to|will|promise|resolve|resolved)\b/i;

const PLAN_RE =
  /\b(plan|plans|planning|goal|goals|step|steps|action|actions|next|schedule|routine|habit|habits|start|starting|begin|beginning|focus)\b/i;

const PATTERN_RE =
  /\b(pattern|patterns|notice|noticed|realiz|realise|tend to|always|never|keep|keep doing|often|usually|cycle|recurring)\b/i;

// ─── shouldCaptureInsight ─────────────────────────────────────────────────────

/**
 * Returns true when the exchange is meaningful enough to warrant an insight card.
 * This is a purely deterministic heuristic – no extra AI call required.
 */
export function shouldCaptureInsight({
  userText,
  assistantText,
}: {
  userText: string;
  assistantText: string;
}): boolean {
  const frequency = getInsightFrequency();
  const minWords = frequency === "normal" ? MIN_WORD_COUNT_NORMAL : MIN_WORD_COUNT;

  const userWords = userText.trim() ? userText.trim().split(/\s+/).length : 0;
  const assistantWords = assistantText.trim() ? assistantText.trim().split(/\s+/).length : 0;

  // Skip if either side is too short
  if (userWords < minWords || assistantWords < minWords) return false;

  // Skip trivial user messages
  if (TRIVIAL_USER_RE.test(userText.trim())) return false;

  const combinedText = `${userText} ${assistantText}`;

  // Require at least one high-signal pattern
  return (
    EMOTIONAL_PROCESSING_RE.test(combinedText) ||
    DECISION_RE.test(combinedText) ||
    PLAN_RE.test(combinedText) ||
    PATTERN_RE.test(combinedText)
  );
}

// ─── buildInsight ─────────────────────────────────────────────────────────────

/**
 * Builds a short, stable Insight from a completed exchange.
 * Title: derived from first meaningful sentence of the assistant reply.
 * Summary: first 1-2 sentences of the assistant reply.
 */
export function buildInsight({
  userText,
  assistantText,
  source,
}: {
  userText: string;
  assistantText: string;
  source: InsightSource;
}): Insight {
  const category = detectIntent({ message: userText });

  // Strip markdown bold/italic/headers for cleaner display
  const cleanedText = assistantText
    .replace(/[*_#`>]+/g, "")
    .replace(/\n+/g, " ")
    .trim();

  // Split into sentences on common punctuation boundaries (no lookbehind for wider WebView support)
  const sentences = cleanedText
    .replace(/([.!?])\s+/g, "$1|")
    .split("|")
    .map((s) => s.trim())
    .filter(Boolean);

  // Title: first sentence, truncated to ≤ 72 chars
  const rawTitle = sentences[0] ?? "Insight";
  const title = rawTitle.length > 72 ? rawTitle.slice(0, 69) + "…" : rawTitle;

  // Summary: first 2 sentences joined, hard-capped at 300 chars to avoid localStorage bloat
  const rawSummary = sentences.slice(0, 2).join(" ");
  const summary = rawSummary.length > 300 ? rawSummary.slice(0, 297) + "…" : rawSummary;

  return {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? `ins_${crypto.randomUUID()}` : `ins_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    createdAt: Date.now(),
    source,
    category,
    title,
    summary,
  };
}

// ─── saveInsight ──────────────────────────────────────────────────────────────

/**
 * Persists the insight to localStorage.
 * Silently does nothing if:
 *  - localStorage is unavailable
 *  - the cap (MAX_INSIGHTS) has been reached
 */
export function saveInsight(insight: Insight): void {
  try {
    const existing = getInsights();
    if (existing.length >= MAX_INSIGHTS) return; // cap reached – silently skip
    const updated = [insight, ...existing];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Quota exceeded or SSR – fail silently
  }
}

// ─── getInsights ──────────────────────────────────────────────────────────────

/**
 * Returns stored insights, newest first.
 * Returns an empty array if storage is unavailable or data is malformed.
 */
export function getInsights(): Insight[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed as Insight[];
  } catch {
    return [];
  }
}

// ─── updateInsight ────────────────────────────────────────────────────────────

/**
 * Applies a partial patch to an existing insight and persists it.
 * Silently does nothing if the insight is not found or storage is unavailable.
 */
export function updateInsight(id: string, patch: Partial<Insight>): void {
  try {
    const insights = getInsights();
    const idx = insights.findIndex((i) => i.id === id);
    if (idx === -1) return;
    insights[idx] = { ...insights[idx], ...patch };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
  } catch {
    // Quota exceeded or SSR – fail silently
  }
}

// ─── pinInsight ───────────────────────────────────────────────────────────────

/** Marks an insight as pinned (idempotent). */
export function pinInsight(id: string): void {
  updateInsight(id, { pinned: true, pinnedAt: Date.now() });
}

// ─── unpinInsight ─────────────────────────────────────────────────────────────

/** Removes the pin from an insight (idempotent). */
export function unpinInsight(id: string): void {
  try {
    const insights = getInsights();
    const idx = insights.findIndex((i) => i.id === id);
    if (idx === -1) return;
    const { pinnedAt: _pinnedAt, pinned: _pinned, ...rest } = insights[idx];
    insights[idx] = { ...rest, pinned: false };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
  } catch {
    // Quota exceeded or SSR – fail silently
  }
}

// ─── deleteInsight ────────────────────────────────────────────────────────────

/**
 * Permanently removes an insight from storage.
 * Silently does nothing if the insight is not found or storage is unavailable.
 */
export function deleteInsight(id: string): void {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw == null) return;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // Malformed JSON – treat as no-op to avoid overwriting potentially recoverable data
      return;
    }

    if (!Array.isArray(parsed)) {
      // Non-array data – treat as no-op
      return;
    }

    const insights = (parsed as Insight[]).filter((i) => i && i.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(insights));
  } catch {
    // Quota exceeded or SSR – fail silently
  }
}

// ─── Frequency setting ────────────────────────────────────────────────────────

export type InsightFrequency = "rare" | "normal";

/**
 * Returns the current insight capture frequency preference.
 * Defaults to "rare".
 */
export function getInsightFrequency(): InsightFrequency {
  try {
    const val = localStorage.getItem(FREQUENCY_KEY);
    if (val === "normal") return "normal";
  } catch {
    // storage unavailable
  }
  return "rare";
}

/**
 * Persists the insight capture frequency preference.
 */
export function setInsightFrequency(frequency: InsightFrequency): void {
  try {
    localStorage.setItem(FREQUENCY_KEY, frequency);
  } catch {
    // storage unavailable – fail silently
  }
}
