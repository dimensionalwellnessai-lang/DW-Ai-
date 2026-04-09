import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, ArrowLeft, Check, Target } from "lucide-react";
import { saveProfileSetup } from "@/lib/guest-storage";
import { usePageMeta } from "@/hooks/use-page-meta";

type FirstIntent = "lifesystem" | "stress" | "plan" | "move" | "eat" | "talk";

const INTENT_OPTIONS: { id: FirstIntent; label: string; emoji: string }[] = [
  { id: "lifesystem", label: "Create my life system", emoji: "🗂️" },
  { id: "stress", label: "Work through stress", emoji: "😮‍💨" },
  { id: "plan", label: "Make a plan", emoji: "🗓️" },
  { id: "move", label: "Get moving", emoji: "💪" },
  { id: "eat", label: "Eat better", emoji: "🥗" },
  { id: "talk", label: "Just talk", emoji: "💬" },
];

export default function Welcome() {
  usePageMeta("Welcome", "Welcome to DW.ai – your wellness journey begins here.");
  const [, setLocation] = useLocation();
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [intent, setIntent] = useState<FirstIntent | null>(null);

  const handleSkipAll = () => {
    saveProfileSetup({ skipped: true });
    localStorage.setItem("dw_onboarding_completed", "1");
    localStorage.setItem("dw_voice_vibe", "direct");
    localStorage.setItem("dw:tour_pending_start", "true");
    setLocation("/command-center");
  };

  const INTENT_ROUTES: Record<FirstIntent, string> = {
    lifesystem: "/life-switchboard",
    stress: "/talk",
    plan: "/talk",
    move: "/talk",
    eat: "/talk",
    talk: "/talk",
  };

  const handleComplete = () => {
    if (!intent) return;
    saveProfileSetup({ completedAt: Date.now() });
    localStorage.setItem("dw_onboarding_completed", "1");
    if (name.trim()) localStorage.setItem("dw_user_name", name.trim());
    // Vibe is inferred from interaction — default to direct for now
    localStorage.setItem("dw_voice_vibe", "direct");
    localStorage.setItem("dw_first_intent", intent);
    localStorage.setItem("dw:tour_pending_start", "true");
    setLocation(INTENT_ROUTES[intent]);
  };

  // Steps: 1 = hero, 2 = name, 3 = personality card, 4 = first intent
  const canAdvance = step < 4 || (step === 4 && intent !== null);

  const handleNext = () => {
    if (step < 4) setStep(step + 1);
    else handleComplete();
  };

  const handleBack = () => {
    if (step > 1) setStep(step - 1);
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col"
      style={{ paddingTop: "max(env(safe-area-inset-top, 0px), 0px)" }}
    >
      {/* Step 1: full-screen hero */}
      {step === 1 ? (
        <AnimatePresence mode="wait">
          <motion.div
            key="hero"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex-1 flex flex-col items-center justify-center px-6 py-12 text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
              <Target className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl font-display font-bold mb-3">Meet DW</h1>
            <p className="text-muted-foreground text-base max-w-xs mb-10 leading-relaxed">
              Your focused operator companion — built to help you get things done, stay grounded, and move forward.
            </p>
            <div className="w-full max-w-xs space-y-3">
              <Button
                size="lg"
                className="w-full"
                onClick={() => setStep(2)}
                data-testid="button-start"
              >
                Start
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="w-full text-muted-foreground"
                onClick={handleSkipAll}
                data-testid="button-skip"
              >
                Skip setup
              </Button>
            </div>
          </motion.div>
        </AnimatePresence>
      ) : (
        <>
          {/* Header with back + skip */}
          <header className="p-4 flex justify-between items-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSkipAll}
              data-testid="button-skip"
            >
              Skip
            </Button>
          </header>

          {/* Progress dots: 3 dots representing steps 2–4 */}
          <div className="flex gap-1.5 justify-center mb-6">
            {[2, 3, 4].map((dotStep) => (
              <div
                key={dotStep}
                className={`h-1 w-8 rounded-full transition-colors ${
                  dotStep === step
                    ? "bg-primary"
                    : dotStep < step
                    ? "bg-primary/50"
                    : "bg-muted"
                }`}
                data-testid={`progress-step-${dotStep}`}
              />
            ))}
          </div>

          <main className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
            <div className="w-full max-w-md">
              <AnimatePresence mode="wait">
                {/* Step 2: Name */}
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
                        What should I call you?
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Totally optional — skip if you prefer.
                      </p>
                    </div>
                    <Input
                      placeholder="Your name or nickname"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="text-center text-lg h-12"
                      onKeyDown={(e) => e.key === "Enter" && handleNext()}
                      data-testid="input-name"
                    />
                  </motion.div>
                )}

                {/* Step 3: DW personality card */}
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
                        Here's what I'm about
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        So we start on the same page.
                      </p>
                    </div>
                    <div className="bg-muted/40 rounded-2xl p-5 space-y-4">
                      <div className="flex gap-3">
                        <Check className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium">Good at</p>
                          <p className="text-sm text-muted-foreground">
                            Cutting through noise, building real plans, and keeping you on track without the lecture.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-base shrink-0 mt-0.5">✕</span>
                        <div>
                          <p className="text-sm font-medium">Not</p>
                          <p className="text-sm text-muted-foreground">
                            A cheerleader, a diary, or a replacement for real human support when it matters most.
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-3">
                        <span className="text-base shrink-0 mt-0.5">→</span>
                        <div>
                          <p className="text-sm font-medium">Promise</p>
                          <p className="text-sm text-muted-foreground">
                            I'll be straight with you, adapt to your energy, and never waste your time.
                          </p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Step 4: First intent */}
                {step === 4 && (
                  <motion.div
                    key="step4"
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    className="space-y-6"
                  >
                    <div className="text-center space-y-2">
                      <h2 className="text-xl font-display font-semibold">
                        How should I help first?
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        Pick one — we can do the rest later.
                      </p>
                    </div>
                    <div className="space-y-2">
                      {INTENT_OPTIONS.map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setIntent(opt.id)}
                          className={`w-full p-3 rounded-xl border text-left flex items-center gap-3 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                            intent === opt.id
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted/40"
                          }`}
                          data-testid={`intent-${opt.id}`}
                          aria-pressed={intent === opt.id}
                        >
                          <span className="text-xl">{opt.emoji}</span>
                          <span className="font-medium text-sm">{opt.label}</span>
                          {intent === opt.id && (
                            <Check className="w-4 h-4 text-primary shrink-0 ml-auto" />
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="mt-8">
                <Button
                  size="lg"
                  onClick={handleNext}
                  disabled={!canAdvance}
                  className="w-full"
                  data-testid="button-continue"
                >
                  {step === 4 ? "Let's go" : "Continue"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>
            </div>
          </main>
        </>
      )}
    </div>
  );
}
