/**
 * useInsights – cross-device persistence hook for Conversation Insight Cards.
 *
 * - Authenticated users: reads/writes via backend API (cross-device).
 * - Guest users: reads/writes via localStorage (local only).
 *
 * Also runs a one-time migration from localStorage → backend on first login.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import {
  getInsights,
  saveInsight as saveInsightLocal,
  updateInsight as updateInsightLocal,
  deleteInsight as deleteInsightLocal,
  recordNotHelpful as recordNotHelpfulLocal,
  type Insight,
} from "@/core/conversationInsights";

// localStorage flag set after a successful migration so it runs only once.
const MIGRATION_FLAG_KEY = "dw_insights_migrated";

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

async function fetchInsights(): Promise<Insight[]> {
  const res = await fetch("/api/insights", { credentials: "include" });
  if (!res.ok) return [];
  const rows: Record<string, unknown>[] = await res.json();
  return rows.filter((r) => !r.hidden).map(rowToInsight);
}

async function apiCreate(insight: Insight): Promise<void> {
  await fetch("/api/insights", {
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
      pinnedAt: insight.pinnedAt != null ? new Date(insight.pinnedAt) : null,
      hidden: false,
      createdAt: new Date(insight.createdAt),
    }),
  });
}

async function apiUpdate(id: string, patch: Partial<Insight> & { hidden?: boolean }): Promise<void> {
  await fetch(`/api/insights/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(patch),
  });
}

async function apiDelete(id: string): Promise<void> {
  await fetch(`/api/insights/${encodeURIComponent(id)}`, {
    method: "DELETE",
    credentials: "include",
  });
}

async function apiBulkUpsert(insights: Insight[]): Promise<void> {
  await fetch("/api/insights/bulk", {
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
        pinnedAt: i.pinnedAt != null ? new Date(i.pinnedAt) : null,
        hidden: false,
        createdAt: new Date(i.createdAt),
      })),
    }),
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useInsights() {
  const { isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const migrationAttempted = useRef(false);

  // ── Guest: local state ────────────────────────────────────────────────────
  const [localInsights, setLocalInsights] = useState<Insight[]>(() =>
    isAuthenticated ? [] : getInsights()
  );

  const refreshLocal = useCallback(() => {
    setLocalInsights(getInsights());
  }, []);

  // ── Authenticated: backend via React Query ─────────────────────────────────
  const { data: backendInsights, refetch: refetchBackend } = useQuery<Insight[]>({
    queryKey: ["/api/insights"],
    queryFn: fetchInsights,
    enabled: isAuthenticated,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: true,
    retry: false,
    // Fail silently – return empty array on error
    // (react-query already does this via retry: false if queryFn throws)
  });

  // ── Migration: once per authenticated session ──────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    if (migrationAttempted.current) return;
    if (typeof localStorage === "undefined") return;
    if (localStorage.getItem(MIGRATION_FLAG_KEY)) return;

    migrationAttempted.current = true;

    const localData = getInsights();
    if (localData.length === 0) {
      localStorage.setItem(MIGRATION_FLAG_KEY, "true");
      return;
    }

    apiBulkUpsert(localData)
      .then(() => {
        localStorage.setItem(MIGRATION_FLAG_KEY, "true");
        queryClient.invalidateQueries({ queryKey: ["/api/insights"] });
      })
      .catch(() => {
        // Migration failed silently – will retry on next session if flag not set
        migrationAttempted.current = false;
      });
  }, [isAuthenticated, queryClient]);

  // ── Unified helpers ────────────────────────────────────────────────────────

  const insights: Insight[] = isAuthenticated
    ? (backendInsights ?? [])
    : localInsights;

  const refresh = useCallback(() => {
    if (isAuthenticated) {
      refetchBackend();
    } else {
      refreshLocal();
    }
  }, [isAuthenticated, refetchBackend, refreshLocal]);

  // captureInsight: fire-and-forget – safe to call from talk-it-out
  const captureInsight = useCallback((insight: Insight): void => {
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
  }, [isAuthenticated, queryClient, refreshLocal]);

  const updateInsight = useCallback((id: string, patch: Partial<Insight>): void => {
    if (!isAuthenticated) {
      updateInsightLocal(id, patch);
      refreshLocal();
      return;
    }
    // Optimistic
    queryClient.setQueryData<Insight[]>(["/api/insights"], (prev = []) =>
      prev.map((i) => (i.id === id ? { ...i, ...patch } : i))
    );
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
    updateInsight(id, { pinned: false, pinnedAt: undefined });
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
