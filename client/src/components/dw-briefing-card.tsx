import { useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, ChevronRight, Volume2, Square } from "lucide-react";
import { ttsService } from "@/lib/tts-service";

interface DWBriefingCardProps {
  /** The "next step" text DW will speak and display */
  nextStep: string;
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
 *
 * The "Hear it" button speaks the next step directly via SpeechSynthesis
 * without requiring TTS to be pre-enabled in Voice Settings, so users on a
 * fresh load can experience voice immediately.
 */
export function DWBriefingCard({ nextStep }: DWBriefingCardProps) {
  const [, navigate] = useLocation();
  const ttsAvailable = ttsService.isAvailable();
  const [dismissed, setDismissed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  if (dismissed) return null;

  const handleHearIt = async () => {
    if (isSpeaking) {
      ttsService.stop();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    try {
      // Speak directly, bypassing the "enabled" setting so fresh-load users
      // can hear the briefing without first opening Voice Settings.
      await ttsService.speak(nextStep);
    } catch {
      // Ignore speak errors (e.g. interrupted by navigation)
    } finally {
      setIsSpeaking(false);
    }
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
            <Button
              variant="outline"
              size="sm"
              onClick={handleHearIt}
              className="gap-1.5"
              aria-label={isSpeaking ? "Stop speaking" : "Hear next step aloud"}
              data-testid="dw-briefing-hear-button"
            >
              {isSpeaking ? (
                <>
                  <Square className="h-3.5 w-3.5" />
                  <span className="text-xs">Stop</span>
                </>
              ) : (
                <>
                  <Volume2 className="h-3.5 w-3.5" />
                  <span className="text-xs">Hear it</span>
                </>
              )}
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => navigate("/talk")}
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
