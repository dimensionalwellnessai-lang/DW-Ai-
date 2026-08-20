/**
 * DW Resilient AI Engine
 *
 * Multi-provider cascade with automatic failover:
 *   1. OpenAI (primary)
 *   2. Perplexity (secondary — already installed integration)
 *   3. Graceful degradation message (never silent failure)
 *
 * Features:
 *   - Exponential backoff retries per provider
 *   - Circuit breaker (auto-skip a provider after repeated failures)
 *   - Request deduplication cache (identical prompts within 60s reuse result)
 *   - Never throws to caller — always returns a string
 */

import OpenAI from "openai";

// ─── Provider clients ────────────────────────────────────────────────────────

function buildOpenAIClient(): OpenAI | null {
  const apiKey = process.env.OPENAI_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL;
  const integrationKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY;

  if (apiKey) {
    return new OpenAI({ apiKey, timeout: 30_000, maxRetries: 0 });
  }
  if (baseURL && integrationKey) {
    return new OpenAI({ baseURL, apiKey: integrationKey, timeout: 30_000, maxRetries: 0 });
  }
  return null;
}

function buildPerplexityClient(): OpenAI | null {
  const apiKey = process.env.PERPLEXITY_API_KEY || process.env.AI_INTEGRATIONS_PERPLEXITY_API_KEY;
  const baseURL = process.env.AI_INTEGRATIONS_PERPLEXITY_BASE_URL || "https://api.perplexity.ai";
  if (!apiKey) return null;
  return new OpenAI({ baseURL, apiKey, timeout: 30_000, maxRetries: 0 });
}

// ─── Circuit breaker ─────────────────────────────────────────────────────────

interface CircuitState {
  failures: number;
  openUntil: number;
}

const CIRCUIT_THRESHOLD = 3;
const CIRCUIT_RESET_MS = 2 * 60 * 1000; // 2 minutes

const circuits: Record<string, CircuitState> = {
  openai: { failures: 0, openUntil: 0 },
  perplexity: { failures: 0, openUntil: 0 },
};

function isCircuitOpen(provider: string): boolean {
  const c = circuits[provider];
  if (!c) return false;
  if (c.openUntil > Date.now()) return true;
  if (c.openUntil > 0) {
    c.failures = 0;
    c.openUntil = 0;
  }
  return false;
}

function recordSuccess(provider: string) {
  const c = circuits[provider];
  if (c) { c.failures = 0; c.openUntil = 0; }
}

function recordFailure(provider: string) {
  const c = circuits[provider];
  if (!c) return;
  c.failures++;
  if (c.failures >= CIRCUIT_THRESHOLD) {
    c.openUntil = Date.now() + CIRCUIT_RESET_MS;
    console.warn(`[ai-engine] Circuit OPEN for ${provider} — skipping for ${CIRCUIT_RESET_MS / 1000}s`);
  }
}

// ─── Response cache ───────────────────────────────────────────────────────────

interface CacheEntry { result: string; ts: number; }
const responseCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 60_000;

function cacheKey(messages: { role: string; content: string }[]): string {
  return messages.map(m => `${m.role}:${m.content}`).join("|").slice(0, 512);
}

function getCached(key: string): string | null {
  const entry = responseCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL_MS) { responseCache.delete(key); return null; }
  return entry.result;
}

function setCache(key: string, result: string) {
  if (responseCache.size > 200) {
    const oldest = [...responseCache.entries()].sort((a, b) => a[1].ts - b[1].ts)[0];
    if (oldest) responseCache.delete(oldest[0]);
  }
  responseCache.set(key, { result, ts: Date.now() });
}

// ─── Retry helper ─────────────────────────────────────────────────────────────

async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts = 2,
  baseDelayMs = 500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (attempt < maxAttempts - 1) {
        await new Promise(r => setTimeout(r, baseDelayMs * Math.pow(2, attempt)));
      }
    }
  }
  throw lastError;
}

// ─── Provider call implementations ───────────────────────────────────────────

async function callOpenAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  model = "gpt-4o",
  maxTokens = 1500,
): Promise<string> {
  const client = buildOpenAIClient();
  if (!client) throw new Error("OpenAI not configured");

  const completion = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
  });

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from OpenAI");
  return text;
}

async function callPerplexity(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  maxTokens = 1500,
): Promise<string> {
  const client = buildPerplexityClient();
  if (!client) throw new Error("Perplexity not configured");

  const completion = await client.chat.completions.create({
    model: "sonar",
    messages,
    max_tokens: maxTokens,
  } as Parameters<typeof client.chat.completions.create>[0]);

  const text = (completion as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content?.trim();
  if (!text) throw new Error("Empty response from Perplexity");
  return text;
}

// ─── Streaming provider calls ─────────────────────────────────────────────────

export async function streamOpenAI(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  model = "gpt-4o",
  maxTokens = 2000,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const client = buildOpenAIClient();
  if (!client) throw new Error("OpenAI not configured");

  const stream = await client.chat.completions.create({
    model,
    messages,
    max_tokens: maxTokens,
    temperature: 0.7,
    stream: true,
  });

  let full = "";
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      full += delta;
      onChunk?.(delta);
    }
  }
  if (!full) throw new Error("Empty streaming response from OpenAI");
  return full;
}

