/**
 * Subscription store for DW.ai mobile app.
 *
 * Thin orchestration layer between the UI and `subscriptionService` /
 * `entitlementService`.  Components should read from this store and call its
 * actions; they should NOT call service functions directly.
 */

import { create } from 'zustand';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { subscriptionService, type SubscriptionStatus, PurchaseError } from '../services/subscriptions';
import { revalidateEntitlement } from '../services/entitlement';

interface SubscriptionState {
  status: SubscriptionStatus;
  offering: PurchasesOffering | null;

  /** True while the initial status or offering fetch is in progress. */
  isLoading: boolean;
  /** True while a purchase flow is active. */
  isPurchasing: boolean;
  /** True while a restore flow is active. */
  isRestoring: boolean;

  /**
   * Generic error message for status/offering fetch failures.
   * Use `purchaseError` and `restoreError` for typed purchase/restore errors.
   */
  error: string | null;

  /** Non-blocking degraded-mode notice (e.g., stale cached entitlement). */
  warning: string | null;

  /** Typed error from the most recent purchase attempt. */
  purchaseError: PurchaseError | null;

  /** Error message from the most recent restore attempt. */
  restoreError: string | null;

  /** Unix timestamp (ms) of the last successful entitlement validation. */
  entitlementLastValidated: number | null;
}

interface SubscriptionActions {
  /** Fetch entitlement status from RevenueCat (uses cached value with fallback). */
  fetchStatus: () => Promise<void>;
  /** Fetch the current offering (paywall packages). */
  fetchOffering: () => Promise<void>;
  /**
   * Initiate a purchase.
   * Returns `true` if the user is now a Pro subscriber.
   * Returns `false` on cancellation (not an error — caller need not show error UI).
   * Throws `PurchaseError` for other failures so the caller can react to the reason.
   */
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  /** Restore previous purchases. Returns the updated status. */
  restorePurchases: () => Promise<SubscriptionStatus>;
  clearError: () => void;
  clearPurchaseError: () => void;
  clearRestoreError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>((set, get) => ({
  status: { isPro: false, entitlements: [] },
  offering: null,
  isLoading: false,
  isPurchasing: false,
  isRestoring: false,
  error: null,
  warning: null,
  purchaseError: null,
  restoreError: null,
  entitlementLastValidated: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await revalidateEntitlement();
      set({
        status,
        warning: status.isStale
          ? 'Subscription access was restored from your last known state while we retry the service.'
          : null,
        isLoading: false,
        entitlementLastValidated: Date.now(),
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load subscription status.',
        isLoading: false,
      });
    }
  },

  fetchOffering: async () => {
    set({ error: null });
    try {
      const offering = await subscriptionService.fetchOfferings();
      set({
        offering,
        warning: offering
          ? null
          : 'Subscription plans are temporarily unavailable. Your current access stays unchanged.',
      });
    } catch (error) {
      const message =
        error instanceof PurchaseError
          ? error.message
          : 'Could not load subscription plans. Please try again.';
      set({ error: message });
      // Re-throw so React Query's retry / error boundary can handle it
      throw error;
    }
  },

  purchase: async (pkg: PurchasesPackage): Promise<boolean> => {
    // Idempotency guard — block re-entrant purchases
    if (get().isPurchasing) return false;

    set({ isPurchasing: true, purchaseError: null });
    try {
      const status = await subscriptionService.purchase(pkg);
      set({ status, isPurchasing: false, entitlementLastValidated: Date.now() });
      return status.isPro;
    } catch (error) {
      if (error instanceof PurchaseError && error.reason === 'cancelled') {
        // User cancelled intentionally — not an error state
        set({ isPurchasing: false });
        return false;
      }

      const purchaseError =
        error instanceof PurchaseError
          ? error
          : new PurchaseError(
              error instanceof Error ? error.message : 'Purchase failed. Please try again.',
              'failed',
              error,
            );

      set({ purchaseError, isPurchasing: false });
      throw purchaseError;
    }
  },

  restorePurchases: async (): Promise<SubscriptionStatus> => {
    set({ isRestoring: true, restoreError: null });
    try {
      const status = await subscriptionService.restorePurchases();
      set({ status, isRestoring: false, entitlementLastValidated: Date.now() });
      return status;
    } catch (error) {
      const message =
        error instanceof PurchaseError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Failed to restore purchases. Please try again.';
      set({ restoreError: message, isRestoring: false });
      throw error;
    }
  },

  clearError: () => set({ error: null, warning: null }),
  clearPurchaseError: () => set({ purchaseError: null }),
  clearRestoreError: () => set({ restoreError: null }),
}));
