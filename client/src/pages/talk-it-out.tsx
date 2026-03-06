import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CrisisSupportDialog } from "@/components/crisis-support-dialog";
import { ChatFeedbackBar } from "@/components/chat-feedback-bar";
import { postProcessAssistantMessage } from "@/core/postProcessAssistantMessage";
import { shouldCaptureInsight, buildInsight, saveInsight, getInsights } from "@/core/conversationInsights";
import { isFeatureEnabled } from "@/config/featureFlags";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { saveChatFeedback } from "@/lib/guest-storage";
import { PageHeader } from "@/components/page-header";
import { Send, Loader2, Heart } from "lucide-react";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { MessageActions } from "@/components/message-actions";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
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
  const { data: authData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false,
  });
  const isLoggedIn = !!(authData?.user);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "This is a space for you. There's no agenda here, no rush, no judgment.\n\nWhat's on your mind today? Or if you're not sure, we can sit with that for a moment too.",
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [crisisDialogOpen, setCrisisDialogOpen] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState<number | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Prefill input from insight card "Continue with DW" (?insightId=<id>)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const insightId = params.get("insightId");
    if (!insightId) return;

    let insight: { title?: string; summary?: string } | null = null;

    // 1) Try sessionStorage
    try {
      const stored = window.sessionStorage?.getItem(`dwInsight:${insightId}`);
      if (stored) {
        insight = JSON.parse(stored) as { title?: string; summary?: string };
        window.sessionStorage.removeItem(`dwInsight:${insightId}`);
      }
    } catch {
      // sessionStorage unavailable – continue to fallback
    }

    // 2) Fallback: find by id in localStorage insights list
    if (!insight) {
      try {
        const found = getInsights().find((i) => i.id === insightId);
        if (found) insight = found;
      } catch {
        // localStorage unavailable – skip
      }
    }

    if (insight) {
      const context = insight.summary
        ? `Continue from this insight — "${insight.title ?? ""}": ${insight.summary}`
        : `Continue from this insight: ${insight.title ?? ""}`;
      setInput(context);
    }

    // Always remove the query param after reading
    navigate("/talk", { replace: true });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Jump-to-moment: handle ?jumpToMessageIndex param on first render
  useEffect(() => {
    let targetIndex: number | null = null;
    try {
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("jumpToMessageIndex");
      if (raw !== null && /^\d+$/.test(raw)) {
        const parsed = Number(raw);
        if (Number.isSafeInteger(parsed) && parsed >= 0) {
          targetIndex = parsed;
        }
      }
    } catch {
      // URL params unavailable or malformed – fail silently
    }

    if (targetIndex === null) return;

    const idx = targetIndex;

    // Remove query params from URL without adding to history
    navigate("/talk", { replace: true });

    // Wait for the target message element to exist in the DOM, then scroll and highlight.
    // This polling handles cases where messages are restored/rendered asynchronously.
    const selector = `[data-testid="message-talk-${idx}"]`;
    const maxAttempts = 30; // e.g., ~3 seconds at 100ms intervals
    const intervalMs = 100;

    let attempts = 0;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    let highlightTimeoutId: ReturnType<typeof setTimeout> | null = null;

    const tryScroll = () => {
      attempts += 1;
      const el = document.querySelector(selector) as HTMLElement | null;
      if (el) {
        // Found the element – stop polling and perform scroll/highlight
        if (intervalId !== null) {
          clearInterval(intervalId);
          intervalId = null;
        }
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setHighlightedIndex(idx);
        highlightTimeoutId = setTimeout(() => setHighlightedIndex(null), 2000);
        return;
      }

      // Stop polling if we've exceeded the maximum attempts
      if (attempts >= maxAttempts && intervalId !== null) {
        clearInterval(intervalId);
        intervalId = null;
      }
    };

   intervalId = setInterval(tryScroll, intervalMs);

    return () => {
      if (intervalId !== null) {
        clearInterval(intervalId);
      }
      if (highlightTimeoutId !== null) {
        clearTimeout(highlightTimeoutId);
      }
    };
  }, [navigate]); // navigate is stable (wouter hook ref), but included for correctness

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
      // Post-process the assistant response (flag-gated, fail-safe).
      // Capture the processed result in a local variable so insight capture
      // (a side-effect) can be performed outside the pure state updater,
      // avoiding duplicate writes in React StrictMode / concurrent rendering.
      let capturedText = data.response ?? "";
      // Compute the index the new message will occupy before calling setMessages,
      // so it's reliably available for the insight capture side-effect.
      const capturedIndex = messages.length;
      setMessages((prev) => {
        const processedWithHistory = postProcessAssistantMessage({
          assistantText: data.response,
          userMessage: variables,
          conversationHistory: prev,
        });
        capturedText = processedWithHistory.text;
        return [...prev, { role: "assistant", content: processedWithHistory.text }];
      });
      // Capture conversation insight outside the updater (side-effect safe)
      if (isFeatureEnabled("CONVERSATION_INSIGHTS") && data.response) {
        try {
          if (shouldCaptureInsight({ userText: variables, assistantText: capturedText })) {
            saveInsight(buildInsight({
              userText: variables,
              assistantText: capturedText,
              source: {
                surface: "talk",
                messageTimestamp: Date.now(),
                messageIndex: capturedIndex,
              },
            }));
          }
        } catch {
          // Insight capture is non-critical – swallow any error
        }
      }
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
    </div>
  );
}
