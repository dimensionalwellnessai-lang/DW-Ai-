import type { Express } from "express";

const VERBS = [
  "get",
  "post",
  "put",
  "patch",
  "delete",
  "options",
  "head",
] as const;

type Verb = (typeof VERBS)[number];

/**
 * Wraps `app.get/post/put/patch/delete/options/head` so any duplicate
 * registration of the same `${METHOD} ${path}` pair logs a clear console
 * warning at startup.
 *
 * Why this exists:
 *   Express keeps only the FIRST handler registered for a given
 *   method+path. A second registration becomes silent dead code, and
 *   worse, it usually means a code path that someone *thinks* is live
 *   actually never runs (cf. Task #139, where three duplicate
 *   registrations of GET /api/wearables/data hid the canonical handler
 *   and silently broke the Body dashboard).
 *
 * Caveats:
 *   - Only the literal-string-path overload is audited. `app.get("env")`
 *     style settings reads have zero handler args and are passed
 *     through unchanged.
 *   - Routes registered with regex paths or arrays of paths are also
 *     passed through unchanged (we cannot key on them reliably).
 *   - This is a startup-time audit, not a runtime guard. The duplicate
 *     handler is still registered (Express ignores it on its own); we
 *     just make it loud so the next pair of eyes notices.
 */
export function installRouteDuplicateAudit(app: Express): void {
  const seen = new Set<string>();
  for (const verb of VERBS) {
    const original = (app as unknown as Record<Verb, Function>)[verb].bind(app);
    (app as unknown as Record<Verb, Function>)[verb] = (
      path: unknown,
      ...rest: unknown[]
    ) => {
      // Settings reads (e.g. `app.get("env")`) pass a single string and
      // no handler — leave them alone.
      if (typeof path === "string" && rest.length > 0) {
        const key = `${verb.toUpperCase()} ${path}`;
        if (seen.has(key)) {
          console.warn(
            `[route-audit] duplicate registration of ${key} — Express ` +
              `only runs the FIRST handler for a given method+path; the ` +
              `second registration is dead code. Consolidate the route ` +
              `into a single module.`,
          );
        } else {
          seen.add(key);
        }
      }
      return original(path, ...rest);
    };
  }
}
