/**
 * Plan artifact file storage — persists uploaded files for `projectArtifacts`
 * rows whose kind is "upload". Files live in Replit Object Storage under
 * `<PRIVATE_OBJECT_DIR>/plan-uploads/<userId>/<artifactId>` so each user's
 * uploads stay isolated and can be deleted in one shot when the artifact is
 * detached.
 *
 * The artifact row stores the relative storage key in `refId`
 * (`<userId>/<artifactId>`); resolving back to a real object path always goes
 * through `resolveObjectName`, which sanitizes the key segments so it can never
 * escape the configured private prefix.
 */
import crypto from "crypto";
import { Storage } from "@google-cloud/storage";

// Replit Object Storage exposes a sidecar at port 1106 that vends short-lived
// GCS credentials. We never read/write files outside this process, so a single
// long-lived client per server is fine.
const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";
const objectStorageClient = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

const KEY_PREFIX = "plan-uploads";

export interface SavedPlanFile {
  storageKey: string;
  size: number;
}

function getPrivateDir(): string {
  const dir = process.env.PRIVATE_OBJECT_DIR || "";
  if (!dir) {
    throw new Error(
      "PRIVATE_OBJECT_DIR not set. Configure object storage in the 'Object Storage' tool.",
    );
  }
  return dir.replace(/\/+$/, "");
}

function parseObjectPath(fullPath: string): { bucketName: string; objectName: string } {
  const path = fullPath.startsWith("/") ? fullPath : `/${fullPath}`;
  const parts = path.split("/");
  if (parts.length < 3) {
    throw new Error("Invalid object storage path: must include a bucket name");
  }
  const bucketName = parts[1];
  const objectName = parts.slice(2).join("/");
  return { bucketName, objectName };
}

function sanitizeSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function resolveObjectName(storageKey: string): { bucketName: string; objectName: string } {
  if (!storageKey || typeof storageKey !== "string") {
    throw new Error("Invalid storage key");
  }
  // Storage keys are stored as `<userId>/<artifactId>`. Sanitize each segment
  // so a malicious id can't inject `..` or other path tricks.
  const segments = storageKey.split("/").map(sanitizeSegment).filter(Boolean);
  if (segments.length === 0) throw new Error("Invalid storage key");
  const fullPath = `${getPrivateDir()}/${KEY_PREFIX}/${segments.join("/")}`;
  return parseObjectPath(fullPath);
}

/**
 * Persist the given buffer to object storage and return a storage key that can
 * later be passed to `readPlanArtifactFile` / `deletePlanArtifactFile`.
 */
export async function savePlanArtifactFile(
  userId: string,
  artifactId: string,
  buffer: Buffer,
  contentType?: string | null,
): Promise<SavedPlanFile> {
  if (!userId || !artifactId) throw new Error("userId and artifactId required");
  const safeUser = sanitizeSegment(userId);
  const safeArtifact = sanitizeSegment(artifactId);
  const storageKey = `${safeUser}/${safeArtifact}`;
  const { bucketName, objectName } = resolveObjectName(storageKey);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  await file.save(buffer, {
    contentType: contentType || "application/octet-stream",
    resumable: false,
  });
  return { storageKey, size: buffer.byteLength };
}

export async function readPlanArtifactFile(storageKey: string): Promise<Buffer> {
  const { bucketName, objectName } = resolveObjectName(storageKey);
  const file = objectStorageClient.bucket(bucketName).file(objectName);
  const [buffer] = await file.download();
  return buffer;
}

export async function deletePlanArtifactFile(storageKey: string): Promise<void> {
  try {
    const { bucketName, objectName } = resolveObjectName(storageKey);
    const file = objectStorageClient.bucket(bucketName).file(objectName);
    await file.delete({ ignoreNotFound: true });
  } catch (err: unknown) {
    const code = (err as { code?: number })?.code;
    // 404 = already gone; anything else is unexpected and worth surfacing.
    if (code !== 404) throw err;
  }
}

/**
 * Deterministic key generator used when we need an id before the DB row exists
 * (the upload route creates the row first, then writes the file using the
 * row's id, so this is exposed mainly for tests/utilities).
 */
export function generateArtifactFileId(): string {
  return crypto.randomUUID();
}
