import { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CrisisSupportDialog } from "@/components/crisis-support-dialog";
import { ChatFeedbackBar } from "@/components/chat-feedback-bar";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { postProcessAssistantMessage } from "@/core/postProcessAssistantMessage";
import { shouldCaptureInsight, buildInsight, type InsightSource, type Insight } from "@/core/conversationInsights";
import { useInsights } from "@/hooks/use-insights";
import { useDailyCheckin } from "@/hooks/use-daily-checkin";
import { isFeatureEnabled } from "@/config/featureFlags";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { saveChatFeedback } from "@/lib/guest-storage";
import { DAILY_CHECKIN_MOOD_OPTIONS, DAILY_CHECKIN_CONSTRAINT_OPTIONS } from "@/lib/daily-checkin-constants";
import { parseJumpToMessageIndex } from "@/lib/jumpToMoment";
import { getDailyPrompt } from "@/lib/prompt-kit";
import { getSwitchStatuses } from "@/lib/switch-storage";
import { getCurrentEnergyContext } from "@/lib/energy-context";
import { PageHeader } from "@/components/page-header";
import { Send, Loader2, Sparkles, ClipboardCheck, X, RefreshCw, History, Plus, MessageSquare, Tag } from "lucide-react";
import { DWOrb } from "@/components/dw-orb";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { MessageActions } from "@/components/message-actions";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const TALK_MESSAGES_KEY = "dw_talk_messages";
const TALK_HISTORY_KEY = "dw_talk_history";
const MAX_HISTORY = 30;

interface SavedSession {
  id: string;
  savedAt: number;
  preview: string;
  messageCount: number;
  messages: ChatMessage[];
}

