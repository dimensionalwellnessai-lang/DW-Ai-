import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { APP_VERSION } from "@/routes/registry";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";

const GUEST_KEY = `dw:whats-new:${APP_VERSION}`;

export function WhatsNewModal() {
  const [location] = useLocation();
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  const hiddenForPath = useMemo(
    () => ["/login", "/voice-onboarding", "/welcome-back", "/reset-password"].some((path) => location.startsWith(path)),
    [location],
  );

  const stateQuery = useQuery<{ seen: boolean }>({
    queryKey: ["/api/whats-new/state", APP_VERSION],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/whats-new/state?version=${encodeURIComponent(APP_VERSION)}`);
      return response.json();
    },
    enabled: !!user && !hiddenForPath,
    retry: false,
  });

  const markSeenMutation = useMutation({
    mutationFn: async () => {
      if (user) {
        await apiRequest("POST", "/api/whats-new/state", { version: APP_VERSION });
        return;
      }
      localStorage.setItem(GUEST_KEY, "seen");
    },
  });

  useEffect(() => {
    if (hiddenForPath) {
      setOpen(false);
      return;
    }

    if (user) {
      if (!stateQuery.isLoading && stateQuery.data && !stateQuery.data.seen) {
        setOpen(true);
      }
      return;
    }

    if (localStorage.getItem(GUEST_KEY) !== "seen") {
      setOpen(true);
    }
  }, [hiddenForPath, stateQuery.data, stateQuery.isLoading, user]);

  const close = async () => {
    setOpen(false);
    try {
      await markSeenMutation.mutateAsync();
    } catch {
      // Non-fatal: the modal should still close.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) void close(); }}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">What&apos;s new</Badge>
            <span className="text-xs text-muted-foreground">v{APP_VERSION}</span>
          </div>
          <DialogTitle>A few gentle upgrades are ready</DialogTitle>
          <DialogDescription>
            You&apos;ll now find a more unified discovery flow, a new space for reframing difficult moments, and clearer tracking for reminders and tours.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 text-sm text-foreground">
          <div className="rounded-lg border bg-card p-3">
            <p className="font-medium">Unified Feed</p>
            <p className="text-muted-foreground">Search, filter, and shape your feed with like, favorite, save, and hide actions.</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="font-medium">Energy Transmutation</p>
            <p className="text-muted-foreground">Bring a charged situation in and get a calmer reframe plus a grounded exercise.</p>
          </div>
          <div className="rounded-lg border bg-card p-3">
            <p className="font-medium">Steadier state tracking</p>
            <p className="text-muted-foreground">Reminders, tours, and product updates now remember where you left off more clearly.</p>
          </div>
        </div>

        <DialogFooter>
          <Button className="w-full" onClick={() => void close()}>Got it</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
