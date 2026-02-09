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
  });

  const invalidateAuth = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
      
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
