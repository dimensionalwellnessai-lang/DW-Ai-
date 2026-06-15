import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useLocation } from "wouter";
import { motion, AnimatePresence } from "framer-motion";
import { Mic, MicOff, Send, Keyboard, Loader2, ArrowRight, Pencil, Check, X } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { VOICE_SCRIPTS } from "@/config/voiceScripts";
import { OnboardingValuePreview } from "@/components/onboarding-value-preview";
import { isFeatureEnabled } from "@/config/featureFlags";
import { usePageMeta } from "@/hooks/use-page-meta";

// ─── Types ──────────────────────────────────────────────────────────────────

type InputMode = "voice" | "text";
type VoiceState = "idle" | "listening" | "processing" | "error";
type OnboardingPhase = "value-preview" | "intro" | "thread";

interface ThreadMessage {
  id: string;
  role: "assistant" | "user";
  content: string;
}

// ─── Speech recognition shims ────────────────────────────────────────────────

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

// Synthetic message used to trigger the AI's opening greeting without any real
// user input. The backend treats it as a normal user turn; the system prompt
// instructs DW to begin with a welcoming question.
const START_ONBOARDING_TRIGGER = "[START_ONBOARDING]";

// How long (ms) to wait after an AI response before automatically restarting
// the microphone in voice mode. Gives the user a moment to read/hear the reply.
const VOICE_AUTO_RESTART_DELAY_MS = 600;

// localStorage keys for tracking onboarding completion state
const LS_VOICE_ONBOARDING_SKIPPED = "dw_voice_onboarding_skipped";
const LS_VOICE_ONBOARDING_COMPLETED = "dw_voice_onboarding_completed";
const LS_INPUT_MODE = "dw_voice_onboarding_input_mode";

// Spec 13 — the 10 conversational onboarding stages surfaced to the user
// as a minimal progress strip at the top of the thread.
const ONBOARDING_STEPS = [
  "Connection",
  "Life story",
  "Direction",
  "Life areas",
  "Patterns",
  "Curiosity",
  "Pacing",
  "Summary",
  "Suggestions",
  "Launch",
] as const;

// Infer the approximate current step from the number of assistant turns.
// Each AI response roughly maps to one conversation stage advance.
function inferStep(assistantTurnCount: number): number {
  // Steps 1–10, clamp to 10
  return Math.min(assistantTurnCount, ONBOARDING_STEPS.length - 1);
}

// ─── Avatar component ─────────────────────────────────────────────────────────

function AvatarOrb({ voiceState, phase }: { voiceState: VoiceState; phase: OnboardingPhase }) {
  const isListening = voiceState === "listening";
  const isProcessing = voiceState === "processing";

  return (
    <div className="relative flex items-center justify-center">
      {/* Outer pulse rings */}
      {isListening && (
        <>
          <span className="absolute w-32 h-32 rounded-full bg-primary/10 animate-ping" />
          <span className="absolute w-24 h-24 rounded-full bg-primary/15 animate-ping [animation-delay:150ms]" />
        </>
      )}
      {/* Core orb */}
      <motion.div
        animate={{
          scale: isListening ? [1, 1.08, 1] : 1,
        }}
        transition={{ repeat: isListening ? Infinity : 0, duration: 1.4, ease: "easeInOut" }}
        className={cn(
          "w-20 h-20 rounded-full flex items-center justify-center transition-colors duration-300",
          isListening ? "bg-primary shadow-lg shadow-primary/30" : "bg-primary/10",
        )}
      >
        {isProcessing ? (
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        ) : isListening ? (
          <Mic className="w-8 h-8 text-primary-foreground" />
        ) : (
          <Mic className="w-8 h-8 text-primary" />
        )}
      </motion.div>
    </div>
  );
}

// ─── Step progress bar ────────────────────────────────────────────────────────

