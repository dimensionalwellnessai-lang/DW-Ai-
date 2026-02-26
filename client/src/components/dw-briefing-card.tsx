import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TTSButton } from "@/components/tts-button";
import { Sparkles, ChevronRight } from "lucide-react";
import { ttsService } from "@/lib/tts-service";

interface DWBriefingCardProps {
  /** The "next step" text DW will speak and display */
  nextStep: string;
  /** Called when the user clicks "Start" / navigates to /talk */
  onStart?: () => void;
}

/**
 * DW Briefing Card
 *
 * Shown at the top of the home screen on app open. Summarizes the user's next
 * recommended focus and lets them trigger TTS with one tap before navigating
 * to the Talk It Out thread to begin the full loop:
 *
 *   Open app → DW briefing → user confirms plan → schedule shows it →
 *   DW speaks next step → user completes one block → DW celebrates + recap.
 */
export function DWBriefingCard({ nextStep, onStart }: DWBriefingCardProps) {
  const [, navigate] = useLocation();
  const ttsAvailable = ttsService.isAvailable();
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const handleStart = () => {
    if (onStart) onStart();
    navigate("/talk");
  };

  return (
    <Card
      className="border-primary/30 bg-gradient-to-br from-primary/5 to-primary/10"
      data-testid="dw-briefing-card"
    >
      <CardContent className="p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center gap-2">
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">
              DW Briefing
            </p>
            <p className="text-[10px] text-muted-foreground">Your next step, spoken aloud</p>
          </div>
        </div>

        {/* Next step text */}
        <p className="text-sm leading-relaxed text-foreground" data-testid="dw-briefing-next-step">
          {nextStep}
        </p>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {ttsAvailable && (
            <TTSButton
              text={nextStep}
              label="Hear it"
              variant="outline"
              size="sm"
            />
          )}
          <Button
            size="sm"
            onClick={handleStart}
            className="flex-1 min-w-0"
            data-testid="dw-briefing-start-button"
          >
            Start with DW
            <ChevronRight className="h-3.5 w-3.5 ml-1" />
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
            aria-label="Dismiss briefing"
            data-testid="dw-briefing-dismiss"
          >
            Dismiss
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
