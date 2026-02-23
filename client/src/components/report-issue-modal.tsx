import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Flag, CheckCircle2 } from "lucide-react";
import { MISMATCH_EVENT_LABELS, type MismatchEventType, type MismatchReportPayload } from "@shared/supportReport";

interface ReportIssueModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventType: MismatchEventType;
  requestedItem: string;
  closestMatch: string;
  pageContext?: string;
}

export function ReportIssueModal({
  open,
  onOpenChange,
  eventType,
  requestedItem,
  closestMatch,
  pageContext,
}: ReportIssueModalProps) {
  const [details, setDetails] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload: MismatchReportPayload = {
        eventType,
        requestedItem,
        closestMatch,
        details: details.trim() || undefined,
        pageContext,
      };
      await fetch("/api/report-mismatch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setSubmitted(true);
    } catch (err) {
      console.error("Failed to submit mismatch report:", err);
      // report is best-effort; do not block the user
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    // reset for next open
    setTimeout(() => {
      setDetails("");
      setSubmitted(false);
    }, 300);
  };

  const eventLabel = MISMATCH_EVENT_LABELS[eventType];

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="w-4 h-4 text-amber-500" />
            Report Mismatch
          </DialogTitle>
          <DialogDescription>{eventLabel}</DialogDescription>
        </DialogHeader>

        {submitted ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
            <p className="font-medium">Thank you — your report was sent.</p>
            <p className="text-sm text-muted-foreground">
              We'll use this to improve future matches.
            </p>
            <Button variant="outline" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="rounded-md bg-muted px-4 py-3 text-sm space-y-1">
              <div>
                <span className="font-medium">Requested: </span>
                <span className="text-muted-foreground">{requestedItem}</span>
              </div>
              <div>
                <span className="font-medium">Shown: </span>
                <span className="text-muted-foreground">{closestMatch}</span>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="report-details">Additional details (optional)</Label>
              <Textarea
                id="report-details"
                placeholder="Describe what was wrong or what you expected…"
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                className="min-h-[80px] text-sm"
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={handleClose} disabled={submitting}>
                Cancel
              </Button>
              <Button size="sm" onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Sending…" : "Send Report"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
