/**
 * Wearable + Screen Time Manager.
 *
 * Apple Health and Screen Time ship end-to-end via export ingest (Apple has
 * no public web API). Whoop/Oura/Garmin expose OAuth scaffolding so the
 * follow-up tasks can plug in real provider pulls without reshaping the
 * surface area.
 */
import type { Express, Request, Response, NextFunction } from "express";
import multer from "multer";
import { z } from "zod";
import { sql, eq, and, desc, gte, lte, inArray } from "drizzle-orm";
import { randomBytes } from "crypto";
import sax from "sax";
import yauzl from "yauzl";
import { db } from "../db";
import { storage } from "../storage";
import {
  wearableDevices,
  wearableData,
  wearableSyncJobs,
  screenTimeUsage,
  wearableSourceEnum,
  type WearableSource,
} from "@shared/schema";
import { encryptSecret } from "./_encryption";

const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  if (!req.session.userId) return res.status(401).json({ error: "Unauthorized" });
  next();
};

const SOURCE_META: Record<WearableSource, {
  label: string;
  category: "health" | "screen_time";
  ingestKind: "export" | "oauth";
  description: string;
  envKeys?: string[];
}> = {
  apple_health: {
    label: "Apple Health",
    category: "health",
    ingestKind: "export",
    description: "Upload your iPhone Health export (export.xml or the .zip).",
  },
  screen_time: {
    label: "Screen Time",
    category: "screen_time",
    ingestKind: "export",
    description: "Paste a Screen Time JSON/CSV export from the Shortcuts app.",
  },
  whoop: {
    label: "Whoop",
    category: "health",
    ingestKind: "oauth",
    description: "Sign in to Whoop to sync recovery, strain and sleep.",
    envKeys: ["WHOOP_CLIENT_ID", "WHOOP_CLIENT_SECRET"],
  },
  oura: {
    label: "Oura",
    category: "health",
    ingestKind: "oauth",
    description: "Sign in to Oura to sync HRV, sleep and readiness.",
    envKeys: ["OURA_CLIENT_ID", "OURA_CLIENT_SECRET"],
  },
  garmin: {
    label: "Garmin",
    category: "health",
    ingestKind: "oauth",
    description: "Sign in to Garmin Connect to sync activity and HRV.",
    envKeys: ["GARMIN_CONSUMER_KEY", "GARMIN_CONSUMER_SECRET"],
  },
};

function isWearableSource(s: string): s is WearableSource {
  return (wearableSourceEnum as readonly string[]).includes(s);
}

function envConfigured(source: WearableSource): boolean {
  const keys = SOURCE_META[source].envKeys;
  if (!keys || keys.length === 0) return true;
  return keys.every((k) => !!process.env[k]);
}

async function getOrCreateDevice(userId: string, source: WearableSource) {
  const existing = await db
    .select()
    .from(wearableDevices)
    .where(and(eq(wearableDevices.userId, userId), eq(wearableDevices.source, source)))
    .limit(1);
  if (existing[0]) return existing[0];
  const [created] = await db
    .insert(wearableDevices)
    .values({
      userId,
      source,
      deviceType: SOURCE_META[source].category === "screen_time" ? "screen-time" : "fitness-tracker",
      deviceName: SOURCE_META[source].label,
      manufacturer: SOURCE_META[source].label,
      isActive: true,
    })
    .returning();
  return created;
}

async function upsertSyncJob(userId: string, source: WearableSource, patch: {
  status: string;
  lastSyncAt?: Date | null;
  errorText?: string | null;
  recordsImported?: number;
}) {
  const existing = await db
    .select()
    .from(wearableSyncJobs)
    .where(and(eq(wearableSyncJobs.userId, userId), eq(wearableSyncJobs.source, source)))
    .limit(1);
  if (existing[0]) {
    const [updated] = await db
      .update(wearableSyncJobs)
      .set({ ...patch, updatedAt: new Date() })
      .where(eq(wearableSyncJobs.id, existing[0].id))
      .returning();
    return updated;
  }
  const [created] = await db
    .insert(wearableSyncJobs)
    .values({ userId, source, ...patch })
    .returning();
  return created;
}

// ── Apple Health export.xml streaming parser ─────────────────────────────────
//
// Apple Health exports records like:
//   <Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-04-20 09:12:00 -0700"
//           endDate="2026-04-20 09:13:00 -0700" value="42" sourceName="Apple Watch" />
// Sleep is HKCategoryTypeIdentifierSleepAnalysis with value being the sleep stage.

