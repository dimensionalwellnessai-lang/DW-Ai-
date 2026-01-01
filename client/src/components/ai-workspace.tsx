import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { BreathingPlayer } from "@/components/breathing-player";
import { getGuestData, saveGuestData, initGuestData } from "@/lib/guest-storage";
import { Link } from "wouter";
import {
  Send,
  Loader2,
  Calendar,
  Sun,
  Target,
  Heart,
  X,
  Menu,
  Briefcase,
  Shield,
  History,
  Settings,
  Sparkles,
  Wind,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

interface ChatMessage {
  role: "assistant" | "user";
  content: string;
}

const QUICK_ACTIONS = [
  { text: "Make a plan", icon: Calendar },
  { text: "Talk it out", icon: Heart },
  { text: "Breathing exercise", icon: Wind },
];

const MENU_ITEMS = [
  { name: "Home", path: "/", icon: Sun, description: "Start fresh" },
  { name: "Browse", path: "/browse", icon: Sparkles, description: "Explore wellness content" },
  { name: "Calendar", path: "/calendar", icon: Calendar, description: "Your schedule" },
  { name: "Routines", path: "/routines", icon: History, description: "Daily patterns" },
  { name: "Challenges", path: "/challenges", icon: Target, description: "Growth challenges" },
  { name: "Blueprint", path: "/blueprint", icon: Shield, description: "Wellness framework" },
  { name: "Projects", path: "/projects", icon: Briefcase, description: "Bigger goals" },
  { name: "Settings", path: "/settings", icon: Settings, description: "Preferences" },
];

export function AIWorkspace() {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [breathingPlayerOpen, setBreathingPlayerOpen] = useState(false);
  const [input, setInput] = useState("");

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const guestData = getGuestData();
    if (guestData && guestData.messages.length > 0) {
      return guestData.messages.map(m => ({
        role: m.role,
        content: m.content,
      }));
    }
    return [];
  });
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  
  useEffect(() => {
    const guestData = getGuestData() || initGuestData();
    const existingTimestamps = new Map(
      guestData.messages.map((m, i) => [i, m.timestamp])
    );
    const messagesToSave = messages.map((m, i) => ({
      ...m,
      timestamp: existingTimestamps.get(i) || Date.now(),
    }));
    saveGuestData({ ...guestData, messages: messagesToSave });
  }, [messages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat/smart", {
        message,
        conversationHistory: messages.slice(-10),
        userProfile: userProfile || undefined,
      });
      return response.json();
    },
    onSuccess: (data) => {
      setMessages((prev) => [...prev, {
        role: "assistant",
        content: data.response,
      }]);
      setIsTyping(false);
    },
    onError: () => {
      toast({
        title: "Something went wrong",
        description: "We can try again when you're ready.",
        variant: "destructive",
      });
      setIsTyping(false);
    },
  });

  const handleSend = () => {
    if (!input.trim() || isTyping) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleQuickAction = (text: string) => {
    if (text === "Breathing exercise") {
      setBreathingPlayerOpen(true);
    } else {
      setInput(text);
      inputRef.current?.focus();
    }
  };

  const greeting = "How can I support you today?";

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="flex items-center justify-between p-3 border-b">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setMenuOpen(true)}
          data-testid="button-menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <span className="font-display font-semibold text-lg" data-testid="text-brand">DWAI</span>
        <ThemeToggle />
      </header>
      
      {menuOpen && (
        <div className="fixed inset-0 z-50 bg-black/40" onClick={() => setMenuOpen(false)}>
          <div 
            className="absolute left-0 top-0 h-full w-64 bg-background border-r p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <span className="font-display font-semibold">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMenuOpen(false)} data-testid="button-close-menu">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1">
              {MENU_ITEMS.map((item) => {
                const Icon = item.icon;
                return (
                  <Link key={item.path} href={item.path}>
                    <button
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${item.name.toLowerCase()}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{item.name}</span>
                    </button>
                  </Link>
                );
              })}
            </nav>
            <div className="absolute bottom-4 left-4 right-4">
              <Link href="/login">
                <Button className="w-full" size="sm" data-testid="button-signup">
                  Sign up
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          <div className="max-w-2xl mx-auto py-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
                <h1 className="text-2xl font-display font-semibold text-center" data-testid="text-greeting">
                  {greeting}
                </h1>
                <div className="flex flex-wrap justify-center gap-2">
                  {QUICK_ACTIONS.map((action, idx) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={idx}
                        onClick={() => handleQuickAction(action.text)}
                        className="flex items-center gap-2 px-4 py-2 rounded-full border bg-card hover-elevate text-sm"
                        data-testid={`button-quick-${idx}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        {action.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[80%] px-4 py-3 rounded-2xl ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                      data-testid={`message-${index}`}
                    >
                      <p className="text-sm leading-relaxed whitespace-pre-line">
                        {message.content}
                      </p>
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 text-muted-foreground text-sm">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Thinking...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>

        <div className="p-4 border-t">
          <div className="flex gap-2 max-w-2xl mx-auto">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type a message..."
              className="resize-none min-h-[44px] max-h-32 rounded-2xl"
              disabled={isTyping}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              data-testid="input-message"
            />
            <Button
              size="icon"
              onClick={handleSend}
              disabled={!input.trim() || isTyping}
              className="rounded-full shrink-0"
              data-testid="button-send"
            >
              <Send className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <BreathingPlayer
        open={breathingPlayerOpen}
        onClose={() => setBreathingPlayerOpen(false)}
        onComplete={(pattern, duration) => {
          toast({
            title: "Session complete",
            description: `${duration} minutes of ${pattern} breathing.`,
          });
        }}
      />
    </div>
  );
}
