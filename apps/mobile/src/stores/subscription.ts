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
}

interface SubscriptionActions {
  fetchStatus: () => Promise<void>;
  fetchOffering: () => Promise<void>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restorePurchases: () => Promise<void>;
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

  fetchStatus: async () => {
    set({ isLoading: true, error: null });
    try {
      const status = await subscriptionService.getSubscriptionStatus();
      set({ status, isLoading: false });
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
      set({ offering });
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
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to restore purchases.',
        isRestoring: false,
      });
    }
  },

  clearError: () => set({ error: null }),
}));
