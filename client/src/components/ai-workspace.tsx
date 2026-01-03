import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ThemeToggle } from "@/components/theme-toggle";
import { BreathingPlayer } from "@/components/breathing-player";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { ImportDialog } from "@/components/import-dialog";
import { CrisisSupportDialog } from "@/components/crisis-support-dialog";
import { ChatFeedbackBar } from "@/components/chat-feedback-bar";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { useTutorialStart } from "@/contexts/tutorial-context";
import { 
  getGuestData, 
  initGuestData, 
  getActiveConversation,
  createNewConversation,
  addMessageToConversation,
  setActiveConversation,
  getConversationsByCategory,
  shouldShowOnboardingDialog,
  dismissOnboardingDialog,
  shouldShowSoftOnboarding,
  saveSoftOnboarding,
  skipSoftOnboarding,
  markSoftOnboardingShownThisSession,
  getSoftOnboardingMood,
  getLifeSystemContext,
  getMealPrepPreferences,
  getWorkoutPreferences,
  getImportedDocuments,
  saveChatFeedback,
  type GuestConversation,
  type ChatMessage,
  type SoftOnboardingMood,
} from "@/lib/guest-storage";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { useSystemPreferences, useScheduleEvents } from "@/hooks/use-systems-data";
import { GettingToKnowYouDialog } from "@/components/getting-to-know-you";
import { SoftOnboardingModal, type OnboardingMood } from "@/components/soft-onboarding-modal";
import { Link, useLocation } from "wouter";
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
  Grid3X3,
  Clock,
  Upload,
  HelpCircle,
  MessageCircle,
  ChevronDown,
  LayoutGrid,
  MessageCircleHeart,
  Paperclip,
  X,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile } from "@shared/schema";

const FIRST_TIME_ACTIONS = [
  { id: "talk", text: "I want to talk", icon: MessageCircle, action: "talk" },
  { id: "decide", text: "Help me decide my day", icon: Calendar, action: "decide" },
  { id: "calm", text: "Calm my body", icon: Wind, action: "breathing" },
  { id: "unsure", text: "I'm not sure", icon: HelpCircle, action: "unsure" },
];