const HK_TYPE_TO_METRIC: Record<string, string> = {
  HKQuantityTypeIdentifierStepCount: "steps",
  HKQuantityTypeIdentifierHeartRate: "heart_rate",
  HKQuantityTypeIdentifierRestingHeartRate: "resting_hr",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN: "hrv",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active_energy",
  HKCategoryTypeIdentifierSleepAnalysis: "sleep_minutes",
};

interface ParsedHKRecord {
  metricKind: string;
  value: number;
  recordedAt: Date;
  sourceRecordId: string;
}

// Apple's exporter writes dates like "2026-04-20 09:12:00 -0700".
// `new Date(...)` can't handle that natively in Node, so we convert it to a
// proper ISO 8601 string ("2026-04-20T09:12:00-07:00") before parsing.
const APPLE_DATE_RE = /^(\d{4}-\d{2}-\d{2})\s+(\d{2}:\d{2}:\d{2})\s*([+-]\d{2})(\d{2})$/;
export function parseAppleDate(raw: string | undefined | null): Date | null {
  if (!raw) return null;
  const m = raw.trim().match(APPLE_DATE_RE);
  if (m) {
    const iso = `${m[1]}T${m[2]}${m[3]}:${m[4]}`;
    const d = new Date(iso);
    return isNaN(d.getTime()) ? null : d;
  }
  // Fall back: ISO-ish strings (e.g. already 2026-04-20T09:12:00Z).
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function parseAppleHealthXml(xml: string): ParsedHKRecord[] {
  const out: ParsedHKRecord[] = [];
  const parser = sax.parser(false, { lowercase: false, trim: true });
  parser.onopentag = (node) => {
    if (node.name !== "Record") return;
    const attrs = node.attributes;
    const hkType = attrs.type;
    const metricKind = HK_TYPE_TO_METRIC[hkType];
    if (!metricKind) return;
    const startDate = attrs.startDate;
    const endDate = attrs.endDate || startDate;
    const rawValue = attrs.value;
    const recordedAt = parseAppleDate(startDate);
    if (!recordedAt) return;
    let value = Number(rawValue);
    // Sleep: value is a stage label; use minutes between start and end.
    if (metricKind === "sleep_minutes") {
      const start = parseAppleDate(startDate);
      const end = parseAppleDate(endDate);
      if (!start || !end || end.getTime() <= start.getTime()) return;
      // Only count "asleep" stages, not in-bed.
      if (rawValue && /InBed/i.test(rawValue)) return;
      value = Math.round((end.getTime() - start.getTime()) / 60000);
    }
    if (!isFinite(value)) return;
    const sourceRecordId = `${hkType}|${startDate}|${endDate}|${rawValue}`;
    out.push({ metricKind, value, recordedAt, sourceRecordId });
  };
  parser.write(xml).close();
  return out;
}

// Extract export.xml from an Apple Health export.zip buffer.
// Uses yauzl streaming to avoid materialising the whole archive.
async function extractAppleHealthXmlFromZip(buf: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    yauzl.fromBuffer(buf, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err ?? new Error("Invalid zip"));
      let found = false;
      zipfile.on("entry", (entry) => {
        // Apple's archive contains "apple_health_export/export.xml".
        if (/(^|\/)export\.xml$/i.test(entry.fileName) && !found) {
          found = true;
          zipfile.openReadStream(entry, (e, stream) => {
            if (e || !stream) return reject(e ?? new Error("Failed to open export.xml in zip"));
            const chunks: Buffer[] = [];
            stream.on("data", (c: Buffer) => chunks.push(c));
            stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
            stream.on("error", reject);
          });
        } else {
          zipfile.readEntry();
        }
      });
      zipfile.on("end", () => {
        if (!found) reject(new Error("export.xml not found inside the Apple Health zip"));
      });
      zipfile.on("error", reject);
      zipfile.readEntry();
    });
  });
}

