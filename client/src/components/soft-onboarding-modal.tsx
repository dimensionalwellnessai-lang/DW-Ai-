import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, X, Anchor, RefreshCw, ListTodo, MessageCircle, Play, Plus, Calendar } from "lucide-react";
import { COPY } from "@/copy/en";
import { BreathingPlayer } from "./breathing-player";
import { saveCalendarEvent, saveSoftOnboardingProgress, getSoftOnboardingProgress, saveOnboardingLog } from "@/lib/guest-storage";
import { useToast } from "@/hooks/use-toast";
import { Lightbulb } from "lucide-react";

export type OnboardingMood = "calm" | "heavy" | "scattered" | "pushing" | "unsure";

interface SoftOnboardingModalProps {
  open: boolean;
  onComplete: (mood: OnboardingMood, selectedMoods?: OnboardingMood[], selectedBackgrounds?: string[], responseType?: ResponseType) => void;
  onSkip: () => void;
  onOpenChat?: () => void;
}

type ResponseType = "anchor" | "reframe" | "plan" | "talk";

interface ResponseOption {
  id: ResponseType;
  label: string;
  description: string;
  action: string;
  icon: typeof Anchor;
}

const RESPONSE_OPTIONS: ResponseOption[] = [
  {
    id: "anchor",
    label: "Anchor",
    description: "Ground yourself with a short breathing exercise",
    action: "Starts a 60-90 second guided grounding practice",
    icon: Anchor,
  },
  {
    id: "reframe",
    label: "Reframe",
    description: "Flip the script with a new perspective",
    action: "Get a perspective shift + one action step",
    icon: RefreshCw,
  },
  {
    id: "plan",
    label: "Plan",
    description: "Take control of the next hour",
    action: "Create a tiny plan for the next 30-60 minutes",
    icon: ListTodo,
  },
  {
    id: "talk",
    label: "Talk it out",
    description: "Process what's on your mind",
    action: "Opens chat mode to explore what's happening",
    icon: MessageCircle,
  },
];

const ENERGY_OPTIONS: { value: OnboardingMood; label: string }[] = [
  { value: "calm", label: COPY.onboarding.energyOptions[0] },
  { value: "heavy", label: COPY.onboarding.energyOptions[1] },
  { value: "scattered", label: COPY.onboarding.energyOptions[2] },
  { value: "pushing", label: COPY.onboarding.energyOptions[3] },
  { value: "unsure", label: COPY.onboarding.energyOptions[4] },
];

const BACKGROUND_OPTIONS = COPY.onboarding.backgroundOptions;

const REFRAME_PERSPECTIVES = [
  "What if this moment is exactly where you need to be?",
  "Notice: you're already taking a step by pausing here.",
  "The weight you feel doesn't define your capacity.",
  "This feeling is temporary. You've moved through hard things before.",
  "What would 'good enough' look like right now?",
];

