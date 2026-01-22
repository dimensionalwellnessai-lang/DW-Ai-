import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  ArrowRight,
  ArrowLeft,
  MessageCircle,
  Calendar,
  Star,
  TrendingUp,
  Settings,
  ListTodo,
  Heart,
  Sparkles,
} from "lucide-react";

interface TourStep {
  id: string;
  title: string;
  description: string;
  icon: typeof MessageCircle;
  targetSelector?: string;
  position?: "top" | "bottom" | "left" | "right" | "center";
  action?: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    id: "welcome",
    title: "Welcome to Your Wellness Journey",
    description:
      "Let's take a quick tour of the key features that will help you track, understand, and improve your wellness across all dimensions of life.",
    icon: Sparkles,
    position: "center",
  },
  {
    id: "mood-tracking",
    title: "Mood Tracking & Analytics",
    description:
      "Track your daily moods and energy levels. We'll show you patterns over time and provide insights to help you understand what influences your wellness.",
    icon: Heart,
    targetSelector: "[data-tour='mood-tracker']",
    position: "bottom",
    action: "Try logging your first mood entry",
  },
  {
    id: "dashboard",
    title: "Wellness Dashboard",
    description:
      "Your central hub for all wellness dimensions: Calendar, Tasks, Astrology, Routines, and more. Everything you need in one place.",
    icon: TrendingUp,
    targetSelector: "[data-tour='dashboard']",
    position: "bottom",
  },
  {
    id: "calendar",
    title: "Astrology Calendar",
    description:
      "View your personalized astrology calendar. Click on any day to get insights, recommendations, and understand how cosmic energies affect you.",
    icon: Calendar,
    targetSelector: "[data-tour='calendar']",
    position: "bottom",
    action: "Click on a day to see your daily insights",
  },
  {
    id: "tasks",
    title: "Tasks & Routines",
    description:
      "Create and manage daily tasks and wellness routines. Build habits that stick and track your progress over time.",
    icon: ListTodo,
    targetSelector: "[data-tour='tasks']",
    position: "bottom",
    action: "Try creating your first routine",
  },
  {
    id: "astrology",
    title: "Astrology Insights",
    description:
      "Get personalized astrological readings based on your birth chart. Understand planetary influences and how they affect different areas of your life.",
    icon: Star,
    targetSelector: "[data-tour='astrology']",
    position: "bottom",
  },
  {
    id: "chat",
    title: "AI Wellness Assistant",
    description:
      "Chat with your AI wellness companion anytime. Ask questions, get advice, or just talk through what's on your mind.",
    icon: MessageCircle,
    targetSelector: "[data-tour='chat']",
    position: "top",
    action: "Say hello to your wellness assistant",
  },
  {
    id: "personalization",
    title: "Personalization Settings",
    description:
      "Refine your preferences anytime. Update your goals, dietary preferences, fitness targets, and more to keep your experience perfectly tailored.",
    icon: Settings,
    targetSelector: "[data-tour='settings']",
    position: "top",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description:
      "You can access this tour anytime from the Help menu in Settings. Explore at your own pace and remember: your wellness journey is uniquely yours.",
    icon: Sparkles,
    position: "center",
  },
];

interface InteractiveTourProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTour({ open, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetElement, setTargetElement] = useState<HTMLElement | null>(null);

  const step = TOUR_STEPS[currentStep];
  const Icon = step?.icon;

  useEffect(() => {
    if (open && step?.targetSelector) {
      const element = document.querySelector(step.targetSelector) as HTMLElement;
      setTargetElement(element);
      
      // Scroll element into view
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    } else {
      setTargetElement(null);
    }
  }, [open, currentStep, step?.targetSelector]);

  if (!open) return null;

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    setCurrentStep(0);
    onSkip();
  };

  const isCenter = step?.position === "center" || !step?.targetSelector;
  const isFinal = currentStep === TOUR_STEPS.length - 1;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 z-[100]">
        {/* Backdrop */}
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

        {/* Spotlight on target element */}
        {targetElement && !isCenter && (
          <div
            className="absolute border-4 border-primary rounded-lg pointer-events-none transition-all duration-300"
            style={{
              top: targetElement.offsetTop - 4,
              left: targetElement.offsetLeft - 4,
              width: targetElement.offsetWidth + 8,
              height: targetElement.offsetHeight + 8,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
            }}
          />
        )}

        {/* Tour Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute ${
              isCenter
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : getPositionClasses(targetElement, step?.position)
            } w-full max-w-md mx-4 glass-strong rounded-2xl p-6 shadow-2xl`}
          >
            {/* Close button */}
            <button
              onClick={handleSkip}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Content */}
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {Icon && (
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-lg font-display font-semibold mb-2">
                    {step?.title}
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {step?.description}
                  </p>
                </div>
              </div>

              {step?.action && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3">
                  <p className="text-xs font-medium text-primary">
                    💡 {step.action}
                  </p>
                </div>
              )}

              {/* Progress dots */}
              <div className="flex justify-center gap-1.5 pt-2">
                {TOUR_STEPS.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentStep(index)}
                    className={`h-1.5 rounded-full transition-all ${
                      index === currentStep
                        ? "w-6 bg-primary"
                        : index < currentStep
                        ? "w-1.5 bg-primary/50 cursor-pointer"
                        : "w-1.5 bg-muted-foreground/30"
                    }`}
                  />
                ))}
              </div>

              {/* Navigation */}
              <div className="flex gap-2 pt-2">
                {currentStep > 0 && (
                  <Button variant="ghost" onClick={handleBack}>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back
                  </Button>
                )}
                <Button onClick={handleNext} className="flex-1">
                  {isFinal ? "Finish Tour" : "Next"}
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </div>

              <div className="text-center">
                <button
                  onClick={handleSkip}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  Skip tour
                </button>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </>
  );
}

function getPositionClasses(
  element: HTMLElement | null,
  position?: string
): string {
  if (!element) return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";

  const rect = element.getBoundingClientRect();
  const windowHeight = window.innerHeight;
  const windowWidth = window.innerWidth;

  switch (position) {
    case "top":
      return `left-1/2 -translate-x-1/2 bottom-[${windowHeight - rect.top + 20}px]`;
    case "bottom":
      return `left-1/2 -translate-x-1/2 top-[${rect.bottom + 20}px]`;
    case "left":
      return `right-[${windowWidth - rect.left + 20}px] top-[${rect.top}px]`;
    case "right":
      return `left-[${rect.right + 20}px] top-[${rect.top}px]`;
    default:
      return "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
  }
}

// Hook to manage tour state
export function useInteractiveTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    return localStorage.getItem("fts:tour_completed") === "true";
  });

  const startTour = () => {
    setIsOpen(true);
  };

  const completeTour = () => {
    setIsOpen(false);
    setHasCompletedTour(true);
    localStorage.setItem("fts:tour_completed", "true");
  };

  const skipTour = () => {
    setIsOpen(false);
  };

  const resetTour = () => {
    setHasCompletedTour(false);
    localStorage.removeItem("fts:tour_completed");
  };

  return {
    isOpen,
    hasCompletedTour,
    startTour,
    completeTour,
    skipTour,
    resetTour,
  };
}
