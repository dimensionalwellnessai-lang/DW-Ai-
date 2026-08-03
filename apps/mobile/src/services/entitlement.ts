/**
 * Centralized entitlement resolution for DW.ai mobile app.
 *
 * This module is the single source of truth for whether the current user
 * has an active DW Plus entitlement.  All components and gating logic should
 * read from the subscription store (which this service keeps fresh) rather
 * than calling RevenueCat directly.
 *
 * Revalidation is triggered on:
 *   - App startup / bootstrap          → via `entitlementService.initialize()`
 *   - App foreground resume            → via AppState listener registered in _layout.tsx
 *   - Successful purchase              → automatically by subscriptionService.purchase()
 *   - Restore completion               → automatically by subscriptionService.restorePurchases()
 *   - User sign-in / sign-out          → via authStore hooks in auth.ts
 *
 * Fallback behaviour:
 *   When RevenueCat is temporarily unavailable the last-known entitlement is
 *   preserved for up to `ENTITLEMENT_STALE_MS` milliseconds.  After that window
 *   expires the store is reset to the safe default (isPro: false) to prevent
 *   stale state from incorrectly unlocking premium features indefinitely.
 */

import { subscriptionService, type SubscriptionStatus } from './subscriptions';
import { analytics, ANALYTICS_EVENTS } from './analytics';
import { addBreadcrumb } from './monitoring';

/** How long (ms) the last-known entitlement is trusted when service is unavailable. */
export const ENTITLEMENT_STALE_MS = 5 * 60 * 1000; // 5 minutes

interface CachedEntitlement {
  status: SubscriptionStatus;
  validatedAt: number; // Date.now()
}

let cache: CachedEntitlement | null = null;

/** Previous isPro state, used to detect transitions and fire analytics. */
let previousIsPro: boolean | null = null;

function isCacheFresh(): boolean {
  if (!cache) return false;
  return Date.now() - cache.validatedAt < ENTITLEMENT_STALE_MS;
}

/**
 * Revalidate entitlement from RevenueCat and update the cache.
 *
 * @returns The refreshed `SubscriptionStatus`, or the last-known fallback if
 *          the service is unavailable and the cache is still within the stale window.
 *          Returns `{ isPro: false, entitlements: [] }` when the cache has expired.
 */
export async function revalidateEntitlement(): Promise<SubscriptionStatus> {
  addBreadcrumb('Revalidating entitlement');

  try {
    const status = await subscriptionService.getSubscriptionStatus();

    // Detect entitlement state transitions and emit an analytics event.
    if (previousIsPro !== null && previousIsPro !== status.isPro) {
      analytics.track(ANALYTICS_EVENTS.ENTITLEMENT_STATE_CHANGED, {
        isPro: status.isPro,
        source: 'revalidate',
      });
    }
    previousIsPro = status.isPro;

    cache = { status, validatedAt: Date.now() };
    addBreadcrumb('Entitlement revalidated', { isPro: status.isPro });
    return status;
  } catch {
    addBreadcrumb('Entitlement revalidation failed — using fallback');

    if (isCacheFresh()) {
      console.warn('[Entitlement] RevenueCat unavailable; using cached entitlement within stale window.');
      return cache!.status;
    }

    // Cache has expired — fall back to safe default to prevent indefinite unlock.
    console.warn('[Entitlement] Cache expired and RevenueCat unavailable; defaulting to free tier.');
    return { isPro: false, entitlements: [] };
  }
}

/**
 * Return the last cached entitlement status without making a network call.
 * Safe to call synchronously from gating checks.
 */
export function getCachedEntitlement(): SubscriptionStatus | null {
  return cache?.status ?? null;
}

/**
 * Invalidate the local cache.  Call this after sign-out to ensure the next
 * revalidation starts from a clean slate.
 */
export function invalidateEntitlementCache(): void {
  cache = null;
  previousIsPro = null;
  addBreadcrumb('Entitlement cache invalidated');
}
