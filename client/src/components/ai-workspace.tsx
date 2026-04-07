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
import { postProcessAssistantMessage } from "@/core/postProcessAssistantMessage";
import { shouldCaptureInsight, buildInsight, saveInsight, getInsights } from "@/core/conversationInsights";
import { isFeatureEnabled } from "@/config/featureFlags";
import { useDwIntelligence } from "@/hooks/use-dw-intelligence";
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
  getProfileSetup,
  saveProfileSetup,
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
  type FocusArea,
} from "@/lib/guest-storage";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { getEnergyContextForAPI } from "@/lib/energy-context";
import { useSystemPreferences, useScheduleEvents } from "@/hooks/use-systems-data";
import { getCosmicConsent } from "@/hooks/use-cosmic-consent";
import { GettingToKnowYouDialog } from "@/components/getting-to-know-you";
import { SoftOnboardingModal, type OnboardingMood } from "@/components/soft-onboarding-modal";
import { ProfileSetupModal } from "@/components/profile-setup-modal";
import { Link, useLocation } from "wouter";
import { COPY } from "@/copy/en";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  BookOpen,
  Pencil,
} from "lucide-react";
import { VoiceModeButton } from "@/components/voice-mode-button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { 
  trackEvent, 
  EVENTS, 
  markActivated, 
  isActivated, 
  wasNudgeShownToday, 
  markNudgeShownToday,
  getStreak,
  wasWeeklyRecapShown,
  markWeeklyRecapShown,
  getOpensThisWeek,
  wasNextStepShownToday,
  markNextStepShownToday,
  getLastPlanVisit,
} from "@/lib/analytics";
import {
  createTonightPlanBlock,
  createWeeklySkeleton,
  createNextBestStepObject,
  setHighlightNext,
  type NextStepRule,
} from "@/lib/momentum";
import {
  canSendMessage,
  incrementMessageCount,
  canStartNewSession,
  incrementSessionCount,
  FREE_LIMITS,
} from "@/lib/entitlement";
import type { UserProfile, Conversation } from "@shared/schema";

const FIRST_TIME_ACTIONS = [
  { id: "talk", text: "I want to talk", icon: MessageCircle, action: "talk" },
  { id: "decide", text: "Help me decide my day", icon: Calendar, action: "decide" },
  { id: "calm", text: "Calm my body", icon: Wind, action: "breathing" },
  { id: "unsure", text: "I'm not sure", icon: HelpCircle, action: "unsure" },
];

