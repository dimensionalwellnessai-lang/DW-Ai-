/**
 * SyncIndicator
 *
 * Subtle save-state cue used next to user preference controls. Mirrors the
 * pattern introduced for the accountability preferences so the UX is
 * consistent across every preference surface.
 *
 * - "saving"  → spinner + "Saving…"
 * - "saved"   → check + savedLabel (defaults to "Synced across devices";
 *               consumers persisting only to this device should pass a more
 *               truthful label like "Saved on this device").
 * - "error"   → inline destructive message (failures should not stay silent).
 * - "idle"    → reassuring baseline copy; hide via showIdle={false} when
 *               the surrounding layout would feel too noisy with one
 *               indicator per row.
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
  /** Copy shown alongside the green check after a successful save. */
  savedLabel?: string;
  /** Copy shown in the idle baseline. Defaults to `savedLabel`. */
  idleLabel?: string;
}

const DEFAULT_SAVED_LABEL = "Synced across devices";

export function SyncIndicator({
  status,
  error,
  testIdPrefix,
  showIdle = true,
  className,
  savedLabel = DEFAULT_SAVED_LABEL,
  idleLabel,
}: SyncIndicatorProps) {
  const baseline = idleLabel ?? savedLabel;
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
          {savedLabel}
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
          {baseline}
        </span>
      )}
    </div>
  );
}
