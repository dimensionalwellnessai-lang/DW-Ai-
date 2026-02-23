import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Flag, CheckCircle2 } from "lucide-react";
import { APP_VERSION } from "@/routes/registry";

export interface ClosestMatch {
  id?: string;
  name?: string;
}

export interface ConstraintsSnapshot {
  equipment?: unknown;
  injuries?: unknown;
  lowImpact?: boolean;
  dietaryRules?: unknown;
}

interface ExerciseMismatchReportProps {
  /** The search term the user originally typed */
  requestedTerm: string;
  /** The closest match that was returned */
  closestMatch?: ClosestMatch;
  /** Normalised version of the search term (if any) */
  normalizedTerm?: string;
  /** Confidence score (0-1) from the matching algorithm */
  confidence?: number;
  /** Optional constraints snapshot to include with the report */
  constraintsSnapshot?: ConstraintsSnapshot;
  /** Trigger element label – defaults to "Report mismatch" */
  label?: string;
}

async function submitMismatchReport(payload: Record<string, unknown>) {
  const res = await fetch("/api/support/report", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? "Failed to submit report");
  }
  return res.json();
}

/**
 * Inline label showing the closest-match name for a requested term.
 * Renders nothing if closestMatch has no name.
 */
export function ClosestMatchLabel({
  requestedTerm,
  closestMatch,
  confidence,
}: {
  requestedTerm: string;
  closestMatch?: ClosestMatch;
  confidence?: number;
}) {
  if (!closestMatch?.name) return null;
  return (
    <span className="text-xs text-muted-foreground">
      Showing results for{" "}
      <span className="font-medium text-foreground">{closestMatch.name}</span>
      {confidence != null && confidence < 0.8 && (
        <span> (closest match to &ldquo;{requestedTerm}&rdquo;)</span>
      )}
    </span>
  );
}

/**
 * Consent-based "Report mismatch" button + modal for exercise demo mismatches.
 */
export function ExerciseMismatchReport({
  requestedTerm,
  closestMatch,
  normalizedTerm,
  confidence,
  constraintsSnapshot,
  label = "Report mismatch",
}: ExerciseMismatchReportProps) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState("");
  const [includeTech, setIncludeTech] = useState(true);
  const [includeConstraints, setIncludeConstraints] = useState(true);
  const [includeConversation, setIncludeConversation] = useState(false);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: submitMismatchReport,
    onSuccess: () => {
      setDone(true);
    },
    onError: (err: Error) => {
      toast({
        title: "Failed to send report",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  const handleSend = () => {
    mutation.mutate({
      category: "demo_mismatch",
      description: note.trim() || `Exercise demo mismatch: requested "${requestedTerm}", got "${closestMatch?.name ?? "unknown"}"`,
      eventType: "exercise_demo_mismatch",
      requestedTerm,
      normalizedTerm,
      closestMatch,
      confidence,
      includeTechnicalDetails: includeTech,
      technicalDetails: includeTech
        ? {
            appVersion: APP_VERSION,
            platform: navigator.platform,
            userAgent: navigator.userAgent,
          }
        : undefined,
      includeRecentContext: false,
      includeConversationSnippet: includeConversation,
      includeConstraintsSnapshot: includeConstraints,
      constraintsSnapshot: includeConstraints ? constraintsSnapshot : undefined,
    });
  };

  const handleClose = () => {
    setOpen(false);
    setDone(false);
    setNote("");
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Report exercise demo mismatch"
      >
        <Flag className="h-3 w-3" />
        {label}
      </button>

      <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true); }}>
        <DialogContent className="max-w-sm">
          {done ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                  Report sent
                </DialogTitle>
                <DialogDescription>
                  Thanks for the heads-up! We'll use this to improve exercise matching.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={handleClose}>
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Report demo mismatch</DialogTitle>
                <DialogDescription>
                  You searched for{" "}
                  <span className="font-medium text-foreground">&ldquo;{requestedTerm}&rdquo;</span>
                  {closestMatch?.name && (
                    <>
                      {" "}but got{" "}
                      <span className="font-medium text-foreground">&ldquo;{closestMatch.name}&rdquo;</span>
                    </>
                  )}
                  . Choose what to include, then send.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 py-2">
                <div className="space-y-2">
                  <Label htmlFor="mismatch-note" className="text-sm">
                    Additional note (optional)
                  </Label>
                  <Textarea
                    id="mismatch-note"
                    placeholder="Anything else we should know?"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                  />
                </div>

                <div className="space-y-3">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Include with report
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="mismatch-tech" className="text-sm">
                        Technical details
                      </Label>
                      <p className="text-xs text-muted-foreground">App version, platform</p>
                    </div>
                    <Switch
                      id="mismatch-tech"
                      checked={includeTech}
                      onCheckedChange={setIncludeTech}
                    />
                  </div>

                  {constraintsSnapshot && (
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="mismatch-constraints" className="text-sm">
                          My constraints
                        </Label>
                        <p className="text-xs text-muted-foreground">
                          Equipment, injuries, dietary rules
                        </p>
                      </div>
                      <Switch
                        id="mismatch-constraints"
                        checked={includeConstraints}
                        onCheckedChange={setIncludeConstraints}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="mismatch-convo" className="text-sm">
                        Conversation snippet
                      </Label>
                      <p className="text-xs text-muted-foreground">Last message & DW's reply</p>
                    </div>
                    <Switch
                      id="mismatch-convo"
                      checked={includeConversation}
                      onCheckedChange={setIncludeConversation}
                    />
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
                  Cancel
                </Button>
                <Button onClick={handleSend} disabled={mutation.isPending}>
                  {mutation.isPending ? "Sending…" : "Send Report"}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