export async function streamPerplexity(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  maxTokens = 2000,
  onChunk?: (chunk: string) => void,
): Promise<string> {
  const client = buildPerplexityClient();
  if (!client) throw new Error("Perplexity not configured");

  const stream = await client.chat.completions.create({
    model: "sonar",
    messages,
    max_tokens: maxTokens,
    stream: true,
  } as Parameters<typeof client.chat.completions.create>[0]);

  let full = "";
  for await (const chunk of (stream as AsyncIterable<OpenAI.Chat.Completions.ChatCompletionChunk>)) {
    const delta = chunk.choices[0]?.delta?.content || "";
    if (delta) {
      full += delta;
      onChunk?.(delta);
    }
  }
  if (!full) throw new Error("Empty streaming response from Perplexity");
  return full;
}

// ─── Graceful degradation response ───────────────────────────────────────────

const FALLBACK_RESPONSES = [
  "I'm here — just taking a moment to reconnect. Try sending that again and I'll pick right up.",
  "Something interrupted my thinking there. I'm back — what did you need?",
  "There was a brief delay on my end. Send that again and I'll respond fully.",
  "I'm present. There was a hiccup — please resend your last message.",
];

function getFallbackResponse(): string {
  return FALLBACK_RESPONSES[Math.floor(Math.random() * FALLBACK_RESPONSES.length)];
}

// ─── Main cascade call (non-streaming) ────────────────────────────────────────

export interface AICallOptions {
  model?: string;
  maxTokens?: number;
  useCache?: boolean;
  skipProviders?: string[];
}

export async function aiCall(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options: AICallOptions = {},
): Promise<string> {
  const { model = "gpt-4o", maxTokens = 1500, useCache = false, skipProviders = [] } = options;

  const key = useCache ? cacheKey(messages) : null;
  if (key) {
    const cached = getCached(key);
    if (cached) {
      console.log("[ai-engine] Cache hit");
      return cached;
    }
  }

  // ── Provider 1: OpenAI ────────────────────────────────────────────────────
  if (!skipProviders.includes("openai") && !isCircuitOpen("openai")) {
    try {
      const result = await withRetry(() => callOpenAI(messages, model, maxTokens), 2, 600);
      recordSuccess("openai");
      if (key) setCache(key, result);
      console.log("[ai-engine] OpenAI success");
      return result;
    } catch (err) {
      recordFailure("openai");
      console.warn("[ai-engine] OpenAI failed, trying Perplexity:", (err as Error).message);
    }
  }

  // ── Provider 2: Perplexity ────────────────────────────────────────────────
  if (!skipProviders.includes("perplexity") && !isCircuitOpen("perplexity")) {
    try {
      const result = await withRetry(() => callPerplexity(messages, maxTokens), 2, 600);
      recordSuccess("perplexity");
      if (key) setCache(key, result);
      console.log("[ai-engine] Perplexity fallback success");
      return result;
    } catch (err) {
      recordFailure("perplexity");
      console.warn("[ai-engine] Perplexity failed:", (err as Error).message);
    }
  }

  // ── Provider 3: Graceful degradation (never silent) ───────────────────────
  console.error("[ai-engine] All providers failed — returning graceful fallback");
  return getFallbackResponse();
}

// ─── Main cascade call (streaming) ───────────────────────────────────────────

export async function aiStream(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  onChunk: (chunk: string) => void,
  options: AICallOptions = {},
): Promise<string> {
  const { model = "gpt-4o", maxTokens = 2000, skipProviders = [] } = options;

  // ── Provider 1: OpenAI ────────────────────────────────────────────────────
  if (!skipProviders.includes("openai") && !isCircuitOpen("openai")) {
    try {
      const result = await streamOpenAI(messages, model, maxTokens, onChunk);
      recordSuccess("openai");
      console.log("[ai-engine] OpenAI stream success");
      return result;
    } catch (err) {
      recordFailure("openai");
      console.warn("[ai-engine] OpenAI stream failed, trying Perplexity:", (err as Error).message);
    }
  }

  // ── Provider 2: Perplexity (streaming) ───────────────────────────────────
  if (!skipProviders.includes("perplexity") && !isCircuitOpen("perplexity")) {
    try {
      const result = await streamPerplexity(messages, maxTokens, onChunk);
      recordSuccess("perplexity");
      console.log("[ai-engine] Perplexity stream fallback success");
      return result;
    } catch (err) {
      recordFailure("perplexity");
      console.warn("[ai-engine] Perplexity stream failed:", (err as Error).message);
    }
  }

  // ── Provider 3: Graceful degradation ─────────────────────────────────────
  const fallback = getFallbackResponse();
  onChunk(fallback);
  console.error("[ai-engine] All stream providers failed — returning graceful fallback");
  return fallback;
}

