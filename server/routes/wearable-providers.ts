/**
 * Live wearable provider integrations: Whoop (OAuth2), Oura (OAuth2), Garmin (OAuth1.0a).
 *
 * Each provider exports:
 *   - exchangeCode(...)  — token exchange after the user returns from the provider
 *   - refreshIfNeeded(...) — keeps OAuth2 access tokens fresh
 *   - syncRecent(...)    — pulls the last `days` days and returns parsed records
 *
 * The records returned are written through `wearable_data` by the route handler.
 * Dedup is enforced via `(userId, source, sourceRecordId)` so re-syncing a day is safe.
 */
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { wearableDevices, type WearableDevice } from "@shared/schema";
import { encryptSecret, decryptSecret } from "./_encryption";

export interface ProviderRecord {
  metricKind: string;
  value: number;
  recordedAt: Date;
  sourceRecordId: string;
}

export interface ProviderTokens {
  accessToken: string;
  refreshToken?: string | null;
  /** OAuth1: token secret (Garmin). Stored in refreshTokenEnc field. */
  tokenSecret?: string | null;
  expiresAt?: Date | null;
}

const WHOOP_TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const WHOOP_API_BASE = "https://api.prod.whoop.com/developer/v1";

const OURA_TOKEN_URL = "https://api.ouraring.com/oauth/token";
const OURA_API_BASE = "https://api.ouraring.com/v2/usercollection";

const GARMIN_REQUEST_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/request_token";
const GARMIN_ACCESS_TOKEN_URL = "https://connectapi.garmin.com/oauth-service/oauth/access_token";
const GARMIN_AUTHORIZE_URL = "https://connect.garmin.com/oauthConfirm";
const GARMIN_API_BASE = "https://apis.garmin.com/wellness-api/rest";

// ── Token persistence helpers ────────────────────────────────────────────────

export async function saveTokens(deviceId: string, tokens: ProviderTokens): Promise<void> {
  await db
    .update(wearableDevices)
    .set({
      accessTokenEnc: encryptSecret(tokens.accessToken),
      refreshTokenEnc: tokens.refreshToken
        ? encryptSecret(tokens.refreshToken)
        : tokens.tokenSecret
          ? encryptSecret(tokens.tokenSecret)
          : null,
      tokenExpiresAt: tokens.expiresAt ?? null,
      isActive: true,
    })
    .where(eq(wearableDevices.id, deviceId));
}

export function loadTokens(device: WearableDevice): ProviderTokens | null {
  if (!device.accessTokenEnc) return null;
  return {
    accessToken: decryptSecret(device.accessTokenEnc),
    refreshToken: device.refreshTokenEnc ? decryptSecret(device.refreshTokenEnc) : null,
    tokenSecret: device.refreshTokenEnc ? decryptSecret(device.refreshTokenEnc) : null,
    expiresAt: device.tokenExpiresAt ?? null,
  };
}

// ── Whoop ────────────────────────────────────────────────────────────────────

export async function whoopExchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token exchange failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

