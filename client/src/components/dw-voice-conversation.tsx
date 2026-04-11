import { useState, useRef, useEffect, useCallback } from "react";
import { DWOrb } from "@/components/dw-orb";
import { Button } from "@/components/ui/button";
import { X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChatMessage {
  role: "user" | "assistant" | "system" | "insight";
  content: string;
}

interface DWVoiceConversationProps {
  messages: ChatMessage[];
  onSend: (text: string) => void;
  isTyping: boolean;
  onClose: () => void;
}

type ConvState = "idle" | "listening" | "processing" | "speaking" | "error";

const SILENCE_THRESHOLD = 0.012;
const SILENCE_DURATION_MS = 1600;
const MIN_RECORDING_MS = 800;

export function DWVoiceConversation({
  messages,
  onSend,
  isTyping,
  onClose,
}: DWVoiceConversationProps) {
  const [convState, setConvState] = useState<ConvState>("idle");
  const [statusText, setStatusText] = useState("Starting up…");
  const [lastDWText, setLastDWText] = useState<string>(() => {
    const last = [...messages].reverse().find((m) => m.role === "assistant");
    return last?.content.replace(/[#*`_~[\]()>]/g, "").trim().slice(0, 280) ?? "";
  });
  const [audioLevel, setAudioLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const levelIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const recordingStartRef = useRef<number>(0);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const messagesLenRef = useRef(messages.length);
  const convStateRef = useRef<ConvState>("idle");
  const isMountedRef = useRef(true);

  const setState = useCallback((s: ConvState) => {
    convStateRef.current = s;
    if (isMountedRef.current) setConvState(s);
  }, []);

  const stopAllAudio = useCallback(() => {
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current.src = "";
      currentAudioRef.current = null;
    }
    if (window.speechSynthesis) window.speechSynthesis.cancel();
  }, []);

  const cleanupRecording = useCallback(() => {
    if (silenceTimerRef.current) { clearTimeout(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (levelIntervalRef.current) { clearInterval(levelIntervalRef.current); levelIntervalRef.current = null; }
    if (mediaRecorderRef.current?.state !== "inactive") mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    audioContextRef.current?.close();
    audioContextRef.current = null;
    analyserRef.current = null;
    if (isMountedRef.current) setAudioLevel(0);
  }, []);

  const transcribeAndSend = useCallback(async (blob: Blob) => {
    if (!isMountedRef.current) return;
    setState("processing");
    setStatusText("DW is thinking…");

    try {
      const formData = new FormData();
      const mimeType = blob.type || "audio/webm";
      const ext = mimeType.includes("mp4") ? "mp4" : mimeType.includes("ogg") ? "ogg" : "webm";
      formData.append("audio", blob, `recording.${ext}`);

      const transcribeResp = await fetch("/api/transcribe", { method: "POST", body: formData });
      if (!transcribeResp.ok) throw new Error("Transcription failed");
      const { text: rawText } = await transcribeResp.json();
      if (!rawText?.trim()) {
        if (isMountedRef.current) startListening();
        return;
      }

      const context = messages.filter((m) => m.role === "user" || m.role === "assistant").slice(-8);
      const fixResp = await fetch("/api/ai/fix-transcript", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: rawText, context }),
      });
      const fixData = fixResp.ok ? await fixResp.json() : { text: rawText };
      const finalText = (fixData.text || rawText).trim();

      if (finalText && isMountedRef.current) {
        onSend(finalText);
      }
    } catch {
      if (isMountedRef.current) {
        setState("error");
        setStatusText("Couldn't hear that — tap to try again");
        setTimeout(() => { if (isMountedRef.current) startListening(); }, 2000);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, onSend]);

  const startListening = useCallback(async () => {
    if (!isMountedRef.current) return;
    cleanupRecording();
    stopAllAudio();
    setState("listening");
    setStatusText("Listening…");
    chunksRef.current = [];

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
      streamRef.current = stream;

      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioCtx();
      audioContextRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      recordingStartRef.current = Date.now();

      levelIntervalRef.current = setInterval(() => {
        if (!analyserRef.current || !isMountedRef.current) return;
        analyserRef.current.getByteTimeDomainData(dataArray);
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          const v = (dataArray[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setAudioLevel(Math.min(1, rms * 8));

        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed < MIN_RECORDING_MS) return;

        if (rms < SILENCE_THRESHOLD) {
          if (!silenceTimerRef.current) {
            silenceTimerRef.current = setTimeout(() => {
              silenceTimerRef.current = null;
              if (convStateRef.current === "listening" && mediaRecorderRef.current?.state !== "inactive") {
                mediaRecorderRef.current?.stop();
              }
            }, SILENCE_DURATION_MS);
          }
        } else {
          if (silenceTimerRef.current) {
            clearTimeout(silenceTimerRef.current);
            silenceTimerRef.current = null;
          }
        }
      }, 80);

      const mimeType = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"].find((m) => MediaRecorder.isTypeSupported(m)) ?? "";
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = mr;

      mr.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      mr.onstop = async () => {
        cleanupRecording();
        const blob = new Blob(chunksRef.current, { type: mimeType || "audio/webm" });
        if (blob.size < 1000) {
          if (isMountedRef.current) startListening();
          return;
        }
        await transcribeAndSend(blob);
      };

      mr.start(250);
    } catch (e: any) {
      setState("error");
      setStatusText(e?.name === "NotAllowedError" ? "Microphone access denied" : "Could not start mic");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupRecording, stopAllAudio, transcribeAndSend]);

  const speakText = useCallback(async (text: string) => {
    if (!isMountedRef.current) return;
    cleanupRecording();
    setState("speaking");
    setStatusText("DW is speaking…");

    const stripped = text.replace(/[#*`_~[\]()>]/g, "").replace(/\n+/g, " ").trim().slice(0, 800);

    try {
      const resp = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: stripped, voice: "nova", speed: 1.0 }),
      });
      if (!resp.ok) throw new Error("TTS failed");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      currentAudioRef.current = audio;

      audio.onended = () => {
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        if (isMountedRef.current) {
          setTimeout(() => startListening(), 400);
        }
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        currentAudioRef.current = null;
        if (isMountedRef.current) startListening();
      };
      await audio.play();
    } catch {
      if (isMountedRef.current) setTimeout(() => startListening(), 500);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cleanupRecording, startListening]);

  // Watch for new DW messages → speak them
  useEffect(() => {
    const lastMsg = messages[messages.length - 1];
    if (messages.length <= messagesLenRef.current) return;
    messagesLenRef.current = messages.length;
    if (lastMsg?.role === "assistant") {
      const text = lastMsg.content.replace(/[#*`_~[\]()>]/g, "").trim().slice(0, 280);
      setLastDWText(text);
      speakText(lastMsg.content);
    }
  }, [messages, speakText]);

  // Auto-start listening after isTyping goes false (if no new message triggered speak)
  useEffect(() => {
    if (!isTyping && convStateRef.current === "processing") {
      setTimeout(() => {
        if (convStateRef.current === "processing" && isMountedRef.current) startListening();
      }, 800);
    }
  }, [isTyping, startListening]);

  // Start on mount
  useEffect(() => {
    isMountedRef.current = true;
    const lastMsg = messages[messages.length - 1];
    if (lastMsg?.role === "assistant" && lastMsg.content.trim()) {
      setTimeout(() => speakText(lastMsg.content), 300);
    } else {
      setTimeout(() => startListening(), 500);
    }
    return () => {
      isMountedRef.current = false;
      cleanupRecording();
      stopAllAudio();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const orbState = convState === "speaking" ? "speaking" : convState === "listening" ? "listening" : convState === "processing" ? "active" : "chat";

  const AudioBars = () => {
    const bars = 7;
    return (
      <div className="flex items-center gap-[3px] h-8">
        {Array.from({ length: bars }).map((_, i) => {
          const mid = Math.floor(bars / 2);
          const dist = Math.abs(i - mid) / mid;
          const base = 0.15 + (1 - dist) * 0.35;
          const active = convState === "listening" ? Math.max(base, audioLevel * (1 - dist * 0.4)) : base * 0.5;
          return (
            <div
              key={i}
              className={cn(
                "rounded-full transition-all duration-75",
                convState === "listening" ? "bg-white/70" : "bg-white/25",
              )}
              style={{
                width: 3,
                height: `${Math.min(100, active * 100)}%`,
              }}
            />
          );
        })}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-between bg-[radial-gradient(ellipse_at_center,_#1e1b4b_0%,_#0d0d1a_70%)] px-6 pb-10 pt-safe-top"
      style={{ paddingTop: "env(safe-area-inset-top, 20px)" }}
    >
      <div className="w-full flex justify-end pt-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white/50 hover:text-white hover:bg-white/10 rounded-full"
          data-testid="button-end-voice-conversation"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="flex flex-col items-center gap-6 flex-1 justify-center w-full">
        <DWOrb size={120} state={orbState} />

        <div className="flex flex-col items-center gap-2 min-h-[2.5rem]">
          <p className="text-white/60 text-sm font-medium tracking-wide">
            {convState === "processing" ? (
              <span className="flex items-center gap-2">
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> {statusText}
              </span>
            ) : statusText}
          </p>
          <AudioBars />
        </div>

        {lastDWText && (
          <div className="w-full max-w-sm bg-white/8 border border-white/10 rounded-2xl px-5 py-4 backdrop-blur-sm">
            <p className="text-white/85 text-sm leading-relaxed line-clamp-5 font-body">
              {lastDWText}
            </p>
          </div>
        )}
      </div>

      <div className="flex flex-col items-center gap-3 w-full">
        {convState === "listening" && (
          <button
            onClick={() => {
              if (mediaRecorderRef.current?.state !== "inactive") {
                mediaRecorderRef.current?.stop();
              }
            }}
            className="text-white/40 text-xs underline underline-offset-2"
          >
            Done talking
          </button>
        )}
        <Button
          variant="ghost"
          onClick={onClose}
          className="text-white/40 hover:text-white text-sm"
          data-testid="button-exit-voice-conversation"
        >
          Exit voice conversation
        </Button>
      </div>
    </div>
  );
}
