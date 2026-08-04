import { useState, useRef, useEffect, useCallback } from "react";
import { usePageMeta } from "@/hooks/use-page-meta";
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
import { saveChatFeedback, type PersonSuggestion } from "@/lib/guest-storage";
import { PersonSuggestionCard } from "@/components/person-suggestion-card";
import { DAILY_CHECKIN_MOOD_OPTIONS, DAILY_CHECKIN_CONSTRAINT_OPTIONS } from "@/lib/daily-checkin-constants";
import { parseJumpToMessageIndex } from "@/lib/jumpToMoment";
import { getDailyPrompt } from "@/lib/prompt-kit";
import { getSwitchStatuses } from "@/lib/switch-storage";
import { getCurrentEnergyContext } from "@/lib/energy-context";
import { PageHeader } from "@/components/page-header";
import { Send, Loader2, Sparkles, ClipboardCheck, X, History, Plus, MessageSquare, BookmarkPlus, Check, RefreshCw, Mic, MicOff, Volume2, VolumeX, Headphones } from "lucide-react";
import { DWOrb } from "@/components/dw-orb";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { DWVoiceConversation } from "@/components/dw-voice-conversation";
import { DW_MODES, type DWMode } from "@shared/dw-persona";
import { MessageActions } from "@/components/message-actions";
import { TriggerProtocolSheet } from "@/components/triggers/trigger-protocol-sheet";
import { Heart } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest, parseApiError } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Input } from "@/components/ui/input";

interface ChatMessage {
  role: "assistant" | "user" | "insight";
  content: string;
  insightCategory?: string;
  insightTitle?: string;
  isError?: boolean;
  suggestion?: ChatSuggestion;
  personSuggestion?: PersonSuggestion | null;
  triggeredByUserMessage?: string;
}

type ChatSuggestion =
  | { kind: "trigger_protocol"; reason?: string }
  | { kind: "spiritual_prompt"; reason?: string; mode?: "meditate" | "pray" };

const TALK_MESSAGES_KEY = "dw_talk_messages";
const TALK_HISTORY_KEY = "dw_talk_history";
const TALK_SYSTEM_OVERRIDE_KEY = "dw_talk_system_override";
const MAX_HISTORY = 30;

