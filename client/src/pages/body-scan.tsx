import { useState, useRef, useCallback } from "react";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Camera,
  Shield,
  Target,
  CheckCircle,
  AlertCircle,
  Loader2,
  X,
} from "lucide-react";

type Step = "consent" | "goals" | "capture" | "complete";

const GOAL_OPTIONS = [
  { id: "track_progress", label: "Track physical changes over time" },
  { id: "posture", label: "Monitor posture improvements" },
  { id: "wellness_check", label: "General wellness awareness" },
  { id: "body_comp", label: "Track body composition goals" },
];

export function BodyScanPage() {
  const { toast } = useToast();
  const [step, setStep] = useState<Step>("consent");
  const [hasConsent, setHasConsent] = useState(false);
  const [selectedGoals, setSelectedGoals] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const saveMutation = useMutation({
    mutationFn: async (data: { imageData: string; goals: string[]; notes: string }) => {
      const res = await apiRequest("POST", "/api/body-scans", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/body-scans"] });
      setStep("complete");
    },
    onError: () => {
      toast({
        title: "Could not save",
        description: "Something went wrong. Your photo was not saved.",
        variant: "destructive",
      });
    },
  });

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 720, height: 1280 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      toast({
        title: "Camera access needed",
        description: "Please allow camera access to take your scan.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  }, []);

  const capturePhoto = useCallback(() => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        const imageData = canvas.toDataURL("image/jpeg", 0.8);
        setCapturedImage(imageData);
        stopCamera();
      }
    }
  }, [stopCamera]);

  const toggleGoal = (goalId: string) => {
    setSelectedGoals((prev) =>
      prev.includes(goalId) ? prev.filter((g) => g !== goalId) : [...prev, goalId]
    );
  };

  const handleSave = () => {
    if (capturedImage) {
      saveMutation.mutate({
        imageData: capturedImage,
        goals: selectedGoals,
        notes,
      });
    }
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="flex items-center justify-between gap-4 p-4 border-b">
        <div className="flex items-center gap-3">
          <Link href="/">
            <Button variant="ghost" size="icon" data-testid="button-back">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <h1 className="font-display font-bold text-xl">Body Scan</h1>
        </div>
      </header>

      <main className="flex-1 p-4 max-w-lg mx-auto w-full">
        {step === "consent" && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Shield className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Your Privacy Matters</CardTitle>
                    <CardDescription>
                      Before we begin, here's how we handle your photos
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3 text-sm text-muted-foreground">
                  <p>
                    Body scans help you track physical wellness over time. Here's what to know:
                  </p>
                  <ul className="list-disc list-inside space-y-2 pl-2">
                    <li>Photos are stored securely and encrypted</li>
                    <li>Only you can view your body scan history</li>
                    <li>You can delete any photo at any time</li>
                    <li>We never share or sell your images</li>
                    <li>Photos are processed locally when possible</li>
                  </ul>
                </div>

                <div className="flex items-start gap-3 p-4 rounded-md bg-muted/50">
                  <Checkbox
                    id="consent"
                    checked={hasConsent}
                    onCheckedChange={(checked) => setHasConsent(checked === true)}
                    data-testid="checkbox-consent"
                  />
                  <Label htmlFor="consent" className="text-sm leading-relaxed cursor-pointer">
                    I understand how my photos will be used and stored, and I consent to
                    capturing body scan images.
                  </Label>
                </div>
              </CardContent>
            </Card>

            <Button
              className="w-full"
              disabled={!hasConsent}
              onClick={() => setStep("goals")}
              data-testid="button-continue-goals"
            >
              Continue
            </Button>
          </div>
        )}

        {step === "goals" && (
          <div className="space-y-6 py-4">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Target className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">What brings you here?</CardTitle>
                    <CardDescription>
                      Select any goals that resonate with you
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {GOAL_OPTIONS.map((goal) => (
                  <button
                    key={goal.id}
                    onClick={() => toggleGoal(goal.id)}
                    className={`w-full p-4 rounded-md text-left text-sm transition-colors ${
                      selectedGoals.includes(goal.id)
                        ? "bg-primary/10 border border-primary"
                        : "bg-muted/50 border border-transparent hover-elevate"
                    }`}
                    data-testid={`button-goal-${goal.id}`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                          selectedGoals.includes(goal.id)
                            ? "border-primary bg-primary"
                            : "border-muted-foreground"
                        }`}
                      >
                        {selectedGoals.includes(goal.id) && (
                          <CheckCircle className="h-3 w-3 text-primary-foreground" />
                        )}
                      </div>
                      <span>{goal.label}</span>
                    </div>
                  </button>
                ))}

                <div className="pt-4">
                  <Label htmlFor="notes" className="text-sm">
                    Anything else on your mind? (optional)
                  </Label>
                  <Textarea
                    id="notes"
                    placeholder="Any specific areas you want to focus on..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="mt-2"
                    data-testid="input-notes"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              <Button variant="outline" onClick={() => setStep("consent")} className="flex-1">
                Back
              </Button>
              <Button onClick={() => { setStep("capture"); startCamera(); }} className="flex-1" data-testid="button-continue-capture">
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === "capture" && (
          <div className="space-y-6 py-4">
            <Card className="overflow-hidden">
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-full bg-primary/10">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Take Your Scan</CardTitle>
                    <CardDescription>
                      Stand in a well-lit area for the best results
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative aspect-[3/4] bg-black">
                  {cameraActive && !capturedImage && (
                    <>
                      <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="w-48 h-64 border-2 border-white/50 rounded-lg" />
                      </div>
                    </>
                  )}

                  {capturedImage && (
                    <img
                      src={capturedImage}
                      alt="Captured body scan"
                      className="w-full h-full object-cover"
                    />
                  )}

                  {!cameraActive && !capturedImage && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
                      <AlertCircle className="h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">Camera not active</p>
                      <Button onClick={startCamera}>Start Camera</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex gap-3">
              {!capturedImage ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => { stopCamera(); setStep("goals"); }}
                    className="flex-1"
                  >
                    Back
                  </Button>
                  <Button onClick={capturePhoto} disabled={!cameraActive} className="flex-1" data-testid="button-capture">
                    <Camera className="h-4 w-4 mr-2" />
                    Capture
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" onClick={retakePhoto} className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={saveMutation.isPending}
                    className="flex-1"
                    data-testid="button-save-scan"
                  >
                    {saveMutation.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    )}
                    Save Scan
                  </Button>
                </>
              )}
            </div>
          </div>
        )}

        {step === "complete" && (
          <div className="space-y-6 py-8 text-center">
            <div className="inline-flex p-4 rounded-full bg-green-500/10">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <div>
              <h2 className="text-xl font-display font-semibold mb-2">Scan Complete</h2>
              <p className="text-muted-foreground">
                Your body scan has been saved. You can view your history anytime.
              </p>
            </div>
            <div className="flex flex-col gap-3 pt-4">
              <Link href="/">
                <Button className="w-full" data-testid="button-back-home">
                  Back to Assistant
                </Button>
              </Link>
              <Button
                variant="outline"
                onClick={() => {
                  setStep("capture");
                  setCapturedImage(null);
                  startCamera();
                }}
              >
                Take Another Scan
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
