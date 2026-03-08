/**
 * useDwIntelligence – client hook for DW Insight + Journal Intelligence data.
 *
 * - Authenticated users: reads from backend API.
 * - Guests: reads from localStorage via guest-storage helpers.
 * - Both modes are gated on the JOURNAL_AUTOGEN feature flag.
 */

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import { getQueryFn, apiRequest } from "@/lib/queryClient";
import {
  getLatestGuestDwInsight,
  getLatestGuestDwJournalEntry,
  getGuestDwFollowups,
  getGuestDwInsights,
  getGuestDwJournalEntries,
  type GuestDwInsight,
  type GuestDwJournalEntry,
  type GuestDwFollowup,
} from "@/lib/guest-storage";

export interface DwInsightRecord {
  id: string;
  title: string;
  summary: string;
  quotes: string[];
  tags: string[];
  theme?: string | null;
  switchTag?: string | null;
  sourceConversationId?: string | null;
  createdAt: string | number;
}

export interface DwJournalRecord {
  id: string;
  title: string;
  story: string;
  quotes: string[];
  tags: string[];
  sourceConversationId?: string | null;
  createdAt: string | number;
}

export interface DwFollowupRecord {
  id: string;
  prompt: string;
  relatedInsightId?: string | null;
  sourceConversationId?: string | null;
  status: string;
  createdAt: string | number;
}

export interface DwIntelligence {
  latestInsight: DwInsightRecord | null;
  latestJournal: DwJournalRecord | null;
  pendingFollowups: DwFollowupRecord[];
  allInsights: DwInsightRecord[];
  allJournalEntries: DwJournalRecord[];
  isLoading: boolean;
  /** Trigger the generation pipeline for an authenticated user's conversation */
  processConversation: (payload: {
    conversationId: string;
    messages: Array<{ role: "user" | "assistant"; content: string }>;
    startIndex?: number;
  }) => Promise<void>;
  /** Refetch all DW intelligence data */
  refetch: () => void;
}

function normaliseGuestInsight(g: GuestDwInsight): DwInsightRecord {
  return {
    id: g.id,
    title: g.title,
    summary: g.summary,
    quotes: g.quotes,
    tags: g.tags,
    theme: g.theme,
    switchTag: g.switchTag,
    sourceConversationId: g.sourceConversationId,
    createdAt: g.createdAt,
  };
}

function normaliseGuestJournal(g: GuestDwJournalEntry): DwJournalRecord {
  return {
    id: g.id,
    title: g.title,
    story: g.story,
    quotes: g.quotes,
    tags: g.tags,
    sourceConversationId: g.sourceConversationId,
    createdAt: g.createdAt,
  };
}

function normaliseGuestFollowup(g: GuestDwFollowup): DwFollowupRecord {
  return {
    id: g.id,
    prompt: g.prompt,
    relatedInsightId: g.relatedInsightId,
    sourceConversationId: g.sourceConversationId,
    status: g.status,
    createdAt: g.createdAt,
  };
}

