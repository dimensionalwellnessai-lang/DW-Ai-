/**
 * Shared verifiers for inbound provider webhooks.
 *
 * Plaid was the first webhook we accept where Plaid signs the request and we
 * verify it against a fetched JWK. The same shape — fetch a key, hash the
 * raw body, check freshness, accept-or-reject — applies to any future JWT-
 * signed webhook (e.g. some push notification providers). Other providers
 * (Stripe, most SMS / email vendors) sign with HMAC-SHA256 over the raw
 * body using a shared secret instead.
 *
 * Both flavours live here so every unauthenticated webhook handler we add in
 * the future has one place to import a vetted verifier from instead of
 * hand-rolling a check that "looks right".
 *
 * The Plaid route still imports its convenience wrapper from
 * `server/plaid-webhook-verify.ts`; that module re-exports the JWT helpers
 * here so existing tests and call sites keep working.
 */
import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { importJWK, jwtVerify, decodeProtectedHeader, type JWK } from "jose";

// ─── JWT-style verification (Plaid pattern) ─────────────────────────────────

/** Reject webhooks whose `iat` is more than this many seconds old. */
const DEFAULT_MAX_AGE_SECONDS = 5 * 60;

interface CachedKey {
  jwk: JWK;
  /** ms epoch when the provider says this key stops being valid; null = unknown. */
  expiresAt: number | null;
}

/**
 * Per-provider key cache so two providers using the same `kid` cannot
 * collide (and so resetting one cache in tests doesn't clear the other).
 */
const keyCaches = new Map<string, Map<string, CachedKey>>();

function getKeyCache(provider: string): Map<string, CachedKey> {
  let cache = keyCaches.get(provider);
  if (!cache) {
    cache = new Map();
    keyCaches.set(provider, cache);
  }
  return cache;
}

/** For tests only — wipe the in-process verification-key cache for a provider. */
export function _resetWebhookKeyCache(provider?: string): void {
  if (provider === undefined) {
    keyCaches.clear();
    return;
  }
  keyCaches.get(provider)?.clear();
}

export type ProviderJwk = JWK & {
  expired_at?: string | null;
  created_at?: string | null;
};

export type WebhookKeyFetcher = (kid: string) => Promise<ProviderJwk>;

export type JwtVerifyReason =
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

export interface VerifyResult<R extends string = string> {
  ok: boolean;
  reason?: R;
}

export interface JwtWebhookOptions {
  /**
   * Logical provider name (e.g. "plaid"). Used to namespace the key cache so
   * different providers cannot evict each other's cached JWKs.
   */
  provider: string;
  /** JWS algorithm we will accept. Anything else is rejected as `bad_alg`. */
  algorithm: "ES256" | "RS256";
  /** Maximum age of `iat` in seconds; defaults to 5 minutes (Plaid's value). */
  maxAgeSeconds?: number;
  /** Claim that holds the body SHA-256 hex digest. Defaults to Plaid's name. */
  bodyHashClaim?: string;
}

/**
 * Generic JWT-signed webhook verifier. Pure function — caller injects the
 * key fetcher. The Plaid wrapper in `server/plaid-webhook-verify.ts` calls
 * this with the appropriate options; new providers can do the same.
 */