async function whoopRefresh(refreshToken: string): Promise<ProviderTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.WHOOP_CLIENT_ID!,
    client_secret: process.env.WHOOP_CLIENT_SECRET!,
    scope: "offline",
  });
  const res = await fetch(WHOOP_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Whoop token refresh failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

async function ensureFreshOAuth2(
  device: WearableDevice,
  refresh: (refreshToken: string) => Promise<ProviderTokens>,
): Promise<ProviderTokens> {
  const tokens = loadTokens(device);
  if (!tokens) throw new Error("Provider not connected (no access token)");
  const expiringSoon = tokens.expiresAt && tokens.expiresAt.getTime() - Date.now() < 60_000;
  if (expiringSoon && tokens.refreshToken) {
    const fresh = await refresh(tokens.refreshToken);
    await saveTokens(device.id, fresh);
    return fresh;
  }
  return tokens;
}

async function whoopAuthedFetch(token: string, url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Whoop ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

export async function whoopSyncRecent(device: WearableDevice, days: number): Promise<ProviderRecord[]> {
  const tokens = await ensureFreshOAuth2(device, whoopRefresh);
  const start = new Date(Date.now() - days * 86400_000).toISOString();
  const end = new Date().toISOString();
  const records: ProviderRecord[] = [];

  // Sleep
  const sleepUrl = `${WHOOP_API_BASE}/activity/sleep?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`;
  const sleep = (await whoopAuthedFetch(tokens.accessToken, sleepUrl)) as {
    records?: Array<{
      id: number | string;
      start: string;
      end: string;
      score?: { stage_summary?: { total_in_bed_time_milli?: number; total_awake_time_milli?: number } };
    }>;
  };
  for (const r of sleep.records ?? []) {
    const startMs = new Date(r.start).getTime();
    const endMs = new Date(r.end).getTime();
    if (!isFinite(startMs) || !isFinite(endMs) || endMs <= startMs) continue;
    const inBed = r.score?.stage_summary?.total_in_bed_time_milli ?? endMs - startMs;
    const awake = r.score?.stage_summary?.total_awake_time_milli ?? 0;
    const minutes = Math.max(0, Math.round((inBed - awake) / 60000));
    records.push({
      metricKind: "sleep_minutes",
      value: minutes,
      recordedAt: new Date(startMs),
      sourceRecordId: `whoop:sleep:${r.id}`,
    });
  }

  // Recovery (HRV + RHR + recovery score)
  const recoveryUrl = `${WHOOP_API_BASE}/recovery?start=${encodeURIComponent(start)}&end=${encodeURIComponent(end)}&limit=25`;
  const recovery = (await whoopAuthedFetch(tokens.accessToken, recoveryUrl)) as {
    records?: Array<{
      cycle_id: number | string;
      created_at: string;
      score?: { recovery_score?: number; hrv_rmssd_milli?: number; resting_heart_rate?: number };
    }>;
  };
  for (const r of recovery.records ?? []) {
    const at = new Date(r.created_at);
    if (isNaN(at.getTime())) continue;
    if (typeof r.score?.hrv_rmssd_milli === "number") {
      records.push({
        metricKind: "hrv",
        value: r.score.hrv_rmssd_milli,
        recordedAt: at,
        sourceRecordId: `whoop:hrv:${r.cycle_id}`,
      });
    }
    if (typeof r.score?.resting_heart_rate === "number") {
      records.push({
        metricKind: "resting_hr",
        value: r.score.resting_heart_rate,
        recordedAt: at,
        sourceRecordId: `whoop:rhr:${r.cycle_id}`,
      });
    }
    if (typeof r.score?.recovery_score === "number") {
      records.push({
        metricKind: "recovery_score",
        value: r.score.recovery_score,
        recordedAt: at,
        sourceRecordId: `whoop:recovery:${r.cycle_id}`,
      });
    }
  }

  return records;
}

// ── Oura ─────────────────────────────────────────────────────────────────────

export async function ouraExchangeCode(code: string, redirectUri: string): Promise<ProviderTokens> {
  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: redirectUri,
    client_id: process.env.OURA_CLIENT_ID!,
    client_secret: process.env.OURA_CLIENT_SECRET!,
  });
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Oura token exchange failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? null,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

async function ouraRefresh(refreshToken: string): Promise<ProviderTokens> {
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: process.env.OURA_CLIENT_ID!,
    client_secret: process.env.OURA_CLIENT_SECRET!,
  });
  const res = await fetch(OURA_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`Oura token refresh failed (${res.status}): ${await res.text()}`);
  const json = (await res.json()) as { access_token: string; refresh_token?: string; expires_in?: number };
  return {
    accessToken: json.access_token,
    refreshToken: json.refresh_token ?? refreshToken,
    expiresAt: json.expires_in ? new Date(Date.now() + json.expires_in * 1000) : null,
  };
}

