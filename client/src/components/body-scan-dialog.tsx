import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { ChevronRight, ChevronLeft, Check, User, Target, Ruler, Camera, Image, X, Upload } from "lucide-react";
import { 
  getBodyProfile, 
  saveBodyProfile,
  saveBodyScanDraft,
  getBodyScanDraft,
  clearBodyScanDraft,
  getUseMetricUnits,
  setUseMetricUnits,
  type BodyProfile,
  type BodyGoal,
  type BodyPhoto
} from "@/lib/guest-storage";

interface BodyScanDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const BODY_GOALS: { id: BodyGoal; label: string; description: string }[] = [
  { id: "slim_fit", label: "Slim & Fit", description: "Lean physique, lower body fat" },
  { id: "build_muscle", label: "Build Muscle", description: "Gain strength and muscle mass" },
  { id: "tone", label: "Tone Up", description: "Define muscles, stay lean" },
  { id: "maintain", label: "Maintain", description: "Keep current physique" },
  { id: "endurance", label: "Endurance", description: "Cardio focus, stamina" },
  { id: "custom", label: "Something else", description: "You have your own goals" },
];

const FOCUS_AREAS = [
  "Core & Abs",
  "Upper Body",
  "Lower Body",
  "Full Body",
  "Back & Posture",
  "Arms",
  "Flexibility",
  "Cardio Health",
];

const ENERGY_LEVELS = [
  { id: "low", label: "Low energy lately", description: "Feeling tired or depleted" },
  { id: "fluctuating", label: "Up and down", description: "Energy varies day to day" },
  { id: "stable", label: "Pretty steady", description: "Consistent energy levels" },
  { id: "high", label: "Energized", description: "Feeling strong and capable" },
];

const POSE_INSTRUCTIONS = [
  { pose: "front" as const, label: "Front View", instruction: "Stand facing the camera with arms relaxed at your sides" },
  { pose: "side" as const, label: "Side View", instruction: "Turn to show your side profile" },
  { pose: "back" as const, label: "Back View", instruction: "Turn to show your back" },
];

