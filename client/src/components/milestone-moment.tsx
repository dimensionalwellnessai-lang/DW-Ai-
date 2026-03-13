/**
 * Milestone Moment
 *
 * A lightweight, non-intrusive celebration component for when users hit key
 * milestones in their switch training or habit streaks. Displays as a banner
 * card that can be dismissed.
 *
 * Design principles:
 *  - Calm celebration — no confetti blasts, no loud colours
 *  - One focused message per milestone
 *  - DW Orb entry to deepen the moment with reflection
 *  - Automatically dismissible; doesn't block the UI
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DWOrb } from "@/components/dw-orb";
import { X, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { COPY } from "@/copy/en";

// ── Types ─────────────────────────────────────────────────────────────────────

export type MilestoneType =
  | "switch-flickering"   // Switch first turned on
  | "switch-stable"       // Switch reached stable status
  | "switch-powered"      // Switch fully powered
  | "habit-streak-7"      // 7-day habit streak
  | "habit-streak-30"     // 30-day habit streak
  | "goal-progress-50"    // Goal reached 50%
  | "goal-completed"      // Goal marked complete
  | "first-plan"          // First elevation plan created
  | "first-journal"       // First journal entry
  | "check-in-streak-3";  // 3-day mood/energy check-in streak

export interface MilestoneMomentProps {
  type: MilestoneType;
  /** Subject name (e.g. switch label, goal title, habit name) */
  subject?: string;
  /** Called when the user dismisses the milestone card */
  onDismiss?: () => void;
  /** Custom reflection prompt to pre-seed in DW chat */
  dwPrompt?: string;
  className?: string;
}

// ── Milestone content config ──────────────────────────────────────────────────

interface MilestoneConfig {
  headline: string;
  message: (subject?: string) => string;
  dwPrompt: (subject?: string) => string;
  accentClass: string;
}

