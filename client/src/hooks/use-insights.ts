/**
 * useInsights – cross-device persistence hook for Conversation Insight Cards.
 *
 * - Authenticated users: reads/writes via backend API (cross-device).
 * - Guest users: reads/writes via localStorage (local only).
 *
 * Also runs a one-time migration from localStorage → backend on first login.
 * Both the backend query and migration are gated on the CONVERSATION_INSIGHTS
 * feature flag so they only run when the feature is active.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import {
  getInsights,
  saveInsight as saveInsightLocal,
  updateInsight as updateInsightLocal,
  deleteInsight as deleteInsightLocal,
  recordNotHelpful as recordNotHelpfulLocal,
  type Insight,
} from "@/core/conversationInsights";

// localStorage flag set after a successful migration so it runs only once per user.
function migrationFlagKey(userId: string): string {
  return `dw_insights_migrated:${userId}`;
}

/**
 * Mutable fields for an insight update.
 * `pinnedAt` can be null to explicitly clear the timestamp (unpin).
 */
export type InsightPatch = Omit<Partial<Insight>, "pinnedAt"> & { pinnedAt?: number | null };

// ─── API helpers ──────────────────────────────────────────────────────────────

/** Maps a backend ConversationInsight row to the client-side Insight shape. */
function rowToInsight(row: Record<string, unknown>): Insight {
  return {
    id: row.id as string,
    createdAt: row.createdAt instanceof Date
      ? (row.createdAt as Date).getTime()
      : typeof row.createdAt === "string"
        ? new Date(row.createdAt).getTime()
        : (row.createdAt as number),
    source: row.source as Insight["source"],
    category: row.category as Insight["category"],
    title: row.title as string,
    summary: row.summary as string,
    pinned: (row.pinned as boolean) ?? false,
    pinnedAt: row.pinnedAt != null
      ? (row.pinnedAt instanceof Date
        ? (row.pinnedAt as Date).getTime()
        : typeof row.pinnedAt === "string"
          ? new Date(row.pinnedAt).getTime()
          : (row.pinnedAt as number))
      : undefined,
  };
}

/** Throws if the response is not OK so callers' `.catch()` rollbacks fire. */
async function checkOk(res: Response): Promise<Response> {
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    throw new Error(`${res.status}: ${text}`);
  }
  return res;
}

async function fetchInsights(): Promise<Insight[]> {
  const res = await fetch("/api/insights", { credentials: "include" });
  if (!res.ok) return [];
  const rows: Record<string, unknown>[] = await res.json();
  return rows.filter((r) => !r.hidden).map(rowToInsight);
}

async function apiCreate(insight: Insight): Promise<void> {
  const res = await fetch("/api/insights", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      id: insight.id,
      category: insight.category,
      title: insight.title,
      summary: insight.summary,
      source: insight.source,
      pinned: insight.pinned ?? false,
      pinnedAt: insight.pinnedAt != null ? new Date(insight.pinnedAt).toISOString() : null,
      hidden: false,
      createdAt: new Date(insight.createdAt).toISOString(),
    }),
  });
  await checkOk(res);
}

