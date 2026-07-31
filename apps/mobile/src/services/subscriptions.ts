/**
 * RevenueCat subscription service for DW.ai mobile app.
 * Handles iOS/Android in-app purchases with entitlement gating and degraded-mode caching.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import Purchases, {
  type PurchasesOffering,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { Config } from '../config/env';
import { analytics } from './analytics';
import { captureError } from './monitoring';

export const ENTITLEMENT_ID = 'dw_plus';
const SUBSCRIPTION_CACHE_KEY = 'dw_subscription_status';
const SUBSCRIPTION_TIMEOUT_MS = 15_000;

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

let initialized = false;

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

export const subscriptionService = {
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

      await withTimeout(Purchases.configure({ apiKey }), 'Subscription service initialization timed out.');
      initialized = true;
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'initialize' });
      console.error('[Subscriptions] Failed to initialize RevenueCat:', error);
    }
  },

  async identifyUser(userId: string): Promise<void> {
    if (!initialized) return;
    try {
      await withTimeout(Purchases.logIn(userId), 'Subscription identity sync timed out.');
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'identify_user' });
      console.error('[Subscriptions] Failed to identify user:', error);
    }
  },

  async resetUser(): Promise<void> {
    if (!initialized) return;
    try {
      await withTimeout(Purchases.logOut(), 'Subscription logout timed out.');
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'reset_user' });
      console.error('[Subscriptions] Failed to reset user:', error);
    }
  },

  async fetchOfferings(): Promise<PurchasesOffering | null> {
    if (!initialized) return null;
    try {
      const offerings = await withTimeout(
        Purchases.getOfferings(),
        'Loading subscription plans took too long. Please try again.',
      );
      return offerings.current;
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'fetch_offerings' });
      console.error('[Subscriptions] Failed to fetch offerings:', error);
      return null;
    }
  },

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

  async purchase(
    packageToPurchase: import('react-native-purchases').PurchasesPackage,
  ): Promise<SubscriptionStatus> {
    analytics.track('purchase_attempt', {
      packageIdentifier: packageToPurchase.identifier,
    });

    try {
      const { customerInfo } = await withTimeout(
        Purchases.purchasePackage(packageToPurchase),
        'Purchase confirmation took too long. Please try again.',
      );
      const status = parseSubscriptionStatus(customerInfo);
      await persistStatus(status);

      if (status.isPro) {
        analytics.track('purchase_success', {
          packageIdentifier: packageToPurchase.identifier,
        });
      }

      return status;
    } catch (error) {
      if (error instanceof Error && 'userCancelled' in (error as unknown as Record<string, unknown>)) {
        analytics.track('purchase_cancel', {
          packageIdentifier: packageToPurchase.identifier,
        });
        return await subscriptionService.getSubscriptionStatus();
      }

      analytics.track('purchase_failure', {
        packageIdentifier: packageToPurchase.identifier,
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      });

      throw error;
    }
  },

  async restorePurchases(): Promise<SubscriptionStatus> {
    if (!initialized) {
      return (await readCachedStatus()) ?? buildDefaultStatus();
    }

    analytics.track('restore_purchases_attempt', {});

    try {
      const customerInfo = await withTimeout(
        Purchases.restorePurchases(),
        'Restoring purchases took too long. Please try again.',
      );
      const status = parseSubscriptionStatus(customerInfo);
      await persistStatus(status);

      analytics.track('restore_purchases_success', {
        isPro: status.isPro,
      });

      return status;
    } catch (error) {
      captureError(error, { area: 'subscriptions', action: 'restore_purchases' });
      analytics.track('restore_purchases_failure', {
        errorClass: error instanceof Error ? error.name : 'UnknownError',
      });
      throw error;
    }
  },
};

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
