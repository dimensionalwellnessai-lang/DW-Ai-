/**
 * Upcoming Reminders panel
 *
 * Shows pending pre-task and post-task reminders with their fire times, and
 * lets the user "Skip this one" to silence a single reminder without
 * affecting the underlying task. Skipping shows an Undo affordance in the
 * toast, and skipped-but-still-upcoming reminders also appear in a "Skipped"
 * sub-list with a Restore action.
 *
 * The panel defaults to today only, but the user can extend the horizon up to
 * the next 7 days for a read-only preview. Future-day reminders shown here
 * have **not** been scheduled with the OS yet — only today's are armed for
 * delivery. Skipping a future-day reminder records the cancellation server-
 * side so it stays suppressed when its day arrives.
 *
 * Data source: the in-memory snapshot exposed by accountability-scheduler.
 * Skips are persisted (localStorage + server cancelled-ledger + native cancel)
 * and automatically clear when the underlying task is rescheduled.
 */

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ToastAction } from "@/components/ui/toast";
import { BellOff, BellRing, Clock, CalendarClock, Undo2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getPlannedReminders,
  getSkippedReminders,
  subscribeToPlannedReminders,
  skipReminder,
  skipReminders,
  restoreReminder,
  getPreviewDaysAhead,
  setPreviewDaysAhead,
  type PlannedReminder,
} from "@/lib/accountability-scheduler";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/**
 * Format the time remaining until a skipped reminder would have fired.
 * Returns null once the moment has passed (the row will be filtered out by
 * planReminders shortly thereafter, but we hide the countdown immediately).
 */
