import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, X, Keyboard, Send, Settings, Volume2, VolumeX, ChevronLeft, Heart } from "lucide-react";
import { TriggerProtocolSheet } from "@/components/triggers/trigger-protocol-sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { apiRequest } from "@/lib/queryClient";
import { ttsService } from "@/lib/tts-service";
import { useAssistantLaunch, getVoicePreferences, saveVoicePreferences } from "@/hooks/use-assistant-launch";
import { usePageMeta } from "@/hooks/use-page-meta";
import { useToast } from "@/hooks/use-toast";
import { logAssistantAction } from "@/lib/assistant-analytics";

type VoiceState = "idle" | "listening" | "processing" | "speaking" | "error";
type InputMode = "voice" | "text";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  suggestion?: { kind: "trigger_protocol"; reason?: string } | { kind: string; [k: string]: unknown };
  triggeredByUserMessage?: string;
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
  onstart: (() => void) | null;
  onresult: ((e: SpeechRecognitionEvent) => void) | null;
  onerror: ((e: SpeechRecognitionErrorEvent) => void) | null;
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

function getSpeechRecognition(): SpeechRecognitionConstructor | null {
  if (typeof window === "undefined") return null;
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null;
}

function MicOrb({ voiceState }: { voiceState: VoiceState }) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing" || voiceState === "speaking";
  const isError = voiceState === "error";

  return (
    <div className="relative flex items-center justify-center w-40 h-40">
      {isListening && (
        <>
          <span className="absolute w-40 h-40 rounded-full bg-primary/8 animate-ping" style={{ animationDuration: "2s" }} />
          <span className="absolute w-32 h-32 rounded-full bg-primary/12 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.2s" }} />
          <span className="absolute w-24 h-24 rounded-full bg-primary/18 animate-ping" style={{ animationDuration: "1.2s", animationDelay: "0.1s" }} />
        </>
      )}
      <motion.button
        className={cn(
          "w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none",
          isListening
            ? "bg-primary shadow-2xl shadow-primary/40"
            : isError
              ? "bg-rose-500/20 border-2 border-rose-500/40"
              : "bg-primary/15 border-2 border-primary/20 hover:bg-primary/25",
        )}
        whileTap={{ scale: 0.93 }}
        data-testid="button-mic-orb"
      >
        {isProcessing ? (
          <motion.div
            className="w-8 h-8 rounded-full border-3 border-primary border-t-transparent animate-spin"
            style={{ borderWidth: 3 }}
          />
        ) : isListening ? (
          <MicOff className="w-10 h-10 text-primary-foreground" />
        ) : (
          <Mic className={cn("w-10 h-10", isError ? "text-rose-500" : "text-primary")} />
        )}
      </motion.button>
    </div>
  );
}