async function ouraAuthedFetch(token: string, url: string): Promise<unknown> {
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) throw new Error(`Oura ${url} → ${res.status} ${await res.text()}`);
  return res.json();
}

export async function ouraSyncRecent(device: WearableDevice, days: number): Promise<ProviderRecord[]> {
  const tokens = await ensureFreshOAuth2(device, ouraRefresh);
  const startDate = new Date(Date.now() - days * 86400_000).toISOString().slice(0, 10);
  const endDate = new Date().toISOString().slice(0, 10);
  const records: ProviderRecord[] = [];

  // Sleep periods → sleep_minutes, hrv, resting hr
  const sleepUrl = `${OURA_API_BASE}/sleep?start_date=${startDate}&end_date=${endDate}`;
  const sleep = (await ouraAuthedFetch(tokens.accessToken, sleepUrl)) as {
    data?: Array<{
      id: string;
      bedtime_start?: string;
      total_sleep_duration?: number; // seconds
      average_hrv?: number | null;
      average_heart_rate?: number | null;
      lowest_heart_rate?: number | null;
    }>;
  };
  for (const s of sleep.data ?? []) {
    const at = s.bedtime_start ? new Date(s.bedtime_start) : null;
    if (!at || isNaN(at.getTime())) continue;
    if (typeof s.total_sleep_duration === "number") {
      records.push({
        metricKind: "sleep_minutes",
        value: Math.round(s.total_sleep_duration / 60),
        recordedAt: at,
        sourceRecordId: `oura:sleep:${s.id}`,
      });
    }
    if (typeof s.average_hrv === "number") {
      records.push({
        metricKind: "hrv",
        value: s.average_hrv,
        recordedAt: at,
        sourceRecordId: `oura:hrv:${s.id}`,
      });
    }
    if (typeof s.lowest_heart_rate === "number") {
      records.push({
        metricKind: "resting_hr",
        value: s.lowest_heart_rate,
        recordedAt: at,
        sourceRecordId: `oura:rhr:${s.id}`,
      });
    }
  }

  // Daily readiness → readiness score
  const readinessUrl = `${OURA_API_BASE}/daily_readiness?start_date=${startDate}&end_date=${endDate}`;
  try {
    const readiness = (await ouraAuthedFetch(tokens.accessToken, readinessUrl)) as {
      data?: Array<{ id: string; day: string; score?: number | null }>;
    };
    for (const r of readiness.data ?? []) {
      if (typeof r.score !== "number") continue;
      records.push({
        metricKind: "readiness_score",
        value: r.score,
        recordedAt: new Date(`${r.day}T00:00:00Z`),
        sourceRecordId: `oura:readiness:${r.id}`,
      });
    }
  } catch {
    // Readiness is optional — older accounts may not expose it.
  }

  // Daily activity → steps + active energy
  const activityUrl = `${OURA_API_BASE}/daily_activity?start_date=${startDate}&end_date=${endDate}`;
  try {
    const activity = (await ouraAuthedFetch(tokens.accessToken, activityUrl)) as {
      data?: Array<{ id: string; day: string; steps?: number | null; active_calories?: number | null }>;
    };
    for (const a of activity.data ?? []) {
      const at = new Date(`${a.day}T00:00:00Z`);
      if (typeof a.steps === "number") {
        records.push({
          metricKind: "steps",
          value: a.steps,
          recordedAt: at,
          sourceRecordId: `oura:steps:${a.id}`,
        });
      }
      if (typeof a.active_calories === "number") {
        records.push({
          metricKind: "active_energy",
          value: a.active_calories,
          recordedAt: at,
          sourceRecordId: `oura:active_energy:${a.id}`,
        });
      }
    }
  } catch {
    // Activity is optional too.
  }

  return records;
}