async function bulkUpsertHealthRecords(
  userId: string,
  deviceId: string,
  records: ParsedHKRecord[],
): Promise<number> {
  if (records.length === 0) return 0;
  // Insert in batches with onConflictDoNothing on the (userId, source, sourceRecordId) index.
  const BATCH = 500;
  let inserted = 0;
  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);
    const result = await db
      .insert(wearableData)
      .values(
        slice.map((r) => ({
          deviceId,
          userId,
          source: "apple_health" as const,
          sourceRecordId: r.sourceRecordId,
          metricKind: r.metricKind,
          metricValue: r.value,
          recordedAt: r.recordedAt,
          timestamp: r.recordedAt,
        })),
      )
      .onConflictDoNothing()
      .returning({ id: wearableData.id });
    inserted += result.length;
  }
  return inserted;
}

// ── Screen Time ingest ───────────────────────────────────────────────────────

const screenTimeImportSchema = z.object({
  // Either a single day or an array. Each day has dateKey + breakdown.
  days: z.array(z.object({
    dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    totalMinutes: z.number().int().nonnegative(),
    byCategory: z.record(z.string(), z.number().nonnegative()).optional(),
    byApp: z.record(z.string(), z.number().nonnegative()).optional(),
  })).max(370),
});

function parseScreenTimePayload(raw: string | object): z.infer<typeof screenTimeImportSchema> {
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const candidate = "days" in obj ? obj : { days: Array.isArray(raw) ? raw : [raw] };
    return screenTimeImportSchema.parse(candidate);
  }
  const text = String(raw).trim();
  // Try JSON first.
  if (text.startsWith("{") || text.startsWith("[")) {
    const parsed = JSON.parse(text);
    const candidate = Array.isArray(parsed) ? { days: parsed } : ("days" in parsed ? parsed : { days: [parsed] });
    return screenTimeImportSchema.parse(candidate);
  }
  // CSV fallback: header row, then date,total_minutes,category_a,category_b,...
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) throw new Error("CSV needs a header row and at least one data row");
  const header = lines[0].split(",").map((h) => h.trim());
  const dateIdx = header.findIndex((h) => /^date(_key)?$/i.test(h));
  const totalIdx = header.findIndex((h) => /^(total|total_minutes|minutes)$/i.test(h));
  if (dateIdx < 0 || totalIdx < 0) throw new Error("CSV must include a date and total_minutes column");
  const days = lines.slice(1).map((line) => {
    const cols = line.split(",").map((c) => c.trim());
    const byCategory: Record<string, number> = {};
    header.forEach((h, i) => {
      if (i === dateIdx || i === totalIdx) return;
      const n = Number(cols[i]);
      if (isFinite(n) && n > 0) byCategory[h] = n;
    });
    return {
      dateKey: cols[dateIdx],
      totalMinutes: Math.round(Number(cols[totalIdx]) || 0),
      byCategory,
    };
  });
  return screenTimeImportSchema.parse({ days });
}

async function upsertScreenTimeDays(userId: string, days: z.infer<typeof screenTimeImportSchema>["days"]): Promise<number> {
  if (days.length === 0) return 0;
  const result = await db
    .insert(screenTimeUsage)
    .values(
      days.map((d) => ({
        userId,
        source: "screen_time" as const,
        dateKey: d.dateKey,
        totalMinutes: d.totalMinutes,
        byCategory: d.byCategory ?? {},
        byApp: d.byApp ?? {},
      })),
    )
    .onConflictDoUpdate({
      target: [screenTimeUsage.userId, screenTimeUsage.dateKey, screenTimeUsage.source],
      set: {
        totalMinutes: sql`EXCLUDED.total_minutes`,
        byCategory: sql`EXCLUDED.by_category`,
        byApp: sql`EXCLUDED.by_app`,
      },
    })
    .returning({ id: screenTimeUsage.id });
  return result.length;
}

// ── Routes ───────────────────────────────────────────────────────────────────

// Apple Health exports can be tens of MB. We bound to 50 MB to keep
// memory usage predictable; the import handler also rejects parsed
// record counts beyond MAX_IMPORT_RECORDS.
const APPLE_HEALTH_MAX_BYTES = 50 * 1024 * 1024;
const MAX_IMPORT_RECORDS = 200_000;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: APPLE_HEALTH_MAX_BYTES },
});

