import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";

process.env.DATABASE_URL ||= "******localhost:5432/test";

vi.mock("../storage", () => ({
  storage: {},
}));

const transcribeCreateMock = vi.fn(async () => ({ text: "whisper transcript" }));
vi.mock("../openai", () => ({
  openai: {
    audio: {
      transcriptions: {
        create: transcribeCreateMock,
      },
      speech: {
        create: vi.fn(),
      },
    },
  },
}));

const toFileMock = vi.fn(async () => ({ mocked: true }));
vi.mock("openai", () => ({
  toFile: toFileMock,
}));

let server: Server;
let baseUrl: string;
const realFetch = global.fetch;
const originalDeepgramKey = process.env.DEEPGRAM_API_KEY;

function audioFormData() {
  const form = new FormData();
  form.append("audio", new Blob([Buffer.from("test-audio")], { type: "audio/webm" }), "audio.webm");
  return form;
}

beforeAll(async () => {
  const { registerMediaMiscRoutes } = await import("../routes/media-misc");
  const app = express();
  registerMediaMiscRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  process.env.DEEPGRAM_API_KEY = originalDeepgramKey;
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  transcribeCreateMock.mockClear();
  toFileMock.mockClear();
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("POST /api/transcribe", () => {
  it("uses Whisper when DEEPGRAM_API_KEY is unset", async () => {
    delete process.env.DEEPGRAM_API_KEY;

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      return realFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      body: audioFormData(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "whisper transcript" });
    expect(transcribeCreateMock).toHaveBeenCalledTimes(1);
    expect(fetchSpy).not.toHaveBeenCalledWith(expect.stringContaining("api.deepgram.com"), expect.anything());
  });

  it("uses Deepgram transcript when configured and successful", async () => {
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";

    const fetchSpy = vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://api.deepgram.com/v1/listen")) {
        return Promise.resolve(new Response(JSON.stringify({
          results: {
            channels: [{ alternatives: [{ transcript: "deepgram transcript" }] }],
          },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      return realFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      body: audioFormData(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "deepgram transcript" });
    expect(fetchSpy).toHaveBeenCalledWith(expect.stringContaining("https://api.deepgram.com/v1/listen"), expect.anything());
    expect(transcribeCreateMock).not.toHaveBeenCalled();
    expect(toFileMock).not.toHaveBeenCalled();
  });

  it("falls back to Whisper when Deepgram returns a non-2xx response", async () => {
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";

    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://api.deepgram.com/v1/listen")) {
        return Promise.resolve(new Response(JSON.stringify({ error: "Internal Server Error" }), { status: 500 }));
      }
      return realFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      body: audioFormData(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "whisper transcript" });
    expect(transcribeCreateMock).toHaveBeenCalledTimes(1);
    expect(toFileMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to Whisper when Deepgram returns an empty transcript", async () => {
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";

    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://api.deepgram.com/v1/listen")) {
        return Promise.resolve(new Response(JSON.stringify({
          results: {
            channels: [{ alternatives: [{ transcript: "" }] }],
          },
        }), { status: 200, headers: { "Content-Type": "application/json" } }));
      }
      return realFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      body: audioFormData(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "whisper transcript" });
    expect(transcribeCreateMock).toHaveBeenCalledTimes(1);
    expect(toFileMock).toHaveBeenCalledTimes(1);
  });

  it("falls back to Whisper when Deepgram request fails", async () => {
    process.env.DEEPGRAM_API_KEY = "test-deepgram-key";

    vi.spyOn(global, "fetch").mockImplementation((input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
      if (url.startsWith("https://api.deepgram.com/v1/listen")) {
        return Promise.reject(new Error("network fail"));
      }
      return realFetch(input, init);
    });

    const res = await fetch(`${baseUrl}/api/transcribe`, {
      method: "POST",
      body: audioFormData(),
    });

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ text: "whisper transcript" });
    expect(transcribeCreateMock).toHaveBeenCalledTimes(1);
    expect(toFileMock).toHaveBeenCalledTimes(1);
  });
});