// ── Garmin (OAuth 1.0a) ──────────────────────────────────────────────────────
//
// Garmin Connect's Wellness API uses HMAC-SHA1 signed OAuth1 requests.
// We sign manually so we can avoid pulling in another dependency.

function percentEncode(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function oauth1Sign(params: {
  method: "GET" | "POST";
  url: string;
  consumerKey: string;
  consumerSecret: string;
  token?: string;
  tokenSecret?: string;
  oauthCallback?: string;
  oauthVerifier?: string;
  extra?: Record<string, string>;
}): { authHeader: string } {
  const oauthParams: Record<string, string> = {
    oauth_consumer_key: params.consumerKey,
    oauth_nonce: crypto.randomBytes(16).toString("hex"),
    oauth_signature_method: "HMAC-SHA1",
    oauth_timestamp: Math.floor(Date.now() / 1000).toString(),
    oauth_version: "1.0",
  };
  if (params.token) oauthParams.oauth_token = params.token;
  if (params.oauthCallback) oauthParams.oauth_callback = params.oauthCallback;
  if (params.oauthVerifier) oauthParams.oauth_verifier = params.oauthVerifier;

  const allParams: Record<string, string> = { ...oauthParams, ...(params.extra ?? {}) };
  const paramStr = Object.keys(allParams)
    .sort()
    .map((k) => `${percentEncode(k)}=${percentEncode(allParams[k])}`)
    .join("&");
  const baseString = [
    params.method,
    percentEncode(params.url),
    percentEncode(paramStr),
  ].join("&");
  const signingKey = `${percentEncode(params.consumerSecret)}&${percentEncode(params.tokenSecret ?? "")}`;
  const signature = crypto
    .createHmac("sha1", signingKey)
    .update(baseString)
    .digest("base64");
  oauthParams.oauth_signature = signature;
  const authHeader =
    "OAuth " +
    Object.keys(oauthParams)
      .sort()
      .map((k) => `${percentEncode(k)}="${percentEncode(oauthParams[k])}"`)
      .join(", ");
  return { authHeader };
}

export async function garminRequestToken(
  callbackUrl: string,
): Promise<{ token: string; tokenSecret: string; authorizeUrl: string }> {
  const { authHeader } = oauth1Sign({
    method: "POST",
    url: GARMIN_REQUEST_TOKEN_URL,
    consumerKey: process.env.GARMIN_CONSUMER_KEY!,
    consumerSecret: process.env.GARMIN_CONSUMER_SECRET!,
    oauthCallback: callbackUrl,
  });
  const res = await fetch(GARMIN_REQUEST_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`Garmin request_token failed (${res.status}): ${await res.text()}`);
  const text = await res.text();
  const parsed = new URLSearchParams(text);
  const token = parsed.get("oauth_token");
  const secret = parsed.get("oauth_token_secret");
  if (!token || !secret) throw new Error(`Garmin request_token missing fields: ${text}`);
  return {
    token,
    tokenSecret: secret,
    authorizeUrl: `${GARMIN_AUTHORIZE_URL}?oauth_token=${encodeURIComponent(token)}&oauth_callback=${encodeURIComponent(callbackUrl)}`,
  };
}

export async function garminExchangeVerifier(
  requestToken: string,
  requestTokenSecret: string,
  verifier: string,
): Promise<ProviderTokens> {
  const { authHeader } = oauth1Sign({
    method: "POST",
    url: GARMIN_ACCESS_TOKEN_URL,
    consumerKey: process.env.GARMIN_CONSUMER_KEY!,
    consumerSecret: process.env.GARMIN_CONSUMER_SECRET!,
    token: requestToken,
    tokenSecret: requestTokenSecret,
    oauthVerifier: verifier,
  });
  const res = await fetch(GARMIN_ACCESS_TOKEN_URL, {
    method: "POST",
    headers: { Authorization: authHeader },
  });
  if (!res.ok) throw new Error(`Garmin access_token failed (${res.status}): ${await res.text()}`);
  const text = await res.text();
  const parsed = new URLSearchParams(text);
  const token = parsed.get("oauth_token");
  const secret = parsed.get("oauth_token_secret");
  if (!token || !secret) throw new Error(`Garmin access_token missing fields: ${text}`);
  return { accessToken: token, tokenSecret: secret, expiresAt: null };
}

async function garminAuthedFetch(
  url: string,
  accessToken: string,
  accessSecret: string,
  query: Record<string, string>,
): Promise<unknown> {
  const { authHeader } = oauth1Sign({
    method: "GET",
    url,
    consumerKey: process.env.GARMIN_CONSUMER_KEY!,
    consumerSecret: process.env.GARMIN_CONSUMER_SECRET!,
    token: accessToken,
    tokenSecret: accessSecret,
    extra: query,
  });
  const qs = new URLSearchParams(query).toString();
  const res = await fetch(`${url}?${qs}`, { headers: { Authorization: authHeader } });
  // Garmin returns 204 No Content for windows with no recorded data — that's
  // a legitimate empty result, not an error. Anything else (4xx auth, 5xx) is
  // surfaced so the route-level handler can mark the sync job as failed.
  if (res.status === 204) return [];
  if (!res.ok) throw new Error(`Garmin ${url} → ${res.status} ${await res.text()}`);
  const text = await res.text();
  if (!text) return [];
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`Garmin ${url} returned invalid JSON: ${(err as Error).message}`);
  }
}

