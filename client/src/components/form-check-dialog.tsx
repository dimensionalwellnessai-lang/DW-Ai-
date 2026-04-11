import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { Camera, RotateCcw, Sparkles, Loader2, X, Volume2, Mic, MicOff, Zap, ZapOff, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";

interface FormCheckDialogProps {
  open: boolean;
  onClose: () => void;
  exerciseName?: string;
}

function calcMotion(a: ImageData, b: ImageData): number {
  let sum = 0;
  let n = 0;
  for (let i = 0; i < a.data.length; i += 32) {
    sum += Math.abs(a.data[i] - b.data[i]);
    n++;
  }
  return n > 0 ? sum / n : 0;
}

export function FormCheckDialog({ open, onClose, exerciseName = "" }: FormCheckDialogProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const motionHistRef = useRef<number[]>([]);
  const wasIncreasingRef = useRef(false);
  const lastRepTimeRef = useRef(0);
  const liveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const motionTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const liveCountRef = useRef(8);

  const [cameraActive, setCameraActive] = useState(false);
  const [exercise, setExercise] = useState(exerciseName);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");
  const [isMuted, setIsMuted] = useState(false);
  const [editingExercise, setEditingExercise] = useState(false);
  const [liveCoach, setLiveCoach] = useState(false);
  const [liveCountdown, setLiveCountdown] = useState(8);
  const [repCount, setRepCount] = useState(0);
  const [repDetecting, setRepDetecting] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setExercise(exerciseName); }, [exerciseName]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
    prevFrameRef.current = null;
  }, []);

  const stopAllTimers = useCallback(() => {
    if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    if (motionTimerRef.current) { clearInterval(motionTimerRef.current); motionTimerRef.current = null; }
  }, []);

  useEffect(() => {
    if (!open) {
      stopAllTimers();
      stopCamera();
      setAnalysis(null);
      setCameraError(null);
      setIsAnalyzing(false);
      setLiveCoach(false);
      setRepCount(0);
      setRepDetecting(false);
      if (window.speechSynthesis) window.speechSynthesis.cancel();
    }
  }, [open, stopCamera, stopAllTimers]);

  const startCamera = useCallback(async (mode?: "user" | "environment") => {
    const facing = mode ?? facingMode;
    try {
      setCameraError(null);
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
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

  useEffect(() => { if (open) startCamera(); }, [open]);

  const flipCamera = useCallback(() => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    startCamera(next);
  }, [facingMode, startCamera]);

  const captureFrameAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || isAnalyzing) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 320;
    canvas.height = video.videoHeight || 480;
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
        const u = new SpeechSynthesisUtterance(text.slice(0, 300));
        u.rate = 0.95;
        window.speechSynthesis.speak(u);
      }
    } catch {
      setAnalysis("Couldn't analyze right now. Check your connection and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [exercise, isAnalyzing, isMuted]);

  // Live coach: re-analyze every 8 seconds
  useEffect(() => {
    if (liveTimerRef.current) { clearInterval(liveTimerRef.current); liveTimerRef.current = null; }
    if (!liveCoach || !cameraActive) {
      setLiveCountdown(8);
      liveCountRef.current = 8;
      return;
    }
    liveCountRef.current = 8;
    setLiveCountdown(8);
    liveTimerRef.current = setInterval(() => {
      liveCountRef.current -= 1;
      setLiveCountdown(liveCountRef.current);
      if (liveCountRef.current <= 0) {
        liveCountRef.current = 8;
        setLiveCountdown(8);
        captureFrameAndAnalyze();
      }
    }, 1000);
    return () => { if (liveTimerRef.current) clearInterval(liveTimerRef.current); };
  }, [liveCoach, cameraActive, captureFrameAndAnalyze]);

  // Rep counter: pixel-diff motion detection
  useEffect(() => {
    if (motionTimerRef.current) { clearInterval(motionTimerRef.current); motionTimerRef.current = null; }
    if (!repDetecting || !cameraActive) return;

    motionTimerRef.current = setInterval(() => {
      const video = videoRef.current;
      const mc = motionCanvasRef.current;
      if (!video || !mc || video.readyState < 2) return;

      mc.width = 160;
      mc.height = 120;
      const ctx = mc.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(video, 0, 0, 160, 120);
      const frame = ctx.getImageData(0, 0, 160, 120);

      if (prevFrameRef.current) {
        const motion = calcMotion(frame, prevFrameRef.current);
        const hist = motionHistRef.current;
        hist.push(motion);
        if (hist.length > 8) hist.shift();

        const smoothed = hist.reduce((a, b) => a + b, 0) / hist.length;
        const prevSmoothed = hist.length > 1
          ? hist.slice(0, -1).reduce((a, b) => a + b, 0) / (hist.length - 1)
          : smoothed;

        const isIncreasing = smoothed >= prevSmoothed;
        if (!isIncreasing && wasIncreasingRef.current && smoothed > 12) {
          const now = Date.now();
          if (now - lastRepTimeRef.current > 600) {
            setRepCount(c => c + 1);
            lastRepTimeRef.current = now;
          }
        }
        wasIncreasingRef.current = isIncreasing;
      }

      prevFrameRef.current = frame;
    }, 150);

    return () => { if (motionTimerRef.current) clearInterval(motionTimerRef.current); };
  }, [repDetecting, cameraActive]);

  const replayFeedback = useCallback(() => {
    if (!analysis || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(analysis.slice(0, 300));
    u.rate = 0.95;
    window.speechSynthesis.speak(u);
  }, [analysis]);

  const handleClose = () => {
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    stopAllTimers();
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="p-0 overflow-hidden max-w-sm w-full rounded-2xl border-0">
        <div className="relative bg-black w-full" style={{ aspectRatio: "9/16", maxHeight: "88dvh" }}>

          {/* Live video — always on */}
          <video ref={videoRef} className="w-full h-full object-cover" playsInline muted autoPlay />
          <canvas ref={canvasRef} className="hidden" />
          <canvas ref={motionCanvasRef} className="hidden" />

          {/* No-camera states */}
          {!cameraActive && !cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/80">
              <Camera className="w-12 h-12 text-white/40" />
              <Button onClick={() => startCamera()} className="bg-white/20 hover:bg-white/30 text-white border-white/30" variant="outline" data-testid="button-start-camera">
                Start Camera
              </Button>
            </div>
          )}
          {cameraError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/90 p-6 text-center">
              <X className="w-10 h-10 text-red-400" />
              <p className="text-white text-sm">{cameraError}</p>
              <Button variant="outline" className="bg-white/10 border-white/30 text-white" onClick={() => startCamera()}>Try Again</Button>
            </div>
          )}

          {/* Top bar */}
          <div className="absolute top-0 left-0 right-0 flex items-start justify-between p-3 bg-gradient-to-b from-black/70 to-transparent">
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
                  onClick={() => { setEditingExercise(true); setTimeout(() => inputRef.current?.focus(), 50); }}
                  data-testid="button-edit-exercise"
                >
                  <Camera className="w-3.5 h-3.5 opacity-70 shrink-0" />
                  <span className="truncate max-w-[140px]">{exercise || "Tap to name exercise"}</span>
                </button>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white" onClick={() => { setIsMuted(m => !m); if (!isMuted && window.speechSynthesis) window.speechSynthesis.cancel(); }} data-testid="button-toggle-mute" aria-label="Toggle mute">
                {isMuted ? <MicOff className="w-3.5 h-3.5" /> : <Mic className="w-3.5 h-3.5" />}
              </button>
              <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white" onClick={flipCamera} data-testid="button-flip-camera" aria-label="Flip camera">
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
              <button className="w-8 h-8 rounded-full bg-black/40 flex items-center justify-center text-white" onClick={handleClose} data-testid="button-close-form-check" aria-label="Close">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Rep counter badge */}
          {repDetecting && (
            <div className="absolute top-16 left-3 flex items-center gap-2">
              <div className="bg-black/60 backdrop-blur-sm rounded-2xl px-3 py-1.5 flex items-center gap-2">
                <RefreshCw className="w-3.5 h-3.5 text-green-400 animate-spin" style={{ animationDuration: "2s" }} />
                <span className="text-white text-2xl font-bold leading-none">{repCount}</span>
                <span className="text-white/60 text-xs">reps</span>
              </div>
              <button
                className="w-7 h-7 rounded-full bg-black/40 flex items-center justify-center text-white/70"
                onClick={() => setRepCount(0)}
                data-testid="button-reset-reps"
                aria-label="Reset rep count"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          )}

          {/* Live coach countdown badge */}
          {liveCoach && (
            <div className="absolute top-16 right-3 bg-teal-500/80 backdrop-blur-sm rounded-2xl px-2.5 py-1 flex items-center gap-1.5">
              <Zap className="w-3 h-3 text-white" />
              <span className="text-white text-xs font-semibold">{isAnalyzing ? "…" : `${liveCountdown}s`}</span>
            </div>
          )}

          {/* Feedback overlay */}
          {(analysis || isAnalyzing) && (
            <div className="absolute left-3 right-3 bottom-24 rounded-2xl bg-black/80 backdrop-blur-sm border border-white/10 p-3 space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-teal-400 shrink-0" />
                <span className="text-teal-300 text-xs font-semibold uppercase tracking-wide">DW's Coaching</span>
                {analysis && (
                  <button className="ml-auto text-white/50 hover:text-white" onClick={replayFeedback} data-testid="button-replay-feedback">
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {isAnalyzing && (
                <div className="flex items-center gap-2 text-white/70 text-sm">
                  <Loader2 className="w-4 h-4 animate-spin" />Analyzing your form…
                </div>
              )}
              {analysis && !isAnalyzing && <p className="text-white text-sm leading-relaxed">{analysis}</p>}
            </div>
          )}

          {/* Bottom controls */}
          <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center gap-5 px-6">
            {/* Rep counter toggle */}
            <button
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                repDetecting ? "bg-green-500/80 text-white" : "bg-black/40 text-white/70"
              )}
              onClick={() => setRepDetecting(r => !r)}
              data-testid="button-toggle-reps"
              aria-label="Toggle rep counter"
            >
              <RefreshCw className="w-5 h-5" />
            </button>

            {/* Main analyze button */}
            <Button
              onClick={captureFrameAndAnalyze}
              disabled={!cameraActive || isAnalyzing}
              className={cn(
                "h-16 w-16 rounded-full p-0 shadow-lg border-4 transition-all",
                isAnalyzing
                  ? "border-teal-400/60 bg-teal-500/20 scale-95"
                  : "border-white bg-white/10 hover:bg-white/20 active:scale-95"
              )}
              data-testid="button-analyze-form"
              aria-label="Analyze my form"
            >
              {isAnalyzing ? <Loader2 className="w-7 h-7 text-teal-400 animate-spin" /> : <Sparkles className="w-7 h-7 text-white" />}
            </Button>

            {/* Live coach toggle */}
            <button
              className={cn(
                "w-11 h-11 rounded-full flex items-center justify-center transition-all",
                liveCoach ? "bg-teal-500/80 text-white" : "bg-black/40 text-white/70"
              )}
              onClick={() => setLiveCoach(l => !l)}
              data-testid="button-toggle-live-coach"
              aria-label="Toggle live coach"
            >
              {liveCoach ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
            </button>
          </div>

          {/* Bottom labels */}
          <div className="absolute bottom-0 left-0 right-0 flex items-end justify-center gap-5 px-6 pb-1">
            <span className="w-11 text-center text-[10px] text-white/50">Reps</span>
            <span className="w-16 text-center text-[10px] text-white/50">Analyze</span>
            <span className="w-11 text-center text-[10px] text-white/50">Auto</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
