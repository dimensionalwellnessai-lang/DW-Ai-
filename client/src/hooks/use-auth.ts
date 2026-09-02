import { useQuery, useQueryClient } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/queryClient";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  systemName?: string;
  role?: "user" | "admin";
  onboardingCompleted?: boolean;
  onboardingVersion?: "v1" | "v2" | null;
  onboardingCompletedAt?: string | null;
  onboardingSource?: "new_user" | "manual_restart" | null;
  /**
   * Persisted language preference (BCP-47, e.g. "en", "pt-br"). When set,
   * the client hydrates `useLanguage()` from this value on first paint so
   * the user doesn't see English first if they've already chosen another
   * language on a different device. May be null/undefined if the user has
   * never picked a language explicitly.
   */
  language?: string | null;
  /** ISO timestamp of the last time the user was seen active. Used for lifecycle routing. */
  lastActiveAt?: string | null;
}

export interface AuthData {
  user: AuthUser;
}

/**
 * Centralized auth hook for managing user authentication state.
 * Uses React Query to fetch and cache auth data from /api/auth/me.
 */
export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery<AuthData | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
    staleTime: STALE_TIME.AUTH,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<AuthData | null> => {
      try {
        const response = await fetch("/api/auth/me", {
          credentials: "include",
        });

        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          return null;
        }

        const data: AuthData = await response.json();
        return data;
      } catch {
        return null;
      }
    },
  });

  const invalidateAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = async () => {
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });

      if (!res.ok) {
        throw new Error(`Logout request failed with status ${res.status} ${res.statusText}`);
      }
      
      // Clear auth cache and redirect
      queryClient.setQueryData(["/api/auth/me"], null);
      invalidateAuth();
      
      // Redirect to home
      window.location.href = "/";
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  };

  return {
    user: data?.user ?? null,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
    refetch,
    invalidateAuth,
    logout,
  };
}
