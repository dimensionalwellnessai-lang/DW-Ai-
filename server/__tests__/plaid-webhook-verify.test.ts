import { beforeEach, describe, expect, it } from "vitest";
import { createHash } from "node:crypto";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
  type KeyLike,
} from "jose";
import {
  _resetPlaidWebhookKeyCache,
  verifyPlaidWebhookJwt,
  type WebhookKeyFetcher,
} from "../plaid-webhook-verify";

interface KeyFixture {
  privateKey: KeyLike;
  jwk: JWK & { kid: string };
}

async function makeKeyFixture(kid = "test-kid"): Promise<KeyFixture> {
  const { privateKey, publicKey } = await generateKeyPair("ES256");
  const jwk = (await exportJWK(publicKey)) as JWK & { kid?: string };
  jwk.alg = "ES256";
  jwk.kid = kid;
  return { privateKey, jwk: jwk as JWK & { kid: string } };
}

async function signWebhook(
  privateKey: KeyLike,
  body: string,
  opts: { kid?: string; iat?: number } = {},
): Promise<string> {
  const sha = createHash("sha256").update(body).digest("hex");
  const iat = opts.iat ?? Math.floor(Date.now() / 1000);
  return new SignJWT({ request_body_sha256: sha })
    .setProtectedHeader({ alg: "ES256", typ: "JOSE", kid: opts.kid ?? "test-kid" })
    .setIssuedAt(iat)
    .sign(privateKey);
}

function staticFetcher(jwk: JWK): WebhookKeyFetcher {
  return async () => ({ ...jwk });
}

describe("verifyPlaidWebhookJwt", () => {
  beforeEach(() => {
    _resetPlaidWebhookKeyCache();
  });

  it("accepts a properly signed webhook whose body hash matches", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    const body = JSON.stringify({ webhook_type: "TRANSACTIONS", item_id: "abc" });
    const jwt = await signWebhook(privateKey, body);

    const result = await verifyPlaidWebhookJwt(jwt, body, staticFetcher(jwk));

    expect(result.ok).toBe(true);
  });

  it("rejects when the Plaid-Verification header is missing", async () => {
    const fetcher: WebhookKeyFetcher = async () => {
      throw new Error("must not be called");
    };
    const result = await verifyPlaidWebhookJwt(undefined, "{}", fetcher);
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_header");
  });

  it("rejects when the JWT is structurally invalid", async () => {
    const result = await verifyPlaidWebhookJwt(
      "not-a-jwt",
      "{}",
      async () => ({} as JWK),
    );
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_jwt");
  });

  it("rejects when the request body has been tampered with after signing", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    const original = JSON.stringify({ item_id: "real-item" });
    const jwt = await signWebhook(privateKey, original);

    // Attacker swaps the body to point at a different item but reuses the
    // signed JWT — the SHA-256 claim no longer matches.
    const tampered = JSON.stringify({ item_id: "stolen-item" });
    const result = await verifyPlaidWebhookJwt(jwt, tampered, staticFetcher(jwk));

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("body_mismatch");
  });

  it("rejects when the JWT was signed with a key the cache does not have", async () => {
    const { jwk } = await makeKeyFixture(); // legitimate key
    const attacker = await makeKeyFixture("attacker-kid");
    const body = "{}";
    // Attacker signs with their own key but reuses the legitimate kid so
    // the server fetches the wrong public key from "Plaid".
    const jwt = await signWebhook(attacker.privateKey, body, { kid: "test-kid" });

    const result = await verifyPlaidWebhookJwt(jwt, body, staticFetcher(jwk));

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects unsigned (alg=none) JWTs", async () => {
    const body = "{}";
    const sha = createHash("sha256").update(body).digest("hex");
    const header = Buffer.from(
      JSON.stringify({ alg: "none", kid: "x", typ: "JOSE" }),
    ).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({
        request_body_sha256: sha,
        iat: Math.floor(Date.now() / 1000),
      }),
    ).toString("base64url");
    const jwt = `${header}.${payload}.`;

    const result = await verifyPlaidWebhookJwt(
      jwt,
      body,
      async () => ({} as JWK),
    );

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_alg");
  });

  it("rejects webhooks older than the 5-minute freshness window", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    const body = "{}";
    const oldIat = Math.floor(Date.now() / 1000) - 10 * 60;
    const jwt = await signWebhook(privateKey, body, { iat: oldIat });

    const result = await verifyPlaidWebhookJwt(jwt, body, staticFetcher(jwk));

    expect(result.ok).toBe(false);
    expect(result.reason).toBe("stale_iat");
  });

  it("caches the verification key across requests using the same kid", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    let calls = 0;
    const fetcher: WebhookKeyFetcher = async () => {
      calls += 1;
      return { ...jwk };
    };

    const body1 = JSON.stringify({ a: 1 });
    const body2 = JSON.stringify({ a: 2 });
    const jwt1 = await signWebhook(privateKey, body1);
    const jwt2 = await signWebhook(privateKey, body2);

    expect((await verifyPlaidWebhookJwt(jwt1, body1, fetcher)).ok).toBe(true);
    expect((await verifyPlaidWebhookJwt(jwt2, body2, fetcher)).ok).toBe(true);

    expect(calls).toBe(1);
  });

  it("refetches the verification key once Plaid marks it expired", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    let calls = 0;
    // First fetch returns a key that "expired" a second ago, so the cache
    // must refresh on the next call instead of accepting it forever.
    const fetcher: WebhookKeyFetcher = async () => {
      calls += 1;
      if (calls === 1) {
        return {
          ...jwk,
          expired_at: new Date(Date.now() - 1000).toISOString(),
        };
      }
      return { ...jwk };
    };

    const body = "{}";
    const jwt1 = await signWebhook(privateKey, body);
    const jwt2 = await signWebhook(privateKey, body);

    // First call fetches an already-expired key and refuses it.
    const first = await verifyPlaidWebhookJwt(jwt1, body, fetcher);
    expect(first.ok).toBe(false);
    expect(first.reason).toBe("key_expired");

    // Second call sees the stale cache entry, refetches a fresh key, and
    // succeeds — proving the cache does refresh and isn't stuck forever.
    const second = await verifyPlaidWebhookJwt(jwt2, body, fetcher);
    expect(second.ok).toBe(true);
    expect(calls).toBe(2);
  });
});
