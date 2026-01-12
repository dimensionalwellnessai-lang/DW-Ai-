import { useQuery } from "@tanstack/react-query";

export type UserRole = "user" | "admin";

export function useUserRole() {
  const { data, isLoading, error } = useQuery<{ role: UserRole }>({
    queryKey: ["/api/auth/role"],
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  return {
    role: data?.role ?? "user",
    isAdmin: data?.role === "admin",
    isLoading,
    isAuthenticated: !error && !!data,
  };
}