export function SoftOnboardingModal({ open, onComplete, onSkip, onOpenChat }: SoftOnboardingModalProps) {
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedEnergies, setSelectedEnergies] = useState<OnboardingMood[]>([]);
  const [selectedBackgrounds, setSelectedBackgrounds] = useState<string[]>([]);
  const [selectedResponse, setSelectedResponse] = useState<ResponseType | null>(null);
  const [showResponseAction, setShowResponseAction] = useState(false);
  const [showBreathing, setShowBreathing] = useState(false);
  const [reframePerspective, setReframePerspective] = useState("");

  useEffect(() => {
    if (open) {
      const saved = getSoftOnboardingProgress();
      if (saved) {
        setStep(saved.step || 1);
        setSelectedEnergies((saved.selectedEnergies || []) as OnboardingMood[]);
        setSelectedBackgrounds(saved.selectedBackgrounds || []);
        setSelectedResponse((saved.selectedResponse as ResponseType) || null);
      } else {
        setStep(1);
        setSelectedEnergies([]);
        setSelectedBackgrounds([]);
        setSelectedResponse(null);
      }
      setShowResponseAction(false);
      setShowBreathing(false);
    }
  }, [open]);

  useEffect(() => {
    if (open && step > 1) {
      saveSoftOnboardingProgress({
        step,
        selectedEnergies,
        selectedBackgrounds,
        selectedResponse,
      });
    }
  }, [open, step, selectedEnergies, selectedBackgrounds, selectedResponse]);

  if (!open) return null;

  const toggleEnergy = (value: OnboardingMood) => {
    setSelectedEnergies((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const toggleBackground = (value: string) => {
    setSelectedBackgrounds((prev) =>
      prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]
    );
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
      setShowResponseAction(false);
    }
  };

  const handleContinue = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2 && selectedEnergies.length > 0) {
      setStep(3);
    } else if (step === 3) {
      setStep(4);
    } else if (step === 4 && selectedResponse) {
      setShowResponseAction(true);
    }
  };

  const handleStartAction = () => {
    if (selectedResponse === "anchor") {
      setShowBreathing(true);
    } else if (selectedResponse === "reframe") {
      const randomPerspective = REFRAME_PERSPECTIVES[Math.floor(Math.random() * REFRAME_PERSPECTIVES.length)];
      setReframePerspective(randomPerspective);
      setStep(5);
    } else if (selectedResponse === "plan") {
      setStep(6);
    } else if (selectedResponse === "talk") {
      saveOnboardingLog({
        type: "session_started",
        title: "Talk Session Started",
        content: "Started a conversation to process what's on your mind.",
        energyStates: selectedEnergies,
        backgroundContext: selectedBackgrounds,
        dimensionTags: ["emotional", "mental"],
      });
      
      saveSoftOnboardingProgress(null);
      onOpenChat?.();
      onComplete(selectedEnergies[0] || "unsure", selectedEnergies, selectedBackgrounds, "talk");
    }
  };

  const handleBreathingComplete = () => {
    setShowBreathing(false);
    
    saveOnboardingLog({
      type: "grounding_practice",
      title: "Grounding Practice Complete",
      content: "Completed a 60-90 second breathing exercise to reduce acute arousal and restore calm.",
      energyStates: selectedEnergies,
      backgroundContext: selectedBackgrounds,
      dimensionTags: ["emotional", "physical"],
    });
    
    toast({ title: "Grounding complete", description: "Take this calm with you. Saved to your log." });
    saveSoftOnboardingProgress(null);
    onComplete(selectedEnergies[0] || "calm", selectedEnergies, selectedBackgrounds, "anchor");
  };

  const handleAddToRoutine = async (type: string) => {
    const now = Date.now();
    const endTime = now + 5 * 60 * 1000;
    
    saveCalendarEvent({
      title: type === "anchor" ? "Grounding Practice" : type === "reframe" ? "Perspective Shift" : "Quick Planning",
      description: `Part of your ${type} practice from Pause flow`,
      dimension: "emotional",
      startTime: now,
      endTime: endTime,
      isAllDay: false,
      location: null,
      virtualLink: null,
      reminders: [],
      recurring: false,
      recurrencePattern: null,
      relatedFoundationIds: [],
      tags: [type, "pause-flow"],
    });
    
    toast({ title: "Added to today", description: "This practice is on your calendar." });
  };

  const handleFinishReframe = () => {
    saveOnboardingLog({
      type: "perspective_shift",
      title: "Perspective Shift",
      content: reframePerspective,
      actionStep: "Take one breath and name one thing you can do in the next 10 minutes.",
      energyStates: selectedEnergies,
      backgroundContext: selectedBackgrounds,
      dimensionTags: ["emotional", "mental"],
    });
    
    toast({ title: "Perspective saved", description: "This shift is now in your log." });
    saveSoftOnboardingProgress(null);
    onComplete(selectedEnergies[0] || "unsure", selectedEnergies, selectedBackgrounds, "reframe");
  };

  const handleFinishPlan = () => {
    saveOnboardingLog({
      type: "next_hour_plan",
      title: "Next Hour Plan",
      content: "Created a 30-60 minute plan: 5 min to get settled, 20-40 min focused task, 5 min pause before next thing.",
      energyStates: selectedEnergies,
      backgroundContext: selectedBackgrounds,
      dimensionTags: ["productivity", "mental"],
    });
    
    toast({ title: "Plan saved", description: "Your next hour plan is logged." });
    saveSoftOnboardingProgress(null);
    onComplete(selectedEnergies[0] || "unsure", selectedEnergies, selectedBackgrounds, "plan");
  };

  const totalSteps = 4;

  return (
    <>
      <BreathingPlayer
        open={showBreathing}
        onClose={() => setShowBreathing(false)}
        onComplete={handleBreathingComplete}
      />
      
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
                  <p className="text-sm text-muted-foreground">
                    Pick as many as apply.
                  </p>
                </div>

                <div className="space-y-2">
                  {ENERGY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => toggleEnergy(option.value)}
                      className={`w-full p-4 rounded-xl text-left transition-all border ${
                        selectedEnergies.includes(option.value)
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted/50 hover-elevate"
                      }`}
                      data-testid={`button-energy-${option.value}`}
                    >
                      <span className="font-medium">{option.label}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost"
                    onClick={handleBack}
                    data-testid="button-onboarding-back-2"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {COPY.actions.back}
                  </Button>
                  <Button 
                    onClick={handleContinue}
                    className="flex-1"
                    disabled={selectedEnergies.length === 0}
                    data-testid="button-onboarding-continue-2"
                  >
                    {COPY.actions.continue}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
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
                  <p className="text-sm text-muted-foreground">
                    Pick as many as apply.
                  </p>
                </div>

                <div className="space-y-2">
                  {BACKGROUND_OPTIONS.map((option, index) => (
                    <button
                      key={index}
                      onClick={() => toggleBackground(option)}
                      className={`w-full p-4 rounded-xl text-left transition-all border ${
                        selectedBackgrounds.includes(option)
                          ? "border-primary bg-primary/10"
                          : "border-transparent bg-muted/50 hover-elevate"
                      }`}
                      data-testid={`button-background-${index}`}
                    >
                      <span className="font-medium">{option}</span>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost"
                    onClick={handleBack}
                    data-testid="button-onboarding-back-3"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {COPY.actions.back}
                  </Button>
                  <Button 
                    onClick={handleContinue}
                    className="flex-1"
                    data-testid="button-onboarding-continue-3"
                  >
                    {COPY.actions.continue}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && !showResponseAction && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <h2 className="text-xl font-display font-semibold text-center">
                    {COPY.onboarding.boundaryTitle}
                  </h2>
                  <p className="text-sm text-muted-foreground text-center">
                    How do you want to respond right now?
                  </p>
                </div>

                <div className="space-y-2">
                  {RESPONSE_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    return (
                      <button
                        key={option.id}
                        onClick={() => setSelectedResponse(option.id)}
                        className={`w-full p-4 rounded-xl text-left transition-all border ${
                          selectedResponse === option.id
                            ? "border-primary bg-primary/10"
                            : "border-transparent bg-muted/50 hover-elevate"
                        }`}
                        data-testid={`button-response-${option.id}`}
                      >
                        <div className="flex items-start gap-3">
                          <Icon className="h-5 w-5 mt-0.5 text-primary" />
                          <div>
                            <span className="font-medium block">{option.label}</span>
                            <span className="text-sm text-muted-foreground">{option.description}</span>
                            <span className="text-xs text-muted-foreground/70 block mt-1">{option.action}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost"
                    onClick={handleBack}
                    data-testid="button-onboarding-back-4"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {COPY.actions.back}
                  </Button>
                  <Button 
                    onClick={handleContinue}
                    className="flex-1"
                    disabled={!selectedResponse}
                    data-testid="button-onboarding-continue-4"
                  >
                    {COPY.actions.continue}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 4 && showResponseAction && (
              <motion.div
                key="step4-action"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4 text-center">
                  <h2 className="text-xl font-display font-semibold">
                    Here's what we're doing
                  </h2>
                  {selectedResponse && (
                    <div className="p-4 rounded-xl bg-muted/50 border dark:border-white/5">
                      <p className="font-medium">
                        {RESPONSE_OPTIONS.find(o => o.id === selectedResponse)?.label}
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        {RESPONSE_OPTIONS.find(o => o.id === selectedResponse)?.action}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost"
                    onClick={() => setShowResponseAction(false)}
                    data-testid="button-action-back"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    {COPY.actions.back}
                  </Button>
                  <Button 
                    onClick={handleStartAction}
                    className="flex-1"
                    data-testid="button-start-action"
                  >
                    <Play className="mr-2 h-4 w-4" />
                    Start
                  </Button>
                </div>
              </motion.div>
            )}

            {step === 5 && (
              <motion.div
                key="step5-reframe"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4 text-center">
                  <RefreshCw className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">
                    Perspective Shift
                  </h2>
                </div>

                <div className="p-6 rounded-xl bg-muted/50 border dark:border-white/5">
                  <p className="text-lg font-body leading-relaxed text-center italic">
                    "{reframePerspective}"
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                  <p className="text-sm font-medium">One small action:</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Take one breath and name one thing you can do in the next 10 minutes.
                  </p>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToRoutine("reframe")}
                    className="flex-1"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add to routine
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToRoutine("reframe")}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Add to today
                  </Button>
                </div>

                <Button 
                  onClick={handleFinishReframe}
                  className="w-full"
                  data-testid="button-finish-reframe"
                >
                  Done
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}

            {step === 6 && (
              <motion.div
                key="step6-plan"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-4 text-center">
                  <ListTodo className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">
                    Quick Plan
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    What's the next 30-60 minutes look like?
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-xl bg-muted/50 border dark:border-white/5">
                    <p className="text-sm font-medium mb-2">Suggested structure:</p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>First 5 min: Get settled (water, bathroom, clear space)</li>
                      <li>Next 20-40 min: One focused task</li>
                      <li>Last 5 min: Quick pause before next thing</li>
                    </ul>
                  </div>
                </div>

                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAddToRoutine("plan")}
                    className="flex-1"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    Add to schedule
                  </Button>
                </div>

                <Button 
                  onClick={handleFinishPlan}
                  className="w-full"
                  data-testid="button-finish-plan"
                >
                  Done
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {step <= 4 && !showResponseAction && (
            <div className="flex justify-center gap-1.5 mt-6">
              {Array.from({ length: totalSteps }, (_, i) => i + 1).map((s) => (
                <button
                  key={s}
                  onClick={() => s < step && setStep(s)}
                  className={`h-1.5 rounded-full transition-all ${
                    s === step ? "w-6 bg-primary" : s < step ? "w-1.5 bg-primary/50 cursor-pointer" : "w-1.5 bg-muted-foreground/30"
                  }`}
                />
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </>
  );
}
