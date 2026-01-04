import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICE_SCRIPTS } from "@/config/voiceScripts";

type VoiceState = "idle" | "listening" | "processing" | "error";

interface VoiceModeButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
}

interface SpeechRecognitionEvent {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent {
  error: string;
}

interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onstart: (() => void) | null;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
  abort: () => void;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

export function VoiceModeButton({
  onTranscript,
  onError,
  disabled = false,
  className,
  size = "icon",
  variant = "ghost",
}: VoiceModeButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
    }
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const startListening = useCallback(() => {
    if (!isSupported) {
      onError?.(VOICE_SCRIPTS.voiceNotSupported);
      return;
    }

    const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) {
      setIsSupported(false);
      onError?.(VOICE_SCRIPTS.voiceNotSupported);
      return;
    }

    try {
      const recognition = new SpeechRecognitionAPI();
      recognitionRef.current = recognition;

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState("listening");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        setVoiceState("processing");
        const transcript = event.results[0][0].transcript;
        
        timeoutRef.current = setTimeout(() => {
          onTranscript(transcript);
          setVoiceState("idle");
        }, 300);
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setVoiceState("error");
        let errorMessage = VOICE_SCRIPTS.errorFallback;
        
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          errorMessage = VOICE_SCRIPTS.microphoneError;
        }
        
        onError?.(errorMessage);
        
        timeoutRef.current = setTimeout(() => {
          setVoiceState("idle");
        }, 2000);
      };

      recognition.onend = () => {
        if (voiceState === "listening") {
          setVoiceState("idle");
        }
      };

      recognition.start();
    } catch {
      setVoiceState("error");
      onError?.(VOICE_SCRIPTS.microphoneError);
      
      timeoutRef.current = setTimeout(() => {
        setVoiceState("idle");
      }, 2000);
    }
  }, [isSupported, onTranscript, onError, voiceState]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setVoiceState("idle");
  }, []);

  const handleClick = useCallback(() => {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  if (!isSupported) {
    return null;
  }

  if (voiceState === "error") {
    return (
      <Button
        size="sm"
        variant="ghost"
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "text-destructive gap-1.5 transition-all duration-200",
          className
        )}
        data-testid="button-voice-mode"
        aria-label="Try again"
      >
        <MicOff className="w-4 h-4" />
        <span className="text-xs">Try again</span>
      </Button>
    );
  }

  return (
    <Button
      size={size}
      variant={variant}
      onClick={handleClick}
      disabled={disabled || voiceState === "processing"}
      className={cn(
        "relative transition-all duration-200",
        voiceState === "listening" && "text-primary",
        className
      )}
      data-testid="button-voice-mode"
      aria-label={
        voiceState === "listening" 
          ? "Stop listening" 
          : voiceState === "processing"
          ? "Processing..."
          : "Start voice input"
      }
    >
      {voiceState === "listening" && (
        <span className="absolute inset-0 rounded-full animate-pulse bg-primary/20" />
      )}
      
      {voiceState === "processing" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <Mic className={cn(
          "w-4 h-4",
          voiceState === "listening" && "text-primary"
        )} />
      )}
    </Button>
  );
}
