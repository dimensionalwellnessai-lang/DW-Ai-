import { useQuery, useQueryClient } from "@tanstack/react-query";

export interface AuthUser {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  systemName?: string;
  role?: "user" | "admin";
  onboardingCompleted?: boolean;
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
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
    queryFn: async (): Promise<AuthData | null> => {
      const response = await fetch("/api/auth/me", {
        credentials: "include",
      });

      if (response.status === 401) {
        // Unauthenticated: represent as null auth state, not an error
        return null;
      }

      if (!response.ok) {
        throw new Error(`Failed to fetch auth status: ${response.status}`);
      }

      const data: AuthData = await response.json();
      return data;
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
