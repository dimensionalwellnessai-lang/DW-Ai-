/**
 * Security guardrails for PATCH endpoints.
 *
 * Three layers are applied to every PATCH /api/* request:
 *  1. Rate limiting   – max 60 PATCH requests / 60 s per authenticated user (or IP for
 *                       unauthenticated requests), surfacing a 429 response on breach.
 *  2. Payload guard   – rejects request bodies larger than MAX_PATCH_BYTES (64 KB) with 413.
 *  3. Sanitization    – strips known prompt-injection patterns from every string value
 *                       in req.body before the route handler receives it.
 */

import rateLimit, { ipKeyGenerator } from "express-rate-limit";
import type { Request, Response, NextFunction } from "express";

// ─── 1. Rate limiter ────────────────────────────────────────────────────────

/**
 * 60 PATCH requests per 60-second window, keyed by authenticated userId (or IP
 * for unauthenticated callers).  The generous window is intentional: legitimate
 * users performing bulk UI operations should not be blocked; we're defending
 * against automated abuse.
 */
export const patchRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  keyGenerator: (req) => {
    const userId = (req.session as { userId?: string } | undefined)?.userId;
    if (userId) return userId;
    return ipKeyGenerator(req.ip ?? "");
  },
  handler: (req, res) => {
    console.warn(
      `[SECURITY] PATCH rate-limit exceeded userId=${(req.session as { userId?: string } | undefined)?.userId ?? "anon"} ip=${req.ip} path=${req.path}`
    );
    res.status(429).json({ error: "Too many requests. Please slow down." });
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// ─── 2. Payload size guard ───────────────────────────────────────────────────

/** Maximum allowed size for a PATCH request body (64 KB). */
export const MAX_PATCH_BYTES = 64 * 1024;

/**
 * Rejects PATCH requests whose body exceeds MAX_PATCH_BYTES.
 * The Content-Length header is checked first (fast path), then the serialised
 * body length is checked as a fallback for chunked transfers.
 */
export const validatePatchPayloadSize = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const contentLength = parseInt(req.headers["content-length"] ?? "0", 10);
  if (!isNaN(contentLength) && contentLength > MAX_PATCH_BYTES) {
    console.warn(
      `[SECURITY] Oversized PATCH body (header) userId=${(req.session as { userId?: string } | undefined)?.userId ?? "anon"} path=${req.path} bytes=${contentLength}`
    );
    res.status(413).json({ error: "Payload too large." });
    return;
  }

  // Fallback: check serialised body length for cases without Content-Length.
  if (req.body !== undefined) {
    const serialised = JSON.stringify(req.body);
    if (serialised.length > MAX_PATCH_BYTES) {
      console.warn(
        `[SECURITY] Oversized PATCH body (parsed) userId=${(req.session as { userId?: string } | undefined)?.userId ?? "anon"} path=${req.path} bytes=${serialised.length}`
      );
      res.status(413).json({ error: "Payload too large." });
      return;
    }
  }

  next();
};

// ─── 3. Prompt-injection sanitisation ───────────────────────────────────────

/**
 * Patterns that are characteristic of prompt-injection attacks in user-supplied
 * text.  These are matched case-insensitively.
 *
 * When matched, the offending fragment is replaced with the literal string
 * "[removed]" so that the surrounding context is preserved for readability
 * while the injection vector is neutralised.
 */
const INJECTION_PATTERNS: RegExp[] = [
  // Instruction-override phrasing
  /ignore\s+(all\s+)?(previous|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  /disregard\s+(all\s+)?(previous|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  /forget\s+(all\s+)?(previous|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  /override\s+(all\s+)?(previous|prior|earlier)\s+(instructions?|prompts?|context)/gi,
  // Persona hijacking
  /\byou\s+are\s+now\s+(?:a|an|the)\s+/gi,
  /\bact\s+as\s+(?:a|an|the)\s+/gi,
  /\bpretend\s+(?:you\s+are|to\s+be)\s+/gi,
  /\brespond\s+as\s+(?:if\s+you\s+(?:are|were)\s+)?(?:a|an|the)\s+/gi,
  // Chat-markup role tags (used to inject fake system/user turns)
  /\bsystem\s*:/gi,
  /\buser\s*:/gi,
  /\bassistant\s*:/gi,
  // Special token boundary attacks (e.g. <|im_start|>, <|endoftext|>)
  /<\|[^|]{1,100}\|>/g,
  // Double-bracket injection patterns [[instruction]]
  /\[\[[^\]]{1,1000}\]\]/g,
];

/**
 * Recursively walks `value` and replaces prompt-injection patterns in every
 * string it encounters.  Non-string primitives (numbers, booleans, null) are
 * returned unchanged.  Arrays and plain objects are cloned shallowly with
 * their string descendants sanitised.
 */
export function sanitizeTextFields<T>(value: T): T {
  if (typeof value === "string") {
    let sanitized = value;
    for (const pattern of INJECTION_PATTERNS) {
      // Reset lastIndex for global regexes to avoid skipping matches on
      // repeated calls to .replace() (exec() caches position in `g` regexes).
      pattern.lastIndex = 0;
      sanitized = sanitized.replace(pattern, "[removed]");
    }
    return sanitized as unknown as T;
  }

  if (Array.isArray(value)) {
    return value.map(sanitizeTextFields) as unknown as T;
  }

  if (value !== null && typeof value === "object") {
    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value as Record<string, unknown>)) {
      result[key] = sanitizeTextFields(val);
    }
    return result as unknown as T;
  }

  return value;
}

/**
 * Express middleware that sanitises all string fields in req.body in-place.
 * Should be applied after express.json() parses the body.
 */
export const sanitizePatchBody = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (req.body !== null && typeof req.body === "object") {
    req.body = sanitizeTextFields(req.body);
  }
  next();
};
