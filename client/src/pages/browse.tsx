import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { PageHeader } from "@/components/page-header";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTutorialStart } from "@/contexts/tutorial-context";
import {
  Play,
  Clock,
  Dumbbell,
  Brain,
  Heart,
  Utensils,
  Sun,
  Filter,
  Sparkles,
  Loader2,
  X,
  Wand2,
  Users,
  MessageCircle,
  ThumbsUp,
  ThumbsDown,
  MapPin,
  Search,
  ExternalLink,
  Star,
  Phone,
  Globe,
  ChevronRight,
  Calendar,
  Plus,
  Bookmark,
  Compass,
  Youtube,
  FileText,
  Check,
  Trash2,
  Video,
  Zap,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { WellnessContent, UserProfile, SavedContent } from "@shared/schema";
import { ExploreFeedCard } from "@/components/explore-feed-card";
import { TopicSuggestionCard } from "@/components/topic-suggestion-card";
import type { ExploreFeedContentType } from "@/components/explore-feed-card";
import { COPY } from "@/copy/en";

/**
 * Validates that a URL is safe to open externally.
 * Only https: URLs with a parseable hostname are allowed — prevents
 * javascript: / data: injection from AI-provided or backend content.
 */
function isSafeExternalUrl(url: unknown): url is string {
  if (typeof url !== "string" || !url) return false;
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" && !!parsed.hostname;
  } catch {
    return false;
  }
}

const CONTENT_CATEGORIES = [
  { id: "workout", name: "Workouts", icon: Dumbbell },
  { id: "meditation", name: "Meditation", icon: Brain },
  { id: "nutrition", name: "Nutrition", icon: Utensils },
  { id: "mindfulness", name: "Mindfulness", icon: Sun },
  { id: "recovery", name: "Recovery", icon: Heart },
  { id: "article", name: "Articles", icon: FileText },
  { id: "blog", name: "Blog", icon: FileText },
];

// ── Time helpers ─────────────────────────────────────────────────────────────
function getTimeSlot(): "morning" | "late-morning" | "afternoon" | "evening" | "night" {
  const h = new Date().getHours();
  if (h >= 5 && h < 9)   return "morning";
  if (h >= 9 && h < 12)  return "late-morning";
  if (h >= 12 && h < 17) return "afternoon";
  if (h >= 17 && h < 21) return "evening";
  return "night";
}
function getTimeGreeting(): string {
  const slot = getTimeSlot();
  if (slot === "morning" || slot === "late-morning") return "Good morning";
  if (slot === "afternoon") return "Good afternoon";
  if (slot === "evening") return "Good evening";
  return "Good night";
}
function getDayName(): string {
  return ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"][new Date().getDay()];
}

// Minimal static fallback for the "All" tab (real content comes from APIs)
const SAMPLE_CONTENT = [
  {
    id: "1",
    title: "Morning Energy Flow",
    description: "Start your day with gentle movement to wake up body and mind",
    contentType: "workout",
    category: "workout",
    duration: 15,
    difficulty: "beginner",
    goalTags: ["energy", "mobility"],
    moodTags: ["tired", "scattered"],
    thumbnailUrl: "/api/placeholder/workout-morning",
  },
  {
    id: "2",
    title: "Calm Mind Meditation",
    description: "A guided session to reduce anxiety and find inner peace",
    contentType: "meditation",
    category: "meditation",
    duration: 10,
    difficulty: "beginner",
    goalTags: ["stress-relief", "focus"],
    moodTags: ["anxious", "overwhelmed"],
    thumbnailUrl: "/api/placeholder/meditation-calm",
  },
  {
    id: "3",
    title: "Strength Builder",
    description: "Full body workout to build muscle and confidence",
    contentType: "workout",
    category: "workout",
    duration: 30,
    difficulty: "intermediate",
    goalTags: ["muscle-gain", "strength"],
    moodTags: ["motivated", "energetic"],
    thumbnailUrl: "/api/placeholder/workout-strength",
  },
  {
    id: "4",
    title: "Sleep Preparation",
    description: "Wind down routine to prepare for restful sleep",
    contentType: "meditation",
    category: "meditation",
    duration: 20,
    difficulty: "beginner",
    goalTags: ["sleep", "relaxation"],
    moodTags: ["tired", "restless"],
    thumbnailUrl: "/api/placeholder/meditation-sleep",
  },
  {
    id: "5",
    title: "Quick HIIT",
    description: "High intensity interval training for busy schedules",
    contentType: "workout",
    category: "workout",
    duration: 12,
    difficulty: "advanced",
    goalTags: ["fat-loss", "endurance"],
    moodTags: ["energetic", "motivated"],
    thumbnailUrl: "/api/placeholder/workout-hiit",
  },
  {
    id: "6",
    title: "Gratitude Practice",
    description: "Cultivate appreciation and positive mindset",
    contentType: "mindfulness",
    category: "mindfulness",
    duration: 8,
    difficulty: "beginner",
    goalTags: ["mental-health", "positivity"],
    moodTags: ["low", "neutral"],
    thumbnailUrl: "/api/placeholder/mindfulness-gratitude",
  },
  {
    id: "7",
    title: "Yoga for Flexibility",
    description: "Gentle yoga flow focused on improving flexibility and reducing tension",
    contentType: "workout",
    category: "workout",
    duration: 25,
    difficulty: "beginner",
    goalTags: ["flexibility", "stress-relief"],
    moodTags: ["tense", "stressed"],
    thumbnailUrl: "/api/placeholder/workout-yoga",
  },
  {
    id: "8",
    title: "Focus Boost",
    description: "Quick meditation to enhance concentration and mental clarity",
    contentType: "meditation",
    category: "meditation",
    duration: 8,
    difficulty: "beginner",
    goalTags: ["focus", "productivity"],
    moodTags: ["scattered", "distracted"],
    thumbnailUrl: "/api/placeholder/meditation-focus",
  },
  {
    id: "9",
    title: "Core Conditioning",
    description: "Targeted core workout for building strength and stability",
    contentType: "workout",
    category: "workout",
    duration: 20,
    difficulty: "intermediate",
    goalTags: ["strength", "core"],
    moodTags: ["motivated", "focused"],
    thumbnailUrl: "/api/placeholder/workout-core",
  },
  {
    id: "10",
    title: "Mindful Walking",
    description: "Transform a simple walk into a moving meditation",
    contentType: "mindfulness",
    category: "mindfulness",
    duration: 20,
    difficulty: "beginner",
    goalTags: ["stress-relief", "presence"],
    moodTags: ["restless", "scattered"],
    thumbnailUrl: "/api/placeholder/mindfulness-walking",
  },
  {
    id: "11",
    title: "Evening Wind Down",
    description: "Gentle movement to release tension and prepare for sleep",
    contentType: "workout",
    category: "workout",
    duration: 15,
    difficulty: "beginner",
    goalTags: ["sleep", "relaxation"],
    moodTags: ["tired", "tense"],
    thumbnailUrl: "/api/placeholder/workout-evening",
  },
  {
    id: "12",
    title: "Body Scan Relaxation",
    description: "Deep relaxation through systematic body awareness",
    contentType: "meditation",
    category: "meditation",
    duration: 15,
    difficulty: "beginner",
    goalTags: ["stress-relief", "relaxation"],
    moodTags: ["tense", "overwhelmed"],
    thumbnailUrl: "/api/placeholder/meditation-body-scan",
  },
  {
    id: "13",
    title: "Breathing Space",
    description: "Quick mindfulness exercise to create calm in busy moments",
    contentType: "mindfulness",
    category: "mindfulness",
    duration: 5,
    difficulty: "beginner",
    goalTags: ["stress-relief", "presence"],
    moodTags: ["overwhelmed", "anxious"],
    thumbnailUrl: "/api/placeholder/mindfulness-breathing",
  },
  {
    id: "14",
    title: "Foam Rolling Recovery",
    description: "Self-myofascial release to reduce muscle soreness",
    contentType: "recovery",
    category: "recovery",
    duration: 15,
    difficulty: "beginner",
    goalTags: ["recovery", "mobility"],
    moodTags: ["sore", "tired"],
    thumbnailUrl: "/api/placeholder/recovery-foam-rolling",
  },
  {
    id: "15",
    title: "Active Recovery Flow",
    description: "Light movement to promote blood flow and reduce soreness",
    contentType: "recovery",
    category: "recovery",
    duration: 20,
    difficulty: "beginner",
    goalTags: ["recovery", "mobility"],
    moodTags: ["sore", "low-energy"],
    thumbnailUrl: "/api/placeholder/recovery-active",
  },
  {
    id: "16",
    title: "Meal Prep Basics",
    description: "Learn efficient strategies for weekly meal preparation",
    contentType: "nutrition",
    category: "nutrition",
    duration: 45,
    difficulty: "beginner",
    goalTags: ["nutrition", "time-management"],
    moodTags: ["motivated", "organized"],
    thumbnailUrl: "/api/placeholder/nutrition-meal-prep",
  },
  {
    id: "17",
    title: "Hydration Challenge",
    description: "Build the habit of drinking enough water daily",
    contentType: "nutrition",
    category: "nutrition",
    duration: 10,
    difficulty: "beginner",
    goalTags: ["nutrition", "habits"],
    moodTags: ["tired", "low-energy"],
    thumbnailUrl: "/api/placeholder/nutrition-hydration",
  },
  {
    id: "18",
    title: "Restorative Yoga",
    description: "Deeply relaxing yoga practice using props to support the body",
    contentType: "recovery",
    category: "recovery",
    duration: 30,
    difficulty: "beginner",
    goalTags: ["recovery", "relaxation"],
    moodTags: ["exhausted", "stressed"],
    thumbnailUrl: "/api/placeholder/recovery-restorative",
  },
  // Article-type content – ensures the Articles tab always has content
  {
    id: "19",
    title: "10 Habits That Actually Stick",
    description: "Science-backed strategies for building routines that last beyond 30 days",
    contentType: "article",
    category: "article",
    duration: 7,
    difficulty: "beginner",
    goalTags: ["habits", "consistency", "mental-health"],
    moodTags: ["motivated", "curious"],
    thumbnailUrl: "/api/placeholder/article-habits",
  },
  {
    id: "20",
    title: "The Gut-Brain Connection",
    description: "How what you eat directly influences your mood, focus, and energy levels",
    contentType: "article",
    category: "article",
    duration: 8,
    difficulty: "beginner",
    goalTags: ["nutrition", "mental-health", "energy"],
    moodTags: ["curious", "low-energy"],
    thumbnailUrl: "/api/placeholder/article-gut-brain",
  },
  {
    id: "21",
    title: "Rest Is Productive: Why Recovery Matters",
    description: "Reframe your relationship with rest and learn why downtime fuels long-term performance",
    contentType: "article",
    category: "article",
    duration: 6,
    difficulty: "beginner",
    goalTags: ["recovery", "mental-health", "stress-relief"],
    moodTags: ["overwhelmed", "tired"],
    thumbnailUrl: "/api/placeholder/article-recovery",
  },
  {
    id: "22",
    title: "Morning Sunlight & Your Circadian Rhythm",
    description: "A simple daily habit that sets your biological clock, improves sleep, and boosts mood",
    contentType: "article",
    category: "article",
    duration: 5,
    difficulty: "beginner",
    goalTags: ["sleep", "energy", "habits"],
    moodTags: ["tired", "scattered"],
    thumbnailUrl: "/api/placeholder/article-sunlight",
  },
  {
    id: "23",
    title: "Breathing Techniques for Instant Calm",
    description: "Four evidence-based breathing patterns you can use anywhere to reduce stress",
    contentType: "blog",
    category: "blog",
    duration: 5,
    difficulty: "beginner",
    goalTags: ["stress-relief", "focus", "mindfulness"],
    moodTags: ["anxious", "overwhelmed"],
    thumbnailUrl: "/api/placeholder/blog-breathing",
  },
  {
    id: "24",
    title: "Understanding Your Energy Levels",
    description: "Map your personal energy peaks and valleys to do your best work at the right time",
    contentType: "article",
    category: "article",
    duration: 9,
    difficulty: "beginner",
    goalTags: ["productivity", "energy", "self-awareness"],
    moodTags: ["scattered", "low-energy"],
    thumbnailUrl: "/api/placeholder/article-energy",
  },
  {
    id: "25",
    title: "Anti-Inflammatory Eating Made Simple",
    description: "Practical nutrition shifts to reduce chronic inflammation without a total diet overhaul",
    contentType: "article",
    category: "nutrition",
    duration: 10,
    difficulty: "beginner",
    goalTags: ["nutrition", "recovery", "habits"],
    moodTags: ["motivated", "sore"],
    thumbnailUrl: "/api/placeholder/article-nutrition",
  },
];


