/**
 * RevenueCat subscription service for DW.ai mobile app.
 * Handles iOS/Android in-app purchases with entitlement gating and degraded-mode caching.
 *
 * Normalized error flow:
 *   - `PurchaseError.reason === 'cancelled'`  → user cancelled (not a true error)
 *   - `PurchaseError.reason === 'pending'`    → purchase deferred (awaiting parental approval etc.)
 *   - `PurchaseError.reason === 'network'`    → no connection at purchase time
 *   - `PurchaseError.reason === 'store'`      → App Store / Play Store unavailable
 *   - `PurchaseError.reason === 'failed'`     → unexpected failure
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  type PurchasesOffering,
  type CustomerInfo,
  LOG_LEVEL,
  PURCHASES_ERROR_CODE,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { Config } from '../config/env';
import { analytics, ANALYTICS_EVENTS } from './analytics';
import { addBreadcrumb, captureError } from './monitoring';

export const ENTITLEMENT_ID = 'dw_plus';
const SUBSCRIPTION_CACHE_KEY = 'dw_subscription_status';
const SUBSCRIPTION_TIMEOUT_MS = 15_000;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SubscriptionStatus {
  isPro: boolean;
  entitlements: string[];
  activeSubscription?: string;
  expirationDate?: string;
  isStale?: boolean;
  source?: 'live' | 'cache' | 'default';
  degradedReason?: 'service_unavailable';
  lastValidatedAt?: string;
}

export type PurchaseErrorReason =
  | 'cancelled'
  | 'pending'
  | 'network'
  | 'store'
  | 'failed';

export class PurchaseError extends Error {
  constructor(
    message: string,
    public readonly reason: PurchaseErrorReason,
    public readonly originalError?: unknown,
  ) {
    super(message);
    this.name = 'PurchaseError';
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Determine whether a RevenueCat error represents a user-initiated cancel. */
function isUserCancelledError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const rc = error as Record<string, unknown>;

  // react-native-purchases sets `userCancelled: true` on cancel
  if (rc['userCancelled'] === true) return true;

  // Also check the error code enum as a fallback
  if (rc['code'] === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
    return true;
  }

  return false;
}

/** Convert a raw RevenueCat/network error to a normalized `PurchaseError`. */
function normalizePurchaseError(error: unknown, context: string): PurchaseError {
  if (error instanceof PurchaseError) return error;

  if (isUserCancelledError(error)) {
    return new PurchaseError('Purchase was cancelled.', 'cancelled', error);
  }

  if (error != null && typeof error === 'object') {
    const rc = error as Record<string, unknown>;

    if (rc['code'] === PURCHASES_ERROR_CODE.STORE_PROBLEM_ERROR) {
      return new PurchaseError(
        'The App Store is temporarily unavailable. Please try again later.',
        'store',
        error,
      );
    }

    if (rc['code'] === PURCHASES_ERROR_CODE.NETWORK_ERROR) {
      return new PurchaseError(
        'No internet connection. Please check your network and try again.',
        'network',
        error,
      );
    }

    if (rc['code'] === PURCHASES_ERROR_CODE.PAYMENT_PENDING_ERROR) {
      return new PurchaseError(
        'Your purchase is pending approval. Check back shortly.',
        'pending',
        error,
      );
    }
  }

  const message =
    error instanceof Error ? error.message : `${context} failed. Please try again.`;
  return new PurchaseError(message, 'failed', error);
}

function buildDefaultStatus(): SubscriptionStatus {
  return { isPro: false, entitlements: [], source: 'default' };
}

async function withTimeout<T>(operation: Promise<T>, timeoutMessage: string): Promise<T> {
  return await Promise.race([
    operation,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), SUBSCRIPTION_TIMEOUT_MS),
    ),
  ]);
}

async function persistStatus(status: SubscriptionStatus): Promise<void> {
  try {
    await AsyncStorage.setItem(
      SUBSCRIPTION_CACHE_KEY,
      JSON.stringify({
        ...status,
        isStale: false,
        source: 'live',
        lastValidatedAt: new Date().toISOString(),
      }),
    );
  } catch (error) {
    console.warn('[Subscriptions] Failed to persist status cache', error);
  }
}

