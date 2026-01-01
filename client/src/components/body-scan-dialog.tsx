import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChevronRight, ChevronLeft, Check, User, Target, Ruler } from "lucide-react";
import { 
  getBodyProfile, 
  saveBodyProfile,
  type BodyProfile,
  type BodyGoal
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

export function BodyScanDialog({ open, onClose, onComplete }: BodyScanDialogProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<BodyProfile>({
    currentState: "",
    bodyGoal: null,
    focusAreas: [],
    measurements: {},
    energyLevel: "",
    notes: "",
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (open) {
      const existing = getBodyProfile();
      if (existing) {
        setProfile(existing);
      }
      setStep(0);
    }
  }, [open]);

  const handleComplete = () => {
    saveBodyProfile(profile);
    onComplete();
  };

  const handleSkipToEnd = () => {
    saveBodyProfile(profile);
    onClose();
  };

  const toggleFocusArea = (area: string) => {
    const areas = profile.focusAreas.includes(area)
      ? profile.focusAreas.filter(a => a !== area)
      : [...profile.focusAreas, area];
    setProfile({ ...profile, focusAreas: areas });
  };

  const showNav = step > 0 && step < 5;
  const totalSteps = 5;

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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="height">Height (cm)</Label>
                  <Input
                    id="height"
                    type="number"
                    placeholder="170"
                    value={profile.measurements?.heightCm || ""}
                    onChange={(e) => setProfile({
                      ...profile,
                      measurements: { ...profile.measurements, heightCm: e.target.value ? Number(e.target.value) : undefined }
                    })}
                    data-testid="input-height"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="weight">Weight (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    placeholder="70"
                    value={profile.measurements?.weightKg || ""}
                    onChange={(e) => setProfile({
                      ...profile,
                      measurements: { ...profile.measurements, weightKg: e.target.value ? Number(e.target.value) : undefined }
                    })}
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

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
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
              onClick={() => setStep(step - 1)}
              data-testid="button-prev-step"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`h-1.5 w-6 rounded-full transition-colors ${
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

        {renderStep()}

        {showNav && step < 5 && (
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
