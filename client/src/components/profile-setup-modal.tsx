import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Calendar, Sparkles, Heart, Brain, Zap, DollarSign, Briefcase, Users, Home, Palette, BookOpen, Leaf, Target, MessageCircle } from "lucide-react";
import { saveProfileSetup, getProfileSetup, WeeklyRhythm, LifeDimension } from "@/lib/guest-storage";

interface ProfileSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onOpenChat?: () => void;
}

const WEEKLY_RHYTHMS: { id: WeeklyRhythm; label: string; description: string }[] = [
  { id: "structured", label: "Pretty structured", description: "Regular work hours, consistent routines" },
  { id: "flexible", label: "Mostly flexible", description: "I set my own schedule day to day" },
  { id: "mixed", label: "Mix of both", description: "Some fixed commitments, some flexibility" },
  { id: "varies", label: "It varies a lot", description: "Every week looks different" },
];

const LIFE_DIMENSIONS: { id: LifeDimension; label: string; icon: typeof Heart }[] = [
  { id: "physical", label: "Physical wellness", icon: Zap },
  { id: "emotional", label: "Emotional health", icon: Heart },
  { id: "mental", label: "Mental clarity", icon: Brain },
  { id: "spiritual", label: "Spiritual growth", icon: Sparkles },
  { id: "financial", label: "Financial wellness", icon: DollarSign },
  { id: "career", label: "Career & work", icon: Briefcase },
  { id: "relationships", label: "Relationships", icon: Users },
  { id: "family", label: "Family", icon: Home },
  { id: "creative", label: "Creativity", icon: Palette },
  { id: "learning", label: "Learning & growth", icon: BookOpen },
  { id: "environment", label: "Living space", icon: Leaf },
  { id: "purpose", label: "Purpose & meaning", icon: Target },
];

const DW_GREETINGS: Record<LifeDimension, string> = {
  physical: "I love that you're prioritizing your body. We'll find movement that feels good, not forced.",
  emotional: "Emotional wellness is foundational. I'm here to help you navigate whatever comes up.",
  mental: "Mental clarity changes everything. Let's create space for clearer thinking together.",
  spiritual: "There's something beautiful about exploring the deeper questions. I'm honored to be part of that.",
  financial: "Money stress is real. We'll work on building a relationship with finances that feels peaceful.",
  career: "Work is such a big part of life. Let's make sure it's working for you, not against you.",
  relationships: "Connection matters so much. I'll help you nurture the relationships that matter most.",
  family: "Family dynamics can be complex. I'm here to help you show up the way you want to.",
  social: "Building community takes intention. We'll find ways to connect that feel authentic.",
  creative: "Creativity is soul food. Let's make sure you're feeding that part of yourself.",
  learning: "Curiosity is a gift. I'll help you keep growing in ways that excite you.",
  environment: "Your space shapes your state. We'll create an environment that supports who you want to be.",
  purpose: "The big questions are worth exploring. I'm here to help you find and follow your meaning.",
};