// ─── Task-oriented chat-completion helper ─────────────────────────────────────

export interface ChatCompleteOptions {
  /** Logical task name — used to derive the per-task env var (DW_AI_MODEL_<TASK_UPPER>). */
  task: string;
  /** Explicit model override (highest priority). */
  model?: string;
  maxTokens?: number;
  temperature?: number;
  /** When true, sends response_format: json_object on OpenAI path. */
  jsonMode?: boolean;
  useCache?: boolean;
}

/**
 * Resolve the model for a given task following the priority order:
 *   1. explicit options.model
 *   2. DW_AI_MODEL_<TASK_UPPER>   e.g. DW_AI_MODEL_CHIPS
 *   3. DW_AI_MODEL_LIGHTWEIGHT
 *   4. "gpt-4o-mini"
 */
function resolveTaskModel(options: ChatCompleteOptions): string {
  if (options.model) return options.model;
  const taskEnvVar = `DW_AI_MODEL_${options.task.toUpperCase()}`;
  if (process.env[taskEnvVar]) return process.env[taskEnvVar] as string;
  if (process.env.DW_AI_MODEL_LIGHTWEIGHT) return process.env.DW_AI_MODEL_LIGHTWEIGHT;
  return "gpt-4o-mini";
}

/**
 * Provider-neutral lightweight chat completion.
 *
 * Reuses the existing circuit-breaker / retry / cache infrastructure.
 * - On the OpenAI path, jsonMode maps to response_format: { type: "json_object" }.
 * - On the Perplexity fallback path, response_format is omitted (unsupported).
 * - Throws on provider failure so callers can apply their own fallback logic.
 */
export async function chatComplete(
  messages: { role: "system" | "user" | "assistant"; content: string }[],
  options: ChatCompleteOptions,
): Promise<string> {
  const model = resolveTaskModel(options);
  const maxTokens = options.maxTokens ?? 500;
  const temperature = options.temperature ?? 0.7;
  const useCache = options.useCache ?? false;

  const key = useCache ? cacheKey(messages) : null;
  if (key) {
    const cached = getCached(key);
    if (cached) {
      console.log(`[ai-engine:${options.task}] Cache hit`);
      return cached;
    }
  }

  // ── Provider 1: OpenAI ──────────────────────────────────────────────────────
  if (!isCircuitOpen("openai")) {
    try {
      const client = buildOpenAIClient();
      if (!client) throw new Error("OpenAI not configured");

      const createParams: Parameters<typeof client.chat.completions.create>[0] = {
        model,
        messages,
        max_tokens: maxTokens,
        temperature,
        ...(options.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
      };

      const result = await withRetry(async () => {
        const completion = await client.chat.completions.create(createParams);
        const text = completion.choices[0]?.message?.content?.trim();
        if (!text) throw new Error("Empty response from OpenAI");
        return text;
      }, 2, 600);

      recordSuccess("openai");
      if (key) setCache(key, result);
      console.log(`[ai-engine:${options.task}] OpenAI success (model=${model})`);
      return result;
    } catch (err) {
      recordFailure("openai");
      console.warn(`[ai-engine:${options.task}] OpenAI failed, trying Perplexity:`, (err as Error).message);
    }
  }

  // ── Provider 2: Perplexity (omit response_format — unsupported; model is always "sonar") ─────────────────
  if (!isCircuitOpen("perplexity")) {
    try {
      const client = buildPerplexityClient();
      if (!client) throw new Error("Perplexity not configured");

      const result = await withRetry(async () => {
        const completion = await client.chat.completions.create({
          model: "sonar",
          messages,
          max_tokens: maxTokens,
        } as Parameters<typeof client.chat.completions.create>[0]);
        const text = (completion as OpenAI.Chat.Completions.ChatCompletion).choices[0]?.message?.content?.trim();
        if (!text) throw new Error("Empty response from Perplexity");
        return text;
      }, 2, 600);

      recordSuccess("perplexity");
      if (key) setCache(key, result);
      console.log(`[ai-engine:${options.task}] Perplexity fallback success`);
      return result;
    } catch (err) {
      recordFailure("perplexity");
      console.warn(`[ai-engine:${options.task}] Perplexity failed:`, (err as Error).message);
    }
  }

  // ── Both providers failed — throw so callers apply their own fallback ────────
  throw new Error(`[ai-engine:${options.task}] All providers failed`);
}

// ─── Health status (for monitoring) ──────────────────────────────────────────

export function getAIEngineStatus() {
  return {
    openai: {
      configured: !!(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY),
      circuitOpen: isCircuitOpen("openai"),
      failures: circuits.openai?.failures ?? 0,
    },
    perplexity: {
      configured: !!(process.env.PERPLEXITY_API_KEY || process.env.AI_INTEGRATIONS_PERPLEXITY_API_KEY),
      circuitOpen: isCircuitOpen("perplexity"),
      failures: circuits.perplexity?.failures ?? 0,
    },
    cacheSize: responseCache.size,
  };
}
