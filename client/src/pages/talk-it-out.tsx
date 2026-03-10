import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CrisisSupportDialog } from "@/components/crisis-support-dialog";
import { ChatFeedbackBar } from "@/components/chat-feedback-bar";
import { postProcessAssistantMessage } from "@/core/postProcessAssistantMessage";
import { shouldCaptureInsight, buildInsight, type InsightSource } from "@/core/conversationInsights";
import { useInsights } from "@/hooks/use-insights";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { isFeatureEnabled } from "@/config/featureFlags";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { saveChatFeedback } from "@/lib/guest-storage";
import { DAILY_CHECKIN_MOOD_OPTIONS, DAILY_CHECKIN_CONSTRAINT_OPTIONS } from "@/lib/daily-checkin-constants";
import { parseJumpToMessageIndex } from "@/lib/jumpToMoment";
import { PageHeader } from "@/components/page-header";
import { Send, Loader2, Heart, ClipboardCheck, X } from "lucide-react";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { MessageActions } from "@/components/message-actions";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const TALK_MESSAGES_KEY = "dw_talk_messages";

const TALK_WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: "This is a space for you. There's no agenda here, no rush, no judgment.\n\nWhat's on your mind today? Or if you're not sure, we can sit with that for a moment too.",
};

function loadStoredMessages(): ChatMessage[] | null {
  try {
    const raw = localStorage.getItem(TALK_MESSAGES_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ChatMessage[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

function persistMessages(msgs: ChatMessage[]): void {
  try {
    if (msgs.length > 1) {
      localStorage.setItem(TALK_MESSAGES_KEY, JSON.stringify(msgs));
    }
  } catch {
    // storage unavailable – fail silently
  }
}

const TALK_SYSTEM_PROMPT = `You are a deeply supportive AI companion in "Talk It Out" mode. Your role is to:

- Listen with genuine care and presence
- Help the user express and process their feelings
- Offer gentle perspective shifts when appropriate
- Help uncover the user's values, goals, and non-negotiables
- Support them in building a personal blueprint for how they want to live

Guidelines:
- Use calm, grounded language
- Never rush or pressure
- Avoid "you should" or "you must" language
- Instead use "you might consider" or "what if" or "I notice"
- Be honest and direct when helpful, but always with compassion
- Ask thoughtful questions to help them reflect
- Validate feelings before offering perspective

Start by simply being present and inviting them to share.`;

export function TalkItOutPage() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const { captureInsight, insights } = useInsights();
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    // When arriving via jump-to-moment, restore prior conversation so the
    // target message exists in the DOM for scroll/highlight.
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("jumpToMessageIndex") !== null) {
        const stored = loadStoredMessages();
        if (stored) return stored;
      }
    } catch {
      // URL parsing unavailable – fall through to default
    }
    return [TALK_WELCOME_MESSAGE];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [crisisDialogOpen, setCrisisDialogOpen] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkinBannerDismissed, setCheckinBannerDismissed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Staged insight payload: populated inside setMessages updater (where prev.length is
  // accurate), then flushed in a useEffect so the save runs after React commits the update.
  const pendingInsightRef = useRef<{ userText: string; assistantText: string; source: InsightSource } | null>(null);

  // Daily check-in state (feature-gated)
  const dailyCheckinEnabled = isFeatureEnabled("DAILY_CHECKIN");
  const { todayCheckin, isLoading: checkinLoading, submitCheckin, isSubmitting: checkinSubmitting, today } = useDailyCheckin();
  const showCheckinBanner = dailyCheckinEnabled && !checkinLoading && !todayCheckin && !checkinBannerDismissed;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Persist conversation to localStorage so jump-to-moment can restore it on navigation
  useEffect(() => {
    persistMessages(messages);
  }, [messages]);

  // Flush any staged insight payload after React has committed the messages update.
  // This guarantees capturedIndex and capturedText reflect the finalized state.
  useEffect(() => {
    if (!isFeatureEnabled("CONVERSATION_INSIGHTS")) return;
    const pending = pendingInsightRef.current;
    if (!pending) return;
    pendingInsightRef.current = null;
    try {
      if (shouldCaptureInsight({ userText: pending.userText, assistantText: pending.assistantText })) {
        captureInsight(buildInsight(pending));
      }
    } catch {
      // Insight capture is non-critical – swallow any error
    }
  }, [messages, captureInsight]);

  // Prefill input from insight card "Continue with DW" (?insightId=<id>)
  // Track whether we've already applied the prefill so it only happens once
  // per page load, even though the effect re-runs as `insights` loads.
  const insightPrefillApplied = useRef(false);
  useEffect(() => {
    if (insightPrefillApplied.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const insightId = params.get("insightId");
    if (!insightId) return;

    let insight: { title?: string; summary?: string } | null = null;

    // 1) Try sessionStorage (works on the same device without waiting for API)
    try {
      const stored = window.sessionStorage?.getItem(`dwInsight:${insightId}`);
      if (stored) {
        insight = JSON.parse(stored) as { title?: string; summary?: string };
        window.sessionStorage.removeItem(`dwInsight:${insightId}`);
      }
    } catch {
      // sessionStorage unavailable – continue to fallback
    }

    // 2) Fallback: find by id in local or backend insights
    // For auth users this list may be empty until the backend request resolves,
    // so the effect re-runs via the `insights` dep; the guard above prevents duplication.
    if (!insight) {
      try {
        const found = insights.find((i) => i.id === insightId);
        if (found) insight = found;
      } catch {
        // unavailable – skip
      }
    }

    if (insight) {
      insightPrefillApplied.current = true;
      const context = insight.summary
        ? `Continue from this insight — "${insight.title ?? ""}": ${insight.summary}`
        : `Continue from this insight: ${insight.title ?? ""}`;
      setInput(context);

      // Remove only the insightId query param, preserving any others (e.g. jumpToMessageIndex)
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("insightId");
        const newSearch = url.searchParams.toString();
        const newPath = newSearch ? `${url.pathname}?${newSearch}` : url.pathname;
        navigate(newPath, { replace: true });
      } catch {
        // URL parsing failed – fail silently without changing the URL
      }
    }
  }, [insights]); // re-run when backend insights load; guard prevents double-apply

  // One-time generic prefill from ?prefill=<encoded-text>&src=home_card (or any src).
  // Applied only once and only if the input is currently empty.
  // Removes only the `prefill` (and `src`) params from the URL after applying.
  const genericPrefillApplied = useRef(false);
  useEffect(() => {
    if (genericPrefillApplied.current) return;
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    // URLSearchParams.get() already returns a decoded string; no further
    // decoding needed (double-decoding would break inputs like "100%").
    const prefillText = params.get("prefill");
    if (!prefillText) return;

    // Apply only if input is currently empty (do not overwrite user's own typing).
    // Checking `input` synchronously avoids side effects inside the state updater
    // which can behave unexpectedly under React 18 StrictMode double-invocation.
    if (input.trim() !== "") {
      genericPrefillApplied.current = true;
      return;
    }

    genericPrefillApplied.current = true;
    setInput(prefillText);

    // Auto-focus the input so the user can start typing immediately.
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);

    // Remove only the prefill and src params, preserving any others.
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("prefill");
      url.searchParams.delete("src");
      const newSearch = url.searchParams.toString();
      const newPath = newSearch ? `${url.pathname}?${newSearch}` : url.pathname;
      navigate(newPath, { replace: true });
    } catch {
      // URL parsing failed – fail silently
    }
  }, []); // intentionally empty deps – run once on mount, guarded by ref
  // eslint-disable-next-line react-hooks/exhaustive-deps
  // NOTE: `input` is intentionally NOT in deps. We read it synchronously at
  // mount time only; adding it would cause infinite re-runs.

  // Jump-to-moment: handle ?jumpToMessageIndex on first render
  useEffect(() => {
    if (typeof window === "undefined") return;
    const targetIndex = parseJumpToMessageIndex(window.location.search);
    if (targetIndex === null) return;

    const idx = targetIndex;

    // Remove query params from URL without adding a history entry
    navigate("/talk", { replace: true });

    // Poll for the target element – messages may render asynchronously after
    // state restoration, so we retry for up to ~3s before giving up.
    const selector = `[data-testid="message-talk-${idx}"]`;
    const maxAttempts = 30;
    const intervalMs = 100;

    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let highlightTimeoutId: ReturnType<typeof setTimeout> | undefined;

    const tryScroll = () => {
      attempts += 1;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedIndex(idx);
        highlightTimeoutId = setTimeout(() => setHighlightedIndex(null), 2000);
        return;
      }
      if (attempts >= maxAttempts && intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

    intervalId = setInterval(tryScroll, intervalMs);

    return () => {
      if (intervalId !== null) clearInterval(intervalId);
      if (highlightTimeoutId !== undefined) clearTimeout(highlightTimeoutId);
    };
  }, [navigate]); // navigate is stable (wouter hook ref), included for correctness

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/smart", {
        message,
        context: "talk-it-out",
        conversationHistory: messages.slice(-10),
        systemOverride: TALK_SYSTEM_PROMPT,
      });
      return response.json();
    },
    onSuccess: (data, variables) => {
      // Stage the insight payload inside the setMessages updater so we capture
      // prev.length (the accurate future index) and the post-processed text.
      // The actual save is deferred to a useEffect that fires after React commits
      // the state update, guaranteeing the captured values are correct even in
      // React 18 Concurrent Mode where the updater may run asynchronously.
      setMessages((prev) => {
        const processedWithHistory = postProcessAssistantMessage({
          assistantText: data.response,
          userMessage: variables,
          conversationHistory: prev,
        });
        if (data.response) {
          pendingInsightRef.current = {
            userText: variables,
            assistantText: processedWithHistory.text,
            source: {
              surface: "talk",
              messageTimestamp: Date.now(),
              messageIndex: prev.length, // the new message will occupy this index
            },
          };
        }
        return [...prev, { role: "assistant", content: processedWithHistory.text }];
      });
      setIsTyping(false);
    },
    onError: () => {
      toast({
        title: "Connection issue",
        description: "Couldn't get a response. Please try again.",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    
    const crisisAnalysis = analyzeCrisisRisk(userMessage);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(userMessage);
      setCrisisDialogOpen(true);
      return;
    }
    
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleCrisisResume = (responseMessage?: string, sendToAI?: boolean) => {
    const messageToSend = pendingCrisisMessage;
    setInput("");
    setPendingCrisisMessage("");
    
    if (sendToAI && messageToSend) {
      setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
      setIsTyping(true);
      chatMutation.mutate(messageToSend);
    } else if (responseMessage) {
      if (messageToSend) {
        setMessages((prev) => [...prev, { role: "user", content: messageToSend }]);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: responseMessage }]);
    }
  };

  const handleFeedback = (messageId: string, type: "positive" | "negative", comment?: string) => {
    saveChatFeedback(messageId, type, "talk-it-out", comment);
  };

  const handleSendMessage = (message: string) => {
    if (!message.trim() || isTyping) return;
    
    const crisisAnalysis = analyzeCrisisRisk(message);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(message);
      setCrisisDialogOpen(true);
      return;
    }
    
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setIsTyping(true);
    chatMutation.mutate(message);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader 
        title="Talk It Out" 
        backPath="/"
        rightContent={
          <div className="p-2 rounded-full bg-pink-500/10">
            <Heart className="h-4 w-4 text-pink-500" />
          </div>
        }
      />

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
          {messages.map((message, index) => (
            <article
              key={index}
              className={`animate-fade-in-up rounded-lg transition-colors duration-700 ${
                message.role === "user" 
                  ? "border-l-4 border-primary/40 pl-4 py-2" 
                  : ""
              } ${highlightedIndex === index ? "ring-2 ring-primary/40 bg-primary/5 px-2" : ""}`}
              data-testid={`message-talk-${index}`}
            >
              {message.role === "user" ? (
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">You</p>
                  <p className="font-body text-base leading-relaxed text-foreground/90 whitespace-pre-line break-words">{message.content}</p>
                  <MessageActions
                    messageIndex={index}
                    messageContent={message.content}
                    isUserMessage={true}
                    isLoggedIn={isLoggedIn}
                  />
                </div>
              ) : (
                <div className="space-y-3">
                  {index === 0 && (
                    <div className="flex items-center gap-2 mb-4">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Heart className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm font-medium text-foreground">DW</p>
                    </div>
                  )}
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <p className="font-body text-base leading-relaxed text-foreground whitespace-pre-line">{message.content}</p>
                  </div>
                  <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                    <MessageActions
                      messageIndex={index}
                      messageContent={message.content}
                      isUserMessage={false}
                      isLoggedIn={isLoggedIn}
                    />
                    {/* Feedback only available after the first welcome message */}
                    {index > 0 && (
                      <ChatFeedbackBar 
                        messageId={`talk-${index}`} 
                        onFeedback={handleFeedback} 
                      />
                    )}
                  </div>
                </div>
              )}
            </article>
          ))}
          {isTyping && (
            <article className="animate-fade-in-up">
              <div className="flex items-center gap-3 py-3">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                <span className="text-sm font-body text-muted-foreground">Listening...</span>
              </div>
            </article>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t bg-background/95 backdrop-blur-sm">
        <div className="max-w-2xl mx-auto p-4">
          {/* Daily check-in banner (shown only when check-in is missing) */}
          {showCheckinBanner && (
            <div className="flex items-center justify-between gap-2 mb-3 px-3 py-2 rounded-xl bg-green-500/8 border border-green-500/20 text-sm">
              <div className="flex items-center gap-2">
                <ClipboardCheck className="h-4 w-4 text-green-600 shrink-0" />
                <span className="text-foreground/80">Quick check-in for today?</span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs border-green-500/30 text-green-700 hover:bg-green-500/10"
                  onClick={() => setCheckinModalOpen(true)}
                >
                  Start
                </Button>
                <button
                  type="button"
                  onClick={() => setCheckinBannerDismissed(true)}
                  aria-label="Dismiss check-in prompt"
                  className="p-1 rounded hover:bg-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              className="min-h-[48px] max-h-[200px] resize-none rounded-2xl bg-card border font-body"
              rows={1}
              data-testid="input-talk-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="rounded-full h-12 w-12 shrink-0"
              data-testid="button-send-talk"
            >
              {isTyping ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
            </Button>
            <VoiceModeButton
              onTranscript={(text) => {
                setInput(text);
                setTimeout(() => handleSend(), 100);
              }}
              onError={(error) => {
                toast({
                  title: "Voice input",
                  description: error,
                  variant: "destructive",
                });
              }}
              disabled={isTyping}
              size="icon"
              className="rounded-full h-12 w-12 shrink-0"
            />
          </div>
        </div>
      </div>

      <CrisisSupportDialog
        open={crisisDialogOpen}
        onClose={() => {
          setCrisisDialogOpen(false);
          setPendingCrisisMessage("");
        }}
        onResume={handleCrisisResume}
        userMessage={pendingCrisisMessage}
      />

      {/* Daily check-in modal */}
      {dailyCheckinEnabled && (
        <CheckinModal
          open={checkinModalOpen}
          onClose={() => setCheckinModalOpen(false)}
          onSubmit={async (moodScore, constraintType, constraintNote) => {
            await submitCheckin({ date: today, moodScore, constraintType, constraintNote });
            setCheckinModalOpen(false);
          }}
          isSubmitting={checkinSubmitting}
        />
      )}
    </div>
  );
}

// ── CheckinModal ──────────────────────────────────────────────────────────────

interface CheckinModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (moodScore: number, constraintType: string, constraintNote?: string) => Promise<void>;
  isSubmitting: boolean;
}

function CheckinModal({ open, onClose, onSubmit, isSubmitting }: CheckinModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [constraintType, setConstraintType] = useState("");
  const [constraintNote, setConstraintNote] = useState("");

  function reset() {
    setStep(1);
    setMoodScore(null);
    setConstraintType("");
    setConstraintNote("");
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function handleSubmit() {
    if (!moodScore || !constraintType) return;
    await onSubmit(moodScore, constraintType, constraintNote || undefined);
    reset();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ClipboardCheck className="h-4 w-4 text-green-500" />
            Daily Check-in
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {step === 1 ? (
            <>
              <p className="text-sm text-muted-foreground">How's your energy today? (1 = very low, 5 = great)</p>
              <div className="flex gap-2 justify-center">
                {DAILY_CHECKIN_MOOD_OPTIONS.map(({ score, label }) => (
                  <button
                    key={score}
                    type="button"
                    onClick={() => { setMoodScore(score); setStep(2); }}
                    className={`w-10 h-10 rounded-full text-sm font-medium border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      moodScore === score ? "border-primary bg-primary/10 text-primary" : "border-border hover:border-primary/50 hover:bg-primary/5"
                    }`}
                    aria-label={label}
                  >
                    {score}
                  </button>
                ))}
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Energy:</span>
                <span className="text-sm font-semibold">{moodScore}/5</span>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-xs text-primary hover:underline focus:outline-none"
                >
                  change
                </button>
              </div>
              <p className="text-sm text-muted-foreground">Biggest constraint today?</p>
              <div className="flex flex-wrap gap-1.5">
                {DAILY_CHECKIN_CONSTRAINT_OPTIONS.map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setConstraintType(opt)}
                    className={`px-2.5 py-1 text-xs rounded-lg border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                      constraintType === opt
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border/60 hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
              {constraintType === "Other" && (
                <input
                  type="text"
                  value={constraintNote}
                  onChange={(e) => setConstraintNote(e.target.value)}
                  placeholder="Briefly describe…"
                  maxLength={200}
                  className="w-full text-sm rounded-lg border border-border/60 bg-background px-3 py-2 outline-none focus:ring-2 focus:ring-primary/50"
                />
              )}
              <div className="flex gap-2 pt-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClose}
                  disabled={isSubmitting}
                >
                  Skip
                </Button>
                <Button
                  size="sm"
                  disabled={!constraintType || isSubmitting}
                  onClick={handleSubmit}
                  className="flex-1"
                >
                  {isSubmitting ? "Saving…" : "Save check-in"}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
