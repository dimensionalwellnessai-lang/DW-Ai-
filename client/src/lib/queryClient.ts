import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    const text = (await res.text()) || res.statusText;
    throw new Error(`${res.status}: ${text}`);
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

/**
 * Extracts a human-readable message from an API error thrown by `apiRequest`.
 *
 * `apiRequest` throws `Error` with messages like `"503: {"error":"..."}"`.
 * This helper unwraps the JSON body's `error` field when present, or falls
 * back to the raw message text, so `onError` handlers can show something
 * meaningful instead of the generic "Connection issue" toast.
 */
export function parseApiError(error: unknown): string {
  if (error instanceof Error) {
    // Message format from throwIfResNotOk: "<status>: <body>"
    const colonIdx = error.message.indexOf(": ");
    if (colonIdx !== -1) {
      const body = error.message.slice(colonIdx + 2).trim();
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (typeof parsed?.error === "string") return parsed.error;
        if (typeof parsed?.message === "string") return parsed.message;
      } catch {
        // JSON parse failed — fall through to return the raw body text
        if (body) return body;
      }
    }
    return error.message;
  }
  return "An unexpected error occurred. Please try again.";
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    const res = await fetch(queryKey.join("/") as string, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

/**
 * Shared staleTime constants for consistent cache TTLs across hooks.
 * Using named constants avoids magic numbers and makes cache policy explicit.
 */
export const STALE_TIME = {
  /** Data that should never re-fetch automatically (e.g. static config). */
  FOREVER: Infinity,
  /**
   * Auth/identity data TTL (30 s).
   *
   * This is only a staleness threshold — it does NOT enable focus-based
   * refetches. The global `refetchOnWindowFocus` default is `false`.
   * Queries that need focus refetch must opt in explicitly, e.g.:
   *   `refetchOnWindowFocus: true`  (as `useAuth` does).
   */
  AUTH: 30 * 1000,
  /** Plans, follow-ups, and learning profile TTL (5 min). */
  MEDIUM: 5 * 60 * 1000,
  /** Frequently changing data TTL (1 min). */
  SHORT: 60 * 1000,
} as const;

/**
 * How long inactive query data is kept in memory before being garbage-collected.
 * 10 minutes gives enough time for a user to navigate away and come back without
 * triggering a refetch on every route change.
 */
const DEFAULT_GC_TIME = 10 * 60 * 1000;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      gcTime: DEFAULT_GC_TIME,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
