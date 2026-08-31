/**
 * user-broadcast-dialog.tsx
 *
 * Consent-first dialog for the "DW Watches Me" Shared Attention mode.
 *
 * Behavior:
 * - Explains what will happen before requesting any media access
 * - Requires explicit opt-in before calling getDisplayMedia / getUserMedia
 * - Shows a local preview of the captured stream (never recorded by default)
 * - Always-visible Stop control
 * - Degrades gracefully with an explanatory message if the browser does not
 *   support screen/camera capture
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { Camera, Monitor, StopCircle, ShieldCheck, AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useSharedAttentionContext } from "./shared-attention-context";

type CaptureMode = "screen" | "camera" | null;
type Step = "consent" | "active" | "unsupported" | "error";

// ── Helpers ───────────────────────────────────────────────────────────────────

function isMediaSupported(mode: CaptureMode): boolean {
  if (mode === "screen") return typeof navigator?.mediaDevices?.getDisplayMedia === "function";
  if (mode === "camera") return typeof navigator?.mediaDevices?.getUserMedia === "function";
  return false;
}

async function requestCapture(mode: CaptureMode): Promise<MediaStream> {
  if (mode === "screen") {
    return navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
  }
  return navigator.mediaDevices.getUserMedia({ video: true, audio: false });
}

// ── Component ─────────────────────────────────────────────────────────────────

interface UserBroadcastDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UserBroadcastDialog({ open, onOpenChange }: UserBroadcastDialogProps) {
  const { endSession } = useSharedAttentionContext();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openRef = useRef(open);
  const captureRequestIdRef = useRef(0);
  const [step, setStep] = useState<Step>("consent");
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");

  const stopCapture = useCallback(() => {
    captureRequestIdRef.current += 1;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStep("consent");
    setCaptureMode(null);
    endSession();
    onOpenChange(false);
  }, [endSession, onOpenChange]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Stop capture when dialog is closed externally
  useEffect(() => {
    if (!open) {
      stopCapture();
    }
  }, [open, stopCapture]);

  async function handleStart(mode: CaptureMode) {
    if (!isMediaSupported(mode)) {
      setStep("unsupported");
      return;
    }
    setCaptureMode(mode);
    const requestId = ++captureRequestIdRef.current;
    try {
      const stream = await requestCapture(mode);
      if (!openRef.current || requestId !== captureRequestIdRef.current) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }
      streamRef.current = stream;
      setStep("active");
      // Attach to video element on next tick (ref may not be in DOM yet)
      setTimeout(() => {
        if (!openRef.current || requestId !== captureRequestIdRef.current) {
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {/* user blocked autoplay; preview still shown */});
        }
      }, 50);
      // Auto-stop when the user ends screen share via browser UI
      stream.getVideoTracks()[0]?.addEventListener("ended", stopCapture);
    } catch (err) {
      if (err instanceof Error && err.name === "NotAllowedError") {
        setErrorMessage("Permission was denied. You can try again whenever you're ready.");
      } else {
        setErrorMessage("Something went wrong starting the capture. Please try again.");
      }
      setStep("error");
    }
  }

  function handleClose() {
    stopCapture();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm rounded-2xl">
        <DialogHeader>
          <DialogTitle>DW Watches Me</DialogTitle>
          <DialogDescription className="sr-only">
            Share your screen or camera so DW can offer live guidance.
          </DialogDescription>
        </DialogHeader>

        {step === "consent" && (
          <div className="flex flex-col gap-5">
            <div className="flex items-start gap-3 rounded-xl bg-muted/50 px-4 py-3">
              <ShieldCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <p className="text-sm text-muted-foreground leading-relaxed">
                You&apos;ll see a local preview only on this device. In this version, DW does not
                receive this stream. Nothing is recorded, and you can stop at any time.
              </p>
            </div>
            <p className="text-sm text-foreground font-medium">What would you like to share?</p>
            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="outline"
                className="flex-col h-20 gap-2"
                onClick={() => handleStart("screen")}
              >
                <Monitor className="h-5 w-5" />
                <span className="text-xs">Screen</span>
              </Button>
              <Button
                variant="outline"
                className="flex-col h-20 gap-2"
                onClick={() => handleStart("camera")}
              >
                <Camera className="h-5 w-5" />
                <span className="text-xs">Camera</span>
              </Button>
            </div>
            <Button variant="ghost" onClick={handleClose} className="text-muted-foreground">
              Not now
            </Button>
          </div>
        )}

        {step === "active" && (
          <div className="flex flex-col gap-4">
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: "16/9" }}>
              <video
                ref={videoRef}
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-contain"
                aria-label="Local preview — not recorded"
              />
            </div>
            <p className="text-xs text-center text-muted-foreground">
              Local preview only on this device — not sent to DW, and nothing is being recorded.
            </p>
            <Button
              variant="destructive"
              className="gap-2"
              onClick={stopCapture}
            >
              <StopCircle className="h-4 w-4" />
              Stop sharing
            </Button>
          </div>
        )}

        {step === "unsupported" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your browser doesn't support screen or camera capture. Try using a modern desktop
              browser like Chrome or Firefox, or update your current browser.
            </p>
            <Button variant="outline" onClick={handleClose}>
              Close
            </Button>
          </div>
        )}

        {step === "error" && (
          <div className="flex flex-col items-center gap-4 py-4 text-center">
            <AlertTriangle className="h-8 w-8 text-amber-500" />
            <p className="text-sm text-muted-foreground leading-relaxed">{errorMessage}</p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep("consent")}>
                Try again
              </Button>
              <Button variant="ghost" onClick={handleClose}>
                Close
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
