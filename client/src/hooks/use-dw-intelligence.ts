/**
 * useDwIntelligence – hook for triggering and reading DW Insight + Journal
 * Intelligence System data.
 *
 * - Auth users: calls /api/dw/processConversation to persist to DB, reads
 *   via /api/dw/* endpoints.
 * - Guest users: calls /api/dw/processConversation/preview to get the AI
 *   result, then saves to localStorage via dw-intelligence-storage helpers.
 */

import { useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { isFeatureEnabled } from "@/config/featureFlags";
import {
  saveGuestDwInsight,
  saveGuestDwJournalEntry,
  saveGuestDwFollowup,
  getGuestDwJournalEntries,
  type GuestDwJournalEntry,
} from "@/lib/dw-intelligence-storage";

// Exported type — mirrors GuestDwJournalEntry so journal.tsx can use it
// for both guest (localStorage) and authenticated (API) entries.
export type DwJournalRecord = GuestDwJournalEntry;

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProcessConversationOptions {
  messages: ChatMessage[];
  conversationId?: string;
}

/**
 * Returns a stable function that processes a conversation into insights,
 * journal entries, and follow-ups.
 *
 * Safe to call in chat post-processing; fails silently on error.
 */
export function useDwIntelligence() {
  const { user } = useAuth();
  const isLoggedIn = Boolean(user);
  const queryClient = useQueryClient();
  const enabled = isFeatureEnabled("DW_INSIGHT_JOURNAL");

  // Read AI-generated journal entries:
  // - Auth users: fetch from API (entries persisted to DB)
  // - Guest users: read from localStorage
  const { data: authJournalEntries, isLoading: authLoading } = useQuery<DwJournalRecord[]>({
    queryKey: ["/api/dw/journalEntries"],
    enabled: enabled && isLoggedIn,
    staleTime: 5 * 60 * 1000,
  });

  const guestEntries: DwJournalRecord[] = !isLoggedIn && enabled
    ? getGuestDwJournalEntries()
    : [];

  const allJournalEntries: DwJournalRecord[] = isLoggedIn
    ? (authJournalEntries ?? [])
    : guestEntries;

  const isLoading = isLoggedIn && authLoading;

  const processConversation = useCallback(
    async ({ messages, conversationId }: ProcessConversationOptions): Promise<void> => {
      if (!enabled) return;
      if (!messages || messages.length === 0) return;

      try {
        if (isLoggedIn) {
          // Auth path: persist to DB via API
          const response = await fetch("/api/dw/processConversation", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            credentials: "include",
            body: JSON.stringify({ messages, conversationId }),
          });

          if (!response.ok) {
            console.warn("DW intelligence processing failed:", response.status);
            return;
          }

          // Invalidate home/insights query caches so cards refresh
          queryClient.invalidateQueries({ queryKey: ["/api/dw/latestInsight"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dw/latestJournal"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dw/followups"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dw/insights"] });
          queryClient.invalidateQueries({ queryKey: ["/api/dw/journalEntries"] });
        } else {
          // Guest path: get AI result and save to localStorage
          const response = await fetch("/api/dw/processConversation/preview", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ messages }),
          });

          if (!response.ok) {
            console.warn("DW intelligence preview failed:", response.status);
            return;
          }

          const result = await response.json() as {
            insight: {
              title: string;
              summary: string;
              insightLine: string;
              quotes: string[];
              theme: string;
              tags: string[];
              switchTag?: string;
            };
            journalEntry: {
              title: string;
              story: string;
              quotes: string[];
              tags: string[];
            };
            followupPrompt: string;
          };

          if (!result) return;

          const savedInsight = saveGuestDwInsight({
            title: result.insight.title,
            summary: result.insight.summary,
            insightLine: result.insight.insightLine,
            quotes: result.insight.quotes,
            theme: result.insight.theme,
            tags: result.insight.tags,
            switchTag: result.insight.switchTag,
            sourceConversationId: conversationId,
          });

          saveGuestDwJournalEntry({
            title: result.journalEntry.title,
            story: result.journalEntry.story,
            quotes: result.journalEntry.quotes,
            tags: result.journalEntry.tags,
            sourceConversationId: conversationId,
          });

          saveGuestDwFollowup({
            prompt: result.followupPrompt,
            relatedInsightId: savedInsight.id,
            sourceConversationId: conversationId,
            status: "pending",
          });
        }
      } catch (error) {
        // Intelligence pipeline is non-critical; fail silently to not break chat
        console.warn("DW intelligence processing error (non-fatal):", error);
      }
    },
    [enabled, isLoggedIn, queryClient]
  );

  return { processConversation, enabled, allJournalEntries, isLoading };
}