export function ProfileSetupModal({ isOpen, onComplete, onOpenChat }: ProfileSetupModalProps) {
  const [step, setStep] = useState(1);
  const [weeklyRhythm, setWeeklyRhythm] = useState<WeeklyRhythm | null>(null);
  const [primaryFocus, setPrimaryFocus] = useState<LifeDimension | null>(null);

  useEffect(() => {
    const existing = getProfileSetup();
    if (existing) {
      if (existing.weeklyRhythm) setWeeklyRhythm(existing.weeklyRhythm);
      if (existing.primaryFocus) setPrimaryFocus(existing.primaryFocus);
    }
  }, []);

  if (!isOpen) return null;

  const handleContinue = () => {
    if (step === 1 && weeklyRhythm) {
      saveProfileSetup({ weeklyRhythm });
      setStep(2);
    } else if (step === 2 && primaryFocus) {
      saveProfileSetup({ primaryFocus });
      setStep(3);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  const handleFinish = () => {
    saveProfileSetup({ metDW: true, completedAt: Date.now() });
    onComplete();
  };

  const handleStartChat = () => {
    saveProfileSetup({ metDW: true, completedAt: Date.now() });
    onOpenChat?.();
    onComplete();
  };

  return (
    <>
      <div 
        className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50"
        data-testid="profile-setup-backdrop"
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-card border dark:border-white/10 rounded-2xl shadow-xl w-full max-w-md p-6 relative overflow-hidden"
        >
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <div className="space-y-2 text-center">
                  <Calendar className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">
                    What's your week usually like?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    This helps me suggest things at the right times.
                  </p>
                </div>

                <div className="space-y-2">
                  {WEEKLY_RHYTHMS.map((rhythm) => (
                    <button
                      key={rhythm.id}
                      onClick={() => setWeeklyRhythm(rhythm.id)}
                      className={`w-full p-4 rounded-xl text-left transition-all border ${
                        weeklyRhythm === rhythm.id
                          ? "border-primary bg-primary/5"
                          : "border-transparent bg-muted/50 hover-elevate"
                      }`}
                      data-testid={`rhythm-${rhythm.id}`}
                    >
                      <span className="font-medium block">{rhythm.label}</span>
                      <span className="text-sm text-muted-foreground">{rhythm.description}</span>
                    </button>
                  ))}
                </div>

                <Button 
                  onClick={handleContinue}
                  className="w-full"
                  disabled={!weeklyRhythm}
                  data-testid="button-continue-rhythm"
                >
                  Continue
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
                <div className="space-y-2 text-center">
                  <Target className="h-8 w-8 mx-auto text-primary" />
                  <h2 className="text-xl font-display font-semibold">
                    Where would you like to start?
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Pick one area to focus on first. You can explore others anytime.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-[320px] overflow-y-auto pr-1">
                  {LIFE_DIMENSIONS.map((dim) => {
                    const Icon = dim.icon;
                    return (
                      <button
                        key={dim.id}
                        onClick={() => setPrimaryFocus(dim.id)}
                        className={`p-3 rounded-xl text-left transition-all border flex items-center gap-2 ${
                          primaryFocus === dim.id
                            ? "border-primary bg-primary/5"
                            : "border-transparent bg-muted/50 hover-elevate"
                        }`}
                        data-testid={`dimension-${dim.id}`}
                      >
                        <Icon className="h-4 w-4 text-primary shrink-0" />
                        <span className="text-sm font-medium">{dim.label}</span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="ghost"
                    onClick={handleBack}
                    data-testid="button-back-dimension"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                  </Button>
                  <Button 
                    onClick={handleContinue}
                    className="flex-1"
                    disabled={!primaryFocus}
                    data-testid="button-continue-dimension"
                  >
                    Continue
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
                <div className="space-y-2 text-center">
                  <div className="h-16 w-16 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                    <Sparkles className="h-8 w-8 text-primary" />
                  </div>
                  <h2 className="text-xl font-display font-semibold">
                    Meet DW
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    Your Dimensional Wellness guide
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-muted/50 border dark:border-white/5">
                  <p className="text-sm leading-relaxed">
                    "Hey! I'm DW. I'm here to help you build a life that actually works for you—not someone else's idea of what that should look like.
                  </p>
                  {primaryFocus && (
                    <p className="text-sm leading-relaxed mt-3 text-muted-foreground">
                      {DW_GREETINGS[primaryFocus]}
                    </p>
                  )}
                  <p className="text-sm leading-relaxed mt-3">
                    I'll learn your patterns, remember what matters to you, and offer suggestions when they might help. No pressure, always optional."
                  </p>
                </div>

                <div className="space-y-2">
                  <Button 
                    onClick={handleStartChat}
                    className="w-full"
                    data-testid="button-chat-with-dw"
                  >
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Start chatting with DW
                  </Button>
                  <Button 
                    variant="ghost"
                    onClick={handleFinish}
                    className="w-full"
                    data-testid="button-explore-first"
                  >
                    I'll explore on my own first
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex justify-center gap-1.5 mt-6">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-1.5 rounded-full transition-all ${
                  s === step ? "w-6 bg-primary" : s < step ? "w-1.5 bg-primary/50" : "w-1.5 bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </motion.div>
      </div>
    </>
  );
}
