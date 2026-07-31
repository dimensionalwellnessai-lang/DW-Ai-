/**
 * RevenueCat subscription service for DW.ai mobile app.
 * Handles iOS/Android in-app purchases with entitlement gating.
 */

import Purchases, {
  type PurchasesOffering,
  type CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { Platform } from 'react-native';
import { Config } from '../config/env';
import { analytics } from './analytics';

export const ENTITLEMENT_ID = 'dw_plus';

export interface SubscriptionStatus {
  isPro: boolean;
  entitlements: string[];
  activeSubscription?: string;
  expirationDate?: string;
}

let initialized = false;

export const subscriptionService = {
  /**
   * Initialize RevenueCat SDK. Must be called at app start.
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

      await Purchases.configure({ apiKey });
      initialized = true;
    } catch (error) {
      console.error('[Subscriptions] Failed to initialize RevenueCat:', error);
    }
  },

  /**
   * Identify user with RevenueCat for cross-device sync.
   */
  async identifyUser(userId: string): Promise<void> {
    if (!initialized) return;
    try {
      await Purchases.logIn(userId);
    } catch (error) {
      console.error('[Subscriptions] Failed to identify user:', error);
    }
  },

  /**
   * Reset user identity (on logout).
   */
  async resetUser(): Promise<void> {
    if (!initialized) return;
    try {
      await Purchases.logOut();
    } catch (error) {
      console.error('[Subscriptions] Failed to reset user:', error);
    }
  },

  /**
   * Fetch available subscription offerings.
   */
  async fetchOfferings(): Promise<PurchasesOffering | null> {
    if (!initialized) return null;
    try {
      const offerings = await Purchases.getOfferings();
      return offerings.current;
    } catch (error) {
      console.error('[Subscriptions] Failed to fetch offerings:', error);
      return null;
    }
  },

  /**
   * Get current subscription status and entitlements.
   */
  async getSubscriptionStatus(): Promise<SubscriptionStatus> {
    if (!initialized) {
      return { isPro: false, entitlements: [] };
    }

    try {
      const customerInfo = await Purchases.getCustomerInfo();
      return parseSubscriptionStatus(customerInfo);
    } catch (error) {
      console.error('[Subscriptions] Failed to get subscription status:', error);
      return { isPro: false, entitlements: [] };
    }
  },

  /**
   * Purchase a subscription package.
   */
  async purchase(packageToPurchase: import('react-native-purchases').PurchasesPackage): Promise<SubscriptionStatus> {
    analytics.track('paywall_purchase_attempt', {
      packageIdentifier: packageToPurchase.identifier,
    });

    try {
      const { customerInfo } = await Purchases.purchasePackage(packageToPurchase);
      const status = parseSubscriptionStatus(customerInfo);

      if (status.isPro) {
        analytics.track('paywall_purchase_success', {
          packageIdentifier: packageToPurchase.identifier,
        });
      }

      return status;
    } catch (error) {
      if (error instanceof Error && 'userCancelled' in (error as unknown as Record<string, unknown>)) {
        analytics.track('paywall_purchase_cancelled', {
          packageIdentifier: packageToPurchase.identifier,
        });
        throw new Error('Purchase was cancelled.');
      }

      analytics.track('paywall_purchase_failure', {
        packageIdentifier: packageToPurchase.identifier,
        error: error instanceof Error ? error.message : 'Unknown error',
      });

      throw error;
    }
  },

  /**
   * Restore previous purchases.
   */
  async restorePurchases(): Promise<SubscriptionStatus> {
    if (!initialized) {
      return { isPro: false, entitlements: [] };
    }

    analytics.track('restore_purchases_attempt', {});

    try {
      const customerInfo = await Purchases.restorePurchases();
      const status = parseSubscriptionStatus(customerInfo);

      analytics.track('restore_purchases_result', {
        isPro: status.isPro,
      });

      return status;
    } catch (error) {
      console.error('[Subscriptions] Failed to restore purchases:', error);
      analytics.track('restore_purchases_failure', {
        error: error instanceof Error ? error.message : 'Unknown error',
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
  };
}
