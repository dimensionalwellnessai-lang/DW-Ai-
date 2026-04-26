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
 *
 * Implemented on top of the generic `usePrefSync` so other settings
 * surfaces (theme, voice, analytics opt-out, etc.) can reuse the same
 * status-tracking logic without reinventing per-page state.
 */

import { apiRequest, queryClient } from "@/lib/queryClient";
import type { NotificationPreferences } from "@shared/schema";
import type { SyncStatus } from "@/components/sync-indicator";
import { usePrefSync } from "@/hooks/use-pref-sync";

export type PrefField = keyof NotificationPreferences;

export interface PrefsSync {
  /** Persist a partial update. The first field key in `updates` is treated
   * as the "active" field for indicator placement. */
  update: (updates: Partial<NotificationPreferences>) => void;
  statusFor: (field: PrefField) => { status: SyncStatus; error: string | null };
  isPending: boolean;
}

export function useAccountabilityPrefsSync(): PrefsSync {
  const sync = usePrefSync<PrefField>({
    errorMessage:
      "Couldn't save to the server. Check your connection and try again.",
    logTag: "accountability-prefs",
  });

  const update = (updates: Partial<NotificationPreferences>) => {
    const keys = Object.keys(updates) as PrefField[];
    const field = keys[0];
    if (!field) return;
    void sync.run(field, async () => {
      const res = await apiRequest(
        "PUT",
        "/api/accountability/preferences",
        updates,
      );
      const next = await res.json();
      queryClient.setQueryData(["/api/accountability/preferences"], next);
      queryClient.invalidateQueries({
        queryKey: ["/api/accountability/preferences"],
      });
    });
  };

  return { update, statusFor: sync.statusFor, isPending: sync.isPending };
}