function generateSessionId(): string {
  return `talk_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function formatSessionDate(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const day = 86400000;
  if (diff < day) return "Today";
  if (diff < 2 * day) return "Yesterday";
  if (diff < 7 * day) return "This week";
  return new Date(ts).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function formatSessionTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function loadHistory(): SavedSession[] {
  try {
    const raw = localStorage.getItem(TALK_HISTORY_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as SavedSession[];
  } catch {
    return [];
  }
}

function saveSessionToHistory(session: SavedSession): void {
  try {
    const history = loadHistory().filter((s) => s.id !== session.id);
    history.unshift(session);
    localStorage.setItem(TALK_HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  } catch {
    // storage unavailable
  }
}

function buildSessionPreview(msgs: ChatMessage[]): string {
  const firstUser = msgs.find((m) => m.role === "user");
  if (!firstUser) return "New conversation";
  return firstUser.content.length > 80 ? firstUser.content.slice(0, 80) + "…" : firstUser.content;
}

const TALK_GREETING = "This is a space for you. There's no agenda here, no rush, no judgment.";

const TALK_WELCOME_MESSAGE: ChatMessage = {
  role: "assistant",
  content: `${TALK_GREETING}\n\nWhat's on your mind today? Or if you're not sure, we can sit with that for a moment too.`,
};

/**
 * Builds a context-aware welcome message using the DW Prompt Kit.
 * Falls back to the generic welcome message if context cannot be read.
 */
function getContextualWelcomeMessage(): ChatMessage {
  try {
    const statuses = getSwitchStatuses();
    const { energy } = getCurrentEnergyContext();
    const prompt = getDailyPrompt(statuses, energy);
    return {
      role: "assistant",
      content: `${TALK_GREETING}\n\n${prompt.text}`,
    };
  } catch {
    return TALK_WELCOME_MESSAGE;
  }
}

const INTENT_WELCOME_MESSAGES: Record<string, string> = {
  stress: "I'm here. Let's slow down and look at what's weighing on you.\n\nWhat's going on?",
  plan: "Good. Let's get clear on what needs to happen and build from there.\n\nWhat needs sorting first?",
  move: "Ready when you are. Let's find movement that fits where you're at today.\n\nWhat does your body feel like right now?",
  eat: "Let's work on this. Eating well doesn't have to be complicated.\n\nTell me where you're starting from.",
  talk: "This is a space for you. No agenda, no rush.\n\nWhat's on your mind?",
};

function getIntentWelcomeMessage(): ChatMessage | null {
  try {
    const intent = localStorage.getItem("dw_first_intent");
    if (!intent) return null;
    localStorage.removeItem("dw_first_intent");
    const content = INTENT_WELCOME_MESSAGES[intent];
    if (!content) return null;
    return { role: "assistant", content };
  } catch {
    return null;
  }
}

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
  const [historyOpen, setHistoryOpen] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(false);
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory());
  const sessionIdRef = useRef<string>(generateSessionId());
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("jumpToMessageIndex") !== null) {
        const stored = loadStoredMessages();
        if (stored) return stored;
      }
    } catch {
      // URL parsing unavailable – fall through to default
    }
    const intentMsg = getIntentWelcomeMessage();
    if (intentMsg) return [intentMsg];
    return [getContextualWelcomeMessage()];
  });
  const [isTyping, setIsTyping] = useState(false);
  const [failedMessage, setFailedMessage] = useState<string | null>(null);
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

  // Auto-save session to history whenever conversation grows past 3 messages
  useEffect(() => {
    if (messages.length < 3) return;
    const session: SavedSession = {
      id: sessionIdRef.current,
      savedAt: Date.now(),
      preview: buildSessionPreview(messages),
      messageCount: messages.length,
      messages,
    };
    saveSessionToHistory(session);
    setHistory(loadHistory());
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    setMessages([getContextualWelcomeMessage()]);
    setInput("");
    sessionIdRef.current = generateSessionId();
    setHistoryOpen(false);
  }, []);

  const handleRestoreSession = useCallback((session: SavedSession) => {
    setMessages(session.messages);
    sessionIdRef.current = session.id;
    setHistoryOpen(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Derive current-conversation insights from the global insights list
  const sessionInsights = insights.filter(
    (ins) => ins.source?.surface === "talk"
  );

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
      setFailedMessage(null);
      setIsTyping(false);
    },
    onError: (error, variables) => {
      setFailedMessage(variables);
      toast({
        title: "Connection issue",
        description: parseApiError(error),
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

  const groupedHistory = history.reduce<Record<string, SavedSession[]>>((acc, session) => {
    const label = formatSessionDate(session.savedAt);
    if (!acc[label]) acc[label] = [];
    acc[label].push(session);
    return acc;
  }, {});

  const DIMENSION_COLORS: Record<string, string> = {
    emotional: "bg-rose-500/15 text-rose-600 dark:text-rose-400",
    planning: "bg-blue-500/15 text-blue-600 dark:text-blue-400",
    physical: "bg-green-500/15 text-green-600 dark:text-green-400",
    financial: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400",
    social: "bg-purple-500/15 text-purple-600 dark:text-purple-400",
    spiritual: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400",
    nutrition: "bg-orange-500/15 text-orange-600 dark:text-orange-400",
    mindset: "bg-teal-500/15 text-teal-600 dark:text-teal-400",
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title={
          <span className="font-display text-xl font-medium tracking-tight">
            <span className="text-primary font-bold">D</span>imensional{" "}
            <span className="text-primary font-bold">W</span>ellness
          </span>
        }
        backPath="/"
        rightContent={
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setInsightsOpen(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="View conversation insights"
              data-testid="button-insights"
            >
              <Sparkles className="h-4 w-4 text-violet-500" />
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors"
              aria-label="View conversation history"
              data-testid="button-history"
            >
              <History className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        }
      />

      {/* ── Chat History Drawer ── */}
      <SwipeableDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Conversations"
        width="w-72"
      >
        <Button
          variant="outline"
          size="sm"
          className="mb-4 w-full"
          onClick={handleNewConversation}
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4 mr-2" />
          New conversation
        </Button>
        <ScrollArea className="flex-1">
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No saved conversations yet</p>
              <p className="text-xs mt-1 opacity-70">They appear here after a few exchanges</p>
            </div>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedHistory).map(([label, sessions]) => (
                <div key={label}>
                  <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">{label}</p>
                  <div className="space-y-1">
                    {sessions.map((session) => (
                      <button
                        key={session.id}
                        onClick={() => handleRestoreSession(session)}
                        className={`w-full text-left p-2.5 rounded-lg hover:bg-muted transition-colors ${
                          session.id === sessionIdRef.current ? "bg-muted" : ""
                        }`}
                        data-testid={`session-${session.id}`}
                      >
                        <p className="text-sm text-foreground truncate">{session.preview}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {formatSessionTime(session.savedAt)} · {session.messageCount} messages
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SwipeableDrawer>

      {/* ── Insights Drawer ── */}
      <SwipeableDrawer
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        title="Conversation Insights"
        width="w-80"
      >
        <ScrollArea className="flex-1">
          {sessionInsights.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No insights captured yet</p>
              <p className="text-xs mt-1 opacity-70">Keep talking — DW will surface patterns and themes</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessionInsights.map((insight) => (
                <div key={insight.id} className="p-3 rounded-xl border border-border bg-card space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-foreground leading-snug">{insight.title}</p>
                    <span
                      className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                        DIMENSION_COLORS[insight.category] ?? "bg-muted text-muted-foreground"
                      }`}
                    >
                      {insight.category}
                    </span>
                  </div>
                  {insight.summary && (
                    <p className="text-xs text-muted-foreground leading-relaxed">{insight.summary}</p>
                  )}
                  <p className="text-xs text-muted-foreground/60">
                    {formatSessionTime(insight.createdAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SwipeableDrawer>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
          <div className="flex flex-col items-center gap-2 pb-2" data-testid="chat-orb-header">
            <DWOrb size={56} state="chat" />
            <p className="text-xs text-muted-foreground">You're talking with DW</p>
          </div>
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
                  <div className="flex items-center gap-2 mb-3">
                    <DWOrb size={28} state="chat" />
                    <p className="text-sm font-medium text-foreground">DW</p>
                  </div>
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
          {!isTyping && failedMessage && (
            <article className="animate-fade-in-up">
              <button
                type="button"
                onClick={() => {
                  setIsTyping(true);
                  setFailedMessage(null);
                  chatMutation.mutate(failedMessage);
                }}
                className="flex items-center gap-2 text-sm text-destructive hover:text-destructive/80 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded py-1"
                aria-label="Retry sending message"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Tap to retry</span>
              </button>
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
