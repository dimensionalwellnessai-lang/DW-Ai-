import { useQuery } from "@tanstack/react-query";
import { Redirect } from "wouter";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle } from "lucide-react";

interface AdminRouteProps {
  children: React.ReactNode;
}

export function AdminRoute({ children }: AdminRouteProps) {
  const { data, isLoading, error } = useQuery<{ role: string }>({
    queryKey: ["/api/auth/role"],
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <div className="space-y-4 w-64">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
    );
  }

  if (error) {
    return <Redirect to="/login" />;
  }

  if (data?.role !== "admin") {
    return (
      <div className="p-6 text-center" data-testid="admin-not-authorized">
        <AlertTriangle className="h-12 w-12 mx-auto text-red-400 mb-4" />
        <h1 className="text-xl font-bold text-white mb-2">Not Authorized</h1>
        <p className="text-slate-400">
          You don't have permission to access this page.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
