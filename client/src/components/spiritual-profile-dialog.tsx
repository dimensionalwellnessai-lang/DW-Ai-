import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { 
  Sparkles, 
  ChevronLeft, 
  Check,
  Heart,
  Sun,
  Moon
} from "lucide-react";
import { 
  saveSpiritualProfile,
  getSpiritualProfile,
  type SpiritualProfile,
  type SpiritualPractice,
  type ReflectionCadence,
  type GroundingNeed
} from "@/lib/guest-storage";

interface SpiritualProfileDialogProps {
  open: boolean;
  onClose: () => void;
  onComplete: () => void;
}

const PRACTICES: { id: SpiritualPractice; label: string }[] = [
  { id: "meditation", label: "Meditation" },
  { id: "prayer", label: "Prayer" },
  { id: "breathwork", label: "Breathwork" },
  { id: "journaling", label: "Journaling" },
  { id: "gratitude", label: "Gratitude" },
  { id: "nature", label: "Nature" },
  { id: "yoga", label: "Yoga" },
  { id: "mindfulness", label: "Mindfulness" },
];

const CADENCES: { id: ReflectionCadence; label: string; description: string }[] = [
  { id: "daily", label: "Daily", description: "A regular practice each day" },
  { id: "few_times_week", label: "A few times a week", description: "When the moment feels right" },
  { id: "weekly", label: "Weekly", description: "Once a week works best" },
  { id: "as_needed", label: "As needed", description: "When I feel called to it" },
];

const GROUNDING_NEEDS: { id: GroundingNeed; label: string; description: string }[] = [
  { id: "calm", label: "Calm", description: "Settling an overactive mind" },
  { id: "clarity", label: "Clarity", description: "Seeing things more clearly" },
  { id: "connection", label: "Connection", description: "Feeling connected to something larger" },
  { id: "energy", label: "Energy", description: "Revitalizing tired spirit" },
  { id: "release", label: "Release", description: "Letting go of what's heavy" },
];

const CORE_VALUES = [
  "Compassion",
  "Growth",
  "Authenticity",
  "Peace",
  "Service",
  "Wisdom",
  "Love",
  "Balance",
  "Courage",
  "Gratitude",
];

