import { beforeEach, describe, expect, it } from "vitest";
import { createHmac } from "node:crypto";
import {
  _resetWebhookKeyCache,
  verifyHmacWebhookSignature,
  verifyJwtWebhookSignature,
  type WebhookKeyFetcher,
} from "../webhook-signature";
import {
  exportJWK,
  generateKeyPair,
  SignJWT,
  type JWK,
  type KeyLike,
} from "jose";
import { createHash } from "node:crypto";

describe("verifyHmacWebhookSignature", () => {
  const secret = "shhh-this-is-the-shared-secret";
  const body = JSON.stringify({ event: "delivery_status", id: "abc" });
  const expected = createHmac("sha256", secret).update(body).digest("hex");

  it("accepts a request whose digest matches the body", () => {
    const result = verifyHmacWebhookSignature(expected, body, { secret });
    expect(result.ok).toBe(true);
  });

  it("strips an optional prefix on the header before comparing", () => {
    const result = verifyHmacWebhookSignature(`sha256=${expected}`, body, {
      secret,
      prefix: "sha256=",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects when the header is missing", () => {
    const result = verifyHmacWebhookSignature(undefined, body, { secret });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_header");
  });

  it("rejects when the body is missing", () => {
    const result = verifyHmacWebhookSignature(expected, undefined, { secret });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_body");
  });

  it("rejects when the secret is empty", () => {
    const result = verifyHmacWebhookSignature(expected, body, { secret: "" });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("missing_secret");
  });

  it("rejects when the digest doesn't match — body tampered", () => {
    const tampered = JSON.stringify({ event: "delivery_status", id: "evil" });
    const result = verifyHmacWebhookSignature(expected, tampered, { secret });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });

  it("rejects a header that isn't a hex string at all", () => {
    const result = verifyHmacWebhookSignature("not-a-hex-string", body, {
      secret,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_header");
  });

  it("rejects a header of the wrong length", () => {
    const result = verifyHmacWebhookSignature(expected.slice(0, 30), body, {
      secret,
    });
    expect(result.ok).toBe(false);
    expect(result.reason).toBe("bad_signature");
  });
});

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
  hashClaim: string,
): Promise<string> {
  const sha = createHash("sha256").update(body).digest("hex");
  return new SignJWT({ [hashClaim]: sha })
    .setProtectedHeader({ alg: "ES256", typ: "JOSE", kid: "test-kid" })
    .setIssuedAt()
    .sign(privateKey);
}

describe("verifyJwtWebhookSignature (provider-agnostic)", () => {
  beforeEach(() => {
    _resetWebhookKeyCache();
  });

  it("accepts a webhook signed for a configurable claim name", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    const body = JSON.stringify({ x: 1 });
    const jwt = await signWebhook(privateKey, body, "body_sha256");
    const fetcher: WebhookKeyFetcher = async () => ({ ...jwk });

    const result = await verifyJwtWebhookSignature(jwt, body, fetcher, {
      provider: "test-provider",
      algorithm: "ES256",
      bodyHashClaim: "body_sha256",
    });
    expect(result.ok).toBe(true);
  });

  it("namespaces the key cache per provider", async () => {
    const { privateKey: pkA, jwk: jwkA } = await makeKeyFixture("test-kid");
    const { privateKey: pkB, jwk: jwkB } = await makeKeyFixture("test-kid");
    const body = "{}";

    const jwtA = await signWebhook(pkA, body, "request_body_sha256");
    const jwtB = await signWebhook(pkB, body, "request_body_sha256");

    let aCalls = 0;
    let bCalls = 0;
    const fetcherA: WebhookKeyFetcher = async () => {
      aCalls += 1;
      return { ...jwkA };
    };
    const fetcherB: WebhookKeyFetcher = async () => {
      bCalls += 1;
      return { ...jwkB };
    };

    const baseOpts = { algorithm: "ES256" as const };
    const ra = await verifyJwtWebhookSignature(jwtA, body, fetcherA, {
      ...baseOpts,
      provider: "provider-a",
    });
    const rb = await verifyJwtWebhookSignature(jwtB, body, fetcherB, {
      ...baseOpts,
      provider: "provider-b",
    });
    expect(ra.ok).toBe(true);
    expect(rb.ok).toBe(true);
    // Each provider fetched its own kid even though both used "test-kid" —
    // proving the caches are namespaced. A shared cache would have
    // accepted whichever key landed first and rejected the other.
    expect(aCalls).toBe(1);
    expect(bCalls).toBe(1);
  });

  it("only resets the cache for the named provider", async () => {
    const { privateKey, jwk } = await makeKeyFixture();
    const body = "{}";
    const jwt = await signWebhook(privateKey, body, "request_body_sha256");
    let calls = 0;
    const fetcher: WebhookKeyFetcher = async () => {
      calls += 1;
      return { ...jwk };
    };

    await verifyJwtWebhookSignature(jwt, body, fetcher, {
      provider: "p1",
      algorithm: "ES256",
    });
    await verifyJwtWebhookSignature(jwt, body, fetcher, {
      provider: "p2",
      algorithm: "ES256",
    });
    expect(calls).toBe(2);

    // Wipe only p1; p2 should still serve its cached key on the next call.
    _resetWebhookKeyCache("p1");
    await verifyJwtWebhookSignature(jwt, body, fetcher, {
      provider: "p2",
      algorithm: "ES256",
    });
    expect(calls).toBe(2);
    await verifyJwtWebhookSignature(jwt, body, fetcher, {
      provider: "p1",
      algorithm: "ES256",
    });
    expect(calls).toBe(3);
  });
});