interface SavedSession {
  id: string;
  savedAt: number;
  preview: string;
  topicTitle?: string;
  categories: string[];
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
  usePageMeta("Talk It Out", "Process emotions and find clarity through a guided conversation with DW.");
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const isLoggedIn = !!user;
  const queryClient = useQueryClient();
  const { captureInsight, insights } = useInsights();
  const [input, setInput] = useState("");
  const [chatMode, setChatMode] = useState<DWMode>("companion");
  const [chatModeReason, setChatModeReason] = useState<string>("");
  const [chatModeReasonOpen, setChatModeReasonOpen] = useState<boolean>(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [history, setHistory] = useState<SavedSession[]>(() => loadHistory());
  const sessionIdRef = useRef<string>(generateSessionId());
  // Save as Learning Thread (Spec 13 PR C)
  const [saveThreadOpen, setSaveThreadOpen] = useState(false);
  const [threadTitleDraft, setThreadTitleDraft] = useState("");
  const [systemOverrideOverride, setSystemOverrideOverride] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("jumpToMessageIndex") !== null) {
        return localStorage.getItem(TALK_SYSTEM_OVERRIDE_KEY);
      }
    } catch {
      // ignore
    }
    return null;
  });
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
  const [lastFailedMessage, setLastFailedMessage] = useState<string | null>(null);
  const [voiceModeActive, setVoiceModeActive] = useState(() => {
    try { return localStorage.getItem("dw:auto_speak") !== "off"; } catch { return true; }
  });
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [autoListenTrigger, setAutoListenTrigger] = useState(0);
  const [voiceConvOpen, setVoiceConvOpen] = useState(false);
  const voiceConvOpenRef = useRef(false);
  voiceConvOpenRef.current = voiceConvOpen;
  const ttsRef = useRef<SpeechSynthesisUtterance | null>(null);
  const voiceModeActiveRef = useRef(voiceModeActive);
  voiceModeActiveRef.current = voiceModeActive;

  useEffect(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.getVoices();
    }
  }, []);

  // Auto-speak DW's opening message when the chat page first loads
  const hasSpokenGreetingRef = useRef(false);
  useEffect(() => {
    if (hasSpokenGreetingRef.current) return;
    if (!voiceModeActive) return;
    if (messages.length === 1 && messages[0].role === "assistant") {
      hasSpokenGreetingRef.current = true;
      setTimeout(() => speakDWResponse(messages[0].content), 800);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const speakDWResponse = useCallback((text: string) => {
    if (typeof window === "undefined" || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const stripped = text
      .replace(/[#*`_~[\]()>]/g, "")
      .replace(/\n+/g, " ")
      .trim()
      .slice(0, 800);
    const utter = new SpeechSynthesisUtterance(stripped);
    utter.rate = 0.95;
    utter.pitch = 1;
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v =>
      /Samantha|Karen|Moira|Google US English|Microsoft Aria|Zira/i.test(v.name)
    ) || voices.find(v => v.lang.startsWith("en") && !v.localService) || voices[0];
    if (preferred) utter.voice = preferred;
    ttsRef.current = utter;
    utter.onstart = () => setIsSpeaking(true);
    utter.onend = () => {
      setIsSpeaking(false);
      if (voiceModeActiveRef.current) {
        setTimeout(() => setAutoListenTrigger((n) => n + 1), 300);
      }
    };
    utter.onerror = () => setIsSpeaking(false);
    window.speechSynthesis.speak(utter);
  }, []);

  const stopSpeaking = useCallback(() => {
    if (typeof window !== "undefined" && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
  }, []);
  const [crisisDialogOpen, setCrisisDialogOpen] = useState(false);
  const [lifeSystemDialogOpen, setLifeSystemDialogOpen] = useState(false);
  const [pendingLifeSystemText, setPendingLifeSystemText] = useState("");
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const [checkinModalOpen, setCheckinModalOpen] = useState(false);
  const [checkinBannerDismissed, setCheckinBannerDismissed] = useState(false);
  const [savedPlanIds, setSavedPlanIds] = useState<Set<number>>(new Set());
  const [plansOpen, setPlansOpen] = useState(false);
  const [triggerSheetOpen, setTriggerSheetOpen] = useState(false);
  const [triggerSheetSeed, setTriggerSheetSeed] = useState<{ feeling: string; assumption: string }>({ feeling: "", assumption: "" });
  const [viewingPlan, setViewingPlan] = useState<{ id: string; content: string; savedAt: number } | null>(null);
  const [savedPlansList, setSavedPlansList] = useState<Array<{ id: string; preview: string; content: string; savedAt: number }>>(() => {
    try { return JSON.parse(localStorage.getItem("dw_saved_plans") || "[]"); } catch { return []; }
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleSavePlan = (index: number, content: string) => {
    try {
      const existing = JSON.parse(localStorage.getItem("dw_saved_plans") || "[]");
      const plan = {
        id: `plan-${Date.now()}`,
        savedAt: Date.now(),
        preview: content.slice(0, 120).replace(/[#*\n]/g, " ").trim(),
        content,
      };
      const updated = [plan, ...existing].slice(0, 50);
      localStorage.setItem("dw_saved_plans", JSON.stringify(updated));
      setSavedPlanIds((prev) => new Set([...Array.from(prev), index]));
      setSavedPlansList(updated);
      toast({ title: "Plan saved", description: "Tap My Plans to view it anytime." });
    } catch {
      toast({ title: "Couldn't save", description: "Please try again.", variant: "destructive" });
    }
  };

  const handleDeletePlan = (id: string) => {
    const updated = savedPlansList.filter((p) => p.id !== id);
    setSavedPlansList(updated);
    localStorage.setItem("dw_saved_plans", JSON.stringify(updated));
    if (viewingPlan?.id === id) setViewingPlan(null);
  };
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
        const insight = buildInsight(pending);
        captureInsight(insight);
        // Also inject an inline insight card into the message stream
        setMessages((prev) => [
          ...prev,
          {
            role: "insight" as const,
            content: insight.summary,
            insightCategory: insight.category,
            insightTitle: insight.title,
          },
        ]);
      }
    } catch {
      // Insight capture is non-critical – swallow any error
    }
  }, [messages, captureInsight]);

  // AI title generation: after 4+ messages, ask the AI to name the conversation topic
  const titleGenAttempted = useRef(false);
  const titleMutation = useMutation({
    mutationFn: async (msgs: ChatMessage[]) => {
      const history = msgs.filter((m) => m.role !== "insight").slice(0, 8);
      const res = await apiRequest("POST", "/api/chat/smart", {
        message:
          "In 4 words or fewer, what is the core topic of this conversation? Reply ONLY with the title, no punctuation.",
        context: "title-gen",
        conversationHistory: history,
        systemOverride:
          "You are a conversation labeler. Return ONLY a 4-word-or-fewer topic title. No punctuation, no explanation.",
      });
      return res.json();
    },
    onSuccess: (data) => {
      const title = (data?.response as string | undefined)?.trim();
      if (!title) return;
      // Update the saved session with the AI-generated title
      const history = loadHistory();
      const idx = history.findIndex((s) => s.id === sessionIdRef.current);
      if (idx !== -1) {
        history[idx].topicTitle = title;
        try {
          localStorage.setItem(TALK_HISTORY_KEY, JSON.stringify(history));
        } catch {
          // storage unavailable
        }
        setHistory([...history]);
      }
    },
  });

  // Save as Learning Thread mutation (Spec 13 PR C)
  const saveThreadMutation = useMutation({
    mutationFn: async (title: string) => {
      const realMessages = messages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));
      const res = await apiRequest("POST", "/api/learning-threads", {
        title: title.trim(),
        messages: realMessages,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-threads"] });
      toast({
        title: "Saved as Learning Thread",
        description: "Find it in Guidance → Conversations.",
      });
      setSaveThreadOpen(false);
      setThreadTitleDraft("");
    },
    onError: () => {
      toast({
        title: "Couldn't save thread",
        description: "Try again in a moment.",
        variant: "destructive",
      });
    },
  });

  const handleSaveAsThread = () => {
    // Pre-fill the title with the session topic if AI generated one
    const sessionInHistory = loadHistory().find((s) => s.id === sessionIdRef.current);
    const suggested = sessionInHistory?.topicTitle ?? "";
    setThreadTitleDraft(suggested);
    setSaveThreadOpen(true);
  };

  // Auto-save session to history whenever conversation grows past 3 messages
  useEffect(() => {
    if (messages.length < 3) return;
    // Collect categories from insight messages in this session
    const cats = Array.from(
      new Set(messages.filter((m) => m.role === "insight" && m.insightCategory).map((m) => m.insightCategory!))
    );
    const session: SavedSession = {
      id: sessionIdRef.current,
      savedAt: Date.now(),
      preview: buildSessionPreview(messages),
      categories: cats,
      messageCount: messages.filter((m) => m.role !== "insight").length,
      messages,
    };
    saveSessionToHistory(session);
    setHistory(loadHistory());
    // Attempt AI title generation once per session after 4 real messages
    const realCount = messages.filter((m) => m.role !== "insight").length;
    if (!titleGenAttempted.current && realCount >= 4) {
      titleGenAttempted.current = true;
      titleMutation.mutate(messages);
    }
  }, [messages]);

  const handleNewConversation = useCallback(() => {
    setMessages([getContextualWelcomeMessage()]);
    setInput("");
    sessionIdRef.current = generateSessionId();
    titleGenAttempted.current = false;
    setHistoryOpen(false);
    setSystemOverrideOverride(null);
    try {
      localStorage.removeItem(TALK_SYSTEM_OVERRIDE_KEY);
    } catch {
      // ignore
    }
  }, []);

  const handleRestoreSession = useCallback((session: SavedSession) => {
    setMessages(session.messages);
    sessionIdRef.current = session.id;
    titleGenAttempted.current = true; // don't re-generate title for restored sessions
    setHistoryOpen(false);
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  }, []);

  // Derive current-conversation insights from insight messages
  const sessionInsights = messages.filter((m) => m.role === "insight");

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
        systemOverride: systemOverrideOverride || TALK_SYSTEM_PROMPT,
        // Hysteresis: tell the picker which lane we're already in so it
        // requires a clearly stronger signal to switch lanes mid-thread.
        previousMode: chatMode,
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
        const suggestion: ChatSuggestion | undefined =
          data?.suggestion && typeof data.suggestion === "object" && data.suggestion.kind
            ? data.suggestion
            : undefined;
        const personSuggestion: PersonSuggestion | undefined =
          data?.personSuggestion && typeof data.personSuggestion === "object" && data.personSuggestion.personId
            ? data.personSuggestion
            : undefined;
        return [
          ...prev,
          {
            role: "assistant",
            content: processedWithHistory.text,
            ...(suggestion ? { suggestion, triggeredByUserMessage: variables } : {}),
            ...(personSuggestion ? { personSuggestion } : {}),
          },
        ];
      });
      // Update the active DW lane from the picker (unless the user locked one).
      if (data?.dwMode) {
        const next = data.dwMode.id as DWMode;
        if (DW_MODES.some((m) => m.id === next)) {
          setChatMode(next);
          setChatModeReason(typeof data.dwMode.reason === "string" ? data.dwMode.reason : "");
        }
      }
      // Handle DW navigation — take user to the relevant feature
      if (data.navigation?.path) {
        setTimeout(() => navigate(data.navigation.path), 1200);
      }
      setIsTyping(false);
      if (voiceModeActiveRef.current && data.response && !voiceConvOpenRef.current) {
        speakDWResponse(data.response);
      }
    },
    onError: (error: any, variables) => {
      setLastFailedMessage(variables as string);
      const errDetail = parseApiError(error);
      const isAuthErr = errDetail.includes("401") || errDetail.toLowerCase().includes("unauthorized") || errDetail.toLowerCase().includes("no body");
      const isServerErr = errDetail.includes("500") || errDetail.includes("503") || errDetail.toLowerCase().includes("unavailable");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: isAuthErr
            ? "I'm having trouble connecting right now. This is usually a temporary issue — please try again in a moment."
            : isServerErr
            ? "I'm here — just had a brief moment of interrupted thinking. Send that again and I'll pick right up."
            : "I had a small hiccup on my end. Give it another try — I'm not going anywhere.",
          isError: true,
        },
      ]);
      setIsTyping(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();

    // Detect life system pastes — look for 3+ of the life-system keywords and minimum length
    const lsKeywords = ["workout", "breakfast", "lunch", "dinner", "core rules", "meal prep", "grocery", "morning routine", "life system", "wake up", "pushups", "sets", "reps", "weekly schedule", "snack", "wind down", "app work", "clean reset"];
    if (userMessage.length > 300) {
      const lower = userMessage.toLowerCase();
      const hits = lsKeywords.filter((kw) => lower.includes(kw)).length;
      if (hits >= 3) {
        setPendingLifeSystemText(userMessage);
        setLifeSystemDialogOpen(true);
        return;
      }
    }

    const crisisAnalysis = analyzeCrisisRisk(userMessage);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(userMessage);
      setCrisisDialogOpen(true);
      return;
    }
    
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setLastFailedMessage(null);
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleVoiceSend = useCallback((text: string) => {
    if (!text.trim() || isTyping) return;
    const crisisAnalysis = analyzeCrisisRisk(text);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(text);
      setCrisisDialogOpen(true);
      return;
    }
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLastFailedMessage(null);
    setIsTyping(true);
    chatMutation.mutate(text);
  }, [isTyping, chatMutation]);

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

  // All unique categories across all sessions (for toggles)
  const allCategories = Array.from(
    new Set(history.flatMap((s) => s.categories ?? []))
  ).sort();

  // Sessions filtered by selected category
  const filteredHistory = selectedCategory
    ? history.filter((s) => (s.categories ?? []).includes(selectedCategory))
    : history;

  const groupedHistory = filteredHistory.reduce<Record<string, SavedSession[]>>((acc, session) => {
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
    <div className="flex flex-col h-full dw-premium-bg">
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
              onClick={() => setPlansOpen(true)}
              className="p-2 rounded-full hover:bg-muted transition-colors relative"
              aria-label="View saved plans"
              data-testid="button-my-plans"
            >
              <BookmarkPlus className="h-4 w-4 text-muted-foreground" />
              {savedPlansList.length > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
              )}
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

      {/* ── Chat History Drawer (left side) ── */}
      <SwipeableDrawer
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        title="Conversations"
        width="w-72"
      >
        <Button
          variant="outline"
          size="sm"
          className="mb-3 w-full"
          onClick={handleNewConversation}
          data-testid="button-new-conversation"
        >
          <Plus className="h-4 w-4 mr-2" />
          New conversation
        </Button>

        {/* Category filter toggles */}
        {allCategories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setSelectedCategory(null)}
              className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium ${
                selectedCategory === null
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-transparent text-muted-foreground border-border hover:border-primary/50"
              }`}
              data-testid="filter-all"
            >
              All
            </button>
            {allCategories.map((cat) => {
              const isActive = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(isActive ? null : cat)}
                  className={`text-xs px-2.5 py-1 rounded-full border transition-colors font-medium capitalize ${
                    isActive
                      ? (DIMENSION_COLORS[cat] ?? "bg-muted text-foreground") + " border-transparent"
                      : "bg-transparent text-muted-foreground border-border hover:border-primary/40"
                  }`}
                  data-testid={`filter-${cat}`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        )}

        <ScrollArea className="flex-1">
          {Object.keys(groupedHistory).length === 0 ? (
            <div className="text-center py-10 text-muted-foreground">
              <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-40" />
              {selectedCategory ? (
                <>
                  <p className="text-sm">No <span className="capitalize">{selectedCategory}</span> conversations</p>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    className="text-xs text-primary mt-1 hover:underline"
                  >
                    Clear filter
                  </button>
                </>
              ) : (
                <>
                  <p className="text-sm">No saved conversations yet</p>
                  <p className="text-xs mt-1 opacity-70">They appear here after a few exchanges</p>
                </>
              )}
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
                        <p className="text-sm font-medium text-foreground truncate">
                          {session.topicTitle ?? session.preview}
                        </p>
                        {session.topicTitle && (
                          <p className="text-xs text-muted-foreground truncate mt-0.5">{session.preview}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-xs text-muted-foreground/70">
                            {formatSessionTime(session.savedAt)} · {session.messageCount} msg
                          </span>
                          {session.categories.slice(0, 2).map((cat) => (
                            <span
                              key={cat}
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                DIMENSION_COLORS[cat] ?? "bg-muted text-muted-foreground"
                              }`}
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </SwipeableDrawer>

      {/* ── My Plans Drawer ── */}
      <SwipeableDrawer
        open={plansOpen}
        onClose={() => setPlansOpen(false)}
        title="My Plans"
        width="w-80"
      >
        {savedPlansList.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            <BookmarkPlus className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No saved plans yet</p>
            <p className="text-xs mt-1 opacity-70">Tap "Save this plan" below any DW plan to save it here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedPlansList.map((plan) => (
              <div key={plan.id} className="group rounded-xl border border-border hover:border-primary/30 bg-card transition-colors">
                <button
                  type="button"
                  className="w-full text-left p-3"
                  onClick={() => { setViewingPlan(plan); setPlansOpen(false); }}
                  data-testid={`plan-item-${plan.id}`}
                >
                  <p className="text-sm font-medium text-foreground line-clamp-2 leading-snug">{plan.preview}</p>
                  <p className="text-xs text-muted-foreground mt-1">{new Date(plan.savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
                </button>
                <div className="px-3 pb-2">
                  <button
                    type="button"
                    onClick={() => handleDeletePlan(plan.id)}
                    className="text-xs text-muted-foreground/60 hover:text-destructive transition-colors"
                    data-testid={`delete-plan-${plan.id}`}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SwipeableDrawer>

      {/* ── Full Plan View Dialog ── */}
      <Dialog open={!!viewingPlan} onOpenChange={(o) => { if (!o) setViewingPlan(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <DWOrb size={20} state="chat" />
              DW Plan
            </DialogTitle>
          </DialogHeader>
          <div className="dw-chat-response prose prose-sm dark:prose-invert max-w-none mt-2">
            {viewingPlan && (
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  h1: ({ children }) => <h1 className="text-lg font-bold mt-3 mb-1.5 text-foreground">{children}</h1>,
                  h2: ({ children }) => <h2 className="text-base font-semibold mt-3 mb-1 text-foreground border-b border-border/40 pb-1">{children}</h2>,
                  h3: ({ children }) => <h3 className="text-sm font-semibold mt-2 mb-1 text-foreground">{children}</h3>,
                  p: ({ children }) => <p className="text-sm leading-relaxed text-foreground mb-2">{children}</p>,
                  ul: ({ children }) => <ul className="space-y-1 my-1.5 ml-1">{children}</ul>,
                  ol: ({ children }) => <ol className="space-y-1 my-1.5 ml-4 list-decimal">{children}</ol>,
                  li: ({ children }) => <li className="text-sm leading-relaxed text-foreground flex gap-2 items-start"><span className="text-primary mt-1.5 shrink-0">•</span><span>{children}</span></li>,
                  strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                  em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                  hr: () => <hr className="my-3 border-border/40" />,
                }}
              >
                {viewingPlan.content}
              </ReactMarkdown>
            )}
          </div>
          <div className="pt-2 flex justify-between items-center border-t border-border/50">
            <p className="text-xs text-muted-foreground">
              Saved {viewingPlan ? new Date(viewingPlan.savedAt).toLocaleDateString("en-US", { month: "long", day: "numeric" }) : ""}
            </p>
            <Button variant="ghost" size="sm" className="text-xs text-destructive hover:text-destructive" onClick={() => { if (viewingPlan) handleDeletePlan(viewingPlan.id); }}>
              Remove plan
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <div className="flex-1 overflow-auto">
        <div className="max-w-3xl mx-auto py-6 px-4 space-y-8">
          <div className="flex flex-col items-center gap-3 pb-2" data-testid="chat-orb-header">
            <div className="relative">
              <div
                className="absolute inset-0 rounded-full blur-2xl opacity-30"
                style={{ background: 'radial-gradient(circle, hsl(var(--primary)) 0%, transparent 70%)', transform: 'scale(2.2)' }}
              />
              <DWOrb
                size={60}
                state={isSpeaking ? "speaking" : isListening ? "listening" : isTyping ? "active" : "chat"}
              />
            </div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground">
              {isSpeaking ? "DW is speaking..." : isListening ? "Listening..." : isTyping ? "DW is thinking..." : "You're talking with DW"}
            </p>
          </div>
          {messages.map((message, index) => {
            /* ── Inline insight card ── */
            if (message.role === "insight") {
              return (
                <div
                  key={index}
                  className="animate-fade-in-up flex items-start gap-2.5 my-1"
                  data-testid={`insight-card-${index}`}
                >
                  <div className="mt-0.5 shrink-0 w-5 h-5 flex items-center justify-center rounded-full bg-violet-500/15">
                    <Sparkles className="h-3 w-3 text-violet-500" />
                  </div>
                  <div className="flex-1 px-3 py-2 rounded-xl bg-violet-500/8 border border-violet-500/15 space-y-0.5">
                    {message.insightTitle && (
                      <p className="text-xs font-semibold text-violet-600 dark:text-violet-400 leading-snug">
                        {message.insightTitle}
                      </p>
                    )}
                    <p className="text-xs text-foreground/70 leading-relaxed">{message.content}</p>
                    {message.insightCategory && (
                      <span
                        className={`inline-block mt-1 text-xs px-1.5 py-0.5 rounded-full font-medium ${
                          DIMENSION_COLORS[message.insightCategory] ?? "bg-muted text-muted-foreground"
                        }`}
                      >
                        {message.insightCategory}
                      </span>
                    )}
                  </div>
                </div>
              );
            }

            return (
              <article
                key={index}
                className={`animate-fade-in-up transition-colors duration-700 ${
                  highlightedIndex === index ? "ring-2 ring-primary/30 rounded-2xl bg-primary/5 px-3 py-1" : ""
                }`}
                data-testid={`message-talk-${index}`}
              >
                {message.role === "user" ? (
                  <div className="space-y-1 pl-3 border-l-2 border-primary/25 py-1">
                    <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground/70">You</p>
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
                    <div className="flex items-center gap-2 mb-2">
                      <DWOrb size={24} state="chat" />
                      <p className="text-xs font-semibold tracking-wide text-primary/80 uppercase" style={{ letterSpacing: '0.08em' }}>DW</p>
                    </div>
                    <div className="dw-chat-response prose prose-sm dark:prose-invert max-w-none">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          h1: ({ children }) => <h1 className="text-lg font-bold mt-4 mb-2 text-foreground">{children}</h1>,
                          h2: ({ children }) => <h2 className="text-base font-semibold mt-4 mb-1.5 text-foreground border-b border-border/50 pb-1">{children}</h2>,
                          h3: ({ children }) => <h3 className="text-sm font-semibold mt-3 mb-1 text-foreground">{children}</h3>,
                          p: ({ children }) => <p className="font-body text-base leading-relaxed text-foreground mb-2">{children}</p>,
                          ul: ({ children }) => <ul className="space-y-1 my-2 ml-1">{children}</ul>,
                          ol: ({ children }) => <ol className="space-y-1 my-2 ml-4 list-decimal">{children}</ol>,
                          li: ({ children }) => <li className="text-base leading-relaxed text-foreground flex gap-2 items-start"><span className="text-primary mt-1.5 shrink-0">•</span><span>{children}</span></li>,
                          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                          em: ({ children }) => <em className="italic text-foreground/80">{children}</em>,
                          hr: () => <hr className="my-4 border-border/40" />,
                          blockquote: ({ children }) => <blockquote className="border-l-2 border-primary/40 pl-3 my-2 italic text-muted-foreground">{children}</blockquote>,
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>
                    </div>
                    {/* Save Plan button — appears on substantial DW responses */}
                    {message.content.length > 350 && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className={`h-7 text-xs gap-1.5 ${savedPlanIds.has(index) ? "text-primary" : "text-muted-foreground"}`}
                          onClick={() => handleSavePlan(index, message.content)}
                          disabled={savedPlanIds.has(index)}
                          data-testid={`button-save-plan-${index}`}
                        >
                          {savedPlanIds.has(index) ? (
                            <><Check className="h-3 w-3" />Saved</>
                          ) : (
                            <><BookmarkPlus className="h-3 w-3" />Save this plan</>
                          )}
                        </Button>
                      </div>
                    )}
                    {message.personSuggestion && (
                      <PersonSuggestionCard
                        suggestion={message.personSuggestion}
                        onLog={() => navigate(`/relationships?personId=${encodeURIComponent(message.personSuggestion!.personId)}&log=1`)}
                        onOpen={() => navigate(`/relationships?personId=${encodeURIComponent(message.personSuggestion!.personId)}`)}
                      />
                    )}
                    {message.suggestion?.kind === "trigger_protocol" && (
                      <div className="pt-1">
                        {message.suggestion.reason && (
                          <p className="text-xs text-muted-foreground mb-1.5 italic">
                            {message.suggestion.reason}
                          </p>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 text-xs gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                          onClick={() => {
                            setTriggerSheetSeed({
                              feeling: message.triggeredByUserMessage ?? "",
                              assumption: message.triggeredByUserMessage ?? "",
                            });
                            setTriggerSheetOpen(true);
                          }}
                          data-testid={`button-start-trigger-reset-${index}`}
                        >
                          <Heart className="h-3.5 w-3.5" />
                          Start trigger reset
                        </Button>
                      </div>
                    )}
                    {message.isError && lastFailedMessage && (
                      <div className="pt-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                          onClick={() => {
                            setLastFailedMessage(null);
                            setMessages((prev) => prev.slice(0, -1));
                            setIsTyping(true);
                            chatMutation.mutate(lastFailedMessage);
                          }}
                          data-testid="button-retry-message"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Tap to retry
                        </Button>
                      </div>
                    )}
                    <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                      <MessageActions
                        messageIndex={index}
                        messageContent={message.content}
                        isUserMessage={false}
                        isLoggedIn={isLoggedIn}
                      />
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
            );
          })}
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

      <div className="chat-input-area">
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
          <div className="flex items-center justify-between px-1 pb-1 gap-2">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <button
                type="button"
                onClick={() => setChatModeReasonOpen((v) => !v)}
                data-testid="button-chat-mode-label"
                className="text-[11px] px-2 py-0.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors shrink-0"
                aria-label="Active DW mode — tap to see why"
                title="DW picks its role automatically from the conversation"
              >
                DW · {DW_MODES.find((m) => m.id === chatMode)?.label ?? "Companion"}
              </button>
              {chatModeReasonOpen && chatModeReason && (
                <span
                  className="text-[11px] text-muted-foreground italic truncate"
                  data-testid="text-chat-mode-reason"
                >
                  {chatModeReason}
                </span>
              )}
              {voiceModeActive && (
                <span className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className={`w-2 h-2 rounded-full ${isSpeaking ? "bg-primary animate-pulse" : isListening ? "bg-red-500 animate-pulse" : "bg-muted-foreground/40"}`} />
                  {isSpeaking ? "Speaking — tap mic to interrupt" : isListening ? "Recording" : "Voice on"}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {isLoggedIn && messages.filter((m) => m.role === "user" || m.role === "assistant").length >= 4 && (
                <button
                  type="button"
                  onClick={handleSaveAsThread}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium hover:text-foreground transition-colors shrink-0"
                  data-testid="button-save-as-thread"
                  title="Save this conversation as a Learning Thread"
                >
                  <BookmarkPlus className="w-3.5 h-3.5" />
                  Save thread
                </button>
              )}
              <button
                onClick={() => setVoiceConvOpen(true)}
                className="flex items-center gap-1.5 text-xs text-primary font-medium hover:opacity-80 transition-opacity shrink-0"
                data-testid="button-open-voice-conversation"
              >
                <Headphones className="w-3.5 h-3.5" />
                Speak with DW
              </button>
            </div>
          </div>
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Share what's on your mind..."
              className="min-h-[48px] max-h-[200px] resize-none rounded-2xl bg-card border font-body text-base"
              rows={1}
              data-testid="input-talk-message"
            />
            <Button
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              size="icon"
              className="rounded-full h-12 w-12 shrink-0"
              data-testid="button-send-talk"
              aria-label={isTyping ? "Waiting for response" : "Send message"}
            >
              {isTyping ? <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" /> : <Send className="h-5 w-5" aria-hidden="true" />}
            </Button>
            <Button
              type="button"
              size="icon"
              variant={voiceModeActive ? "default" : "ghost"}
              onClick={() => {
                const next = !voiceModeActive;
                setVoiceModeActive(next);
                try { localStorage.setItem("dw:auto_speak", next ? "on" : "off"); } catch {}
                if (!next) stopSpeaking();
              }}
              className="rounded-full h-12 w-12 shrink-0"
              data-testid="button-voice-mode-toggle"
              aria-label={voiceModeActive ? "Mute DW voice" : "Unmute DW voice"}
              title={voiceModeActive ? "DW voice on — tap to mute" : "DW voice off — tap to unmute"}
            >
              {voiceModeActive ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
            <VoiceModeButton
              onTranscript={(text) => {
                stopSpeaking();
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
              onStateChange={(state) => setIsListening(state === "recording")}
              disabled={isTyping}
              autoListenTrigger={autoListenTrigger}
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

      {/* Life System paste detection dialog */}
      <Dialog open={lifeSystemDialogOpen} onOpenChange={setLifeSystemDialogOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              That looks like a life system
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground leading-relaxed">
            DW can build this out automatically — creating your goals, workouts, meals, routines, calendar events, and grocery list all at once. Or you can just keep chatting.
          </p>
          <div className="flex flex-col gap-2 pt-1">
            <Button
              data-testid="button-ls-builder"
              className="w-full"
              onClick={() => {
                setLifeSystemDialogOpen(false);
                // Store the text in sessionStorage so the import page can pre-fill it
                try { sessionStorage.setItem("dw_ls_prepaste", pendingLifeSystemText); } catch {}
                navigate("/life-system-import");
              }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Build my life system
            </Button>
            <Button
              variant="ghost"
              data-testid="button-ls-chat-anyway"
              onClick={() => {
                setLifeSystemDialogOpen(false);
                setMessages((prev) => [...prev, { role: "user", content: pendingLifeSystemText }]);
                setInput("");
                setIsTyping(true);
                chatMutation.mutate(pendingLifeSystemText);
                setPendingLifeSystemText("");
              }}
            >
              Just chat with DW about it
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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

      {/* Full-screen voice conversation mode */}
      {voiceConvOpen && (
        <DWVoiceConversation
          messages={messages}
          userContextSummary={(() => {
            const name = (user?.firstName || user?.username || "").trim();
            const recentMoods = messages
              .filter((m) => m.role === "user")
              .slice(-3)
              .map((m) => m.content.slice(0, 120))
              .join(" | ");
            const parts = [
              name ? `Name: ${name}.` : "",
              recentMoods ? `Recent things they've said: ${recentMoods}` : "",
            ].filter(Boolean);
            return parts.join("\n");
          })()}
          onSend={(text) => {
            // Realtime owns the reply — just append the user's spoken turn to the visible log.
            setMessages((prev) => [...prev, { role: "user", content: text }]);
          }}
          onAssistantTranscript={(text) => {
            setMessages((prev) => [...prev, { role: "assistant", content: text }]);
          }}
          onClose={() => {
            setVoiceConvOpen(false);
            stopSpeaking();
            setTimeout(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
            }, 150);
          }}
        />
      )}

      <TriggerProtocolSheet
        open={triggerSheetOpen}
        onOpenChange={setTriggerSheetOpen}
        initialFeeling={triggerSheetSeed.feeling}
        initialAssumption={triggerSheetSeed.assumption}
      />

      {/* Save as Learning Thread dialog */}
      <Dialog open={saveThreadOpen} onOpenChange={setSaveThreadOpen}>
        <DialogContent className="w-[calc(100%-2rem)] rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookmarkPlus className="h-4 w-4 text-primary" />
              Save as Learning Thread
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This conversation will be saved to Guidance → Conversations so you can revisit it any time.
          </p>
          <div className="space-y-3 pt-1">
            <Input
              value={threadTitleDraft}
              onChange={(e) => setThreadTitleDraft(e.target.value)}
              placeholder="Give this thread a title…"
              className="text-sm"
              onKeyDown={(e) => {
                if (e.key === "Enter" && threadTitleDraft.trim()) {
                  saveThreadMutation.mutate(threadTitleDraft);
                }
              }}
            />
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => setSaveThreadOpen(false)}>
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={!threadTitleDraft.trim() || saveThreadMutation.isPending}
                onClick={() => saveThreadMutation.mutate(threadTitleDraft)}
              >
                {saveThreadMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save thread"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
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
