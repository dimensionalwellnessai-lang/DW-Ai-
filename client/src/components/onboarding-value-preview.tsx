/**
 * Onboarding Value Preview
 *
 * A short value proposition layer shown before the main onboarding begins.
 * Presents 3 capability cards that show what DW does — not what to do —
 * so users understand the system before committing to onboarding.
 *
 * Design principles:
 *  - Premium, calm, cosmos-aligned aesthetic
 *  - One idea per card: Read → Plan → Guide
 *  - DW Orb is center-stage — no mascots
 *  - Always skippable — consent-based from the start
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DWOrb } from "@/components/dw-orb";
import { ArrowRight, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Value Cards ───────────────────────────────────────────────────────────────

interface ValueCard {
  step: number;
  heading: string;
  body: string;
  /** Brief supporting detail — one real example */
  example: string;
}

const VALUE_CARDS: ValueCard[] = [
  {
    step: 1,
    heading: "DW reads your dimensions.",
    body: "Your life runs across key dimensions — Body, Mind, Time, Purpose, Relationships, and more. DW reads where each one stands right now.",
    example: "\"Your Mind dimension has been flickering for 3 days. Here's what that pattern means.\"",
  },
  {
    step: 2,
    heading: "DW builds your plan.",
    body: "Based on what it learns from you, DW converts your goals into structured weekly plans — not generic templates.",
    example: "\"Based on your energy and your goals, here's your optimal focus for this week.\"",
  },
  {
    step: 3,
    heading: "DW guides you forward.",
    body: "When life shifts, DW adjusts. It brings the right insight at the right moment — not every notification, just the ones that matter.",
    example: "\"You haven't checked your Purpose switch in 7 days. Want to revisit your direction?\"",
  },
];

// ── Progress Dots ─────────────────────────────────────────────────────────────

function ProgressDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="flex items-center gap-1.5" aria-label={`Step ${current + 1} of ${total}`}>
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "rounded-full transition-all duration-300",
            i === current
              ? "w-5 h-1.5 bg-primary"
              : "w-1.5 h-1.5 bg-muted-foreground/30",
          )}
        />
      ))}
    </div>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

interface OnboardingValuePreviewProps {
  /** Called when user taps "Begin" on the final card */
  onBegin: () => void;
  /** Called when user taps "Skip" at any point */
  onSkip: () => void;
}

export function OnboardingValuePreview({ onBegin, onSkip }: OnboardingValuePreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const isLast = currentIndex === VALUE_CARDS.length - 1;
  const card = VALUE_CARDS[currentIndex];

  const handleNext = () => {
    if (isLast) {
      onBegin();
    } else {
      setCurrentIndex((i) => i + 1);
    }
  };

  return (
    <div
      className="min-h-screen bg-background flex flex-col items-center justify-between px-6 py-8 relative"
      data-testid="onboarding-value-preview"
    >
      {/* Skip */}
      <div className="w-full flex justify-end">
        <Button
          variant="ghost"
          size="sm"
          onClick={onSkip}
          className="text-muted-foreground text-xs"
          data-testid="value-preview-skip"
        >
          Skip
        </Button>
      </div>

      {/* Centre: Orb + card content */}
      <div className="flex-1 flex flex-col items-center justify-center gap-8 w-full max-w-sm">
        {/* DW Orb */}
        <motion.div
          key={`orb-${currentIndex}`}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        >
          <DWOrb size={72} state="suggestion" />
        </motion.div>

        {/* Card content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="text-center space-y-4"
          >
            {/* Step indicator */}
            <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {`${card.step} of ${VALUE_CARDS.length}`}
            </span>

            {/* Heading */}
            <h2
              className="text-xl font-display font-semibold text-foreground leading-tight"
              data-testid="value-preview-heading"
            >
              {card.heading}
            </h2>

            {/* Body */}
            <p
              className="text-sm text-muted-foreground leading-relaxed"
              data-testid="value-preview-body"
            >
              {card.body}
            </p>

            {/* Example quote */}
            <div className="bg-card/60 border border-border/30 rounded-xl px-4 py-3 text-left">
              <p
                className="text-xs text-muted-foreground italic leading-relaxed"
                data-testid="value-preview-example"
              >
                {card.example}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Bottom: navigation */}
      <div className="w-full max-w-sm flex flex-col items-center gap-4">
        <ProgressDots total={VALUE_CARDS.length} current={currentIndex} />

        <Button
          size="lg"
          className="w-full"
          onClick={handleNext}
          data-testid="value-preview-next"
        >
          {isLast ? (
            <>
              Begin
              <ArrowRight className="w-4 h-4 ml-2" />
            </>
          ) : (
            <>
              Next
              <ChevronRight className="w-4 h-4 ml-2" />
            </>
          )}
        </Button>

        {/* Skip link for later cards */}
        {currentIndex > 0 && (
          <button
            type="button"
            onClick={onSkip}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
          >
            Skip to app
          </button>
        )}
      </div>
    </div>
  );
}