export function registerWearablesRoutes(app: Express): void {
  // GET /api/wearables/sources — list of supported sources + connection state.
  app.get("/api/wearables/sources", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const [devices, jobs] = await Promise.all([
        db.select().from(wearableDevices).where(eq(wearableDevices.userId, userId)),
        db.select().from(wearableSyncJobs).where(eq(wearableSyncJobs.userId, userId)),
      ]);
      const deviceBySource = new Map(devices.filter((d) => d.source).map((d) => [d.source!, d]));
      const jobBySource = new Map(jobs.map((j) => [j.source, j]));
      const sources = (wearableSourceEnum as readonly WearableSource[]).map((s) => {
        const meta = SOURCE_META[s];
        const device = deviceBySource.get(s);
        const job = jobBySource.get(s);
        const configured = envConfigured(s);
        return {
          source: s,
          label: meta.label,
          category: meta.category,
          ingestKind: meta.ingestKind,
          description: meta.description,
          configured,
          connected: !!device?.isActive,
          lastSyncAt: job?.lastSyncAt ?? device?.lastSyncedAt ?? null,
          status: !configured ? "not_configured" : (job?.status ?? (device ? "idle" : "disconnected")),
          errorText: job?.errorText ?? null,
          recordsImported: job?.recordsImported ?? 0,
        };
      });
      res.json({ sources });
    } catch (err) {
      console.error("/api/wearables/sources", err);
      res.status(500).json({ error: "Failed to list wearable sources" });
    }
  });

  // POST /api/wearables/connect/:source — for export-based sources, creates a
  // device row and marks it active. OAuth sources return the auth URL.
  app.post("/api/wearables/connect/:source", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const source = req.params.source;
    if (!isWearableSource(source)) return res.status(400).json({ error: "Unknown source" });
    const meta = SOURCE_META[source];
    if (meta.ingestKind === "oauth") {
      if (!envConfigured(source)) {
        await upsertSyncJob(userId, source, { status: "not_configured", errorText: `Missing env: ${meta.envKeys?.join(", ")}` });
        return res.status(400).json({ error: "not_configured", missing: meta.envKeys });
      }
      return res.json({ authUrl: `/api/wearables/${source}/auth` });
    }
    const device = await getOrCreateDevice(userId, source);
    await db.update(wearableDevices).set({ isActive: true }).where(eq(wearableDevices.id, device.id));
    await upsertSyncJob(userId, source, { status: "idle" });
    res.json({ ok: true, deviceId: device.id });
  });

  // POST /api/wearables/disconnect/:source — soft-disconnect, keep history.
  app.post("/api/wearables/disconnect/:source", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const source = req.params.source;
    if (!isWearableSource(source)) return res.status(400).json({ error: "Unknown source" });
    await db
      .update(wearableDevices)
      .set({ isActive: false, accessTokenEnc: null, refreshTokenEnc: null, tokenExpiresAt: null })
      .where(and(eq(wearableDevices.userId, userId), eq(wearableDevices.source, source)));
    await upsertSyncJob(userId, source, { status: "idle" });
    res.json({ ok: true });
  });

  // GET /api/wearables/data?source=&metric=&days=
  app.get("/api/wearables/data", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const source = req.query.source as string | undefined;
      const metric = req.query.metric as string | undefined;
      const days = Math.max(1, Math.min(365, Number(req.query.days) || 30));
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const conds = [eq(wearableData.userId, userId), gte(wearableData.recordedAt, since)];
      if (source) conds.push(eq(wearableData.source, source));
      if (metric) conds.push(eq(wearableData.metricKind, metric));

      const rows = await db
        .select()
        .from(wearableData)
        .where(and(...conds))
        .orderBy(desc(wearableData.recordedAt))
        .limit(2000);

      // Also pull screen time usage for the same date window.
      const sinceDateKey = since.toISOString().slice(0, 10);
      const screenTime = await db
        .select()
        .from(screenTimeUsage)
        .where(
          and(
            eq(screenTimeUsage.userId, userId),
            gte(screenTimeUsage.dateKey, sinceDateKey),
          ),
        )
        .orderBy(desc(screenTimeUsage.dateKey))
        .limit(days);

      // Build a small "yesterday's category breakdown" insight, e.g. for
       // surfacing "you spent 3h12m on Social yesterday" on the dashboard.
       // We look up the row by an explicit yesterday dateKey so the label
       // is accurate even if the latest screen-time row is stale.
      const yesterdayKey = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const yesterday = screenTime.find((r) => r.dateKey === yesterdayKey) ?? null;
       const yesterdayCategories: Array<{ name: string; minutes: number }> = yesterday
         ? Object.entries((yesterday.byCategory as Record<string, number> | null) ?? {})
             .map(([name, minutes]) => ({ name, minutes: Number(minutes) || 0 }))
             .filter((c) => c.minutes > 0)
             .sort((a, b) => b.minutes - a.minutes)
             .slice(0, 5)
         : [];

       res.json({
         data: rows,
         screenTime,
         insights: yesterday
           ? {
               yesterday: {
                 dateKey: yesterday.dateKey,
                 totalMinutes: yesterday.totalMinutes,
                 topCategory: yesterdayCategories[0] ?? null,
                 topCategories: yesterdayCategories,
               },
             }
           : null,
       });
    } catch (err) {
      console.error("/api/wearables/data", err);
      res.status(500).json({ error: "Failed to load wearable data" });
    }
  });

  // POST /api/wearables/sync/:source — manual sync trigger.
  // Apple Health/Screen Time return a hint to use the export endpoints.
  // OAuth sources call into stubbed provider pulls (TODO in follow-ups).
  app.post("/api/wearables/sync/:source", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const source = req.params.source;
    if (!isWearableSource(source)) return res.status(400).json({ error: "Unknown source" });
    const meta = SOURCE_META[source];
    if (meta.ingestKind === "export") {
      return res.json({
        ok: true,
        hint: source === "apple_health"
          ? "Upload your Apple Health export at /api/wearables/apple-health/import"
          : "Paste your Screen Time export at /api/wearables/screen-time/import",
      });
    }
    if (!envConfigured(source)) {
      await upsertSyncJob(userId, source, { status: "not_configured", errorText: `Missing env: ${meta.envKeys?.join(", ")}` });
      return res.status(400).json({ error: "not_configured", missing: meta.envKeys });
    }
    // TODO (follow-up tasks): call provider data-pull functions per source.
    await upsertSyncJob(userId, source, { status: "idle", lastSyncAt: new Date(), errorText: null });
    res.json({ ok: true, note: `Provider pull for ${source} is stubbed; follow-up task wires the live API.` });
  });

  // POST /api/wearables/apple-health/import — multipart upload of export.xml or .zip.
  app.post(
    "/api/wearables/apple-health/import",
    requireAuth,
    upload.single("file"),
    async (req, res) => {
      const userId = req.session.userId!;
      try {
        const file = req.file;
        let xml: string | undefined;
        if (file) {
          const isZip =
            file.originalname.toLowerCase().endsWith(".zip") ||
            file.mimetype === "application/zip" ||
            (file.buffer.length >= 2 && file.buffer[0] === 0x50 && file.buffer[1] === 0x4b);
          if (isZip) {
            xml = await extractAppleHealthXmlFromZip(file.buffer);
          } else {
            xml = file.buffer.toString("utf8");
          }
        } else if (typeof req.body?.xml === "string") {
          xml = req.body.xml;
        }
        if (!xml || xml.length < 50) {
          return res.status(400).json({ error: "Missing Apple Health export. Upload export.xml as 'file'." });
        }
        await upsertSyncJob(userId, "apple_health", { status: "running" });
        const records = parseAppleHealthXml(xml).slice(0, MAX_IMPORT_RECORDS);
        const device = await getOrCreateDevice(userId, "apple_health");
        const inserted = await bulkUpsertHealthRecords(userId, device.id, records);
        await db.update(wearableDevices).set({ lastSyncedAt: new Date(), isActive: true }).where(eq(wearableDevices.id, device.id));
        await upsertSyncJob(userId, "apple_health", {
          status: "success",
          lastSyncAt: new Date(),
          errorText: null,
          recordsImported: inserted,
        });
        res.json({ ok: true, parsed: records.length, inserted });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error("apple-health/import", err);
        await upsertSyncJob(userId, "apple_health", { status: "error", errorText: msg });
        res.status(500).json({ error: "Failed to parse Apple Health export", detail: msg });
      }
    },
  );

  // POST /api/wearables/screen-time/import — JSON or CSV body / pasted text.
  app.post("/api/wearables/screen-time/import", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    try {
      const raw = typeof req.body === "string" ? req.body
        : typeof req.body?.text === "string" ? req.body.text
        : req.body;
      if (!raw) return res.status(400).json({ error: "Missing Screen Time payload (json, csv, or { days: [...] })" });
      const parsed = parseScreenTimePayload(raw);
      await upsertSyncJob(userId, "screen_time", { status: "running" });
      const inserted = await upsertScreenTimeDays(userId, parsed.days);
      const device = await getOrCreateDevice(userId, "screen_time");
      await db.update(wearableDevices).set({ lastSyncedAt: new Date(), isActive: true }).where(eq(wearableDevices.id, device.id));
      await upsertSyncJob(userId, "screen_time", {
        status: "success",
        lastSyncAt: new Date(),
        errorText: null,
        recordsImported: inserted,
      });
      res.json({ ok: true, days: parsed.days.length, inserted });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("screen-time/import", err);
      await upsertSyncJob(userId, "screen_time", { status: "error", errorText: msg });
      res.status(400).json({ error: "Failed to parse Screen Time payload", detail: msg });
    }
  });

  // ── OAuth scaffold for Whoop / Oura / Garmin ──────────────────────────────
  // These endpoints handle the auth-redirect side end-to-end (state persisted
  // in the session, real provider URL constructed). The token exchange in
  // /callback is left as a follow-up because each provider has its own
  // request shape and response handling.
  app.get("/api/wearables/:source/auth", requireAuth, (req, res) => {
    const source = req.params.source;
    if (!isWearableSource(source) || SOURCE_META[source].ingestKind !== "oauth") {
      return res.status(400).json({ error: "Unsupported OAuth source" });
    }
    if (!envConfigured(source)) {
      return res.status(400).json({ error: "not_configured", missing: SOURCE_META[source].envKeys });
    }
    // Generate + persist a state nonce; verified back in the callback.
    const state = randomBytes(16).toString("hex");
    (req.session as unknown as Record<string, unknown>).wearableOauth = { source, state, ts: Date.now() };
    const base = process.env.OAUTH_REDIRECT_BASE_URL || `${req.protocol}://${req.get("host")}`;
    const redirectUri = `${base}/api/wearables/${source}/callback`;
    let authUrl: string;
    if (source === "whoop") {
      const u = new URL("https://api.prod.whoop.com/oauth/oauth2/auth");
      u.searchParams.set("response_type", "code");
      u.searchParams.set("client_id", process.env.WHOOP_CLIENT_ID!);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("scope", "read:recovery read:sleep read:workout read:profile offline");
      u.searchParams.set("state", state);
      authUrl = u.toString();
    } else if (source === "oura") {
      const u = new URL("https://cloud.ouraring.com/oauth/authorize");
      u.searchParams.set("response_type", "code");
      u.searchParams.set("client_id", process.env.OURA_CLIENT_ID!);
      u.searchParams.set("redirect_uri", redirectUri);
      u.searchParams.set("scope", "daily heartrate workout session");
      u.searchParams.set("state", state);
      authUrl = u.toString();
    } else if (source === "garmin") {
      // Garmin Connect uses OAuth 1.0a — full request-token dance is wired
      // in the follow-up task. Send the user to the Garmin Connect sign-in
      // landing page so they at least see the provider in flight.
      authUrl = `https://connect.garmin.com/oauthConfirm?oauth_callback=${encodeURIComponent(redirectUri)}`;
    } else {
      return res.status(400).json({ error: "Unsupported OAuth source" });
    }
    res.redirect(authUrl);
  });

  app.get("/api/wearables/:source/callback", requireAuth, async (req, res) => {
    const userId = req.session.userId!;
    const source = req.params.source;
    if (!isWearableSource(source) || SOURCE_META[source].ingestKind !== "oauth") {
      return res.status(400).json({ error: "Unsupported OAuth source" });
    }
    const code = (req.query.code as string | undefined) ?? "";
    const stateFromProvider = (req.query.state as string | undefined) ?? "";
    const sess = (req.session as unknown as Record<string, unknown>).wearableOauth as
      | { source: WearableSource; state: string; ts: number }
      | undefined;

    // CSRF: require the state nonce to round-trip and to match the source we
    // started the flow for. Garmin (OAuth1) won't include `state`, so it's
    // exempt from the equality check but we still wipe the session entry.
    if (!sess || sess.source !== source) {
      return res.status(400).json({ error: "Invalid OAuth state (no in-flight session)" });
    }
    if (source !== "garmin" && sess.state !== stateFromProvider) {
      return res.status(400).json({ error: "Invalid OAuth state (mismatch)" });
    }
    delete (req.session as unknown as Record<string, unknown>).wearableOauth;

    if (!code && source !== "garmin") return res.status(400).json({ error: "Missing code" });
    if (!envConfigured(source)) {
      return res.status(400).json({ error: "not_configured", missing: SOURCE_META[source].envKeys });
    }

    // The provider-specific token-exchange request lives in the follow-up task
    // (#82). Until then we persist a placeholder under encryption so the
    // device row reflects an in-progress connection and we can prove the
    // encryption + redirect handshake works end-to-end.
    const device = await getOrCreateDevice(userId, source);
    const placeholder = `pending:${source}:${randomBytes(8).toString("hex")}`;
    await db
      .update(wearableDevices)
      .set({
        isActive: true,
        accessTokenEnc: encryptSecret(placeholder),
        refreshTokenEnc: null,
        tokenExpiresAt: null,
        lastSyncedAt: new Date(),
      })
      .where(eq(wearableDevices.id, device.id));
    await upsertSyncJob(userId, source, {
      status: "idle",
      errorText: "Token exchange pending — provider data pull is wired in follow-up task",
    });

    // Send the user back to the manager UI so they see the new "Connected" badge.
    res.redirect(`/wearable-manager?connected=${source}`);
  });
}