export async function verifyJwtWebhookSignature(
  jwt: string | undefined,
  rawBody: Buffer | string | undefined,
  fetchKey: WebhookKeyFetcher,
  options: JwtWebhookOptions,
): Promise<VerifyResult<JwtVerifyReason>> {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS;
  const bodyHashClaim = options.bodyHashClaim ?? "request_body_sha256";

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
  if (header.alg !== options.algorithm) return { ok: false, reason: "bad_alg" };
  const kid = typeof header.kid === "string" ? header.kid : null;
  if (!kid) return { ok: false, reason: "missing_kid" };

  const cache = getKeyCache(options.provider);
  const now = Date.now();
  let cached = cache.get(kid);
  if (!cached || (cached.expiresAt !== null && cached.expiresAt <= now)) {
    try {
      const fresh = await fetchKey(kid);
      const expired = fresh.expired_at ? Date.parse(fresh.expired_at) : NaN;
      const { expired_at: _e, created_at: _c, ...jwk } = fresh;
      cached = {
        jwk: jwk as JWK,
        expiresAt: Number.isFinite(expired) ? expired : null,
      };
      cache.set(kid, cached);
    } catch {
      return { ok: false, reason: "key_fetch_failed" };
    }
  }
  if (cached.expiresAt !== null && cached.expiresAt <= now) {
    return { ok: false, reason: "key_expired" };
  }

  let payload: Record<string, unknown>;
  try {
    const key = await importJWK(cached.jwk, options.algorithm);
    const verified = await jwtVerify(jwt, key, { algorithms: [options.algorithm] });
    payload = verified.payload as Record<string, unknown>;
  } catch {
    return { ok: false, reason: "bad_signature" };
  }

  const iat = typeof payload.iat === "number" ? payload.iat : null;
  if (iat === null) return { ok: false, reason: "missing_iat" };
  if (Math.abs(Date.now() / 1000 - iat) > maxAgeSeconds) {
    return { ok: false, reason: "stale_iat" };
  }

  const expectedHash = createHash("sha256").update(rawBody).digest("hex");
  const claimedHash = payload[bodyHashClaim];
  if (typeof claimedHash !== "string" || claimedHash !== expectedHash) {
    return { ok: false, reason: "body_mismatch" };
  }

  return { ok: true };
}

// ─── HMAC-style verification (Stripe / generic shared-secret pattern) ───────

export type HmacVerifyReason =
  | "missing_header"
  | "missing_body"
  | "missing_secret"
  | "bad_header"
  | "bad_signature";

export interface HmacWebhookOptions {
  /** Hex-encoded shared secret. Required. */
  secret: string;
  /**
   * The signature header is sometimes a raw hex digest, sometimes prefixed
   * (e.g. `sha256=…`). If `prefix` is set we strip it before comparing.
   */
  prefix?: string;
  /** Hash to use; defaults to sha256. */
  algorithm?: "sha256" | "sha512";
}

/**
 * Verify an HMAC-signed webhook (the pattern used by Stripe and most SMS /
 * email providers). Compares the provider-supplied digest against
 * HMAC(secret, rawBody) in constant time so an attacker cannot bisect the
 * expected value via timing.
 *
 * NOTE: For Stripe specifically we still use `stripe.webhooks.constructEvent`
 * in `server/routes/billing.ts` — that helper additionally validates the
 * `t=` timestamp and the v1 signature scheme. This generic verifier is the
 * right tool for plain `X-Signature: sha256=…` providers.
 */
export function verifyHmacWebhookSignature(
  signatureHeader: string | undefined,
  rawBody: Buffer | string | undefined,
  options: HmacWebhookOptions,
): VerifyResult<HmacVerifyReason> {
  if (!options.secret) return { ok: false, reason: "missing_secret" };
  if (!signatureHeader) return { ok: false, reason: "missing_header" };
  if (rawBody === undefined || rawBody === null) {
    return { ok: false, reason: "missing_body" };
  }

  let provided = signatureHeader.trim();
  if (options.prefix && provided.startsWith(options.prefix)) {
    provided = provided.slice(options.prefix.length);
  }
  if (!/^[0-9a-fA-F]+$/.test(provided)) {
    return { ok: false, reason: "bad_header" };
  }

  const expected = createHmac(options.algorithm ?? "sha256", options.secret)
    .update(rawBody)
    .digest("hex");

  // Length mismatch always fails — and `timingSafeEqual` requires equal-length
  // buffers, so reject up front instead of throwing.
  if (provided.length !== expected.length) {
    return { ok: false, reason: "bad_signature" };
  }
  const a = Buffer.from(provided.toLowerCase(), "hex");
  const b = Buffer.from(expected, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, reason: "bad_signature" };
  }
  return { ok: true };
}
