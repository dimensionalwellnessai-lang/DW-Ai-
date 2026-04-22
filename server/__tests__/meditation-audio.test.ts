/**
 * Server tests for the guided-meditation audio endpoint
 * (`GET /api/meditations/audio/:slug`).
 *
 * Pins the four branches of the route:
 *   1. 400 for an invalid slug (anything outside [a-z0-9-]).
 *   2. 404 when no library row matches the slug.
 *   3. 200 + audio/mpeg + cache-control on a cache miss (calls TTS once).
 *   4. 200 on a cache hit (TTS is NOT called a second time for the same slug).
 *
 * The endpoint streams real binary, so we assert on Content-Type and
 * Content-Length rather than parsing the body. Both the DB and OpenAI
 * are mocked because this test only cares about the route's caching +
 * input-validation behaviour, not the actual audio bytes.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";

// Avoid pulling in DATABASE_URL during module load.
process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

// ─── Mocks ──────────────────────────────────────────────────────────────────
// The route does:
//   db.select().from(meditationLibrary).where(eq(slug, ...)).limit(1)
// Build a minimal chain that returns whatever `fakeRows` is currently set to.
const fakeState: { rows: Array<{ slug: string; scriptText: string }> } = {
  rows: [],
};

vi.mock("../db", () => {
  const limit = vi.fn(async () => fakeState.rows);
  const where = vi.fn(() => ({ limit }));
  const from = vi.fn(() => ({ where }));
  const select = vi.fn(() => ({ from }));
  return {
    db: { select },
    pool: {},
  };
});

const ttsCreate = vi.fn(async () => ({
  // Return a tiny fake "mp3" buffer.
  arrayBuffer: async () => new Uint8Array([0x49, 0x44, 0x33, 0x04]).buffer,
}));

vi.mock("../openai", () => ({
  openai: {
    audio: {
      speech: {
        create: ttsCreate,
      },
    },
  },
}));

// The spiritual route module also pulls in the AI engine and ephemeris
// helpers for unrelated routes. Stub them so module load doesn't fan out
// into the real network/file paths.
vi.mock("../ai-engine", () => ({
  aiCall: vi.fn(async () => "stub"),
}));
vi.mock("../ephemeris", () => ({
  computeTodaySnapshot: vi.fn(),
  computeCalendarEvents: vi.fn(),
  currentTransits: vi.fn(),
  withCache: vi.fn((_k: string, fn: () => unknown) => fn()),
}));

// ─── Test server ────────────────────────────────────────────────────────────
let server: Server;
let baseUrl: string;

beforeAll(async () => {
  const { registerSpiritualRoutes } = await import("../routes/spiritual");
  const app = express();
  registerSpiritualRoutes(app);
  await new Promise<void>((resolve) => {
    server = app.listen(0, () => resolve());
  });
  const port = (server.address() as AddressInfo).port;
  baseUrl = `http://127.0.0.1:${port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

beforeEach(() => {
  fakeState.rows = [];
  ttsCreate.mockClear();
});

describe("GET /api/meditations/audio/:slug", () => {
  it("rejects an invalid slug with 400 without touching the DB or TTS", async () => {
    const res = await fetch(`${baseUrl}/api/meditations/audio/not%20a%20slug`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toMatchObject({ error: "Invalid slug" });
    expect(ttsCreate).not.toHaveBeenCalled();
  });

  it("returns 404 when no library row matches the slug", async () => {
    fakeState.rows = []; // empty = no match
    const res = await fetch(`${baseUrl}/api/meditations/audio/unknown-slug`);
    expect(res.status).toBe(404);
    expect(ttsCreate).not.toHaveBeenCalled();
  });

  it("generates audio on first hit and serves it as audio/mpeg with a long cache header", async () => {
    fakeState.rows = [
      { slug: "calm-breath", scriptText: "Breathe slowly and notice the air." },
    ];
    const res = await fetch(`${baseUrl}/api/meditations/audio/calm-breath`);

    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toMatch(/^audio\/mpeg/);
    // Long-lived browser cache so the <audio> element doesn't re-fetch.
    expect(res.headers.get("cache-control")).toContain("max-age=86400");
    expect(res.headers.get("cache-control")).toContain("immutable");
    expect(ttsCreate).toHaveBeenCalledTimes(1);

    // Body has bytes (the fake "ID3 " header from the mock).
    const buf = new Uint8Array(await res.arrayBuffer());
    expect(buf.length).toBeGreaterThan(0);
  });

  it("serves the second hit from cache without re-running TTS", async () => {
    fakeState.rows = [
      { slug: "warmth", scriptText: "Feel a slow warmth in your chest." },
    ];

    const first = await fetch(`${baseUrl}/api/meditations/audio/warmth`);
    expect(first.status).toBe(200);
    expect(ttsCreate).toHaveBeenCalledTimes(1);

    // Drop the rows so a real DB lookup would 404 — proving the second
    // request hits the in-memory cache instead.
    fakeState.rows = [];
    const second = await fetch(`${baseUrl}/api/meditations/audio/warmth`);
    expect(second.status).toBe(200);
    expect(second.headers.get("content-type")).toMatch(/^audio\/mpeg/);
    expect(ttsCreate).toHaveBeenCalledTimes(1); // unchanged
  });
});
