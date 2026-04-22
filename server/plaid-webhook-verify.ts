/**
 * Verifies that a request to POST /api/plaid/webhook actually came from
 * Plaid by checking the JWT in the `Plaid-Verification` header.
 *
 * Plaid signs every webhook with ES256 and embeds the SHA-256 of the raw
 * request body in the `request_body_sha256` claim, so we can detect
 * tampering with the body even if an attacker steals a valid JWT.
 *
 * The verification key is fetched from Plaid (`/webhook_verification_key/get`)
 * lazily by `kid` and cached in memory until Plaid marks it expired, per
 * the recommended pattern in their docs.
 */
import { createHash } from "node:crypto";
import { importJWK, jwtVerify, decodeProtectedHeader, type JWK } from "jose";
import type { PlaidApi } from "plaid";

interface CachedKey {
  jwk: JWK;
  /** ms epoch when Plaid says this key stops being valid; null = no expiry yet. */
  expiresAt: number | null;
}

const keyCache = new Map<string, CachedKey>();

/** For tests only — wipes the in-process verification-key cache. */
export function _resetPlaidWebhookKeyCache(): void {
  keyCache.clear();
}

/** Plaid recommends rejecting webhooks older than 5 minutes. */
const MAX_AGE_SECONDS = 5 * 60;

export type PlaidWebhookKey = JWK & {
  expired_at?: string | null;
  created_at?: string | null;
};

export type WebhookKeyFetcher = (kid: string) => Promise<PlaidWebhookKey>;

export interface VerifyResult {
  ok: boolean;
  reason?:
    | "missing_header"
    | "missing_body"
    | "bad_jwt"
    | "bad_alg"
    | "missing_kid"
    | "key_fetch_failed"
    | "key_expired"
    | "bad_signature"
    | "missing_iat"
    | "stale_iat"
    | "body_mismatch";
}

function makePlaidKeyFetcher(client: PlaidApi): WebhookKeyFetcher {
  return async (kid) => {
    const r = await client.webhookVerificationKeyGet({ key_id: kid });
    return r.data.key as unknown as PlaidWebhookKey;
  };
}

/**
 * Pure verification entry point: takes a JWT string, the raw request body
 * bytes, and a fetcher for the verification key. Tests inject a fake
 * fetcher; the real route uses the Plaid SDK.
 */
export async function verifyPlaidWebhookJwt(
  jwt: string | undefined,
  rawBody: Buffer | string | undefined,
  fetchKey: WebhookKeyFetcher,
): Promise<VerifyResult> {
  if (!jwt) return { ok: false, reason: "missing_header" };
  if (rawBody === undefined || rawBody === null) {
    return { ok: false, reason: "missing_body" };
  }

  let header: ReturnType<typeof decodeProtectedHeader>;
  try {
    header = decodeProtectedHeader(jwt);
  } catch {
    return { ok: false, reason: "bad_jwt" };
  }
  if (header.alg !== "ES256") return { ok: false, reason: "bad_alg" };
  const kid = typeof header.kid === "string" ? header.kid : null;
  if (!kid) return { ok: false, reason: "missing_kid" };

  const now = Date.now();
  let cached = keyCache.get(kid);
  if (!cached || (cached.expiresAt !== null && cached.expiresAt <= now)) {
    try {
      const fresh = await fetchKey(kid);
      const expired = fresh.expired_at ? Date.parse(fresh.expired_at) : NaN;
      const { expired_at: _e, created_at: _c, ...jwk } = fresh;
      cached = {
        jwk: jwk as JWK,
        expiresAt: Number.isFinite(expired) ? expired : null,
      };
      keyCache.set(kid, cached);
    } catch {
      return { ok: false, reason: "key_fetch_failed" };
    }
  }
  if (cached.expiresAt !== null && cached.expiresAt <= now) {
    return { ok: false, reason: "key_expired" };
  }

  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(cached.jwk, "ES256");
    const verified = await jwtVerify(jwt, key, { algorithms: ["ES256"] });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const iat = typeof payload.iat === "number" ? payload.iat : null;
  if (iat === null) return { ok: false, reason: "missing_iat" };
  if (Math.abs(Date.now() / 1000 - iat) > MAX_AGE_SECONDS) {
    return { ok: false, reason: "stale_iat" };
  }

  const expectedHash = createHash("sha256").update(rawBody).digest("hex");
  const claimedHash = payload.request_body_sha256;
  if (typeof claimedHash !== "string" || claimedHash !== expectedHash) {
    return { ok: false, reason: "body_mismatch" };
  }

  return { ok: true };
}

/** Convenience wrapper that uses the live Plaid SDK to fetch keys. */
export async function verifyPlaidWebhook(
  jwt: string | undefined,
  rawBody: Buffer | string | undefined,
  client: PlaidApi,
): Promise<VerifyResult> {
  return verifyPlaidWebhookJwt(jwt, rawBody, makePlaidKeyFetcher(client));
}
