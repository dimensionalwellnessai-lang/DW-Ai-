import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Camera, RotateCcw, Sparkles, Loader2, X, Volume2, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormCheckDialogProps {
  open: boolean;
  onClose: () => void;
  exerciseName?: string;
}

export function FormCheckDialog({ open, onClose, exerciseName = "" }: FormCheckDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [exercise, setExercise] = useState(exerciseName);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isMuted, setIsMuted] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setExercise(exerciseName);
  }, [exerciseName]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setAnalysis(null);
      setCameraError(null);
      setIsAnalyzing(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [open, stopCamera]);

  const startCamera = useCallback(async (mode?: "user" | "environment") => {
    const facing = mode ?? facingMode;
    try {
      setCameraError(null);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
        streamRef.current = null;
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraActive(true);
      }
    } catch {
      setCameraError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, [facingMode]);

  useEffect(() => {
    if (open) startCamera();
  }, [open]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const captureFrameAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.75);

    setIsAnalyzing(true);
    setAnalysis(null);
    try {
      const result: any = await apiRequest("POST", "/api/body-scan/analyze", {
        photoDataUrl: dataUrl,
        exercise: exercise || "general exercise",
      });
      const text = result?.analysis || "Couldn't get feedback right now. Try again.";
      setAnalysis(text);
      if (!isMuted && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.slice(0, 300));
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setAnalysis("Couldn't analyze right now. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [exercise, isAnalyzing, isMuted]);

  const replayFeedback = useCallback(() => {
    if (!analysis || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(analysis.slice(0, 300));
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, [analysis]);

  const handleClose = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-sm w-full rounded-2xl border-0">
        {/* Full-bleed live video */}
        <div className="relative bg-black w-full" style={{ aspectRatio: "9/16", maxHeight: "85dvh" }}>
          {/* Live video — always on */}
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* No-camera states */}
          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
              <Camera className="w-12 h-12 text-white/40" />
              <Button
                onClick={() => startCamera()}
                className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                variant="outline"
                data-testid="button-start-camera"
              >
                Start Camera
              </Button>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
              <X className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm">{cameraError}</p>
              <Button
                variant="outline"
                className="bg-white/10 border-white/30 text-white"
                onClick={() => startCamera()}
              >
                Try Again
              </Button>
            </div>
          )}

          {/* Top bar: exercise label + controls */}
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex-1 mr-2">
              {editingExercise ? (
                <input
                  ref={inputRef}
                  value={exercise}
                  onChange={e => setExercise(e.target.value)}
                  onBlur={() => setEditingExercise(false)}
                  onKeyDown={e => e.key === "Enter" && setEditingExercise(false)}
                  className="w-full bg-black/40 text-white text-sm rounded-lg px-2 py-1 border border-white/30 outline-none"
                  placeholder="Exercise name…"
                  autoFocus
                  data-testid="input-form-check-exercise"
                />
              ) : (
                <button
                  className="flex items-center gap-1.5 text-white/90 text-sm font-medium"
                  onClick={() => {
                    setEditingExercise(true);
                    setTimeout(() => inputRef.current?.focus(), 50);
                  }}
                  data-testid="button-edit-exercise"
                >
                  <Camera className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  {exercise || "Tap to name exercise"}
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
                onClick={() => {
                  setIsMuted(m => !m);
                  if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel();
                }}
                data-testid="button-toggle-mute"
                aria-label={isMuted ? "Unmute feedback" : "Mute feedback"}
              >
                {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
              <button
                className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
                onClick={flipCamera}
                data-testid="button-flip-camera"
                aria-label="Flip camera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
              <button
                className="w-9 h-9 rounded-full bg-black/40 flex items-center justify-center text-white"
                onClick={handleClose}
                data-testid="button-close-form-check"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Feedback overlay — appears at bottom while video stays live */}
          {(analysis || isAnalyzing) && (
            <div className="absolute left-3 right-3 bottom-20 rounded-2xl bg-black/75 backdrop-blur-sm border border-white/10 p-3 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-teal-300 text-xs font-semibold tracking-wide uppercase">DW's Coaching</span>
                {analysis && (
                  <button
                    className="ml-auto text-white/50 hover:text-white"
                    onClick={replayFeedback}
                    data-testid="button-replay-feedback"
                    aria-label="Replay voice feedback"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing your form…
                </div>
              )}
              {analysis && !isAnalyzing && (
                <p className="text-white text-sm leading-relaxed">{analysis}</p>
              )}
            </div>
          )}

          {/* Bottom action button */}
          <div className="absolute bottom-4 left-0 right-0 flex justify-center px-6">
            <Button
              onClick={captureFrameAndAnalyze}
              disabled={!cameraActive || isAnalyzing}
              className={cn(
                "h-14 w-14 rounded-full p-0 shadow-lg border-4 transition-all",
                isAnalyzing
                  ? "border-teal-400/60 bg-teal-500/20 scale-95"
                  : "border-white bg-white/10 hover:bg-white/20 active:scale-95"
              )}
              data-testid="button-analyze-form"
              aria-label="Analyze my form"
            >
              {isAnalyzing ? (
                <Loader2 className="w-6 h-6 text-teal-400 animate-spin" />
              ) : (
                <Sparkles className="w-6 h-6 text-white" />
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
