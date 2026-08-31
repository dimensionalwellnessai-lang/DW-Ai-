/**
 * agent-actions.ts
 *
 * Client-side Action Engine for the DWAI Agentic Companion (SPEC_14).
 *
 * Mediates every agentic action through an explicit consent path.
 * No action of any tier is ever executed without traversing a consent path.
 *
 * Consent tiers:
 *   silent   — act, log for review
 *   notify   — act, then summarize
 *   witness  — show action live, require explicit UI confirmation before executing
 */

import type { AgentAction, AgentActionLog, AgentActionType, AgentActionStatus } from "@shared/agentActions";
import type { ConsentTier } from "@shared/sharedAttention";
import { ttsService } from "@/lib/tts-service";
import { scheduleReminderTimer, clearReminderTimer } from "@/lib/reminder-scheduler";

export type { AgentAction, AgentActionLog, AgentActionType, AgentActionStatus, ConsentTier };

type ProposeActionInput =
  | { type: "open"; label: string; consentTier: ConsentTier; targetUrl: string; undoable?: boolean }
  | { type: "order"; label: string; consentTier: ConsentTier; targetUrl: string; undoable?: boolean }
  | { type: "search"; label: string; consentTier: ConsentTier; targetUrl: string; undoable?: boolean }
  | { type: "read"; label: string; consentTier: ConsentTier; readText?: string; undoable?: boolean }
  | { type: "schedule"; label: string; consentTier: ConsentTier; scheduledFor: string; undoable?: boolean };

// ── Constants ─────────────────────────────────────────────────────────────────

const AUDIT_LOG_KEY = "dw-agent-action-log";
const AUDIT_LOG_MAX = 200;

// ── Utility helpers ───────────────────────────────────────────────────────────

function nowISO(): string {
  return new Date().toISOString();
}

function generateId(): string {
  return `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function generateReminderId(): string {
  return `reminder-agent-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function isSafeExternalUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch {
    return false;
  }
}

// ── Audit log ─────────────────────────────────────────────────────────────────

/**
 * Read the full audit log from localStorage.
 * Returns an empty array if storage is unavailable or the log is malformed.
 */
