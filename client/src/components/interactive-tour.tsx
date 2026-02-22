import { useState, useEffect, useRef, useCallback, createContext, useContext } from "react";
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

// ─── Shared tour state via context ───────────────────────────────────────────

interface InteractiveTourContextValue {
  isOpen: boolean;
  hasCompletedTour: boolean;
  startTour: () => void;
  startTourIfPending: () => void;
  completeTour: () => void;
  skipTour: () => void;
  resetTour: () => void;
}

const InteractiveTourContext = createContext<InteractiveTourContextValue | null>(null);

export function InteractiveTourProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasCompletedTour, setHasCompletedTour] = useState(() => {
    try {
      return localStorage.getItem("dw:tour_completed") === "true";
    } catch {
      return false;
    }
  });

  const startTour = () => setIsOpen(true);

  // Start the tour if a pending start request was stored in localStorage.
  // Wrapped in try/catch because localStorage can throw (storage disabled/quota).
  const startTourIfPending = () => {
    try {
      if (localStorage.getItem("dw:tour_pending_start") === "true") {
        localStorage.removeItem("dw:tour_pending_start");
        startTour();
      }
    } catch {
      // Storage unavailable — nothing to do
    }
  };

  const completeTour = () => {
    setIsOpen(false);
    setHasCompletedTour(true);
    try {
      localStorage.setItem("dw:tour_completed", "true");
    } catch {
      // Storage unavailable — state is still updated in memory
    }
  };

  const skipTour = () => setIsOpen(false);

  const resetTour = () => {
    setHasCompletedTour(false);
    try {
      localStorage.removeItem("dw:tour_completed");
    } catch {
      // Storage unavailable
    }
  };

  return (
    <InteractiveTourContext.Provider
      value={{ isOpen, hasCompletedTour, startTour, startTourIfPending, completeTour, skipTour, resetTour }}
    >
      {children}
    </InteractiveTourContext.Provider>
  );
}

// Hook — must be used inside InteractiveTourProvider
export function useInteractiveTour(): InteractiveTourContextValue {
  const ctx = useContext(InteractiveTourContext);
  if (!ctx) {
    throw new Error("useInteractiveTour must be used inside InteractiveTourProvider");
  }
  return ctx;
}

// ─── Component ───────────────────────────────────────────────────────────────

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

// ─── Pure positioning utility (exported for unit testing) ────────────────────

export interface CardPositionInput {
  targetRect: { top: number; left: number; width: number; height: number; bottom: number; right: number };
  cardWidth: number;
  cardHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  preferredPosition: "top" | "bottom" | "left" | "right";
  /** Pixels reserved at the bottom (e.g. bottom nav height). Default 0. */
  bottomReserved?: number;
  /** Minimum distance from any viewport edge. Default 16. */
  padding?: number;
  /** Gap between the target element and the card. Default 12. */
  gap?: number;
}