const MILESTONE_CONFIG: Record<MilestoneType, MilestoneConfig> = {
  "switch-flickering": {
    headline: "First steps.",
    message: (subject) =>
      subject
        ? `You've started working on ${subject}. That's the hardest part.`
        : "You've activated a new dimension. That's the hardest part.",
    dwPrompt: (subject) =>
      subject
        ? `I just started working on my ${subject} switch. What's a good first move?`
        : "I just turned on a new switch. What's a good first move?",
    accentClass: "border-blue-500/30 bg-blue-500/5",
  },
  "switch-stable": {
    headline: "Holding steady.",
    message: (subject) =>
      subject
        ? `${subject} is holding. You've built something real here.`
        : "This switch is holding. You've built something real.",
    dwPrompt: (subject) =>
      subject
        ? `My ${subject} switch just reached stable. What should I focus on to keep it there?`
        : "One of my switches just reached stable. How do I keep momentum?",
    accentClass: "border-emerald-500/30 bg-emerald-500/5",
  },
  "switch-powered": {
    headline: "Fully powered.",
    message: (subject) =>
      subject
        ? `${subject} is powered. What does this unlock for you?`
        : "A dimension is fully powered. What does this open up?",
    dwPrompt: (subject) =>
      subject
        ? `My ${subject} switch is fully powered. What becomes possible now?`
        : "A switch just reached powered status. What should I do with this momentum?",
    accentClass: "border-violet-500/30 bg-violet-500/5",
  },
  "habit-streak-7": {
    headline: "7 days.",
    message: (subject) =>
      subject
        ? `${subject} — 7 days straight. That's discipline becoming identity.`
        : "Seven days straight. Discipline is becoming identity.",
    dwPrompt: (subject) =>
      subject
        ? `I've done ${subject} 7 days in a row. How do I keep this going?`
        : "I've hit a 7-day habit streak. How do I protect this?",
    accentClass: "border-amber-500/30 bg-amber-500/5",
  },
  "habit-streak-30": {
    headline: "30 days in.",
    message: (subject) =>
      subject
        ? `${subject} for 30 days. This isn't a streak anymore — it's who you are.`
        : "30 days. This isn't a streak anymore. It's who you are.",
    dwPrompt: (subject) =>
      subject
        ? `I've maintained ${subject} for 30 days. What's the next level of this?`
        : "I hit a 30-day habit streak. What's next?",
    accentClass: "border-rose-500/30 bg-rose-500/5",
  },
  "goal-progress-50": {
    headline: "Halfway there.",
    message: (subject) =>
      subject
        ? `${subject} is 50% done. The second half is where most people stop.`
        : "Halfway done. The second half is where most people stop — not you.",
    dwPrompt: (subject) =>
      subject
        ? `I'm halfway through my goal: ${subject}. How do I finish strong?`
        : "I'm halfway through a major goal. How do I finish strong?",
    accentClass: "border-indigo-500/30 bg-indigo-500/5",
  },
  "goal-completed": {
    headline: "Goal complete.",
    message: (subject) =>
      subject
        ? `${subject} — done. Take a moment. This matters.`
        : "You completed a goal. Take a moment. This matters.",
    dwPrompt: (subject) =>
      subject
        ? `I just completed my goal: ${subject}. Help me reflect on what this means.`
        : "I just completed a goal. Help me reflect on what this means.",
    accentClass: "border-teal-500/30 bg-teal-500/5",
  },
  "first-plan": {
    headline: "Plan activated.",
    message: () =>
      "Your first elevation plan is live. DW will keep this visible and actionable.",
    dwPrompt: () =>
      "I just created my first elevation plan. Walk me through how to use it.",
    accentClass: "border-primary/30 bg-primary/5",
  },
  "first-journal": {
    headline: "First entry.",
    message: () =>
      "You wrote your first journal entry. The act of naming things gives them less power.",
    dwPrompt: () =>
      "I just wrote my first journal entry. What can I do with this kind of reflection?",
    accentClass: "border-pink-500/30 bg-pink-500/5",
  },
  "check-in-streak-3": {
    headline: "3-day check-in.",
    message: () =>
      "Three days of checking in. Awareness is the first step toward change.",
    dwPrompt: () =>
      "I've checked in for 3 days in a row. What patterns do you see?",
    accentClass: "border-cyan-500/30 bg-cyan-500/5",
  },
};

// ── Component ─────────────────────────────────────────────────────────────────

export function MilestoneMoment({
  type,
  subject,
  onDismiss,
  dwPrompt: customDwPrompt,
  className,
}: MilestoneMomentProps) {
  const [, navigate] = useLocation();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const config = MILESTONE_CONFIG[type];
  const headline = config.headline;
  const message = config.message(subject);
  const prompt = customDwPrompt ?? config.dwPrompt(subject);

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const handleDWTap = () => {
    navigate(`/talk?topic=${encodeURIComponent(prompt)}`);
  };

  return (
    <Card
      className={cn(
        "border overflow-hidden animate-fade-in-up",
        config.accentClass,
        className,
      )}
      data-testid={`milestone-moment-${type}`}
    >
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-background/50 flex items-center justify-center mt-0.5">
            <Sparkles className="h-4 w-4 text-foreground/60" />
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <p
              className="text-sm font-semibold text-foreground leading-tight"
              data-testid="milestone-headline"
            >
              {headline}
            </p>
            <p
              className="text-xs text-muted-foreground mt-1 leading-relaxed"
              data-testid="milestone-message"
            >
              {message}
            </p>

            {/* DW Orb CTA */}
            <button
              type="button"
              onClick={handleDWTap}
              className="flex items-center gap-1.5 mt-2.5 text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
              data-testid="milestone-dw-cta"
            >
              <DWOrb size={16} state="idle" />
              <span>{COPY.milestoneMoment.reflectCTA}</span>
            </button>
          </div>

          {/* Dismiss */}
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 flex-shrink-0 text-muted-foreground hover:text-foreground -mt-0.5 -mr-1"
            onClick={handleDismiss}
            aria-label={COPY.milestoneMoment.dismissLabel}
            data-testid="milestone-dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
