/**
 * Global fetch interceptor that transparently attaches the CSRF token to
 * every mutating (non-GET/HEAD/OPTIONS) same-origin /api request.
 *
 * The server protects all mutating /api routes with a double-submit CSRF
 * cookie (see server/routes.ts). Dozens of call sites use raw `fetch`
 * directly instead of `apiRequest`, so instead of patching each one we
 * install this wrapper once at boot (imported from main.tsx).
 *
 * On a 403 the cached token is dropped and the request is retried once with
 * a freshly minted token, so token expiry/rotation never surfaces to users.
 */

let csrfToken: string | null = null;
let tokenPromise: Promise<string> | null = null;

const nativeFetch = window.fetch.bind(window);

async function fetchToken(): Promise<string> {
  const res = await nativeFetch("/api/csrf-token", { credentials: "include" });
  if (!res.ok) throw new Error("Failed to fetch CSRF token");
  const data = (await res.json()) as { token: string };
  csrfToken = data.token;
  return data.token;
}

async function getToken(): Promise<string> {
  if (csrfToken) return csrfToken;
  // Deduplicate concurrent token fetches.
  if (!tokenPromise) {
    tokenPromise = fetchToken().finally(() => {
      tokenPromise = null;
    });
  }
  return tokenPromise;
}

/** Clear the cached token (e.g. after a 403 so the next call re-mints). */
export function invalidateCsrfToken(): void {
  csrfToken = null;
}

function isMutatingApiRequest(input: RequestInfo | URL, init?: RequestInit): boolean {
  const method = (
    init?.method ??
    (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET")
  ).toUpperCase();
  if (["GET", "HEAD", "OPTIONS"].includes(method)) return false;

  let url: string;
  if (typeof input === "string") url = input;
  else if (input instanceof URL) url = input.toString();
  else url = input.url;

  // Same-origin API calls only: relative "/api/..." or absolute on this origin.
  if (url.startsWith("/api/")) return true;
  try {
    const parsed = new URL(url, window.location.origin);
    return parsed.origin === window.location.origin && parsed.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

// The token endpoint itself must never be intercepted (and never loops).
function isTokenEndpoint(input: RequestInfo | URL): boolean {
  const url = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
  return url.includes("/api/csrf-token");
}

export function installCsrfFetch(): void {
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    if (!isMutatingApiRequest(input, init) || isTokenEndpoint(input)) {
      return nativeFetch(input, init);
    }

    const doFetch = async (token: string): Promise<Response> => {
      if (typeof Request !== "undefined" && input instanceof Request && !init) {
        const req = new Request(input);
        req.headers.set("x-csrf-token", token);
        return nativeFetch(req);
      }
      const headers = new Headers(
        init?.headers ??
          (typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined),
      );
      headers.set("x-csrf-token", token);
      return nativeFetch(input, { credentials: "include", ...init, headers });
    };

    let res: Response;
    try {
      res = await doFetch(await getToken());
    } catch (err) {
      // Token fetch failed (offline, server down) — let the original request
      // proceed without a token so the caller sees the real error.
      return nativeFetch(input, init);
    }

    // Stale/rotated token: re-mint once and retry — but only for actual CSRF
    // rejections, not other authorization 403s.
    if (res.status === 403) {
      let isCsrfFailure = false;
      try {
        const body = (await res.clone().json()) as { message?: string; error?: string };
        const msg = `${body?.message ?? ""} ${body?.error ?? ""}`.toLowerCase();
        isCsrfFailure = msg.includes("csrf");
      } catch {
        // non-JSON body — assume not a CSRF failure
      }
      if (isCsrfFailure) {
        invalidateCsrfToken();
        try {
          res = await doFetch(await getToken());
        } catch {
          // fall through with the original 403 response
        }
      }
    }
    return res;
  };
}