export function useDwIntelligence(): DwIntelligence {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const featureOn = isFeatureEnabled("JOURNAL_AUTOGEN");
  const qc = useQueryClient();

  // Auth: latest insight
  const { data: latestInsightDb, isLoading: insightLoading } = useQuery<DwInsightRecord | null>({
    queryKey: ["/api/dw/latestInsight"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && featureOn,
    retry: false,
    staleTime: 60_000,
  });

  // Auth: latest journal
  const { data: latestJournalDb, isLoading: journalLoading } = useQuery<DwJournalRecord | null>({
    queryKey: ["/api/dw/latestJournal"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && featureOn,
    retry: false,
    staleTime: 60_000,
  });

  // Auth: pending followups
  const { data: followupsDbRaw, isLoading: followupsLoading } = useQuery<DwFollowupRecord[] | null>({
    queryKey: ["/api/dw/followups"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && featureOn,
    retry: false,
    staleTime: 60_000,
  });
  const followupsDb = followupsDbRaw ?? [];

  // Auth: all insights
  const { data: allInsightsDbRaw, isLoading: allInsightsLoading } = useQuery<DwInsightRecord[] | null>({
    queryKey: ["/api/dw/insights"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && featureOn,
    retry: false,
    staleTime: 60_000,
  });
  const allInsightsDb = allInsightsDbRaw ?? [];

  // Auth: all journal entries
  const { data: allJournalDbRaw, isLoading: allJournalLoading } = useQuery<DwJournalRecord[] | null>({
    queryKey: ["/api/dw/journal"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    enabled: isLoggedIn && featureOn,
    retry: false,
    staleTime: 60_000,
  });
  const allJournalDb = allJournalDbRaw ?? [];

  const processConversation = useCallback(
    async (payload: {
      conversationId: string;
      messages: Array<{ role: "user" | "assistant"; content: string }>;
      startIndex?: number;
    }) => {
      if (!featureOn) return;
      if (isLoggedIn) {
        try {
          await apiRequest("POST", "/api/dw/processConversation", payload);
          qc.invalidateQueries({ queryKey: ["/api/dw/latestInsight"] });
          qc.invalidateQueries({ queryKey: ["/api/dw/latestJournal"] });
          qc.invalidateQueries({ queryKey: ["/api/dw/followups"] });
          qc.invalidateQueries({ queryKey: ["/api/dw/insights"] });
          qc.invalidateQueries({ queryKey: ["/api/dw/journal"] });
        } catch {
          // Generation failure must not break chat
        }
      }
      // Guest mode: AI generation requires authentication.
      // Guest users can sign in to have intelligence records generated and persisted.
    },
    [featureOn, isLoggedIn, qc],
  );

  const refetch = useCallback(() => {
    if (isLoggedIn) {
      qc.invalidateQueries({ queryKey: ["/api/dw/latestInsight"] });
      qc.invalidateQueries({ queryKey: ["/api/dw/latestJournal"] });
      qc.invalidateQueries({ queryKey: ["/api/dw/followups"] });
      qc.invalidateQueries({ queryKey: ["/api/dw/insights"] });
      qc.invalidateQueries({ queryKey: ["/api/dw/journal"] });
    }
  }, [isLoggedIn, qc]);

  if (!featureOn) {
    return {
      latestInsight: null,
      latestJournal: null,
      pendingFollowups: [],
      allInsights: [],
      allJournalEntries: [],
      isLoading: false,
      processConversation,
      refetch,
    };
  }

  if (isLoggedIn) {
    const isLoading = insightLoading || journalLoading || followupsLoading || allInsightsLoading || allJournalLoading;
    return {
      latestInsight: latestInsightDb ?? null,
      latestJournal: latestJournalDb ?? null,
      pendingFollowups: (followupsDb ?? []) as DwFollowupRecord[],
      allInsights: (allInsightsDb ?? []) as DwInsightRecord[],
      allJournalEntries: (allJournalDb ?? []) as DwJournalRecord[],
      isLoading,
      processConversation,
      refetch,
    };
  }

  // Guest mode – read from localStorage
  const guestInsight = getLatestGuestDwInsight();
  const guestJournal = getLatestGuestDwJournalEntry();
  const guestFollowups = getGuestDwFollowups("pending");
  const guestAllInsights = getGuestDwInsights();
  const guestAllJournal = getGuestDwJournalEntries();

  return {
    latestInsight: guestInsight ? normaliseGuestInsight(guestInsight) : null,
    latestJournal: guestJournal ? normaliseGuestJournal(guestJournal) : null,
    pendingFollowups: guestFollowups.map(normaliseGuestFollowup),
    allInsights: guestAllInsights.map(normaliseGuestInsight),
    allJournalEntries: guestAllJournal.map(normaliseGuestJournal),
    isLoading: false,
    processConversation,
    refetch,
  };
}
