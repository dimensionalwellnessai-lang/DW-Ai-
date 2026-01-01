import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { BreathingPlayer } from "@/components/breathing-player";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { 
  getGuestData, 
  initGuestData, 
  getActiveConversation,
  createNewConversation,
  addMessageToConversation,
  setActiveConversation,
  getConversationsByCategory,
  hasCompletedOnboarding,
  type GuestConversation,
  type ChatMessage,
} from "@/lib/guest-storage";
import { GettingToKnowYouDialog } from "@/components/getting-to-know-you";
import { Link } from "wouter";
import {
  Send,
  Loader2,
  Calendar,
  Sun,
  Target,
  Heart,
  Menu,
  Briefcase,
  Shield,
  History,
  Settings,
  Sparkles,
  Wind,
  Plus,
  MessageSquare,
  Compass,
  Dumbbell,
  Utensils,
  Wallet,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

const QUICK_ACTIONS = [
  { text: "Make a plan", icon: Calendar, style: "default" },
  { text: "Wellness Dimensions", icon: Compass, style: "dimensions", path: "/blueprint" },
  { text: "Talk it out", icon: Heart, style: "default" },
  { text: "Breathing exercise", icon: Wind, style: "default" },
];

const MENU_ITEMS = [
  { name: "Home", path: "/", icon: Sun, description: "Start fresh" },
  { name: "Life Dashboard", path: "/life-dashboard", icon: Sparkles, description: "Your wellness overview" },
  { name: "Workout", path: "/workout", icon: Dumbbell, description: "Personalized training" },
  { name: "Meal Prep", path: "/meal-prep", icon: Utensils, description: "Nutrition planning" },
  { name: "Finances", path: "/finances", icon: Wallet, description: "Budget wellness" },
  { name: "Spiritual", path: "/spiritual", icon: Heart, description: "Inner peace" },
  { name: "Routines", path: "/routines", icon: History, description: "Saved favorites" },
  { name: "Browse", path: "/browse", icon: Sparkles, description: "Explore content" },
  { name: "Calendar", path: "/calendar", icon: Calendar, description: "Your schedule" },
  { name: "Challenges", path: "/challenges", icon: Target, description: "Growth challenges" },
  { name: "Blueprint", path: "/blueprint", icon: Shield, description: "Wellness framework" },
  { name: "Settings", path: "/settings", icon: Settings, description: "Preferences" },
];

const CATEGORY_LABELS: Record<string, string> = {
  planning: "Planning",
  emotional: "Emotional Support",
  wellness: "Wellness",
  productivity: "Productivity",
  relationships: "Relationships",
  general: "General",
};

export function AIWorkspace() {
  const { toast } = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [breathingPlayerOpen, setBreathingPlayerOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [input, setInput] = useState("");
  const [conversationVersion, setConversationVersion] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasCompletedOnboarding()) {
        setShowOnboarding(true);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const activeConversation = getActiveConversation();
  const messages: ChatMessage[] = activeConversation?.messages || [];
  const conversationsByCategory = getConversationsByCategory();
  
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initGuestData();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationVersion]);

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
      addMessageToConversation("assistant", data.response);
      setConversationVersion(v => v + 1);
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
    addMessageToConversation("user", userMessage);
    setConversationVersion(v => v + 1);
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

  const handleNewConversation = () => {
    createNewConversation();
    setConversationVersion(v => v + 1);
    setHistoryOpen(false);
  };

  const handleSelectConversation = (convo: GuestConversation) => {
    setActiveConversation(convo.id);
    setConversationVersion(v => v + 1);
    setHistoryOpen(false);
  };

  const greeting = "How can I support you today?";
  const hasConversations = Object.values(conversationsByCategory).flat().length > 0;

  return (
    <div className="flex flex-col h-screen w-full bg-background">
      <header className="flex items-center justify-between p-3 border-b">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen(true)}
            data-testid="button-menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          {hasConversations && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              data-testid="button-history"
            >
              <MessageSquare className="h-5 w-5" />
            </Button>
          )}
        </div>
        <span className="font-display font-semibold text-lg" data-testid="text-brand">DWAI</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewConversation}
            data-testid="button-new-chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
          <ThemeToggle />
        </div>
      </header>
      
      <SwipeableDrawer 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        title="Menu"
      >
        <nav className="space-y-1 flex-1">
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
        <div className="pt-4">
          <Link href="/login">
            <Button className="w-full" size="sm" data-testid="button-signup">
              Sign up
            </Button>
          </Link>
        </div>
      </SwipeableDrawer>

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
          <div className="space-y-4">
            {Object.entries(conversationsByCategory).map(([category, convos]) => (
              <div key={category}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  {CATEGORY_LABELS[category] || category}
                </h3>
                <div className="space-y-1">
                  {convos.map((convo) => (
                    <button
                      key={convo.id}
                      onClick={() => handleSelectConversation(convo)}
                      className={`w-full text-left p-2 rounded-lg text-sm hover-elevate truncate ${
                        activeConversation?.id === convo.id ? "bg-muted" : ""
                      }`}
                      data-testid={`conversation-${convo.id}`}
                    >
                      {convo.title}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </SwipeableDrawer>

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
                    const isDimensions = action.style === "dimensions";
                    
                    if (isDimensions && action.path) {
                      return (
                        <Link key={idx} href={action.path}>
                          <button
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-sky-500 text-white hover-elevate text-sm"
                            data-testid={`button-quick-${idx}`}
                          >
                            <Icon className="h-4 w-4" />
                            {action.text}
                          </button>
                        </Link>
                      );
                    }
                    
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

      <GettingToKnowYouDialog
        open={showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={() => setShowOnboarding(false)}
      />
    </div>
  );
}
