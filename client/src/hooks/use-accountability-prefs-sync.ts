/**
 * useAccountabilityPrefsSync
 *
 * Shared mutation wrapper for the `/api/accountability/preferences` PUT
 * endpoint that surfaces a per-field sync status (saving / saved / error)
 * suitable for inline `<SyncIndicator />`s. Multiple preference controls
 * share the same mutation, so we track which field initiated the most
 * recent save and expose `statusFor(field)` to render the indicator only
 * next to the relevant control.
 *
 * On success, the cache for `/api/accountability/preferences` is updated
 * with the server response and re-queried so other consumers (e.g. the
 * accountability scheduler) pick up the change. On failure, the indicator
 * surfaces an inline message instead of silently logging — failures should
 * never disappear into the console.
 */

import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationPreferences } from "@shared/schema";
import type { SyncStatus } from "@/components/sync-indicator";

export type PrefField = keyof NotificationPreferences;

export interface PrefsSync {
  /** Persist a partial update. The first field key in `updates` is treated
   * as the "active" field for indicator placement. */
  update: (updates: Partial<NotificationPreferences>) => void;
  /** Look up the current sync status for a specific field. Only the field
   * whose update is currently in flight (or just completed/failed) reports
   * a non-idle status. */
  statusFor: (field: PrefField) => { status: SyncStatus; error: string | null };
  isPending: boolean;
}

export function useAccountabilityPrefsSync(): PrefsSync {
  const [activeField, setActiveField] = useState<PrefField | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (updates: Partial<NotificationPreferences>) => {
      const res = await apiRequest(
        "PUT",
        "/api/accountability/preferences",
        updates,
      );
      return res.json();
    },
    onSuccess: (next) => {
      queryClient.setQueryData(["/api/accountability/preferences"], next);
      queryClient.invalidateQueries({
        queryKey: ["/api/accountability/preferences"],
      });
      setStatus("saved");
      setError(null);
    },
    onError: (err: unknown) => {
      console.error("[accountability-prefs] save failed:", err);
      setStatus("error");
      setError(
        "Couldn't save to the server. Check your connection and try again.",
      );
    },
  });

  // Auto-clear the transient "Synced" indicator a few seconds after a
  // successful save so it doesn't linger forever.
  useEffect(() => {
    if (status !== "saved") return;
    const id = setTimeout(() => setStatus("idle"), 3000);
    return () => clearTimeout(id);
  }, [status]);

  const update = (updates: Partial<NotificationPreferences>) => {
    const keys = Object.keys(updates) as PrefField[];
    setActiveField(keys[0] ?? null);
    setError(null);
    setStatus("saving");
    mutation.mutate(updates);
  };

  const statusFor = (field: PrefField) => {
    if (activeField !== field) return { status: "idle" as SyncStatus, error: null };
    return { status, error };
  };

  return { update, statusFor, isPending: mutation.isPending };
}
