import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { VOICE_SCRIPTS } from "@/config/voiceScripts";

type VoiceState = "idle" | "listening" | "processing" | "error" | "continuous";

interface EnhancedVoiceModeButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  continuousMode?: boolean; // Enable continuous listening
  onContinuousModeChange?: (enabled: boolean) => void;
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

export function EnhancedVoiceModeButton({
  onTranscript,
  onError,
  disabled = false,
  className,
  size = "icon",
  variant = "ghost",
  continuousMode = false,
  onContinuousModeChange,
}: EnhancedVoiceModeButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [isSupported, setIsSupported] = useState(true);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resultIndexRef = useRef(0);
  const isContinuousRef = useRef(false); // Track continuous mode state

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

  const startListening = useCallback((isContinuous = false) => {
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
      resultIndexRef.current = 0;
      isContinuousRef.current = isContinuous; // Store in ref

      recognition.continuous = isContinuous;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setVoiceState(isContinuous ? "continuous" : "listening");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interimTranscript = '';
        let finalTranscript = '';

        for (let i = resultIndexRef.current; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript + ' ';
            resultIndexRef.current = i + 1;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          setVoiceState("processing");
          timeoutRef.current = setTimeout(() => {
            onTranscript(finalTranscript.trim());
            if (!isContinuous) {
              setVoiceState("idle");
            } else {
              setVoiceState("continuous");
            }
          }, 300);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        setVoiceState("error");
        let errorMessage = VOICE_SCRIPTS.errorFallback;
        
        if (event.error === "not-allowed" || event.error === "permission-denied") {
          errorMessage = VOICE_SCRIPTS.microphoneError;
        } else if (event.error === "no-speech") {
          errorMessage = "No speech detected. Please try again.";
        }
        
        onError?.(errorMessage);
        
        timeoutRef.current = setTimeout(() => {
          setVoiceState("idle");
        }, 2000);
      };

      recognition.onend = () => {
        // Check if we should restart in continuous mode using ref value
        if (isContinuousRef.current && recognitionRef.current === recognition) {
          try {
            recognition.start();
          } catch (error) {
            console.error('Failed to restart continuous recognition:', error);
            setVoiceState("idle");
            isContinuousRef.current = false;
          }
        } else {
          setVoiceState("idle");
        }
      };

      recognition.start();
    } catch (error) {
      setVoiceState("error");
      onError?.(VOICE_SCRIPTS.microphoneError);
      
      timeoutRef.current = setTimeout(() => {
        setVoiceState("idle");
      }, 2000);
    }
  }, [isSupported, onTranscript, onError]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    isContinuousRef.current = false; // Reset continuous flag
    setVoiceState("idle");
  }, []);

  const toggleContinuousMode = useCallback(() => {
    if (voiceState === "continuous") {
      stopListening();
      onContinuousModeChange?.(false);
    } else if (voiceState === "idle") {
      startListening(true);
      onContinuousModeChange?.(true);
    }
  }, [voiceState, startListening, stopListening, onContinuousModeChange]);

  const handleClick = useCallback(() => {
    if (continuousMode) {
      toggleContinuousMode();
    } else {
      if (voiceState === "listening") {
        stopListening();
      } else if (voiceState === "idle") {
        startListening(false);
      }
    }
  }, [voiceState, continuousMode, toggleContinuousMode, startListening, stopListening]);

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
        (voiceState === "listening" || voiceState === "continuous") && "text-primary",
        className
      )}
      data-testid="button-voice-mode"
      aria-label={
        voiceState === "continuous"
          ? "Stop continuous listening"
          : voiceState === "listening" 
          ? "Stop listening" 
          : voiceState === "processing"
          ? "Processing..."
          : continuousMode
          ? "Start continuous listening"
          : "Start voice input"
      }
    >
      {(voiceState === "listening" || voiceState === "continuous") && (
        <span className="absolute inset-0 rounded-full animate-pulse bg-primary/20" />
      )}
      
      {voiceState === "processing" ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : voiceState === "continuous" ? (
        <Radio className={cn("w-4 h-4 text-primary animate-pulse")} />
      ) : (
        <Mic className={cn(
          "w-4 h-4",
          voiceState === "listening" && "text-primary"
        )} />
      )}
    </Button>
  );
}
