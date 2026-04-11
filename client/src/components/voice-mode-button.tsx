import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Loader2, Square } from "lucide-react";
import { cn } from "@/lib/utils";

type VoiceState = "idle" | "recording" | "processing" | "error";

interface VoiceModeButtonProps {
  onTranscript: (text: string) => void;
  onError?: (error: string) => void;
  onStateChange?: (state: VoiceState) => void;
  disabled?: boolean;
  className?: string;
  size?: "default" | "sm" | "lg" | "icon";
  variant?: "default" | "ghost" | "outline";
  autoListenTrigger?: number;
}

export function VoiceModeButton({
  onTranscript,
  onError,
  onStateChange,
  disabled = false,
  className,
  size = "icon",
  variant = "ghost",
  autoListenTrigger,
}: VoiceModeButtonProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const autoTriggerRef = useRef(0);

  const setVS = useCallback((s: VoiceState) => {
    setVoiceState(s);
    onStateChange?.(s);
  }, [onStateChange]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const transcribeAudio = useCallback(async (blob: Blob) => {
    setVS("processing");
    try {
      const formData = new FormData();
      const mimeType = blob.type || "audio/webm";
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const resp = await fetch("/api/transcribe", {
        method: "POST",
        body: formData,
      });

      if (!resp.ok) throw new Error("Transcription failed");
      const data = await resp.json();
      const text = data.text?.trim();
      if (text) {
        onTranscript(text);
      } else {
        onError?.("Couldn't make out what you said — try again.");
      }
    } catch (e: any) {
      onError?.(e?.message ?? "Transcription failed. Please try again.");
    } finally {
      setVS("idle");
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    }
  }, [onTranscript, onError, setVS]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const mimeType = [
        "audio/webm;codecs=opus",
        "audio/webm",
        "audio/mp4",
        "audio/ogg",
      ].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";

      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mr.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        await transcribeAudio(blob);
      };

      mr.start();
      setVS("recording");

      // Auto-stop after 30 seconds as a safety net
      setTimeout(() => {
        if (mr.state !== "inactive") mr.stop();
      }, 30000);
    } catch (e: any) {
      const msg = e?.name === "NotAllowedError"
        ? "Microphone permission denied — check your browser settings."
        : "Could not access microphone.";
      onError?.(msg);
      setVS("error");
      setTimeout(() => setVS("idle"), 2500);
    }
  }, [transcribeAudio, onError, setVS]);

  const handleClick = useCallback(() => {
    if (voiceState === "recording") {
      stopRecording();
    } else if (voiceState === "idle" || voiceState === "error") {
      startRecording();
    }
  }, [voiceState, startRecording, stopRecording]);

  // Auto-listen trigger (after DW finishes speaking)
  useEffect(() => {
    if (!autoListenTrigger || autoListenTrigger === autoTriggerRef.current) return;
    autoTriggerRef.current = autoListenTrigger;
    setTimeout(() => startRecording(), 400);
  }, [autoListenTrigger, startRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== "inactive") {
        mediaRecorderRef.current?.stop();
      }
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (voiceState === "error") {
    return (
      <Button
        size={size}
        variant="ghost"
        onClick={handleClick}
        disabled={disabled}
        className={cn("text-destructive gap-1.5 transition-all duration-200", className)}
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
        voiceState === "recording" && "text-red-500 bg-red-50 dark:bg-red-950/30",
        className
      )}
      data-testid="button-voice-mode"
      aria-label={
        voiceState === "recording"
          ? "Stop recording"
          : voiceState === "processing"
          ? "Transcribing..."
          : "Start voice input"
      }
    >
      {voiceState === "recording" && (
        <span className="absolute inset-0 rounded-full animate-pulse bg-red-400/20" />
      )}

      {voiceState === "processing" ? (
        <Loader2 className="w-4 h-4 animate-spin text-foreground" />
      ) : voiceState === "recording" ? (
        <Square className="w-4 h-4 fill-red-500 text-red-500" />
      ) : (
        <Mic className="w-4 h-4 text-foreground" />
      )}
    </Button>
  );
}