const READBACK_COUNT_OPTIONS = [5, 10, 20] as const;
type ReadbackCount = (typeof READBACK_COUNT_OPTIONS)[number];

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
  const { logout } = useAuth();
  const [location, setLocation] = useLocation();
  useTutorialStart("chat", 1500);
  const { state: tutorialState, hasSeenNavigationTutorial, startNavigationTutorial, requiresMenuOpen } = useTutorial();
  const { processConversation: processDwConversation } = useDwIntelligence();
  const [menuOpen, setMenuOpen] = useState(false);
  const [moreExpanded, setMoreExpanded] = useState(false);
  
  // Start navigation tutorial on first menu open (spotlight bubble style)
  // Close menu first so the first tutorial step (open menu) works correctly
  // Since we're closing the menu before starting tutorial, skipOpenMenuStep should be false
  useEffect(() => {
    if (menuOpen && !hasSeenNavigationTutorial() && !tutorialState.isActive) {
      // We're closing the menu, so user will need to open it again (Step 1 required)
      setMenuOpen(false);
      setTimeout(() => {
        startNavigationTutorial(false, false);
      }, 500);
    }
  }, [menuOpen, hasSeenNavigationTutorial, tutorialState.isActive, startNavigationTutorial]);
  
  // Auto-open menu when navigation tutorial requires it
  useEffect(() => {
    if (tutorialState.isActive && tutorialState.isNavigationTutorial && requiresMenuOpen && !menuOpen) {
      setMenuOpen(true);
    }
  }, [tutorialState.isActive, tutorialState.isNavigationTutorial, requiresMenuOpen, menuOpen]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [breathingPlayerOpen, setBreathingPlayerOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSoftOnboarding, setShowSoftOnboarding] = useState(false);
  const [showProfileSetup, setShowProfileSetup] = useState(false);
  const [readbackOpen, setReadbackOpen] = useState(false);
  const [readbackCount, setReadbackCount] = useState<ReadbackCount>(10);
  const [messageLimitReached, setMessageLimitReached] = useState(() => !canSendMessage());
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
  const welcomeMessageSentRef = useRef(false);
  const [quickChips, setQuickChips] = useState<string[]>([]);
  const proactiveOpenerSentRef = useRef(false);
  
  // Starter Block Spotlight state - tracks dismissal, re-read profile on render for visibility
  const [spotlightDismissed, setSpotlightDismissed] = useState(() => {
    const profile = getProfileSetup();
    return profile?.starterSpotlightDismissed ?? false;
  });
  
  // Compute spotlight visibility from live profile data each render
  const spotlightProfile = getProfileSetup();
  const shouldShowSpotlight = Boolean(
    spotlightProfile?.starterObjectId && 
    spotlightProfile?.focusArea && 
    !spotlightDismissed
  );
  
  // D2 Return Nudge state
  const [showNudge, setShowNudge] = useState(() => {
    // Show nudge if: not activated AND not shown today
    return !isActivated() && !wasNudgeShownToday();
  });
  
  const handleNudgeTonight = () => {
    markNudgeShownToday();
    setShowNudge(false);
    const result = createTonightPlanBlock();
    if (result) {
      setHighlightNext(result.id, result.type, result.routeToView);
      toast({ title: "Tonight is handled." });
      setLocation(result.routeToView);
    } else {
      setInput("Help me plan tonight. What do I need — time, focus, or energy?");
    }
  };
  
  const handleNudgeBuildWeek = () => {
    markNudgeShownToday();
    setShowNudge(false);
    const result = createWeeklySkeleton(false);
    if (result) {
      setHighlightNext(result.id, result.type, result.routeToView);
      toast({ title: "Week skeleton created." });
      setLocation(result.routeToView);
    } else {
      toast({ title: "Start here. I'll help shape it." });
      setLocation("/plans");
    }
  };
  
  const handleNudgeDismiss = () => {
    markNudgeShownToday();
    setShowNudge(false);
  };
  
  // D7 Streak (for activated users only)
  const userActivated = isActivated();
  const streak = userActivated ? getStreak() : 0;
  
  // Weekly Recap state (for activated users, once per week)
  // Track dismissed state locally, but derive visibility from current activation status
  const [weeklyRecapDismissed, setWeeklyRecapDismissed] = useState(false);
  const showWeeklyRecap = userActivated && !wasWeeklyRecapShown() && !weeklyRecapDismissed;
  const opensThisWeek = getOpensThisWeek();
  
  const handleRecapSimple = () => {
    markWeeklyRecapShown();
    setWeeklyRecapDismissed(true);
    const result = createWeeklySkeleton(true);
    if (result) {
      setHighlightNext(result.id, result.type, result.routeToView);
      toast({ title: "Done. I set it up." });
      setLocation(result.routeToView);
    } else {
      setInput("What's the one thing to protect this week?");
    }
  };
  
  const handleRecapStructure = () => {
    markWeeklyRecapShown();
    setWeeklyRecapDismissed(true);
    const result = createWeeklySkeleton(false);
    if (result) {
      setHighlightNext(result.id, result.type, result.routeToView);
      toast({ title: "Week skeleton created." });
      setLocation(result.routeToView);
    } else {
      toast({ title: "Let's build structure." });
      setLocation("/plans");
    }
  };
  
  const handleRecapDismiss = () => {
    markWeeklyRecapShown();
    setWeeklyRecapDismissed(true);
  };
  
  // Next Best Step state (for activated users, once per day)
  // Track dismissed state locally, but derive visibility from current activation status
  const [nextStepDismissed, setNextStepDismissed] = useState(false);
  const showNextStep = userActivated && !wasNextStepShownToday() && !nextStepDismissed;
  
  const getNextStepSuggestion = (): { title: string; rule: NextStepRule; action: () => void } => {
    const lastPlanVisit = getLastPlanVisit();
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysAgoKey = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, "0")}-${String(sevenDaysAgo.getDate()).padStart(2, "0")}`;
    
    if (!lastPlanVisit || lastPlanVisit < sevenDaysAgoKey) {
      return {
        title: "Build one block in Plan",
        rule: "plan",
        action: () => {
          markNextStepShownToday();
          setNextStepDismissed(true);
          const result = createNextBestStepObject("plan");
          if (result) {
            setHighlightNext(result.id, result.type, result.routeToView);
            toast({ title: "Done. I set it up." });
            setLocation(result.routeToView);
          } else {
            setLocation("/plans");
          }
        }
      };
    }
    
    if (streak < 3) {
      return {
        title: "Do a 2-minute reset",
        rule: "reset",
        action: () => {
          markNextStepShownToday();
          setNextStepDismissed(true);
          const result = createNextBestStepObject("reset");
          if (result) {
            setHighlightNext(result.id, result.type, result.routeToView);
            toast({ title: "Done. I set it up." });
            setLocation(result.routeToView);
          } else {
            setInput("Guide me through a quick 2-minute reset.");
          }
        }
      };
    }
    
    return {
      title: "Name one priority for today",
      rule: "priority",
      action: () => {
        markNextStepShownToday();
        setNextStepDismissed(true);
        const result = createNextBestStepObject("priority");
        if (result) {
          setHighlightNext(result.id, result.type, result.routeToView);
          toast({ title: "Done. I set it up." });
          setLocation(result.routeToView);
        } else {
          setInput("What's my one priority for today?");
        }
      }
    };
  };
  
  const nextStepSuggestion = showNextStep ? getNextStepSuggestion() : null;
  
  const handleNextStepDismiss = () => {
    markNextStepShownToday();
    setNextStepDismissed(true);
  };
  
  const handleDismissSpotlight = () => {
    const profile = getProfileSetup();
    trackEvent(EVENTS.STARTER_SPOTLIGHT_DISMISSED, {
      focusArea: profile?.focusArea || null,
    });
    saveProfileSetup({ starterSpotlightDismissed: true });
    setSpotlightDismissed(true);
  };
  
  const handleViewStarterBlock = () => {
    const profile = getProfileSetup();
    const focusArea = profile?.focusArea as FocusArea | undefined;
    
    // Validate prerequisites
    if (!profile?.starterObjectId || !focusArea) {
      toast({ title: "Setting up your starter block..." });
      handleDismissSpotlight();
      return;
    }
    
    // Route based on focusArea
    const routeMap: Record<FocusArea, string> = {
      body: "/plans",
      food: "/plans",
      mind: "/journal",
      money: "/plans",
      spirit: "/journal",
      work: "/plans",
    };
    
    const targetRoute = routeMap[focusArea];
    if (!targetRoute) {
      toast({ title: "Couldn't find your starter block" });
      handleDismissSpotlight();
      return;
    }
    
    trackEvent(EVENTS.STARTER_SPOTLIGHT_CLICKED, {
      focusArea,
      destinationRoute: targetRoute,
    });
    
    // Track first action (spotlight view clicked)
    markActivated({
      actionType: "spotlight_view_clicked",
      source: "chat",
      tsLocal: new Date().toISOString(),
    });
    
    toast({ title: COPY.starterSpotlight.toastOnView });
    saveProfileSetup({ starterSpotlightDismissed: true });
    setSpotlightDismissed(true);
    setLocation(targetRoute);
  };

  const { prefs: systemPrefs, isAuthenticated } = useSystemPreferences();
  const { events: scheduleEvents } = useScheduleEvents();

  useEffect(() => {
    // Don't show onboarding if a tutorial is currently active
    if (tutorialState.isActive) {
      return;
    }
    
    // Don't show soft onboarding if the navigation tutorial hasn't been seen yet
    // This means the tutorial is about to start - avoid popup overload
    if (!hasSeenNavigationTutorial()) {
      return;
    }
    
    // Show soft onboarding for returning users (who have completed the tutorial)
    if (shouldShowSoftOnboarding()) {
      markSoftOnboardingShownThisSession();
      setShowSoftOnboarding(true);
      return;
    }
    
    // After soft onboarding, show profile setup (Getting to Know You)
    // Only show after navigation tutorial is completed to avoid overwhelming
    if (hasSeenNavigationTutorial()) {
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

  // DW Intelligence (auto-generate insight + journal + follow-up after chat)
  const { processConversation: triggerDwProcessing } = useDwIntelligence();

  // Database conversations for authenticated users
  const { data: dbConversations = [], refetch: refetchDbConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
    enabled: isUserAuthenticated,
    staleTime: 10000,
  });

  // Active database conversation ID - initialize from localStorage for persistence
  const [activeDbConversationId, setActiveDbConversationId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      // Check for fresh param - clear ID to show empty state
      const params = new URLSearchParams(window.location.search);
      if (params.get("fresh") === "true") {
        localStorage.removeItem("dw_active_conversation_id");
        return null;
      }
      return localStorage.getItem("dw_active_conversation_id") || null;
    }
    return null;
  });

  // Persist active conversation ID to localStorage
  useEffect(() => {
    if (activeDbConversationId) {
      localStorage.setItem("dw_active_conversation_id", activeDbConversationId);
    }
  }, [activeDbConversationId]);

  // Initialize or validate activeDbConversationId from server data when conversations load
  useEffect(() => {
    if (!isUserAuthenticated) return;

    if (dbConversations.length > 0) {
      if (activeDbConversationId) {
        // Validate current ID exists in loaded conversations
        const idExists = dbConversations.some(c => c.id === activeDbConversationId);
        if (!idExists) {
          // Stale ID — auto-resume the most recent conversation instead
          const mostRecent = [...dbConversations].sort(
            (a, b) => new Date(b.lastMessageAt ?? b.createdAt ?? 0).getTime() - new Date(a.lastMessageAt ?? a.createdAt ?? 0).getTime()
          )[0];
          setActiveDbConversationId(mostRecent.id);
        }
      } else {
        // No active ID set — auto-resume the most recent conversation on sign-in
        const mostRecent = [...dbConversations].sort(
          (a, b) => new Date(b.lastMessageAt ?? b.createdAt ?? 0).getTime() - new Date(a.lastMessageAt ?? a.createdAt ?? 0).getTime()
        )[0];
        setActiveDbConversationId(mostRecent.id);
      }
    } else if (activeDbConversationId) {
      // No conversations exist — clear stale ID
      localStorage.removeItem("dw_active_conversation_id");
      setActiveDbConversationId(null);
    }
  }, [isUserAuthenticated, dbConversations]);

  // Get the active database conversation (no fallback to first - allow empty state)
  const activeDbConversation = activeDbConversationId 
    ? dbConversations.find(c => c.id === activeDbConversationId) || null
    : null;

  // Check if we should start fresh (from URL param or new session)
  const [startedFresh, setStartedFresh] = useState(() => {
    if (typeof window === "undefined") return true;
    // Check for fresh param before initializing
    const params = new URLSearchParams(window.location.search);
    if (params.get("fresh") === "true") {
      clearActiveConversation();
      localStorage.removeItem("dw_active_conversation_id");
      window.history.replaceState({}, "", "/chat");
      return true;
    }
    startFreshSession();
    const active = getActiveConversation();
    return !active || active.messages.length === 0;
  });
  
  // Use state for activeConversation so it updates when conversationVersion changes
  const [activeConversation, setActiveConversationState] = useState<GuestConversation | null>(() => {
    // If fresh param was set, return null to show empty state
    const params = new URLSearchParams(window.location.search);
    if (params.get("fresh") === "true") {
      return null;
    }
    return getActiveConversation();
  });
  
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
  
  // Track optimistic messages for authenticated users (user message added immediately, before AI responds)
  const [optimisticMessages, setOptimisticMessages] = useState<ChatMessage[]>([]);
  
  // Track the active streaming request to allow cancellation
  const activeStreamAbortController = useRef<AbortController | null>(null);
  const activeStreamConversationId = useRef<string | undefined>(undefined);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesStartRef = useRef<HTMLDivElement>(null);
  const [hasScrolledInitial, setHasScrolledInitial] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    initGuestData();
  }, []);

  // Auto-send welcome message after onboarding completion (only once)
  useEffect(() => {
    if (welcomeMessageSentRef.current) return; // Prevent double-fire in same session
    
    const profile = getProfileSetup();
    if (!profile || !profile.completedAt) return;
    if (profile.skipped) return; // User skipped quick setup - show blank chat
    if (profile.metDW) return; // Already met DW
    
    welcomeMessageSentRef.current = true; // Mark as sent before async operations

    // Intent-based welcome for users coming from the simple welcome.tsx onboarding
    const firstIntent = localStorage.getItem("dw_first_intent");
    if (!profile.scheduleType && firstIntent) {
      localStorage.removeItem("dw_first_intent");
      const userName = localStorage.getItem("dw_user_name");
      const greeting = userName ? `Hey ${userName}` : "Hey";

      const intentMessages: Record<string, string> = {
        stress: `${greeting} — glad you're here. This is DW, your wellness companion.\n\nYou said you want to work through some stress. Let's do that.\n\nTell me what's been weighing on you most — we'll start there and figure out what to move, drop, or shift.`,
        plan: `${greeting} — welcome. This is DW.\n\nYou said you want to make a plan. Good call. Let's build something real.\n\nWhat area of your life needs the most structure right now — work, health, finances, or something else?`,
        move: `${greeting} — welcome to DW.\n\nYou're here to get moving. I can help with that.\n\nWhat does your current activity look like, and what are you working toward? I'll put together something that actually fits your life.`,
        eat: `${greeting} — good to meet you. I'm DW.\n\nYou want to eat better — let's make that concrete.\n\nWhat's the biggest challenge for you right now: meal planning, knowing what to eat, staying consistent, or something else?`,
        talk: `${greeting} — welcome. I'm DW, and this is your space.\n\nNo agenda, no checklist. Just talk.\n\nWhat's on your mind?`,
      };
      const welcomeMsg = intentMessages[firstIntent] ?? `${greeting} — I'm DW. What's on your mind?`;
      const convo = createNewConversation();
      addMessageToConversation("assistant", welcomeMsg);
      setActiveConversation(convo.id);
      setActiveConversationState(getActiveConversation());
      setStartedFresh(false);
      setConversationVersion(v => v + 1);
      trackEvent(EVENTS.DW_FIRST_MESSAGE_SHOWN, { focusArea: firstIntent, scheduleType: null });
      saveProfileSetup({ metDW: true });
      return;
    }
    
    // Build personalized welcome message based on their setup
    const scheduleMap: Record<string, string> = {
      "9to5": "9-to-5",
      "nightShift": "night shift",
      "student": "student",
      "mixed": "mixed",
      "rebuilding": "rebuilding",
    };
    const focusMap: Record<string, string> = {
      "body": "body",
      "food": "food",
      "mind": "mind",
      "money": "money",
      "spirit": "spirit",
      "work": "work",
    };
    
    const schedule = profile.scheduleType ? scheduleMap[profile.scheduleType] || profile.scheduleType : "your";
    const focus = profile.focusArea ? focusMap[profile.focusArea] || profile.focusArea : "getting started";
    const busyDays = profile.busiestDays?.length > 0 
      ? profile.busiestDays.map(d => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d]).join("/")
      : "weekdays";
    
    // Use the tone-set welcome message from copy
    const welcomeMsg = COPY.dwChat.welcomeAfterSetup(schedule, busyDays, focus);
    
    // Create a new conversation with the welcome message
    const convo = createNewConversation();
    addMessageToConversation("assistant", welcomeMsg);
    setActiveConversation(convo.id);
    setActiveConversationState(getActiveConversation());
    setStartedFresh(false);
    setConversationVersion(v => v + 1);
    
    // Track first message shown
    trackEvent(EVENTS.DW_FIRST_MESSAGE_SHOWN, {
      focusArea: profile.focusArea || null,
      scheduleType: profile.scheduleType || null,
    });
    
    // Mark as having met DW so we don't repeat
    saveProfileSetup({ metDW: true });
  }, []);

  // Proactive DW opener for returning users — fires once per session when chat is empty
  useEffect(() => {
    if (proactiveOpenerSentRef.current) return;
    const profile = getProfileSetup();
    if (!profile?.metDW) return; // only for users who have already met DW
    if (!user) return; // only for authenticated users (needs the API)
    if (messages.length > 0 || optimisticMessages.length > 0) return; // skip if chat has content
    if (!startedFresh) return; // skip if resuming an existing conversation

    proactiveOpenerSentRef.current = true;
    fetch("/api/ai/proactive-opener", { credentials: "include" })
      .then(r => r.json())
      .then(({ message }: { message: string | null }) => {
        if (!message) return;
        // Only show if the conversation is still empty
        const conv = getActiveConversation();
        if (conv && conv.messages.length > 0) return;
        const newConv = createNewConversation();
        addMessageToConversation("assistant", message);
        setActiveConversation(newConv.id);
        setActiveConversationState(getActiveConversation());
        setStartedFresh(false);
        setConversationVersion(v => v + 1);
        // Chips for the opener
        fetchChips(message);
      })
      .catch(() => { /* silently ignore */ });
  }, [user, startedFresh]); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch quick-reply chip suggestions for a given DW message
  function fetchChips(dwMessage: string) {
    if (!user) return; // chips require auth
    fetch("/api/ai/chips", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: dwMessage }),
    })
      .then(r => r.json())
      .then(({ chips }: { chips: string[] }) => {
        if (Array.isArray(chips) && chips.length > 0) setQuickChips(chips);
      })
      .catch(() => { /* silently ignore */ });
  }

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
    // Combine messages and optimistic messages for scroll calculation
    const allMessages = [...messages, ...optimisticMessages];
    
    // For the first message (initial DW greeting), scroll to the top so user sees it
    // For subsequent messages, scroll to bottom
    if (allMessages.length === 1 && !hasScrolledInitial) {
      messagesStartRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      setHasScrolledInitial(true);
    } else if (allMessages.length > 1) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, optimisticMessages, conversationVersion, activeDbConversationId, hasScrolledInitial]);

  // Auto-save chat draft as user types (debounced)
  useEffect(() => {
    const timer = setTimeout(() => {
      saveChatDraft(input);
    }, 500);
    return () => clearTimeout(timer);
  }, [input]);

  // Prefill input from insight card "Continue with DW" (?insightId=<id>)
  // Tries sessionStorage first, falls back to localStorage insights list.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const insightId = params.get("insightId");
    if (insightId) {
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
      window.history.replaceState({}, "", "/chat");
    }
  }, []);

  // Re-check message limit on every navigation (user may have upgraded on /paywall)
  useEffect(() => {
    setMessageLimitReached(!canSendMessage());
  }, [location]);

  // Also re-check when the app becomes visible again or crosses local midnight
  useEffect(() => {
    const updateLimit = () => setMessageLimitReached(!canSendMessage());

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") updateLimit();
    };
    const handleFocus = () => updateLimit();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleFocus);

    // Schedule a one-time refresh at the next local midnight
    const now = new Date();
    const nextMidnight = new Date(now);
    nextMidnight.setHours(24, 0, 0, 0);
    const midnightTimer = window.setTimeout(updateLimit, nextMidnight.getTime() - now.getTime());

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleFocus);
      window.clearTimeout(midnightTimer);
    };
  }, []);

  const buildLifeSystemContext = () => {
    const guestContext = getLifeSystemContext();
    const mealPrefs = getMealPrepPreferences();
    const workoutPrefs = getWorkoutPreferences();
    const importedDocs = getImportedDocuments();

    // Onboarding preferences: pass name and voice vibe to the AI for personalization
    const userName = localStorage.getItem("dw_user_name") || undefined;
    const voiceVibe = localStorage.getItem("dw_voice_vibe") || undefined;
    
    return {
      preferences: {
        enabledSystems: systemPrefs.enabledSystems,
        meditationEnabled: systemPrefs.meditationEnabled,
        spiritualEnabled: systemPrefs.spiritualEnabled,
        journalingEnabled: systemPrefs.journalingEnabled,
        preferredWakeTime: systemPrefs.preferredWakeTime,
        preferredSleepTime: systemPrefs.preferredSleepTime,
      },
      ...(userName && { userName }),
      ...(voiceVibe && { voiceVibe }),
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
      
      // Cancel any existing stream before starting a new one
      if (activeStreamAbortController.current) {
        activeStreamAbortController.current.abort();
      }
      
      // Create new AbortController for this request
      const abortController = new AbortController();
      activeStreamAbortController.current = abortController;
      activeStreamConversationId.current = conversationId;
      
      // Include the user message we just added in the conversation history
      const currentMessages = messagesOverride 
        ? [...messagesOverride, userMsg]
        : isUserAuthenticated && activeDbConversation 
          ? [...(activeDbConversation.messages as ChatMessage[] || []), userMsg]
          : [...messages, userMsg];
      
      // For guests, add an empty assistant message to show streaming in progress
      if (!isUserAuthenticated) {
        addMessageToConversation("assistant", "");
        setConversationVersion(v => v + 1);
      }
      
      // Use streaming endpoint instead of smart endpoint
      const response = await fetch("/api/chat/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message,
          conversationHistory: currentMessages.slice(-10).filter(
            (m) => m.role === "user" || m.role === "assistant"
          ),
          userProfile: userProfile || undefined,
          lifeSystemContext: lifeContext,
          energyContext,
          cosmicConsent: getCosmicConsent(),
          documentIds: documentIds || [],
        }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        throw new Error("Failed to get streaming response");
      }

      // Handle Server-Sent Events (SSE) streaming
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = "";
      let metadata: { actionsTaken?: string[]; syncSessionId?: string } = {};
      let updateCounter = 0;
      const UPDATE_FREQUENCY = 3; // Update UI every 3 chunks to reduce re-renders

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                // Post-process the completed response (flag-gated, fail-safe)
                streamedResponse = postProcessAssistantMessage({
                  assistantText: streamedResponse,
                  userMessage: message,
                  conversationHistory: currentMessages,
                }).text;
                // Capture conversation insight if the flag is on and exchange is high-signal
                if (isFeatureEnabled("CONVERSATION_INSIGHTS") && streamedResponse) {
                  try {
                    if (shouldCaptureInsight({ userText: message, assistantText: streamedResponse })) {
                      saveInsight(buildInsight({
                        userText: message,
                        assistantText: streamedResponse,
                        source: {
                          surface: "main",
                          conversationId: conversationId ?? undefined,
                          messageTimestamp: Date.now(),
                        },
                      }));
                    }
                  } catch {
                    // Insight capture is non-critical – swallow any error
                  }
                }
                // DW Intelligence: process full conversation into insight + journal + follow-up
                // Gate behind the same high-signal check used for CONVERSATION_INSIGHTS to
                // avoid triggering on trivial exchanges. Non-blocking, fails silently.
                if (shouldCaptureInsight({ userText: message, assistantText: streamedResponse })) {
                  // currentMessages already includes userMsg (see construction above);
                  // append only the assistant response to avoid duplicating the user turn.
                  const allMsgs = [
                    ...currentMessages,
                    { role: "assistant" as const, content: streamedResponse },
                  ];
                  processDwConversation({
                    messages: allMsgs.map(m => ({ role: m.role, content: m.content })),
                    conversationId: conversationId ?? undefined,
                  }).catch(() => { /* non-critical */ });
                }
                // Final update with complete response
                // Only update if this conversation is still active
                if (isUserAuthenticated && activeStreamConversationId.current === conversationId) {
                  setOptimisticMessages([
                    userMsg,
                    { role: "assistant", content: streamedResponse, timestamp: Date.now() }
                  ]);
                } else if (!isUserAuthenticated) {
                  // For guests, check if we still have an active conversation before updating
                  const conv = getActiveConversation();
                  if (conv && conv.messages.length > 0) {
                    const lastMsg = conv.messages[conv.messages.length - 1];
                    // Only update if the last message is an assistant message (not aborted/switched)
                    if (lastMsg.role === "assistant" && lastMsg.content === "") {
                      lastMsg.content = streamedResponse;
                      setConversationVersion(v => v + 1);
                    }
                  }
                }
                break;
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  streamedResponse += parsed.content;
                  updateCounter++;
                  
                  // Update UI periodically, not on every chunk
                  if (updateCounter >= UPDATE_FREQUENCY) {
                    updateCounter = 0;
                    // Only update if this conversation is still active
                    if (isUserAuthenticated && activeStreamConversationId.current === conversationId) {
                      setOptimisticMessages([
                        userMsg,
                        { role: "assistant", content: streamedResponse, timestamp: Date.now() }
                      ]);
                    } else if (!isUserAuthenticated) {
                      // For guests, update the last assistant message in the conversation
                      const conv = getActiveConversation();
                      if (conv && conv.messages.length > 0) {
                        const lastMsg = conv.messages[conv.messages.length - 1];
                        // Only update if it's an assistant message that's being streamed (empty or partial)
                        if (lastMsg.role === "assistant") {
                          lastMsg.content = streamedResponse;
                          setConversationVersion(v => v + 1);
                        }
                      }
                    }
                  }
                } else if (parsed.metadata) {
                  metadata = parsed.metadata;
                } else if (parsed.error) {
                  throw new Error(parsed.error);
                }
              } catch (e) {
                console.error("Failed to parse SSE data:", e);
              }
            }
          }
        }
      } catch (error: any) {
        // If aborted, don't throw - just exit gracefully
        if (error.name === 'AbortError') {
          return { 
            data: { 
              response: "", 
              actionsTaken: [],
              syncSessionId: undefined 
            }, 
            userMsg, 
            conversationId, 
            messagesOverride,
            aborted: true
          };
        }
        throw error;
      }

      return { 
        data: { 
          response: streamedResponse, 
          actionsTaken: metadata.actionsTaken || [],
          syncSessionId: metadata.syncSessionId 
        }, 
        userMsg, 
        conversationId, 
        messagesOverride,
        aborted: false
      };
    },
    onSuccess: async ({ data, userMsg, conversationId, messagesOverride, aborted }) => {
      // If the request was aborted, don't process the results
      if (aborted) {
        setIsTyping(false);
        return;
      }
      
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
          // Clear optimistic messages after the conversation has been updated
          setOptimisticMessages([]);
        }
      }
      // For guests, the message was already added and updated during streaming
      // so we don't need to add it again here
      
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
        queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      }
      
      // Refresh sync session if items were created
      if (data.syncSessionId) {
        queryClient.invalidateQueries({ queryKey: ["/api/sync/sessions/active"] });
      }
      
      setIsTyping(false);
      setPendingDocumentIds([]);
      // Fetch quick-reply chips for the completed response (fire-and-forget)
      if (data.response) fetchChips(data.response);
    },
    onError: (error: any) => {
      // If the request was aborted (user switched conversations), don't show error toast
      if (error.name === 'AbortError') {
        setIsTyping(false);
        setPendingDocumentIds([]);
        return;
      }
      
      // Clear optimistic messages on error
      setOptimisticMessages([]);
      
      // Extract real error details to show the user
      const rawMsg: string = error?.message || String(error);
      // Strip the leading "NNN: " prefix that throwIfResNotOk adds
      const colonIdx = rawMsg.indexOf(": ");
      let body = colonIdx !== -1 ? rawMsg.slice(colonIdx + 2).trim() : rawMsg;
      let displayMsg = body;
      try {
        const parsed = JSON.parse(body) as Record<string, unknown>;
        if (typeof parsed?.error === "string") displayMsg = parsed.error;
        else if (typeof parsed?.message === "string") displayMsg = parsed.message;
      } catch { /* not JSON, use raw */ }
      
      const statusCode: number | null = (() => {
        if (typeof error?.status === "number") return error.status;
        const m = rawMsg.match(/^(\d{3}):/);
        return m ? parseInt(m[1], 10) : null;
      })();
      
      const isConnErr = statusCode === 401 || statusCode === 403 || displayMsg.toLowerCase().includes("no body") || displayMsg.toLowerCase().includes("unauthorized");
      toast({
        title: isConnErr ? "DW is offline" : (statusCode ? `Error ${statusCode}` : "Something went wrong"),
        description: isConnErr
          ? "Having trouble reaching DW right now. This is usually temporary — try again in a moment."
          : (displayMsg || "Please try again."),
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

    // Free-tier message gate
    if (!canSendMessage()) {
      setMessageLimitReached(true);
      saveChatDraft(input.trim());
      setLocation("/paywall?ctx=message_limit");
      return;
    }

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
    
    // Track first action (user manually sent a chat message)
    markActivated({
      actionType: "user_sent_first_chat",
      source: "chat",
      tsLocal: new Date().toISOString(),
    });

    // Count message toward daily limit and update UI based on entitlement logic
    incrementMessageCount();
    if (!canSendMessage()) {
      setMessageLimitReached(true);
    }
    
    chatMutation.mutate({ message: userMessage, userMsg, conversationId, documentIds, messagesOverride });
  };

  const handleSendMessage = async (message: string, messagesOverride?: ChatMessage[]) => {
    if (isTyping) return;
    setQuickChips([]); // clear chips whenever the user sends a message
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
        setLocation("/command-center");
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
    // Free-tier session gate
    if (!canStartNewSession()) {
      setLocation("/paywall?ctx=session_limit");
      return;
    }

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
    incrementSessionCount();
    setHistoryOpen(false);
  };

  const handleSelectConversation = (convo: GuestConversation | Conversation) => {
    if (isUserAuthenticated) {
      // Abort any active stream before switching conversations
      if (activeStreamAbortController.current) {
        activeStreamAbortController.current.abort();
        activeStreamAbortController.current = null;
        activeStreamConversationId.current = undefined;
      }
      
      setActiveDbConversationId(convo.id);
      // Clear optimistic messages when switching conversations
      setOptimisticMessages([]);
      // Reset scroll state for the new conversation
      setHasScrolledInitial(false);
    } else {
      // Abort any active stream for guest users too
      if (activeStreamAbortController.current) {
        activeStreamAbortController.current.abort();
        activeStreamAbortController.current = null;
        activeStreamConversationId.current = undefined;
      }
      
      setActiveConversation(convo.id);
      setConversationVersion(v => v + 1);
      // Reset scroll state for the new conversation
      setHasScrolledInitial(false);
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
    <div className="flex flex-col w-full bg-background gradient-bg-animated" style={{ height: '100dvh', paddingTop: 'max(env(safe-area-inset-top, 0px), 24px)' }}>
      {/* Sticky header - positioned under safe area */}
      <header className="shrink-0 bg-background z-50 flex flex-col items-center px-3 pt-3 pb-1">
        <div className="relative w-full flex items-center justify-center">
          {/* Left icons - absolute positioned */}
          <div className="absolute left-0 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setMenuOpen(true)}
              data-testid="button-menu"
              className="text-foreground"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
            >
              <Menu className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setHistoryOpen(true)}
              data-testid="button-history"
              className="text-foreground"
              aria-label="Open conversation history"
            >
              <MessageSquare className="h-6 w-6" aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNewConversation}
              data-testid="button-new-chat"
              className="text-foreground"
              aria-label="Start new conversation"
            >
              <Plus className="h-6 w-6" aria-hidden="true" />
            </Button>
          </div>
          
          {/* Centered brand name */}
          <span className="font-display font-semibold text-lg text-foreground leading-tight" data-testid="text-brand">DW.AI</span>
          
          {/* Right icons - absolute positioned */}
          <div className="absolute right-0 flex items-center gap-1.5">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setImportDialogOpen(true)}
              data-testid="button-import"
              className="text-foreground"
              aria-label="Import document"
            >
              <Upload className="h-6 w-6" aria-hidden="true" />
            </Button>
            <ThemeToggle />
          </div>
        </div>
        
        {/* Streak badge - separate row */}
        {userActivated && streak >= 2 && (
          <span className="text-xs text-foreground/60 bg-muted px-2 py-0.5 rounded-full mt-1" data-testid="text-streak">
            {streak} day streak
          </span>
        )}
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
        elevated={tutorialState.isActive && requiresMenuOpen}
      >
        <nav className="space-y-1 flex-1">
          {menuFeatures.filter(f => f.group !== "calendar").map((feature) => {
            const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
            
            if (feature.id === "life-dashboard") {
              return (
                <div key="life-dashboard-group" className="space-y-1">
                  <Link href={feature.path || "/"}>
                    <button
                      className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary`}
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${feature.id}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm text-foreground">{feature.name}</span>
                    </button>
                  </Link>
                  <details className="group">
                    <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="menu-calendar-dropdown">
                      <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <span className="text-sm flex-1 text-foreground">Calendar</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
                    </summary>
                    <div className="mt-1 space-y-1 ml-2">
                      <Link href="/command-center">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-today">
                          <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm text-foreground">Today</span>
                        </button>
                      </Link>
                      <Link href="/calendar">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-month">
                          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm text-foreground">Month</span>
                        </button>
                      </Link>
                      <Link href="/calendar?view=week">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-week">
                          <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm text-foreground">Week</span>
                        </button>
                      </Link>
                      <Link href="/routines">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-routines">
                          <History className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                          <span className="text-sm text-foreground">Routines</span>
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
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${feature.indent ? "ml-6" : ""}`}
                  onClick={() => setMenuOpen(false)}
                  data-testid={`menu-item-${feature.id}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="text-sm text-foreground">{feature.name}</span>
                </button>
              </Link>
            );
          })}
          
          <details 
            className="group" 
            onToggle={(e) => setMoreExpanded((e.target as HTMLDetailsElement).open)}
            data-testid="menu-more-details"
          >
            <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary" data-testid="menu-more-toggle">
              <LayoutGrid className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <span className="text-sm flex-1 text-foreground">More</span>
              <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-1 space-y-1 ml-2">
              {moreFeatures.map((feature) => {
                const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
                return (
                  <Link key={feature.path} href={feature.path || "/"}>
                    <button
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${feature.id}`}
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
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
            className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            onClick={() => {
              // Menu is already open when clicking this button inside the menu
              // Skip Step 1 ("Open Menu") and start at Step 2 (Life Dashboard)
              setMenuOpen(false);
              setTimeout(() => {
                startNavigationTutorial(true, true);
              }, 500);
            }}
            data-testid="button-start-tutorial"
          >
            <HelpCircle className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
            <span className="text-sm text-foreground">App Tour</span>
          </button>
          {user ? (
            <div className="space-y-2">
              <div className="px-2 py-1 text-xs text-muted-foreground truncate border-t pt-3">
                {user.firstName || user.systemName || user.username || user.email}
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm" 
                onClick={async () => {
                  localStorage.removeItem("dw_active_conversation_id");
                  await logout();
                  setMenuOpen(false);
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
        {messages.length === 0 ? (
          /* Landing view - exactly centered between header and input */
          <div className="flex-1 flex items-center justify-center px-4" style={{ marginBottom: '120px' }}>
            <div className="max-w-2xl mx-auto flex flex-col items-center justify-center space-y-4">
              <div className="text-center">
                <h1 className="text-lg font-display font-semibold text-foreground" data-testid="text-greeting">
                  {greeting}
                </h1>
                <p className="text-foreground/70 text-sm">
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
                      className="flex flex-col items-center gap-1 p-3 rounded-xl border bg-card glass dark:border-white/10 hover-elevate text-center transition-shadow focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      data-testid={`button-action-${action.id}`}
                    >
                      <Icon className="h-3 w-3 text-foreground/60" aria-hidden="true" />
                      <span className="text-xs text-foreground/80">{action.text}</span>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => handleFirstTimeAction("lifesystem")}
                className="w-full max-w-xs px-4 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-sm hover-elevate active-elevate-2 flex items-center justify-center gap-2 glow-purple-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                data-testid="button-action-lifesystem"
              >
                <LayoutGrid className="h-4 w-4" aria-hidden="true" />
                Build my life system
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setHistoryOpen(true)}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                  data-testid="button-view-history"
                >
                  <History className="h-3 w-3" aria-hidden="true" />
                  History
                </button>
                <Link href="/daily-schedule">
                  <button className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded" data-testid="link-today">
                    Today's schedule
                  </button>
                </Link>
              </div>
            </div>
          </div>
        ) : (
        <ScrollArea className="flex-1 px-4">
          <div className="max-w-2xl mx-auto py-1">
            {/* Read back messages button — visible when conversation has enough messages */}
            {messages.length >= 3 && (
              <div className="flex justify-end mb-1">
                <button
                  onClick={() => setReadbackOpen(true)}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors py-1 px-2 rounded-lg hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  data-testid="button-readback"
                >
                  <BookOpen className="h-3 w-3" aria-hidden="true" />
                  Read back
                </button>
              </div>
            )}
            {/* D2 Return Nudge Card - shows once per day for non-activated users (only when there are messages) */}
            {messages.length > 0 && showNudge && !shouldShowSpotlight && (
              <Card className="mb-2 border-accent/20 bg-accent/5" data-testid="card-d2-nudge">
                <CardContent className="p-2.5 space-y-1.5">
                  <div className="flex flex-col gap-2">
                    <div>
                      <h3 className="font-medium text-sm" data-testid="text-nudge-title">
                        Quick check.
                      </h3>
                      <p className="text-xs text-muted-foreground" data-testid="text-nudge-body">
                        Pick one thing. I'll shape the next step.
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        onClick={handleNudgeTonight}
                        data-testid="button-nudge-tonight"
                      >
                        Help me with tonight
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={handleNudgeBuildWeek}
                        data-testid="button-nudge-week"
                      >
                        Build my week
                      </Button>
                      <button
                        onClick={handleNudgeDismiss}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        data-testid="button-nudge-dismiss"
                      >
                        Not today
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Weekly Recap Card - once per week for activated users (only when there are messages) */}
            {messages.length > 0 && showWeeklyRecap && userActivated && !showNudge && !shouldShowSpotlight && (
              <Card className="mb-2 border-primary/20 bg-primary/5" data-testid="card-weekly-recap">
                <CardContent className="p-2.5 space-y-1.5">
                  <div className="flex flex-col gap-2">
                    <div>
                      <h3 className="font-medium text-sm" data-testid="text-recap-title">
                        Your week at a glance
                      </h3>
                      <p className="text-xs text-muted-foreground" data-testid="text-recap-body">
                        You showed up {opensThisWeek} {opensThisWeek === 1 ? "day" : "days"}. Want to keep it simple or build structure?
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button 
                        size="sm" 
                        onClick={handleRecapSimple}
                        data-testid="button-recap-simple"
                      >
                        Keep it simple
                      </Button>
                      <Button 
                        variant="outline"
                        size="sm" 
                        onClick={handleRecapStructure}
                        data-testid="button-recap-structure"
                      >
                        Build structure
                      </Button>
                      <button
                        onClick={handleRecapDismiss}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors ml-auto focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        data-testid="button-recap-dismiss"
                      >
                        Not now
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Next Best Step Card - once per day for activated users (only when there are messages) */}
            {messages.length > 0 && showNextStep && userActivated && nextStepSuggestion && !showWeeklyRecap && !showNudge && !shouldShowSpotlight && (
              <Card className="mb-2 border-muted bg-muted/30 text-foreground" data-testid="card-next-step">
                <CardContent className="p-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-muted-foreground">Today's suggestion</p>
                      <p className="text-sm font-medium text-foreground" data-testid="text-next-step">
                        {nextStepSuggestion.title}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button 
                        size="sm" 
                        onClick={nextStepSuggestion.action}
                        data-testid="button-next-step-action"
                      >
                        Let's go
                      </Button>
                      <button
                        onClick={handleNextStepDismiss}
                        className="text-xs text-muted-foreground hover:text-foreground transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"
                        data-testid="button-next-step-dismiss"
                      >
                        Skip
                      </button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
            
            {/* Starter Block Spotlight Card (only when there are messages) */}
            {messages.length > 0 && shouldShowSpotlight && (() => {
              const focusArea = spotlightProfile?.focusArea as FocusArea | null;
              if (!focusArea) return null;
              
              return (
                <Card className="mb-2 border-primary/20 bg-primary/5" data-testid="card-starter-spotlight">
                  <CardContent className="p-2.5 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm" data-testid="text-spotlight-title">
                          {COPY.starterSpotlight.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-2" data-testid="text-spotlight-body">
                          {COPY.starterSpotlight.bodyByFocus[focusArea]}
                        </p>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button 
                          size="sm" 
                          onClick={handleViewStarterBlock}
                          data-testid="button-spotlight-view"
                        >
                          View
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={handleDismissSpotlight}
                          data-testid="button-spotlight-dismiss"
                        >
                          Later
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })()}
            
            <div className="space-y-6">
              <div ref={messagesStartRef} />
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
                  <article
                    key={index}
                    className={`group ${
                      message.role === "user" 
                        ? "border-l-4 border-primary/40 pl-4 py-2" 
                        : ""
                    }`}
                    data-testid={`message-${index}`}
                  >
                    {message.role === "user" ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 group/usermsg">
                          <p className="text-xs uppercase tracking-wider font-medium text-muted-foreground">You</p>
                          <button
                            data-testid={`button-edit-message-${index}`}
                            className="opacity-0 group-hover/usermsg:opacity-100 transition-opacity text-muted-foreground hover:text-foreground p-0.5 rounded"
                            title="Edit message"
                            onClick={() => {
                              setEditingMessageIndex(index);
                              setInput(message.content);
                              inputRef.current?.focus();
                            }}
                          >
                            <Pencil className="h-3 w-3" />
                          </button>
                        </div>
                        <div
                          className="cursor-pointer select-none"
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
                          <p className="font-body text-sm leading-relaxed text-foreground/90 whitespace-pre-line break-words">
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
                    ) : (
                      <div className="space-y-3">
                        {index === 0 && (
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <Heart className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-sm font-medium text-foreground">DW</p>
                          </div>
                        )}
                        <div 
                          className="prose prose-sm dark:prose-invert max-w-none cursor-pointer select-none"
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
                          <p className="font-body text-sm leading-relaxed text-foreground whitespace-pre-line break-words">
                            {message.content}
                          </p>
                        </div>
                        {index > 0 && (
                          <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                            <ChatFeedbackBar 
                              messageId={`msg-${index}`} 
                              onFeedback={handleFeedback} 
                            />
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
                        )}
                      </div>
                    )}
                  </article>
                  );
                })}
                {/* Quick-reply chips — shown after the last DW message, hidden while typing */}
                {!isTyping && quickChips.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1 pb-2">
                    {quickChips.map((chip, i) => (
                      <button
                        key={i}
                        data-testid={`chip-reply-${i}`}
                        onClick={() => {
                          setInput("");
                          handleSendMessage(chip);
                        }}
                        className="text-xs px-3 py-1.5 rounded-full border border-border/70 bg-background hover:bg-muted/60 active:scale-95 transition-all text-foreground/80 hover:text-foreground"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}
                {isTyping && (
                  <article className="flex items-center gap-3 py-3">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-sm text-muted-foreground">Thinking...</span>
                  </article>
                )}
                <div ref={messagesEndRef} />
              </div>
          </div>
        </ScrollArea>
        )}

        <div className="fixed left-0 right-0 px-2 py-2 bg-background z-40" style={{ bottom: 'calc(3.5rem + max(env(safe-area-inset-bottom, 0px), 32px) + 12px)' }}>
          <div className="max-w-2xl mx-auto space-y-1">
            {/* Message-limit inline upsell */}
            {messageLimitReached && (
              <div
                role="alert"
                aria-live="polite"
                className="rounded-xl border border-primary/30 bg-primary/5 px-3 py-2.5 flex items-center justify-between gap-3"
                data-testid="card-message-limit"
              >
                <p className="text-xs text-muted-foreground leading-snug">
                  You've reached today's {FREE_LIMITS.messagesPerDay}-message limit.
                </p>
                <Button
                  size="sm"
                  className="shrink-0 h-7 text-xs"
                  onClick={() => setLocation("/paywall?ctx=message_limit")}
                  data-testid="button-upgrade-inline"
                >
                  DW Plus
                </Button>
              </div>
            )}
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
                    aria-label="Remove attachment"
                  >
                    <X className="w-3 h-3" aria-hidden="true" />
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
                aria-label="Attach file"
              >
                <Paperclip className="w-4 h-4 text-foreground" aria-hidden="true" />
              </Button>
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Type a message… tap ↑ to send"
                className="resize-none [min-height:36px] max-h-40 rounded-xl py-2 px-3 text-sm"
                rows={1}
                disabled={isTyping || isUploading}
                aria-label="Message input"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                    e.preventDefault();
                    handleSend();
                  }
                  // Plain Enter = new line (default textarea behavior — do not intercept)
                }}
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={(!input.trim() && attachedFiles.length === 0) || isTyping || isUploading || messageLimitReached}
                className="rounded-full shrink-0"
                data-testid="button-send"
                aria-label="Send message"
              >
                {isUploading ? <Loader2 className="w-4 h-4 animate-spin text-foreground" aria-hidden="true" /> : <Send className="w-4 h-4 text-foreground" aria-hidden="true" />}
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
        onComplete={(startTutorial) => {
          setShowProfileSetup(false);
          if (startTutorial) {
            // Start the navigation tutorial after a short delay for modal to close
            setTimeout(() => {
              startNavigationTutorial(true, false);
            }, 500);
          }
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

      {/* Read back messages — visual condensed transcript, no TTS */}
      <Dialog open={readbackOpen} onOpenChange={setReadbackOpen}>
        <DialogContent className="max-w-lg max-h-[80vh] flex flex-col" data-testid="dialog-readback">
          <DialogHeader>
            <DialogTitle className="text-base font-display">Read back</DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-2 text-xs text-muted-foreground pb-2 border-b">
            <span>Show last</span>
            {READBACK_COUNT_OPTIONS.map((n) => (
              <button
                key={n}
                onClick={() => setReadbackCount(n)}
                aria-pressed={readbackCount === n}
                className={`px-2 py-0.5 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  readbackCount === n
                    ? "border-primary bg-primary/10 text-primary font-medium"
                    : "border-border hover:bg-muted/50"
                }`}
                data-testid={`readback-count-${n}`}
              >
                {n}
              </button>
            ))}
            <span>messages</span>
          </div>
          <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1">
            {[...messages, ...optimisticMessages]
              .slice(-readbackCount)
              .map((msg, i) => (
                <div
                  key={i}
                  className={`flex flex-col gap-0.5 ${msg.role === "user" ? "items-end" : "items-start"}`}
                  data-testid={`readback-message-${i}`}
                >
                  <span className="text-[10px] uppercase tracking-wider font-medium text-muted-foreground">
                    {msg.role === "user" ? "You" : "DW"}
                  </span>
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "bg-primary/10 text-foreground"
                        : "bg-muted text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