interface LocalResource {
  title: string;
  description: string;
  category: string;
  rating?: number;
  address?: string;
  phone?: string;
  website?: string;
  aiSuggested?: boolean;
  aiReason?: string;
}

const FOR_YOU_PAGE_SIZE = 9;

export default function Browse() {
  useTutorialStart("browse", 1000);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"for-you" | "video" | "articles" | "all" | "saved" | "community">("for-you");
  const [communityCategory, setCommunityCategory] = useState<"groups" | "feed" | "local">("groups");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lengthFilter, setLengthFilter] = useState<"short" | "medium" | "long" | null>(null);
  const [topicFilter, setTopicFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<string[] | null>(null);
  const [localSearchQuery, setLocalSearchQuery] = useState("");
  const [localResources, setLocalResources] = useState<LocalResource[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedContent, setSelectedContent] = useState<WellnessContent | typeof SAMPLE_CONTENT[0] | null>(null);
  const [contentDetailOpen, setContentDetailOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchDialogType, setSearchDialogType] = useState<"youtube" | "articles" | "exercises">("youtube");
  const [externalSearchQuery, setExternalSearchQuery] = useState("");
  const [externalSearchResults, setExternalSearchResults] = useState<Array<{
    id: string;
    type: string;
    source: string;
    title: string;
    description: string;
    thumbnail?: string;
    duration?: string;
    url: string;
    metadata?: any;
  }>>([]);
  const [isExternalSearching, setIsExternalSearching] = useState(false);
  // Not Interested - track locally for immediate UI feedback
  const [notInterestedUrls, setNotInterestedUrls] = useState<Set<string>>(new Set());
  // Add to Schedule dialog state
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [scheduleContent, setScheduleContent] = useState<{ title: string; url: string; type: string } | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  // "Apply this?" guardrail – show prompt after user has seen feedSeenCount items
  const [feedSeenCount, setFeedSeenCount] = useState(0);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const APPLY_PROMPT_THRESHOLD = 5;

  // Reset local resources when switching away from local tab
  useEffect(() => {
    if (communityCategory !== "local") {
      setLocalResources([]);
      setLocalSearchQuery("");
      setIsSearching(false);
    }
  }, [communityCategory]);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: dbContent } = useQuery<WellnessContent[]>({
    queryKey: ["/api/wellness-content"],
  });

  // For You tab: AI suggestions (topic keywords)
  const { data: suggestionsData, isLoading: suggestionsLoading } = useQuery<{ suggestions: any[] }>({
    queryKey: ["/api/explore/suggestions"],
    staleTime: 5 * 60 * 1000,
    enabled: activeTab === "for-you",
  });

  // For You + Video tab: real time-aware content via Perplexity
  const timeSlotNow = getTimeSlot();
  const dayNameNow = getDayName();
  const { data: forYouData, isLoading: forYouLoading } = useQuery<{
    videos: Array<{ id: string; title: string; description: string; url: string; channel: string; duration: string; category: string }>;
    articles: Array<{ id: string; title: string; synopsis: string; url: string; source: string; readTimeMinutes: number; whySuggested: string }>;
    workouts: Array<{ id: string; title: string; description: string; url: string; duration: string; difficulty: string }>;
    meal: { id: string; title: string; description: string; url: string; prepTime: string } | null;
    timeSlot: string;
    dayName: string;
    timeLabel: string;
  }>({
    queryKey: ["/api/browse/for-you", timeSlotNow, dayNameNow],
    staleTime: 30 * 60 * 1000, // 30 min — re-fetches when time slot changes
    enabled: activeTab === "for-you" || activeTab === "video",
  });

  // Saved tab: Saved content
  const { data: savedContent, isLoading: savedLoading } = useQuery<SavedContent[]>({
    queryKey: ["/api/saved-content"],
    enabled: activeTab === "saved",
  });

  // Articles tab: AI-curated real articles — refreshes when time slot changes
  const { data: aiArticlesData, isLoading: aiArticlesLoading } = useQuery<{
    articles: Array<{
      id: string;
      title: string;
      synopsis: string;
      whySuggested: string;
      url: string;
      category: string;
      readTimeMinutes: number;
    }>;
    aiGenerated: boolean;
  }>({
    queryKey: ["/api/browse/ai-articles", timeSlotNow, dayNameNow],
    staleTime: 30 * 60 * 1000, // 30 min
    enabled: activeTab === "articles",
  });

  // Fetch previously not-interested URLs for persistent hiding
  const { data: notInterestedData } = useQuery<{ contentUrl: string | null }[]>({
    queryKey: ["/api/feed-interactions/not-interested"],
  });

  // Hydrate notInterestedUrls from backend data
  useEffect(() => {
    if (notInterestedData) {
      const urls = notInterestedData
        .map((i) => i.contentUrl)
        .filter((u): u is string => Boolean(u));
      if (urls.length > 0) {
        setNotInterestedUrls(new Set(urls));
      }
    }
  }, [notInterestedData]);

  const aiCustomizeMutation = useMutation({
    mutationFn: async (mood: string) => {
      const contentList = content.map((c, i) => `[${i}] ${c.title}`).join("\n");
      
      const response = await apiRequest("POST", "/api/chat/smart", {
        message: `You are a gentle wellness guide. The user is feeling: "${mood}". 

Choose 2-3 activities from this numbered list that would be most supportive for their current energy. Return ONLY the numbers (e.g., "0, 2, 4"), nothing else.

${contentList}`,
        conversationHistory: [],
      });
      return response.json();
    },
    onSuccess: (data) => {
      const response = data.response || "";
      const indices = response.match(/\d+/g)?.map((n: string) => parseInt(n, 10)) || [];
      const titles = indices
        .filter((i: number) => i >= 0 && i < content.length)
        .map((i: number) => content[i].title);
      setAiRecommendations(titles.length > 0 ? titles : null);
      setAiDialogOpen(false);
    },
  });

  // Save content mutation
  const saveContentMutation = useMutation({
    mutationFn: async (content: {
      contentType: string;
      title: string;
      description: string;
      url: string;
      thumbnail?: string;
      source?: string;
      duration?: string;
      metadata?: any;
    }) => {
      const response = await apiRequest("POST", "/api/saved-content", content);
      if (!response.ok) throw new Error("Failed to save content");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-content"] });
      toast({ title: "Saved!", description: "Content saved for later" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to save content", variant: "destructive" });
    },
  });

  // Mark as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("PATCH", `/api/saved-content/${id}`, { isRead: true });
      if (!response.ok) throw new Error("Failed to mark as read");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-content"] });
      toast({ title: "Marked as read" });
    },
  });

  // Delete saved content mutation
  const deleteSavedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await apiRequest("DELETE", `/api/saved-content/${id}`);
      if (!response.ok) throw new Error("Failed to delete");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-content"] });
      toast({ title: "Removed from saved" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to remove content", variant: "destructive" });
    },
  });

  // Not Interested mutation
  const notInterestedMutation = useMutation({
    mutationFn: async (data: { contentTitle: string; contentUrl: string; contentType: string; topic?: string }) => {
      const response = await apiRequest("POST", "/api/feed-interactions", {
        ...data,
        action: "not_interested",
      });
      if (!response.ok) throw new Error("Failed to record");
      return response.json();
    },
    onSuccess: () => {
      toast({ title: "Got it", description: "We'll show less content like this." });
    },
  });

  // Add to Schedule mutation
  const addToScheduleMutation = useMutation({
    mutationFn: async (data: { title: string; scheduledTime: string; contentUrl: string; contentType: string }) => {
      const response = await apiRequest("POST", "/api/feed/add-to-schedule", data);
      if (!response.ok) throw new Error("Failed to schedule");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-events"] });
      toast({ title: "Added to schedule!", description: "Content has been added to your schedule." });
      setScheduleDialogOpen(false);
      setScheduleContent(null);
      setScheduleTime("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to add to schedule", variant: "destructive" });
    },
  });

  const handleNotInterested = (item: { title: string; url: string; type: string; topic?: string }) => {
    // Immediately hide from feed (optimistic)
    setNotInterestedUrls(prev => { const s = new Set(prev); s.add(item.url); return s; });
    // Count as an interaction for "Apply this?" guardrail
    handleFeedItemSeen();
    notInterestedMutation.mutate({
      contentTitle: item.title,
      contentUrl: item.url,
      contentType: item.type,
      topic: item.topic,
    });
  };

  const handleAddToSchedule = (item: { title: string; url: string; type: string }) => {
    setScheduleContent(item);
    // Default to next hour
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    setScheduleTime(next.toTimeString().slice(0, 5));
    setScheduleDialogOpen(true);
  };

  const handleFeedItemSeen = useCallback(() => {
    setFeedSeenCount(prev => {
      const next = prev + 1;
      if (next >= APPLY_PROMPT_THRESHOLD) {
        setShowApplyPrompt(true);
      }
      return next;
    });
  }, []);

  const content = dbContent && dbContent.length > 0 ? dbContent : SAMPLE_CONTENT;
  
  // Apply filters - cast to common type for filtering
  let filteredContent: Array<WellnessContent | typeof SAMPLE_CONTENT[0]> = content;
  
  // Search filter
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filteredContent = filteredContent.filter((c) => 
      c.title.toLowerCase().includes(query) ||
      (c.description && c.description.toLowerCase().includes(query)) ||
      (c.goalTags && c.goalTags.some(tag => tag.toLowerCase().includes(query))) ||
      (c.moodTags && c.moodTags.some(tag => tag.toLowerCase().includes(query)))
    );
  }

  // Topic filter
  if (topicFilter.trim()) {
    const tf = topicFilter.toLowerCase();
    filteredContent = filteredContent.filter((c) =>
      c.title.toLowerCase().includes(tf) ||
      (c.description && c.description.toLowerCase().includes(tf)) ||
      (c.category && c.category.toLowerCase().includes(tf))
    );
  }

  // Length filter (short <10min, medium 10-20min, long ≥20min)
  if (lengthFilter) {
    filteredContent = filteredContent.filter((c) => {
      const dur = c.duration ?? 0;
      if (lengthFilter === "short") return dur < 10;
      if (lengthFilter === "medium") return dur >= 10 && dur < 20;
      if (lengthFilter === "long") return dur >= 20;
      return true;
    });
  }
  
  // Category filter
  if (activeCategory) {
    filteredContent = filteredContent.filter((c) => c.category === activeCategory);
  }
  
  // AI recommendations filter
  if (aiRecommendations) {
    filteredContent = filteredContent.filter((c) => aiRecommendations.includes(c.title));
  }

  // Personalized "For You" content: score items matching userProfile goals
  const goalKey = userProfile?.fitnessGoal?.toLowerCase() || "";
  const forYouContent = [...filteredContent].sort((a, b) => {
    const score = (item: typeof filteredContent[0]) => {
      let s = 0;
      if (goalKey) {
        if (item.category?.toLowerCase() === goalKey) s += 3;
        if (item.goalTags?.some(t => t.toLowerCase().includes(goalKey))) s += 2;
        if (item.title?.toLowerCase().includes(goalKey)) s += 1;
      }
      return s;
    };
    return score(b) - score(a);
  });

  const getCategoryIcon = (category: string) => {
    const found = CONTENT_CATEGORIES.find((c) => c.id === category);
    return found ? found.icon : Sparkles;
  };

  const getCategoryGradient = (category: string) => {
    const gradients: Record<string, string> = {
      workout: "from-orange-500/20 to-red-500/5",
      meditation: "from-purple-500/20 to-blue-500/5",
      mindfulness: "from-green-500/20 to-teal-500/5",
      recovery: "from-blue-500/20 to-cyan-500/5",
      nutrition: "from-yellow-500/20 to-orange-500/5",
      article: "from-indigo-500/20 to-violet-500/5",
      blog: "from-indigo-500/20 to-violet-500/5",
    };
    return gradients[category] || "from-primary/20 to-primary/5";
  };

  const handleComingSoon = () => {
    toast({ title: "Coming soon", description: "This feature is not available yet." });
  };

  const handleContentClick = (item: WellnessContent | typeof SAMPLE_CONTENT[0]) => {
    setSelectedContent(item);
    setContentDetailOpen(true);
  };

  const handleStartContent = () => {
    if (!selectedContent) return;
    
    const url = (selectedContent as any).url;
    if (isSafeExternalUrl(url)) {
      window.open(url, "_blank", "noopener,noreferrer");
      setContentDetailOpen(false);
      return;
    }

    // Navigate to the relevant in-app section based on content type
    const contentType = (selectedContent as any).contentType || selectedContent.category;
    const typeRoutes: Record<string, string> = {
      workout: "/workout",
      meditation: "/spiritual",
      mindfulness: "/spiritual",
      nutrition: "/meal-prep",
      recovery: "/workout",
      article: "/browse?tab=articles",
      blog: "/browse?tab=articles",
    };
    const destination = typeRoutes[contentType];
    setContentDetailOpen(false);
    if (destination) {
      setLocation(destination);
    } else {
      toast({ 
        title: "Starting content...", 
        description: `Get ready for: ${selectedContent.title}`,
      });
    }
  };

  const handleLocalSearch = async () => {
    if (!localSearchQuery.trim()) return;
    
    setIsSearching(true);
    setLocalResources([]); // Clear previous results
    try {
      const response = await apiRequest("POST", "/api/local-resources/search", {
        query: localSearchQuery,
      });
      const data = await response.json();
      // Validate that resources is an array
      const resources = Array.isArray(data.resources) ? data.resources : [];
      setLocalResources(resources);
      if (resources.length === 0) {
        toast({
          title: "No results found",
          description: "Try a different search term.",
        });
      }
    } catch (error) {
      console.error("Local search error:", error);
      setLocalResources([]);
      toast({
        title: "Search failed",
        description: "We couldn't find resources right now. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleExternalSearch = async () => {
    if (!externalSearchQuery.trim()) return;

    setIsExternalSearching(true);
    setExternalSearchResults([]);
    try {
      let endpoint = "";
      const body: { query: string } = { query: externalSearchQuery };

      if (searchDialogType === "youtube") {
        endpoint = "/api/explore/youtube";
      } else if (searchDialogType === "articles") {
        endpoint = "/api/explore/articles";
      } else if (searchDialogType === "exercises") {
        endpoint = "/api/explore/exercises";
      }

      const response = await apiRequest("POST", endpoint, body);
      const data = await response.json();
      setExternalSearchResults(data.items || []);
      
      if (data.message) {
        toast({ title: "Info", description: data.message });
      }
    } catch (error) {
      console.error("External search error:", error);
      toast({
        title: "Search failed",
        description: "Could not complete the search. Try again later.",
        variant: "destructive",
      });
    } finally {
      setIsExternalSearching(false);
    }
  };

  const handleSuggestionExplore = (keyword: string) => {
    setActiveTab("all");
    setSearchQuery(keyword);
  };

  return (
    <div className="flex flex-col h-full bg-background">
      <PageHeader
        title="Browse"
        rightContent={activeTab === "all" ? (
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={() => setAiDialogOpen(true)}
              data-testid="button-ai-customize"
            >
              <Wand2 className="h-4 w-4 mr-2" />
              Pick for Me
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-filters"
            >
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        ) : null}
      />
      
      <div className="sticky z-40 bg-background border-b" style={{ top: 'var(--header-total-height, 80px)' }}>
        <Tabs value={activeTab} onValueChange={(v) => {
          setActiveTab(v as "for-you" | "video" | "articles" | "all" | "saved" | "community");
          // Reset per-tab filters when switching tabs
          setTopicFilter("");
          setLengthFilter(null);
        }} className="w-full">
          <TabsList className="w-full justify-start px-4 h-12 bg-transparent rounded-xl overflow-x-auto flex-nowrap">
            <TabsTrigger value="for-you" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-for-you">
              <Sparkles className="h-4 w-4 mr-1" />
              For You
            </TabsTrigger>
            <TabsTrigger value="video" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-video">
              <Video className="h-4 w-4 mr-1" />
              Video
            </TabsTrigger>
            <TabsTrigger value="articles" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-articles">
              <FileText className="h-4 w-4 mr-1" />
              Articles
            </TabsTrigger>
            <TabsTrigger value="all" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-all">
              <Compass className="h-4 w-4 mr-1" />
              All
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-saved">
              <Bookmark className="h-4 w-4 mr-1" />
              Saved
            </TabsTrigger>
            <TabsTrigger value="community" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-community">
              <Users className="h-4 w-4 mr-1" />
              Community
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      
      {activeTab === "for-you" && (
        <main className="p-4 space-y-6">
          {/* Time-aware greeting */}
          <div className="flex items-center gap-2 px-3 py-2.5 rounded-lg bg-primary/5 border border-primary/10">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">
              <span className="font-medium text-foreground">{getTimeGreeting()}{userProfile?.firstName ? `, ${userProfile.firstName}` : ""}</span>
              {" — "}{dayNameNow} picks tailored for this time of day
            </span>
          </div>

          {/* Real time-aware content from Perplexity */}
          {forYouLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Loading your picks...</h2>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : forYouData ? (
            <div className="space-y-6">
              {/* Videos */}
              {forYouData.videos.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Play className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Videos for {forYouData.timeLabel ?? timeSlotNow}</h2>
                  </div>
                  <div className="space-y-2">
                    {forYouData.videos.slice(0, 4).filter(v => !notInterestedUrls.has(v.url)).map((video) => (
                      <Card key={video.id} className="card-modern hover-lift cursor-pointer" onClick={() => { if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`card-foryou-video-${video.id}`}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className={`w-14 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br ${getCategoryGradient(video.category)}`}>
                            {video.category === "yoga" || video.category === "meditation" ? <Brain className="h-6 w-6 text-primary/60" /> : <Dumbbell className="h-6 w-6 text-primary/60" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2">{video.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{video.channel}{video.duration ? ` · ${video.duration}` : ""}</p>
                            <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{video.description}</p>
                          </div>
                          <div className="flex flex-col gap-1 shrink-0">
                            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-video-open-${video.id}`}>
                              <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50" onClick={(e) => { e.stopPropagation(); handleNotInterested({ title: video.title, url: video.url, type: "video" }); }} data-testid={`button-foryou-video-notinterested-${video.id}`}>
                              <ThumbsDown className="h-3 w-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Articles */}
              {forYouData.articles.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Reads for Today</h2>
                  </div>
                  <div className="space-y-2">
                    {forYouData.articles.slice(0, 3).filter(a => !notInterestedUrls.has(a.url)).map((article) => (
                      <Card key={article.id} className="card-modern hover-lift cursor-pointer" onClick={() => { if (isSafeExternalUrl(article.url)) window.open(article.url, "_blank", "noopener,noreferrer"); }} data-testid={`card-foryou-article-${article.id}`}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-indigo-500/20 to-violet-500/5">
                            <FileText className="h-6 w-6 text-primary/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2">{article.title}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{article.source}{article.readTimeMinutes ? ` · ${article.readTimeMinutes} min read` : ""}</p>
                            {article.whySuggested && <p className="text-xs text-primary/70 mt-1 line-clamp-1 italic">{article.whySuggested}</p>}
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(article.url)) window.open(article.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-article-open-${article.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Workouts */}
              {forYouData.workouts && forYouData.workouts.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Dumbbell className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Workouts</h2>
                  </div>
                  <div className="space-y-2">
                    {forYouData.workouts.filter(w => !notInterestedUrls.has(w.url)).map((workout) => (
                      <Card key={workout.id} className="card-modern hover-lift cursor-pointer" onClick={() => { if (isSafeExternalUrl(workout.url)) window.open(workout.url, "_blank", "noopener,noreferrer"); }} data-testid={`card-foryou-workout-${workout.id}`}>
                        <CardContent className="p-3 flex items-start gap-3">
                          <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-orange-500/20 to-red-500/5">
                            <Dumbbell className="h-6 w-6 text-primary/60" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm leading-snug line-clamp-2">{workout.title}</p>
                            <div className="flex gap-2 mt-1">
                              {workout.duration && <Badge variant="secondary" className="text-xs"><Clock className="h-2.5 w-2.5 mr-1" />{workout.duration}</Badge>}
                              {workout.difficulty && <Badge variant="outline" className="text-xs capitalize">{workout.difficulty}</Badge>}
                            </div>
                            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{workout.description}</p>
                          </div>
                          <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(workout.url)) window.open(workout.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-workout-open-${workout.id}`}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Meal */}
              {forYouData.meal && !notInterestedUrls.has(forYouData.meal.url) && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Utensils className="h-5 w-5 text-primary" />
                    <h2 className="text-lg font-semibold">Meal Idea</h2>
                  </div>
                  <Card className="card-modern hover-lift cursor-pointer" onClick={() => { if (forYouData.meal && isSafeExternalUrl(forYouData.meal.url)) window.open(forYouData.meal.url, "_blank", "noopener,noreferrer"); }} data-testid="card-foryou-meal">
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className="w-14 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br from-yellow-500/20 to-orange-500/5">
                        <Utensils className="h-6 w-6 text-primary/60" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{forYouData.meal.title}</p>
                        {forYouData.meal.prepTime && <p className="text-xs text-muted-foreground mt-0.5"><Clock className="h-3 w-3 inline mr-1" />{forYouData.meal.prepTime}</p>}
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{forYouData.meal.description}</p>
                      </div>
                      <Button size="icon" variant="ghost" className="h-7 w-7 shrink-0" onClick={(e) => { e.stopPropagation(); if (forYouData.meal && isSafeExternalUrl(forYouData.meal.url)) window.open(forYouData.meal.url, "_blank", "noopener,noreferrer"); }} data-testid="button-foryou-meal-open">
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          ) : null}

          {/* DW topic suggestions */}
          {suggestionsData?.suggestions && suggestionsData.suggestions.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Explore by Topic</h2>
              </div>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {suggestionsData.suggestions.map((suggestion: any, idx: number) => (
                  <TopicSuggestionCard
                    key={idx}
                    dimension={suggestion.dimension}
                    title={suggestion.title}
                    description={suggestion.description}
                    topicKeywords={suggestion.keywords || []}
                    onExplore={handleSuggestionExplore}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Apply this? guardrail prompt */}
          {showApplyPrompt && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Apply something you've seen?</p>
                <p className="text-xs text-muted-foreground mt-0.5">You've browsed quite a bit. Want to add one of these to your schedule?</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowApplyPrompt(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Personalized curated content (from DB/sample) */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Recommended For You</h2>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {forYouContent.filter(c => !notInterestedUrls.has((c as any).url || "")).slice(0, FOR_YOU_PAGE_SIZE).map((item) => {
                const CategoryIcon = getCategoryIcon(item.category);
                return (
                  <Card
                    key={item.id}
                    className="card-modern hover-lift cursor-pointer transition-all"
                    onClick={() => handleContentClick(item)}
                    data-testid={`card-foryou-${item.id}`}
                  >
                    <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(item.category)} rounded-t-md flex items-center justify-center relative group`}>
                      <CategoryIcon className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                      <Button
                        size="icon"
                        className="absolute bottom-3 right-3 rounded-full shadow-lg opacity-90 hover:opacity-100"
                        onClick={(e) => { e.stopPropagation(); handleContentClick(item); }}
                      >
                        <Play className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {item.duration}m
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {item.goalTags?.slice(0, 2).map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {item.difficulty && (
                          <Badge variant="outline" className="text-xs capitalize">{item.difficulty}</Badge>
                        )}
                      </div>
                      <div className="flex gap-2 pt-2 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1 text-xs"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAddToSchedule({ title: item.title, url: (item as any).url || "", type: item.category });
                            handleFeedItemSeen();
                          }}
                          data-testid={`button-foryou-schedule-${item.id}`}
                        >
                          <Calendar className="h-3 w-3 mr-1" />
                          Schedule
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="px-2 text-muted-foreground hover:text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNotInterested({ title: item.title, url: (item as any).url || item.id, type: item.category });
                          }}
                          title="Not interested"
                          data-testid={`button-foryou-notinterested-${item.id}`}
                        >
                          <ThumbsDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {forYouContent.length === 0 && (
              <div className="text-center py-12">
                <Sparkles className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
                <p className="font-medium mb-1">{COPY.emptyStates.forYou.title}</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  {COPY.emptyStates.forYou.body}
                </p>
              </div>
            )}
          </div>
        </main>
      )}

      {activeTab === "all" && (
        <>
          <div className="sticky z-30 bg-background border-b px-4 py-3" style={{ top: 'calc(var(--header-total-height, 80px) + var(--tabs-height, 48px))' }}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search workouts, meditations, or browse by mood..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
                data-testid="input-content-search"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                  onClick={() => setSearchQuery("")}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
          
          <div className="sticky z-30 bg-background border-b" style={{ top: 'calc(var(--header-total-height, 80px) + var(--tabs-height, 48px) + var(--search-bar-height, 65px))' }}>
            <div className="overflow-x-auto">
              <div className="flex gap-2 px-4 pb-4 w-max min-w-full">
                {aiRecommendations && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      setAiRecommendations(null);
                      setActiveCategory(null);
                    }}
                    data-testid="button-clear-ai"
                  >
                    <X className="h-4 w-4 mr-1" />
                    AI Picks
                  </Button>
                )}
                <Button
                  variant={activeCategory === null && !aiRecommendations ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setActiveCategory(null);
                    setAiRecommendations(null);
                  }}
                  data-testid="button-category-all"
                >
                  All
                  <Badge variant="secondary" className="ml-2 text-xs">
                    {content.length}
                  </Badge>
                </Button>
                {CONTENT_CATEGORIES.map((cat) => {
                  const categoryCount = content.filter(c => c.category === cat.id).length;
                  return (
                    <Button
                      key={cat.id}
                      variant={activeCategory === cat.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setActiveCategory(cat.id);
                        setAiRecommendations(null);
                      }}
                      data-testid={`button-category-${cat.id}`}
                    >
                      <cat.icon className="h-4 w-4 mr-1" />
                      {cat.name}
                      {categoryCount > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {categoryCount}
                        </Badge>
                      )}
                    </Button>
                  );
                })}
                {/* Length filters */}
                <div className="w-px bg-border mx-1 self-stretch" />
                {(["short", "medium", "long"] as const).map((len) => (
                  <Button
                    key={len}
                    size="sm"
                    variant={lengthFilter === len ? "default" : "outline"}
                    onClick={() => setLengthFilter(lengthFilter === len ? null : len)}
                    data-testid={`button-length-all-${len}`}
                  >
                    <Clock className="h-3.5 w-3.5 mr-1" />
                    {len === "short" ? "<10m" : len === "medium" ? "10-20m" : ">20m"}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </>
      )}

      {activeTab === "all" && userProfile && (
        <div className="p-4 border-b bg-muted/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              <span>
                Personalized for you based on your{" "}
                {userProfile.fitnessGoal && (
                  <Badge variant="secondary" className="mx-1">
                    {userProfile.fitnessGoal}
                  </Badge>
                )}
                goals
              </span>
            </div>
            {(searchQuery || activeCategory || aiRecommendations) && (
              <div className="text-sm text-muted-foreground">
                <Badge variant="outline">
                  {filteredContent.length} {filteredContent.length === 1 ? 'result' : 'results'}
                </Badge>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "all" && (
        <main className="p-4">
          {/* Apply this? guardrail */}
          {showApplyPrompt && (
            <div className="flex items-start gap-3 px-4 py-3 mb-4 rounded-lg border border-primary/30 bg-primary/5">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Apply something you've seen?</p>
                <p className="text-xs text-muted-foreground mt-0.5">You've browsed quite a bit. Want to add one of these to your schedule?</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowApplyPrompt(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}
          {/* Search External Content Section */}
          <div className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-foreground">Search External Content</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchDialogType("youtube");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
              >
                <Youtube className="h-4 w-4 mr-2" />
                Search YouTube
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchDialogType("articles");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Search Articles
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSearchDialogType("exercises");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
              >
                <Dumbbell className="h-4 w-4 mr-2" />
                Search Exercises
              </Button>
            </div>
          </div>

          {/* Sample Content Grid */}
          <h2 className="text-lg font-semibold mb-3 text-foreground">Curated Content</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContent.map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <Card
                  key={item.id}
                  className="card-modern hover-lift cursor-pointer transition-all"
                  onClick={() => handleContentClick(item)}
                  data-testid={`card-content-${item.id}`}
                >
                  <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(item.category)} rounded-t-md flex items-center justify-center relative group`}>
                    <CategoryIcon className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-t-md" />
                    <Button
                      size="icon"
                      className="absolute bottom-3 right-3 rounded-full shadow-lg opacity-90 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleContentClick(item);
                      }}
                      data-testid={`button-play-${item.id}`}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">
                        {item.title}
                      </CardTitle>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.duration}m
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">
                      {item.description}
                    </p>
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.goalTags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {item.difficulty && (
                        <Badge variant="outline" className="text-xs capitalize">
                          {item.difficulty}
                        </Badge>
                      )}
                    </div>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSchedule({ title: item.title, url: (item as any).url || "", type: item.category });
                          handleFeedItemSeen();
                        }}
                        data-testid={`button-schedule-${item.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          saveContentMutation.mutate({
                            contentType: item.category,
                            title: item.title,
                            description: item.description || "",
                            url: (item as any).url || "",
                            source: "browse",
                          });
                        }}
                        data-testid={`button-save-${item.id}`}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        Save
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotInterested({ title: item.title, url: (item as any).url || item.id, type: item.category });
                        }}
                        title="Not interested"
                        data-testid={`button-notinterested-${item.id}`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredContent.length === 0 && (
            <div className="text-center py-12">
              {searchQuery ? (
                <>
                  <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <p className="text-muted-foreground mb-2">
                    No content found for "{searchQuery}"
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchQuery("")}
                  >
                    Clear search
                  </Button>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {COPY.emptyStates.browse.body}
                </p>
              )}
            </div>
          )}
        </main>
      )}

      {/* Video Tab */}
      {activeTab === "video" && (
        <main className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search videos..."
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="pl-9"
                data-testid="input-video-search"
              />
            </div>
            <div className="flex gap-1">
              {(["short", "medium", "long"] as const).map((len) => (
                <Button
                  key={len}
                  size="sm"
                  variant={lengthFilter === len ? "default" : "outline"}
                  onClick={() => setLengthFilter(lengthFilter === len ? null : len)}
                  className="capitalize text-xs"
                  data-testid={`button-length-${len}`}
                >
                  {len === "short" ? "<10m" : len === "medium" ? "10-20m" : ">20m"}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply this? guardrail */}
          {showApplyPrompt && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Apply something you've seen?</p>
                <p className="text-xs text-muted-foreground mt-0.5">You've browsed quite a bit. Want to add one of these to your schedule?</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowApplyPrompt(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          {/* Auto-loaded time-aware videos */}
          {forYouLoading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Play className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Loading picks...</h2>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
              </div>
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : forYouData?.videos && forYouData.videos.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Play className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Recommended for {forYouData.timeLabel ?? timeSlotNow}</h2>
              </div>
              <div className="space-y-2">
                {forYouData.videos.filter(v => !notInterestedUrls.has(v.url)).map((video) => (
                  <Card key={video.id} className="card-modern hover-lift cursor-pointer" onClick={() => { if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`card-video-rec-${video.id}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={`w-14 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br ${getCategoryGradient(video.category)}`}>
                        {video.category === "yoga" || video.category === "meditation" ? <Brain className="h-6 w-6 text-primary/60" /> : <Dumbbell className="h-6 w-6 text-primary/60" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{video.channel}{video.duration ? ` · ${video.duration}` : ""}</p>
                        <p className="text-xs text-muted-foreground/80 mt-1 line-clamp-1">{video.description}</p>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        <Button size="icon" variant="ghost" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-video-rec-open-${video.id}`}>
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground/50" onClick={(e) => { e.stopPropagation(); handleNotInterested({ title: video.title, url: video.url, type: "video" }); }} data-testid={`button-video-rec-notinterested-${video.id}`}>
                          <ThumbsDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Search YouTube</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchDialogType("youtube");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
              >
                <Youtube className="h-4 w-4 mr-2" />
                Search YouTube
              </Button>
            </div>
          </div>

          <h2 className="text-lg font-semibold mb-3">Video Content</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContent.filter(c =>
              !notInterestedUrls.has((c as any).url || "") &&
              ["workout", "recovery", "video"].includes(
                (c as any).contentType || c.category || ""
              )
            ).map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <Card
                  key={item.id}
                  className="card-modern hover-lift cursor-pointer transition-all"
                  onClick={() => handleContentClick(item)}
                  data-testid={`card-video-${item.id}`}
                >
                  <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(item.category)} rounded-t-md flex items-center justify-center relative group`}>
                    <CategoryIcon className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                    <Button
                      size="icon"
                      className="absolute bottom-3 right-3 rounded-full shadow-lg opacity-90 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); handleContentClick(item); }}
                    >
                      <Play className="h-4 w-4" />
                    </Button>
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.duration}m
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSchedule({ title: item.title, url: (item as any).url || "", type: item.category });
                          handleFeedItemSeen();
                        }}
                        data-testid={`button-video-schedule-${item.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotInterested({ title: item.title, url: (item as any).url || item.id, type: item.category });
                        }}
                        title="Not interested"
                        data-testid={`button-video-notinterested-${item.id}`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredContent.filter(c =>
              !notInterestedUrls.has((c as any).url || "") &&
              ["workout", "recovery", "video"].includes(
                (c as any).contentType || c.category || ""
              )
            ).length === 0 && (
            <div className="text-center py-12">
              <Video className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">{COPY.emptyStates.browse.title}</p>
            </div>
          )}
        </main>
      )}

      {/* Articles Tab */}
      {activeTab === "articles" && (
        <main className="p-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="pl-9"
                data-testid="input-articles-search"
              />
            </div>
            <div className="flex gap-1">
              {(["short", "medium", "long"] as const).map((len) => (
                <Button
                  key={len}
                  size="sm"
                  variant={lengthFilter === len ? "default" : "outline"}
                  onClick={() => setLengthFilter(lengthFilter === len ? null : len)}
                  className="capitalize text-xs"
                >
                  {len === "short" ? "<10m" : len === "medium" ? "10-20m" : ">20m"}
                </Button>
              ))}
            </div>
          </div>

          {/* Apply this? guardrail */}
          {showApplyPrompt && (
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5">
              <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium">Apply something you've seen?</p>
                <p className="text-xs text-muted-foreground mt-0.5">You've browsed quite a bit. Want to add one of these to your schedule?</p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setShowApplyPrompt(false)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="mb-4">
            <h2 className="text-lg font-semibold mb-3">Search Articles</h2>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchDialogType("articles");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
              >
                <FileText className="h-4 w-4 mr-2" />
                Search Articles
              </Button>
            </div>
          </div>

          {/* AI-Curated Articles */}
          {aiArticlesLoading ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Suggested for You</h2>
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-1" />
              </div>
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-2/3" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : aiArticlesData?.articles && aiArticlesData.articles.length > 0 ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold">Suggested for You</h2>
              </div>
              <div className="space-y-3">
                {aiArticlesData.articles.map((article) => (
                  <Card
                    key={article.id}
                    className="card-modern hover-lift cursor-pointer transition-all"
                    onClick={() => {
                      if (isSafeExternalUrl(article.url)) {
                        window.open(article.url, "_blank", "noopener,noreferrer");
                      }
                    }}
                    data-testid={`card-ai-article-${article.id}`}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5 text-indigo-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <h3 className="font-medium text-sm leading-snug">{article.title}</h3>
                            <Badge variant="secondary" className="text-xs shrink-0">
                              <Clock className="h-3 w-3 mr-1" />
                              {article.readTimeMinutes}m
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{article.synopsis}</p>
                          {article.whySuggested && (
                            <div className="flex items-start gap-1.5 text-xs text-primary bg-primary/5 rounded-md px-2 py-1.5">
                              <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                              <span>{article.whySuggested}</span>
                            </div>
                          )}
                          <div className="flex gap-2 mt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (isSafeExternalUrl(article.url)) {
                                  window.open(article.url, "_blank", "noopener,noreferrer");
                                }
                              }}
                              data-testid={`button-ai-article-open-${article.id}`}
                              disabled={!isSafeExternalUrl(article.url)}
                            >
                              <ExternalLink className="h-3 w-3 mr-1" />
                              Read Article
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (!saveContentMutation.isPending) {
                                  saveContentMutation.mutate({
                                    contentType: article.category || "article",
                                    title: article.title,
                                    description: article.synopsis,
                                    url: article.url,
                                    source: "ai-curated",
                                    duration: String(article.readTimeMinutes),
                                    metadata: { whySuggested: article.whySuggested },
                                  });
                                }
                              }}
                              data-testid={`button-ai-article-save-${article.id}`}
                            >
                              <Bookmark className="h-3 w-3 mr-1" />
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="px-2 text-muted-foreground hover:text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleNotInterested({ title: article.title, url: article.url, type: "article" });
                              }}
                              title="Not interested"
                              data-testid={`button-ai-article-notinterested-${article.id}`}
                            >
                              <ThumbsDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          <h2 className="text-lg font-semibold mb-3">Wellness Articles</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredContent.filter(c =>
              !notInterestedUrls.has((c as any).url || "") &&
              ["article", "blog", "meditation", "mindfulness", "nutrition"].includes(
                (c as any).contentType || c.category || ""
              )
            ).map((item) => {
              const CategoryIcon = getCategoryIcon(item.category);
              return (
                <Card
                  key={item.id}
                  className="card-modern hover-lift cursor-pointer transition-all"
                  onClick={() => handleContentClick(item)}
                  data-testid={`card-article-${item.id}`}
                >
                  <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(item.category)} rounded-t-md flex items-center justify-center relative group`}>
                    <CategoryIcon className="h-12 w-12 text-primary/40 group-hover:scale-110 transition-transform" />
                  </div>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-base font-medium">{item.title}</CardTitle>
                      <Badge variant="secondary">
                        <Clock className="h-3 w-3 mr-1" />
                        {item.duration}m
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{item.description}</p>
                    <div className="flex gap-2 pt-2 border-t">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-xs"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAddToSchedule({ title: item.title, url: (item as any).url || "", type: "article" });
                          handleFeedItemSeen();
                        }}
                        data-testid={`button-article-schedule-${item.id}`}
                      >
                        <Calendar className="h-3 w-3 mr-1" />
                        Schedule
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="px-2 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleNotInterested({ title: item.title, url: (item as any).url || item.id, type: "article" });
                        }}
                        title="Not interested"
                        data-testid={`button-article-notinterested-${item.id}`}
                      >
                        <ThumbsDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          {filteredContent.filter(c =>
              !notInterestedUrls.has((c as any).url || "") &&
              ["article", "blog", "meditation", "mindfulness", "nutrition"].includes(
                (c as any).contentType || c.category || ""
              )
            ).length === 0 && !aiArticlesLoading && !(aiArticlesData?.articles?.length) && (
            <div className="text-center py-12 space-y-3">
              <FileText className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium">No articles match your current filters</p>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Try clearing filters or search for a specific wellness topic.
              </p>
              <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setTopicFilter("");
                    setLengthFilter(null);
                  }}
                  data-testid="button-articles-clear-filters"
                >
                  Clear Filters
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    setSearchDialogType("articles");
                    setSearchDialogOpen(true);
                    setExternalSearchQuery("");
                    setExternalSearchResults([]);
                  }}
                  data-testid="button-articles-search-empty"
                >
                  <Search className="h-3.5 w-3.5 mr-1" />
                  Search Articles
                </Button>
              </div>
            </div>
          )}
        </main>
      )}

      {activeTab === "saved" && (
        <main className="p-4">
          {savedLoading ? (
            <div className="text-center py-12">
              <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Loading saved content...</p>
            </div>
          ) : savedContent && savedContent.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {savedContent.map((item) => (
                <ExploreFeedCard
                  key={item.id}
                  id={item.id}
                  type={item.contentType as ExploreFeedContentType}
                  source={item.source || "Unknown"}
                  title={item.title}
                  description={item.description || ""}
                  thumbnail={item.thumbnail || undefined}
                  duration={item.duration || undefined}
                  url={item.url}
                  metadata={item.metadata as any}
                  isSaved={true}
                  onOpen={() => window.open(item.url, "_blank")}
                  onSave={() => {
                    if (!deleteSavedMutation.isPending) {
                      deleteSavedMutation.mutate(item.id);
                    }
                  }}
                  onSchedule={() => handleAddToSchedule({ title: item.title, url: item.url, type: item.contentType })}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Bookmark className="h-10 w-10 mx-auto mb-3 text-muted-foreground/40" />
              <p className="font-medium mb-1">{COPY.emptyStates.saved.title}</p>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                {COPY.emptyStates.saved.body}
              </p>
            </div>
          )}
        </main>
      )}

      {activeTab === "community" && (
        <div className="flex flex-col">
          <div className="sticky z-30 bg-background border-b" style={{ top: 'calc(var(--header-total-height, 80px) + var(--tabs-height, 48px))' }}>
            <div className="flex gap-2 px-4 py-3">
              <Button
                variant={communityCategory === "groups" ? "default" : "outline"}
                size="sm"
                onClick={() => setCommunityCategory("groups")}
                data-testid="button-community-groups"
              >
                <Users className="h-4 w-4 mr-1" />
                Groups
              </Button>
              <Button
                variant={communityCategory === "feed" ? "default" : "outline"}
                size="sm"
                onClick={() => setCommunityCategory("feed")}
                data-testid="button-community-feed"
              >
                <MessageCircle className="h-4 w-4 mr-1" />
                Feed
              </Button>
              <Button
                variant={communityCategory === "local" ? "default" : "outline"}
                size="sm"
                onClick={() => setCommunityCategory("local")}
                data-testid="button-community-local"
              >
                <MapPin className="h-4 w-4 mr-1" />
                Local Resources
              </Button>
            </div>
          </div>

          {communityCategory === "groups" && (
            <main className="p-4">
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 px-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold">Community Groups Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-xs">We're building a warm, supportive community where you can connect with others on the same wellness journey. Stay tuned.</p>
                <Badge variant="secondary" className="text-xs">Coming in a future update</Badge>
              </div>
            </main>
          )}

          {communityCategory === "feed" && (
            <main className="p-4">
              <div className="flex flex-col items-center justify-center py-16 text-center space-y-4 px-8">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <MessageCircle className="h-8 w-8 text-primary/60" />
                </div>
                <h3 className="text-lg font-semibold">Community Feed Coming Soon</h3>
                <p className="text-sm text-muted-foreground max-w-xs">Share your wins, ask questions, and cheer each other on. A real feed is on the way — built around kindness, not competition.</p>
                <Badge variant="secondary" className="text-xs">Coming in a future update</Badge>
              </div>
            </main>
          )}

          {communityCategory === "local" && (
            <main className="p-4 space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search for gyms, therapists, yoga studios, healthy restaurants..."
                    value={localSearchQuery}
                    onChange={(e) => setLocalSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleLocalSearch()}
                    className="pl-9"
                    data-testid="input-local-search"
                  />
                </div>
                <Button 
                  onClick={handleLocalSearch}
                  disabled={isSearching || !localSearchQuery.trim()}
                  data-testid="button-local-search"
                >
                  {isSearching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Search className="h-4 w-4" />
                  )}
                </Button>
              </div>

              {localResources.length === 0 && !isSearching && (
                <div className="text-center py-12">
                  <MapPin className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                  <h3 className="font-medium mb-2">Find Local Resources</h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Search for wellness resources near you - gyms, therapists, yoga studios, healthy restaurants, and more. 
                    Your concierge will find the best options based on your preferences.
                  </p>
                </div>
              )}

              {isSearching && (
                <div className="text-center py-12">
                  <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Searching for resources...</p>
                </div>
              )}

              {localResources.length > 0 && !isSearching && (
                <div className="space-y-3">
                  {localResources.map((resource, idx) => (
                    <Card 
                      key={idx} 
                      className={`overflow-visible hover-elevate cursor-pointer ${resource.aiSuggested ? 'ring-2 ring-primary/20' : ''}`}
                      data-testid={`card-resource-${idx}`}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                            <MapPin className="h-5 w-5 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-medium text-sm flex items-center gap-2">
                                  {resource.title}
                                  {resource.aiSuggested && (
                                    <Badge variant="secondary" className="text-xs">
                                      <Sparkles className="h-3 w-3 mr-1" />
                                      AI Pick
                                    </Badge>
                                  )}
                                </h3>
                                <Badge variant="outline" className="text-xs mt-1">
                                  {resource.category}
                                </Badge>
                              </div>
                              {resource.rating && (
                                <div className="flex items-center gap-1 text-sm">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span>{resource.rating}</span>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mt-2">
                              {resource.description}
                            </p>
                            {resource.aiReason && (
                              <p className="text-xs text-primary mt-2 italic">
                                "{resource.aiReason}"
                              </p>
                            )}
                            <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                              {resource.address && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {resource.address}
                                </span>
                              )}
                              {resource.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {resource.phone}
                                </span>
                              )}
                              {resource.website && (
                                <a 
                                  href={resource.website} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-primary hover:underline"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <Globe className="h-3 w-3" />
                                  Website
                                </a>
                              )}
                            </div>
                          </div>
                          <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </main>
          )}
        </div>
      )}

      {/* Add to Schedule Dialog */}
      <Dialog open={scheduleDialogOpen} onOpenChange={setScheduleDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add to Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {scheduleContent && (
              <p className="text-sm font-medium line-clamp-2">{scheduleContent.title}</p>
            )}
            <div className="space-y-1.5">
              <label className="text-sm text-muted-foreground">Scheduled time (today)</label>
              <Input
                type="time"
                value={scheduleTime}
                onChange={(e) => setScheduleTime(e.target.value)}
                data-testid="input-schedule-time"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setScheduleDialogOpen(false)}>Cancel</Button>
            <Button
              disabled={!scheduleTime || addToScheduleMutation.isPending}
              onClick={() => {
                if (!scheduleContent || !scheduleTime) return;
                addToScheduleMutation.mutate({
                  title: scheduleContent.title,
                  scheduledTime: scheduleTime,
                  contentUrl: scheduleContent.url,
                  contentType: scheduleContent.type,
                });
              }}
              data-testid="button-confirm-schedule"
            >
              {addToScheduleMutation.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4 mr-2" />
              )}
              Add to Schedule
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={aiDialogOpen} onOpenChange={setAiDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5" />
              What's your energy right now?
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              Share how you're feeling and we'll find the right content for you.
            </p>
            <Textarea
              placeholder="e.g., I'm feeling tired but need to move, anxious and need to calm down, energized and want a challenge..."
              value={currentMood}
              onChange={(e) => setCurrentMood(e.target.value)}
              className="min-h-[100px]"
              data-testid="input-mood"
            />
            <div className="flex flex-wrap gap-2">
              {["Tired", "Anxious", "Energized", "Scattered", "Low energy", "Motivated"].map((mood) => (
                <Button
                  key={mood}
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentMood(mood)}
                  data-testid={`button-mood-${mood.toLowerCase().replace(" ", "-")}`}
                >
                  {mood}
                </Button>
              ))}
            </div>
            <Button
              onClick={() => aiCustomizeMutation.mutate(currentMood)}
              disabled={!currentMood.trim() || aiCustomizeMutation.isPending}
              className="w-full"
              data-testid="button-get-recommendations"
            >
              {aiCustomizeMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Finding the right fit...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Get Recommendations
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={searchDialogOpen} onOpenChange={setSearchDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {searchDialogType === "youtube" && <Youtube className="h-5 w-5" />}
              {searchDialogType === "articles" && <FileText className="h-5 w-5" />}
              {searchDialogType === "exercises" && <Dumbbell className="h-5 w-5" />}
              Search {searchDialogType === "youtube" ? "YouTube" : searchDialogType === "articles" ? "Articles" : "Exercises"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex gap-2">
              <Input
                placeholder={`Search for ${searchDialogType}...`}
                value={externalSearchQuery}
                onChange={(e) => setExternalSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleExternalSearch()}
              />
              <Button onClick={handleExternalSearch} disabled={isExternalSearching || !externalSearchQuery.trim()}>
                {isExternalSearching ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Search className="h-4 w-4" />
                )}
              </Button>
            </div>

            {isExternalSearching && (
              <div className="text-center py-8">
                <Loader2 className="h-8 w-8 mx-auto mb-4 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Searching...</p>
              </div>
            )}

            {!isExternalSearching && externalSearchResults.length > 0 && (
              <div className="grid gap-4">
                {externalSearchResults.map((result) => (
                  <ExploreFeedCard
                    key={result.id}
                    id={result.id}
                    type={result.type as ExploreFeedContentType}
                    source={result.source}
                    title={result.title}
                    description={result.description}
                    thumbnail={result.thumbnail}
                    duration={result.duration}
                    url={result.url}
                    metadata={result.metadata}
                    onOpen={() => window.open(result.url, "_blank")}
                    onSchedule={() => handleAddToSchedule({ title: result.title, url: result.url, type: result.type })}
                    onNotInterested={() => handleNotInterested({ title: result.title, url: result.url, type: result.type })}
                    onSave={() => {
                      if (!saveContentMutation.isPending) {
                        saveContentMutation.mutate({
                          contentType: result.type,
                          title: result.title,
                          description: result.description,
                          url: result.url,
                          thumbnail: result.thumbnail,
                          source: result.source,
                          duration: result.duration,
                          metadata: result.metadata,
                        });
                      }
                    }}
                  />
                ))}
              </div>
            )}

            {!isExternalSearching && externalSearchResults.length === 0 && externalSearchQuery && (
              <div className="text-center py-8">
                <Search className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">No results found</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={contentDetailOpen} onOpenChange={setContentDetailOpen}>
        <DialogContent className="max-w-2xl">
          {selectedContent && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <DialogTitle className="text-2xl mb-2">
                      {selectedContent.title}
                    </DialogTitle>
                    <div className="flex items-center gap-2 flex-wrap">
                      {selectedContent.duration && (
                        <Badge variant="secondary">
                          <Clock className="h-3 w-3 mr-1" />
                          {selectedContent.duration} min
                        </Badge>
                      )}
                      {selectedContent.difficulty && (
                        <Badge variant="outline" className="capitalize">
                          {selectedContent.difficulty}
                        </Badge>
                      )}
                      <Badge variant="outline" className="capitalize">
                        {selectedContent.category}
                      </Badge>
                    </div>
                  </div>
                  {(() => {
                    const Icon = getCategoryIcon(selectedContent.category);
                    return (
                      <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-8 w-8 text-primary" />
                      </div>
                    );
                  })()}
                </div>
              </DialogHeader>
              
              <div className="space-y-4 py-4">
                <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(selectedContent.category)} rounded-lg flex items-center justify-center`}>
                  {(() => {
                    const Icon = getCategoryIcon(selectedContent.category);
                    return <Icon className="h-24 w-24 text-primary/40" />;
                  })()}
                </div>
                
                {selectedContent.description && (
                  <div>
                    <h3 className="font-medium mb-2">About This Content</h3>
                    <p className="text-sm text-muted-foreground">
                      {selectedContent.description}
                    </p>
                  </div>
                )}

                {selectedContent.goalTags && selectedContent.goalTags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm">What You'll Gain</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.goalTags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {selectedContent.moodTags && selectedContent.moodTags.length > 0 && (
                  <div>
                    <h3 className="font-medium mb-2 text-sm">Perfect When You're Feeling</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedContent.moodTags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4 flex gap-2">
                  <Button 
                    onClick={handleStartContent}
                    className="flex-1"
                    size="lg"
                    data-testid="button-content-start"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    {(selectedContent as any).url ? "Open" : "Start Now"}
                  </Button>
                  <Button 
                    variant="outline"
                    disabled={saveContentMutation.isPending}
                    onClick={() => {
                      if (!selectedContent) return;
                      saveContentMutation.mutate({
                        contentType: (selectedContent as any).contentType || selectedContent.category,
                        title: selectedContent.title,
                        description: selectedContent.description || "",
                        url: (selectedContent as any).url || "",
                        thumbnail: selectedContent.thumbnailUrl,
                        source: "browse",
                        duration: selectedContent.duration ? String(selectedContent.duration) : undefined,
                        metadata: {
                          goalTags: selectedContent.goalTags,
                          moodTags: selectedContent.moodTags,
                          difficulty: selectedContent.difficulty,
                        },
                      });
                      setContentDetailOpen(false);
                    }}
                    data-testid="button-content-save"
                  >
                    <Bookmark className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => {
                      if (!selectedContent) return;
                      handleAddToSchedule({
                        title: selectedContent.title,
                        url: (selectedContent as any).url || "",
                        type: (selectedContent as any).contentType || selectedContent.category,
                      });
                      setContentDetailOpen(false);
                    }}
                    data-testid="button-content-schedule"
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