function formatRestoreCountdown(fireAt: number, now: number): string | null {
  const remainingMs = fireAt - now;
  if (remainingMs <= 0) return null;
  const totalMinutes = Math.ceil(remainingMs / 60_000);
  if (totalMinutes < 60) return `Restore in ${totalMinutes} min`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (minutes === 0) return `Restore in ${hours} hr`;
  return `Restore in ${hours} hr ${minutes} min`;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function dayKey(ms: number): string {
  const d = startOfDay(new Date(ms));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function dayLabel(ms: number): string {
  const target = startOfDay(new Date(ms));
  const today = startOfDay(new Date());
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000),
  );
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  return target.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

const HORIZON_OPTIONS: { value: string; label: string; days: number }[] = [
  { value: "0", label: "Today only", days: 0 },
  { value: "1", label: "Today + tomorrow", days: 1 },
  { value: "2", label: "Next 3 days", days: 2 },
  { value: "6", label: "Next 7 days", days: 6 },
];

export function UpcomingReminders() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<PlannedReminder[]>(() => getPlannedReminders());
  const [skipped, setSkipped] = useState<PlannedReminder[]>(() => getSkippedReminders());
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [busyDay, setBusyDay] = useState<string | null>(null);
  const [horizon, setHorizon] = useState<number>(() => getPreviewDaysAhead());
  // Ticking clock used to refresh skipped-row countdowns. Updated every 30s
  // so a "Restore in N min" label shifts within the same minute it would.
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const unsub = subscribeToPlannedReminders(() => {
      setReminders(getPlannedReminders());
      setSkipped(getSkippedReminders());
      // The horizon may have just been hydrated from server-persisted
      // notification preferences (e.g. on cold start, or after a change made
      // on another device propagated). Re-pull so the select control matches.
      setHorizon(getPreviewDaysAhead());
    });
    // Re-pull on mount in case planning has run since the initial state.
    setReminders(getPlannedReminders());
    setSkipped(getSkippedReminders());
    setHorizon(getPreviewDaysAhead());
    return unsub;
  }, []);

  const handleHorizonChange = async (value: string) => {
    const days = parseInt(value, 10);
    if (!Number.isFinite(days)) return;
    setHorizon(days);
    try {
      await setPreviewDaysAhead(days);
    } catch (err) {
      console.error("[upcoming-reminders] horizon change failed:", err);
    }
  };

  const handleRestore = async (reminder: PlannedReminder) => {
    setBusyKey(reminder.key);
    try {
      const result = await restoreReminder(reminder);
      if (!result.serverCleared) {
        toast({
          title: "Reminder restored, with a hiccup",
          description:
            "Restored on this device, but we couldn't fully reach the notification service. We'll keep retrying.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reminder restored",
          description: `"${reminder.name}" will ping you again.`,
        });
      }
    } catch (err) {
      console.error("[upcoming-reminders] restore failed:", err);
      toast({
        title: "Couldn't restore reminder",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  const handleSkipDay = async (
    dayKeyStr: string,
    dayLabelStr: string,
    items: PlannedReminder[],
  ) => {
    if (items.length === 0) return;
    setBusyDay(dayKeyStr);
    // Snapshot the items so the Undo affordance can restore them even after
    // the planned-reminders snapshot has been updated by the skip.
    const snapshot = items.slice();
    try {
      const result = await skipReminders(snapshot);
      const undoAction = (
        <ToastAction
          altText="Undo skip day"
          onClick={() => {
            // Restore each reminder individually — there's no batched
            // restore endpoint and the per-item flow is what individual
            // skips already use.
            for (const r of snapshot) {
              void handleRestore(r);
            }
          }}
          data-testid={`button-undo-skip-day-${dayKeyStr}`}
        >
          <Undo2 className="w-3 h-3 mr-1" />
          Undo
        </ToastAction>
      );
      if (!result.serverCancelled || !result.nativeCancelled) {
        toast({
          title: `Skipped ${result.count} reminders, with a hiccup`,
          description:
            "The skips were saved on this device, but we couldn't fully reach the notification service. We'll keep retrying.",
          variant: "destructive",
          action: undoAction,
        });
      } else {
        toast({
          title: `Skipped all reminders for ${dayLabelStr}`,
          description: `${result.count} reminder${result.count === 1 ? "" : "s"} silenced.`,
          action: undoAction,
        });
      }
    } catch (err) {
      console.error("[upcoming-reminders] skip-day failed:", err);
      toast({
        title: "Couldn't skip the day's reminders",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyDay(null);
    }
  };

  const handleSkip = async (reminder: PlannedReminder) => {
    setBusyKey(reminder.key);
    try {
      const result = await skipReminder(reminder);
      // Provide an Undo action in the toast so a miss-tap can be reverted
      // immediately without hunting through a list.
      const undoAction = (
        <ToastAction
          altText="Undo skip"
          onClick={() => {
            void handleRestore(reminder);
          }}
          data-testid={`button-undo-skip-${reminder.key}`}
        >
          <Undo2 className="w-3 h-3 mr-1" />
          Undo
        </ToastAction>
      );
      if (!result.serverCancelled || !result.nativeCancelled) {
        toast({
          title: "Reminder skipped, with a hiccup",
          description:
            "The skip was saved on this device, but we couldn't fully reach the notification service. We'll keep retrying.",
          variant: "destructive",
          action: undoAction,
        });
      } else {
        toast({
          title: "Reminder skipped",
          description: `"${reminder.name}" won't ping you this time.`,
          action: undoAction,
        });
      }
    } catch (err) {
      console.error("[upcoming-reminders] skip failed:", err);
      toast({
        title: "Couldn't skip reminder",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setBusyKey(null);
    }
  };

  /** Group reminders by their day-of-fire so the panel can render day headers. */
  const grouped = useMemo(() => {
    const map = new Map<string, { label: string; sortKey: number; items: PlannedReminder[] }>();
    for (const r of reminders) {
      const key = dayKey(r.fireAt);
      let bucket = map.get(key);
      if (!bucket) {
        const sod = startOfDay(new Date(r.fireAt));
        bucket = { label: dayLabel(r.fireAt), sortKey: sod.getTime(), items: [] };
        map.set(key, bucket);
      }
      bucket.items.push(r);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].sortKey - b[1].sortKey)
      .map(([key, value]) => ({ key, ...value }));
  }, [reminders]);

  const horizonValue = String(horizon);
  const emptyMessage =
    horizon === 0
      ? "No upcoming reminders for today."
      : `No upcoming reminders in the next ${horizon + 1} days.`;

  return (
    <Card data-testid="card-upcoming-reminders">
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarClock className="w-5 h-5" />
              Upcoming Reminders
            </CardTitle>
            <CardDescription>
              Pending pre-task and post-task pings. Skip any individual
              reminder without disabling the feature for the whole task.
            </CardDescription>
          </div>
          <div className="min-w-[180px]">
            <Select value={horizonValue} onValueChange={handleHorizonChange}>
              <SelectTrigger
                aria-label="Reminder preview horizon"
                data-testid="select-reminder-horizon"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {HORIZON_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    data-testid={`option-horizon-${opt.value}`}
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          {grouped.length === 0 ? (
            <p
              className="text-sm text-muted-foreground"
              data-testid="text-no-upcoming-reminders"
            >
              {emptyMessage}
            </p>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => (
                <div key={group.key} data-testid={`group-day-${group.key}`}>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h4
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                      data-testid={`text-day-label-${group.key}`}
                    >
                      {group.label}
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() =>
                        handleSkipDay(group.key, group.label, group.items)
                      }
                      disabled={busyDay === group.key}
                      data-testid={`button-skip-day-${group.key}`}
                    >
                      <BellOff className="w-3 h-3 mr-1" />
                      {busyDay === group.key ? "Skipping…" : "Skip this day"}
                    </Button>
                  </div>
                  <ul className="space-y-2">
                    {group.items.map((r) => (
                      <li
                        key={r.key}
                        className="flex items-center justify-between gap-3 rounded-md border p-3"
                        data-testid={`row-reminder-${r.key}`}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge
                              variant={r.kind === "pre" ? "default" : "secondary"}
                              data-testid={`badge-kind-${r.key}`}
                            >
                              {r.kind === "pre" ? "Pre-task" : "Post-task"}
                            </Badge>
                            <span
                              className="text-sm font-medium truncate"
                              data-testid={`text-name-${r.key}`}
                            >
                              {r.name}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="w-3 h-3" />
                            <span data-testid={`text-fire-time-${r.key}`}>
                              Fires at {formatTime(r.fireAt)}
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleSkip(r)}
                          disabled={busyKey === r.key}
                          data-testid={`button-skip-${r.key}`}
                        >
                          <BellOff className="w-4 h-4 mr-1" />
                          {busyKey === r.key ? "Skipping…" : "Skip this one"}
                        </Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        {skipped.length > 0 && (
          <div data-testid="section-skipped-reminders">
            <h4
              className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1"
              data-testid="heading-skipped-reminders"
            >
              <BellOff className="w-3 h-3" />
              Skipped ({skipped.length})
            </h4>
            <ul className="space-y-2">
              {skipped.map((r) => {
                const countdown = formatRestoreCountdown(r.fireAt, now);
                return (
                <li
                  key={r.key}
                  className="flex items-center justify-between gap-3 rounded-md border border-dashed p-3 opacity-80"
                  data-testid={`row-skipped-${r.key}`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <Badge
                        variant="outline"
                        data-testid={`badge-skipped-kind-${r.key}`}
                      >
                        {r.kind === "pre" ? "Pre-task" : "Post-task"}
                      </Badge>
                      <span
                        className="text-sm font-medium truncate line-through"
                        data-testid={`text-skipped-name-${r.key}`}
                      >
                        {r.name}
                      </span>
                      {countdown && (
                        <Badge
                          variant="secondary"
                          className="font-normal"
                          data-testid={`badge-restore-countdown-${r.key}`}
                          aria-live="polite"
                        >
                          {countdown}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      <span data-testid={`text-skipped-fire-time-${r.key}`}>
                        Would have fired at {formatTime(r.fireAt)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleRestore(r)}
                    disabled={busyKey === r.key}
                    data-testid={`button-restore-${r.key}`}
                  >
                    <BellRing className="w-4 h-4 mr-1" />
                    {busyKey === r.key ? "Restoring…" : "Restore"}
                  </Button>
                </li>
                );
              })}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
