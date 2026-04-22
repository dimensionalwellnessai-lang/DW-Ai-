// Spiritual workspace API: meditation library + sessions, prayer entries
// (with optional collective sharing), summary, and a cached collective
// "energy of the day" endpoint backed by Perplexity.
import type { Express, Request, Response, NextFunction } from "express";
import { promises as fs } from "fs";
import path from "path";
import { z } from "zod";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { db } from "../db";
import {
  meditationLibrary,
  meditationSessions,
  prayerEntries,
  insertMeditationSessionSchema,
  insertPrayerEntrySchema,
  meditationThemeEnum,
  type MeditationTheme,
} from "@shared/schema";
import { aiCall } from "../ai-engine";
import { openai } from "../openai";
import { computeTodaySnapshot, computeCalendarEvents, currentTransits, withCache } from "../ephemeris";
import { birthCharts } from "@shared/schema";

// In-memory cache of TTS-generated meditation audio, keyed by slug.
// Each library item is generated once on first request, then served from
// memory for the lifetime of the process. Bounded so a runaway library
// can't grow it without limit.
const MEDITATION_AUDIO_CACHE = new Map<string, Buffer>();
const MEDITATION_AUDIO_CACHE_MAX = 100;

// On-disk persistence for generated MP3s so OpenAI TTS is paid at most
// once per slug across the lifetime of the deployment, not once per
// process restart. Files live in a writable cache directory and are
// hydrated into memory on boot. Override with MEDITATION_AUDIO_DIR.
const MEDITATION_AUDIO_DIR = path.resolve(
  process.env.MEDITATION_AUDIO_DIR || ".cache/meditation-audio"
);

function audioFilePath(slug: string): string {
  // Slug is already validated as [a-z0-9-]+; safe to use as filename.
  return path.join(MEDITATION_AUDIO_DIR, `${slug}.mp3`);
}

async function ensureAudioDir(): Promise<void> {
  await fs.mkdir(MEDITATION_AUDIO_DIR, { recursive: true });
}

async function readAudioFromDisk(slug: string): Promise<Buffer | null> {
  try {
    return await fs.readFile(audioFilePath(slug));
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") return null;
    throw err;
  }
}

async function writeAudioToDisk(slug: string, buffer: Buffer): Promise<void> {
  await ensureAudioDir();
  // Atomic write: write to a temp file then rename so a crash mid-write
  // never leaves a partial MP3 that would later be served as "cached".
  const final = audioFilePath(slug);
  const tmp = `${final}.${process.pid}.tmp`;
  await fs.writeFile(tmp, buffer);
  await fs.rename(tmp, final);
}

function rememberInMemory(slug: string, buffer: Buffer): void {
  if (MEDITATION_AUDIO_CACHE.size >= MEDITATION_AUDIO_CACHE_MAX) {
    const firstKey = MEDITATION_AUDIO_CACHE.keys().next().value;
    if (firstKey !== undefined) MEDITATION_AUDIO_CACHE.delete(firstKey);
  }
  MEDITATION_AUDIO_CACHE.set(slug, buffer);
}

// Generate (or fetch from cache) the TTS MP3 for a single library slug.
// Lookup order: in-memory → on-disk → generate via OpenAI TTS. Centralised
// so both the request handler and the pre-warm worker share the same code
// path and persistence behaviour.
async function loadOrGenerateMeditationAudio(slug: string): Promise<Buffer | null> {
  const cached = MEDITATION_AUDIO_CACHE.get(slug);
  if (cached) return cached;

  const fromDisk = await readAudioFromDisk(slug);
  if (fromDisk) {
    rememberInMemory(slug, fromDisk);
    return fromDisk;
  }

  const [row] = await db
    .select()
    .from(meditationLibrary)
    .where(eq(meditationLibrary.slug, slug))
    .limit(1);
  if (!row) return null;

  const text = row.scriptText.trim().slice(0, 4000);
  const response = await openai.audio.speech.create({
    model: "tts-1",
    voice: "alloy",
    input: text,
    // Slightly slower than default — matches the calm cadence of a
    // guided meditation rather than a normal prose reading.
    speed: 0.85,
  });
  const buffer = Buffer.from(await response.arrayBuffer());

  // Persist to disk first so a crash before in-memory insert still
  // benefits the next process. Disk-write failure is non-fatal — we
  // still serve the in-memory buffer for this request.
  try {
    await writeAudioToDisk(slug, buffer);
  } catch (err) {
    console.warn(`[spiritual] failed to persist audio for ${slug}:`, (err as Error).message);
  }
  rememberInMemory(slug, buffer);
  return buffer;
}

