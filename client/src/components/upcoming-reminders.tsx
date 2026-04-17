/**
 * Upcoming Reminders panel
 *
 * Shows today's pending pre-task and post-task reminders with their fire
 * times, and lets the user "Skip this one" to silence a single reminder
 * without affecting the underlying task.
 *
 * Data source: the in-memory snapshot exposed by accountability-scheduler.
 * Skips are persisted (localStorage + server cancelled-ledger + native cancel)
 * and automatically clear when the underlying task is rescheduled.
 */

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BellOff, Clock, CalendarClock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getPlannedReminders,
  subscribeToPlannedReminders,
  skipReminder,
  type PlannedReminder,
} from "@/lib/accountability-scheduler";

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function UpcomingReminders() {
  const { toast } = useToast();
  const [reminders, setReminders] = useState<PlannedReminder[]>(() => getPlannedReminders());
  const [skippingKey, setSkippingKey] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToPlannedReminders(() => {
      setReminders(getPlannedReminders());
    });
    // Re-pull on mount in case planning has run since the initial state.
    setReminders(getPlannedReminders());
    return unsub;
  }, []);

  const handleSkip = async (reminder: PlannedReminder) => {
    setSkippingKey(reminder.key);
    try {
      const result = await skipReminder(reminder);
      if (!result.serverCancelled || !result.nativeCancelled) {
        toast({
          title: "Reminder skipped, with a hiccup",
          description:
            "The skip was saved on this device, but we couldn't fully reach the notification service. We'll keep retrying.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Reminder skipped",
          description: `"${reminder.name}" won't ping you this time.`,
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
      setSkippingKey(null);
    }
  };

  return (
    <Card data-testid="card-upcoming-reminders">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5" />
          Upcoming Reminders
        </CardTitle>
        <CardDescription>
          Today's pending pre-task and post-task pings. Skip any individual
          reminder without disabling the feature for the whole task.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {reminders.length === 0 ? (
          <p
            className="text-sm text-muted-foreground"
            data-testid="text-no-upcoming-reminders"
          >
            No upcoming reminders for today.
          </p>
        ) : (
          <ul className="space-y-2">
            {reminders.map((r) => (
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
                  disabled={skippingKey === r.key}
                  data-testid={`button-skip-${r.key}`}
                >
                  <BellOff className="w-4 h-4 mr-1" />
                  {skippingKey === r.key ? "Skipping…" : "Skip this one"}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
