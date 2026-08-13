/**
 * Billing stub — MVP simulation layer.
 *
 * All public functions here are designed to be drop-in compatible with a future
 * RevenueCat / Stripe / StoreKit integration.  For now they:
 *   1. Call the backend billing stub API (which persists tier to the DB for
 *      authenticated users).
 *   2. Mirror the result into localStorage via `activateDWPlus()` so the
 *      rest of the client can read entitlement synchronously.
 *
 * Replace the `fetch` calls with real purchase-provider SDK calls when ready.
 */

import { activateDWPlus, setDWPlus } from "./entitlement";

export type BillingPlan = "plus" | "premium" | "lifetime";

export interface BillingResult {
  success: boolean;
  tier: "free" | "plus";
  message: string;
}

// ─── Internal helpers ────────────────────────────────────────────────────────

async function postBilling(
  endpoint: string,
  body?: Record<string, unknown>,
): Promise<BillingResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${res.status}: ${text}`);
  }
  return res.json() as Promise<BillingResult>;
}

// ─── Public API ──────────────────────────────────────────────────────────────

/**
 * Simulate a purchase upgrade.
 *
 * @param plan    The plan being purchased ("plus" | "premium" | "lifetime").
 *                All paid plans map to the "plus" tier for MVP.
 * @param context Passed through to `activateDWPlus` for bonus-message logic.
 *
 * Local entitlement is applied immediately so the UI is responsive.  If the
 * backend returns a non-OK HTTP response (e.g. 400 bad request, 404 stale
 * session, 500 server error) the error is re-thrown so the caller can surface
 * it and the user understands the DB was not updated.  Pure network failures
 * (fetch throws TypeError) are the only case where we degrade gracefully and
 * keep the local-only entitlement.
 */
export async function simulateUpgrade(
  plan: BillingPlan = "plus",
  context: "message_limit" | "session_limit" | "paywall" = "paywall",
): Promise<BillingResult> {
  // Apply locally first so the UI is immediately responsive.
  activateDWPlus(context);

  try {
    const result = await postBilling("/api/billing/upgrade", { plan });
    return result;
  } catch (err) {
    // Degrade gracefully ONLY for transport-level failures where `fetch` itself
    // throws (e.g. device offline, DNS failure — always a TypeError in browsers).
    // Non-OK HTTP responses are thrown by `postBilling` as plain Error objects
    // (message: "<status>: <body>") and should propagate to the caller.
    if (err instanceof TypeError) {
      return { success: true, tier: "plus", message: "DW Pro activated" };
    }
    throw err;
  }
}

/**
 * Simulate a purchase restore.
 *
 * Calls the backend to check whether the authenticated user has a stored "plus"
 * tier.  If so, the local entitlement is also refreshed.  For guests (no
 * session) the backend will return `success: false`.
 *
 * Any transport or HTTP error is allowed to throw so the caller's catch block
 * can display an accurate error message (e.g. "network unavailable") instead of
 * the misleading "no subscription found" message.
 */
export async function simulateRestore(): Promise<BillingResult> {
  const result = await postBilling("/api/billing/restore");
  if (result.success && result.tier === "plus") {
    activateDWPlus("restore");
  }
  return result;
}

/**
 * Fetch the current subscription status from the backend.
 * Returns `{ tier: "free" }` when unauthenticated or on error.
 */
export async function fetchSubscriptionStatus(): Promise<{
  tier: "free" | "plus";
  updatedAt: string | null;
}> {
  try {
    const res = await fetch("/api/billing/status", { credentials: "include" });
    if (!res.ok) return { tier: "free", updatedAt: null };
    const data = (await res.json()) as { tier: "free" | "plus"; updatedAt: string | null };
    // Keep localStorage in sync with server state.
    setDWPlus(data.tier === "plus");
    return data;
  } catch {
    return { tier: "free", updatedAt: null };
  }
}
