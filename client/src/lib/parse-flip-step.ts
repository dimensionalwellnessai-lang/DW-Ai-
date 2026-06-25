/**
 * parseFlipStep — detects [pause], [name], [flip], [choose] markers in AI text.
 *
 * Returns the cleaned text and the detected step (if any).
 */

import type { FlipStepType } from "@/components/flip-step";

const FLIP_STEP_RE = /\[(pause|name|flip|choose)\]\s*/i;

export interface ParsedMessage {
  /** The text with the marker removed. */
  text: string;
  /** The detected FlipStep, or null if none. */
  flipStep: FlipStepType | null;
}

export function parseFlipStep(content: string): ParsedMessage {
  const match = content.match(FLIP_STEP_RE);
  if (!match) {
    return { text: content, flipStep: null };
  }
  const step = match[1].toLowerCase() as FlipStepType;
  const text = content.replace(FLIP_STEP_RE, "").trim();
  return { text, flipStep: step };
}
