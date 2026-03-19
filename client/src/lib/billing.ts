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

export type BillingPlan = "plus" | "premium" | "lifetime" | "free";

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
 *                "premium" and "lifetime" both map to the "plus" tier for MVP.
 * @param context Passed through to `activateDWPlus` for bonus-message logic.
 *
 * The function always applies the local entitlement regardless of whether the
 * backend call succeeds, so the user is never left gated after a network hiccup.
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
  } catch {
    // Backend call failed — local state is already updated; return graceful stub.
    return { success: true, tier: "plus", message: "DW Plus activated" };
  }
}

/**
 * Simulate a purchase restore.
 *
 * Calls the backend to check whether the authenticated user has a stored "plus"
 * tier.  If so, the local entitlement is also refreshed.  For guests (no
 * session) the backend will return `success: false`.
 */
export async function simulateRestore(): Promise<BillingResult> {
  try {
    const result = await postBilling("/api/billing/restore");
    if (result.success && result.tier === "plus") {
      activateDWPlus("restore");
    }
    return result;
  } catch {
    // Network error — cannot verify subscription; return failure so the caller
    // can surface an appropriate message rather than granting unverified access.
    return { success: false, tier: "free", message: "Could not reach the server. Please try again." };
  }
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
