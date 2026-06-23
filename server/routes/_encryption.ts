import crypto from "crypto";

// AES-256-GCM for secrets at rest (Plaid access tokens, etc.)
// Key source: PLAID_ENCRYPTION_KEY (preferred) or falls back to SESSION_SECRET.
// Derived via scrypt so arbitrary-length secrets still produce a 32-byte key.
if (!process.env.PLAID_ENCRYPTION_KEY) {
  console.warn(
    "[security] PLAID_ENCRYPTION_KEY is not set; falling back to SESSION_SECRET for Plaid token encryption. Set a dedicated key in production.",
  );
}

function getKey(): Buffer {
  const source = process.env.PLAID_ENCRYPTION_KEY || process.env.SESSION_SECRET;
  if (!source) {
    throw new Error("Encryption key missing: set PLAID_ENCRYPTION_KEY or SESSION_SECRET");
  }
  return crypto.scryptSync(source, "dw-finance-salt", 32);
}

export function encryptSecret(plaintext: string): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString("base64")}:${tag.toString("base64")}:${ct.toString("base64")}`;
}

export function decryptSecret(ciphertext: string): string {
  // Legacy plaintext rows (no version prefix) are returned as-is so existing
  // rows keep working until re-linked.
  if (!ciphertext.startsWith("v1:")) return ciphertext;
  const [, ivB64, tagB64, ctB64] = ciphertext.split(":");
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const ct = Buffer.from(ctB64, "base64");
  const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), iv);
  decipher.setAuthTag(tag);
  const pt = Buffer.concat([decipher.update(ct), decipher.final()]);
  return pt.toString("utf8");
}
