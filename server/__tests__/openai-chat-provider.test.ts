import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ORIGINAL_ENV = { ...process.env };
const AI_TEST_ENV_KEYS = [
  "DW_AI_MODEL_CHAT",
  "DW_AI_CHAT_BASE_URL",
  "DW_AI_CHAT_API_KEY",
  "OPENAI_API_KEY",
  "AI_INTEGRATIONS_OPENAI_BASE_URL",
  "AI_INTEGRATIONS_OPENAI_API_KEY",
  "PERPLEXITY_API_KEY",
  "AI_INTEGRATIONS_PERPLEXITY_API_KEY",
  "AI_INTEGRATIONS_PERPLEXITY_BASE_URL",
];
const TEST_ENV_BASELINE = { ...ORIGINAL_ENV };
for (const key of AI_TEST_ENV_KEYS) {
  delete TEST_ENV_BASELINE[key];
}

async function loadOpenAiModule() {
  vi.resetModules();
  process.env.OPENAI_API_KEY = "test-openai-key";
  return await import("../openai");
}

beforeEach(() => {
  process.env = { ...TEST_ENV_BASELINE };
});

afterEach(() => {
  process.env = { ...ORIGINAL_ENV };
  vi.restoreAllMocks();
});

describe("resolveMainChatModel", () => {
  it("defaults to OpenAI gpt-4o-mini when DW_AI_MODEL_CHAT is unset", async () => {
    delete process.env.DW_AI_MODEL_CHAT;
    delete process.env.DW_AI_CHAT_BASE_URL;
    delete process.env.DW_AI_CHAT_API_KEY;
    process.env.OPENAI_API_KEY = "test-openai-key";

    const { resolveMainChatModel } = await loadOpenAiModule();
    const resolved = resolveMainChatModel();

    expect(resolved.model).toBe("gpt-4o-mini");
    expect(resolved.provider).toBe("openai");
    expect(resolved.source).toBe("provider-default");
  });

  it("uses Claude model path when DW_AI_MODEL_CHAT is set to Sonnet", async () => {
    process.env.DW_AI_MODEL_CHAT = "claude-sonnet-4-5";
    const { resolveMainChatModel } = await loadOpenAiModule();
    const resolved = resolveMainChatModel();

    expect(resolved.model).toBe("claude-sonnet-4-5");
    expect(resolved.provider).toBe("anthropic-compatible");
    expect(resolved.source).toBe("DW_AI_MODEL_CHAT");
  });
});

describe("runMainChatFallbackChain", () => {
  it("falls back from Claude model to gpt-4o-mini before Perplexity", async () => {
    const { runMainChatFallbackChain } = await loadOpenAiModule();
    const calls: string[] = [];

    const result = await runMainChatFallbackChain({
      primaryModel: "claude-sonnet-4-5",
      openAiFallbackModel: "gpt-4o-mini",
      callWithModel: async (model) => {
        calls.push(model);
        if (model === "claude-sonnet-4-5") throw new Error("claude unavailable");
        return { ok: true, model };
      },
      callPerplexity: async () => {
        calls.push("sonar");
        return { ok: true, model: "sonar" };
      },
    });

    expect(calls).toEqual(["claude-sonnet-4-5", "gpt-4o-mini"]);
    expect(result.provider).toBe("openai-fallback");
    expect(result.model).toBe("gpt-4o-mini");
  });

  it("uses the dedicated OpenAI fallback caller when provided", async () => {
    const { runMainChatFallbackChain } = await loadOpenAiModule();
    const primaryCalls: string[] = [];
    const fallbackCalls: string[] = [];

    const result = await runMainChatFallbackChain({
      primaryModel: "claude-sonnet-4-5",
      openAiFallbackModel: "gpt-4o-mini",
      callWithModel: async (model) => {
        primaryCalls.push(model);
        throw new Error(`primary unavailable for ${model}`);
      },
      callOpenAiFallbackModel: async (model) => {
        fallbackCalls.push(model);
        return { ok: true, model };
      },
      callPerplexity: async () => {
        throw new Error("perplexity should not be called");
      },
    });

    expect(primaryCalls).toEqual(["claude-sonnet-4-5"]);
    expect(fallbackCalls).toEqual(["gpt-4o-mini"]);
    expect(result.provider).toBe("openai-fallback");
    expect(result.model).toBe("gpt-4o-mini");
  });
});

describe("normalizeToolCallsFromAssistantMessage", () => {
  it("maps Claude tool_use blocks to the existing { name, arguments } shape", async () => {
    const { normalizeToolCallsFromAssistantMessage } = await loadOpenAiModule();
    const toolCalls = normalizeToolCallsFromAssistantMessage({
      content: [
        { type: "text", text: "I'll handle that." },
        { type: "tool_use", name: "create_goal", input: { title: "Strength", wellnessDimension: "body" } },
        { type: "tool_use", name: "log_mood", input: { energyLevel: 4, moodLevel: 3 } },
        { type: "tool_use", name: "navigate_to", input: { path: "/goals" } },
      ],
    });

    expect(toolCalls).toEqual([
      { name: "create_goal", arguments: { title: "Strength", wellnessDimension: "body" } },
      { name: "log_mood", arguments: { energyLevel: 4, moodLevel: 3 } },
      { name: "navigate_to", arguments: { path: "/goals" } },
    ]);
  });

  it("does not treat OpenAI tool_call type as the function name", async () => {
    const { normalizeToolCallsFromAssistantMessage } = await loadOpenAiModule();
    const toolCalls = normalizeToolCallsFromAssistantMessage({
      tool_calls: [{ type: "function", function: { arguments: "{\"path\":\"/today\"}" } }],
    });

    expect(toolCalls).toEqual([]);
  });
});

describe("consumeChatCompletionStream", () => {
  it("keeps SSE chunk format and accumulates streamed tool calls", async () => {
    const { consumeChatCompletionStream } = await loadOpenAiModule();
    const writes: string[] = [];

    async function* mockStream() {
      yield { choices: [{ delta: { content: "Hi " } }] };
      yield { choices: [{ delta: { content: "there." } }] };
      yield {
        choices: [
          {
            delta: {
              tool_calls: [{ id: "call_1", function: { name: "navigate", arguments: "{\"path\":\"/today\"" } }],
            },
          },
        ],
      };
      yield {
        choices: [
          {
            delta: {
              tool_calls: [{ id: "call_1", function: { name: "_to", arguments: ",\"tab\":\"focus\"}" } }],
            },
          },
        ],
      };
    }

    const result = await consumeChatCompletionStream(mockStream(), {
      write: (chunk: string) => writes.push(chunk),
    });

    expect(writes).toEqual([
      "data: {\"content\":\"Hi \"}\n\n",
      "data: {\"content\":\"there.\"}\n\n",
    ]);
    expect(result).toEqual({
      response: "Hi there.",
      toolCalls: [{ name: "navigate_to", arguments: { path: "/today", tab: "focus" } }],
    });
  });
});