export function computeCardPosition({
  targetRect,
  cardWidth,
  cardHeight,
  viewportWidth,
  viewportHeight,
  preferredPosition,
  bottomReserved = 0,
  padding = 16,
  gap = 12,
}: CardPositionInput): { top: number; left: number } {
  const usableHeight = viewportHeight - bottomReserved;

  // Center card horizontally over target, clamped to stay within viewport
  let left = targetRect.left + targetRect.width / 2 - cardWidth / 2;
  left = Math.max(padding, Math.min(left, viewportWidth - cardWidth - padding));

  const spaceAbove = targetRect.top - padding;
  const spaceBelow = usableHeight - targetRect.bottom - padding;
  const cardNeeds = cardHeight + gap;

  let top: number;

  if (preferredPosition === "top") {
    if (spaceAbove >= cardNeeds) {
      top = targetRect.top - cardHeight - gap;
    } else if (spaceBelow >= cardNeeds) {
      // flip: not enough space above, try below
      top = targetRect.bottom + gap;
    } else {
      // neither side fits – pick whichever has more room
      top =
        spaceAbove >= spaceBelow
          ? Math.max(padding, targetRect.top - cardHeight - gap)
          : Math.min(usableHeight - cardHeight - padding, targetRect.bottom + gap);
    }
  } else if (preferredPosition === "bottom") {
    if (spaceBelow >= cardNeeds) {
      top = targetRect.bottom + gap;
    } else if (spaceAbove >= cardNeeds) {
      // flip: not enough space below, try above
      top = targetRect.top - cardHeight - gap;
    } else {
      top =
        spaceAbove >= spaceBelow
          ? Math.max(padding, targetRect.top - cardHeight - gap)
          : Math.min(usableHeight - cardHeight - padding, targetRect.bottom + gap);
    }
  } else {
    // left/right or unknown – default to centering vertically in usable area
    top = Math.max(padding, (usableHeight - cardHeight) / 2);
  }

  // Final clamp: keep card fully within [padding, usableHeight - cardHeight - padding]
  top = Math.max(padding, Math.min(top, usableHeight - cardHeight - padding));

  return { top: Math.round(top), left: Math.round(left) };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Returns the height of the fixed bottom navigation bar, if present. */
function getBottomNavHeight(): number {
  try {
    // Look for a fixed nav element pinned to the bottom of the screen
    const nav = document.querySelector("nav") as HTMLElement | null;
    if (nav) {
      const rect = nav.getBoundingClientRect();
      if (rect.height > 0 && rect.bottom >= window.innerHeight - 4) {
        return Math.round(rect.height);
      }
    }
  } catch {
    // DOM not available (SSR / test env)
  }
  return 88; // fallback matches --bottom-nav-total-height default (defined in client/src/index.css)
}

/** Returns true when an element is in the DOM and has non-zero dimensions. */
function isElementVisible(el: HTMLElement): boolean {
  const rect = el.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

// ─── Component ───────────────────────────────────────────────────────────────

interface InteractiveTourProps {
  open: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

export function InteractiveTour({ open, onComplete, onSkip }: InteractiveTourProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  const step = TOUR_STEPS[currentStep];
  const Icon = step?.icon;

  // Determine if this step should be centered (no target, or target not visible)
  const isCenter = step?.position === "center" || !step?.targetSelector || !targetRect;
  const isFinal = currentStep === TOUR_STEPS.length - 1;

  /** Re-measure the target element and store its DOMRect in state. */
  const updateTargetRect = useCallback(() => {
    if (!open || !step?.targetSelector) {
      setTargetRect(null);
      return;
    }
    const el = document.querySelector(step.targetSelector) as HTMLElement | null;
    if (el && isElementVisible(el)) {
      setTargetRect(el.getBoundingClientRect());
    } else {
      setTargetRect(null);
    }
  }, [open, step?.targetSelector]);

  // Reset to first step whenever the tour is opened
  useEffect(() => {
    if (open) {
      setCurrentStep(0);
    }
  }, [open]);

  // Update target rect when the step changes, and scroll into view
  useEffect(() => {
    if (!open) return;
    if (step?.targetSelector) {
      const el = document.querySelector(step.targetSelector) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        // Allow scroll to settle before measuring
        const timer = setTimeout(updateTargetRect, 300);
        return () => clearTimeout(timer);
      }
    }
    updateTargetRect();
  }, [open, currentStep, step?.targetSelector, updateTargetRect]);

  // Recompute on resize / orientation change
  useEffect(() => {
    if (!open) return;
    let rafId: number;
    const handle = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateTargetRect);
    };
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
    };
  }, [open, updateTargetRect]);

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

  /** Build `style` for the positioned (non-center) tour card. */
  const getCardStyle = (): React.CSSProperties | undefined => {
    if (isCenter || !targetRect) return undefined;

    const card = cardRef.current;
    const cardWidth = card ? card.offsetWidth : Math.min(448, window.innerWidth - 32); // 448 = Tailwind max-w-md (~28rem)
    const cardHeight = card ? card.offsetHeight : 300; // 300px: conservative estimate for card content (title + description + nav)

    const pos = computeCardPosition({
      targetRect,
      cardWidth,
      cardHeight,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
      preferredPosition: (step?.position as "top" | "bottom" | "left" | "right") ?? "top",
      bottomReserved: getBottomNavHeight(),
    });

    return { position: "absolute", top: pos.top, left: pos.left };
  };

  /** Crisp spotlight style – all values rounded to whole pixels. */
  const getSpotlightStyle = (): React.CSSProperties | undefined => {
    if (isCenter || !targetRect) return undefined;
    const border = 4;
    return {
      top: Math.round(targetRect.top) - border,
      left: Math.round(targetRect.left) - border,
      width: Math.round(targetRect.width) + border * 2,
      height: Math.round(targetRect.height) + border * 2,
      boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.6)",
    };
  };

  return (
    <>
      {/* Overlay - blocks all background interactions */}
      <div className="fixed inset-0 z-[10003]" style={{ pointerEvents: "auto" }}>
        {/* Backdrop */}
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />

        {/* Spotlight on target element */}
        {!isCenter && targetRect && (
          <div
            className="absolute border-4 border-primary rounded-lg pointer-events-none transition-all duration-300"
            style={getSpotlightStyle()}
          />
        )}

        {/* Tour Card */}
        <AnimatePresence mode="wait">
          <motion.div
            ref={cardRef}
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={`absolute w-full max-w-md mx-4 glass-strong rounded-2xl p-6 shadow-2xl ${
              isCenter ? "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" : ""
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