export function readAuditLog(): AgentActionLog[] {
  try {
    const raw = localStorage.getItem(AUDIT_LOG_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed as AgentActionLog[];
  } catch {
    return [];
  }
}

/**
 * Append an entry to the audit log.
 * Oldest entries are dropped when the cap is exceeded.
 */
function appendAuditLog(action: AgentAction, note?: string): void {
  try {
    const log = readAuditLog();
    const entry: AgentActionLog = { timestamp: nowISO(), action, note };
    const trimmed = [...log, entry].slice(-AUDIT_LOG_MAX);
    localStorage.setItem(AUDIT_LOG_KEY, JSON.stringify(trimmed));
  } catch {
    // localStorage may be blocked — fail silently; audit is best-effort
  }
}

// ── Core engine ───────────────────────────────────────────────────────────────

/**
 * Propose a new agentic action.
 * Returns the action in `proposed` state — nothing has been executed yet.
 */
export function proposeAction(
  partial: ProposeActionInput,
): AgentAction {
  if (
    (partial.type === "open" || partial.type === "order" || partial.type === "search")
    && !partial.targetUrl.trim()
  ) {
    throw new Error(`"${partial.type}" actions require targetUrl`);
  }

  if (partial.type === "schedule" && !partial.scheduledFor.trim()) {
    throw new Error('"schedule" actions require scheduledFor');
  }

  const consentTier = partial.type === "order" ? "witness" : partial.consentTier;

  const action: AgentAction = {
    id: generateId(),
    type: partial.type,
    label: partial.label,
    consentTier,
    targetUrl: partial.type === "read" || partial.type === "schedule" ? undefined : partial.targetUrl,
    scheduledFor: partial.type === "schedule" ? partial.scheduledFor : undefined,
    readText: partial.type === "read" ? partial.readText : undefined,
    undoable: partial.undoable ?? false,
    status: "proposed",
    createdAt: nowISO(),
  };
  appendAuditLog(action, "proposed");
  return action;
}

/**
 * Advance an action through the consent gate.
 *
 * - `witness` tier: returns the action in `awaiting-consent` state.
 *   The caller must show a confirmation UI and call `executeAction` only
 *   when the user explicitly confirms.
 * - `notify` / `silent` tiers: advances immediately to `executing` state.
 *   The caller should then call `executeAction`.
 */
export function requestConsent(action: AgentAction): AgentAction {
  if (action.status !== "proposed") return action;

  if (action.consentTier === "witness") {
    const updated: AgentAction = { ...action, status: "awaiting-consent" };
    appendAuditLog(updated, "awaiting-consent");
    return updated;
  }

  // silent / notify — proceed directly
  const updated: AgentAction = { ...action, status: "executing" };
  appendAuditLog(updated, "consent-implicit");
  return updated;
}

/**
 * Execute an action.
 *
 * For `witness` tier actions, this must only be called after the user has
 * confirmed via the UI (i.e., the action is in `awaiting-consent` state).
 * For other tiers, this is called after `requestConsent` returns `executing`.
 *
 * Returns the action in `done` state (or `failed` if execution fails).
 */
export async function executeAction(
  action: AgentAction,
  navigate?: (path: string) => void,
): Promise<AgentAction> {
  const allowedStatuses: AgentActionStatus[] = ["executing", "awaiting-consent"];
  if (!allowedStatuses.includes(action.status)) return action;

  try {
    let reminderId: string | undefined;

    switch (action.type) {
      case "open": {
        const url = action.targetUrl;
        if (!url) throw new Error('"open" action missing targetUrl');
        if (url.startsWith("/")) {
          if (navigate) {
            navigate(url);
          } else {
            window.location.href = url;
          }
        } else if (isSafeExternalUrl(url)) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          throw new Error("Unsafe external URL");
        }
        break;
      }

      case "read": {
        const text = action.readText ?? action.label;
        await ttsService.speak(text);
        break;
      }

      case "schedule": {
        if (!action.scheduledFor) throw new Error('"schedule" action missing scheduledFor');
        reminderId = generateReminderId();
        scheduleReminderTimer({
          id: reminderId,
          title: action.label,
          scheduledAt: action.scheduledFor,
        });
        break;
      }

      case "order":
      case "search": {
        // v1: open the target URL after consent (real provider integrations are out of scope)
        const url = action.targetUrl;
        if (url && isSafeExternalUrl(url)) {
          window.open(url, "_blank", "noopener,noreferrer");
        } else {
          throw new Error("Unsafe external URL");
        }
        break;
      }
    }

    const done: AgentAction = {
      ...action,
      status: "done",
      completedAt: nowISO(),
      reminderId,
      // undoable is true for schedule actions (reminder can be cancelled)
      undoable: action.type === "schedule",
    };
    appendAuditLog(done, "executed");
    return done;
  } catch {
    const failed: AgentAction = { ...action, status: "failed", completedAt: nowISO() };
    appendAuditLog(failed, "execution-error");
    return failed;
  }
}

/**
 * Decline an action (user rejected it at the consent gate).
 */
export function declineAction(action: AgentAction): AgentAction {
  const declined: AgentAction = { ...action, status: "declined", completedAt: nowISO() };
  appendAuditLog(declined, "declined");
  return declined;
}

/**
 * Undo a completed action where `undoable` is true.
 *
 * Currently supported:
 *   - `schedule`: cancels the associated reminder timer.
 */
export function undoAction(action: AgentAction): AgentAction {
  if (!action.undoable || action.status !== "done") return action;

  if (action.type === "schedule" && action.reminderId) {
    clearReminderTimer(action.reminderId);
  }

  const undone: AgentAction = { ...action, status: "undone", completedAt: nowISO() };
  appendAuditLog(undone, "undone");
  return undone;
}
