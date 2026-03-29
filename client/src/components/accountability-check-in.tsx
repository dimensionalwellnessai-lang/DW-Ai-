import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Moon, Loader2, CheckCircle2, Sun, Sunrise, Clock, CalendarCheck,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DISMISSED_KEY_PREFIX = "dw_checkin_dismissed_";

interface CheckInStatus {
  needsCheckIn: boolean;
  completed: boolean;
  timeContext: string;
  contextTitle: string;
  contextBody: string;
  optimalHour: number;
  optimalMinute: number;
  missedYesterday: boolean;
  todayTaskCount: number;
  showMissedCount: boolean;
  hour: number;
}

// Icon and color per time context
function getContextVisual(timeContext: string) {
  switch (timeContext) {
    case "prime_evening":   return { Icon: Moon,        color: "text-indigo-400",  bg: "bg-indigo-400/10" };
    case "late_night":      return { Icon: Moon,        color: "text-violet-400",  bg: "bg-violet-400/10" };
    case "very_late":       return { Icon: Moon,        color: "text-slate-400",   bg: "bg-slate-400/10" };
    case "missed_morning":  return { Icon: Sunrise,     color: "text-amber-500",   bg: "bg-amber-500/10" };
    case "missed_day_start":return { Icon: Sun,         color: "text-yellow-500",  bg: "bg-yellow-500/10" };
    case "missed_afternoon":return { Icon: Clock,       color: "text-orange-400",  bg: "bg-orange-400/10" };
    default:                return { Icon: CalendarCheck,color: "text-primary",    bg: "bg-primary/10" };
  }
}

// How long to suppress after "Later" per time context
function getDismissDurationHours(timeContext: string): number {
  switch (timeContext) {
    case "very_late":       return 6;   // don't re-prompt until morning
    case "late_night":      return 3;
    case "missed_morning":  return 4;
    case "missed_afternoon":return 8;   // won't show again until evening
    default:                return 2;
  }
}

export function AccountabilityCheckIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(7);
  const [dwResponse, setDwResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [activeStatus, setActiveStatus] = useState<CheckInStatus | null>(null);

  const { data: status } = useQuery<CheckInStatus>({
    queryKey: ["/api/accountability/check-in-status"],
    enabled: !!user,
    refetchInterval: 300000, // recheck every 5 min
  });

  useEffect(() => {
    if (!user || !status) return;
    if (!status.needsCheckIn || status.completed) return;

    // Check dismiss suppression: keyed by timeContext so different contexts
    // can re-prompt even if same day
    const dismissKey = DISMISSED_KEY_PREFIX + status.timeContext;
    const dismissedUntil = localStorage.getItem(dismissKey);
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) return;

    setActiveStatus(status);
    const timer = setTimeout(() => setOpen(true), 1800);
    return () => clearTimeout(timer);
  }, [status, user]);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/accountability/evening-check-in", {
        userNotes: notes,
        energyScore: energy,
        timeContext: activeStatus?.timeContext,
        missedTaskCount: activeStatus?.todayTaskCount,
      }),
    onSuccess: async (data: any) => {
      setDwResponse(data?.dwAnalysis || "Thanks for checking in. Every day you show up counts.");
      setSubmitted(true);
      queryClient.invalidateQueries({ queryKey: ["/api/accountability/check-in-status"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/count"] });
    },
    onError: () => {
      toast({ title: "Couldn't save check-in", variant: "destructive" });
    },
  });

  function handleDismiss() {
    if (!activeStatus) return;
    const hours = getDismissDurationHours(activeStatus.timeContext);
    const until = Date.now() + hours * 60 * 60 * 1000;
    localStorage.setItem(DISMISSED_KEY_PREFIX + activeStatus.timeContext, String(until));
    setOpen(false);
  }

  function handleClose() {
    setOpen(false);
    setSubmitted(false);
    setNotes("");
    setEnergy(7);
    setDwResponse("");
  }

  if (!user) return null;

  const visual = getContextVisual(activeStatus?.timeContext || "prime_evening");
  const { Icon } = visual;
  const isLateNight = ["late_night", "very_late"].includes(activeStatus?.timeContext || "");
  const isMissed = (activeStatus?.timeContext || "").startsWith("missed_");

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm w-[calc(100%-2rem)]" data-testid="modal-accountability-checkin">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className={`p-2 rounded-lg ${visual.bg}`}>
              <Icon className={`h-4 w-4 ${visual.color}`} />
            </div>
            <DialogTitle className="text-base">
              {submitted ? "Reflection saved" : (activeStatus?.contextTitle || "Daily check-in")}
            </DialogTitle>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {submitted ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-green-600">
                <CheckCircle2 className="h-4 w-4" />
                <span className="text-sm font-medium">DW heard you</span>
              </div>
              <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
                <div className="flex items-start gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                  <span className="text-xs font-medium text-primary">DW's reflection</span>
                </div>
                <p className="text-sm leading-relaxed">{dwResponse}</p>
              </div>
              <Button className="w-full" onClick={handleClose} data-testid="button-checkin-done">
                Done
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Context message */}
              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeStatus?.contextBody || "DW wants to help you reflect and set up tomorrow."}
              </p>

              {/* Missed task count pill */}
              {isMissed && activeStatus?.todayTaskCount > 0 && (
                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/60 text-xs text-muted-foreground">
                  <CalendarCheck className="h-3.5 w-3.5 shrink-0" />
                  <span>{activeStatus.todayTaskCount} things were on your agenda — no judgment, just context.</span>
                </div>
              )}

              {/* Energy rating */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isMissed ? "How's your energy right now?" : "How was your energy today?"}
                </label>
                <div className="grid grid-cols-5 gap-1.5 sm:grid-cols-10">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                    <button
                      key={n}
                      onClick={() => setEnergy(n)}
                      className={`h-9 rounded-lg text-sm font-medium transition-colors ${
                        energy === n
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground hover:bg-muted/70"
                      }`}
                      data-testid={`button-energy-${n}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">1 = depleted · 10 = thriving</p>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {isLateNight
                    ? "Anything on your mind? (optional)"
                    : isMissed
                    ? "What do you want DW to know? (optional)"
                    : "How did today go? (optional)"}
                </label>
                <Textarea
                  placeholder={
                    isLateNight
                      ? "A word or two is fine — DW just wants to hear from you."
                      : "What happened? What got done, what got skipped? No judgment here."
                  }
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={isLateNight ? 2 : 3}
                  className="resize-none text-sm"
                  data-testid="textarea-checkin-notes"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <Button
                  variant="ghost"
                  onClick={handleDismiss}
                  className="flex-1 text-muted-foreground"
                  data-testid="button-checkin-later"
                >
                  {isLateNight ? "Skip tonight" : isMissed ? "Not now" : "Later"}
                </Button>
                <Button
                  onClick={() => submitMutation.mutate()}
                  disabled={submitMutation.isPending}
                  className="flex-1"
                  data-testid="button-checkin-submit"
                >
                  {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                  {isLateNight ? "Quick reflection" : "Check in with DW"}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
