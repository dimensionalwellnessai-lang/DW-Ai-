/**
 * shared-attention-context.tsx
 *
 * React context managing the active Shared Attention session.
 * All Shared Attention UI components consume this context.
 */

import { createContext, useContext, useState, useCallback, type ReactNode } from "react";
import type { SharedSession, SharedAttentionMode, ConsentTier } from "@shared/sharedAttention";

interface SharedAttentionContextValue {
  session: SharedSession | null;
  startSession: (
    mode: SharedAttentionMode,
    options?: { contentUrl?: string; title?: string; consentTier?: ConsentTier },
  ) => SharedSession;
  endSession: () => void;
  updateRecordingConsent: (consent: boolean) => void;
}

const SharedAttentionContext = createContext<SharedAttentionContextValue | null>(null);

function generateSessionId(): string {
  return `sa-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function SharedAttentionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SharedSession | null>(null);

  const startSession = useCallback(
    (
      mode: SharedAttentionMode,
      options: { contentUrl?: string; title?: string; consentTier?: ConsentTier } = {},
    ): SharedSession => {
      const newSession: SharedSession = {
        id: generateSessionId(),
        mode,
        consentTier: options.consentTier ?? "notify",
        contentUrl: options.contentUrl,
        title: options.title,
        startedAt: new Date().toISOString(),
        endedAt: null,
        recordingConsent: false,
      };
      setSession(newSession);
      return newSession;
    },
    [],
  );

  const endSession = useCallback(() => {
    setSession((prev) =>
      prev ? { ...prev, endedAt: new Date().toISOString() } : null,
    );
    // Clear after a tick so consumers can react to endedAt being set
    setTimeout(() => setSession(null), 0);
  }, []);

  const updateRecordingConsent = useCallback((consent: boolean) => {
    setSession((prev) => (prev ? { ...prev, recordingConsent: consent } : null));
  }, []);

  return (
    <SharedAttentionContext.Provider
      value={{ session, startSession, endSession, updateRecordingConsent }}
    >
      {children}
    </SharedAttentionContext.Provider>
  );
}

export function useSharedAttentionContext(): SharedAttentionContextValue {
  const ctx = useContext(SharedAttentionContext);
  if (!ctx) {
    throw new Error("useSharedAttentionContext must be used within SharedAttentionProvider");
  }
  return ctx;
}
