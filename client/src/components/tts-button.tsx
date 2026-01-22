import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Volume2, VolumeX, Square } from "lucide-react";
import { ttsService } from "@/lib/tts-service";
import { cn } from "@/lib/utils";

interface TTSButtonProps {
  text: string;
  variant?: "default" | "ghost" | "outline";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  autoPlay?: boolean;
}

export function TTSButton({ 
  text, 
  variant = "ghost", 
  size = "sm", 
  className,
  autoPlay = false
}: TTSButtonProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isSupported] = useState(ttsService.isAvailable());

  useEffect(() => {
    const settings = ttsService.getSettings();
    if (autoPlay && settings.enabled && settings.autoSpeak && text) {
      handleSpeak();
    }
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

    const settings = ttsService.getSettings();
    if (!settings.enabled) return;

    setIsPlaying(true);
    try {
      await ttsService.speak(text);
      setIsPlaying(false);
    } catch (error) {
      console.error('TTS error:', error);
      setIsPlaying(false);
    }
  };

  if (!isSupported) return null;

  const settings = ttsService.getSettings();
  if (!settings.enabled) return null;

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleSpeak}
      className={cn("gap-1.5", className)}
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
          <span className="text-xs">Listen</span>
        </>
      )}
    </Button>
  );
}
