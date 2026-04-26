/**
 * Unit tests for the DW Adaptive Role Picker (`pickDWRole`).
 *
 * Pins the four behaviours the chat / smart / realtime channels all rely on:
 *   1. Every lane in the rules table fires for a representative prompt at
 *      a confidence high enough to be applied (≥ PICKER_APPLY_THRESHOLD).
 *   2. When the rules pass produces a high-confidence hit, the LLM fallback
 *      is skipped entirely — no token spend, no network round-trip.
 *   3. The LLM fallback is invoked when the rules pass yields nothing, and
 *      its returned mode is honoured.
 *   4. Lane stickiness (`previousMode`) is respected: an unambiguous rule
 *      hit still switches lanes, but a low-confidence LLM pick keeps the
 *      user in their previous lane (and reports `source: "sticky"`).
 *
 * The OpenAI client is mocked so this suite never touches the network.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { InitialRoleSnapshot } from "../dw-role-picker";

// Avoid pulling in DATABASE_URL during transitive imports.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

const chatCompletionsCreate = vi.fn();

vi.mock("../../openai", () => ({
  openai: {
    chat: {
      completions: {
        create: chatCompletionsCreate,
      },
    },
  },
}));

const {
  pickDWRole,
  pickInitialRole,
  PICKER_APPLY_THRESHOLD,
  STICKINESS_MARGIN,
} = await import("../dw-role-picker");

/** Minimal, fully-typed fixture for `pickInitialRole`. */
function snapshotForTimeOfDay(
  timeOfDay: InitialRoleSnapshot["today"]["timeOfDay"],
): InitialRoleSnapshot {
  return {
    today: {
      date: "2026-04-26",
      dayOfWeek: 0,
      timeOfDay,
      hour: 12,
    },
  };
}

beforeEach(() => {
  chatCompletionsCreate.mockReset();
});

afterEach(() => {
  chatCompletionsCreate.mockReset();
});

// ─── Rules table coverage ────────────────────────────────────────────────────
//
// One representative prompt per lane. If any of these regress, the rules
// pass has changed in a user-visible way and we want a loud failure.

const LANE_PROMPTS: Array<{ mode: string; message: string }> = [
  { mode: "trainer", message: "Build me a quick gym workout for tomorrow — 4 sets of squats." },
  { mode: "nutritionist", message: "What should I eat for breakfast to hit my protein macros?" },
  { mode: "liaison", message: "My wife said something tonight that's been bothering me." },
  { mode: "concierge", message: "Where can I find a good Italian restaurant nearby tonight?" },
  { mode: "assistant", message: "Schedule a dentist reminder for next Tuesday at 9am." },
  { mode: "planner", message: "Help me plan a workshop for the team next month." },
  { mode: "perspective", message: "I keep spiraling about that meeting — I can't stop thinking about it." },
  { mode: "coach", message: "Hold me accountable to my goal this week." },
  { mode: "guide", message: "I want to start a daily gratitude and meditation practice." },
  { mode: "companion", message: "I feel really lonely tonight and I just need to vent." },
];

describe("pickDWRole — rules table fires the right lane", () => {
  for (const { mode, message } of LANE_PROMPTS) {
    it(`routes "${message.slice(0, 40)}..." → ${mode}`, async () => {
      const picked = await pickDWRole(message, null);
      expect(picked.mode).toBe(mode);
      // Rule hits clear the apply threshold so the route uses them directly.
      expect(picked.source).toBe("rules");
      expect(picked.confidence).toBeGreaterThanOrEqual(PICKER_APPLY_THRESHOLD);
    });
  }
});

// ─── Model fallback skipped when rules win ───────────────────────────────────

describe("pickDWRole — LLM fallback is skipped on a rules hit", () => {
  it("does not call OpenAI when a rule fires", async () => {
    const picked = await pickDWRole("Schedule a reminder for tomorrow", null);
    expect(picked.source).toBe("rules");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("calls OpenAI when no rule matches and uses the returned mode", async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "perspective",
              confidence: 0.82,
              reason: "LLM picked perspective",
            }),
          },
        },
      ],
    });
    // Bland message that doesn't match any keyword rule.
    const picked = await pickDWRole("Tell me what you think.", null);
    expect(chatCompletionsCreate).toHaveBeenCalledTimes(1);
    expect(picked.source).toBe("llm");
    expect(picked.mode).toBe("perspective");
    expect(picked.confidence).toBeCloseTo(0.82, 5);
  });

  it("falls back to companion when no rule matches and LLM throws", async () => {
    chatCompletionsCreate.mockRejectedValueOnce(new Error("upstream down"));
    const picked = await pickDWRole("Tell me what you think.", null);
    expect(picked.source).toBe("fallback");
    expect(picked.mode).toBe("companion");
  });
});