async function readCachedStatus(): Promise<SubscriptionStatus | null> {
  try {
    const raw = await AsyncStorage.getItem(SUBSCRIPTION_CACHE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as SubscriptionStatus;
    return {
      ...parsed,
      isStale: true,
      source: 'cache',
      degradedReason: 'service_unavailable',
    };
  } catch (error) {
    console.warn('[Subscriptions] Failed to read cached status', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Initialization guard
// ---------------------------------------------------------------------------

let initialized = false;

// ---------------------------------------------------------------------------
// Backend entitlement sync (optional)
// ---------------------------------------------------------------------------

/**
 * Attempt to notify the backend that the client's entitlement has changed.
 *
 * TODO – backend contract:
 *   POST /api/subscriptions/sync
 *   Body: { userId: string; isPro: boolean; productId?: string; expiresAt?: string }
 *   Expected: 200 OK  (client ignores errors gracefully)
 *
 * When the backend endpoint is available, uncomment the fetch call below and
 * supply the authenticated API client.  The client flow MUST remain functional
 * if this call is unavailable or fails.
 */
async function syncEntitlementWithBackend(status: SubscriptionStatus): Promise<void> {
  try {
    // TODO: replace with authenticated `api.post('/api/subscriptions/sync', { ... })` when endpoint is live.
    // Example:
    //   await api.post('/api/subscriptions/sync', {
    //     isPro: status.isPro,
    //     productId: status.activeSubscription,
    //     expiresAt: status.expirationDate,
    //   });
    void status; // no-op until backend is ready
  } catch (syncError) {
    // Non-fatal — client entitlement state is source of truth for now.
    console.warn('[Subscriptions] Backend sync failed (non-fatal):', syncError);
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const subscriptionService = {
  /**
   * Initialize RevenueCat SDK. Must be called at app start before any other
   * subscription operations.  Safe to call multiple times — subsequent calls
   * are no-ops.
   */
  async initialize(): Promise<void> {
    if (initialized) return;

    try {
      if (Config.environment !== 'production') {
        Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      }

      const apiKey =
        Platform.OS === 'ios'
          ? Config.revenueCatApiKeyIos
          : Config.revenueCatApiKeyAndroid;

      if (!apiKey) {
        console.warn('[Subscriptions] RevenueCat API key not configured');
        return;
      }

      Purchases.configure({ apiKey });
      initialized = true;

      addBreadcrumb('RevenueCat initialized', { platform: Platform.OS });
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'initialize' });
      console.error('[Subscriptions] Failed to initialize RevenueCat:', error);
    }
  },

  /**
   * Identify user with RevenueCat for cross-device entitlement sync.
   * Should be called after a successful login or registration.
   */
  async identifyUser(userId: string): Promise<void> {
    if (!initialized) return;
    try {
      await withTimeout(Purchases.logIn(userId), 'Subscription identity sync timed out.');
      addBreadcrumb('RevenueCat user identified', { userId });
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'identify_user' });
      console.error('[Subscriptions] Failed to identify user:', error);
    }
  },

  /**
   * Reset user identity (on logout). Switches RevenueCat to an anonymous ID.
   */
  async resetUser(): Promise<void> {
    if (!initialized) return;
    try {
      await withTimeout(Purchases.logOut(), 'Subscription logout timed out.');
      addBreadcrumb('RevenueCat user reset');
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'reset_user' });
      console.error('[Subscriptions] Failed to reset user:', error);
    }
  },

  /**
   * Fetch the current RevenueCat offering.
   * Returns `null` if RevenueCat is not initialized or no offering is configured.
   *
   * Throws a `PurchaseError` (reason: 'network' | 'store' | 'failed') on
   * recoverable failure so callers can surface a retry affordance.
   */
  async fetchOfferings(): Promise<PurchasesOffering | null> {
    if (!initialized) return null;
    try {
      addBreadcrumb('Fetching offerings');
      const offerings = await withTimeout(
        Purchases.getOfferings(),
        'Loading subscription plans took too long. Please try again.',
      );
      return offerings.current;
    } catch (error) {
      const normalized = normalizePurchaseError(error, 'fetchOfferings');
      console.error('[Subscriptions] Failed to fetch offerings:', error);
      captureError(normalized, { area: 'subscriptions', action: 'fetch_offerings' });
      throw normalized;
    }
  },

  /**
   * Return the current entitlement status derived from RevenueCat's
   * CustomerInfo, falling back to the last persisted cache (marked stale)
   * when the service is unavailable.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!initialized) {
      return (await readCachedStatus()) ?? buildDefaultStatus();
    }

    analytics.track('entitlement_fetch_started', {});

    try {
      const customerInfo = await withTimeout(
        Purchases.getCustomerInfo(),
        'Subscription status took too long to refresh.',
      );
      const status = parseSubscriptionStatus(customerInfo);
      await persistStatus(status);
      analytics.track('entitlement_fetch_success', { source: 'live' });
      return status;
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'get_status' });
      const cachedStatus = await readCachedStatus();
      analytics.track('entitlement_fetch_failure', {
        fallback: cachedStatus ? 'cache' : 'default',
      });
      console.error('[Subscriptions] Failed to get subscription status:', error);
      return cachedStatus ?? buildDefaultStatus();
    }
  },

  /**
   * Initiate a subscription purchase for the given package.
   *
   * Throws `PurchaseError` for all failure modes:
   *   - `reason === 'cancelled'`   User dismissed the payment sheet (not a true error).
   *   - `reason === 'pending'`     Purchase awaiting deferred/parental approval.
   *   - `reason === 'network'`     No connectivity during purchase.
   *   - `reason === 'store'`       App Store unavailable.
   *   - `reason === 'failed'`      Unexpected failure.
   *
   * The caller should distinguish 'cancelled' from true errors to avoid
   * surfacing error UI on intentional cancellations.
   */
  async purchase(
    packageToPurchase: import('react-native-purchases').PurchasesPackage,
  ): Promise<SubscriptionStatus> {
    addBreadcrumb('Purchase started', { packageId: packageToPurchase.identifier });
    analytics.track(ANALYTICS_EVENTS.PURCHASE_START, {
      packageIdentifier: packageToPurchase.identifier,
    });

    try {
      const { customerInfo } = await withTimeout(
        Purchases.purchasePackage(packageToPurchase),
        'Purchase confirmation took too long. Please try again.',
      );
      const status = parseSubscriptionStatus(customerInfo);
      await persistStatus(status);

      addBreadcrumb('Purchase completed', {
        packageId: packageToPurchase.identifier,
        isPro: status.isPro,
      });

      if (status.isPro) {
        analytics.track(ANALYTICS_EVENTS.PURCHASE_SUCCESS, {
          packageIdentifier: packageToPurchase.identifier,
        });
        analytics.track(ANALYTICS_EVENTS.ENTITLEMENT_STATE_CHANGED, {
          isPro: true,
          source: 'purchase',
        });
        void syncEntitlementWithBackend(status);
      }

      return status;
    } catch (error) {
      const normalized = normalizePurchaseError(error, 'purchase');

      if (normalized.reason === 'cancelled') {
        addBreadcrumb('Purchase cancelled by user', { packageId: packageToPurchase.identifier });
        analytics.track(ANALYTICS_EVENTS.PURCHASE_CANCEL, {
          packageIdentifier: packageToPurchase.identifier,
        });
        // Return current status so UI can stay consistent
        return subscriptionService.getSubscriptionStatus();
      }

      addBreadcrumb('Purchase failed', {
        packageId: packageToPurchase.identifier,
        reason: normalized.reason,
      }, 'error');
      analytics.track(ANALYTICS_EVENTS.PURCHASE_FAIL, {
        packageIdentifier: packageToPurchase.identifier,
        reason: normalized.reason,
        error: normalized.message,
      });
      captureError(normalized, {
        area: 'subscriptions',
        action: 'purchase',
        packageId: packageToPurchase.identifier,
        reason: normalized.reason,
      });

      throw normalized;
    }
  },

  /**
   * Restore previous purchases for the current App Store / Play Store account.
   * Refreshes entitlement from RevenueCat and syncs to backend on success.
   *
   * Throws `PurchaseError` (reason: 'network' | 'store' | 'failed') on failure.
   */
  async restorePurchases(): Promise<SubscriptionStatus> {
    if (!initialized) {
      return (await readCachedStatus()) ?? buildDefaultStatus();
    }

    addBreadcrumb('Restore purchases started');
    analytics.track(ANALYTICS_EVENTS.RESTORE_START, {});

    try {
      const customerInfo = await withTimeout(
        Purchases.restorePurchases(),
        'Restoring purchases took too long. Please try again.',
      );
      const status = parseSubscriptionStatus(customerInfo);
      await persistStatus(status);

      addBreadcrumb('Restore completed', { isPro: status.isPro });
      analytics.track(ANALYTICS_EVENTS.RESTORE_SUCCESS, { isPro: status.isPro });

      if (status.isPro) {
        analytics.track(ANALYTICS_EVENTS.ENTITLEMENT_STATE_CHANGED, {
          isPro: true,
          source: 'restore',
        });
        void syncEntitlementWithBackend(status);
      }

      return status;
    } catch (error) {
      const normalized = normalizePurchaseError(error, 'restore');

      addBreadcrumb('Restore failed', { reason: normalized.reason }, 'error');
      analytics.track(ANALYTICS_EVENTS.RESTORE_FAIL, {
        reason: normalized.reason,
        error: normalized.message,
      });
      captureError(normalized, {
        area: 'subscriptions',
        action: 'restore_purchases',
        reason: normalized.reason,
      });

      throw normalized;
    }
  },
};

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

function parseSubscriptionStatus(customerInfo: CustomerInfo): SubscriptionStatus {
  const entitlementInfo = customerInfo.entitlements.active[ENTITLEMENT_ID];
  const isPro = entitlementInfo != null;
  const entitlements = Object.keys(customerInfo.entitlements.active);

  return {
    isPro,
    entitlements,
    activeSubscription: entitlementInfo?.productIdentifier,
    expirationDate: entitlementInfo?.expirationDate ?? undefined,
    isStale: false,
    source: 'live',
    lastValidatedAt: new Date().toISOString(),
  };
}