// ── Mood correlation factors ────────────────────────────────────────────────
// Surfaced in /api/summary so DW can answer "what's affecting my mood?" with
// real signals from the wearable + Screen Time pipeline.
export interface MoodFactor {
  key: string;
  label: string;
  impact: number; // -100..+100 (negative = mood-suppressing)
  detail: string;
}

export async function getMoodCorrelationFactors(
  userId: string,
  days: number = 14,
): Promise<{ factors: MoodFactor[]; sampleSize: number }> {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const sinceDateKey = since.toISOString().slice(0, 10);

  const [moodLogs, sleepRows, screenRows] = await Promise.all([
    storage.getMoodLogs(userId),
    db
      .select()
      .from(wearableData)
      .where(
        and(
          eq(wearableData.userId, userId),
          eq(wearableData.metricKind, "sleep_minutes"),
          gte(wearableData.recordedAt, since),
        ),
      ),
    db
      .select()
      .from(screenTimeUsage)
      .where(and(eq(screenTimeUsage.userId, userId), gte(screenTimeUsage.dateKey, sinceDateKey))),
  ]);

  const recentMoods = moodLogs.filter((m) => m.createdAt && new Date(m.createdAt) >= since);
  const factors: MoodFactor[] = [];
  if (recentMoods.length === 0) return { factors, sampleSize: 0 };

  // Group sleep minutes by the date the user woke up (recordedAt date).
  const sleepByDay = new Map<string, number>();
  for (const r of sleepRows) {
    if (!r.recordedAt) continue;
    const k = new Date(r.recordedAt).toISOString().slice(0, 10);
    sleepByDay.set(k, (sleepByDay.get(k) ?? 0) + (r.metricValue ?? 0));
  }
  const screenByDay = new Map<string, number>();
  for (const r of screenRows) screenByDay.set(r.dateKey, r.totalMinutes ?? 0);

  // Bucket each mood log's day into low/high sleep + screen time, then compare
  // average mood across buckets. Impact = round((bucketAvg - overallAvg) * 10).
  const moodByDay = new Map<string, number[]>();
  for (const m of recentMoods) {
    if (!m.createdAt || m.moodLevel == null) continue;
    const k = new Date(m.createdAt).toISOString().slice(0, 10);
    const arr = moodByDay.get(k) ?? [];
    arr.push(m.moodLevel);
    moodByDay.set(k, arr);
  }
  const dayAvg = (arr: number[]) => arr.reduce((s, x) => s + x, 0) / Math.max(arr.length, 1);
  const overallMood = dayAvg(recentMoods.map((m) => m.moodLevel ?? 0));

  // Sleep factor — compare days with <6h sleep vs days with ≥7h.
  if (sleepByDay.size >= 3) {
    const lowDays: number[] = [], highDays: number[] = [];
    for (const [day, mins] of Array.from(sleepByDay.entries())) {
      const moods = moodByDay.get(day);
      if (!moods || moods.length === 0) continue;
      if (mins < 6 * 60) lowDays.push(dayAvg(moods));
      else if (mins >= 7 * 60) highDays.push(dayAvg(moods));
    }
    if (lowDays.length > 0) {
      const delta = dayAvg(lowDays) - overallMood;
      factors.push({
        key: "sleep_low",
        label: "Short sleep (<6h)",
        impact: Math.round(delta * 10),
        detail: `${lowDays.length} day(s) of short sleep averaged mood ${dayAvg(lowDays).toFixed(1)} vs ${overallMood.toFixed(1)} overall.`,
      });
    }
    if (highDays.length > 0) {
      const delta = dayAvg(highDays) - overallMood;
      factors.push({
        key: "sleep_high",
        label: "Solid sleep (≥7h)",
        impact: Math.round(delta * 10),
        detail: `${highDays.length} day(s) of solid sleep averaged mood ${dayAvg(highDays).toFixed(1)} vs ${overallMood.toFixed(1)} overall.`,
      });
    }
  }

  // Screen-time factor — compare days >4h screen time vs ≤2h.
  if (screenByDay.size >= 3) {
    const heavy: number[] = [], light: number[] = [];
    for (const [day, mins] of Array.from(screenByDay.entries())) {
      const moods = moodByDay.get(day);
      if (!moods || moods.length === 0) continue;
      if (mins > 240) heavy.push(dayAvg(moods));
      else if (mins <= 120) light.push(dayAvg(moods));
    }
    if (heavy.length > 0) {
      const delta = dayAvg(heavy) - overallMood;
      factors.push({
        key: "screen_high",
        label: "Heavy screen time (>4h)",
        impact: Math.round(delta * 10),
        detail: `${heavy.length} day(s) over 4h screen time averaged mood ${dayAvg(heavy).toFixed(1)} vs ${overallMood.toFixed(1)} overall.`,
      });
    }
    if (light.length > 0) {
      const delta = dayAvg(light) - overallMood;
      factors.push({
        key: "screen_low",
        label: "Low screen time (≤2h)",
        impact: Math.round(delta * 10),
        detail: `${light.length} day(s) under 2h screen time averaged mood ${dayAvg(light).toFixed(1)} vs ${overallMood.toFixed(1)} overall.`,
      });
    }
  }

  return { factors, sampleSize: recentMoods.length };
}

