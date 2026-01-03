import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles, X } from "lucide-react";

export type OnboardingMood = "calm" | "heavy" | "scattered" | "motivated" | "unsure";

interface SoftOnboardingModalProps {
  open: boolean;
  onComplete: (mood: OnboardingMood) => void;
  onSkip: () => void;
}

const MOOD_OPTIONS: { value: OnboardingMood; label: string; description: string }[] = [
  { value: "calm", label: "Calm", description: "Feeling steady today" },
  { value: "heavy", label: "Heavy", description: "Carrying a lot right now" },
  { value: "scattered", label: "Scattered", description: "Mind is all over the place" },
  { value: "motivated", label: "Motivated", description: "Ready to move forward" },
  { value: "unsure", label: "Unsure", description: "Not quite sure yet" },
];

export function SoftOnboardingModal({ open, onComplete, onSkip }: SoftOnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedMood, setSelectedMood] = useState<OnboardingMood | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedMood(null);
    }
  }, [open]);

  if (!open) return null;

  const handleMoodSelect = (mood: OnboardingMood) => {
    setSelectedMood(mood);
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedMood) {
      setStep(3);
    } else if (step === 3 && selectedMood) {
      onComplete(selectedMood);
    }
  };

  const getMoodBasedMessage = () => {
    switch (selectedMood) {
      case "calm":
        return "That's a good place to be. We can use this space to maintain that steadiness or explore what's next.";
      case "heavy":
        return "It sounds like today feels like a lot. This space is here to help you lighten that load, one small step at a time.";
      case "scattered":
        return "When thoughts are scattered, grounding helps. Let's find a small anchor point together.";
      case "motivated":
        return "Let's channel that energy into something meaningful. What matters most to you today?";
      case "unsure":
        return "That's completely okay. Sometimes not knowing is the first step. We can explore gently.";
      default:
        return "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onSkip}
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-md mx-4 glass-strong rounded-2xl p-6 dark:border dark:border-white/10"
      >
        <button
          onClick={onSkip}
          className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
          data-testid="button-skip-onboarding"
        >
          <X className="h-5 w-5" />
        </button>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-4">
                <div className="w-12 h-12 mx-auto rounded-full bg-primary/20 flex items-center justify-center">
                  <Sparkles className="h-6 w-6 text-primary" />
                </div>
                <h2 className="text-xl font-display font-semibold">
                  Welcome
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed">
                  You don't need to have everything figured out to be here.
                </p>
                <p className="text-sm text-muted-foreground/80 font-body">
                  This space is for reflection, clarity, and small steps — at your pace.
                </p>
              </div>

              <div className="pt-4 border-t dark:border-white/10">
                <p className="text-sm text-center text-muted-foreground mb-4">
                  DW.ai helps you understand your energy, focus, and needs — one day at a time.
                </p>
                <Button 
                  onClick={handleContinue}
                  className="w-full"
                  data-testid="button-onboarding-continue-1"
                >
                  Let's check in
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-semibold">
                  How are you feeling right now?
                </h2>
                <p className="text-sm text-muted-foreground">
                  There's no right answer — just what's true for you.
                </p>
              </div>

              <div className="space-y-2">
                {MOOD_OPTIONS.map((mood) => (
                  <button
                    key={mood.value}
                    onClick={() => handleMoodSelect(mood.value)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedMood === mood.value
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`button-mood-${mood.value}`}
                  >
                    <span className="font-medium">{mood.label}</span>
                    <span className="text-sm text-muted-foreground ml-2">
                      — {mood.description}
                    </span>
                  </button>
                ))}
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                disabled={!selectedMood}
                data-testid="button-onboarding-continue-2"
              >
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-muted/50 border dark:border-white/5">
                  <p className="text-sm font-body leading-relaxed">
                    {getMoodBasedMessage()}
                  </p>
                </div>

                <div className="space-y-3 pt-2">
                  <h3 className="font-medium text-sm text-muted-foreground">
                    A note about me:
                  </h3>
                  <p className="text-sm font-body text-muted-foreground leading-relaxed">
                    I'm here to help you understand your thoughts, energy, and needs — 
                    <span className="text-foreground"> not to replace people or professionals.</span>
                  </p>
                  <p className="text-sm font-body text-muted-foreground">
                    You're always in control of what you share and how deeply you engage.
                  </p>
                </div>
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                data-testid="button-onboarding-complete"
              >
                That makes sense — let's begin
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-1.5 mt-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all ${
                s === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </motion.div>
    </div>
  );
}
