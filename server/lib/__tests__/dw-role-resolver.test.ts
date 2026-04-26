/**
 * Unit tests for `resolveAdaptiveDWMode` — the helper both `/api/chat` and
 * `/api/chat/smart` use to translate a raw user turn into the
 * `{ activeMode, addendum, dwMode payload, log fields }` quad.
 *
 * Pins the contract every chat surface depends on:
 *   1. A client-supplied `modeLock` is honoured verbatim — the picker is
 *      never invoked. This is the kill-switch for users who manually pinned
 *      a lane and don't want adaptive switching.
 *   2. When no lock is supplied, the picker drives the choice — but only
 *      lanes that clear `PICKER_APPLY_THRESHOLD` are applied; below that,
 *      the route falls back to `companion` (so the chat still answers in a
 *      sane voice while we keep the picker's reason for telemetry).
 *   3. The `dwMode` response payload always has the same shape — id, label,
 *      locked, reason, confidence — so the client can render the lane chip
 *      identically across surfaces.
 *   4. Invalid lock strings are coerced to `companion` (via `getDWMode`),
 *      not echoed back as the picker mode.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const { resolveAdaptiveDWMode, PICKER_APPLY_THRESHOLD } = await import(
  "../dw-role-picker"
);

beforeEach(() => {
  chatCompletionsCreate.mockReset();
});

afterEach(() => {
  chatCompletionsCreate.mockReset();
});

describe("resolveAdaptiveDWMode — modeLock overrides the picker", () => {
  it("honours a valid modeLock verbatim and never calls the picker / LLM", async () => {
    const result = await resolveAdaptiveDWMode({
      // Message would normally route to assistant — proves lock wins.
      message: "Schedule a reminder for tomorrow",
      modeLock: "trainer",
    });

    expect(result.mode).toBe("trainer");
    expect(result.lockedMode).toBe("trainer");
    expect(result.picked).toBeNull();
    expect(result.applied).toBe(true);
    expect(chatCompletionsCreate).not.toHaveBeenCalled();

    expect(result.dwMode).toEqual({
      id: "trainer",
      label: "Trainer",
      locked: true,
      reason: "you picked this lane",
      confidence: 1,
    });

    expect(result.logFields).toEqual({
      mode: "trainer",
      source: "locked",
      confidence: 1,
      reason: "user-locked lane",
      locked: true,
      applied: true,
    });
  });

  it("coerces an unknown modeLock string to companion (no silent passthrough of garbage)", async () => {
    const result = await resolveAdaptiveDWMode({
      message: "anything",
      modeLock: "not-a-real-mode",
    });
    expect(result.mode).toBe("companion");
    expect(result.lockedMode).toBe("companion");
    expect(result.dwMode.locked).toBe(true);
    expect(chatCompletionsCreate).not.toHaveBeenCalled();
  });

  it("treats null / undefined / non-string modeLock as no lock", async () => {
    // No lock + obvious lane keyword → picker fires → trainer wins.
    const result = await resolveAdaptiveDWMode({
      message: "Build me a workout for tomorrow",
      modeLock: null,
    });
    expect(result.lockedMode).toBeNull();
    expect(result.picked?.source).toBe("rules");
    expect(result.mode).toBe("trainer");
    expect(result.dwMode.locked).toBe(false);
  });
});

describe("resolveAdaptiveDWMode — picker output is gated by PICKER_APPLY_THRESHOLD", () => {
  it("applies a high-confidence picker hit and exposes its reason in dwMode", async () => {
    const result = await resolveAdaptiveDWMode({
      message: "Help me plan a workshop for the team next month",
    });

    expect(result.mode).toBe("planner");
    expect(result.applied).toBe(true);
    expect(result.picked?.source).toBe("rules");
    expect(result.dwMode.id).toBe("planner");
    expect(result.dwMode.label).toBe("Planning Partner");
    expect(result.dwMode.locked).toBe(false);
    expect(result.dwMode.confidence).toBeGreaterThanOrEqual(PICKER_APPLY_THRESHOLD);
    expect(result.dwMode.reason).toBe(result.picked?.reason);
    expect(result.modeAddendum).toBe(result.modeDef.systemAddendum);
  });

  it("falls back to companion (but preserves the picker reason for telemetry) when confidence is below the threshold", async () => {
    // Bland message → no rule hit → LLM returns a low-confidence pick that
    // shouldn't actually be applied to the chat completion.
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "perspective",
              confidence: 0.4,
              reason: "ambiguous turn",
            }),
          },
        },
      ],
    });

    const result = await resolveAdaptiveDWMode({
      message: "Tell me what you think.",
    });

    // Active mode falls back to companion since the pick didn't clear the bar.
    expect(result.mode).toBe("companion");
    expect(result.applied).toBe(false);
    // ...but we still expose the picker's pick so the client / log can show it.
    expect(result.picked?.mode).toBe("perspective");
    expect(result.dwMode.id).toBe("companion");
    expect(result.dwMode.locked).toBe(false);
    // The dwMode shape echoes the picker's reason + confidence verbatim.
    expect(result.dwMode.reason).toBe("ambiguous turn");
    expect(result.dwMode.confidence).toBeCloseTo(0.4, 5);
    // Log row reflects the *picked* lane + low confidence + applied=false.
    expect(result.logFields).toMatchObject({
      mode: "perspective",
      source: "llm",
      applied: false,
      locked: false,
    });
  });

  it("falls back to companion when the picker throws (defensive)", async () => {
    chatCompletionsCreate.mockRejectedValueOnce(new Error("upstream down"));
    const result = await resolveAdaptiveDWMode({
      message: "Tell me what you think.",
    });
    // Picker's internal fallback returns companion / fallback at 0.4 confidence.
    expect(result.mode).toBe("companion");
    expect(result.applied).toBe(false);
    expect(result.dwMode.id).toBe("companion");
    expect(result.dwMode.locked).toBe(false);
  });
});

describe("resolveAdaptiveDWMode — previousMode passes through to picker stickiness", () => {
  it("keeps the user in their previous lane on a borderline LLM pick", async () => {
    chatCompletionsCreate.mockResolvedValueOnce({
      choices: [
        {
          message: {
            content: JSON.stringify({
              mode: "perspective",
              confidence: 0.65,
              reason: "borderline",
            }),
          },
        },
      ],
    });

    const result = await resolveAdaptiveDWMode({
      message: "Tell me what you think.",
      previousMode: "companion",
    });

    expect(result.picked?.source).toBe("sticky");
    // Active mode stays in the previous lane (companion) and is applied
    // because the sticky pick clamps confidence to the apply threshold.
    expect(result.mode).toBe("companion");
    expect(result.applied).toBe(true);
    expect(result.dwMode.id).toBe("companion");
  });
});