function StepProgressBar({ currentStep }: { currentStep: number }) {
  const total = ONBOARDING_STEPS.length;
  const stepLabel = ONBOARDING_STEPS[Math.min(currentStep, total - 1)];
  const pct = Math.round(((currentStep + 1) / total) * 100);

  return (
    <div className="px-4 py-2 border-b bg-background/80" aria-label={`Onboarding step ${currentStep + 1} of ${total}: ${stepLabel}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
          {stepLabel}
        </span>
        <span className="text-[10px] text-muted-foreground">
          {currentStep + 1} / {total}
        </span>
      </div>
      <div className="h-1 rounded-full bg-muted overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
        <motion.div
          className="h-full bg-primary rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.4, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

// ─── Editable message row ─────────────────────────────────────────────────────

interface EditableUserMessageProps {
  message: ThreadMessage;
  onRegenerate: (id: string, newContent: string) => void;
  disabled?: boolean;
}

function EditableUserMessage({ message, onRegenerate, disabled }: EditableUserMessageProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(message.content);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (editing) textareaRef.current?.focus();
  }, [editing]);

  const handleSave = () => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== message.content) {
      onRegenerate(message.id, trimmed);
    }
    setEditing(false);
  };

  const handleCancel = () => {
    setDraft(message.content);
    setEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
    if (e.key === "Escape") handleCancel();
  };

  return (
    <div className="group relative border-l-4 border-primary/40 pl-4 py-2">
      <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground mb-1">You</p>
      {editing ? (
        <div className="space-y-2">
          <Textarea
            ref={textareaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={handleKeyDown}
            className="min-h-[48px] max-h-[160px] resize-none text-sm"
            rows={2}
            data-testid="input-edit-message"
          />
          <div className="flex gap-2">
            <Button
              size="sm"
              onClick={handleSave}
              disabled={!draft.trim() || disabled}
              data-testid="button-save-edit"
            >
              <Send className="w-3 h-3 mr-1" />
              Send
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancel} data-testid="button-cancel-edit">
              <X className="w-3 h-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2">
          <p className="text-base leading-relaxed whitespace-pre-line break-words flex-1">{message.content}</p>
          {!disabled && (
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
              aria-label="Edit message"
              data-testid="button-edit-message"
            >
              <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function VoiceOnboardingPage() {
  usePageMeta("Voice Onboarding", "Set up your voice-guided onboarding.");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Phase: "value-preview" = show DW value proposition; "intro" = full-screen avatar; "thread" = chat thread view
  const [phase, setPhase] = useState<OnboardingPhase>(
    isFeatureEnabled("ONBOARDING_VALUE_PREVIEW") ? "value-preview" : "intro",
  );
  const [inputMode, setInputMode] = useState<InputMode>("voice");
  const [voiceState, setVoiceState] = useState<VoiceState>("idle");
  const [liveTranscript, setLiveTranscript] = useState("");
  const [textInput, setTextInput] = useState("");
  const [thread, setThread] = useState<ThreadMessage[]>([]);
  const [isReplying, setIsReplying] = useState(false);
  const [voiceSupported, setVoiceSupported] = useState(true);
  const [micPermissionDenied, setMicPermissionDenied] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const voiceStateRef = useRef<VoiceState>("idle"); // Ref mirror to avoid stale closures in event handlers
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper: keep both state and ref in sync
  const updateVoiceState = useCallback((next: VoiceState) => {
    voiceStateRef.current = next;
    setVoiceState(next);
  }, []);

  // Helper: set input mode and persist to localStorage
  const updateInputMode = useCallback((mode: InputMode) => {
    setInputMode(mode);
    try {
      localStorage.setItem(LS_INPUT_MODE, mode);
    } catch {
      // Ignore storage errors
    }
  }, []);

  // ── Check voice support ──
  useEffect(() => {
    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      setVoiceSupported(false);
      setInputMode("text");
    } else {
      // Restore persisted input mode preference
      try {
        const saved = localStorage.getItem(LS_INPUT_MODE);
        if (saved === "text") setInputMode("text");
        else if (saved === "voice") setInputMode("voice");
      } catch {
        // Ignore storage errors
      }
    }
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      recognitionRef.current?.abort();
    };
  }, []);

  // ── Scroll to latest message ──
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [thread, isReplying]);

  // Ref for startListening — declared here (before the auto-listen effect that
  // needs it) and assigned after useCallback initialises the real function below.
  // This avoids a temporal dead zone while keeping the effect's dep array clean.
  const startListeningRef = useRef<(() => void) | null>(null);

  // ── Auto-listen: restart mic automatically after each AI response in voice mode ──
  // This makes the voice flow feel continuous — the user doesn't need to tap the
  // mic button after every AI question; the app advances the conversation for them.
  useEffect(() => {
    if (isReplying || inputMode !== "voice" || phase !== "thread") return;
    const lastMsg = thread[thread.length - 1];
    if (lastMsg?.role !== "assistant") return;
    const timer = setTimeout(() => {
      if (voiceStateRef.current === "idle") {
        startListeningRef.current?.();
      }
    }, VOICE_AUTO_RESTART_DELAY_MS);
    return () => clearTimeout(timer);
  }, [isReplying, inputMode, phase, thread]);

  // ── AI chat mutation ──
  // The server derives the onboarding system prompt from `context: "voice-onboarding"`,
  // so it is applied on every turn without needing to pass text from the client.
  const chatMutation = useMutation({
    mutationFn: async (history: ThreadMessage[]) => {
      const latestMessage = history[history.length - 1];

      const response = await apiRequest("POST", "/api/chat/smart", {
        message: latestMessage.content,
        context: "voice-onboarding",
        conversationHistory: history.slice(0, -1).map((m) => ({
          role: m.role,
          content: m.content,
        })),
      });
      return response.json();
    },
    onSuccess: (data) => {
      const reply: ThreadMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: data.response,
      };
      setThread((prev) => [...prev, reply]);
      setIsReplying(false);
    },
    onError: () => {
      const fallback: ThreadMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        content: "I'm having a small moment on my end — nothing to worry about. Take a breath and share that again whenever you're ready.",
      };
      setThread((prev) => [...prev, fallback]);
      setIsReplying(false);
    },
  });

  // ── Send a user message (adds to thread and triggers AI reply) ──
  const sendUserMessage = useCallback(
    (content: string, historyOverride?: ThreadMessage[]) => {
      const trimmed = content.trim();
      if (!trimmed) return;

      const userMsg: ThreadMessage = { id: `u-${Date.now()}`, role: "user", content: trimmed };
      const newThread = historyOverride ? [...historyOverride, userMsg] : [...thread, userMsg];
      setThread(newThread);
      setLiveTranscript("");
      setTextInput("");
      setIsReplying(true);

      // Transition to thread phase on first user message
      if (phase === "intro") setPhase("thread");

      chatMutation.mutate(newThread);
    },
    [thread, phase, chatMutation],
  );

  // Keep a ref to sendUserMessage so voice recognition handlers never hold a
  // stale closure — each utterance always uses the latest thread state.
  const sendUserMessageRef = useRef(sendUserMessage);
  sendUserMessageRef.current = sendUserMessage;

  // ── Voice recognition ──
  const startListening = useCallback(() => {
    const SpeechAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechAPI) return;

    try {
      const recognition = new SpeechAPI();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setMicPermissionDenied(false);
        updateVoiceState("listening");
      };

      recognition.onresult = (event: SpeechRecognitionEvent) => {
        let interim = "";
        let final = "";
        for (let i = 0; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + " ";
          } else {
            interim += event.results[i][0].transcript;
          }
        }
        setLiveTranscript(final || interim);
        if (final) {
          updateVoiceState("processing");
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          timeoutRef.current = setTimeout(() => {
            // Use ref so the handler always calls the latest sendUserMessage, even
            // if the component re-rendered since the recognition session started.
            sendUserMessageRef.current(final.trim());
            updateVoiceState("idle");
          }, 400);
        }
      };

      recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
        updateVoiceState("error");
        const isPermissionError = event.error === "not-allowed" || event.error === "permission-denied";
        if (isPermissionError) {
          setMicPermissionDenied(true);
          updateInputMode("text");
          toast({
            title: "Microphone access denied",
            description: VOICE_SCRIPTS.microphoneError,
            variant: "destructive",
          });
        } else {
          toast({ title: "Voice input", description: VOICE_SCRIPTS.errorFallback, variant: "destructive" });
        }
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
        timeoutRef.current = setTimeout(() => updateVoiceState("idle"), 2000);
      };

      // Use voiceStateRef (not closed-over voiceState) to avoid reading a stale value
      recognition.onend = () => {
        if (voiceStateRef.current === "listening") updateVoiceState("idle");
      };

      recognition.start();
    } catch {
      updateVoiceState("error");
      toast({ title: "Voice input", description: VOICE_SCRIPTS.microphoneError, variant: "destructive" });
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => updateVoiceState("idle"), 2000);
    }
    // sendUserMessage intentionally omitted — accessed via sendUserMessageRef to prevent stale closures
  }, [toast, updateVoiceState, updateInputMode]);

  // Keep startListeningRef in sync with the real callback so the auto-listen
  // effect (declared above, before this callback) can call it without a TDZ issue.
  startListeningRef.current = startListening;

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    updateVoiceState("idle");
  }, [updateVoiceState]);

  const handleMicClick = useCallback(() => {
    if (voiceState === "listening") {
      stopListening();
    } else if (voiceState === "idle") {
      startListening();
    }
  }, [voiceState, startListening, stopListening]);

  // ── Text send ──
  const handleTextSend = () => {
    if (!textInput.trim() || isReplying) return;
    sendUserMessage(textInput);
  };

  const handleTextKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleTextSend();
    }
  };

  // ── Regenerate: replace message at id with newContent, drop everything after, re-query ──
  const handleRegenerate = useCallback(
    (messageId: string, newContent: string) => {
      const idx = thread.findIndex((m) => m.id === messageId);
      if (idx === -1) return;
      const truncated = thread.slice(0, idx);
      setThread(truncated);
      setIsReplying(true);
      sendUserMessage(newContent, truncated);
    },
    [thread, sendUserMessage],
  );

  // ── Begin onboarding: trigger first AI greeting ──
  const handleBegin = useCallback(() => {
    setPhase("thread");
    setIsReplying(true);
    chatMutation.mutate([
      {
        id: "init",
        role: "user",
        content: START_ONBOARDING_TRIGGER,
      },
    ]);
  }, [chatMutation]);

  // ── Skip to app (persist skip flag so entry point isn't shown repeatedly) ──
  const handleSkip = () => {
    try {
      localStorage.setItem(LS_VOICE_ONBOARDING_SKIPPED, "true");
    } catch {
      // Ignore storage errors to avoid blocking navigation
    }
    setLocation("/");
  };

  // ── Done: extract profile from conversation, then mark completed ──
  const handleDone = useCallback(async () => {
    try {
      localStorage.setItem(LS_VOICE_ONBOARDING_COMPLETED, "true");
    } catch {
      // Ignore storage errors to avoid blocking navigation
    }
    try {
      await apiRequest("POST", "/api/onboarding/voice-complete", {
        messages: thread.map((m) => ({ role: m.role, content: m.content })),
      });
    } catch {
      // Non-fatal — navigate home even if save fails
    }
    setLocation("/");
  }, [thread, setLocation]);

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Value preview phase — show DW capability cards
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "value-preview") {
    return (
      <OnboardingValuePreview
        onBegin={() => setPhase("intro")}
        onSkip={handleSkip}
      />
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Intro phase — full-screen avatar
  // ─────────────────────────────────────────────────────────────────────────
  if (phase === "intro") {
    return (
      <div
        className="min-h-screen bg-background flex flex-col items-center justify-center gap-8 px-6 relative"
        data-testid="voice-onboarding-intro"
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="absolute top-4 right-4 text-muted-foreground"
          data-testid="button-skip-onboarding"
        >
          Skip
        </Button>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center space-y-3"
        >
          <h1 className="text-2xl font-display font-semibold">Meet DW</h1>
          <p className="text-muted-foreground text-sm max-w-xs mx-auto">
            Your dimensional wellness companion. Let&apos;s start with a quick conversation.
          </p>
        </motion.div>

        <AvatarOrb voiceState={voiceState} phase={phase} />

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col items-center gap-4 w-full max-w-xs"
        >
          <Button
            size="lg"
            className="w-full"
            onClick={handleBegin}
            data-testid="button-start-voice-onboarding"
          >
            Start talking
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => {
              updateInputMode("text");
              handleBegin();
            }}
            data-testid="button-use-text-instead"
          >
            <Keyboard className="w-4 h-4 mr-1.5" />
            Use text instead
          </Button>
        </motion.div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Render: Thread phase — chat thread + input
  // ─────────────────────────────────────────────────────────────────────────
  const assistantTurnCount = thread.filter((m) => m.role === "assistant").length;
  const currentStep = inferStep(assistantTurnCount);

  return (
    <div className="flex flex-col h-screen bg-background" data-testid="voice-onboarding-thread">
      {/* Header */}
      <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
            <Mic className="w-4 h-4 text-primary" />
          </div>
          <span className="font-medium text-sm">First session</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleDone}
          className="text-muted-foreground text-xs"
          data-testid="button-finish-onboarding"
        >
          Done
        </Button>
      </header>

      {/* Step progress */}
      <StepProgressBar currentStep={currentStep} />
      {/* Thread */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-2xl mx-auto py-6 px-4 space-y-6">
          <AnimatePresence initial={false}>
            {thread.map((msg) => (
              <motion.article
                key={msg.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                data-testid={`thread-message-${msg.id}`}
              >
                {msg.role === "assistant" ? (
                  <div className="space-y-1">
                    <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">DW</p>
                    <p className="text-base leading-relaxed whitespace-pre-line">{msg.content}</p>
                  </div>
                ) : (
                  <EditableUserMessage
                    message={msg}
                    onRegenerate={handleRegenerate}
                    disabled={isReplying}
                  />
                )}
              </motion.article>
            ))}
          </AnimatePresence>

          {/* Typing indicator */}
          {isReplying && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex items-center gap-2 py-2"
              aria-live="polite"
              role="status"
            >
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">DW is thinking…</span>
            </motion.div>
          )}

          {/* Live transcript preview (voice mode) */}
          {liveTranscript && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-l-4 border-primary/30 pl-4 py-1 italic text-muted-foreground text-sm"
              data-testid="live-transcript-preview"
              aria-live="polite"
            >
              {liveTranscript}…
            </motion.div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input bar */}
      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-4">
          {/* Mode toggle */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={() => updateInputMode("voice")}
              disabled={!voiceSupported}
              aria-disabled={!voiceSupported}
              aria-pressed={inputMode === "voice"}
              title={!voiceSupported ? VOICE_SCRIPTS.voiceNotSupported : undefined}
              className={cn(
                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors",
                inputMode === "voice"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/50",
                !voiceSupported && "opacity-50 cursor-not-allowed",
              )}
              data-testid="button-mode-voice"
            >
              <Mic className="w-3 h-3" />
              Voice
            </button>
            <button
              onClick={() => updateInputMode("text")}
              aria-pressed={inputMode === "text"}
              className={cn(
                "flex items-center gap-1 text-xs px-2.5 py-1 rounded-full border transition-colors",
                inputMode === "text"
                  ? "bg-primary text-primary-foreground border-primary"
                  : "text-muted-foreground border-border hover:border-primary/50",
              )}
              data-testid="button-mode-text"
            >
              <Keyboard className="w-3 h-3" />
              Text
            </button>
          </div>

          {/* Voice/mic status notices */}
          {!voiceSupported && (
            <p className="text-xs text-muted-foreground mb-3" role="note" data-testid="notice-voice-unsupported">
              {VOICE_SCRIPTS.voiceNotSupported}
            </p>
          )}
          {micPermissionDenied && voiceSupported && (
            <p className="text-xs text-destructive mb-3" role="alert" data-testid="notice-mic-permission-denied">
              {VOICE_SCRIPTS.microphoneError} Tap Voice to retry once you've updated your browser settings.
            </p>
          )}

          {/* Voice input */}
          {inputMode === "voice" && (
            <div className="flex flex-col items-center gap-3 py-2">
              <button
                onClick={handleMicClick}
                disabled={isReplying || voiceState === "processing" || voiceState === "error"}
                className={cn(
                  "relative w-16 h-16 rounded-full flex items-center justify-center transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                  voiceState === "listening"
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/30"
                    : voiceState === "error"
                    ? "bg-destructive/10 text-destructive"
                    : "bg-muted hover:bg-muted/80",
                )}
                aria-label={voiceState === "listening" ? "Stop listening" : "Start listening"}
                aria-busy={voiceState === "processing" || isReplying}
                data-testid="button-mic"
              >
                {voiceState === "listening" && (
                  <span className="absolute inset-0 rounded-full animate-ping bg-primary/30" />
                )}
                {voiceState === "processing" ? (
                  <Loader2 className="w-6 h-6 animate-spin" />
                ) : voiceState === "listening" ? (
                  <MicOff className="w-6 h-6" />
                ) : voiceState === "error" ? (
                  <MicOff className="w-6 h-6" />
                ) : (
                  <Mic className="w-6 h-6 text-foreground" />
                )}
              </button>
              <p className="text-xs text-muted-foreground" aria-live="polite">
                {voiceState === "listening"
                  ? "Listening — tap to stop"
                  : voiceState === "processing"
                  ? "Processing…"
                  : voiceState === "error"
                  ? "Try again"
                  : "Tap to speak"}
              </p>
            </div>
          )}

          {/* Text input */}
          {inputMode === "text" && (
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={textInput}
                onChange={(e) => setTextInput(e.target.value)}
                onKeyDown={handleTextKeyDown}
                placeholder="Type your message…"
                className="min-h-[48px] max-h-[160px] resize-none rounded-2xl"
                rows={1}
                data-testid="input-text-message"
              />
              <Button
                onClick={handleTextSend}
                disabled={!textInput.trim() || isReplying}
                size="icon"
                className="rounded-full h-12 w-12 shrink-0"
                data-testid="button-send-text"
              >
                {isReplying ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
