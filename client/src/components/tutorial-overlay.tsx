import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { useTutorial } from "@/contexts/tutorial-context";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface ElementRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function TutorialOverlay() {
  const { state, currentStep, nextStep, prevStep, skipTutorial } = useTutorial();
  const [targetRect, setTargetRect] = useState<ElementRect | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 });
  const tooltipRef = useRef<HTMLDivElement>(null);

  const updateTargetPosition = useCallback(() => {
    if (!currentStep) {
      setTargetRect(null);
      return;
    }

    const element = document.querySelector(`[data-testid="${currentStep.targetTestId}"]`);
    if (!element) {
      setTargetRect(null);
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });

    setTimeout(() => {
      const rect = element.getBoundingClientRect();
      const padding = 8;
    
      setTargetRect({
        top: rect.top - padding,
        left: rect.left - padding,
        width: rect.width + padding * 2,
        height: rect.height + padding * 2
      });

      const tooltipWidth = 300;
      const tooltipHeight = 180;
      const spacing = 16;

      let tooltipTop = 0;
      let tooltipLeft = 0;

      const placement = currentStep.placement || "bottom";

      switch (placement) {
        case "top":
          tooltipTop = rect.top - tooltipHeight - spacing;
          tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "bottom":
          tooltipTop = rect.bottom + spacing;
          tooltipLeft = rect.left + rect.width / 2 - tooltipWidth / 2;
          break;
        case "left":
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          tooltipLeft = rect.left - tooltipWidth - spacing;
          break;
        case "right":
          tooltipTop = rect.top + rect.height / 2 - tooltipHeight / 2;
          tooltipLeft = rect.right + spacing;
          break;
      }

      tooltipLeft = Math.max(16, Math.min(tooltipLeft, window.innerWidth - tooltipWidth - 16));
      tooltipTop = Math.max(16, Math.min(tooltipTop, window.innerHeight - tooltipHeight - 16));

      setTooltipPosition({ top: tooltipTop, left: tooltipLeft });
      
      if (tooltipRef.current) {
        tooltipRef.current.focus();
      }
    }, 100);
  }, [currentStep]);

  useEffect(() => {
    if (!state.isActive) return;

    updateTargetPosition();

    const handleResize = () => updateTargetPosition();
    const handleScroll = () => updateTargetPosition();

    window.addEventListener("resize", handleResize);
    window.addEventListener("scroll", handleScroll, true);

    const resizeObserver = new ResizeObserver(updateTargetPosition);
    resizeObserver.observe(document.body);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("scroll", handleScroll, true);
      resizeObserver.disconnect();
    };
  }, [state.isActive, updateTargetPosition]);

  useEffect(() => {
    if (!state.isActive) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        skipTutorial();
      } else if (e.key === "ArrowRight" || e.key === "Enter") {
        nextStep();
      } else if (e.key === "ArrowLeft") {
        prevStep();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [state.isActive, nextStep, prevStep, skipTutorial]);

  if (!state.isActive || !state.tutorial || !currentStep) {
    return null;
  }

  const totalSteps = state.tutorial.steps.length;
  const currentStepNum = state.currentStepIndex + 1;
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === totalSteps - 1;

  const overlayContent = (
    <div 
      className="fixed inset-0 z-[9999]"
      data-testid="tutorial-overlay"
    >
      <svg
        className="absolute inset-0 w-full h-full"
        style={{ pointerEvents: "none" }}
      >
        <defs>
          <mask id="spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left}
                y={targetRect.top}
                width={targetRect.width}
                height={targetRect.height}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.75)"
          mask="url(#spotlight-mask)"
          style={{ pointerEvents: "auto" }}
          onClick={(e) => e.stopPropagation()}
        />
      </svg>

      {targetRect && (
        <div
          className="absolute rounded-lg ring-2 ring-primary ring-offset-2 ring-offset-transparent animate-pulse"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
            pointerEvents: "none"
          }}
        />
      )}

      <Card
        ref={tooltipRef}
        tabIndex={-1}
        className="fixed w-[300px] shadow-xl border-primary/20 outline-none"
        style={{
          top: tooltipPosition.top,
          left: tooltipPosition.left,
          zIndex: 10000
        }}
        data-testid="tutorial-tooltip"
        role="dialog"
        aria-modal="true"
        aria-label={`Tutorial step ${state.currentStepIndex + 1}: ${currentStep.title}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-2 mb-3">
            <h3 className="font-semibold text-base">{currentStep.title}</h3>
            <Button
              variant="ghost"
              size="icon"
              className="flex-shrink-0 -mt-1 -mr-2"
              onClick={skipTutorial}
              data-testid="button-skip-tutorial"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-4">
            {currentStep.description}
          </p>

          <div className="flex items-center justify-between gap-2">
            <span className="text-xs text-muted-foreground">
              {currentStepNum} of {totalSteps}
            </span>

            <div className="flex items-center gap-1">
              {!isFirstStep && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={prevStep}
                  data-testid="button-prev-step"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" />
                  Back
                </Button>
              )}
              <Button
                size="sm"
                onClick={nextStep}
                data-testid="button-next-step"
              >
                {isLastStep ? "Done" : "Next"}
                {!isLastStep && <ChevronRight className="w-4 h-4 ml-1" />}
              </Button>
            </div>
          </div>

          <div className="flex justify-center gap-1 mt-3">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-1.5 h-1.5 rounded-full transition-colors ${
                  i === state.currentStepIndex
                    ? "bg-primary"
                    : "bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return createPortal(overlayContent, document.body);
}