// Used by the chat-context builder to surface yesterday's headline metrics.
export async function getYesterdayHeadlineMetrics(userId: string): Promise<{
  sleepMinutes?: number;
  hrv?: number;
  restingHr?: number;
  steps?: number;
  screenTimeMinutes?: number;
} | null> {
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since = new Date(yesterday);
  since.setHours(0, 0, 0, 0);
  const until = new Date(since);
  until.setHours(23, 59, 59, 999);
  const dateKey = since.toISOString().slice(0, 10);

  const [rows, st] = await Promise.all([
    db
      .select()
      .from(wearableData)
      .where(
        and(
          eq(wearableData.userId, userId),
          gte(wearableData.recordedAt, since),
          lte(wearableData.recordedAt, until),
          inArray(wearableData.metricKind, ["sleep_minutes", "hrv", "resting_hr", "steps"]),
        ),
      )
      .limit(1000),
    db
      .select()
      .from(screenTimeUsage)
      .where(and(eq(screenTimeUsage.userId, userId), eq(screenTimeUsage.dateKey, dateKey)))
      .limit(1),
  ]);

  if (rows.length === 0 && st.length === 0) return null;

  const sumByKind = (kind: string) =>
    rows.filter((r) => r.metricKind === kind).reduce((s, r) => s + (r.metricValue ?? 0), 0);
  const lastByKind = (kind: string) => {
    const pick = rows.filter((r) => r.metricKind === kind).sort((a, b) => (b.recordedAt!.getTime() - a.recordedAt!.getTime()))[0];
    return pick?.metricValue ?? undefined;
  };

  const out: {
    sleepMinutes?: number;
    hrv?: number;
    restingHr?: number;
    steps?: number;
    screenTimeMinutes?: number;
  } = {};
  const sleep = sumByKind("sleep_minutes");
  if (sleep > 0) out.sleepMinutes = Math.round(sleep);
  const steps = sumByKind("steps");
  if (steps > 0) out.steps = Math.round(steps);
  const hrv = lastByKind("hrv");
  if (hrv != null) out.hrv = Math.round(hrv);
  const restingHr = lastByKind("resting_hr");
  if (restingHr != null) out.restingHr = Math.round(restingHr);
  if (st[0]) out.screenTimeMinutes = st[0].totalMinutes;
  return out;
}
