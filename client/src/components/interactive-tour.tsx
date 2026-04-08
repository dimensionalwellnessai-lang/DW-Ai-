import { useState, useEffect, useRef, useCallback } from "react";
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
  History,
  Zap,
  BookmarkPlus,
} from "lucide-react";

// ─── Re-export context, provider, and hook from the lightweight context module ─
// This preserves backward-compatibility for pages that import from this file,
// while allowing App.tsx to import only the lightweight module.
export {
  InteractiveTourContext,
  InteractiveTourProvider,
  useInteractiveTour,
  type InteractiveTourContextValue,
} from "@/components/interactive-tour-context";

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
    title: "Welcome to Dimensional Wellness AI",
    description:
      "DW is your personal AI life-system companion — not just a chatbot. It helps you build and manage your goals, habits, schedule, meals, workouts, and all eight dimensions of wellness in one place. Let's walk through the key features.",
    icon: Sparkles,
    position: "center",
  },
  {
    id: "chat",
    title: "Talk to DW",
    description:
      "Start any conversation here. DW greets you with context-aware suggestions, and after each response you'll see quick-reply chips so you can keep the flow going with one tap. You can also edit any message you've sent by hovering over it and tapping the pencil icon.",
    icon: MessageCircle,
    targetSelector: "[data-tour='chat']",
    position: "top",
    action: "Tap DW in the bottom nav to open the chat",
  },
  {
    id: "save-to-plan",
    title: "Save Anything to Your Plan",
    description:
      "After DW responds, tap the ··· menu on any message and choose \"Save to Life System.\" DW reads the message and automatically routes it to the right place — a calendar event, workout, meal, habit, goal, or routine — so nothing falls through the cracks.",
    icon: BookmarkPlus,
    position: "center",
  },
  {
    id: "history",
    title: "Your Conversation History",
    description:
      "Every conversation is saved to your account. Your five most recent chats appear right on the home screen for quick access. Tap the chat bubble icon in the top bar to open the full history panel with all your past conversations, organized by category.",
    icon: History,
    position: "center",
  },
  {
    id: "home",
    title: "Life Command Center",
    description:
      "Your dashboard tracks everything at a glance — goals, habits, mood, water, calories, and your eight wellness dimensions. Tap any card to go deeper into that area. The Command Center updates as DW learns more about your system.",
    icon: TrendingUp,
    targetSelector: "[data-tour='home']",
    position: "bottom",
  },
  {
    id: "calendar",
    title: "Calendar & Schedule",
    description:
      "Your calendar syncs everything DW creates — workouts, meals, routines, and events — all in one view. You can also connect it to Apple Calendar or Google Calendar via the iCal feed in Settings, so DW lives alongside your existing schedule.",
    icon: Calendar,
    targetSelector: "[data-tour='calendar']",
    position: "top",
    action: "Tap Calendar in the bottom nav to explore",
  },
  {
    id: "browse",
    title: "Explore All Features",
    description:
      "Browse gives you access to every DW feature: meal prep, workout planning, mood tracking, journal, finances, sleep, spiritual practices, and more. Everything you need to manage every dimension of your life is one tap away.",
    icon: Star,
    targetSelector: "[data-tour='browse']",
    position: "top",
  },
  {
    id: "complete",
    title: "You're Ready to Go",
    description:
      "This tour is available anytime from Settings → Tour. Start a conversation with DW to build your life system, or explore the Command Center to see where you stand. Your wellness journey is uniquely yours — DW is here to support it.",
    icon: Zap,
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
    if (el) {
      // Read the rect once and reuse it for both the visibility check and state update
      const rect = el.getBoundingClientRect();
      const vw = window.innerWidth || document.documentElement.clientWidth;
      const vh = window.innerHeight || document.documentElement.clientHeight;
      const visible =
        rect.width > 0 &&
        rect.height > 0 &&
        rect.bottom >= 0 &&
        rect.right >= 0 &&
        rect.top <= vh &&
        rect.left <= vw;
      setTargetRect(visible ? rect : null);
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
    // Clear stale rect immediately so the previous step's highlight isn't shown
    setTargetRect(null);
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

  // Recompute on resize, orientation change, and scroll
  useEffect(() => {
    if (!open) return;
    let rafId = 0; // initialize so cancelAnimationFrame is always called with a valid handle
    const handle = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(updateTargetRect);
    };
    window.addEventListener("resize", handle);
    window.addEventListener("orientationchange", handle);
    window.addEventListener("scroll", handle, { passive: true, capture: true });
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", handle);
      window.removeEventListener("orientationchange", handle);
      window.removeEventListener("scroll", handle, { capture: true });
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

    // Use the actual rendered width if available, otherwise derive from the viewport.
    // We set an explicit width in the style so `w-full`/`mx-4` don't add extra margin
    // that pushes the card outside the clamped bounds.
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

    return {
      position: "absolute",
      top: pos.top,
      left: pos.left,
      // Explicit width prevents `w-full` + `mx-4` from overflowing the clamped bounds
      width: cardWidth,
    };
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
      <div className="fixed inset-0 z-[10003]" style={{ pointerEvents: "none" }}>
        {/* Spotlight: 4-panel surround so the highlighted element is crisp and unblurred */}
        {isCenter || !targetRect ? (
          <div className="absolute inset-0 bg-black/80" style={{ pointerEvents: "auto" }} />
        ) : (
          <>
            {/* Top */}
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: Math.max(0, targetRect.top - 8), background: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
            {/* Bottom */}
            <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, top: targetRect.bottom + 8, background: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
            {/* Left */}
            <div style={{ position: "absolute", top: Math.max(0, targetRect.top - 8), left: 0, width: Math.max(0, targetRect.left - 8), height: targetRect.height + 16, background: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
            {/* Right */}
            <div style={{ position: "absolute", top: Math.max(0, targetRect.top - 8), left: targetRect.right + 8, right: 0, height: targetRect.height + 16, background: "rgba(0,0,0,0.72)", pointerEvents: "auto" }} />
            {/* Ring around the spotlight */}
            <div style={{ position: "absolute", top: targetRect.top - 8, left: targetRect.left - 8, width: targetRect.width + 16, height: targetRect.height + 16, border: "2px solid hsl(var(--primary))", borderRadius: "10px", pointerEvents: "none", boxShadow: "0 0 0 1px hsl(var(--primary)/0.3), inset 0 0 0 1px hsl(var(--primary)/0.2)" }} />
          </>
        )}

        {/* Tour Card */}
        <AnimatePresence mode="wait">
          <motion.div
            ref={cardRef}
            key={currentStep}
            initial={{ opacity: 0, scale: 0.95, x: isCenter ? "-50%" : 0, y: isCenter ? "-50%" : 0 }}
            animate={{ opacity: 1, scale: 1, x: isCenter ? "-50%" : 0, y: isCenter ? "-50%" : 0 }}
            exit={{ opacity: 0, scale: 0.95, x: isCenter ? "-50%" : 0, y: isCenter ? "-50%" : 0 }}
            transition={{ duration: 0.2 }}
            className={`absolute bg-background border border-border rounded-2xl p-6 shadow-2xl ${
              isCenter
                ? "top-1/2 left-1/2 w-[calc(100%-2rem)] max-w-md"
                : ""
            }`}
            style={isCenter ? { pointerEvents: "auto" } : { ...getCardStyle(), pointerEvents: "auto" }}
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


