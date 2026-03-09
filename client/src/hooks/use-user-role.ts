import { useQuery } from "@tanstack/react-query";
import { STALE_TIME } from "@/lib/queryClient";

export type UserRole = "user" | "admin";

export function useUserRole() {
  const { data, isLoading, error } = useQuery<{ role: UserRole }>({
    queryKey: ["/api/auth/role"],
    retry: false,
    staleTime: STALE_TIME.MEDIUM,
  });

  return {
    role: data?.role ?? "user",
    isAdmin: data?.role === "admin",
    isLoading,
    isAuthenticated: !error && !!data,
  };
}
