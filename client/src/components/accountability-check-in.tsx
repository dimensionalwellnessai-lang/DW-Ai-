import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Moon, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const DISMISSED_KEY = "dw_checkin_dismissed";

export function AccountabilityCheckIn() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState("");
  const [energy, setEnergy] = useState(7);
  const [dwResponse, setDwResponse] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const { data: status } = useQuery<{ needsCheckIn: boolean; completed: boolean }>({
    queryKey: ["/api/accountability/check-in-status"],
    enabled: !!user,
    refetchInterval: 300000,
  });

  useEffect(() => {
    if (!user || !status) return;
    if (!status.needsCheckIn || status.completed) return;
    const dismissed = localStorage.getItem(DISMISSED_KEY);
    const today = new Date().toISOString().split("T")[0];
    if (dismissed === today) return;
    const timer = setTimeout(() => setOpen(true), 2000);
    return () => clearTimeout(timer);
  }, [status, user]);

  const submitMutation = useMutation({
    mutationFn: () =>
      apiRequest("POST", "/api/accountability/evening-check-in", {
        userNotes: notes,
        energyScore: energy,
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
    const today = new Date().toISOString().split("T")[0];
    localStorage.setItem(DISMISSED_KEY, today);
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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm" data-testid="modal-accountability-checkin">
        <DialogHeader>
          <DialogTitle>{submitted ? "Check-in complete" : "Evening check-in"}</DialogTitle>
        </DialogHeader>
      <div className="space-y-5 pt-1">
        {submitted ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium text-sm">Saved for tonight</span>
            </div>
            <div className="bg-primary/5 border border-primary/15 rounded-xl p-4">
              <div className="flex items-start gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <span className="text-xs font-medium text-primary">DW's reflection</span>
              </div>
              <p className="text-sm leading-relaxed">{dwResponse}</p>
            </div>
            <Button className="w-full" onClick={handleClose} data-testid="button-checkin-done">Done</Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Moon className="h-5 w-5 text-primary" />
              <p className="text-sm text-muted-foreground">DW wants to help you reflect on your day and set up tomorrow.</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">How was your energy today?</label>
              <div className="flex gap-2 flex-wrap">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                  <button
                    key={n}
                    onClick={() => setEnergy(n)}
                    className={`w-9 h-9 rounded-lg text-sm font-medium transition-colors ${energy === n ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/70"}`}
                    data-testid={`button-energy-${n}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">1 = depleted, 10 = thriving</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">How did today go? (optional)</label>
              <Textarea
                placeholder="What happened today? What did you accomplish or skip? No judgment here — DW just wants to understand."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="resize-none text-sm"
                data-testid="textarea-checkin-notes"
              />
            </div>

            <div className="flex gap-2">
              <Button variant="ghost" onClick={handleDismiss} className="flex-1" data-testid="button-checkin-later">
                Later
              </Button>
              <Button
                onClick={() => submitMutation.mutate()}
                disabled={submitMutation.isPending}
                className="flex-1"
                data-testid="button-checkin-submit"
              >
                {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
                Check in with DW
              </Button>
            </div>
          </div>
        )}
      </div>
      </DialogContent>
    </Dialog>
  );
}