// ─── rulesOnly mode ──────────────────────────────────────────────────────────

describe("pickDWRole — rulesOnly bypasses the LLM entirely", () => {
  it("returns the rule hit without calling OpenAI", async () => {
    const picked = await pickDWRole("Plan a project for next quarter", null, {
      rulesOnly: true,
    });
    expect(picked.source).toBe("rules");
    expect(picked.mode).toBe("planner");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns the companion fallback when no rule matches in rulesOnly mode", async () => {
    const picked = await pickDWRole("Tell me what you think.", null, {
      rulesOnly: true,
    });
    expect(picked.source).toBe("fallback");
    expect(picked.mode).toBe("companion");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });
});

// ─── Empty / blank message ───────────────────────────────────────────────────

describe("pickDWRole — empty messages", () => {
  it("returns the companion fallback for empty messages without calling the LLM", async () => {
    const picked = await pickDWRole("", null);
    expect(picked.source).toBe("fallback");
    expect(picked.mode).toBe("companion");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("returns the companion fallback for whitespace-only messages", async () => {
    const picked = await pickDWRole("    \n\t  ", null);
    expect(picked.source).toBe("fallback");
    expect(picked.mode).toBe("companion");
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });
});

// ─── Lane stickiness (`previousMode`) ────────────────────────────────────────

describe("pickDWRole — previousMode stickiness", () => {
  it("an unambiguous rule hit still switches lanes (rules clear the stickiness margin)", async () => {
    const picked = await pickDWRole("Schedule a dentist reminder for tomorrow", null, {
      previousMode: "guide",
    });
    expect(picked.source).toBe("rules");
    expect(picked.mode).toBe("assistant");
    expect(picked.confidence).toBeGreaterThanOrEqual(
      PICKER_APPLY_THRESHOLD + STICKINESS_MARGIN,
    );
  });

  it("a borderline LLM pick keeps the user in their previous lane and reports source=sticky", async () => {
    // Picker would have moved to perspective at 0.65 (above the apply
    // threshold but below the stickiness bar of 0.75), so we should pin
    // the user to their existing companion lane.
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "perspective",
              confidence: 0.65,
              reason: "borderline pick",
            }),
          },
        },
      ],
    });
    const picked = await pickDWRole("Tell me what you think.", null, {
      previousMode: "companion",
    });
    expect(picked.source).toBe("sticky");
    expect(picked.mode).toBe("companion");
    expect(picked.confidence).toBe(PICKER_APPLY_THRESHOLD);
  });

  it("a high-confidence LLM pick clears stickiness and switches lanes", async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "perspective",
              confidence: 0.9,
              reason: "decisive pick",
            }),
          },
        },
      ],
    });
    const picked = await pickDWRole("Tell me what you think.", null, {
      previousMode: "companion",
    });
    expect(picked.source).toBe("llm");
    expect(picked.mode).toBe("perspective");
  });

  it("a same-lane pick passes through unchanged", async () => {
    const picked = await pickDWRole("Workout time — 3 sets of bench", null, {
      previousMode: "trainer",
    });
    expect(picked.mode).toBe("trainer");
    // Source stays "rules" — stickiness only intervenes on a *different* lane.
    expect(picked.source).toBe("rules");
  });
});

// ─── Initial role picker (realtime opener) ───────────────────────────────────

describe("pickInitialRole — opens in a sensible lane based on time of day", () => {
  it("opens in coach mode in the morning", () => {
    const picked = pickInitialRole(snapshotForTimeOfDay("morning"));
    expect(picked.mode).toBe("coach");
  });

  it("opens in guide mode at night", () => {
    const picked = pickInitialRole(snapshotForTimeOfDay("night"));
    expect(picked.mode).toBe("guide");
  });

  it("opens in companion mode when the snapshot reports an unrecognised time-of-day", () => {
    const picked = pickInitialRole(snapshotForTimeOfDay("afternoon"));
    expect(picked.mode).toBe("companion");
  });

  it("defaults to morning (coach) when no snapshot is supplied", () => {
    // Treat a missing snapshot as morning — first session of the day is the
    // most common case, and coach is a safe opener.
    const picked = pickInitialRole(null);
    expect(picked.mode).toBe("coach");
  });
});