export default function VoiceModePage() {
  usePageMeta({ title: "Voice Mode — DW" });
  const [, nav] = useLocation();
  const { toast } = useToast();
  const context = useAssistantLaunch();
  const prefs = getVoicePreferences();

  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [messages, setMessages] = useState<Message[]>([]);
  const [textInput, setTextInput] = useState("");
  const [interim, setInterim] = useState("");
  const [speakAloud, setSpeakAloud] = useState(prefs.speakResponsesAloud);
  const [micSupported] = useState(() => !!getSpeechRecognition());
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);
  const [triggerSheetSeed, setTriggerSheetSeed] = useState<{ feeling: string; assumption: string }>({ feeling: "", assumption: "" });

  const recRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoStarted = useRef(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => { scrollToBottom(); }, [messages]);

  const stopMic = useCallback(() => {
    recRef.current?.stop();
    recRef.current = null;
    setInterim("");
    setVoiceState("idle");
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setVoiceState("processing");
    transcriptRef.current = "";
    setInterim("");

    try {
      await logAssistantAction({
        source: context?.source ?? "internal",
        action: "voice",
        parameters: {},
        success: true,
        durationMs: 0,
      });

      const res = await apiRequest("POST", "/api/chat/smart", {
        message: text.trim(),
        conversationHistory: messages.slice(-6).map(m => ({ role: m.role, content: m.content })),
      });
      const json = await res.json() as { response?: string; suggestion?: { kind: string; reason?: string } };
      const reply = json.response ?? "I didn't get a response. Please try again.";

      const suggestion = json.suggestion && typeof json.suggestion === "object" && json.suggestion.kind
        ? json.suggestion
        : undefined;
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: reply,
        ...(suggestion ? { suggestion, triggeredByUserMessage: text.trim() } : {}),
      };
      setMessages(prev => [...prev, assistantMsg]);

      if (speakAloud && ttsService.isAvailable()) {
        setVoiceState("speaking");
        await ttsService.speak(reply);
        setVoiceState("idle");
        if (micSupported && inputMode === "voice") {
          setTimeout(() => startListening(), 600);
        }
      } else {
        setVoiceState("idle");
      }
    } catch {
      setVoiceState("error");
      toast({ title: "Couldn't reach DW", description: "Check your connection and try again.", variant: "destructive" });
    }
  }, [messages, speakAloud, micSupported, inputMode, context]);

  const startListening = useCallback(() => {
    const SR = getSpeechRecognition();
    if (!SR) {
      setInputMode("text");
      return;
    }
    stopMic();
    ttsService.stop();

    const rec = new SR();
    rec.continuous = false;
    rec.interimResults = true;
    rec.lang = "en-US";
    rec.onstart = () => setVoiceState("listening");
    rec.onresult = (e: SpeechRecognitionEvent) => {
      let interim = "";
      let final = "";
      for (let i = 0; i < e.results.length; i++) {
        const r = e.results[i];
        if (r.isFinal) final += r[0].transcript;
        else interim += r[0].transcript;
      }
      transcriptRef.current = final || transcriptRef.current;
      setInterim(interim);
    };
    rec.onerror = (e: SpeechRecognitionErrorEvent) => {
      if (e.error !== "aborted") setVoiceState("error");
    };
    rec.onend = () => {
      const transcript = transcriptRef.current.trim();
      if (transcript) {
        sendMessage(transcript);
      } else {
        setVoiceState("idle");
        setInterim("");
      }
    };
    recRef.current = rec;
    rec.start();
  }, [stopMic, sendMessage]);

  const toggleMic = useCallback(() => {
    if (voiceState === "listening") {
      stopMic();
    } else if (voiceState === "idle" || voiceState === "error") {
      startListening();
    }
  }, [voiceState, stopMic, startListening]);

  const handleTextSend = () => {
    if (!textInput.trim()) return;
    sendMessage(textInput);
    setTextInput("");
  };

  useEffect(() => {
    if (autoStarted.current) return;
    autoStarted.current = true;
    const shouldAutoStart = context?.autoStartVoice ?? false;
    if (shouldAutoStart && micSupported) {
      setTimeout(() => startListening(), 400);
    }
  }, [context, micSupported, startListening]);

  useEffect(() => {
    return () => {
      stopMic();
      ttsService.stop();
    };
  }, [stopMic]);

  const statusText: Record<VoiceState, string> = {
    idle: micSupported ? "Tap to speak" : "Type your message",
    listening: "Listening…",
    processing: "Thinking…",
    speaking: "DW is speaking…",
    error: "Didn't catch that — tap to try again",
  };

  const lastAssistantMsg = [...messages].reverse().find(m => m.role === "assistant");
  const lastUserMsg = [...messages].reverse().find(m => m.role === "user");

  return (
    <div className="fixed inset-0 flex flex-col bg-background" data-testid="page-voice-mode">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-safe-top pt-4 pb-3 border-b border-border/20">
        <button
          className="p-2 -ml-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => { stopMic(); ttsService.stop(); nav(-1 as unknown as string); }}
          data-testid="button-voice-back"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="text-center">
          <p className="text-sm font-semibold text-foreground">Talk to DW</p>
          {context?.source && context.source !== "internal" && context.source !== "url" && (
            <p className="text-[10px] text-muted-foreground capitalize">via {context.source}</p>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => {
              const next = !speakAloud;
              setSpeakAloud(next);
              saveVoicePreferences({ speakResponsesAloud: next });
            }}
            data-testid="button-toggle-tts"
            title={speakAloud ? "Mute DW voice" : "Unmute DW voice"}
          >
            {speakAloud ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>
          <button
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => setInputMode(m => m === "voice" ? "text" : "voice")}
            data-testid="button-toggle-input-mode"
            title={inputMode === "voice" ? "Switch to text" : "Switch to voice"}
          >
            {inputMode === "voice" ? <Keyboard className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>
          <button
            className="p-2 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => nav("/settings?section=voice")}
            data-testid="button-voice-settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Conversation transcript */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {messages.length === 0 && (
          <div className="text-center py-8 space-y-2">
            <p className="text-base font-medium text-foreground">Hey, I'm DW.</p>
            <p className="text-sm text-muted-foreground">
              {micSupported ? "Tap the mic and start speaking." : "Type something below to start."}
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map(msg => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("max-w-[85%]", msg.role === "user" ? "ml-auto text-right" : "mr-auto")}
            >
              <p className={cn(
                "text-[10px] font-semibold uppercase tracking-wider mb-1",
                msg.role === "user" ? "text-primary/60" : "text-muted-foreground"
              )}>
                {msg.role === "user" ? "You" : "DW"}
              </p>
              <div className={cn(
                "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                msg.role === "user"
                  ? "bg-primary text-primary-foreground rounded-tr-sm"
                  : "bg-muted/60 text-foreground rounded-tl-sm"
              )}>
                {msg.content}
              </div>
              {msg.role === "assistant" && msg.suggestion?.kind === "trigger_protocol" && (
                <div className="mt-2">
                  {typeof (msg.suggestion as { reason?: string }).reason === "string" && (
                    <p className="text-xs text-muted-foreground mb-1.5 italic">
                      {(msg.suggestion as { reason?: string }).reason}
                    </p>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                    onClick={() => {
                      setTriggerSheetSeed({
                        feeling: msg.triggeredByUserMessage ?? "",
                        assumption: msg.triggeredByUserMessage ?? "",
                      });
                      setTriggerSheetOpen(true);
                    }}
                    data-testid={`button-start-trigger-reset-${msg.id}`}
                  >
                    <Heart className="h-3.5 w-3.5" />
                    Start trigger reset
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {interim && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-[85%] ml-auto text-right"
          >
            <p className="text-[10px] font-semibold uppercase tracking-wider mb-1 text-primary/60">You</p>
            <div className="rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm bg-primary/20 text-foreground/60 italic">
              {interim}
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Center orb — only in voice mode */}
      {inputMode === "voice" && (
        <div className="flex flex-col items-center gap-3 py-4 border-t border-border/10">
          <div onClick={toggleMic}>
            <MicOrb voiceState={voiceState} />
          </div>
          <AnimatePresence mode="wait">
            <motion.p
              key={voiceState}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              className={cn(
                "text-sm font-medium",
                voiceState === "listening" ? "text-primary" :
                voiceState === "error" ? "text-rose-500" :
                "text-muted-foreground"
              )}
            >
              {statusText[voiceState]}
            </motion.p>
          </AnimatePresence>
        </div>
      )}

      {/* Text input fallback */}
      {inputMode === "text" && (
        <div className="px-4 pb-safe-bottom pb-4 pt-3 border-t border-border/20">
          <div className="flex items-end gap-2">
            <Textarea
              value={textInput}
              onChange={e => setTextInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleTextSend(); } }}
              placeholder="Type your message…"
              className="min-h-[44px] max-h-[120px] resize-none flex-1 text-sm"
              rows={1}
              disabled={voiceState === "processing"}
              data-testid="input-voice-text"
            />
            <Button
              size="icon"
              onClick={handleTextSend}
              disabled={!textInput.trim() || voiceState === "processing"}
              data-testid="button-voice-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}

      {inputMode === "text" && (
        <div className="pb-safe-bottom pb-3 flex justify-center">
          <button
            className="text-xs text-muted-foreground/50 hover:text-muted-foreground"
            onClick={() => setInputMode("voice")}
          >
            Back to voice
          </button>
        </div>
      )}

      <TriggerProtocolSheet
        open={triggerSheetOpen}
        onOpenChange={setTriggerSheetOpen}
        initialFeeling={triggerSheetSeed.feeling}
        initialAssumption={triggerSheetSeed.assumption}
      />
    </div>
  );
}
