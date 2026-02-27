/**
 * postProcessAssistantMessage
 *
 * Single entry-point for the Interaction Engine post-processing pipeline.
 * Guards behind the INTERACTION_ENGINE feature flag and is fail-safe:
 * any internal error falls back to returning the original text unchanged.
 */

import { FEATURE_FLAGS } from "@/config/featureFlags";
import {
  detectIntent,
  applyTwoQuestionMax,
  shapeAssistantResponse,
  type IntentType,
} from "./interactionEngine";

export interface PostProcessInput {
  assistantText: string;
  userMessage?: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  context?: string;
}

export interface PostProcessResult {
  text: string;
  intent?: IntentType;
  meta?: {
    questionsRemoved: number;
    shaped: boolean;
  };
}

export function postProcessAssistantMessage({
  assistantText,
  userMessage,
  conversationHistory,
}: PostProcessInput): PostProcessResult {
  if (!FEATURE_FLAGS.INTERACTION_ENGINE) {
    return { text: assistantText };
  }

  try {
    const intent = userMessage
      ? detectIntent({ message: userMessage, conversationHistory })
      : undefined;

    const { fullText: afterQuestionMax, questionsRemoved } =
      applyTwoQuestionMax({ assistantText });

    const { fullText: shaped } = shapeAssistantResponse({
      assistantText: afterQuestionMax,
      intentType: intent,
      conversationHistory,
    });

    return {
      text: shaped,
      intent,
      meta: { questionsRemoved, shaped: shaped !== assistantText },
    };
  } catch {
    // Fail-safe: return original text on any error
    return { text: assistantText };
  }
}
