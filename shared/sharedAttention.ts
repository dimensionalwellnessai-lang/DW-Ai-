/**
 * shared/sharedAttention.ts
 *
 * Type definitions for the Shared Attention system (SPEC_14).
 * No runtime logic lives here — pure types and constants only.
 */

/** The four Shared Attention modes. */
export type SharedAttentionMode =
  | "dw-broadcast"
  | "user-broadcast"
  | "co-watch-dw"
  | "co-watch-user";

/** How much consent DW requires before executing an agentic action. */
export type ConsentTier = "silent" | "notify" | "witness";

/** An active or completed Shared Attention session. */
export interface SharedSession {
  /** Unique session identifier (uuid-like string). */
  id: string;
  /** Which shared-attention mode this session uses. */
  mode: SharedAttentionMode;
  /** Consent tier that governs agentic actions during this session. */
  consentTier: ConsentTier;
  /** The content URL being watched / broadcast (optional). */
  contentUrl?: string;
  /** Human-readable title for the content (optional). */
  title?: string;
  /** ISO 8601 timestamp when the session started. */
  startedAt: string;
  /** ISO 8601 timestamp when the session ended, or null if still active. */
  endedAt: string | null;
  /**
   * Whether the user has explicitly consented to recording.
   * Always defaults to false — must be explicitly set to true by the user.
   */
  recordingConsent: boolean;
}

/** UI metadata for each Shared Attention mode. */
export interface SharedAttentionModeInfo {
  mode: SharedAttentionMode;
  label: string;
  description: string;
}

/**
 * Static metadata for all four Shared Attention modes.
 * Use this to populate mode-selection UIs.
 */
export const SHARED_ATTENTION_MODES: Record<SharedAttentionMode, SharedAttentionModeInfo> = {
  "dw-broadcast": {
    mode: "dw-broadcast",
    label: "Watch DW Work",
    description: "See DWAI search, plan, and act in real time. You stay in control.",
  },
  "user-broadcast": {
    mode: "user-broadcast",
    label: "DW Watches Me",
    description: "Share your screen or camera so DW can offer live guidance. You choose when to start and stop.",
  },
  "co-watch-dw": {
    mode: "co-watch-dw",
    label: "DW Pulls, We Watch",
    description: "DW finds something worth watching and experiences it alongside you.",
  },
  "co-watch-user": {
    mode: "co-watch-user",
    label: "I Pull, We Watch",
    description: "You bring the content. DW reacts and talks it through with you.",
  },
};
