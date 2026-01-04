import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CrisisSupportDialog } from "@/components/crisis-support-dialog";
import { ChatFeedbackBar } from "@/components/chat-feedback-bar";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { saveChatFeedback } from "@/lib/guest-storage";
import { PageHeader } from "@/components/page-header";
import { Send, Loader2, Heart } from "lucide-react";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { useMutation } from "@tanstack/react-query";
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
    onSuccess: (data) => {
      setMessages((prev) => [...prev, { role: "assistant", content: data.response }]);
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
    <div className="flex flex-col h-screen bg-background">
      <PageHeader 
        title="Talk It Out" 
        backPath="/"
        rightContent={
          <div className="p-2 rounded-full bg-pink-500/10">
            <Heart className="h-4 w-4 text-pink-500" />
          </div>
        }
      />

      <ScrollArea className="flex-1 px-4">
        <div className="space-y-6 max-w-2xl mx-auto py-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex animate-fade-in-up ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div className={`max-w-[85%] ${message.role === "assistant" ? "space-y-0" : ""}`}>
                <div
                  className={`${
                    message.role === "user"
                      ? "bg-primary/90 text-primary-foreground px-5 py-3 rounded-3xl glow-purple-sm"
                      : "bg-card glass px-5 py-4 rounded-3xl border dark:border-white/10"
                  }`}
                  data-testid={`message-talk-${index}`}
                >
                  <p className="font-body whitespace-pre-line leading-relaxed">{message.content}</p>
                </div>
                {message.role === "assistant" && index > 0 && (
                  <ChatFeedbackBar 
                    messageId={`talk-${index}`} 
                    onFeedback={handleFeedback} 
                  />
                )}
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-card px-5 py-4 rounded-3xl border">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm font-body">Listening...</span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <div className="p-4 border-t dark:border-white/5 bg-background/80 glass-subtle backdrop-blur-sm">
        <div className="max-w-2xl mx-auto">
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
