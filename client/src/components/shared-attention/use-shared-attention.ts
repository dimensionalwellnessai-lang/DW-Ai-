/**
 * use-shared-attention.ts
 *
 * Hook exposing helpers to start/end each Shared Attention mode.
 * Consumers call the relevant helper; the hook manages the context state
 * and the open/closed state of the relevant UI component.
 */

import { useState, useCallback } from "react";
import type { SharedAttentionMode, ConsentTier } from "@shared/sharedAttention";
import { useSharedAttentionContext } from "./shared-attention-context";

export interface UseSharedAttentionReturn {
  /** Whether the co-watch sheet is open. */
  coWatchOpen: boolean;
  /** Whether the DW broadcast panel is open. */
  dwBroadcastOpen: boolean;
  /** Whether the user broadcast dialog is open. */
  userBroadcastOpen: boolean;

  /** Start a co-watch-dw session (DW pulls content). */
  startCoWatchDW: (contentUrl: string, title?: string) => void;
  /** Start a co-watch-user session (user provides content). */
  startCoWatchUser: (contentUrl?: string, title?: string) => void;
  /** Open the DW broadcast panel. */
  openDwBroadcast: () => void;
  /** Open the user broadcast dialog (consent flow). */
  openUserBroadcast: () => void;

  /** Close whichever panel is currently open. */
  closeAll: () => void;
}

export function useSharedAttention(
  defaultConsentTier: ConsentTier = "notify",
): UseSharedAttentionReturn {
  const { startSession, endSession } = useSharedAttentionContext();
  const [coWatchOpen, setCoWatchOpen] = useState(false);
  const [dwBroadcastOpen, setDwBroadcastOpen] = useState(false);
  const [userBroadcastOpen, setUserBroadcastOpen] = useState(false);

  const closeAll = useCallback(() => {
    setCoWatchOpen(false);
    setDwBroadcastOpen(false);
    setUserBroadcastOpen(false);
    endSession();
  }, [endSession]);

  const startCoWatchDW = useCallback(
    (contentUrl: string, title?: string) => {
      startSession("co-watch-dw" as SharedAttentionMode, {
        contentUrl,
        title,
        consentTier: defaultConsentTier,
      });
      setCoWatchOpen(true);
    },
    [startSession, defaultConsentTier],
  );

  const startCoWatchUser = useCallback(
    (contentUrl?: string, title?: string) => {
      startSession("co-watch-user" as SharedAttentionMode, {
        contentUrl,
        title,
        consentTier: defaultConsentTier,
      });
      setCoWatchOpen(true);
    },
    [startSession, defaultConsentTier],
  );

  const openDwBroadcast = useCallback(() => {
    startSession("dw-broadcast" as SharedAttentionMode, { consentTier: "notify" });
    setDwBroadcastOpen(true);
  }, [startSession]);

  const openUserBroadcast = useCallback(() => {
    startSession("user-broadcast" as SharedAttentionMode, { consentTier: "witness" });
    setUserBroadcastOpen(true);
  }, [startSession]);

  return {
    coWatchOpen,
    dwBroadcastOpen,
    userBroadcastOpen,
    startCoWatchDW,
    startCoWatchUser,
    openDwBroadcast,
    openUserBroadcast,
    closeAll,
  };
}
