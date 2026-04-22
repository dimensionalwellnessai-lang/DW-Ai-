/**
 * SyncIndicator
 *
 * Subtle "Synced across devices" cue used next to user preference controls
 * that persist server-side. Mirrors the pattern introduced for the upcoming-
 * reminders horizon select so the UX is consistent across every preference.
 *
 * - "saving"  → spinner + "Saving…"
 * - "saved"   → check + "Synced across devices" (consumers auto-clear after a
 *               few seconds; we just render whatever the parent passes).
 * - "error"   → inline destructive message (failures should not stay silent).
 * - "idle"    → reassuring "Synced across devices" baseline; can be hidden
 *               via showIdle={false} when the surrounding layout would feel
 *               too noisy with one indicator per row.
 */

import { Loader2, Check, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type SyncStatus = "idle" | "saving" | "saved" | "error";

interface SyncIndicatorProps {
  status: SyncStatus;
  error?: string | null;
  testIdPrefix: string;
  showIdle?: boolean;
  className?: string;
}

export function SyncIndicator({
  status,
  error,
  testIdPrefix,
  showIdle = true,
  className,
}: SyncIndicatorProps) {
  return (
    <div
      className={cn(
        "flex items-start gap-1 text-xs min-h-[1rem]",
        className,
      )}
      aria-live="polite"
      data-testid={`${testIdPrefix}-sync`}
    >
      {status === "saving" && (
        <span
          className="flex items-center gap-1 text-muted-foreground"
          data-testid={`${testIdPrefix}-saving`}
        >
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving…
        </span>
      )}
      {status === "saved" && (
        <span
          className="flex items-center gap-1 text-muted-foreground"
          data-testid={`${testIdPrefix}-saved`}
        >
          <Check className="w-3 h-3" />
          Synced across devices
        </span>
      )}
      {status === "error" && error && (
        <span
          className="flex items-start gap-1 text-destructive"
          data-testid={`${testIdPrefix}-error`}
        >
          <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" />
          <span>{error}</span>
        </span>
      )}
      {status === "idle" && showIdle && (
        <span
          className="text-muted-foreground"
          data-testid={`${testIdPrefix}-idle`}
        >
          Synced across devices
        </span>
      )}
    </div>
  );
}