export function BodyScanDialog({ open, onClose, onComplete }: BodyScanDialogProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<BodyProfile>({
    currentState: "",
    bodyGoal: null,
    focusAreas: [],
    measurements: {},
    energyLevel: "",
    notes: "",
    photos: [],
    updatedAt: Date.now(),
  });
  const [cameraActive, setCameraActive] = useState(false);
  const [currentPose, setCurrentPose] = useState<"front" | "side" | "back">("front");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useMetric, setUseMetricLocal] = useState(() => getUseMetricUnits());
  
  const handleUnitToggle = (checked: boolean) => {
    setUseMetricLocal(checked);
    setUseMetricUnits(checked);
  };
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      const existing = getBodyProfile();
      const draft = getBodyScanDraft();
      // Prefer draft if it's more recent than saved profile
      if (draft && draft.savedAt && (!existing?.updatedAt || draft.savedAt > existing.updatedAt)) {
        setProfile({
          currentState: draft.currentState || "",
          bodyGoal: draft.bodyGoal || null,
          focusAreas: draft.focusAreas || [],
          measurements: draft.measurements || {},
          energyLevel: draft.energyLevel || "",
          notes: draft.notes || "",
          photos: draft.photos || [],
          updatedAt: draft.savedAt || Date.now(),
        });
      } else if (existing) {
        setProfile(existing);
      }
      setStep(0);
    }
  }, [open]);

  // Auto-save body scan progress (debounced)
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => {
      saveBodyScanDraft(profile);
    }, 500);
    return () => clearTimeout(timer);
  }, [profile, open]);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const handleComplete = () => {
    stopCamera();
    saveBodyProfile(profile);
    clearBodyScanDraft();
    onComplete();
  };

  const handleSkipToEnd = () => {
    stopCamera();
    saveBodyProfile(profile);
    clearBodyScanDraft();
    onClose();
  };
  
  const handleSkipPhotoStep = () => {
    stopCamera();
    setStep(6);
  };

  const toggleFocusArea = (area: string) => {
    const areas = profile.focusAreas.includes(area)
      ? profile.focusAreas.filter(a => a !== area)
      : [...profile.focusAreas, area];
    setProfile({ ...profile, focusAreas: areas });
  };

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } } 
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setCameraActive(true);
    } catch (err) {
      setCameraError("Camera access denied. Please allow camera permissions to take photos.");
      console.error("Camera error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    
    ctx.drawImage(videoRef.current, 0, 0);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    
    const newPhoto: BodyPhoto = {
      id: Date.now().toString(),
      dataUrl,
      pose: currentPose,
      capturedAt: Date.now(),
    };
    
    const existingPhotos = profile.photos || [];
    const filteredPhotos = existingPhotos.filter(p => p.pose !== currentPose);
    setProfile({ ...profile, photos: [...filteredPhotos, newPhoto] });
  };

  const removePhoto = (photoId: string) => {
    const photos = (profile.photos || []).filter(p => p.id !== photoId);
    setProfile({ ...profile, photos });
  };

  const getPhotoForPose = (pose: "front" | "side" | "back") => {
    return (profile.photos || []).find(p => p.pose === pose);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      const newPhoto: BodyPhoto = {
        id: Date.now().toString(),
        dataUrl,
        pose: currentPose,
        capturedAt: Date.now(),
      };
      
      const existingPhotos = profile.photos || [];
      const filteredPhotos = existingPhotos.filter(p => p.pose !== currentPose);
      setProfile({ ...profile, photos: [...filteredPhotos, newPhoto] });
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const getDisplayHeight = (): string => {
    const heightCm = profile.measurements?.heightCm;
    if (!heightCm) return "";
    if (useMetric) return String(heightCm);
    return String(Math.round(heightCm / 2.54));
  };

  const getDisplayWeight = (): string => {
    const weightKg = profile.measurements?.weightKg;
    if (!weightKg) return "";
    if (useMetric) return String(weightKg);
    return String(Math.round(weightKg * 2.20462));
  };

  const handleHeightChange = (value: string) => {
    if (!value) {
      setProfile({
        ...profile,
        measurements: { ...profile.measurements, heightCm: undefined }
      });
      return;
    }
    const num = Number(value);
    const heightCm = useMetric ? num : Math.round(num * 2.54);
    setProfile({
      ...profile,
      measurements: { ...profile.measurements, heightCm }
    });
  };

  const handleWeightChange = (value: string) => {
    if (!value) {
      setProfile({
        ...profile,
        measurements: { ...profile.measurements, weightKg: undefined }
      });
      return;
    }
    const num = Number(value);
    const weightKg = useMetric ? num : Math.round(num / 2.20462);
    setProfile({
      ...profile,
      measurements: { ...profile.measurements, weightKg }
    });
  };

  const showNav = step > 0 && step < 6;
  const totalSteps = 6;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Body Scan</h3>
              <p className="text-muted-foreground">
                If you'd like, we can learn a bit about your body goals. This helps personalize your workouts and meal plans. Everything here is optional.
              </p>
            </div>
            <Button onClick={() => setStep(1)} className="w-full" data-testid="button-start-body-scan">
              I'm open to that
            </Button>
            <button
              onClick={onClose}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-body-scan"
            >
              Not right now
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">How does your body feel lately?</h3>
              <p className="text-sm text-muted-foreground">In your own words, describe how you've been feeling physically</p>
            </div>
            <Textarea
              value={profile.currentState}
              onChange={(e) => setProfile({ ...profile, currentState: e.target.value })}
              placeholder="e.g., I've been feeling sluggish, my back hurts sometimes, I want more energy..."
              className="min-h-[120px]"
              data-testid="input-current-state"
            />
            <div className="pt-2">
              <p className="text-sm text-muted-foreground mb-3">How's your energy been?</p>
              <div className="grid grid-cols-2 gap-2">
                {ENERGY_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    onClick={() => setProfile({ ...profile, energyLevel: level.id })}
                    className={`p-3 rounded-md text-left transition-colors ${
                      profile.energyLevel === level.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`button-energy-${level.id}`}
                  >
                    <div className="font-medium text-sm">{level.label}</div>
                    <div className={`text-xs ${profile.energyLevel === level.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                      {level.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Target className="w-8 h-8 mx-auto text-primary mb-2" />
              <h3 className="text-lg font-display font-semibold">What feels right for your body?</h3>
              <p className="text-sm text-muted-foreground">Pick what resonates, or skip if you're not sure</p>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {BODY_GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setProfile({ ...profile, bodyGoal: goal.id })}
                  className={`p-4 rounded-md text-left transition-colors ${
                    profile.bodyGoal === goal.id 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-goal-${goal.id}`}
                >
                  <div className="font-medium">{goal.label}</div>
                  <div className={`text-sm ${profile.bodyGoal === goal.id ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {goal.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">Any areas you want to focus on?</h3>
              <p className="text-sm text-muted-foreground">Pick as many as you'd like, or none at all</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {FOCUS_AREAS.map((area) => (
                <Badge
                  key={area}
                  variant={profile.focusAreas.includes(area) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleFocusArea(area)}
                  data-testid={`badge-focus-${area.toLowerCase().replace(/\s+/g, "-")}`}
                >
                  {area}
                </Badge>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Ruler className="w-8 h-8 mx-auto text-primary mb-2" />
              <h3 className="text-lg font-display font-semibold">Optional: Measurements</h3>
              <p className="text-sm text-muted-foreground">
                This can help with more specific recommendations, but it's completely optional
              </p>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-center gap-3 py-2">
                <span className={`text-sm ${!useMetric ? "font-medium" : "text-muted-foreground"}`}>Imperial</span>
                <Switch
                  checked={useMetric}
                  onCheckedChange={handleUnitToggle}
                  data-testid="switch-unit-toggle"
                />
                <span className={`text-sm ${useMetric ? "font-medium" : "text-muted-foreground"}`}>Metric</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height ({useMetric ? "cm" : "in"})</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder={useMetric ? "170" : "67"}
                    value={getDisplayHeight()}
                    onChange={(e) => handleHeightChange(e.target.value)}
                    data-testid="input-height"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight ({useMetric ? "kg" : "lbs"})</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder={useMetric ? "70" : "154"}
                    value={getDisplayWeight()}
                    onChange={(e) => handleWeightChange(e.target.value)}
                    data-testid="input-weight"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Any other notes?</Label>
                <Textarea
                  id="notes"
                  placeholder="Injuries, limitations, or anything else we should know..."
                  value={profile.notes}
                  onChange={(e) => setProfile({ ...profile, notes: e.target.value })}
                  data-testid="input-body-notes"
                />
              </div>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Camera className="w-8 h-8 mx-auto text-primary mb-2" />
              <h3 className="text-lg font-display font-semibold">Optional: Body Photos</h3>
              <p className="text-sm text-muted-foreground">
                Take photos for personalized body type analysis. Photos are stored locally on your device only.
              </p>
            </div>
            
            {cameraError && (
              <div className="p-3 bg-destructive/10 text-destructive text-sm rounded-md mb-4">
                {cameraError}
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={handleSkipPhotoStep}
                  data-testid="button-skip-photos-error"
                >
                  Skip photos for now
                </Button>
              </div>
            )}
            
            {!cameraActive && !cameraError ? (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-2">
                  {POSE_INSTRUCTIONS.map((poseInfo) => {
                    const photo = getPhotoForPose(poseInfo.pose);
                    return (
                      <div key={poseInfo.pose} className="text-center">
                        <div className="aspect-square rounded-md bg-muted/50 flex items-center justify-center overflow-hidden relative">
                          {photo ? (
                            <>
                              <img 
                                src={photo.dataUrl} 
                                alt={poseInfo.label} 
                                className="w-full h-full object-cover"
                              />
                              <button
                                onClick={() => removePhoto(photo.id)}
                                className="absolute top-1 right-1 w-6 h-6 bg-background/80 rounded-full flex items-center justify-center"
                                data-testid={`button-remove-photo-${poseInfo.pose}`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <Image className="w-8 h-8 text-muted-foreground" />
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground mt-1 block">{poseInfo.label}</span>
                      </div>
                    );
                  })}
                </div>
                
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileUpload}
                  data-testid="input-photo-upload"
                />
                
                <div className="flex gap-2">
                  <Button onClick={startCamera} variant="outline" className="flex-1" data-testid="button-start-camera">
                    <Camera className="w-4 h-4 mr-2" />
                    Camera
                  </Button>
                  <Button 
                    onClick={() => fileInputRef.current?.click()} 
                    variant="outline" 
                    className="flex-1" 
                    data-testid="button-upload-photo"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload
                  </Button>
                </div>
                
                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <span>Uploading for:</span>
                  <div className="flex gap-1">
                    {POSE_INSTRUCTIONS.map((poseInfo) => (
                      <Button
                        key={poseInfo.pose}
                        variant={currentPose === poseInfo.pose ? "default" : "ghost"}
                        size="sm"
                        onClick={() => setCurrentPose(poseInfo.pose)}
                        data-testid={`button-select-pose-${poseInfo.pose}`}
                      >
                        {poseInfo.label}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleSkipPhotoStep}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors w-full text-center"
                  data-testid="button-skip-photos"
                >
                  Skip photos
                </button>
              </div>
            ) : cameraActive ? (
              <div className="space-y-4">
                <div className="relative aspect-[4/3] bg-black rounded-md overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                </div>
                
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  {POSE_INSTRUCTIONS.map((poseInfo) => (
                    <Button
                      key={poseInfo.pose}
                      variant={currentPose === poseInfo.pose ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCurrentPose(poseInfo.pose)}
                      data-testid={`button-pose-${poseInfo.pose}`}
                    >
                      {poseInfo.label}
                    </Button>
                  ))}
                </div>
                
                <p className="text-sm text-center text-muted-foreground">
                  {POSE_INSTRUCTIONS.find(p => p.pose === currentPose)?.instruction}
                </p>
                
                <div className="flex gap-2">
                  <Button onClick={capturePhoto} className="flex-1" data-testid="button-capture">
                    <Camera className="w-4 h-4 mr-2" />
                    Capture {POSE_INSTRUCTIONS.find(p => p.pose === currentPose)?.label}
                  </Button>
                  <Button variant="ghost" onClick={stopCamera} data-testid="button-stop-camera">
                    Done
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        );

      case 6:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-emerald-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Got it</h3>
              <p className="text-muted-foreground">
                We'll use this to personalize your workouts and meal suggestions. You can update this anytime.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full" data-testid="button-finish-body-scan">
              Sounds good
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const handleDialogClose = () => {
    stopCamera();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleDialogClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="sr-only">Body Scan</DialogTitle>
          <DialogDescription className="sr-only">
            Tell us about your body goals and preferences
          </DialogDescription>
        </DialogHeader>

        {showNav && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (step === 5) stopCamera();
                setStep(step - 1);
              }}
              data-testid="button-prev-step"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-5 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkipToEnd}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-step"
            >
              Skip all
            </button>
          </div>
        )}

        <ScrollArea className="max-h-[60vh]">
          {renderStep()}
        </ScrollArea>

        {showNav && step < 6 && (
          <div className="mt-6">
            <Button
              onClick={() => setStep(step + 1)}
              className="w-full"
              data-testid="button-next-step"
            >
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