export async function garminSyncRecent(device: WearableDevice, days: number): Promise<ProviderRecord[]> {
  if (!device.accessTokenEnc || !device.refreshTokenEnc) {
    throw new Error("Garmin not connected (missing access token / secret)");
  }
  const accessToken = decryptSecret(device.accessTokenEnc);
  const accessSecret = decryptSecret(device.refreshTokenEnc);
  const records: ProviderRecord[] = [];
  // Garmin's pull endpoints use a moving 24-hour window; we walk day-by-day.
  for (let i = 0; i < days; i++) {
    const dayEnd = new Date(Date.now() - i * 86400_000);
    const dayStart = new Date(dayEnd.getTime() - 86400_000);
    const params = {
      uploadStartTimeInSeconds: Math.floor(dayStart.getTime() / 1000).toString(),
      uploadEndTimeInSeconds: Math.floor(dayEnd.getTime() / 1000).toString(),
    };
    // 204/empty windows are returned as [] by garminAuthedFetch; auth and
    // server errors propagate so the route handler can flip the sync job
    // status to "error" with a useful message.
    const dailies = ((await garminAuthedFetch(
      `${GARMIN_API_BASE}/dailies`,
      accessToken,
      accessSecret,
      params,
    )) ?? []) as Array<{
      summaryId: string;
      calendarDate?: string;
      steps?: number;
      restingHeartRateInBeatsPerMinute?: number;
      activeKilocalories?: number;
    }>;
    for (const d of dailies) {
      const at = d.calendarDate ? new Date(`${d.calendarDate}T00:00:00Z`) : dayStart;
      if (typeof d.steps === "number") {
        records.push({
          metricKind: "steps",
          value: d.steps,
          recordedAt: at,
          sourceRecordId: `garmin:steps:${d.summaryId}`,
        });
      }
      if (typeof d.restingHeartRateInBeatsPerMinute === "number") {
        records.push({
          metricKind: "resting_hr",
          value: d.restingHeartRateInBeatsPerMinute,
          recordedAt: at,
          sourceRecordId: `garmin:rhr:${d.summaryId}`,
        });
      }
      if (typeof d.activeKilocalories === "number") {
        records.push({
          metricKind: "active_energy",
          value: d.activeKilocalories,
          recordedAt: at,
          sourceRecordId: `garmin:active_energy:${d.summaryId}`,
        });
      }
    }
  }
  return records;
}
