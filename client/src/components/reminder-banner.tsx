/**
 * ReminderBanner – in-app notification banner for due reminders (PR #7).
 *
 * Mounts once in App.tsx and shows a dismissable banner/toast whenever
 * a reminder becomes due. Snooze presets: 30m, 2h, tomorrow 9am.
 */

import { useEffect, useRef, useState } from "react";
import { X, BellRing, ChevronDown, ChevronUp, Clock } from "lucide-react";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useReminders, type ReminderRecord } from "@/hooks/use-reminders";
import { useReminderIntegrations } from "@/hooks/use-reminder-integrations";
import { onReminderDue, rescheduleAll } from "@/lib/reminder-scheduler";
import { trackEvent, EVENTS } from "@/lib/analytics";

// Snooze presets matching the problem statement
const SNOOZE_OPTIONS = [
  { label: "30 min", getUntil: () => new Date(Date.now() + 30 * 60 * 1000) },
  { label: "2 hours", getUntil: () => new Date(Date.now() + 2 * 60 * 60 * 1000) },
  {
    label: "Tomorrow",
    getUntil: () => {
      const d = new Date();
      d.setDate(d.getDate() + 1);
      d.setHours(9, 0, 0, 0);
      return d;
    },
  },
];

export function ReminderBanner() {
  const enabled = isFeatureEnabled("REMINDERS");
  const { reminders, dismissReminder, snoozeReminder, markSent } = useReminders();
  const [activeReminder, setActiveReminder] = useState<ReminderRecord | null>(null);
  const [showSnooze, setShowSnooze] = useState(false);
  const handledRef = useRef<Set<string>>(new Set());
  // Stable ref for markSent so the callback effect doesn't re-register on every render
  const markSentRef = useRef(markSent);
  useEffect(() => {
    markSentRef.current = markSent;
  });

  // Wire check-in + elevation plan integrations (gated by flag internally)
  useReminderIntegrations(enabled);

  // Keep scheduler in sync with the current reminders list
  useEffect(() => {
    if (!enabled) return;
    rescheduleAll(reminders);
  }, [reminders, enabled]);

  // Register callback when a reminder fires
  useEffect(() => {
    if (!enabled) return;
    const unregister = onReminderDue(async (r) => {
      if (handledRef.current.has(r.id)) return;
      handledRef.current.add(r.id);
      // Find the full record; skip if not found (may have been dismissed/cancelled)
      const full = reminders.find((rem) => rem.id === r.id);
      if (!full) return;
      // Mark as sent immediately so re-loads don't re-fire the same banner
      await markSentRef.current(r.id);
      setActiveReminder(full);
    });
    return unregister;
  }, [enabled, reminders]);

  if (!enabled || !activeReminder) return null;

  const handleDismiss = async () => {
    // Use `dismissed` status for user-initiated dismissal
    trackEvent(EVENTS.REMINDER_INTERACTED, { action: "dismissed", reminderType: activeReminder.type, reminderId: activeReminder.id });
    await dismissReminder(activeReminder.id);
    setActiveReminder(null);
    setShowSnooze(false);
  };

  const handleSnooze = async (until: Date) => {
    trackEvent(EVENTS.REMINDER_INTERACTED, { action: "snoozed", reminderType: activeReminder.type, reminderId: activeReminder.id });
    await snoozeReminder(activeReminder.id, until);
    handledRef.current.delete(activeReminder.id);
    setActiveReminder(null);
    setShowSnooze(false);
  };

  return (
    <div
      role="alert"
      aria-live="polite"
      className="fixed bottom-20 left-1/2 z-50 w-[min(92vw,28rem)] -translate-x-1/2 rounded-2xl border border-border/60 bg-card shadow-lg"
    >
      {/* Header row */}
      <div className="flex items-start gap-3 p-4">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <BellRing className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground leading-tight">
            {activeReminder.title}
          </p>
          {activeReminder.body && (
            <p className="mt-0.5 text-xs text-muted-foreground leading-snug">
              {activeReminder.body}
            </p>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss reminder"
          onClick={handleDismiss}
          className="shrink-0 rounded-lg p-1 text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Action row */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          type="button"
          onClick={() => setShowSnooze((s) => !s)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-muted/60 px-3 py-2 text-xs font-medium text-muted-foreground hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Clock className="h-3.5 w-3.5" />
          Snooze
          {showSnooze ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          className="flex flex-1 items-center justify-center rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary hover:bg-primary/20 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          Got it
        </button>
      </div>

      {/* Snooze options */}
      {showSnooze && (
        <div className="flex gap-2 flex-wrap px-4 pb-4">
          {SNOOZE_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              type="button"
              onClick={() => handleSnooze(opt.getUntil())}
              className="rounded-xl border border-border/60 bg-background px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
