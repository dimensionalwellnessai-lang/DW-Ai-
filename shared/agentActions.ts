/**
 * shared/agentActions.ts
 *
 * Type definitions for the DWAI Action Engine (SPEC_14).
 * No runtime logic lives here — pure types only.
 */

import type { ConsentTier } from "./sharedAttention";

/** The set of primitive action types the engine can execute. */
export type AgentActionType = "open" | "read" | "schedule" | "order" | "search";

/** Lifecycle states for a single agent action. */
export type AgentActionStatus =
  | "proposed"
  | "awaiting-consent"
  | "executing"
  | "done"
  | "declined"
  | "undone";

/** A single proposed or completed agentic action. */
export interface AgentAction {
  /** Unique identifier for this action. */
  id: string;
  /** The kind of primitive operation. */
  type: AgentActionType;
  /** Human-readable description shown to the user. */
  label: string;
  /**
   * Target URL used by `open`, `order`, and `search` actions.
   * For `open`, may be an internal route (starts with "/") or an external URL.
   */
  targetUrl?: string;
  /**
   * ISO 8601 datetime for `schedule` actions.
   * The reminder will be created for this time.
   */
  scheduledFor?: string;
  /** Current lifecycle state. */
  status: AgentActionStatus;
  /** Consent tier that governs this action. */
  consentTier: ConsentTier;
  /** ISO 8601 timestamp when the action was first proposed. */
  createdAt: string;
  /** ISO 8601 timestamp when the action reached a terminal state (done/declined/undone). */
  completedAt?: string;
  /**
   * Whether this action can be undone after execution.
   * For `schedule` actions, undoing cancels the reminder.
   * For `open`/`read` actions, there is nothing to undo (false).
   */
  undoable: boolean;
  /**
   * Payload for `read` actions: the text DW will speak aloud.
   * Ignored for other action types.
   */
  readText?: string;
  /**
   * Identifier of the reminder created by a `schedule` action.
   * Stored so the action can be undone (reminder cancelled).
   */
  reminderId?: string;
}

/** An entry in the persistent agent action audit log. */
export interface AgentActionLog {
  /** ISO 8601 timestamp of the log entry. */
  timestamp: string;
  /** The action that was logged. */
  action: AgentAction;
  /** Optional human-readable note about why the action reached this state. */
  note?: string;
}
