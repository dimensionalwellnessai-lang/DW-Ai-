/**
 * ShareExportSheet
 *
 * Bottom-sheet that provides one-click share / export actions:
 *   • Copy link  – copies the current (or provided) URL to the clipboard
 *   • Copy as text – formats the supplied content as plain text and copies it
 *   • Print / Save PDF – opens the browser print dialog (native PDF save)
 *
 * Usage:
 *   <ShareExportSheet
 *     open={open}
 *     onOpenChange={setOpen}
 *     title="My Elevation Plan"
 *     shareUrl="/elevation-plan?id=abc"
 *     textContent="Day 1: …\nDay 2: …"
 *   />
 */

import { useState, useRef, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Link2, FileText, Printer, Check, Share2 } from "lucide-react";

interface ShareExportSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Human-readable title shown in the sheet header */
  title: string;
  /** Optional description/subtitle */
  description?: string;
  /**
   * URL to copy when the user taps "Copy link".
   * Defaults to window.location.href.
   */
  shareUrl?: string;
  /**
   * Plain-text version of the content to copy when the user taps
   * "Copy as text". When omitted, the copy-text option is hidden.
   */
  textContent?: string;
  /**
   * Whether to show the Print / Save PDF option.
   * Defaults to true.
   */
  showPrint?: boolean;
}

type ActionState = "idle" | "copied-link" | "copied-text";

export function ShareExportSheet({
  open,
  onOpenChange,
  title,
  description,
  shareUrl,
  textContent,
  showPrint = true,
}: ShareExportSheetProps) {
  const { toast } = useToast();
  const [actionState, setActionState] = useState<ActionState>("idle");
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear any pending flash timer on unmount
  useEffect(() => {
    return () => {
      if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    };
  }, []);

  const resolvedUrl = shareUrl
    ? new URL(shareUrl, window.location.origin).toString()
    : window.location.href;

  const flashState = (s: ActionState) => {
    if (flashTimerRef.current !== null) clearTimeout(flashTimerRef.current);
    setActionState(s);
    flashTimerRef.current = setTimeout(() => {
      setActionState("idle");
      flashTimerRef.current = null;
    }, 2000);
  };

  const handleCopyLink = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title, url: resolvedUrl });
        onOpenChange(false);
        return;
      }
      await navigator.clipboard.writeText(resolvedUrl);
      flashState("copied-link");
      toast({ title: "Link copied", description: "Share link is ready to paste." });
    } catch {
      toast({ title: "Could not copy link", variant: "destructive" });
    }
  };

  const handleCopyText = async () => {
    if (!textContent) return;
    try {
      await navigator.clipboard.writeText(textContent);
      flashState("copied-text");
      toast({ title: "Copied", description: "Summary copied to clipboard." });
    } catch {
      toast({ title: "Could not copy text", variant: "destructive" });
    }
  };

  const handlePrint = () => {
    onOpenChange(false);
    // Brief delay so the sheet animation completes before print dialog opens
    setTimeout(() => window.print(), 300);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl pb-safe">
        <SheetHeader className="text-left mb-4">
          <div className="flex items-center gap-2">
            <Share2 className="h-5 w-5 text-primary" />
            <SheetTitle>{title}</SheetTitle>
          </div>
          {description && (
            <SheetDescription>{description}</SheetDescription>
          )}
        </SheetHeader>

        <div className="space-y-3">
          {/* Copy link */}
          <Button
            variant="outline"
            className="w-full justify-start gap-3 h-14"
            onClick={handleCopyLink}
            data-testid="share-copy-link"
          >
            {actionState === "copied-link" ? (
              <Check className="h-5 w-5 text-green-500 shrink-0" />
            ) : (
              <Link2 className="h-5 w-5 text-muted-foreground shrink-0" />
            )}
            <div className="text-left">
              <p className="text-sm font-medium">
                {actionState === "copied-link" ? "Copied!" : "Copy link"}
              </p>
              <p className="text-xs text-muted-foreground">
                {typeof navigator !== "undefined" && navigator.share
                  ? "Open the share sheet"
                  : "Copy a shareable URL"}
              </p>
            </div>
          </Button>

          {/* Copy as text */}
          {textContent && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handleCopyText}
              data-testid="share-copy-text"
            >
              {actionState === "copied-text" ? (
                <Check className="h-5 w-5 text-green-500 shrink-0" />
              ) : (
                <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
              )}
              <div className="text-left">
                <p className="text-sm font-medium">
                  {actionState === "copied-text" ? "Copied!" : "Copy as text"}
                </p>
                <p className="text-xs text-muted-foreground">
                  Paste as a plain-text summary
                </p>
              </div>
            </Button>
          )}

          {/* Print / Save PDF */}
          {showPrint && (
            <Button
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={handlePrint}
              data-testid="share-print"
            >
              <Printer className="h-5 w-5 text-muted-foreground shrink-0" />
              <div className="text-left">
                <p className="text-sm font-medium">Print / Save as PDF</p>
                <p className="text-xs text-muted-foreground">
                  Use your browser's print dialog to save a PDF
                </p>
              </div>
            </Button>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Shared links and exports may include personal information. Share intentionally and only with people and places you trust.
        </p>
      </SheetContent>
    </Sheet>
  );
}