async function apiUpdate(id: string, patch: InsightPatch & { hidden?: boolean }): Promise<void> {
  const res = await fetch(`/api/insights/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
  await checkOk(res);
}

async function apiDelete(id: string): Promise<void> {
  const res = await fetch(`/api/insights/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
  await checkOk(res);
}

async function apiBulkUpsert(insights: Insight[]): Promise<void> {
  const res = await fetch("/api/insights/bulk", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      insights: insights.map((i) => ({
        id: i.id,
        category: i.category,
        title: i.title,
        summary: i.summary,
        source: i.source,
        pinned: i.pinned ?? false,
        pinnedAt: i.pinnedAt != null ? new Date(i.pinnedAt).toISOString() : null,
        hidden: false,
        createdAt: new Date(i.createdAt).toISOString(),
      })),
    }),
  });
  await checkOk(res);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights() {
  const { isAuthenticated, user } = useAuth();
  const queryClient = useQueryClient();
  const migrationAttempted = useRef(false);

  const featureOn = isFeatureEnabled("CONVERSATION_INSIGHTS");

  // ── Guest: local state ────────────────────────────────────────────────────
  const [localInsights, setLocalInsights] = useState<Insight[]>(() =>
    featureOn && !isAuthenticated ? getInsights() : []
  );

  const refreshLocal = useCallback(() => {
    setLocalInsights(getInsights());
  }, []);

  // ── Authenticated: backend via React Query ─────────────────────────────────
  const { data: backendInsights, refetch: refetchBackend } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
    queryFn: fetchInsights,
    // Only run backend query when the user is authenticated AND the feature is on
    enabled: isAuthenticated && featureOn,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
  });

  // ── Migration: once per authenticated user ────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !featureOn || !user?.id) return;
    if (migrationAttempted.current) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(migrationFlagKey(user.id))) return;

    migrationAttempted.current = true;

    const localData = getInsights();
    if (localData.length === 0) {
      localStorage.setItem(migrationFlagKey(user.id), "true");
      return;
    }

    apiBulkUpsert(localData)
      .then(() => {
        localStorage.setItem(migrationFlagKey(user.id), "true");
        queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      })
      .catch(() => {
        // Migration failed silently – will retry on next session if flag not set
        migrationAttempted.current = false;
      });
  }, [isAuthenticated, featureOn, user?.id, queryClient]);

  // ── Unified helpers ────────────────────────────────────────────────────────

  const insights: Insight[] = isAuthenticated && featureOn
    ? (backendInsights ?? [])
    : featureOn
      ? localInsights
      : [];

  const refresh = useCallback(() => {
    if (isAuthenticated && featureOn) {
      refetchBackend();
    } else if (featureOn) {
      refreshLocal();
    }
  }, [isAuthenticated, featureOn, refetchBackend, refreshLocal]);

  // captureInsight: fire-and-forget – safe to call from talk-it-out
  const captureInsight = useCallback((insight: Insight): void => {
    if (!featureOn) return;
    if (!isAuthenticated) {
      saveInsightLocal(insight);
      refreshLocal();
      return;
    }
    // Optimistic local update
    queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) => [insight, ...prev]);
    apiCreate(insight).catch(() => {
      // Roll back optimistic update on failure
      queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) =>
        prev.filter((i) => i.id !== insight.id)
      );
    });
  }, [featureOn, isAuthenticated, queryClient, refreshLocal]);

  const updateInsight = useCallback((id: string, patch: InsightPatch): void => {
    // Normalize pinnedAt: null → undefined for localStorage (Insight type uses undefined)
    const localPatch: Partial<Insight> = {
      ...patch,
      pinnedAt: patch.pinnedAt == null ? undefined : patch.pinnedAt,
    };
    if (!isAuthenticated) {
      updateInsightLocal(id, localPatch);
      refreshLocal();
      return;
    }
    // For optimistic update, use the same normalized patch
    queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) =>
      prev.map((i) => (i.id === id ? { ...i, ...localPatch } : i))
    );
    // Send raw patch to API so pinnedAt: null explicitly clears the DB column
    apiUpdate(id, patch).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    });
  }, [isAuthenticated, queryClient, refreshLocal]);

  const deleteInsight = useCallback((id: string): void => {
    if (!isAuthenticated) {
      deleteInsightLocal(id);
      refreshLocal();
      return;
    }
    // Optimistic
    queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) =>
      prev.filter((i) => i.id !== id)
    );
    apiDelete(id).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    });
  }, [isAuthenticated, queryClient, refreshLocal]);

  const pinInsight = useCallback((id: string): void => {
    updateInsight(id, { pinned: true, pinnedAt: Date.now() });
  }, [updateInsight]);

  const unpinInsight = useCallback((id: string): void => {
    // Use null (not undefined) so JSON.stringify sends the field and the server clears pinnedAt
    updateInsight(id, { pinned: false, pinnedAt: null });
  }, [updateInsight]);

  const recordNotHelpful = useCallback((insight: Insight): void => {
    if (!isAuthenticated) {
      recordNotHelpfulLocal(insight);
      refreshLocal();
      return;
    }
    // Hide on backend (soft delete), remove from local cache
    queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) =>
      prev.filter((i) => i.id !== insight.id)
    );
    apiUpdate(insight.id, { hidden: true }).catch(() => {
      queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
    });
  }, [isAuthenticated, queryClient, refreshLocal]);

  return {
    insights,
    refresh,
    captureInsight,
    updateInsight,
    deleteInsight,
    pinInsight,
    unpinInsight,
    recordNotHelpful,
  };
}