export function SpiritualProfileDialog({ open, onClose, onComplete }: SpiritualProfileDialogProps) {
  const [step, setStep] = useState(0);
  const [profile, setProfile] = useState<SpiritualProfile>({
    practices: [],
    reflectionCadence: null,
    groundingNeeds: [],
    beliefSystem: null,
    values: [],
    dailyIntention: "",
    gratitudeAreas: [],
    notes: "",
    updatedAt: Date.now(),
  });

  useEffect(() => {
    if (open) {
      const existing = getSpiritualProfile();
      if (existing) {
        setProfile(existing);
      }
      setStep(0);
    }
  }, [open]);

  const handleComplete = () => {
    saveSpiritualProfile(profile);
    onComplete();
  };

  const handleSkipToEnd = () => {
    setStep(4);
  };

  const togglePractice = (practice: SpiritualPractice) => {
    const practices = profile.practices.includes(practice)
      ? profile.practices.filter(p => p !== practice)
      : [...profile.practices, practice];
    setProfile({ ...profile, practices });
  };

  const toggleNeed = (need: GroundingNeed) => {
    const needs = profile.groundingNeeds.includes(need)
      ? profile.groundingNeeds.filter(n => n !== need)
      : [...profile.groundingNeeds, need];
    setProfile({ ...profile, groundingNeeds: needs });
  };

  const toggleValue = (value: string) => {
    const values = profile.values.includes(value)
      ? profile.values.filter(v => v !== value)
      : [...profile.values, value];
    setProfile({ ...profile, values });
  };

  const showNav = step > 0 && step < 4;

  const renderStep = () => {
    switch (step) {
      case 0:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Spiritual Wellness</h3>
              <p className="text-muted-foreground">
                Understanding what grounds you helps us suggest practices that nourish your spirit. No specific beliefs required - this is about what brings you peace.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <Button onClick={() => setStep(1)} className="w-full" data-testid="button-start-spiritual">
                I'm open to that
              </Button>
              <Button variant="ghost" onClick={onClose} className="w-full" data-testid="button-skip-spiritual">
                Not right now
              </Button>
            </div>
          </div>
        );

      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">What practices resonate with you?</h3>
              <p className="text-sm text-muted-foreground">Pick any that interest you, or none at all</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {PRACTICES.map((practice) => (
                <Badge
                  key={practice.id}
                  variant={profile.practices.includes(practice.id) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-4 text-sm"
                  onClick={() => togglePractice(practice.id)}
                  data-testid={`badge-practice-${practice.id}`}
                >
                  {practice.label}
                </Badge>
              ))}
            </div>
            <Button onClick={() => setStep(2)} className="w-full mt-4" data-testid="button-continue-spiritual-1">
              Continue
            </Button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">What do you seek when you need grounding?</h3>
              <p className="text-sm text-muted-foreground">What draws you to spiritual practice?</p>
            </div>
            <div className="space-y-2">
              {GROUNDING_NEEDS.map((need) => (
                <button
                  key={need.id}
                  onClick={() => toggleNeed(need.id)}
                  className={`w-full p-4 rounded-md text-left transition-colors ${
                    profile.groundingNeeds.includes(need.id) 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted/50 hover-elevate"
                  }`}
                  data-testid={`button-need-${need.id}`}
                >
                  <div className="font-medium">{need.label}</div>
                  <div className={`text-sm ${profile.groundingNeeds.includes(need.id) ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    {need.description}
                  </div>
                </button>
              ))}
            </div>
            <Button onClick={() => setStep(3)} className="w-full mt-4" data-testid="button-continue-spiritual-2">
              Continue
            </Button>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <h3 className="text-lg font-display font-semibold">What values guide you?</h3>
              <p className="text-sm text-muted-foreground">Choose what matters most to you</p>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {CORE_VALUES.map((value) => (
                <Badge
                  key={value}
                  variant={profile.values.includes(value) ? "default" : "outline"}
                  className="cursor-pointer py-2 px-3"
                  onClick={() => toggleValue(value)}
                  data-testid={`badge-value-${value.toLowerCase()}`}
                >
                  {value}
                </Badge>
              ))}
            </div>
            <div className="space-y-3 pt-4">
              <Label className="text-sm text-muted-foreground">How often would you like to practice?</Label>
              <div className="grid grid-cols-2 gap-2">
                {CADENCES.map((cadence) => (
                  <button
                    key={cadence.id}
                    onClick={() => setProfile({ ...profile, reflectionCadence: cadence.id })}
                    className={`p-3 rounded-md text-left transition-colors ${
                      profile.reflectionCadence === cadence.id 
                        ? "bg-primary text-primary-foreground" 
                        : "bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`button-cadence-${cadence.id}`}
                  >
                    <div className="font-medium text-sm">{cadence.label}</div>
                  </button>
                ))}
              </div>
            </div>
            <Button onClick={() => setStep(4)} className="w-full mt-4" data-testid="button-continue-spiritual-3">
              Continue
            </Button>
          </div>
        );

      case 4:
        return (
          <div className="text-center space-y-6 py-4">
            <div className="w-16 h-16 mx-auto bg-purple-500/10 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-purple-500" />
            </div>
            <div>
              <h3 className="text-xl font-display font-semibold mb-2">Beautiful</h3>
              <p className="text-muted-foreground">
                We'll suggest practices that align with what grounds you. You can revisit this anytime.
              </p>
            </div>
            <Button onClick={handleComplete} className="w-full" data-testid="button-finish-spiritual">
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
          <DialogTitle className="sr-only">Spiritual Wellness</DialogTitle>
          <DialogDescription className="sr-only">
            Tell us about your spiritual practices and what grounds you
          </DialogDescription>
        </DialogHeader>

        {showNav && (
          <div className="flex items-center justify-between gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setStep(step - 1)}
              data-testid="button-prev-spiritual-step"
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <div className="flex gap-1">
              {[1, 2, 3].map((s) => (
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
              data-testid="button-skip-spiritual-step"
            >
              Skip all
            </button>
          </div>
        )}

        {renderStep()}
      </DialogContent>
    </Dialog>
  );
}
