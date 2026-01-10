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
import { MessageActions } from "@/components/message-actions";
import { analyzeCrisisRisk } from "@/lib/crisis-detection";
import { useTutorialStart, useTutorial } from "@/contexts/tutorial-context";
import { 
  getGuestData, 
  initGuestData, 
  getActiveConversation,
  createNewConversation,
  addMessageToConversation,
  setActiveConversation,
  deleteMessageFromConversation,
  getConversationsByCategory,
  getAllConversations,
  startFreshSession,
  shouldShowOnboardingDialog,
  dismissOnboardingDialog,
  shouldShowSoftOnboarding,
  saveSoftOnboarding,
  skipSoftOnboarding,
  markSoftOnboardingShownThisSession,
  getSoftOnboardingMood,
  isProfileSetupComplete,
  getLifeSystemContext,
  getMealPrepPreferences,
  getWorkoutPreferences,
  getImportedDocuments,
  saveChatFeedback,
  saveChatDraft,
  getChatDraft,
  clearChatDraft,
  clearActiveConversation,
  saveGuestConversation,
  type GuestConversation,
  type ChatMessage,
  type SoftOnboardingMood,
} from "@/lib/guest-storage";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { getEnergyContextForAPI } from "@/lib/energy-context";
import { useSystemPreferences, useScheduleEvents } from "@/hooks/use-systems-data";
import { GettingToKnowYouDialog } from "@/components/getting-to-know-you";
import { SoftOnboardingModal, type OnboardingMood } from "@/components/soft-onboarding-modal";
import { ProfileSetupModal } from "@/components/profile-setup-modal";
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
import { VoiceModeButton } from "@/components/voice-mode-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { UserProfile, Conversation } from "@shared/schema";

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
  const { state: tutorialState, hasSeenNavigationTutorial, startNavigationTutorial } = useTutorial();
  const [menuOpen, setMenuOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [breathingPlayerOpen, setBreathingPlayerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSoftOnboarding, setShowSoftOnboarding] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [pendingDocumentIds, setPendingDocumentIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [input, setInput] = useState(() => getChatDraft() || "");
  const [conversationVersion, setConversationVersion] = useState(0);
  const [crisisDialogOpen, setCrisisDialogOpen] = useState(false);
  const [pendingCrisisMessage, setPendingCrisisMessage] = useState("");
  const [editingMessageIndex, setEditingMessageIndex] = useState<number | null>(null);
  const [longPressMenuIndex, setLongPressMenuIndex] = useState<number | null>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);

  const { prefs: systemPrefs, isAuthenticated } = useSystemPreferences();
  const { events: scheduleEvents } = useScheduleEvents();

  useEffect(() => {
    // Don't show onboarding dialogs until navigation tutorial is completed
    if (tutorialState.isActive || !hasSeenNavigationTutorial()) {
      return;
    }
    
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
  }, [tutorialState.isActive, hasSeenNavigationTutorial]);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  // Auth state for conversation storage
  const { data: authData } = useQuery<{ user: any } | null>({ 
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const user = authData?.user;
  const isUserAuthenticated = !!user;

  // Database conversations for authenticated users
  const { data: dbConversations = [], refetch: refetchDbConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isUserAuthenticated,
    staleTime: 10000,
  });

  // Active database conversation ID - initialize from localStorage for persistence
  const [activeDbConversationId, setActiveDbConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("fts_active_conversation_id") || null;
    }
    return null;
  });

  // Persist active conversation ID to localStorage
  useEffect(() => {
    if (activeDbConversationId) {
      localStorage.setItem("fts_active_conversation_id", activeDbConversationId);
    }
  }, [activeDbConversationId]);

  // Initialize or validate activeDbConversationId from server data when conversations load
  useEffect(() => {
    if (isUserAuthenticated && dbConversations.length > 0) {
      // Check if current ID is valid (exists in loaded conversations)
      const idExists = activeDbConversationId && dbConversations.some(c => c.id === activeDbConversationId);
      if (!idExists) {
        // Clear stale ID and set to first conversation
        setActiveDbConversationId(dbConversations[0].id);
      }
    } else if (isUserAuthenticated && dbConversations.length === 0 && activeDbConversationId) {
      // Clear stale ID if no conversations exist
      localStorage.removeItem("fts_active_conversation_id");
      setActiveDbConversationId(null);
    }
  }, [isUserAuthenticated, dbConversations]);

  // Get the active database conversation
  const activeDbConversation = dbConversations.find(c => c.id === activeDbConversationId) || 
    (dbConversations.length > 0 ? dbConversations[0] : null);

  const [startedFresh, setStartedFresh] = useState(() => {
    if (typeof window === "undefined") return true;
    startFreshSession();
    const active = getActiveConversation();
    return !active || active.messages.length === 0;
  });
  
  // Use state for activeConversation so it updates when conversationVersion changes
  const [activeConversation, setActiveConversationState] = useState<GuestConversation | null>(() => 
    getActiveConversation()
  );
  
  // Get current conversation based on auth state
  const currentConversation = isUserAuthenticated ? activeDbConversation : activeConversation;
  const hasConversationHistory = isUserAuthenticated 
    ? dbConversations.length > 0 
    : getAllConversations().length > 0;
  const messages: ChatMessage[] = isUserAuthenticated 
    ? (activeDbConversation?.messages as ChatMessage[] || [])
    : (activeConversation?.messages || []);
  
  // Re-fetch conversations when conversationVersion changes (after sending messages)
  const [conversationsByCategory, setConversationsByCategory] = useState(() => getConversationsByCategory());
  
  // Compute DB conversations by category
  const dbConversationsByCategory = (() => {
    const grouped: Record<string, Conversation[]> = {};
    for (const convo of dbConversations) {
      const cat = convo.category || "general";
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(convo);
    }
    return grouped;
  })();

  // Create new database conversation mutation
  const createDbConversationMutation = useMutation({
    mutationFn: async ({ title, category, messages }: { title: string; category: string; messages?: any[] }) => {
      const res = await apiRequest("POST", "/api/conversations", { title, category, messages: messages || [] });
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      refetchDbConversations();
    },
  });

  // Update database conversation mutation  
  const updateDbConversationMutation = useMutation({
    mutationFn: async ({ id, messages, title }: { id: string; messages: any[]; title?: string }) => {
      const res = await apiRequest("PATCH", `/api/conversations/${id}`, { messages, title });
      return res.json() as Promise<Conversation>;
    },
    onSuccess: () => {
      refetchDbConversations();
    },
  });

  // Sync guest conversations to database on login
  const syncConversationsMutation = useMutation({
    mutationFn: async () => {
      const guestConvos = getAllConversations();
      if (guestConvos.length === 0) return { imported: 0 };
      
      const res = await apiRequest("POST", "/api/conversations/sync", { conversations: guestConvos });
      return res.json() as Promise<{ imported: number }>;
    },
    onSuccess: (data) => {
      if (data.imported > 0) {
        toast({ title: `${data.imported} conversation(s) synced to your account` });
        refetchDbConversations();
      }
    },
  });

  // Auto-sync guest conversations when user logs in
  useEffect(() => {
    if (isUserAuthenticated && getAllConversations().length > 0 && dbConversations.length === 0) {
      syncConversationsMutation.mutate();
    }
  }, [isUserAuthenticated, dbConversations.length]);
  
  useEffect(() => {
    // Re-read the active conversation after messages are added
    const updated = getActiveConversation();
    setActiveConversationState(updated);
    setConversationsByCategory(getConversationsByCategory());
    if (updated && updated.messages.length > 0) {
      setStartedFresh(false);
    }
  }, [conversationVersion]);
  
  
  const [isTyping, setIsTyping] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initGuestData();
  }, []);

  // Check for fresh session when user returns after being away
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // startFreshSession returns true if session was actually reset
        const wasReset = startFreshSession();
        
        if (wasReset) {
          // Only update state when a true reset happened (gap > 5 min)
          setActiveConversationState(null);
          setStartedFresh(true);
          setConversationVersion(v => v + 1);
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, conversationVersion]);

  // Auto-save chat draft as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveChatDraft(input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

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

  const uploadFileMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      
      const response = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
        credentials: "include",
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Upload failed");
      }
      
      return response.json();
    },
  });

  // Track optimistic messages for authenticated users (user message added immediately, before AI responds)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  
  const chatMutation = useMutation({
    mutationFn: async ({ message, userMsg, conversationId, documentIds, messagesOverride }: { 
      message: string; 
      userMsg: ChatMessage;
      conversationId?: string;
      documentIds?: string[];
      messagesOverride?: ChatMessage[];
    }) => {
      const lifeContext = buildLifeSystemContext();
      const energyContext = getEnergyContextForAPI();
      
      // Include the user message we just added in the conversation history
      const currentMessages = messagesOverride 
        ? [...messagesOverride, userMsg]
        : isUserAuthenticated && activeDbConversation 
          ? [...(activeDbConversation.messages as ChatMessage[] || []), userMsg]
          : [...messages, userMsg];
      
      const response = await apiRequest("POST", "/api/chat/smart", {
        message,
        conversationHistory: currentMessages.slice(-10),
        userProfile: userProfile || undefined,
        lifeSystemContext: lifeContext,
        energyContext,
        documentIds: documentIds || [],
      });
      const data = await response.json();
      return { data, userMsg, conversationId, messagesOverride };
    },
    onSuccess: async ({ data, userMsg, conversationId, messagesOverride }) => {
      const assistantMsg: ChatMessage = { role: "assistant", content: data.response, timestamp: Date.now() };
      
      if (isUserAuthenticated) {
        // Use messagesOverride if provided (for regenerate), otherwise use activeDbConversation
        const baseMessages = messagesOverride || (activeDbConversation?.messages as ChatMessage[] || []);
        const updatedMessages = [...baseMessages, userMsg, assistantMsg];
        
        if (conversationId) {
          await updateDbConversationMutation.mutateAsync({
            id: conversationId,
            messages: updatedMessages,
          });
        }
        // Clear optimistic messages after successful save
        setOptimisticMessages([]);
      } else {
        // For guests, add assistant message to local storage
        addMessageToConversation("assistant", data.response);
        setConversationVersion(v => v + 1);
      }
      
      // Show toast notification for actions taken
      if (data.actionsTaken && data.actionsTaken.length > 0) {
        toast({
          title: "Done",
          description: data.actionsTaken.join(". "),
        });
        // Invalidate relevant queries to refresh data
        queryClient.invalidateQueries({ queryKey: ["/api/schedule-blocks"] });
        queryClient.invalidateQueries({ queryKey: ["/api/goals"] });
        queryClient.invalidateQueries({ queryKey: ["/api/habits"] });
        queryClient.invalidateQueries({ queryKey: ["/api/mood-logs"] });
        queryClient.invalidateQueries({ queryKey: ["/api/calendar/events"] });
      }
      
      // Refresh sync session if items were created
      if (data.syncSessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
      }
      
      setIsTyping(false);
      setPendingDocumentIds([]);
    },
    onError: () => {
      // Clear optimistic messages on error
      setOptimisticMessages([]);
      toast({
        title: "That didn't save.",
        description: "You can try again, or come back later.",
        variant: "destructive",
      });
      setIsTyping(false);
      setPendingDocumentIds([]);
    },
  });

  const handleSend = async () => {
    const hasInput = input.trim();
    const hasFiles = attachedFiles.length > 0;
    
    if ((!hasInput && !hasFiles) || isTyping || isUploading) return;

    let userMessage = input.trim();
    
    let documentIds: string[] = [];
    
    if (hasFiles) {
      if (!user) {
        toast({
          title: "Account needed",
          description: "Create an account to share files in chat.",
          variant: "destructive",
        });
        return;
      }
      
      setIsUploading(true);
      try {
        const uploadedDocs: { id: string; name: string }[] = [];
        for (const file of attachedFiles) {
          const result = await uploadFileMutation.mutateAsync(file);
          uploadedDocs.push({ id: result.documentId, name: file.name });
        }
        
        documentIds = uploadedDocs.map(d => d.id);
        const fileNames = uploadedDocs.map(d => d.name).join(", ");
        if (!hasInput) {
          userMessage = uploadedDocs.length === 1
            ? `I'm sharing a file with you: ${fileNames}. Please analyze it and let me know what you find.`
            : `I'm sharing ${uploadedDocs.length} files with you: ${fileNames}. Please analyze them and let me know what you find.`;
        } else {
          userMessage = `[Attached: ${fileNames}] ${userMessage}`;
        }
        
        toast({
          title: "Files uploaded",
          description: uploadedDocs.length === 1 
            ? `${uploadedDocs[0].name} is ready.`
            : `${uploadedDocs.length} files uploaded.`,
        });
      } catch (error) {
        toast({
          title: "Upload failed",
          description: error instanceof Error ? error.message : "Could not upload files. Try again.",
          variant: "destructive",
        });
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }
    
    setAttachedFiles([]);
    
    const crisisAnalysis = analyzeCrisisRisk(userMessage);
    if (crisisAnalysis.isPotentialCrisis) {
      setPendingCrisisMessage(userMessage);
      setPendingDocumentIds(documentIds);
      setCrisisDialogOpen(true);
      return;
    }
    
    // Create user message object
    const userMsg: ChatMessage = { role: "user", content: userMessage, timestamp: Date.now() };
    
    let conversationId = activeDbConversationId || undefined;
    let messagesOverride: ChatMessage[] | undefined;
    
    // Handle editing - truncate messages from edit point
    if (editingMessageIndex !== null) {
      if (isUserAuthenticated && activeDbConversation) {
        // Truncate messages from edit index
        const truncatedMessages = (activeDbConversation.messages as ChatMessage[]).slice(0, editingMessageIndex);
        messagesOverride = truncatedMessages;
        // Update local state immediately
        queryClient.setQueryData<Conversation[]>(["/api/conversations"], (old) =>
          (old || []).map((c) =>
            c.id === activeDbConversation.id ? { ...c, messages: truncatedMessages } : c
          )
        );
        // Persist truncated messages to database
        updateDbConversationMutation.mutate({
          id: activeDbConversation.id,
          messages: truncatedMessages,
        });
      } else {
        // For guests, truncate local storage
        const currentConvo = getActiveConversation();
        if (currentConvo) {
          const truncatedMessages = currentConvo.messages.slice(0, editingMessageIndex);
          messagesOverride = truncatedMessages;
          // Update conversation with truncated messages and persist
          currentConvo.messages = truncatedMessages;
          saveGuestConversation(currentConvo);
          setActiveConversationState(currentConvo);
        }
      }
      setEditingMessageIndex(null);
    }
    
    if (isUserAuthenticated) {
      // Create conversation if none exists for authenticated users
      if (!conversationId) {
        const newConvo = await createDbConversationMutation.mutateAsync({
          title: userMessage.slice(0, 50),
          category: "general",
          messages: [], // Start empty, messages will be added after AI responds
        });
        conversationId = newConvo.id;
        setActiveDbConversationId(newConvo.id);
      }
      // Add optimistic user message for immediate display
      setOptimisticMessages([userMsg]);
    } else {
      // For guests, add to local storage immediately
      addMessageToConversation("user", userMessage);
      setConversationVersion(v => v + 1);
    }
    
    setInput("");
    clearChatDraft();
    setIsTyping(true);
    chatMutation.mutate({ message: userMessage, userMsg, conversationId, documentIds, messagesOverride });
  };

  const handleSendMessage = async (message: string, messagesOverride?: ChatMessage[]) => {
    if (isTyping) return;
    
    const userMsg: ChatMessage = { role: "user", content: message, timestamp: Date.now() };
    let conversationId = activeDbConversationId || undefined;
    
    if (isUserAuthenticated) {
      if (!conversationId) {
        const newConvo = await createDbConversationMutation.mutateAsync({
          title: message.slice(0, 50),
          category: "general",
          messages: [],
        });
        conversationId = newConvo.id;
        setActiveDbConversationId(newConvo.id);
      }
      setOptimisticMessages([userMsg]);
    } else {
      addMessageToConversation("user", message);
      setConversationVersion(v => v + 1);
    }
    
    setIsTyping(true);
    chatMutation.mutate({ message, userMsg, conversationId, messagesOverride });
  };

  const handleCrisisResume = async (responseMessage?: string, sendToAI?: boolean) => {
    const messageToSend = pendingCrisisMessage;
    const docIds = pendingDocumentIds;
    setInput("");
    clearChatDraft();
    setPendingCrisisMessage("");
    setPendingDocumentIds([]);
    
    if (sendToAI && messageToSend) {
      const userMsg: ChatMessage = { role: "user", content: messageToSend, timestamp: Date.now() };
      let conversationId = activeDbConversationId || undefined;
      
      if (isUserAuthenticated) {
        if (!conversationId) {
          const newConvo = await createDbConversationMutation.mutateAsync({
            title: messageToSend.slice(0, 50),
            category: "general",
            messages: [],
          });
          conversationId = newConvo.id;
          setActiveDbConversationId(newConvo.id);
        }
        setOptimisticMessages([userMsg]);
      } else {
        addMessageToConversation("user", messageToSend);
        setConversationVersion(v => v + 1);
      }
      setIsTyping(true);
      chatMutation.mutate({ message: messageToSend, userMsg, conversationId, documentIds: docIds });
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
        handleSendMessage("I want to talk. Just listen and help me process what's on my mind.");
        break;
      case "decide":
        setLocation("/today");
        break;
      case "breathing":
        setBreathingPlayerOpen(true);
        break;
      case "lifesystem":
        handleSendMessage("Help me build my life system. What is it and how do I start?");
        break;
      case "unsure":
        handleSendMessage("I'm not sure what I need right now. Can you help me figure it out?");
        break;
    }
  };

  const handleNewConversation = async () => {
    if (isUserAuthenticated) {
      const result = await createDbConversationMutation.mutateAsync({ 
        title: "New conversation", 
        category: "general" 
      });
      setActiveDbConversationId(result.id);
    } else {
      createNewConversation();
      setConversationVersion(v => v + 1);
    }
    setHistoryOpen(false);
  };

  const handleSelectConversation = (convo: GuestConversation | Conversation) => {
    if (isUserAuthenticated) {
      setActiveDbConversationId(convo.id);
    } else {
      setActiveConversation(convo.id);
      setConversationVersion(v => v + 1);
    }
    setHistoryOpen(false);
  };

  const greeting = "Hey. I'm here.";
  const subGreeting = "What would help most right now?";
  const hasConversations = isUserAuthenticated 
    ? Object.values(dbConversationsByCategory).flat().length > 0
    : Object.values(conversationsByCategory).flat().length > 0;
  
  const menuFeatures = getMenuFeatures();
  const moreFeatures = getMoreMenuFeatures();

  return (
    <div className="flex flex-col h-[100dvh] w-full bg-background gradient-bg-animated pb-20">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setHistoryOpen(true)}
            data-testid="button-history"
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleNewConversation}
            data-testid="button-new-chat"
          >
            <Plus className="h-5 w-5" />
          </Button>
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
          {menuFeatures.filter(f => f.group !== "calendar").map((feature) => {
            const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
            
            if (feature.id === "life-dashboard") {
              return (
                <div key="life-dashboard-group" className="space-y-1">
                  <Link href={feature.path || "/"}>
                    <button
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left`}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${feature.id}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{feature.name}</span>
                    </button>
                  </Link>
                  <details className="group">
                    <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">Calendar</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-1 space-y-1 ml-2">
                      <Link href="/daily-schedule">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-today">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Today</span>
                        </button>
                      </Link>
                      <Link href="/calendar">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-month">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Month</span>
                        </button>
                      </Link>
                      <Link href="/calendar?view=week">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-week">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Week</span>
                        </button>
                      </Link>
                      <Link href="/routines">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-routines">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Routines</span>
                        </button>
                      </Link>
                    </div>
                  </details>
                </div>
              );
            }
            
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
          <button
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
            onClick={() => {
              setMenuOpen(false);
              startNavigationTutorial(true);
            }}
            data-testid="button-start-tutorial"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">App Tour</span>
          </button>
          {user ? (
            <div className="space-y-2">
              <div className="px-2 py-1 text-xs text-muted-foreground truncate border-t pt-3">
                {user.email}
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm" 
                onClick={async () => {
                  await apiRequest("POST", "/api/auth/logout");
                  queryClient.setQueryData(["/api/auth/me"], null);
                  queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
                  setMenuOpen(false);
                  setLocation("/login");
                }}
                data-testid="button-signout"
              >
                Sign out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button className="w-full" size="sm" data-testid="button-signup">
                Sign in / Sign up
              </Button>
            </Link>
          )}
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
            {(() => {
              const categoriesToShow = isUserAuthenticated ? dbConversationsByCategory : conversationsByCategory;
              const currentActiveId = isUserAuthenticated ? activeDbConversationId : activeConversation?.id;
              
              if (Object.keys(categoriesToShow).length === 0) {
                return (
                  <div className="text-center py-8 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">No conversations yet</p>
                    <p className="text-xs mt-1">Start a new one above</p>
                  </div>
                );
              }
              
              return Object.entries(categoriesToShow).map(([category, convos]) => (
                <div key={category}>
                  <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    {CATEGORY_LABELS[category] || category}
                  </h3>
                  <div className="space-y-1">
                    {(convos as (GuestConversation | Conversation)[]).map((convo) => (
                      <button
                        key={convo.id}
                        onClick={() => handleSelectConversation(convo)}
                        className={`w-full text-left p-2 rounded-lg text-sm hover-elevate truncate ${
                          currentActiveId === convo.id ? "bg-muted" : ""
                        }`}
                        data-testid={`conversation-${convo.id}`}
                      >
                        {convo.title}
                      </button>
                    ))}
                  </div>
                </div>
              ));
            })()}
          </div>
        </ScrollArea>
      </SwipeableDrawer>

      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4">
          <div className="max-w-2xl mx-auto py-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center min-h-[40vh] space-y-6">
                <div className="text-center space-y-2">
                  <h1 className="text-2xl font-display font-semibold" data-testid="text-greeting">
                    {greeting}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {subGreeting}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2 w-full max-w-xs">
                  {FIRST_TIME_ACTIONS.map((action) => {
                    const Icon = action.icon;
                    return (
                      <button
                        key={action.id}
                        onClick={() => handleFirstTimeAction(action.action)}
                        className="flex flex-col items-center gap-1.5 p-3 rounded-xl border bg-card glass dark:border-white/10 hover-elevate text-center transition-shadow"
                        data-testid={`button-action-${action.id}`}
                      >
                        <Icon className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs">{action.text}</span>
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => handleFirstTimeAction("lifesystem")}
                  className="w-full max-w-xs px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover-elevate active-elevate-2 flex items-center justify-center gap-2 glow-purple-sm"
                  data-testid="button-action-lifesystem"
                >
                  <LayoutGrid className="h-4 w-4" />
                  Build my life system
                </button>
                <div className="flex flex-col items-center gap-2">
                  <button
                    onClick={() => setHistoryOpen(true)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                    data-testid="button-view-history"
                  >
                    <History className="h-3 w-3" />
                    {hasConversationHistory ? "View past conversations" : "No conversation history yet"}
                  </button>
                  <Link href="/daily-schedule">
                    <button className="text-xs text-muted-foreground hover:text-foreground transition-colors" data-testid="link-today">
                      View today's schedule
                    </button>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Combine DB/local messages with optimistic messages for display */}
                {[...messages, ...optimisticMessages].map((message, index) => {
                  const handleLongPressStart = () => {
                    longPressTimerRef.current = setTimeout(() => {
                      setLongPressMenuIndex(index);
                    }, 500);
                  };
                  const handleLongPressEnd = () => {
                    if (longPressTimerRef.current) {
                      clearTimeout(longPressTimerRef.current);
                      longPressTimerRef.current = null;
                    }
                  };
                  
                  return (
                  <div
                    key={index}
                    className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} group`}
                  >
                    <div className={`max-w-[85%] min-w-0 ${message.role === "assistant" ? "space-y-0" : ""}`}>
                      <div className={`flex items-start gap-1 ${message.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                        <div
                          className={`px-4 py-3 rounded-2xl cursor-pointer select-none ${
                            message.role === "user"
                              ? "bg-primary text-primary-foreground glow-purple-sm"
                              : "bg-muted glass"
                          }`}
                          data-testid={`message-${index}`}
                          onTouchStart={handleLongPressStart}
                          onTouchEnd={handleLongPressEnd}
                          onTouchCancel={handleLongPressEnd}
                          onMouseDown={handleLongPressStart}
                          onMouseUp={handleLongPressEnd}
                          onMouseLeave={handleLongPressEnd}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setLongPressMenuIndex(index);
                          }}
                        >
                          <p className="text-sm leading-relaxed whitespace-pre-line break-words">
                            {message.content}
                          </p>
                        </div>
                        <MessageActions
                          messageIndex={index}
                          messageContent={message.content}
                          isUserMessage={message.role === "user"}
                          isOpen={longPressMenuIndex === index}
                          onOpenChange={(open) => {
                            if (!open) setLongPressMenuIndex(null);
                          }}
                          showTrigger={false}
                          onEdit={(content) => {
                            setEditingMessageIndex(index);
                            setInput(content);
                            inputRef.current?.focus();
                            setLongPressMenuIndex(null);
                          }}
                          onDelete={() => {
                            const updated = deleteMessageFromConversation(index);
                            if (updated) {
                              setActiveConversationState(updated);
                              if (updated.messages.length === 0) {
                                clearActiveConversation();
                                setActiveConversationState(null);
                                setStartedFresh(true);
                              }
                            }
                            setLongPressMenuIndex(null);
                          }}
                          onAskFollowUp={(content) => {
                            setInput(content);
                            inputRef.current?.focus();
                            setLongPressMenuIndex(null);
                          }}
                          onResend={(content) => {
                            handleSendMessage(content);
                            setLongPressMenuIndex(null);
                          }}
                          onThinkDeeper={(originalResponse) => {
                            const thinkDeeperPrompt = `I'd like you to think more deeply about your last response. Can you expand on this with more detail, nuance, or alternative perspectives?\n\nYour previous response was: "${originalResponse.slice(0, 300)}${originalResponse.length > 300 ? '...' : ''}"`;
                            handleSendMessage(thinkDeeperPrompt);
                            setLongPressMenuIndex(null);
                          }}
                          onRegenerate={() => {
                            const allMsgs = [...messages, ...optimisticMessages];
                            const lastUserMsgIndex = allMsgs.map(m => m.role).lastIndexOf("user");
                            if (lastUserMsgIndex >= 0 && index > lastUserMsgIndex) {
                              const lastUserMsg = allMsgs[lastUserMsgIndex].content;
                              let prunedMessages: ChatMessage[];
                              if (isUserAuthenticated && activeDbConversation) {
                                prunedMessages = (activeDbConversation.messages as ChatMessage[]).filter((_, i) => i !== index);
                                queryClient.setQueryData<Conversation[]>(["/api/conversations"], (old) =>
                                  (old || []).map((c) =>
                                    c.id === activeDbConversation.id ? { ...c, messages: prunedMessages } : c
                                  )
                                );
                                updateDbConversationMutation.mutate({
                                  id: activeDbConversation.id,
                                  messages: prunedMessages,
                                });
                              } else {
                                prunedMessages = messages.filter((_, i) => i !== index);
                                const updated = deleteMessageFromConversation(index);
                                if (updated) {
                                  setActiveConversationState(updated);
                                }
                              }
                              handleSendMessage(lastUserMsg, prunedMessages);
                            }
                            setLongPressMenuIndex(null);
                          }}
                          isLoggedIn={!!user}
                        />
                      </div>
                      {message.role === "assistant" && index > 0 && (
                        <ChatFeedbackBar 
                          messageId={`msg-${index}`} 
                          onFeedback={handleFeedback} 
                        />
                      )}
                    </div>
                  </div>
                  );
                })}
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

        <div className="px-2 py-1 border-t dark:border-white/5 glass-subtle">
          <div className="max-w-2xl mx-auto space-y-1">
            {attachedFiles.length > 0 && (
              <div className="flex flex-wrap items-center gap-2 p-2 bg-muted rounded-lg text-sm">
                {isUploading ? (
                  <Loader2 className="w-4 h-4 text-muted-foreground shrink-0 animate-spin" />
                ) : (
                  <Paperclip className="w-4 h-4 text-muted-foreground shrink-0" />
                )}
                <span className="flex-1 truncate">
                  {isUploading 
                    ? "Uploading..."
                    : attachedFiles.length === 1 
                      ? attachedFiles[0].name 
                      : `${attachedFiles.length} files selected`}
                </span>
                {!isUploading && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 shrink-0"
                    onClick={() => setAttachedFiles([])}
                    data-testid="button-remove-attachment"
                  >
                    <X className="w-3 h-3" />
                  </Button>
                )}
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
                onClick={() => {
                  if (!user) {
                    toast({
                      title: "Account needed",
                      description: "Create an account to share files in chat.",
                    });
                    setLocation("/login");
                    return;
                  }
                  fileInputRef.current?.click();
                }}
                disabled={isUploading}
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
                className="resize-none min-h-[32px] max-h-20 rounded-xl py-1.5 text-sm"
                disabled={isTyping || isUploading}
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
                disabled={(!input.trim() && attachedFiles.length === 0) || isTyping || isUploading}
                className="rounded-full shrink-0"
                data-testid="button-send"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
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
                className="shrink-0"
              />
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
        onOpenChat={() => {
          setShowSoftOnboarding(false);
        }}
      />

      <ProfileSetupModal
        isOpen={showProfileSetup}
        onComplete={() => {
          setShowProfileSetup(false);
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
