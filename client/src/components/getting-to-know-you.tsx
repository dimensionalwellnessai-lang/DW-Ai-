import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Check, Sparkles } from "lucide-react";
import { 
  getGettingToKnowYou, 
  saveGettingToKnowYou,
  shouldShowOnboardingDialog,
  dismissOnboardingDialog,
  type GettingToKnowYou 
} from "@/lib/guest-storage";

interface GettingToKnowYouProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const SUPPORT_STYLES = [
  { id: "gentle", label: "Gentle guidance", description: "Soft reminders and encouragement" },
  { id: "direct", label: "More direct", description: "Clear and straightforward support" },
  { id: "flexible", label: "It depends", description: "Different approaches for different days" },
];

const ENERGY_TIMES = [
  { id: "morning", label: "Morning", description: "Early in the day" },
  { id: "midday", label: "Midday", description: "Late morning to afternoon" },
  { id: "evening", label: "Evening", description: "Later in the day" },
  { id: "varies", label: "It varies", description: "Different each day" },
];

const DAY_STRUCTURES = [
  { id: "structured", label: "Pretty structured", description: "Clear routines and schedules" },
  { id: "scattered", label: "More scattered", description: "Things feel unpredictable" },
  { id: "mix", label: "A mix of both", description: "Some structure, some chaos" },
];

const CURRENT_NEEDS = [
  { id: "calm", label: "Calm" },
  { id: "focus", label: "Focus" },
  { id: "confidence", label: "Confidence" },
  { id: "stability", label: "Stability" },
  { id: "energy", label: "Energy" },
  { id: "connection", label: "Connection" },
  { id: "clarity", label: "Clarity" },
  { id: "motivation", label: "Motivation" },
];

export function GettingToKnowYouDialog({ open, onClose, onComplete }: GettingToKnowYouProps) {
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<GettingToKnowYou>({
    supportStyle: null,
    peakEnergyTime: null,
    dayStructure: null,
    currentNeeds: [],
    completedAt: null,
  });

  useEffect(() => {
    if (open) {
      const existing = getGettingToKnowYou();
      if (existing) {
        setAnswers(existing);
      }
    }
  }, [open]);

  const handleComplete = () => {
    const completed = { ...answers, completedAt: Date.now() };
    saveGettingToKnowYou(completed);
    onComplete();
  };

  const handleSkip = () => {
    saveGettingToKnowYou(answers);
    onClose();
  };

  const handleNotNow = () => {
    onClose();
  };

  const toggleNeed = (need: string) => {
    const needs = answers.currentNeeds.includes(need)
      ? answers.currentNeeds.filter(n => n !== need)
      : [...answers.currentNeeds, need];
    setAnswers({ ...answers, currentNeeds: needs });
  };

  const canProceed = () => {
    return true;
  };

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-primary/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Getting to Know You</h3>
              <p className="text-muted-foreground">
                If you'd like, we can do a quick check-in so I can support you better. It's short, and you can skip anything.
              </p>
            </div>
            <Button onClick={() => setStep(1)} className="w-full" data-testid="button-start-gtky">
              I'm open to that
            </Button>
            <button
              onClick={handleNotNow}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-gtky"
            >
              Not right now
            </button>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-1">How do you like to be supported?</h3>
              <p className="text-sm text-muted-foreground">There's no right answer here</p>
            </div>
            <div className="space-y-3">
              {SUPPORT_STYLES.map((style) => (
                <button
                  key={style.id}
                  onClick={() => setAnswers({ ...answers, supportStyle: style.id })}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                    answers.supportStyle === style.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-support-${style.id}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answers.supportStyle === style.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {answers.supportStyle === style.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium">{style.label}</div>
                    <div className="text-sm text-muted-foreground">{style.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-1">When do you usually feel most focused?</h3>
              <p className="text-sm text-muted-foreground">Just a general sense</p>
            </div>
            <div className="space-y-3">
              {ENERGY_TIMES.map((time) => (
                <button
                  key={time.id}
                  onClick={() => setAnswers({ ...answers, peakEnergyTime: time.id })}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                    answers.peakEnergyTime === time.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-energy-${time.id}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answers.peakEnergyTime === time.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {answers.peakEnergyTime === time.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium">{time.label}</div>
                    <div className="text-sm text-muted-foreground">{time.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-1">How do your days usually feel?</h3>
              <p className="text-sm text-muted-foreground">No judgment here</p>
            </div>
            <div className="space-y-3">
              {DAY_STRUCTURES.map((structure) => (
                <button
                  key={structure.id}
                  onClick={() => setAnswers({ ...answers, dayStructure: structure.id })}
                  className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-colors ${
                    answers.dayStructure === structure.id
                      ? "border-primary bg-primary/5"
                      : "border-border hover-elevate"
                  }`}
                  data-testid={`button-structure-${structure.id}`}
                >
                  <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                    answers.dayStructure === structure.id ? "border-primary bg-primary" : "border-muted-foreground"
                  }`}>
                    {answers.dayStructure === structure.id && <Check className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  <div>
                    <div className="font-medium">{structure.label}</div>
                    <div className="text-sm text-muted-foreground">{structure.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-6">
              <h3 className="text-lg font-medium mb-1">What would you like to feel more of right now?</h3>
              <p className="text-sm text-muted-foreground">Pick as many as feel true</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {CURRENT_NEEDS.map((need) => (
                <button
                  key={need.id}
                  onClick={() => toggleNeed(need.id)}
                  data-testid={`button-need-${need.id}`}
                >
                  <Badge
                    variant={answers.currentNeeds.includes(need.id) ? "default" : "outline"}
                    className="cursor-pointer text-sm py-2 px-4"
                  >
                    {need.label}
                  </Badge>
                </button>
              ))}
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
              <h3 className="text-xl font-display font-semibold mb-2">Thank you</h3>
              <p className="text-muted-foreground">
                This helps me understand where you are. We can always revisit this whenever you'd like.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full" data-testid="button-finish-gtky">
              Sounds good
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  const totalSteps = 5;
  const showNav = step > 0 && step < 5;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="sr-only">
          <DialogTitle>Getting to Know You</DialogTitle>
          <DialogDescription>A quick check-in to help us support you better</DialogDescription>
        </DialogHeader>
        
        {showNav && (
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setStep(step - 1)}
              data-testid="button-back-step"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((s) => (
                <div
                  key={s}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    s <= step ? "bg-primary" : "bg-muted"
                  }`}
                />
              ))}
            </div>
            <button
              onClick={handleSkip}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              data-testid="button-skip-step"
            >
              Skip
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

export function useGettingToKnowYou() {
  const [showDialog, setShowDialog] = useState(false);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    if (!hasChecked) {
      if (shouldShowOnboardingDialog()) {
        const timer = setTimeout(() => setShowDialog(true), 1500);
        return () => clearTimeout(timer);
      }
      setHasChecked(true);
    }
  }, [hasChecked]);

  const openDialog = () => setShowDialog(true);
  const closeDialog = () => {
    dismissOnboardingDialog();
    setShowDialog(false);
    setHasChecked(true);
  };

  return {
    showDialog,
    openDialog,
    closeDialog,
    GettingToKnowYouDialog,
  };
}
