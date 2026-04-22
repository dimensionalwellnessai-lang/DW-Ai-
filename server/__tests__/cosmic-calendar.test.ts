/**
 * Server tests for the Cosmic calendar endpoint
 * (`GET /api/cosmic/calendar`).
 *
 * Pins the input-validation surface and the happy path:
 *   1. Missing/malformed `start` or `end` → 400
 *   2. `end` before `start` → 400
 *   3. Range > 95 days → 400
 *   4. Valid range → 200 with `{ start, end, events: [...] }`
 *      and `computeCalendarEvents` invoked exactly once with the
 *      requested bounds.
 */
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import express from "express";
import type { AddressInfo } from "net";
import type { Server } from "http";

process.env.DATABASE_URL ||= "postgres://test:test@localhost:5432/test";

// ─── Mocks ──────────────────────────────────────────────────────────────────
vi.mock("../db", () => ({
  db: { select: () => ({ from: () => ({ where: () => ({ limit: async () => [] }) }) }) },
  pool: {},
}));

vi.mock("../openai", () => ({
  openai: { audio: { speech: { create: vi.fn() } } },
}));

vi.mock("../ai-engine", () => ({
  aiCall: vi.fn(async () => "stub"),
}));

const computeCalendarEvents = vi.fn(
  (_start: string, _end: string) => [
    {
      date: "2026-05-10",
      type: "full_moon",
      label: "Full Moon in Scorpio",
      description: "Tides feel high.",
      planet: "Moon",
      sign: "Scorpio",
      prompt: "What's coming to a head?",
    },
  ],
);

vi.mock("../ephemeris", () => ({
  computeTodaySnapshot: vi.fn(),
  computeCalendarEvents,
  currentTransits: vi.fn(),
  // Pass-through cache so the test exercises the real call path on every
  // request without sharing state across tests.
  withCache: vi.fn((_k: string, _ttl: number, fn: () => unknown) => fn()),
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
  computeCalendarEvents.mockClear();
});

describe("GET /api/cosmic/calendar", () => {
  it("returns events for a valid range and forwards the bounds to the ephemeris helper", async () => {
    const res = await fetch(
      `${baseUrl}/api/cosmic/calendar?start=2026-05-01&end=2026-05-31`,
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      start: "2026-05-01",
      end: "2026-05-31",
    });
    expect(Array.isArray(body.events)).toBe(true);
    expect(body.events.length).toBeGreaterThan(0);
    expect(body.events[0]).toMatchObject({
      type: "full_moon",
      label: "Full Moon in Scorpio",
    });
    expect(computeCalendarEvents).toHaveBeenCalledTimes(1);
    expect(computeCalendarEvents).toHaveBeenCalledWith("2026-05-01", "2026-05-31");
  });

  it("400s when start or end is missing", async () => {
    const res = await fetch(`${baseUrl}/api/cosmic/calendar?start=2026-05-01`);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/YYYY-MM-DD/);
    expect(computeCalendarEvents).not.toHaveBeenCalled();
  });

  it("400s on a malformed date format", async () => {
    const res = await fetch(
      `${baseUrl}/api/cosmic/calendar?start=05%2F01%2F2026&end=05%2F31%2F2026`,
    );
    expect(res.status).toBe(400);
    expect(computeCalendarEvents).not.toHaveBeenCalled();
  });

  it("400s when end is before start", async () => {
    const res = await fetch(
      `${baseUrl}/api/cosmic/calendar?start=2026-05-31&end=2026-05-01`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/end must be on or after start/);
    expect(computeCalendarEvents).not.toHaveBeenCalled();
  });

  it("400s when the range exceeds 95 days", async () => {
    const res = await fetch(
      `${baseUrl}/api/cosmic/calendar?start=2026-01-01&end=2026-06-01`,
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/Range too large/);
    expect(computeCalendarEvents).not.toHaveBeenCalled();
  });

  it("accepts the boundary range of exactly 95 days", async () => {
    // 2026-01-01 → 2026-04-06 = 95 days exactly.
    const res = await fetch(
      `${baseUrl}/api/cosmic/calendar?start=2026-01-01&end=2026-04-06`,
    );
    expect(res.status).toBe(200);
    expect(computeCalendarEvents).toHaveBeenCalledTimes(1);
  });
});