const MENU_ICON_MAP: Record<string, typeof Sun> = {
  "ai-chat": Sun,
  "daily-schedule": Clock,
  "life-dashboard": Grid3X3,
  "meditation": Heart,
  "workout": Dumbbell,
  "meal-prep": Utensils,
  "finances": Wallet,
  "routines": History,
  "browse": Compass,
  "calendar": Calendar,
  "challenges": Target,
  "settings": Settings,
  "astrology": Sparkles,
  "talk-it-out": MessageCircle,
  "feedback": MessageCircleHeart,
};

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
  const [, setLocation] = useLocation();
  useTutorialStart("chat", 1500);
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [breathingPlayerOpen, setBreathingPlayerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSoftOnboarding, setShowSoftOnboarding] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState("");
  const [conversationVersion, setConversationVersion] = useState(0);
  const [crisisDialogOpen, setCrisisDialogOpen] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState("");

  const { prefs: systemPrefs, isAuthenticated } = useSystemPreferences();
  const { events: scheduleEvents } = useScheduleEvents();

  useEffect(() => {
    if (shouldShowSoftOnboarding()) {
      markSoftOnboardingShownThisSession();
      setShowSoftOnboarding(true);
    } else {
      const timer = setTimeout(() => {
        if (shouldShowOnboardingDialog()) {
          setShowOnboarding(true);
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
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

  const buildLifeSystemContext = () => {
    const guestContext = getLifeSystemContext();
    const mealPrefs = getMealPrepPreferences();
    const workoutPrefs = getWorkoutPreferences();
    const importedDocs = getImportedDocuments();
    
    return {
      preferences: {
        enabledSystems: systemPrefs.enabledSystems,
        meditationEnabled: systemPrefs.meditationEnabled,
        spiritualEnabled: systemPrefs.spiritualEnabled,
        journalingEnabled: systemPrefs.journalingEnabled,
        preferredWakeTime: systemPrefs.preferredWakeTime,
        preferredSleepTime: systemPrefs.preferredSleepTime,
      },
      scheduleEvents: (scheduleEvents.length > 0 ? scheduleEvents : (Array.isArray(guestContext.scheduleEvents) ? guestContext.scheduleEvents : [])).slice(0, 10).map((e: Record<string, unknown>) => ({
        title: e.title as string,
        scheduledTime: e.scheduledTime as string,
        systemReference: e.systemReference as string | undefined,
      })),
      mealPrepPreferences: mealPrefs || guestContext.mealPrepPreferences,
      workoutPreferences: workoutPrefs || guestContext.workoutPreferences,
      importedDocuments: importedDocs.slice(0, 5).map(d => ({
        type: d.type,
        title: d.title,
        content: d.content.substring(0, 500),
      })),
    };
  };

  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const lifeContext = buildLifeSystemContext();
      const response = await apiRequest("POST", "/api/chat/smart", {
        message,
        conversationHistory: messages.slice(-10),
        userProfile: userProfile || undefined,
        lifeSystemContext: lifeContext,
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
    const hasInput = input.trim();
    const hasFiles = attachedFiles.length > 0;
    
    if ((!hasInput && !hasFiles) || isTyping) return;

    let userMessage = input.trim();
    
    if (hasFiles && !hasInput) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      userMessage = attachedFiles.length === 1
        ? `I'm sharing a file with you: ${fileNames}. Please analyze it and let me know what you find.`
        : `I'm sharing ${attachedFiles.length} files with you: ${fileNames}. Please analyze them and let me know what you find.`;
    } else if (hasFiles) {
      const fileNames = attachedFiles.map(f => f.name).join(", ");
      userMessage = `[Attached: ${fileNames}] ${userMessage}`;
    }
    
    setAttachedFiles([]);
    
    const crisisAnalysis = analyzeCrisisRisk(userMessage);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(userMessage);
      setCrisisDialogOpen(true);
      return;
    }
    
    addMessageToConversation("user", userMessage);
    setConversationVersion(v => v + 1);
    setInput("");
    setIsTyping(true);
    chatMutation.mutate(userMessage);
  };

  const handleSendMessage = (message: string) => {
    if (isTyping) return;
    addMessageToConversation("user", message);
    setConversationVersion(v => v + 1);
    setIsTyping(true);
    chatMutation.mutate(message);
  };

  const handleCrisisResume = (responseMessage?: string, sendToAI?: boolean) => {
    const messageToSend = pendingCrisisMessage;
    setInput("");
    setPendingCrisisMessage("");
    
    if (sendToAI && messageToSend) {
      addMessageToConversation("user", messageToSend);
      setConversationVersion(v => v + 1);
      setIsTyping(true);
      chatMutation.mutate(messageToSend);
    } else if (responseMessage) {
      if (messageToSend) {
        addMessageToConversation("user", messageToSend);
        setConversationVersion(v => v + 1);
      }
      addMessageToConversation("assistant", responseMessage);
      setConversationVersion(v => v + 1);
    }
  };

  const handleFeedback = (messageId: string, type: "positive" | "negative", comment?: string) => {
    saveChatFeedback(messageId, type, "main", comment);
  };

  const handleFirstTimeAction = (action: string) => {
    switch (action) {
      case "talk":
        setLocation("/talk");
        break;
      case "decide":
        setInput("Help me figure out my day.");
        inputRef.current?.focus();
        break;
      case "breathing":
        setBreathingPlayerOpen(true);
        break;
      case "unsure":
        setInput("I'm not sure what I need right now.");
        inputRef.current?.focus();
        break;
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

  const greeting = "Hey. I'm here.";
  const subGreeting = "What would help most right now?";
  const hasConversations = Object.values(conversationsByCategory).flat().length > 0;
  const menuFeatures = getMenuFeatures();
  const moreFeatures = getMoreMenuFeatures();

  return (
    <div className="flex flex-col h-screen w-full bg-background gradient-bg-animated">
      <header className="flex items-center justify-between p-3 border-b dark:border-white/5 glass-subtle">
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
        <span className="font-display font-semibold text-lg text-gradient" data-testid="text-brand">FTS</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setImportDialogOpen(true)}
            data-testid="button-import"
          >
            <Upload className="h-5 w-5" />
          </Button>
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
      
      <ImportDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
        onImportComplete={() => {
          toast({
            title: "Import successful",
            description: "Your document has been added to your life system.",
          });
        }}
      />
      
      <SwipeableDrawer 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        title="Menu"
      >
        <nav className="space-y-1 flex-1">
          {menuFeatures.map((feature) => {
            const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
            return (
              <Link key={feature.path} href={feature.path || "/"}>
                <button
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left ${feature.indent ? "ml-6" : ""}`}
                  onClick={() => setMenuOpen(false)}
                  data-testid={`menu-item-${feature.id}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{feature.name}</span>
                </button>
              </Link>
            );
          })}
          
          <details className="group">
            <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm flex-1">More</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <div className="mt-1 space-y-1 ml-2">
              {moreFeatures.map((feature) => {
                const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
                return (
                  <Link key={feature.path} href={feature.path || "/"}>
                    <button
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${feature.id}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{feature.name}</span>
                    </button>
                  </Link>
                );
              })}
            </div>
          </details>
        </nav>
        <div className="pt-4 space-y-2">
          <Link href="/login">
            <Button className="w-full" size="sm" data-testid="button-signup">
              Sign in
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
              <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-display font-semibold" data-testid="text-greeting">
                    {greeting}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {subGreeting}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-3 w-full max-w-xs">
                  {FIRST_TIME_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleFirstTimeAction(action.action)}
                        className="flex flex-col items-center gap-2 p-4 rounded-xl border bg-card glass dark:border-white/10 hover-elevate text-center transition-shadow"
                        data-testid={`button-action-${action.id}`}
                      >
                        <Icon className="h-5 w-5 text-muted-foreground" />
                        <span className="text-sm">{action.text}</span>
                      </button>
                    );
                  })}
                </div>
                <Link href="/daily-schedule">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-today">
                    View today's schedule
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[80%] ${message.role === "assistant" ? "space-y-0" : ""}`}>
                      <div
                        className={`px-4 py-3 rounded-2xl ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground glow-purple-sm"
                            : "bg-muted glass"
                        }`}
                        data-testid={`message-${index}`}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-line">
                          {message.content}
                        </p>
                      </div>
                      {message.role === "assistant" && index > 0 && (
                        <ChatFeedbackBar 
                          messageId={`msg-${index}`} 
                          onFeedback={handleFeedback} 
                        />
                      )}
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

        <div className="p-4 border-t dark:border-white/5 glass-subtle">
          <div className="max-w-2xl mx-auto space-y-2">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                <span className="flex-1 truncate">
                  {attachedFiles.length === 1 
                    ? attachedFiles[0].name 
                    : `${attachedFiles.length} files selected`}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setAttachedFiles([])}
                  data-testid="button-remove-attachment"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            )}
            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    setAttachedFiles(Array.from(files));
                    toast({
                      title: files.length === 1 ? "File attached" : "Files attached",
                      description: files.length === 1 
                        ? `${files[0].name} ready to share.`
                        : `${files.length} files ready to share.`,
                    });
                  }
                }}
                data-testid="input-file"
              />
              <Button
                size="icon"
                variant="ghost"
                onClick={() => fileInputRef.current?.click()}
                className="shrink-0"
                data-testid="button-attach"
              >
                <Paperclip className="w-4 h-4" />
              </Button>
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
                disabled={(!input.trim() && attachedFiles.length === 0) || isTyping}
                className="rounded-full shrink-0"
                data-testid="button-send"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
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

      <SoftOnboardingModal
        open={showSoftOnboarding}
        onComplete={(mood: OnboardingMood) => {
          saveSoftOnboarding(mood as SoftOnboardingMood);
          setShowSoftOnboarding(false);
          const moodMessages: Record<OnboardingMood, string> = {
            calm: "I'm feeling calm today.",
            heavy: "I'm feeling heavy today and could use some support.",
            scattered: "My mind feels scattered right now.",
            pushing: "I'm pushing through but could use some grounding.",
            unsure: "I'm not quite sure how I'm feeling.",
          };
          handleSendMessage(moodMessages[mood]);
        }}
        onSkip={() => {
          skipSoftOnboarding();
          setShowSoftOnboarding(false);
        }}
      />

      <GettingToKnowYouDialog
        open={showOnboarding}
        onClose={() => {
          dismissOnboardingDialog();
          setShowOnboarding(false);
        }}
        onComplete={() => setShowOnboarding(false)}
      />

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