// Background pre-warm: ensures every library slug has an MP3 available
// for sub-second playback. Hydrates the in-memory cache from disk first
// (cheap, no OpenAI), then generates any still-missing slugs with bounded
// concurrency and a small inter-call delay so a cold deploy can't spike
// OpenAI TTS usage. Safe to call repeatedly — already-warm slugs are
// skipped, and a single in-flight promise prevents duplicate runs.
let preWarmInFlight: Promise<void> | null = null;
export function preWarmMeditationAudio(
  opts: { concurrency?: number; delayMs?: number } = {}
): Promise<void> {
  if (preWarmInFlight) return preWarmInFlight;
  const concurrency = Math.max(1, opts.concurrency ?? 3);
  const delayMs = Math.max(0, opts.delayMs ?? 200);
  preWarmInFlight = (async () => {
    try {
      await ensureAudioDir();
      const rows = await db
        .select({ slug: meditationLibrary.slug })
        .from(meditationLibrary);
      const slugs = rows.map((r) => r.slug).filter((s): s is string => !!s);

      // Phase 1: hydrate in-memory cache from disk for any slugs that
      // already have a persisted MP3. This is what makes the very first
      // user request after a restart serve in <1s.
      let hydrated = 0;
      for (const slug of slugs) {
        if (MEDITATION_AUDIO_CACHE.has(slug)) continue;
        const buf = await readAudioFromDisk(slug).catch(() => null);
        if (buf) {
          rememberInMemory(slug, buf);
          hydrated++;
        }
      }

      // Phase 2: generate MP3s for any slug still missing. Bounded
      // concurrency + per-slot delay keeps OpenAI usage smooth.
      const toGenerate = slugs.filter((s) => !MEDITATION_AUDIO_CACHE.has(s));
      if (toGenerate.length === 0) {
        console.log(
          `[spiritual] meditation audio pre-warm: ${slugs.length} ready (hydrated ${hydrated} from disk, 0 generated)`
        );
        return;
      }
      console.log(
        `[spiritual] meditation audio pre-warm: hydrated ${hydrated}/${slugs.length} from disk, generating ${toGenerate.length} via TTS (concurrency ${concurrency})`
      );

      let ok = 0;
      let fail = 0;
      const queue = [...toGenerate];
      const workers: Promise<void>[] = [];
      const runWorker = async () => {
        while (queue.length > 0) {
          const slug = queue.shift();
          if (!slug) break;
          try {
            await loadOrGenerateMeditationAudio(slug);
            ok++;
          } catch (err) {
            fail++;
            console.warn(`[spiritual] pre-warm failed for ${slug}:`, (err as Error).message);
          }
          if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
        }
      };
      for (let i = 0; i < Math.min(concurrency, toGenerate.length); i++) {
        workers.push(runWorker());
      }
      await Promise.all(workers);
      console.log(
        `[spiritual] meditation audio pre-warm done: ${ok} generated, ${fail} failed, ${hydrated} hydrated from disk`
      );
    } catch (err) {
      console.warn("[spiritual] meditation audio pre-warm aborted:", (err as Error).message);
    } finally {
      preWarmInFlight = null;
    }
  })();
  return preWarmInFlight;
}

// ─── Auth guard (mirrors the inline guard in server/routes.ts) ────────────────
function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

// ─── Collective energy-of-the-day cache (12h TTL) ─────────────────────────────
interface PlanetaryMovement {
  planet: string;
  sign: string;
  longitude: number;
}

