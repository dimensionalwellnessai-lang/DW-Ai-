/**
 * RemindersPanel – central UI for managing reminders (PR #7).
 *
 * Lists scheduled/snoozed reminders and provides dismiss / snooze / cancel.
 * Intended to be embedded inside Action Center or Settings.
 */

import { useState } from "react";
import { Clock, BellOff, X, Bell } from "lucide-react";
import { useReminders, type ReminderRecord } from "@/hooks/use-reminders";
import { cn } from "@/lib/utils";

const SNOOZE_OPTIONS = [
  { label: "30 min", getUntil: () => new Date(Date.now() + 30 * 60 * 1000) },
  { label: "2 hours", getUntil: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  {
    label: "Tomorrow 9am",
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

function formatRelative(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffMs = d.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 0) return "overdue";
  if (diffMin === 0) return "now";
  if (diffMin < 60) return `in ${diffMin}m`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `in ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `in ${diffD}d`;
}

function typeLabel(type: string): string {
  switch (type) {
    case "followup": return "Follow-up";
    case "plan_action": return "Plan action";
    case "daily_checkin": return "Daily check-in";
    default: return "Reminder";
  }
}

interface ReminderCardProps {
  reminder: ReminderRecord;
  onDismiss: (id: string) => void;
  onSnooze: (id: string, until: Date) => void;
  isLoading: boolean;
}

function ReminderCard({ reminder, onDismiss, onSnooze, isLoading }: ReminderCardProps) {
  const [showSnooze, setShowSnooze] = useState(false);
  const isDue = new Date(reminder.scheduledAt) <= new Date();

  return (
    <div className="rounded-xl border border-border/60 bg-card p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start gap-2">
        <div className={cn(
          "mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isDue ? "bg-amber-500/10" : "bg-primary/10"
        )}>
          <Bell className={cn("h-3.5 w-3.5", isDue ? "text-amber-600 dark:text-amber-400" : "text-primary")} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground leading-tight">{reminder.title}</p>
          {reminder.body && (
            <p className="text-xs text-muted-foreground mt-0.5">{reminder.body}</p>
          )}
          <div className="flex items-center gap-2 mt-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
              {typeLabel(reminder.type)}
            </span>
            <span className={cn(
              "text-[10px] font-semibold",
              isDue ? "text-amber-600 dark:text-amber-400" : "text-muted-foreground"
            )}>
              <Clock className="inline h-3 w-3 mr-0.5" />
              {formatRelative(reminder.scheduledAt)}
            </span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Dismiss reminder"
          disabled={isLoading}
          onClick={() => onDismiss(reminder.id)}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Snooze */}
      <div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => setShowSnooze((s) => !s)}
          className="flex items-center gap-1.5 rounded-xl bg-muted/50 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
        >
          <BellOff className="h-3.5 w-3.5" />
          Snooze
        </button>
        {showSnooze && (
          <div className="flex gap-2 flex-wrap mt-2">
            {SNOOZE_OPTIONS.map((opt) => (
              <button
                key={opt.label}
                type="button"
                disabled={isLoading}
                onClick={() => {
                  onSnooze(reminder.id, opt.getUntil());
                  setShowSnooze(false);
                }}
                className="rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

interface RemindersPanelProps {
  /** Optional CSS class for the container */
  className?: string;
}

export function RemindersPanel({ className }: RemindersPanelProps) {
  const { reminders, dismissReminder, snoozeReminder, isMutating } = useReminders();

  const active = reminders.filter(
    (r) => r.status === "scheduled"
  ).sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );

  return (
    <div className={cn("space-y-3", className)}>
      {active.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-4">
          No reminders scheduled
        </p>
      ) : (
        active.map((r) => (
          <ReminderCard
            key={r.id}
            reminder={r}
            onDismiss={dismissReminder}
            onSnooze={snoozeReminder}
            isLoading={isMutating}
          />
        ))
      )}
    </div>
  );
}
