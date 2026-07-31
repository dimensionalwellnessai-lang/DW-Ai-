/**
 * Subscription store for DW.ai mobile app.
 */

import { create } from 'zustand';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';
import { subscriptionService, type SubscriptionStatus } from '../services/subscriptions';

interface SubscriptionState {
  status: SubscriptionStatus;
  offering: PurchasesOffering | null;
  isLoading: boolean;
  isPurchasing: boolean;
  isRestoring: boolean;
  error: string | null;
  warning: string | null;
}

interface SubscriptionActions {
  fetchStatus: () => Promise<void>;
  fetchOffering: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<boolean>;
  clearError: () => void;
}

type SubscriptionStore = SubscriptionState & SubscriptionActions;

export const useSubscriptionStore = create<SubscriptionStore>((set) => ({
  status: { isPro: false, entitlements: [] },
  offering: null,
  isLoading: false,
  isPurchasing: false,
  isRestoring: false,
  error: null,
  warning: null,

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      set({
        status,
        warning: status.isStale
          ? 'Subscription access was restored from your last known state while we retry the service.'
          : null,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to load subscription status.',
        isLoading: false,
      });
    }
  },

  fetchOffering: async () => {
    try {
      const offering = await subscriptionService.fetchOfferings();
      set({
        offering,
        warning: offering
          ? null
          : 'Subscription plans are temporarily unavailable. Your current access stays unchanged.',
      });
    } catch (error) {
      console.error('[SubscriptionStore] Failed to fetch offering:', error);
    }
  },

  purchase: async (pkg: PurchasesPackage): Promise<boolean> => {
    set({ isPurchasing: true, error: null });
    try {
      const status = await subscriptionService.purchase(pkg);
      set({ status, isPurchasing: false });
      return status.isPro;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Purchase failed. Please try again.';
      set({ error: message, isPurchasing: false });
      return false;
    }
  },

  restorePurchases: async () => {
    set({ isRestoring: true, error: null });
    try {
      const status = await subscriptionService.restorePurchases();
      set({ status, isRestoring: false });
      return status.isPro;
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to restore purchases.',
        isRestoring: false,
      });
      return false;
    }
  },

  clearError: () => set({ error: null, warning: null }),
}));
