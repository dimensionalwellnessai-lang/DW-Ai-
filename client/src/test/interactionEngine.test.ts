import { describe, it, expect } from "vitest";
import {
  detectIntent,
  applyTwoQuestionMax,
  shapeAssistantResponse,
} from "../core/interactionEngine";

// ─── detectIntent ────────────────────────────────────────────────────────────
describe("detectIntent", () => {
  it("classifies a short neutral message as general_chat", () => {
    expect(detectIntent({ message: "Hello there" })).toBe("general_chat");
  });

  it("classifies planning keywords", () => {
    expect(detectIntent({ message: "Can you help me plan my week?" })).toBe("planning");
  });

  it("classifies research keywords", () => {
    expect(detectIntent({ message: "What is the latest news on that law?" })).toBe("research");
  });

  it("classifies update_check keywords", () => {
    expect(detectIntent({ message: "Any updates on the project status?" })).toBe("update_check");
  });

  it("classifies emotional short messages as exploration", () => {
    expect(detectIntent({ message: "I feel so anxious today" })).toBe("exploration");
  });

  it("classifies long emotional messages as journal", () => {
    const longEmotional =
      "I feel really overwhelmed and sad today. " +
      "I have been feeling this way for weeks now and I cannot seem to shake it off. " +
      "Every morning I wake up feeling exhausted even before the day begins. " +
      "I feel lost and I don't know where to turn. " +
      "everything seems so heavy and I just can't find the energy to keep going. ".repeat(4) +
      "and I just don't know what to do.";
    // Ensure the message is long enough (>100 words) to trigger journal classification
    expect(longEmotional.split(/\s+/).length).toBeGreaterThan(100);
    expect(detectIntent({ message: longEmotional })).toBe("journal");
  });
});

// ─── applyTwoQuestionMax ──────────────────────────────────────────────────────
describe("applyTwoQuestionMax", () => {
  it("leaves text with ≤2 questions unchanged", () => {
    const text = "How are you? What do you need?";
    const result = applyTwoQuestionMax({ assistantText: text });
    expect(result.fullText).toBe(text);
    expect(result.questionsRemoved).toBe(0);
  });

  it("converts third and subsequent questions to declarative form", () => {
    const text =
      "How are you? What do you need? Where are you going? Why does it matter?";
    const result = applyTwoQuestionMax({ assistantText: text });
    // First two questions retained, third and fourth converted
    expect(result.questionsRemoved).toBe(2);
    expect((result.fullText.match(/\?/g) ?? []).length).toBe(2);
  });

  it("returns questionsRemoved=0 when there are no questions", () => {
    const text = "This is a plain statement. No questions here at all.";
    const result = applyTwoQuestionMax({ assistantText: text });
    expect(result.questionsRemoved).toBe(0);
    expect(result.fullText).toBe(text);
  });
});

// ─── shapeAssistantResponse ───────────────────────────────────────────────────
describe("shapeAssistantResponse", () => {
  it("returns short text unchanged", () => {
    const text = "That sounds great. Let me know.";
    const result = shapeAssistantResponse({ assistantText: text });
    expect(result.fullText).toBe(text);
    expect(result.nextSteps).toBeUndefined();
  });

  it("preserves already-structured text (bullet list)", () => {
    const text =
      "Here are some tips:\n- Tip one\n- Tip two\n- Tip three\n- Tip four";
    const result = shapeAssistantResponse({ assistantText: text });
    expect(result.fullText).toBe(text);
    expect(result.nextSteps).toBeUndefined();
  });

  it("wraps long unstructured text into A→B→C sections", () => {
    const text =
      "This is the first sentence of the answer. " +
      "This is the second sentence. " +
      "This is the third sentence. " +
      "This is an additional detail you might explore. " +
      "Another point worth considering in your journey.";
    const result = shapeAssistantResponse({ assistantText: text });
    expect(result.directAnswer).toBeDefined();
    expect(result.nextSteps).toBeDefined();
    expect(result.nextSteps!.length).toBeGreaterThan(0);
    expect(result.fullText).toContain("**Next steps:**");
  });
});
