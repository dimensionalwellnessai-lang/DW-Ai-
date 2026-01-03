import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, X } from "lucide-react";
import { COPY } from "@/copy/en";

export type OnboardingMood = "calm" | "heavy" | "scattered" | "pushing" | "unsure";

interface SoftOnboardingModalProps {
  open: boolean;
  onComplete: (mood: OnboardingMood) => void;
  onSkip: () => void;
}

const ENERGY_OPTIONS: { value: OnboardingMood; label: string }[] = [
  { value: "calm", label: COPY.onboarding.energyOptions[0] },
  { value: "heavy", label: COPY.onboarding.energyOptions[1] },
  { value: "scattered", label: COPY.onboarding.energyOptions[2] },
  { value: "pushing", label: COPY.onboarding.energyOptions[3] },
  { value: "unsure", label: COPY.onboarding.energyOptions[4] },
];

const BACKGROUND_OPTIONS = COPY.onboarding.backgroundOptions;

export function SoftOnboardingModal({ open, onComplete, onSkip }: SoftOnboardingModalProps) {
  const [step, setStep] = useState(1);
  const [selectedEnergy, setSelectedEnergy] = useState<OnboardingMood | null>(null);
  const [selectedBackground, setSelectedBackground] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setStep(1);
      setSelectedEnergy(null);
      setSelectedBackground(null);
    }
  }, [open]);

  if (!open) return null;

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedEnergy) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4 && selectedEnergy) {
      onComplete(selectedEnergy);
    }
  };

  const totalSteps = 4;

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
                <h2 className="text-2xl font-display font-semibold">
                  {COPY.onboarding.screen1Title}
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed">
                  {COPY.onboarding.screen1Body}
                </p>
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                data-testid="button-onboarding-continue-1"
              >
                {COPY.onboarding.ctaStart}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
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
                  {COPY.onboarding.energyPrompt}
                </h2>
              </div>

              <div className="space-y-2">
                {ENERGY_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => setSelectedEnergy(option.value)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedEnergy === option.value
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`button-energy-${option.value}`}
                  >
                    <span className="font-medium">{option.label}</span>
                  </button>
                ))}
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                disabled={!selectedEnergy}
                data-testid="button-onboarding-continue-2"
              >
                {COPY.actions.continue}
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
              <div className="text-center space-y-2">
                <h2 className="text-xl font-display font-semibold">
                  {COPY.onboarding.backgroundPrompt}
                </h2>
              </div>

              <div className="space-y-2">
                {BACKGROUND_OPTIONS.map((option, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedBackground(option)}
                    className={`w-full p-4 rounded-xl text-left transition-all border ${
                      selectedBackground === option
                        ? "border-primary bg-primary/10"
                        : "border-transparent bg-muted/50 hover-elevate"
                    }`}
                    data-testid={`button-background-${index}`}
                  >
                    <span className="font-medium">{option}</span>
                  </button>
                ))}
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                data-testid="button-onboarding-continue-3"
              >
                {COPY.actions.continue}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="space-y-4">
                <h2 className="text-xl font-display font-semibold text-center">
                  {COPY.onboarding.boundaryTitle}
                </h2>
                <p className="text-muted-foreground font-body leading-relaxed text-center">
                  {COPY.onboarding.boundaryBody}
                </p>
              </div>

              <div className="p-4 rounded-xl bg-muted/50 border dark:border-white/5">
                <p className="text-sm font-body text-muted-foreground leading-relaxed">
                  {COPY.onboarding.closeBody}
                </p>
              </div>

              <Button 
                onClick={handleContinue}
                className="w-full"
                data-testid="button-onboarding-complete"
              >
                {COPY.onboarding.closeCTA}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex justify-center gap-1.5 mt-6">
          {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
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
