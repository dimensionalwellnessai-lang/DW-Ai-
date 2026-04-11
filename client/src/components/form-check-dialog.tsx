import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Camera, RotateCcw, Sparkles, Loader2, X, Volume2 } from "lucide-react";

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
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [exercise, setExercise] = useState(exerciseName);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"user" | "environment">("environment");

  useEffect(() => {
    setExercise(exerciseName);
  }, [exerciseName]);

  useEffect(() => {
    if (!open) {
      stopCamera();
      setCapturedPhoto(null);
      setAnalysis(null);
      setCameraError(null);
    }
  }, [open]);

  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode, width: { ideal: 720 }, height: { ideal: 1280 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
        setCameraActive(true);
      }
    } catch (err: any) {
      setCameraError("Camera access denied. Please allow camera permissions and try again.");
    }
  }, [facingMode]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraActive(false);
  }, []);

  const flipCamera = useCallback(async () => {
    stopCamera();
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
  }, [facingMode, stopCamera]);

  useEffect(() => {
    if (open && !capturedPhoto && facingMode) {
      startCamera();
    }
  }, [facingMode, open]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedPhoto(dataUrl);
    stopCamera();
  }, [stopCamera]);

  const retake = useCallback(() => {
    setCapturedPhoto(null);
    setAnalysis(null);
    startCamera();
  }, [startCamera]);

  const analyzeForm = useCallback(async () => {
    if (!capturedPhoto) return;
    setIsAnalyzing(true);
    try {
      const result: any = await apiRequest("POST", "/api/body-scan/analyze", {
        photoDataUrl: capturedPhoto,
        exercise: exercise || "general exercise",
      });
      const text = result?.analysis || "Couldn't get feedback right now. Try again.";
      setAnalysis(text);
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
        const utter = new SpeechSynthesisUtterance(text.slice(0, 300));
        utter.rate = 0.95;
        window.speechSynthesis.speak(utter);
      }
    } catch {
      setAnalysis("Couldn't analyze right now. Make sure you're connected and try again.");
    } finally {
      setIsAnalyzing(false);
    }
  }, [capturedPhoto, exercise]);

  const handleClose = () => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && handleClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-primary" />
            Form Check
          </DialogTitle>
          <DialogDescription>
            Prop your phone up, hold your position, then capture for DW's coaching feedback.
          </DialogDescription>
        </DialogHeader>

        <div className="p-4 space-y-4">
          {/* Exercise name */}
          <div className="space-y-1.5">
            <Label htmlFor="exercise-name" className="text-xs">Exercise</Label>
            <Textarea
              id="exercise-name"
              value={exercise}
              onChange={(e) => setExercise(e.target.value)}
              placeholder="e.g. Squat, Push-up, Deadlift…"
              className="resize-none min-h-[48px] text-sm"
              rows={1}
              data-testid="input-form-check-exercise"
            />
          </div>

          {/* Camera / photo area */}
          <div className="relative rounded-xl overflow-hidden bg-black aspect-[3/4] w-full">
            {!capturedPhoto && (
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
                autoPlay
              />
            )}
            {capturedPhoto && (
              <img
                src={capturedPhoto}
                alt="Captured form"
                className="w-full h-full object-cover"
              />
            )}
            {!cameraActive && !capturedPhoto && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/60">
                <Camera className="w-10 h-10 text-white/60" />
                <Button
                  onClick={startCamera}
                  variant="outline"
                  className="bg-white/10 border-white/30 text-white hover:bg-white/20"
                  data-testid="button-start-camera"
                >
                  Start Camera
                </Button>
              </div>
            )}
            {cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 p-4 text-center">
                <X className="w-8 h-8 text-red-400" />
                <p className="text-white text-sm">{cameraError}</p>
              </div>
            )}
            {cameraActive && !capturedPhoto && (
              <button
                className="absolute top-3 right-3 w-9 h-9 bg-black/40 rounded-full flex items-center justify-center text-white"
                onClick={flipCamera}
                data-testid="button-flip-camera"
                aria-label="Flip camera"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />

          {/* Analysis result */}
          {analysis && (
            <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm font-medium text-primary">DW's Feedback</span>
                <button
                  className="ml-auto text-muted-foreground hover:text-foreground"
                  onClick={() => {
                    if (window.speechSynthesis) {
                      window.speechSynthesis.cancel();
                      const u = new SpeechSynthesisUtterance(analysis.slice(0, 300));
                      u.rate = 0.95;
                      window.speechSynthesis.speak(u);
                    }
                  }}
                  data-testid="button-replay-feedback"
                  aria-label="Replay voice feedback"
                >
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              <p className="text-sm leading-relaxed">{analysis}</p>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-2">
            {!capturedPhoto && cameraActive && (
              <Button
                className="flex-1"
                onClick={capturePhoto}
                data-testid="button-capture-form"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
            )}
            {capturedPhoto && !analysis && (
              <>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={retake}
                  data-testid="button-retake"
                >
                  <RotateCcw className="w-4 h-4 mr-2" />
                  Retake
                </Button>
                <Button
                  className="flex-1"
                  onClick={analyzeForm}
                  disabled={isAnalyzing}
                  data-testid="button-analyze-form"
                >
                  {isAnalyzing ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Sparkles className="w-4 h-4 mr-2" />
                  )}
                  {isAnalyzing ? "Analyzing…" : "Analyze Form"}
                </Button>
              </>
            )}
            {analysis && (
              <Button
                variant="outline"
                className="flex-1"
                onClick={retake}
                data-testid="button-check-again"
              >
                <Camera className="w-4 h-4 mr-2" />
                Check Again
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
