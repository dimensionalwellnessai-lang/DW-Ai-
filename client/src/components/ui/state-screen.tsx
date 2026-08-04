/**
 * Shared UX state components for loading, empty, error, and retry states.
 *
 * ## Usage conventions (see docs/batch3/UX_STATE_CONVENTIONS.md)
 *
 *  <LoadingScreen />              – full-page loading skeleton
 *  <EmptyScreen icon={…} … />    – zero-items / first-run state with CTA
 *  <ErrorScreen onRetry={…} />   – network/server error with retry action
 *
 * All components emit an accessible `aria-live` region so screen-readers
 * announce the state change without requiring focus to move.
 */
import { type ReactNode, type ComponentType } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

// ────────────────────────────────────────────────────────────────────────────
// LoadingScreen
// ────────────────────────────────────────────────────────────────────────────

interface LoadingScreenProps {
  /** Number of skeleton rows to render. Defaults to 3. */
  rows?: number;
  /** Override container class. */
  className?: string;
  /** Accessible label for screen-readers. Defaults to "Loading…". */
  label?: string;
}

export function LoadingScreen({ rows = 3, className, label = "Loading…" }: LoadingScreenProps) {
  return (
    // aria-live="polite" so assistive technologies announce the loading state
    // without interrupting the user mid-sentence.
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn("space-y-3 py-4", className)}
    >
      <span className="sr-only">{label}</span>
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-xl" />
      ))}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// EmptyScreen
// ────────────────────────────────────────────────────────────────────────────

interface EmptyScreenProps {
  /** Lucide icon component to display. */
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  /** Primary CTA label. */
  actionLabel?: string;
  /** Primary CTA callback. */
  onAction?: () => void;
  /** Secondary (dismiss/skip) label. */
  secondaryLabel?: string;
  onSecondary?: () => void;
  className?: string;
  children?: ReactNode;
}

export function EmptyScreen({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className,
  children,
}: EmptyScreenProps) {
  return (
    <div
      role="region"
      aria-label={title}
      className={cn(
        "flex flex-col items-center justify-center text-center py-16 px-6 gap-3",
        className,
      )}
    >
      {Icon && <Icon className="h-12 w-12 text-muted-foreground/40 mb-1" />}
      <p className="font-semibold text-foreground text-base">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground max-w-xs">{description}</p>
      )}
      {children}
      {actionLabel && onAction && (
        <Button type="button" size="sm" className="mt-2" onClick={onAction}>
          {actionLabel}
        </Button>
      )}
      {secondaryLabel && onSecondary && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="text-muted-foreground"
          onClick={onSecondary}
        >
          {secondaryLabel}
        </Button>
      )}
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// ErrorScreen
// ────────────────────────────────────────────────────────────────────────────

interface ErrorScreenProps {
  /** Human-friendly description shown to the user. */
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorScreen({
  message = "Something went wrong. Your data is safe.",
  onRetry,
  className,
}: ErrorScreenProps) {
  return (
    // aria-live="assertive" for errors — screen-readers should interrupt
    // to announce error states so the user knows an action is required.
    <div
      role="alert"
      aria-live="assertive"
      className={cn(
        "flex flex-col items-center justify-center text-center py-12 px-6 gap-3",
        className,
      )}
    >
      <p className="font-semibold text-foreground text-base">Unable to load</p>
      <p className="text-sm text-muted-foreground max-w-xs">{message}</p>
      {onRetry && (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 gap-2"
          onClick={onRetry}
          aria-label="Retry loading"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </Button>
      )}
    </div>
  );
}
