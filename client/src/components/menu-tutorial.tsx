import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const MENU_TUTORIAL_KEY = "fts:menuTutorialDone";
const MENU_TUTORIAL_STEP_KEY = "fts:menuTutorialStep";

interface MenuTutorialStep {
  id: string;
  title: string;
  description: string;
  requiresMore?: boolean;
}

const TUTORIAL_STEPS: MenuTutorialStep[] = [
  {
    id: "today",
    title: "Today",
    description: "Your dashboard. Quick check-in + what matters now.",
  },
  {
    id: "dw-chat",
    title: "DW Chat",
    description: "Talk to DW for clarity, comfort, or a plan.",
  },
  {
    id: "plans",
    title: "Plans",
    description: "Turn chaos into blocks. Build your week.",
  },
  {
    id: "journal",
    title: "Journal",
    description: "Track resets + reflections.",
  },
  {
    id: "browse",
    title: "Browse",
    description: "Tools, learning, community.",
  },
  {
    id: "more",
    title: "More",
    description: "Tap More to unlock everything.",
    requiresMore: true,
  },
  {
    id: "settings",
    title: "Settings",
    description: "Your rules, your profile, your reset button.",
  },
];

interface MenuTutorialProps {
  isMenuOpen: boolean;
  moreExpanded: boolean;
  onComplete: () => void;
}

export function useMenuTutorial() {
  const [showTutorial, setShowTutorial] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  
  const isDone = () => localStorage.getItem(MENU_TUTORIAL_KEY) === "1";
  
  const startTutorial = () => {
    if (isDone()) return;
    const savedStep = localStorage.getItem(MENU_TUTORIAL_STEP_KEY);
    setCurrentStep(savedStep ? parseInt(savedStep, 10) : 0);
    setShowTutorial(true);
  };
  
  const completeTutorial = () => {
    localStorage.setItem(MENU_TUTORIAL_KEY, "1");
    localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
    setShowTutorial(false);
  };
  
  const resetTutorial = () => {
    localStorage.removeItem(MENU_TUTORIAL_KEY);
    localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
    setCurrentStep(0);
  };
  
  return {
    showTutorial,
    currentStep,
    setCurrentStep,
    startTutorial,
    completeTutorial,
    resetTutorial,
    isDone,
  };
}

export function MenuTutorial({ 
  isMenuOpen, 
  moreExpanded, 
  onComplete 
}: MenuTutorialProps) {
  const [currentStep, setCurrentStep] = useState(() => {
    const saved = localStorage.getItem(MENU_TUTORIAL_STEP_KEY);
    return saved ? parseInt(saved, 10) : 0;
  });
  const [visible, setVisible] = useState(true);
  
  const step = TUTORIAL_STEPS[currentStep];
  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const isMoreStep = step?.requiresMore;
  
  useEffect(() => {
    localStorage.setItem(MENU_TUTORIAL_STEP_KEY, String(currentStep));
  }, [currentStep]);
  
  useEffect(() => {
    if (!isMenuOpen) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [isMenuOpen]);
  
  const handleNext = () => {
    if (isMoreStep && !moreExpanded) {
      return;
    }
    
    if (isLastStep) {
      localStorage.setItem(MENU_TUTORIAL_KEY, "1");
      localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
      onComplete();
      return;
    }
    
    setCurrentStep(prev => prev + 1);
  };
  
  const handleSkip = () => {
    localStorage.setItem(MENU_TUTORIAL_KEY, "1");
    localStorage.removeItem(MENU_TUTORIAL_STEP_KEY);
    onComplete();
  };
  
  if (!visible || !step) return null;
  
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="fixed bottom-24 left-4 right-4 z-[10002] max-w-sm"
        data-testid="menu-tutorial"
      >
        <Card className="p-4 shadow-lg border-primary/20 bg-background/95 backdrop-blur-sm">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm" data-testid="tutorial-step-title">
                {step.title}
              </h3>
              <p className="text-sm text-muted-foreground mt-1" data-testid="tutorial-step-description">
                {step.description}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 shrink-0"
              onClick={handleSkip}
              data-testid="button-skip-tutorial"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between mt-3">
            <div className="flex gap-1">
              {TUTORIAL_STEPS.map((_, idx) => (
                <div
                  key={idx}
                  className={`w-2 h-2 rounded-full transition-colors ${
                    idx === currentStep
                      ? "bg-primary"
                      : idx < currentStep
                      ? "bg-primary/40"
                      : "bg-muted"
                  }`}
                />
              ))}
            </div>
            
            <Button
              size="sm"
              onClick={handleNext}
              disabled={isMoreStep && !moreExpanded}
              data-testid="button-tutorial-next"
            >
              {isLastStep ? "Done" : "Next"}
              {!isLastStep && <ChevronRight className="h-4 w-4 ml-1" />}
            </Button>
          </div>
          
          {isMoreStep && !moreExpanded && (
            <p className="text-xs text-amber-600 dark:text-amber-400 mt-2" data-testid="tutorial-more-hint">
              Tap "More" in the menu above to continue
            </p>
          )}
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}

export function shouldShowMenuTutorial(): boolean {
  return localStorage.getItem(MENU_TUTORIAL_KEY) !== "1";
}
