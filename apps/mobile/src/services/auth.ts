/**
 * Auth service for DW.ai mobile app.
 */

import { api, clearSession } from './api';

export interface User {
  id: string;
  email: string;
  username?: string;
  subscriptionTier: 'free' | 'plus';
  subscriptionStatus?: string;
  displayName?: string;
  profileImageUrl?: string;
  createdAt?: string;
}

export interface AuthResponse {
  user: User;
  message?: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterCredentials {
  email: string;
  password: string;
  username?: string;
}

export const authService = {
  /**
   * Sign in with email and password.
   */
  async login(credentials: LoginCredentials): Promise<User> {
    const response = await api.post<AuthResponse>('/api/auth/login', credentials);
    return response.user;
  },

  /**
   * Register a new account.
   */
  async register(credentials: RegisterCredentials): Promise<User> {
    const response = await api.post<AuthResponse>('/api/auth/register', credentials);
    return response.user;
  },

  /**
   * Sign out the current user.
   */
  async logout(): Promise<void> {
    try {
      await api.post('/api/auth/logout', {});
    } finally {
      await clearSession();
    }
  },

  /**
   * Fetch the currently authenticated user.
   * Returns null if not authenticated.
   */
  async getMe(): Promise<User | null> {
    try {
      return await api.get<User>('/api/auth/me');
    } catch {
      return null;
    }
  },

  /**
   * Request a password reset email.
   */
  async forgotPassword(email: string): Promise<void> {
    await api.post('/api/auth/forgot-password', { email });
  },

  /**
   * Delete the current user's account.
   */
  async deleteAccount(): Promise<void> {
    await api.delete('/api/auth/delete-account');
    await clearSession();
  },
};
