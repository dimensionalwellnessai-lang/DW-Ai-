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
    id: "home",
    title: "Your Home Base",
    description:
      "This is your Life Command Center. See everything at a glance - water intake, calories, goals, habits, and all 8 wellness dimensions. Tap any card to dive deeper.",
    icon: TrendingUp,
    targetSelector: "[data-tour='home']",
    position: "bottom",
  },
  {
    id: "calendar",
    title: "Life Calendar",
    description:
      "Plan your days and weeks. Schedule events, import your work schedule, and see everything organized by wellness dimension. Tap the Calendar tab below to explore.",
    icon: Calendar,
    targetSelector: "[data-tour='calendar']",
    position: "top",
    action: "Tap Calendar in the bottom nav to explore",
  },
  {
    id: "chat",
    title: "Talk to DW",
    description:
      "Chat with your AI wellness companion anytime. Ask questions, get advice, create plans, or just talk through what's on your mind. DW adapts to your energy and communication style.",
    icon: MessageCircle,
    targetSelector: "[data-tour='chat']",
    position: "top",
    action: "Tap DW in the bottom nav to start a conversation",
  },
  {
    id: "browse",
    title: "Browse Features",
    description:
      "Explore all of DW's features: mood tracking, meal prep, workout planning, finances, astrology, and more. Use Browse to find and access any feature quickly.",
    icon: Star,
    targetSelector: "[data-tour='browse']",
    position: "top",
  },
  {
    id: "journal",
    title: "Your Journal",
    description:
      "Reflect on your journey with private journal entries. Track your thoughts, feelings, and progress over time. Writing helps process emotions and build self-awareness.",
    icon: Heart,
    targetSelector: "[data-tour='journal']",
    position: "top",
  },
  {
    id: "complete",
    title: "You're All Set!",
    description:
      "You can access this tour anytime from Settings. Explore at your own pace and remember: your wellness journey is uniquely yours. No pressure, just support.",
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

  // Calculate position for non-center cards
  const getCardStyle = (): React.CSSProperties | undefined => {
    if (isCenter || !targetElement) return undefined;

    const rect = targetElement.getBoundingClientRect();
    const windowHeight = window.innerHeight;
    const cardWidth = 450; // max-w-md = ~450px
    const cardMargin = 16; // mx-4 = 16px

    switch (step?.position) {
      case "top":
        return {
          left: "50%",
          transform: "translateX(-50%)",
          bottom: windowHeight - rect.top + 20,
        };
      case "bottom":
        return {
          left: "50%",
          transform: "translateX(-50%)",
          top: rect.bottom + 20,
        };
      case "left":
        return {
          right: window.innerWidth - rect.left + 20,
          top: rect.top,
        };
      case "right":
        return {
          left: rect.right + 20,
          top: rect.top,
        };
      default:
        return undefined;
    }
  };

  return (
    <>
      {/* Overlay - blocks all background interactions */}
      <div className="fixed inset-0 z-[10003]" style={{ pointerEvents: 'auto' }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        {/* Spotlight on target element */}
        {targetElement && !isCenter && (
          <div
            className="absolute border-4 border-primary rounded-lg pointer-events-none transition-all duration-300"
            style={{
              top: targetElement.getBoundingClientRect().top - 4,
              left: targetElement.getBoundingClientRect().left - 4,
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
            className={`absolute w-full max-w-md mx-4 glass-strong rounded-2xl p-6 shadow-2xl ${
              isCenter
                ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                : ""
            }`}
            style={isCenter ? undefined : getCardStyle()}
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
                  <p className="text-xs font-medium text-primary flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 shrink-0" />
                    {step.action}
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

// Hook to manage tour state
export function useInteractiveTour() {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    return localStorage.getItem("dw:tour_completed") === "true";
  });

  const startTour = () => {
    setIsOpen(true);
  };

  const completeTour = () => {
    setIsOpen(false);
    setHasCompletedTour(true);
    localStorage.setItem("dw:tour_completed", "true");
  };

  const skipTour = () => {
    setIsOpen(false);
  };

  const resetTour = () => {
    setHasCompletedTour(false);
    localStorage.removeItem("dw:tour_completed");
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