interface CollectiveEnergy {
  date: string;            // ISO date (YYYY-MM-DD)
  energyWord: string;      // From ephemeris snapshot
  moonPhase: string;
  moonPhaseEmoji: string;
  moonSign: string;
  sunSign: string;
  blurb: string;           // 2–3 sentence collective interpretation
  // Compact summary of where the planets are right now — surfaced so the
  // Cosmic tab can render a "planetary movements" line without a second call.
  planetaryMovements: PlanetaryMovement[];
  collectiveCount: number; // Anonymous count of shared prayer entries today
  source: "perplexity" | "fallback";
}

let CACHED_ENERGY: { value: CollectiveEnergy; expiresAt: number } | null = null;
const ENERGY_TTL_MS = 12 * 60 * 60 * 1000;

async function generateEnergyBlurb(snapshot: ReturnType<typeof computeTodaySnapshot>): Promise<{ blurb: string; source: "perplexity" | "fallback" }> {
  const prompt =
    `Write a calm, faith-neutral 2–3 sentence "energy of the day" reading for ${snapshot.date}. ` +
    `Moon phase: ${snapshot.moonPhase} in ${snapshot.moonSign}. Sun in ${snapshot.sunSign}. ` +
    `Energy word: ${snapshot.energyWord}. Avoid prediction language. ` +
    `Speak gently to a wide audience as a shared collective feeling. No emoji. Plain prose only.`;
  try {
    // Skip OpenAI to favour Perplexity's current/contextual tone for this feature.
    const text = await aiCall(
      [
        { role: "system", content: "You are a poetic but grounded astrology writer." },
        { role: "user", content: prompt },
      ],
      { maxTokens: 220, skipProviders: ["openai"] }
    );
    const cleaned = text.trim().replace(/\s+/g, " ");
    // Reject the AI-engine graceful fallback string and any obviously empty reply.
    // Match all variants of the AI engine's graceful-fallback strings.
    const looksLikeFallback = /reconnect|pick right up|interrupted my thinking|brief delay|send that again|i'll respond|i'll pick right up/i.test(cleaned);
    if (!cleaned || cleaned.length < 40 || looksLikeFallback) throw new Error("empty");
    return { blurb: cleaned, source: "perplexity" };
  } catch {
    return {
      blurb:
        `Today carries a ${snapshot.energyWord.toLowerCase()} undertone, with the ${snapshot.moonPhase} ` +
        `in ${snapshot.moonSign} colouring how we feel and the Sun in ${snapshot.sunSign} ` +
        `shaping where we direct our attention. A good day to move slowly and listen.`,
      source: "fallback",
    };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
// Build the short, faith-neutral "what today means for you" paragraph used by
// both /api/cosmic/personal and /api/cosmic/today. Anchors on whichever of
// Sun/Moon/Rising the user has stored; falls back to a generic snapshot
// phrasing when no chart exists.
type NatalPlacement = { planet: string; sign: string; degree?: number; house?: number };
function buildPersonalReading(
  snapshot: ReturnType<typeof computeTodaySnapshot>,
  placements: NatalPlacement[] | null,
): string {
  const sun = placements?.find((p) => p.planet === "Sun")?.sign ?? null;
  const moon = placements?.find((p) => p.planet === "Moon")?.sign ?? null;
  const asc = placements?.find((p) => p.planet === "Ascendant")?.sign ?? null;

  if (sun || moon || asc) {
    const parts: string[] = [];
    if (sun) parts.push(`${sun} Sun`);
    if (moon) parts.push(`${moon} Moon`);
    if (asc) parts.push(`${asc} Rising`);
    return (
      `For your ${parts.join(" / ")}, today's ${snapshot.moonPhase} in ${snapshot.moonSign} ` +
      `highlights ${snapshot.energyWord.toLowerCase()} themes — pay attention to where the ` +
      `transiting Moon meets your natal placements.`
    );
  }
  return (
    `Today's ${snapshot.moonPhase} in ${snapshot.moonSign} brings a ` +
    `${snapshot.energyWord.toLowerCase()} undertone. Add your birth details to make this reading personal.`
  );
}

async function loadUserPlacements(userId: string): Promise<NatalPlacement[] | null> {
  const [chart] = await db
    .select()
    .from(birthCharts)
    .where(eq(birthCharts.userId, userId))
    .limit(1);
  return (chart?.placements ?? null) as NatalPlacement[] | null;
}

function startOfTodayUtc(): Date {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

// Insert schemas surfaced over the wire — enforce a body shape for safety.
const sessionBodySchema = insertMeditationSessionSchema.omit({ userId: true }).extend({
  durationSec: z.number().int().min(1).max(60 * 60 * 4),
  moodBefore: z.number().int().min(1).max(5).optional().nullable(),
  moodAfter: z.number().int().min(1).max(5).optional().nullable(),
});

const prayerBodySchema = insertPrayerEntrySchema.omit({ userId: true }).extend({
  intention: z.string().max(2000).optional().nullable(),
  gratitudeList: z.array(z.string().max(500)).max(20).optional().nullable(),
  shareCollective: z.boolean().optional().default(false),
}).refine(
  (v) => (v.intention?.trim()?.length ?? 0) > 0 || (v.gratitudeList?.length ?? 0) > 0,
  { message: "Provide an intention or at least one gratitude item" },
);

export function registerSpiritualRoutes(app: Express): void {
  // ─── Meditation library ─────────────────────────────────────────────────────
  app.get("/api/meditations", async (req, res) => {
    try {
      const themeRaw = typeof req.query.theme === "string" ? req.query.theme : undefined;
      const maxRaw = typeof req.query.maxMinutes === "string" ? Number(req.query.maxMinutes) : undefined;
      const theme = themeRaw && (meditationThemeEnum as readonly string[]).includes(themeRaw)
        ? (themeRaw as MeditationTheme)
        : undefined;

      const conditions = [];
      if (theme) conditions.push(eq(meditationLibrary.theme, theme));
      if (typeof maxRaw === "number" && Number.isFinite(maxRaw)) {
        conditions.push(sql`${meditationLibrary.durationMinutes} <= ${Math.floor(maxRaw)}`);
      }

      const rows = await db
        .select()
        .from(meditationLibrary)
        .where(conditions.length ? and(...conditions) : undefined)
        .orderBy(meditationLibrary.theme, meditationLibrary.durationMinutes);
      res.json(rows);
    } catch (err) {
      console.error("[spiritual] /api/meditations error:", err);
      res.status(500).json({ error: "Failed to load meditations" });
    }
  });

  app.get("/api/meditations/:id", async (req, res) => {
    try {
      const [row] = await db
        .select()
        .from(meditationLibrary)
        .where(eq(meditationLibrary.id, req.params.id))
        .limit(1);
      if (!row) return res.status(404).json({ error: "Not found" });
      res.json(row);
    } catch (err) {
      console.error("[spiritual] /api/meditations/:id error:", err);
      res.status(500).json({ error: "Failed to load meditation" });
    }
  });

  // ─── Guided meditation audio (TTS, cached per slug) ─────────────────────────
  // Generates an MP3 from the script via OpenAI TTS the first time a slug is
  // requested, then serves the cached buffer for subsequent requests. The
  // browser also caches via the long Cache-Control header. Public so the
  // <audio> element can stream it without auth headers.
  app.get("/api/meditations/audio/:slug", async (req, res) => {
    try {
      const slug = req.params.slug;
      if (!slug || !/^[a-z0-9-]+$/i.test(slug)) {
        return res.status(400).json({ error: "Invalid slug" });
      }

      const buffer = await loadOrGenerateMeditationAudio(slug);
      if (!buffer) return res.status(404).json({ error: "Not found" });

      res.set({
        "Content-Type": "audio/mpeg",
        "Content-Length": buffer.length.toString(),
        // Library content is stable per slug, so allow long browser caching.
        "Cache-Control": "public, max-age=86400, immutable",
      });
      res.send(buffer);
    } catch (err) {
      console.error("[spiritual] /api/meditations/audio/:slug error:", err);
      res.status(500).json({ error: "Failed to generate audio" });
    }
  });

  // ─── Meditation sessions ────────────────────────────────────────────────────
  app.get("/api/meditation-sessions", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db
        .select()
        .from(meditationSessions)
        .where(eq(meditationSessions.userId, userId))
        .orderBy(desc(meditationSessions.completedAt))
        .limit(limit);
      res.json(rows);
    } catch (err) {
      console.error("[spiritual] GET /api/meditation-sessions error:", err);
      res.status(500).json({ error: "Failed to load sessions" });
    }
  });

  app.post("/api/meditation-sessions", requireAuth, async (req, res) => {
    try {
      const parsed = sessionBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      }
      const userId = req.session.userId!;
      const [created] = await db
        .insert(meditationSessions)
        .values({ ...parsed.data, userId })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error("[spiritual] POST /api/meditation-sessions error:", err);
      res.status(500).json({ error: "Failed to log session" });
    }
  });

  // PATCH: used after auto-log on natural completion to attach the
  // post-session mood pulse + notes, instead of creating a duplicate row.
  app.patch("/api/meditation-sessions/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const patchSchema = z.object({
        moodBefore: z.number().int().min(1).max(5).optional().nullable(),
        moodAfter: z.number().int().min(1).max(5).optional().nullable(),
        notes: z.string().max(2000).optional().nullable(),
      });
      const parsed = patchSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      }
      const [updated] = await db
        .update(meditationSessions)
        .set(parsed.data)
        .where(and(
          eq(meditationSessions.id, req.params.id),
          eq(meditationSessions.userId, userId),
        ))
        .returning();
      if (!updated) return res.status(404).json({ error: "Not found" });
      res.json(updated);
    } catch (err) {
      console.error("[spiritual] PATCH /api/meditation-sessions/:id error:", err);
      res.status(500).json({ error: "Failed to update session" });
    }
  });

  // ─── Prayer entries (personal) ──────────────────────────────────────────────
  app.get("/api/prayer-entries", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = Math.min(Number(req.query.limit) || 50, 200);
      const rows = await db
        .select()
        .from(prayerEntries)
        .where(eq(prayerEntries.userId, userId))
        .orderBy(desc(prayerEntries.createdAt))
        .limit(limit);
      res.json(rows);
    } catch (err) {
      console.error("[spiritual] GET /api/prayer-entries error:", err);
      res.status(500).json({ error: "Failed to load prayer journal" });
    }
  });

  app.post("/api/prayer-entries", requireAuth, async (req, res) => {
    try {
      const parsed = prayerBodySchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid body", issues: parsed.error.issues });
      }
      const userId = req.session.userId!;
      const [created] = await db
        .insert(prayerEntries)
        .values({
          userId,
          intention: parsed.data.intention ?? null,
          gratitudeList: parsed.data.gratitudeList ?? null,
          shareCollective: parsed.data.shareCollective ?? false,
        })
        .returning();
      res.status(201).json(created);
    } catch (err) {
      console.error("[spiritual] POST /api/prayer-entries error:", err);
      res.status(500).json({ error: "Failed to save entry" });
    }
  });

  app.delete("/api/prayer-entries/:id", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const result = await db
        .delete(prayerEntries)
        .where(and(eq(prayerEntries.id, req.params.id), eq(prayerEntries.userId, userId)))
        .returning({ id: prayerEntries.id });
      if (result.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ success: true });
    } catch (err) {
      console.error("[spiritual] DELETE /api/prayer-entries/:id error:", err);
      res.status(500).json({ error: "Failed to delete entry" });
    }
  });

  // ─── Prayer entries (anonymous collective feed) ─────────────────────────────
  // Returns recent shared entries with NO user identifiers — only intention text
  // (truncated) and a relative timestamp. Auth required to view.
  app.get("/api/prayer-entries/collective", requireAuth, async (_req, res) => {
    try {
      // Latest 50 opted-in entries — no time-window restriction.
      const rows = await db
        .select({
          id: prayerEntries.id,
          intention: prayerEntries.intention,
          gratitudeList: prayerEntries.gratitudeList,
          createdAt: prayerEntries.createdAt,
        })
        .from(prayerEntries)
        .where(eq(prayerEntries.shareCollective, true))
        .orderBy(desc(prayerEntries.createdAt))
        .limit(50);

      // Strip / truncate sensitive content.
      const safe = rows.map((r) => ({
        id: r.id,
        // Redact obvious names — leave first letter, mask the rest of any
        // capitalised word longer than 2 chars.
        intention: r.intention
          ? r.intention.slice(0, 240).replace(/\b([A-Z])[a-z]{2,}/g, "$1•••")
          : null,
        gratitudeCount: Array.isArray(r.gratitudeList) ? r.gratitudeList.length : 0,
        createdAt: r.createdAt,
      }));
      res.json(safe);
    } catch (err) {
      console.error("[spiritual] /api/prayer-entries/collective error:", err);
      res.status(500).json({ error: "Failed to load collective feed" });
    }
  });

  // ─── Cosmic personal: user-aware natal placements + today's transits ──────
  // Reads the existing birth_charts.placements JSON (computed via the cosmic
  // workspace's onboarding flow) and pairs it with today's transit positions
  // so the spiritual page can render real personalized chart data, not just a
  // global ephemeris snapshot.
  app.get("/api/cosmic/personal", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const placements = await loadUserPlacements(userId);

      const snapshot = computeTodaySnapshot("tropical");
      const transitsRaw = currentTransits(new Date());
      const transits = transitsRaw.map((t) => ({
        planet: t.planet,
        sign: t.sign,
        degree: t.degree,
        retrograde: t.retrograde,
      }));

      const personal = buildPersonalReading(snapshot, placements);

      res.json({
        hasChart: !!placements && placements.length > 0,
        personalReading: personal,
        snapshot: {
          date: snapshot.date,
          moonPhase: snapshot.moonPhase,
          moonPhaseEmoji: snapshot.moonPhaseEmoji,
          moonSign: snapshot.moonSign,
          sunSign: snapshot.sunSign,
          energyWord: snapshot.energyWord,
        },
        natal: placements
          ? placements
              .filter((p) => ["Sun", "Moon", "Ascendant", "Mercury", "Venus", "Mars"].includes(p.planet))
              .map((p) => ({ planet: p.planet, sign: p.sign, house: p.house ?? null }))
          : null,
        transits,
      });
    } catch (err) {
      console.error("[spiritual] /api/cosmic/personal error:", err);
      res.status(500).json({ error: "Failed to load personal cosmic data" });
    }
  });

  // ─── Cosmic personal: today's snapshot for embedded card on /spiritual ─────
  // Public snapshot of the sky today. When the caller is signed in *and* has a
  // stored birth chart, we additionally attach a short personalised reading
  // anchored to their Sun/Moon/Rising so the Cosmic page can render something
  // tailored instead of the same generic energy word for everyone.
  app.get("/api/cosmic/today", async (req, res) => {
    try {
      const snapshot = computeTodaySnapshot("tropical");

      let personalReading: string | null = null;
      let hasChart = false;
      const userId = req.session?.userId;
      if (userId) {
        try {
          const placements = await loadUserPlacements(userId);
          // Only treat the chart as "usable" for personalisation when we
          // actually have at least one of Sun/Moon/Ascendant — otherwise
          // buildPersonalReading would just return the generic fallback,
          // and surfacing hasChart=true for that would be misleading.
          const hasAnchor = !!placements?.some((p) =>
            p.planet === "Sun" || p.planet === "Moon" || p.planet === "Ascendant"
          );
          if (placements && hasAnchor) {
            hasChart = true;
            personalReading = buildPersonalReading(snapshot, placements);
          }
        } catch (err) {
          // Personalisation failure must not break the public snapshot.
          console.warn(
            "[spiritual] /api/cosmic/today personalisation failed:",
            (err as Error).message,
          );
        }
      }

      res.json({
        date: snapshot.date,
        moonPhase: snapshot.moonPhase,
        moonPhaseEmoji: snapshot.moonPhaseEmoji,
        moonSign: snapshot.moonSign,
        sunSign: snapshot.sunSign,
        energyWord: snapshot.energyWord,
        events: snapshot.events,
        planets: snapshot.planetPositions.map((p) => ({
          planet: p.planet,
          sign: p.sign,
          longitude: Number(p.longitude.toFixed(2)),
        })),
        hasChart,
        personalReading,
      });
    } catch (err) {
      console.error("[spiritual] /api/cosmic/today error:", err);
      res.status(500).json({ error: "Failed to load today" });
    }
  });

  // ─── Cosmic personal: month of celestial events for the calendar tab ──────
  // Returns lunations, retrograde stations, sign ingresses, and seasonal
  // markers between `start` and `end` (ISO YYYY-MM-DD, inclusive). Range is
  // capped at ~95 days to keep computation bounded.
  app.get("/api/cosmic/calendar", async (req, res) => {
    try {
      const isoRe = /^\d{4}-\d{2}-\d{2}$/;
      const start = typeof req.query.start === "string" ? req.query.start : "";
      const end = typeof req.query.end === "string" ? req.query.end : "";
      if (!isoRe.test(start) || !isoRe.test(end)) {
        return res.status(400).json({ error: "start and end must be YYYY-MM-DD" });
      }
      const startDate = new Date(start + "T00:00:00Z");
      const endDate = new Date(end + "T00:00:00Z");
      if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
        return res.status(400).json({ error: "Invalid start or end date" });
      }
      if (endDate < startDate) {
        return res.status(400).json({ error: "end must be on or after start" });
      }
      const spanDays = (endDate.getTime() - startDate.getTime()) / 86400000;
      if (spanDays > 95) {
        return res.status(400).json({ error: "Range too large (max 95 days)" });
      }

      const events = withCache(
        `cosmic:calendar:${start}:${end}`,
        60 * 60 * 1000,
        () => computeCalendarEvents(start, end),
      );
      res.json({ start, end, events });
    } catch (err) {
      console.error("[spiritual] /api/cosmic/calendar error:", err);
      res.status(500).json({ error: "Failed to load calendar" });
    }
  });

  // ─── Cosmic collective: cached "energy of the day" ──────────────────────────
  app.get("/api/cosmic/collective", async (_req, res) => {
    try {
      const now = Date.now();
      if (!CACHED_ENERGY || CACHED_ENERGY.expiresAt < now) {
        const snapshot = computeTodaySnapshot("tropical");
        const { blurb, source } = await generateEnergyBlurb(snapshot);

        // Anonymous collective count from shared prayer entries today.
        const since = startOfTodayUtc();
        const countResult = await db
          .select({ count: sql<number>`COUNT(*)::int` })
          .from(prayerEntries)
          .where(and(
            eq(prayerEntries.shareCollective, true),
            gte(prayerEntries.createdAt, since),
          ));
        const collectiveCount = countResult[0]?.count ?? 0;

        CACHED_ENERGY = {
          value: {
            date: snapshot.date,
            energyWord: snapshot.energyWord,
            moonPhase: snapshot.moonPhase,
            moonPhaseEmoji: snapshot.moonPhaseEmoji,
            moonSign: snapshot.moonSign,
            sunSign: snapshot.sunSign,
            blurb,
            planetaryMovements: snapshot.planetPositions.map((p) => ({
              planet: p.planet,
              sign: p.sign,
              longitude: Number(p.longitude.toFixed(2)),
            })),
            collectiveCount,
            source,
          },
          expiresAt: now + ENERGY_TTL_MS,
        };
      }
      res.json(CACHED_ENERGY.value);
    } catch (err) {
      console.error("[spiritual] /api/cosmic/collective error:", err);
      res.status(500).json({ error: "Failed to load collective energy" });
    }
  });

  // ─── Summary: rolls up sessions + entries + mood correlation hook ──────────
  app.get("/api/spiritual/summary", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

      const [sessionsRows, prayersRows] = await Promise.all([
        db
          .select({
            id: meditationSessions.id,
            durationSec: meditationSessions.durationSec,
            completedAt: meditationSessions.completedAt,
            moodBefore: meditationSessions.moodBefore,
            moodAfter: meditationSessions.moodAfter,
            themeOverride: meditationSessions.themeOverride,
            libraryId: meditationSessions.libraryId,
          })
          .from(meditationSessions)
          .where(and(
            eq(meditationSessions.userId, userId),
            gte(meditationSessions.completedAt, since),
          ))
          .orderBy(desc(meditationSessions.completedAt)),
        db
          .select({
            id: prayerEntries.id,
            createdAt: prayerEntries.createdAt,
            shareCollective: prayerEntries.shareCollective,
          })
          .from(prayerEntries)
          .where(and(
            eq(prayerEntries.userId, userId),
            gte(prayerEntries.createdAt, since),
          )),
      ]);

      const totalMinutes = Math.round(
        sessionsRows.reduce((acc, s) => acc + (s.durationSec || 0), 0) / 60
      );

      // Mood correlation hook: average delta across sessions where both pulses
      // were captured. Positive = practice tends to lift mood.
      const withPulses = sessionsRows.filter(
        (s) => typeof s.moodBefore === "number" && typeof s.moodAfter === "number"
      );
      const avgMoodDelta = withPulses.length
        ? withPulses.reduce((acc, s) => acc + ((s.moodAfter ?? 0) - (s.moodBefore ?? 0)), 0) / withPulses.length
        : null;

      // Streak: count consecutive days (UTC) with at least one session, ending today.
      const dayKeys = new Set(
        sessionsRows.map((s) => {
          const d = new Date(s.completedAt as unknown as string);
          d.setUTCHours(0, 0, 0, 0);
          return d.toISOString().slice(0, 10);
        })
      );
      let streak = 0;
      const cursor = new Date();
      cursor.setUTCHours(0, 0, 0, 0);
      while (dayKeys.has(cursor.toISOString().slice(0, 10))) {
        streak += 1;
        cursor.setUTCDate(cursor.getUTCDate() - 1);
      }

      // ── Weekly rollup (last 4 weeks) using half-open buckets [start, end). ─
      // `end` is exclusive so events on the bucket's last day are fully counted.
      const weekly: Array<{ weekStart: string; sessions: number; minutes: number; prayers: number }> = [];
      const todayMidnight = new Date();
      todayMidnight.setUTCHours(0, 0, 0, 0);
      for (let i = 3; i >= 0; i--) {
        const end = new Date(todayMidnight);
        end.setUTCDate(end.getUTCDate() - i * 7 + 1); // exclusive upper bound
        const start = new Date(end);
        start.setUTCDate(start.getUTCDate() - 7);

        const weekSessions = sessionsRows.filter((s) => {
          const d = new Date(s.completedAt as unknown as string);
          return d >= start && d < end;
        });
        const weekPrayers = prayersRows.filter((p) => {
          const d = new Date(p.createdAt as unknown as string);
          return d >= start && d < end;
        });
        weekly.push({
          weekStart: start.toISOString().slice(0, 10),
          sessions: weekSessions.length,
          minutes: Math.round(weekSessions.reduce((a, s) => a + (s.durationSec || 0), 0) / 60),
          prayers: weekPrayers.length,
        });
      }

      // ── Behaviour pattern: which weekday do you tend to log gratitude? ────
      const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      const gratitudeByDow = new Array(7).fill(0) as number[];
      for (const p of prayersRows) {
        const d = new Date(p.createdAt as unknown as string);
        gratitudeByDow[d.getUTCDay()] += 1;
      }
      const peakDowIdx = gratitudeByDow.indexOf(Math.max(...gratitudeByDow));
      const gratitudePattern = prayersRows.length > 0 && gratitudeByDow[peakDowIdx] > 0
        ? `${dayNames[peakDowIdx]}s are your most reflective day (${gratitudeByDow[peakDowIdx]} entries).`
        : null;

      // ── Astrology heads-up: any planet currently retrograde ──────────────
      const transitsNow = currentTransits(new Date());
      const retrogradesNow = transitsNow
        .filter((t) => t.retrograde && !["Sun", "Moon"].includes(t.planet))
        .map((t) => ({ planet: t.planet, sign: t.sign }));

      res.json({
        windowDays: 30,
        sessionCount: sessionsRows.length,
        totalMinutes,
        prayerCount: prayersRows.length,
        sharedPrayerCount: prayersRows.filter((p) => p.shareCollective).length,
        currentStreakDays: streak,
        moodCorrelation: {
          samples: withPulses.length,
          avgMoodDelta,
        },
        weekly,
        insights: {
          gratitudePattern,
          retrogrades: retrogradesNow,
        },
      });
    } catch (err) {
      console.error("[spiritual] /api/spiritual/summary error:", err);
      res.status(500).json({ error: "Failed to load summary" });
    }
  });
}
