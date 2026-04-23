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
 *
 * Implementation lives in `server/webhook-signature.ts` so the same JWT-
 * verification logic can be reused for any future inbound JWT-signed webhook.
 * This module is a thin Plaid-specific wrapper that pins the algorithm,
 * provider name, and SDK key fetcher.
 */
import type { JWK } from "jose";
import type { PlaidApi } from "plaid";
import {
  verifyJwtWebhookSignature,
  _resetWebhookKeyCache,
  type JwtVerifyReason,
  type ProviderJwk,
  type VerifyResult,
  type WebhookKeyFetcher,
} from "./webhook-signature";

const PROVIDER = "plaid";

/** For tests only — wipes the in-process verification-key cache. */
export function _resetPlaidWebhookKeyCache(): void {
  _resetWebhookKeyCache(PROVIDER);
}

export type PlaidWebhookKey = ProviderJwk;

export type { WebhookKeyFetcher };

export type VerifyReason = JwtVerifyReason;
export type { VerifyResult };

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
): Promise<VerifyResult<JwtVerifyReason>> {
  return verifyJwtWebhookSignature(jwt, rawBody, fetchKey, {
    provider: PROVIDER,
    algorithm: "ES256",
    // Plaid recommends rejecting webhooks older than 5 minutes.
    maxAgeSeconds: 5 * 60,
    bodyHashClaim: "request_body_sha256",
  });
}

/** Convenience wrapper that uses the live Plaid SDK to fetch keys. */
export async function verifyPlaidWebhook(
  jwt: string | undefined,
  rawBody: Buffer | string | undefined,
  client: PlaidApi,
): Promise<VerifyResult<JwtVerifyReason>> {
  return verifyPlaidWebhookJwt(jwt, rawBody, makePlaidKeyFetcher(client));
}

// Re-export JWK so callers don't need a second import for type assertions.
export type { JWK };
