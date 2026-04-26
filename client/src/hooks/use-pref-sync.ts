/**
 * usePrefSync
 *
 * Generic per-field save tracker for preference controls. Multiple controls
 * on the same screen typically share the indicator state — only the field
 * that initiated the most recent save reports a non-idle status — so the
 * `<SyncIndicator />` only renders next to the relevant input.
 *
 * Consumers pass any async (or sync) save function via `run(field, action)`.
 * The hook records pending/saved/error transitions, auto-clears the "saved"
 * state after a few seconds, and exposes `statusFor(field)` for the
 * indicator.
 *
 * `useAccountabilityPrefsSync` is built on top of this for the
 * accountability-preferences PUT endpoint and is preserved for back-compat;
 * other surfaces (settings page, theme selector, voice settings, etc.) call
 * `usePrefSync` directly with their own save functions.
 */

import { useEffect, useRef, useState } from "react";
import type { SyncStatus } from "@/components/sync-indicator";

export interface PrefSync<F extends string = string> {
  /** Run an async save under the given field key. Sync functions also work. */
  run: (field: F, action: () => unknown | Promise<unknown>) => Promise<void>;
  /** Look up the current sync status for a specific field. Only the field
   * whose save is currently in flight (or just completed/failed) reports
   * a non-idle status. */
  statusFor: (field: F) => { status: SyncStatus; error: string | null };
  isPending: boolean;
}

export interface UsePrefSyncOptions {
  /** Inline message shown when an action throws. */
  errorMessage?: string;
  /** Milliseconds to keep the "Saved" indicator visible. */
  savedClearMs?: number;
  /** Optional console tag for failures. */
  logTag?: string;
}

export function usePrefSync<F extends string = string>(
  opts: UsePrefSyncOptions = {},
): PrefSync<F> {
  const errorMessage =
    opts.errorMessage ?? "Couldn't save your change. Please try again.";
  const savedClearMs = opts.savedClearMs ?? 3000;
  const logTag = opts.logTag ?? "pref-sync";

  const [activeField, setActiveField] = useState<F | null>(null);
  const [status, setStatus] = useState<SyncStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  // Track the most recent run so a stale resolution can't overwrite a newer
  // save's "saving" state.
  const runIdRef = useRef(0);

  useEffect(() => {
    if (status !== "saved") return;
    const id = setTimeout(() => setStatus("idle"), savedClearMs);
    return () => clearTimeout(id);
  }, [status, savedClearMs]);

  const run: PrefSync<F>["run"] = async (field, action) => {
    const runId = ++runIdRef.current;
    setActiveField(field);
    setError(null);
    setStatus("saving");
    setPendingCount((c) => c + 1);
    try {
      await action();
      if (runIdRef.current === runId) {
        setStatus("saved");
        setError(null);
      }
    } catch (err) {
      console.error(`[${logTag}] save failed (${field}):`, err);
      if (runIdRef.current === runId) {
        setStatus("error");
        setError(errorMessage);
      }
    } finally {
      setPendingCount((c) => Math.max(0, c - 1));
    }
  };

  const statusFor = (field: F) => {
    if (activeField !== field) {
      return { status: "idle" as SyncStatus, error: null };
    }
    return { status, error };
  };

  return { run, statusFor, isPending: pendingCount > 0 };
}
