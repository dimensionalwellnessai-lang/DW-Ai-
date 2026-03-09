import { useState } from "react";
import { MessageCircle, X, Send, Maximize2, Loader2, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useLocation } from "wouter";

interface CommandAction {
  type: "navigate";
  path: string;
  tab?: string;
}

interface CommandResponse {
  response: string;
  action?: CommandAction;
}

const COSMIC_TAB_LABELS: Record<string, string> = {
  calendar: "Cosmic Calendar",
  insights: "Cosmic Insights",
  astrology: "Cosmic Insights Profile",
  numerology: "Numerology Profile",
};

export function FloatingAIWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [aiReply, setAiReply] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<CommandAction | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [location, navigate] = useLocation();

  const hiddenPages = ["/talk", "/welcome", "/enhanced-onboarding", "/app-tour", "/login", "/reset-password"];
  const shouldHide = hiddenPages.some(page => location === page || location.startsWith(page + "/") || location.startsWith(page + "?"));

  if (shouldHide) {
    return null;
  }

  const resetState = () => {
    setAiReply(null);
    setPendingAction(null);
    setMessage("");
  };

  const handleSendMessage = async () => {
    const trimmed = message.trim();
    if (!trimmed) return;

    setIsLoading(true);
    setAiReply(null);
    setPendingAction(null);

    try {
      const res = await fetch("/api/chat/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      if (res.ok) {
        const data: CommandResponse = await res.json();
        setAiReply(data.response);
        if (data.action) setPendingAction(data.action);
      } else {
        // Fallback: send to full chat
        navigate(`/talk?q=${encodeURIComponent(trimmed)}`);
        resetState();
        setIsOpen(false);
      }
    } catch {
      // Fallback on network error
      navigate(`/talk?q=${encodeURIComponent(trimmed)}`);
      resetState();
      setIsOpen(false);
    } finally {
      setIsLoading(false);
      setMessage("");
    }
  };

  const handleExecuteAction = () => {
    if (pendingAction?.type === "navigate") {
      navigate(pendingAction.path);
      resetState();
      setIsOpen(false);
    }
  };

  const handleQuickAction = (text: string) => {
    setMessage(text);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-4 z-50 h-14 w-14 rounded-full shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
        aria-label="Open DW AI assistant"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-24 right-4 z-50 w-80 shadow-xl border" role="dialog" aria-label="DW AI assistant">
      <div className="flex items-center justify-between p-3 border-b bg-primary text-primary-foreground rounded-t-lg">
        <span className="font-medium">Ask DW</span>
        <div className="flex gap-1">
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20" 
            aria-label="Open full chat"
            onClick={() => {
              navigate('/talk');
              setIsOpen(false);
              resetState();
            }}
          >
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button 
            size="icon" 
            variant="ghost" 
            className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
            onClick={() => { setIsOpen(false); resetState(); }}
            aria-label="Close widget"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      <div className="p-3 space-y-3">
        {aiReply ? (
          <div className="space-y-2">
            <p className="text-sm text-foreground" aria-live="polite">{aiReply}</p>
            {pendingAction?.type === "navigate" && (
              <Button
                size="sm"
                className="w-full gap-2"
                onClick={handleExecuteAction}
                aria-label={`Navigate to ${COSMIC_TAB_LABELS[pendingAction.tab ?? ""] ?? "Cosmic Hub"}`}
              >
                <Star className="h-3 w-3" />
                Open {COSMIC_TAB_LABELS[pendingAction.tab ?? ""] ?? "Cosmic Hub"}
              </Button>
            )}
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={resetState}>
              Ask something else
            </Button>
          </div>
        ) : (
          <>
            <p className="text-sm text-muted-foreground">
              Quick question? Ask me anything.
            </p>
            <div className="flex gap-2">
              <Input
                placeholder="What's my workout today?"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="flex-1"
                disabled={isLoading}
                aria-label="Message to DW"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSendMessage();
                  }
                }}
              />
              <Button size="icon" onClick={handleSendMessage} disabled={isLoading} aria-label="Send message">
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="flex flex-wrap gap-1">
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => handleQuickAction("What's my workout today?")}
              >
                What's my workout?
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => handleQuickAction("Show my cosmic insights profile")}
              >
                Cosmic Insights
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => handleQuickAction("Show my numerology")}
              >
                Numerology
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-xs"
                onClick={() => handleQuickAction("Open cosmic calendar")}
              >
                Cosmic Calendar
              </Button>
            </div>
          </>
        )}
      </div>
    </Card>
  );
}

