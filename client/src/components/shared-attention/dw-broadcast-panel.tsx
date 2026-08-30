/**
 * dw-broadcast-panel.tsx
 *
 * Live action-feed panel for the "Watch DW Work" Shared Attention mode.
 * Renders each entry from the agent action audit log with label, status,
 * timestamp, and an undo control where undoable.
 */

import { useState, useEffect } from "react";
import { Undo2, CheckCircle2, XCircle, Loader2, Clock, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { readAuditLog, undoAction } from "@/lib/agent-actions";
import type { AgentAction, AgentActionLog } from "@/lib/agent-actions";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function StatusIcon({ status }: { status: AgentAction["status"] }) {
  switch (status) {
    case "done":
      return <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />;
    case "declined":
    case "undone":
      return <XCircle className="h-4 w-4 text-muted-foreground shrink-0" />;
    case "executing":
      return <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />;
    case "awaiting-consent":
      return <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />;
    default:
      return <Clock className="h-4 w-4 text-muted-foreground shrink-0" />;
  }
}

function StatusBadge({ status }: { status: AgentAction["status"] }) {
  const label: Record<AgentAction["status"], string> = {
    proposed: "Proposed",
    "awaiting-consent": "Waiting for you",
    executing: "Executing",
    done: "Done",
    declined: "Declined",
    undone: "Undone",
  };
  const variant: Record<AgentAction["status"], "default" | "secondary" | "outline" | "destructive"> = {
    proposed: "outline",
    "awaiting-consent": "secondary",
    executing: "default",
    done: "secondary",
    declined: "outline",
    undone: "outline",
  };
  return <Badge variant={variant[status]}>{label[status]}</Badge>;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DwBroadcastPanelProps {
  /** If true, auto-refreshes the log every 3 seconds. */
  live?: boolean;
  className?: string;
}

export function DwBroadcastPanel({ live = true, className }: DwBroadcastPanelProps) {
  const [entries, setEntries] = useState<AgentActionLog[]>([]);

  function refresh() {
    setEntries([...readAuditLog()].reverse());
  }

  useEffect(() => {
    refresh();
    if (!live) return;
    const interval = setInterval(refresh, 3_000);
    return () => clearInterval(interval);
  }, [live]);

  function handleUndo(action: AgentAction) {
    undoAction(action);
    refresh();
  }

  if (entries.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center gap-2 py-10 text-center ${className ?? ""}`}>
        <p className="text-sm text-muted-foreground">No actions yet — DW is standing by.</p>
      </div>
    );
  }

  return (
    <ScrollArea className={`${className ?? ""}`}>
      <ul className="flex flex-col gap-2 p-4">
        {entries.map((entry, i) => (
          <li
            key={`${entry.action.id}-${i}`}
            className="flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3"
          >
            <StatusIcon status={entry.action.status} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug text-foreground truncate">
                {entry.action.label}
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <StatusBadge status={entry.action.status} />
                <span className="text-xs text-muted-foreground">{formatTime(entry.timestamp)}</span>
                {entry.note && (
                  <span className="text-xs text-muted-foreground italic">{entry.note}</span>
                )}
              </div>
            </div>
            {entry.action.undoable && entry.action.status === "done" && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                onClick={() => handleUndo(entry.action)}
                aria-label={`Undo: ${entry.action.label}`}
              >
                <Undo2 className="h-4 w-4" />
              </Button>
            )}
          </li>
        ))}
      </ul>
    </ScrollArea>
  );
}
