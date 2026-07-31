/**
 * Auth store for DW.ai mobile app.
 * Manages authentication state and session persistence.
 */

import { create } from 'zustand';
import type { User } from '../services/auth';
import { authService } from '../services/auth';
import { analytics, ANALYTICS_EVENTS } from '../services/analytics';
import { setUserContext, clearUserContext } from '../services/monitoring';
import { subscriptionService } from '../services/subscriptions';
import { revalidateEntitlement, invalidateEntitlementCache } from '../services/entitlement';

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
}

interface AuthActions {
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  updateUser: (user: Partial<User>) => void;
}

type AuthStore = AuthState & AuthActions;

export const useAuthStore = create<AuthStore>((set, get) => ({
  user: null,
  isLoading: false,
  isInitialized: false,
  error: null,

  initialize: async () => {
    set({ isLoading: true });
    try {
      const user = await authService.getMe();
      if (user) {
        analytics.identify(user.id, { email: user.email });
        setUserContext(user.id, user.email);
        await subscriptionService.identifyUser(user.id);
      }
      // Revalidate entitlement on every app startup
      await revalidateEntitlement();
      set({ user, isInitialized: true, isLoading: false });
    } catch {
      set({ user: null, isInitialized: true, isLoading: false });
    }
  },

  login: async (email: string, password: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.login({ email, password });
      analytics.identify(user.id, { email: user.email });
      setUserContext(user.id, user.email);
      await subscriptionService.identifyUser(user.id);
      // Revalidate entitlement after login so premium gating reflects the signed-in user
      await revalidateEntitlement();
      analytics.track(ANALYTICS_EVENTS.AUTH_LOGIN_SUCCESS, { method: 'email' });
      set({ user, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed. Please try again.';
      analytics.track(ANALYTICS_EVENTS.AUTH_LOGIN_FAILURE, { error: message });
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  register: async (email: string, password: string, username?: string) => {
    set({ isLoading: true, error: null });
    try {
      const user = await authService.register({ email, password, username });
      analytics.identify(user.id, { email: user.email });
      setUserContext(user.id, user.email);
      await subscriptionService.identifyUser(user.id);
      // New user starts without a subscription — revalidate to set correct initial state
      await revalidateEntitlement();
      analytics.track(ANALYTICS_EVENTS.AUTH_REGISTER_SUCCESS, { method: 'email' });
      set({ user, isLoading: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Registration failed. Please try again.';
      analytics.track(ANALYTICS_EVENTS.AUTH_REGISTER_FAILURE, { error: message });
      set({ error: message, isLoading: false });
      throw error;
    }
  },

  logout: async () => {
    set({ isLoading: true });
    try {
      await authService.logout();
      clearUserContext();
      analytics.reset();
      await subscriptionService.resetUser();
      // Clear the entitlement cache so the next session starts clean
      invalidateEntitlementCache();
      analytics.track(ANALYTICS_EVENTS.AUTH_LOGOUT, {});
    } finally {
      set({ user: null, isLoading: false });
    }
  },

  clearError: () => set({ error: null }),

  updateUser: (updates: Partial<User>) => {
    const { user } = get();
    if (user) {
      set({ user: { ...user, ...updates } });
    }
  },
}));
