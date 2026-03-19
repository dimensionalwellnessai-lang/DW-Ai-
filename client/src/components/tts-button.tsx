import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, Square } from "lucide-react";
import { ttsService } from "@/lib/tts-service";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface TTSButtonProps {
  text: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  autoPlay?: boolean;
  /** Text label shown on the button when not playing (defaults to "Listen") */
  label?: string;
  /**
   * When true the button is always visible regardless of the global TTS
   * enabled setting, allowing on-demand reading of individual messages.
   */
  alwaysShow?: boolean;
}

export function TTSButton({ 
  text, 
  variant = "ghost", 
  size = "sm", 
  className,
  autoPlay = false,
  label = "Listen",
  alwaysShow = false,
}: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported] = useState(ttsService.isAvailable());
  const { toast } = useToast();

  useEffect(() => {
    const settings = ttsService.getSettings();
    if (autoPlay && settings.enabled && settings.autoSpeak && text) {
      handleSpeak();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text, autoPlay]);

  useEffect(() => {
    // Cleanup on unmount - always stop to prevent orphaned audio
    return () => {
      ttsService.stop();
    };
  }, []);

  const handleSpeak = async () => {
    if (!isSupported) return;

    if (isPlaying) {
      ttsService.stop();
      setIsPlaying(false);
      return;
    }

    // When alwaysShow is set, bypass the global enabled check so the
    // on-demand button works even when TTS is otherwise disabled.
    const settings = ttsService.getSettings();
    if (!alwaysShow && !settings.enabled) return;

    setIsPlaying(true);
    try {
      await ttsService.speak(text);
      setIsPlaying(false);
    } catch (error) {
      setIsPlaying(false);
      const msg = error instanceof Error ? error.message : String(error);
      // "interrupted" and "canceled" fire when audio is stopped by the user — not real errors
      const isUserCancelled = msg.includes("interrupted") || msg.includes("canceled");
      if (!isUserCancelled) {
        console.error('TTS error:', error);
        toast({ description: "Audio playback failed. Please try again.", variant: "destructive" });
      }
    }
  };

  if (!isSupported) return null;

  const settings = ttsService.getSettings();
  if (!alwaysShow && !settings.enabled) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSpeak}
      className={cn("gap-1.5", className)}
      aria-label={isPlaying ? "Stop speaking" : label}
      data-testid="tts-button"
    >
      {isPlaying ? (
        <>
          <Square className="h-3.5 w-3.5" />
          <span className="text-xs">Stop</span>
        </>
      ) : (
        <>
          <Volume2 className="h-3.5 w-3.5" />
          <span className="text-xs">{label}</span>
        </>
      )}
    </Button>
  );
}
