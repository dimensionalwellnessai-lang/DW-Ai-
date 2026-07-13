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
  ChevronLeft,
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
  TrendingUp,
  Leaf,
  Target,
  BookOpen,
  Shuffle,
  Telescope,
  Quote,
  BookMarked,
  History,
  FlameKindling,
  Music2,
  Tv,
  Layers,
  GraduationCap,
  PartyPopper,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { usePageMeta } from "@/hooks/use-page-meta";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import type { WellnessContent, UserProfile } from "@shared/schema";
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

function getYouTubeThumbnail(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname.includes("youtube.com")) {
      const id = parsed.searchParams.get("v");
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
    if (parsed.hostname.includes("youtu.be")) {
      const id = parsed.pathname.slice(1).split("?")[0];
      if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
    }
  } catch {}
  return null;
}

const DIMENSION_IMAGES: Record<string, string> = {
  physical:      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
  emotional:     "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
  financial:     "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=600&q=80",
  social:        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=600&q=80",
  spiritual:     "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=600&q=80",
  intellectual:  "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=600&q=80",
  environmental: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=600&q=80",
  purpose:       "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=600&q=80",
  nutrition:     "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
  general:       "https://images.unsplash.com/photo-1499346374228-67ad95a1d63d?auto=format&fit=crop&w=600&q=80",
};

const CONTENT_THUMBNAILS: Record<string, string[]> = {
  workout: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1549060279-7e168fcee0c2?auto=format&fit=crop&w=700&q=80",
  ],
  meditation: [
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=700&q=80",
  ],
  mindfulness: [
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=700&q=80",
  ],
  nutrition: [
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80",
  ],
  meal: [
    "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=700&q=80",
  ],
  financial: [
    "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=700&q=80",
  ],
  emotional: [
    "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1499346374228-67ad95a1d63d?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=700&q=80",
  ],
  spiritual: [
    "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1536623975707-c4b3b2af565d?auto=format&fit=crop&w=700&q=80",
  ],
  social: [
    "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1491438590914-bc09fcaaf77a?auto=format&fit=crop&w=700&q=80",
  ],
  environmental: [
    "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1508193638397-1c4234db14d8?auto=format&fit=crop&w=700&q=80",
  ],
  intellectual: [
    "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=700&q=80",
  ],
  purpose: [
    "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=700&q=80",
  ],
  entertainment: [
    "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1524985069026-dd778a71c7b4?auto=format&fit=crop&w=700&q=80",
  ],
  article: [
    "https://images.unsplash.com/photo-1456324504439-367cee3b3c32?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80",
  ],
  video: [
    "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=700&q=80",
  ],
  general: [
    "https://images.unsplash.com/photo-1499346374228-67ad95a1d63d?auto=format&fit=crop&w=700&q=80",
    "https://images.unsplash.com/photo-1517520287167-4bbf64a00d66?auto=format&fit=crop&w=700&q=80",
  ],
};

function getContentThumbnail(category: string, id?: string): string {
  const normalized = (category || "general").toLowerCase().replace(/-/g, "");
  const pool =
    CONTENT_THUMBNAILS[normalized] ||
    CONTENT_THUMBNAILS[normalized.replace("physical", "workout")] ||
    CONTENT_THUMBNAILS[normalized.replace("finance", "financial")] ||
    CONTENT_THUMBNAILS[normalized.replace("mind", "mindfulness")] ||
    CONTENT_THUMBNAILS.general;
  const key = id || category;
  const idx = Math.abs(key.split("").reduce((a, c) => a + c.charCodeAt(0), 0)) % pool.length;
  return pool[idx];
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

// ── DW route inference for scheduled content ─────────────────────────────────
function getDwRouteForContent(type: string, title: string): string {
  const t = (type + " " + title).toLowerCase();
  if (/meditat|breathwork|breath|mindful|calm|relax|body scan/.test(t)) return "/spiritual";
  if (/workout|hiit|train|exercise|run|strength|lift|cardio|gym|yoga|stretch|mobility|outdoor|nature|walk|hike|bike|swim|sport|fitness|movement|active/.test(t) || type.toLowerCase() === "workout" || type.toLowerCase() === "outdoor" || type.toLowerCase() === "exercise" || type.toLowerCase() === "fitness") return "/workout";
  if (/meal|eat|lunch|dinner|breakfast|nutrition|cook|recipe|food/.test(t) || type.toLowerCase() === "meal") return "/meal-prep";
  if (/journal|reflect|diary|gratitude|write|writing/.test(t) || type.toLowerCase() === "journaling") return "/journal";
  if (/spiritual|prayer|manifest|affirmation|meditat/.test(t) || type.toLowerCase() === "spiritual" || type.toLowerCase() === "meditation") return "/spiritual";
  if (/finance|budget|money|invest/.test(t)) return "/finances";
  if (/social|friend|family|connect|people|group/.test(t) || type.toLowerCase() === "social") return "/journal";
  if (/learn|study|read|book|course|education|skill/.test(t) || type.toLowerCase() === "learning") return "/life-blueprint";
  if (/sleep|rest|recover|relax|nap/.test(t)) return "/recovery";
  if (/indoor/.test(t) || type.toLowerCase() === "indoor") return "/workout";
  return "/workout";
}

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

// ── Curated Video Library — diverse topics across all 8 wellness dimensions ──
const CURATED_VIDEO_LIBRARY = [
  // PHYSICAL
  { id: "cv01", dimension: "physical", dimensionLabel: "Physical", title: "Full Body HIIT – No Equipment", channel: "Heather Robertson", duration: "28 min", url: "https://www.youtube.com/results?search_query=full+body+hiit+no+equipment+heather+robertson", thumb: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=400&q=80" },
  { id: "cv02", dimension: "physical", dimensionLabel: "Physical", title: "Morning Yoga for Energy", channel: "Yoga With Adriene", duration: "20 min", url: "https://www.youtube.com/results?search_query=morning+yoga+energy+flow+adriene", thumb: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=400&q=80" },
  { id: "cv03", dimension: "physical", dimensionLabel: "Physical", title: "Strength Training for Beginners", channel: "Jeff Nippard", duration: "35 min", url: "https://www.youtube.com/results?search_query=strength+training+beginners+full+workout", thumb: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=400&q=80" },
  { id: "cv04", dimension: "physical", dimensionLabel: "Physical", title: "5-Min Desk Stretch – Posture Reset", channel: "FitnessBlender", duration: "5 min", url: "https://www.youtube.com/results?search_query=desk+stretch+posture+reset+5+minutes", thumb: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=400&q=80" },
  // EMOTIONAL
  { id: "cv05", dimension: "emotional", dimensionLabel: "Emotional", title: "Guided Breathwork for Anxiety", channel: "Wim Hof", duration: "12 min", url: "https://www.youtube.com/results?search_query=guided+breathwork+anxiety+relief", thumb: "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=400&q=80" },
  { id: "cv06", dimension: "emotional", dimensionLabel: "Emotional", title: "How to Process Difficult Emotions", channel: "Therapy in a Nutshell", duration: "18 min", url: "https://www.youtube.com/results?search_query=how+to+process+difficult+emotions+therapy", thumb: "https://images.unsplash.com/photo-1499346374228-67ad95a1d63d?auto=format&fit=crop&w=400&q=80" },
  { id: "cv07", dimension: "emotional", dimensionLabel: "Emotional", title: "10-Min Body Scan Meditation", channel: "Headspace", duration: "10 min", url: "https://www.youtube.com/results?search_query=10+minute+body+scan+meditation+headspace", thumb: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=400&q=80" },
  // FINANCIAL
  { id: "cv08", dimension: "financial", dimensionLabel: "Financial", title: "Budgeting for Beginners – Zero-Based", channel: "Graham Stephan", duration: "22 min", url: "https://www.youtube.com/results?search_query=budgeting+for+beginners+zero+based+budget", thumb: "https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&w=400&q=80" },
  { id: "cv09", dimension: "financial", dimensionLabel: "Financial", title: "Investing in Your 20s & 30s", channel: "Andrei Jikh", duration: "17 min", url: "https://www.youtube.com/results?search_query=investing+20s+30s+beginners+index+funds", thumb: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&w=400&q=80" },
  { id: "cv10", dimension: "financial", dimensionLabel: "Financial", title: "The Psychology of Money", channel: "Thomas Frank", duration: "25 min", url: "https://www.youtube.com/results?search_query=psychology+of+money+habits+wealth+mindset", thumb: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?auto=format&fit=crop&w=400&q=80" },
  // SOCIAL
  { id: "cv11", dimension: "social", dimensionLabel: "Social", title: "How to Make Friends as an Adult", channel: "Psych2Go", duration: "8 min", url: "https://www.youtube.com/results?search_query=how+to+make+friends+as+an+adult", thumb: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=400&q=80" },
  { id: "cv12", dimension: "social", dimensionLabel: "Social", title: "Improve Your Communication Skills", channel: "Charisma on Command", duration: "14 min", url: "https://www.youtube.com/results?search_query=improve+communication+skills+charisma", thumb: "https://images.unsplash.com/photo-1573497620053-ea5300f94f21?auto=format&fit=crop&w=400&q=80" },
  // SPIRITUAL
  { id: "cv13", dimension: "spiritual", dimensionLabel: "Spiritual", title: "Morning Gratitude Meditation", channel: "Great Meditation", duration: "15 min", url: "https://www.youtube.com/results?search_query=morning+gratitude+meditation+guided", thumb: "https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?auto=format&fit=crop&w=400&q=80" },
  { id: "cv14", dimension: "spiritual", dimensionLabel: "Spiritual", title: "Manifestation & Law of Attraction", channel: "Michael Sealey", duration: "30 min", url: "https://www.youtube.com/results?search_query=manifestation+law+of+attraction+guided+meditation", thumb: "https://images.unsplash.com/photo-1490730141103-6cac27aaab94?auto=format&fit=crop&w=400&q=80" },
  // INTELLECTUAL
  { id: "cv15", dimension: "intellectual", dimensionLabel: "Intellectual", title: "How to Learn Anything Faster", channel: "Thomas Frank", duration: "16 min", url: "https://www.youtube.com/results?search_query=how+to+learn+anything+faster+science+study", thumb: "https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&w=400&q=80" },
  { id: "cv16", dimension: "intellectual", dimensionLabel: "Intellectual", title: "The Science of Getting Good Sleep", channel: "Andrew Huberman", duration: "20 min", url: "https://www.youtube.com/results?search_query=science+of+sleep+huberman+lab+improve+sleep", thumb: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=400&q=80" },
  { id: "cv17", dimension: "intellectual", dimensionLabel: "Intellectual", title: "Brain Health & Neuroplasticity", channel: "Huberman Lab", duration: "45 min", url: "https://www.youtube.com/results?search_query=brain+health+neuroplasticity+huberman", thumb: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" },
  // ENVIRONMENTAL
  { id: "cv18", dimension: "environmental", dimensionLabel: "Environmental", title: "How to Build a Calming Home Space", channel: "Pick Up Limes", duration: "12 min", url: "https://www.youtube.com/results?search_query=how+to+create+calming+home+environment", thumb: "https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=400&q=80" },
  { id: "cv19", dimension: "environmental", dimensionLabel: "Environmental", title: "Digital Detox – Reclaim Your Mind", channel: "Matt D'Avella", duration: "18 min", url: "https://www.youtube.com/results?search_query=digital+detox+reclaim+attention+phone+addiction", thumb: "https://images.unsplash.com/photo-1478760329108-5c3ed9d495a0?auto=format&fit=crop&w=400&q=80" },
  // PURPOSE / MINDSET
  { id: "cv20", dimension: "purpose", dimensionLabel: "Purpose", title: "Finding Your Life's Purpose", channel: "Jay Shetty", duration: "22 min", url: "https://www.youtube.com/results?search_query=finding+life+purpose+how+to+know+your+why", thumb: "https://images.unsplash.com/photo-1474540412665-1cdae210ae6b?auto=format&fit=crop&w=400&q=80" },
  { id: "cv21", dimension: "purpose", dimensionLabel: "Purpose", title: "Building Habits That Last", channel: "James Clear", duration: "20 min", url: "https://www.youtube.com/results?search_query=building+habits+that+last+atomic+habits+james+clear", thumb: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=400&q=80" },
  { id: "cv22", dimension: "purpose", dimensionLabel: "Purpose", title: "Overcome Fear & Self-Doubt", channel: "Mel Robbins", duration: "16 min", url: "https://www.youtube.com/results?search_query=overcome+fear+self+doubt+confidence+mel+robbins", thumb: "https://images.unsplash.com/photo-1552664730-d307ca884978?auto=format&fit=crop&w=400&q=80" },
  // NUTRITION
  { id: "cv23", dimension: "nutrition", dimensionLabel: "Nutrition", title: "Meal Prep for the Week – Healthy & Easy", channel: "Pick Up Limes", duration: "25 min", url: "https://www.youtube.com/results?search_query=healthy+meal+prep+week+easy+pick+up+limes", thumb: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=400&q=80" },
  { id: "cv24", dimension: "nutrition", dimensionLabel: "Nutrition", title: "Anti-Inflammatory Foods Explained", channel: "Dr. Mark Hyman", duration: "18 min", url: "https://www.youtube.com/results?search_query=anti+inflammatory+foods+explained+gut+health", thumb: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=400&q=80" },
];

const VIDEO_DIMENSIONS = [
  { key: "physical",      label: "Physical",      emoji: "💪" },
  { key: "emotional",     label: "Emotional",     emoji: "🧠" },
  { key: "financial",     label: "Financial",     emoji: "💰" },
  { key: "social",        label: "Social",        emoji: "🤝" },
  { key: "spiritual",     label: "Spiritual",     emoji: "✨" },
  { key: "intellectual",  label: "Intellectual",  emoji: "📚" },
  { key: "environmental", label: "Environmental", emoji: "🌿" },
  { key: "purpose",       label: "Purpose",       emoji: "🎯" },
  { key: "nutrition",     label: "Nutrition",     emoji: "🥗" },
];

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
    thumbnailUrl: "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1549576490-b0b4831ef60a?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1499346374228-67ad95a1d63d?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1536623975707-c4b3b2af565d?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1593811167562-9cef47bfc4d7?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1476480862126-209bfaa8edc8?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1528715471579-d1bcf0ba5e83?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1554244933-d876deb6b2ff?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1517130038641-a774d04afb3c?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1559839914-17aae19cec71?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1532153975070-2e9ab71f1b14?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1519003722824-194d4455a60c?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1502082553048-f009b84890f8?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1510894347713-fc3dc6166bcc?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1438557068917-ef0a5cd8c2ec?auto=format&fit=crop&w=600&q=80",
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
    thumbnailUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?auto=format&fit=crop&w=600&q=80",
  },
];


const FOR_YOU_PAGE_SIZE = 9;

export default function Browse() {
  usePageMeta("Browse", "Explore curated wellness content, workouts, recipes, and more.");
  useTutorialStart("browse", 1000);
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<"for-you" | "explore" | "video" | "articles" | "discover">("for-you");
  const [exploreCategory, setExploreCategory] = useState<"all" | "videos" | "articles" | "shows" | "music" | "workouts" | "skills" | "events">("all");

  // ── Discover feed state ──
  interface DiscoverCard {
    id: string;
    type: "article" | "video" | "quote" | "fact" | "spiritual" | "lesson";
    bucket: "for_you" | "explore" | "random";
    title: string;
    summary: string;
    synopsis: string;
    dwConnection: string;
    url: string;
    source: string;
    dimension: string;
    readTime: string;
  }
  const [discoverCards, setDiscoverCards] = useState<DiscoverCard[]>([]);
  const [discoverPage, setDiscoverPage] = useState(1);
  const [discoverLoading, setDiscoverLoading] = useState(false);
  const [discoverHasMore, setDiscoverHasMore] = useState(true);
  const [selectedDiscoverCard, setSelectedDiscoverCard] = useState<DiscoverCard | null>(null);
  const discoverSentinelRef = useRef<HTMLDivElement>(null);
  const [discoverFilterOpen, setDiscoverFilterOpen] = useState(false);
  const [discoverFilterBucket, setDiscoverFilterBucket] = useState<string>("all");
  const [discoverFilterType, setDiscoverFilterType] = useState<string>("all");
  const [discoverFilterDimension, setDiscoverFilterDimension] = useState<string>("all");
  const [discoverFilteredCards, setDiscoverFilteredCards] = useState<DiscoverCard[] | null>(null);
  interface ExploreIntelligenceCard {
    id: string;
    type: "article" | "video" | "quote" | "fact" | "spiritual" | "lesson" | "topic";
    title: string;
    summary: string;
    synopsis: string;
    url: string;
    source: string;
    dimension: string;
    readTime: string;
    explainLabel: string;
    explainConnection: string;
    evidenceState:
      | "Observed"
      | "User reported"
      | "Inferred"
      | "Predicted"
      | "Hypothesized"
      | "Unknown"
      | "Symbolic interpretation";
    confidence: "high" | "medium" | "low";
    lens: "observed" | "symbolic";
  }
  interface ExploreIntelligenceSection {
    key: string;
    title: string;
    cards: ExploreIntelligenceCard[];
  }
  const [expandedWhyCardId, setExpandedWhyCardId] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [lengthFilter, setLengthFilter] = useState<"short" | "medium" | "long" | null>(null);
  const [topicFilter, setTopicFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [aiDialogOpen, setAiDialogOpen] = useState(false);
  const [currentMood, setCurrentMood] = useState("");
  const [aiRecommendations, setAiRecommendations] = useState<string[] | null>(null);
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
  const [scheduleContent, setScheduleContent] = useState<{ title: string; url: string; type: string; description?: string } | null>(null);
  const [scheduleTime, setScheduleTime] = useState("");
  // "Apply this?" guardrail – show prompt after user has seen feedSeenCount items
  const [feedSeenCount, setFeedSeenCount] = useState(0);
  const [showApplyPrompt, setShowApplyPrompt] = useState(false);
  const APPLY_PROMPT_THRESHOLD = 5;

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["/api/profile"],
  });

  const { data: dbContent } = useQuery<WellnessContent[]>({
    queryKey: ["/api/wellness-content"],
  });

  const { data: exploreIntelligenceData, isLoading: exploreIntelligenceLoading } = useQuery<{
    sections: ExploreIntelligenceSection[];
    mixWeights: { strong: number; adjacent: number; timely: number; discovery: number };
  }>({
    queryKey: ["/api/discover/feed", "explore-intelligence-v1"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/discover/feed?page=1");
      return res.json();
    },
    staleTime: 15 * 60 * 1000,
    enabled: activeTab === "explore",
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
    enabled: activeTab === "for-you" || activeTab === "video" || activeTab === "explore",
  });

  // For You: Entertainment (TV/movies)
  const { data: entertainmentData, isLoading: entertainmentLoading } = useQuery<{ shows: any[] }>({
    queryKey: ["/api/browse/entertainment"],
    staleTime: 60 * 60 * 1000,
    enabled: activeTab === "for-you" || activeTab === "explore",
  });

  // For You: Activities
  const { data: activitiesData, isLoading: activitiesLoading } = useQuery<{ activities: any[] }>({
    queryKey: ["/api/browse/activities", timeSlotNow],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/browse/activities?slot=${timeSlotNow}`);
      return res.json();
    },
    staleTime: 30 * 60 * 1000, // 30 min — re-fetches when time slot changes
    enabled: activeTab === "for-you" || activeTab === "explore",
  });

  // For You: Learning resources
  const { data: learningData, isLoading: learningLoading } = useQuery<{ resources: any[] }>({
    queryKey: ["/api/browse/learning"],
    staleTime: 60 * 60 * 1000,
    enabled: activeTab === "for-you" || activeTab === "explore",
  });

  // For You + Explore: Music recommendations
  const { data: musicData, isLoading: musicLoading } = useQuery<{ playlists: any[] }>({
    queryKey: ["/api/browse/music"],
    staleTime: 60 * 60 * 1000,
    enabled: activeTab === "for-you" || activeTab === "explore",
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
    enabled: activeTab === "articles" || activeTab === "explore",
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

  // ── Discover feed: fetch a batch of cards ──
  const fetchDiscoverPage = useCallback(async (page: number) => {
    if (discoverLoading) return;
    setDiscoverLoading(true);
    try {
      const res = await apiRequest("GET", `/api/discover/feed?page=${page}`);
      const data = await res.json();
      setDiscoverCards(prev => page === 1 ? data.cards : [...prev, ...data.cards]);
      setDiscoverHasMore(data.hasMore);
      setDiscoverPage(page);
    } catch {
      // silently fail — keep existing cards
    } finally {
      setDiscoverLoading(false);
    }
  }, [discoverLoading]);

  // Load first page when discover tab is activated
  useEffect(() => {
    if (activeTab === "discover" && discoverCards.length === 0) {
      fetchDiscoverPage(1);
    }
  }, [activeTab]);

  // IntersectionObserver: load next page when sentinel enters viewport
  useEffect(() => {
    if (!discoverSentinelRef.current) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && discoverHasMore && !discoverLoading) {
          fetchDiscoverPage(discoverPage + 1);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(discoverSentinelRef.current);
    return () => observer.disconnect();
  }, [discoverHasMore, discoverLoading, discoverPage]);

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

  const feedInteractionMutation = useMutation({
    mutationFn: async (data: { contentTitle: string; contentUrl: string; contentType: string; action: string; topic?: string }) => {
      const response = await apiRequest("POST", "/api/feed-interactions", data);
      if (!response.ok) throw new Error("Failed to record interaction");
      return response.json();
    },
  });

  // Add to Schedule mutation
  const addToScheduleMutation = useMutation({
    mutationFn: async (data: { title: string; scheduledTime: string; contentUrl: string; contentType: string; description?: string; linkedRoute?: string }) => {
      const response = await apiRequest("POST", "/api/feed/add-to-schedule", data);
      if (!response.ok) throw new Error("Failed to schedule");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/schedule-events"] });
      queryClient.invalidateQueries({ queryKey: ["/api/calendar"] });
      toast({ title: "Added to schedule!", description: "Find it in your calendar with a direct DW link." });
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

  const handleAddToSchedule = (item: { title: string; url: string; type: string; description?: string }) => {
    setScheduleContent(item);
    // Default to next hour
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    setScheduleTime(next.toTimeString().slice(0, 5));
    setScheduleDialogOpen(true);
  };

  const handleExploreInteraction = (card: ExploreIntelligenceCard, action: string) => {
    feedInteractionMutation.mutate({
      contentTitle: card.title,
      contentUrl: card.url || card.id,
      contentType: card.type,
      action,
      topic: card.dimension,
    });
  };

  const handleExploreSave = (card: ExploreIntelligenceCard) => {
    if (saveContentMutation.isPending) return;
    saveContentMutation.mutate({
      contentType: card.type,
      title: card.title,
      description: card.summary,
      url: card.url || "",
      source: card.source,
      duration: card.readTime,
      metadata: {
        explainLabel: card.explainLabel,
        evidenceState: card.evidenceState,
        confidence: card.confidence,
      },
    });
    handleExploreInteraction(card, "saved");
  };

  const handleRemindMeLater = (card: ExploreIntelligenceCard) => {
    const reminder = new Date();
    reminder.setDate(reminder.getDate() + 1);
    reminder.setHours(18, 0, 0, 0);
    addToScheduleMutation.mutate({
      title: `Revisit: ${card.title}`,
      scheduledTime: reminder.toISOString(),
      contentUrl: card.url,
      contentType: card.type,
      description: card.summary,
    });
    handleExploreInteraction(card, "remind_later");
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
        rightContent={activeTab === "for-you" ? (
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
          if (v === "saved") {
            setLocation("/library");
            return;
          }
          setActiveTab(v as "for-you" | "explore" | "video" | "articles");
          setTopicFilter("");
          setLengthFilter(null);
          if (v === "explore") setExploreCategory("all");
        }} className="w-full">
          <TabsList className="w-full justify-start px-4 h-12 bg-transparent rounded-xl overflow-x-auto flex-nowrap">
            <TabsTrigger value="for-you" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-for-you">
              <Sparkles className="h-4 w-4 mr-1" />
              For You
            </TabsTrigger>
            <TabsTrigger value="explore" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-explore">
              <Layers className="h-4 w-4 mr-1" />
              Explore
            </TabsTrigger>
            <TabsTrigger value="saved" className="data-[state=active]:bg-primary/10 shrink-0" data-testid="tab-saved">
              <Bookmark className="h-4 w-4 mr-1" />
              Saved
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex-1 overflow-y-auto overflow-x-hidden -webkit-overflow-scrolling-touch">

      {activeTab === "for-you" && (
        <main className="pb-28">
          {/* Time-aware greeting */}
          <div className="flex items-center gap-2 px-4 py-3 border-b border-border/30">
            <Sparkles className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{getTimeGreeting()}{userProfile?.firstName ? `, ${userProfile.firstName}` : ""}</span>
              {" — "}{dayNameNow} picks tailored for you
            </span>
          </div>

          {/* ── Featured Carousel ── */}
          <div className="pt-4 pb-2">
            <div className="flex items-center gap-2 px-4 mb-3">
              <TrendingUp className="h-4 w-4 text-primary" />
              <h2 className="text-sm font-semibold">Featured This Week</h2>
            </div>
            <div className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
              {CURATED_VIDEO_LIBRARY.slice(0, 10).map((v) => (
                <button
                  key={v.id}
                  className="shrink-0 w-52 snap-start text-left group"
                  onClick={() => { if (isSafeExternalUrl(v.url)) window.open(v.url, "_blank", "noopener,noreferrer"); }}
                  data-testid={`card-carousel-${v.id}`}
                >
                  <div className="w-52 h-32 rounded-xl overflow-hidden relative bg-muted mb-2">
                    <img
                      src={v.thumb}
                      alt={v.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                    />
                    <div className="absolute inset-0 bg-black/25 group-hover:bg-black/40 transition-colors rounded-xl" />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="bg-white/90 rounded-full p-2.5">
                        <Play className="h-5 w-5 text-gray-900 fill-gray-900" />
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 flex items-end justify-between">
                      <span className="text-white text-[10px] font-semibold bg-black/50 px-1.5 py-0.5 rounded">{v.dimensionLabel}</span>
                      <span className="text-white text-[10px] bg-black/60 px-1.5 py-0.5 rounded">{v.duration}</span>
                    </div>
                  </div>
                  <p className="text-xs font-semibold leading-snug line-clamp-2 px-0.5">{v.title}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 px-0.5">{v.channel}</p>
                </button>
              ))}
            </div>
          </div>

          {/* ── Unified Mixed Feed ── */}
          {forYouLoading ? (
            <div className="space-y-0 divide-y divide-border/20">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="py-5 space-y-3 animate-pulse">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-16 bg-muted rounded" />
                    <div className="h-3 w-24 bg-muted rounded" />
                  </div>
                  <div className="aspect-video bg-muted rounded-xl" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-3 bg-muted rounded w-full" />
                  <div className="h-3 bg-muted rounded w-2/3" />
                </div>
              ))}
            </div>
          ) : forYouData ? (() => {
            // Build a unified mixed feed from all content types
            type FeedItem =
              | { kind: "video";   data: typeof forYouData.videos[0] }
              | { kind: "article"; data: typeof forYouData.articles[0] }
              | { kind: "workout"; data: NonNullable<typeof forYouData.workouts>[0] }
              | { kind: "meal";    data: NonNullable<typeof forYouData.meal> };

            const raw: FeedItem[] = [];
            forYouData.videos.slice(0, 5).forEach(v => raw.push({ kind: "video", data: v }));
            forYouData.articles.slice(0, 4).forEach(a => raw.push({ kind: "article", data: a }));
            (forYouData.workouts || []).slice(0, 3).forEach(w => raw.push({ kind: "workout", data: w }));
            if (forYouData.meal) raw.push({ kind: "meal", data: forYouData.meal });

            // Interleave: rotate through types rather than grouping
            const byKind: Record<string, FeedItem[]> = {};
            raw.forEach(item => {
              if (!byKind[item.kind]) byKind[item.kind] = [];
              byKind[item.kind].push(item);
            });
            const kinds = Object.keys(byKind);
            const mixed: FeedItem[] = [];
            let anyLeft = true;
            let round = 0;
            while (anyLeft) {
              anyLeft = false;
              for (const k of kinds) {
                if (byKind[k][round]) {
                  mixed.push(byKind[k][round]);
                  anyLeft = true;
                }
              }
              round++;
            }

            const filtered = mixed.filter(item => {
              const url = item.kind === "video" ? item.data.url
                : item.kind === "article" ? item.data.url
                : item.kind === "workout" ? item.data.url
                : item.kind === "meal" ? item.data.url : "";
              return !notInterestedUrls.has(url);
            });

            return (
            <div className="divide-y divide-border/20">
              {filtered.map((item, idx) => {
                if (item.kind === "video") {
                  const video = item.data;
                  const thumb = getContentThumbnail(video.category || "video", video.id);
                  return (
                    <div key={`v-${video.id}`} className="px-4 py-5 space-y-3" data-testid={`card-foryou-video-${video.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Play className="h-3 w-3 text-red-500 fill-red-500" />
                          <span className="font-medium">{video.channel || "YouTube"}</span>
                          {video.duration && <><span>·</span><span>{video.duration}</span></>}
                        </div>
                        <Badge className="text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20">VIDEO</Badge>
                      </div>
                      <button
                        className="w-full aspect-video rounded-xl overflow-hidden relative group block"
                        onClick={() => { if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }}
                        data-testid={`button-foryou-video-thumb-${video.id}`}
                      >
                        <img
                          src={thumb}
                          alt={video.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Play className="h-7 w-7 text-white fill-white ml-1" />
                          </div>
                        </div>
                      </button>
                      <h3 className="font-semibold text-base leading-snug">{video.title}</h3>
                      {video.description && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{video.description}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-video-open-${video.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Watch
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground/50 hover:text-destructive" onClick={() => handleNotInterested({ title: video.title, url: video.url, type: "video" })} title="Not interested" data-testid={`button-foryou-video-notinterested-${video.id}`}>
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (item.kind === "article") {
                  const article = item.data;
                  const thumb = getContentThumbnail((article as any).dimension || "article", article.id);
                  return (
                    <div key={`a-${article.id}`} className="px-4 py-5 space-y-3" data-testid={`card-foryou-article-${article.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <FileText className="h-3 w-3 text-blue-500" />
                          <span className="font-medium">{article.source || "Article"}</span>
                          {article.readTimeMinutes && <><span>·</span><span>{article.readTimeMinutes} min read</span></>}
                        </div>
                        <Badge className="text-[10px] bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20">ARTICLE</Badge>
                      </div>
                      <button
                        className="w-full aspect-video rounded-xl overflow-hidden relative group block"
                        onClick={() => { if (isSafeExternalUrl(article.url)) window.open(article.url, "_blank", "noopener,noreferrer"); }}
                        data-testid={`button-foryou-article-thumb-${article.id}`}
                      >
                        <img
                          src={thumb}
                          alt={article.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute bottom-3 left-3">
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                            <FileText className="h-3 w-3 text-white" />
                            <span className="text-white text-[11px] font-medium">Read Article</span>
                          </div>
                        </div>
                      </button>
                      <h3 className="font-semibold text-base leading-snug">{article.title}</h3>
                      {article.synopsis && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{article.synopsis}</p>}
                      {article.whySuggested && (
                        <div className="flex items-start gap-2 rounded-lg bg-primary/5 px-3 py-2 text-xs text-muted-foreground border border-primary/10">
                          <Sparkles className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                          <span>{article.whySuggested}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (isSafeExternalUrl(article.url)) window.open(article.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-article-open-${article.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Read
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground/50 hover:text-destructive" onClick={() => handleNotInterested({ title: article.title, url: article.url, type: "article" })} title="Not interested">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (item.kind === "workout") {
                  const workout = item.data;
                  const thumb = getContentThumbnail("workout", workout.id);
                  return (
                    <div key={`w-${workout.id}`} className="px-4 py-5 space-y-3" data-testid={`card-foryou-workout-${workout.id}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Dumbbell className="h-3 w-3 text-orange-500" />
                          <span className="font-medium">{workout.duration || "Workout"}</span>
                          {workout.difficulty && <><span>·</span><span className="capitalize">{workout.difficulty}</span></>}
                        </div>
                        <Badge className="text-[10px] bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20">WORKOUT</Badge>
                      </div>
                      <button
                        className="w-full aspect-video rounded-xl overflow-hidden relative group block"
                        onClick={() => { if (isSafeExternalUrl(workout.url)) window.open(workout.url, "_blank", "noopener,noreferrer"); }}
                        data-testid={`button-foryou-workout-thumb-${workout.id}`}
                      >
                        <img
                          src={thumb}
                          alt={workout.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/25 group-hover:bg-black/35 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center group-hover:bg-white/30 transition-colors">
                            <Dumbbell className="h-6 w-6 text-white" />
                          </div>
                        </div>
                      </button>
                      <h3 className="font-semibold text-base leading-snug">{workout.title}</h3>
                      {workout.description && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{workout.description}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (isSafeExternalUrl(workout.url)) window.open(workout.url, "_blank", "noopener,noreferrer"); }} data-testid={`button-foryou-workout-open-${workout.id}`}>
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                        </Button>
                        <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => handleAddToSchedule({ title: workout.title, url: workout.url || "", type: "workout" })} data-testid={`button-foryou-workout-schedule-${workout.id}`}>
                          <Calendar className="h-3.5 w-3.5" /> Schedule
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground/50 hover:text-destructive" onClick={() => handleNotInterested({ title: workout.title, url: workout.url, type: "workout" })} title="Not interested">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                if (item.kind === "meal") {
                  const meal = item.data;
                  const thumb = getContentThumbnail("meal", meal.id);
                  return (
                    <div key={`m-${meal.id}`} className="px-4 py-5 space-y-3" data-testid="card-foryou-meal">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Utensils className="h-3 w-3 text-yellow-500" />
                          <span className="font-medium">Meal Idea</span>
                          {meal.prepTime && <><span>·</span><span>{meal.prepTime}</span></>}
                        </div>
                        <Badge className="text-[10px] bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 border-yellow-500/20">RECIPE</Badge>
                      </div>
                      <button
                        className="w-full aspect-video rounded-xl overflow-hidden relative group block"
                        onClick={() => { if (isSafeExternalUrl(meal.url)) window.open(meal.url, "_blank", "noopener,noreferrer"); }}
                        data-testid="button-foryou-meal-thumb"
                      >
                        <img
                          src={thumb}
                          alt={meal.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                        <div className="absolute bottom-3 left-3">
                          <div className="flex items-center gap-1.5 bg-black/50 backdrop-blur-sm px-2 py-1 rounded-full">
                            <Utensils className="h-3 w-3 text-white" />
                            <span className="text-white text-[11px] font-medium">View Recipe</span>
                          </div>
                        </div>
                      </button>
                      <h3 className="font-semibold text-base leading-snug">{meal.title}</h3>
                      {meal.description && <p className="text-sm text-muted-foreground leading-relaxed line-clamp-2">{meal.description}</p>}
                      <div className="flex items-center gap-2">
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => { if (isSafeExternalUrl(meal.url)) window.open(meal.url, "_blank", "noopener,noreferrer"); }} data-testid="button-foryou-meal-open">
                          <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> View Recipe
                        </Button>
                        <Button size="icon" variant="ghost" className="text-muted-foreground/50 hover:text-destructive" onClick={() => handleNotInterested({ title: meal.title, url: meal.url, type: "meal" })} title="Not interested">
                          <ThumbsDown className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }

                return null;
              })}
            </div>
            );
          })() : null}

          {/* ── Secondary Sections ── */}
          <div className="px-4 pt-6 space-y-8">
          {/* Entertainment: TV/Movies */}
          {(entertainmentLoading || (entertainmentData?.shows && entertainmentData.shows.length > 0)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Video className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Worth Watching</h2>
                {entertainmentLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {entertainmentData?.shows && (
                <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
                  {entertainmentData.shows.map((show: any, idx: number) => (
                    <button
                      key={show.id || idx}
                      className="shrink-0 w-40 snap-start text-left group"
                      onClick={() => isSafeExternalUrl(show.searchUrl) && window.open(show.searchUrl, "_blank", "noopener,noreferrer")}
                      data-testid={`card-entertainment-${idx}`}
                    >
                      <div className="w-40 h-24 rounded-xl overflow-hidden relative bg-muted mb-2">
                        <img
                          src={getContentThumbnail("entertainment", String(idx))}
                          alt={show.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 transition-colors" />
                        <div className="absolute top-2 left-2">
                          <span className="text-white text-[10px] bg-violet-600/80 px-1.5 py-0.5 rounded font-medium">{show.platform}</span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold leading-snug line-clamp-2 px-0.5">{show.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 px-0.5 line-clamp-1">{show.whyPicked}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Activities */}
          {(activitiesLoading || (activitiesData?.activities && activitiesData.activities.length > 0)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">
                  {timeSlotNow === "morning" || timeSlotNow === "late-morning" ? "Start Your Day With" :
                   timeSlotNow === "afternoon" ? "Recharge This Afternoon" :
                   timeSlotNow === "evening" ? "Wind Down Tonight" :
                   "Before You Sleep"}
                </h2>
                {activitiesLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {activitiesData?.activities && (
                <div className="space-y-3">
                  {activitiesData.activities.map((activity: any, idx: number) => {
                    const activityType = (activity.type || "general").toLowerCase();
                    const thumb = getContentThumbnail(
                      activityType.includes("outdoor") || activityType.includes("nature") ? "environmental"
                      : activityType.includes("meditat") || activityType.includes("breath") ? "meditation"
                      : activityType.includes("social") ? "social"
                      : activityType.includes("exercise") || activityType.includes("fitness") ? "workout"
                      : activityType.includes("journal") || activityType.includes("write") ? "intellectual"
                      : activityType.includes("spiritual") || activityType.includes("prayer") ? "spiritual"
                      : "general",
                      String(idx)
                    );
                    const route = getDwRouteForContent(activity.type || "", activity.title || "");
                    return (
                      <Card
                        key={activity.id || idx}
                        className="card-modern overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                        onClick={() => setLocation(route)}
                        data-testid={`card-activity-${idx}`}
                      >
                        <div className="aspect-[16/7] w-full overflow-hidden relative">
                          <img
                            src={thumb}
                            alt={activity.title}
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="flex items-center gap-2 flex-wrap">
                              <Badge className="text-[10px] bg-white/20 text-white border-white/30 backdrop-blur-sm capitalize">{activity.type}</Badge>
                              {activity.duration && (
                                <Badge className="text-[10px] bg-white/20 text-white border-white/30 backdrop-blur-sm">
                                  <Clock className="h-2.5 w-2.5 mr-1" />{activity.duration}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                        <CardContent className="p-3">
                          <p className="font-semibold text-sm leading-snug mb-1">{activity.title}</p>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{activity.description}</p>
                          {activity.whyPicked && (
                            <p className="text-xs text-primary italic mb-2 line-clamp-2">"{activity.whyPicked}"</p>
                          )}
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 text-xs h-8"
                              onClick={(e) => { e.stopPropagation(); setLocation(route); }}
                              data-testid={`button-activity-open-${idx}`}
                            >
                              <Compass className="h-3 w-3 mr-1.5" />
                              Try This
                            </Button>
                            {activity.canAddToSchedule && (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="text-xs h-8 px-2"
                                onClick={(e) => { e.stopPropagation(); handleAddToSchedule({ title: activity.title, url: "", type: "activity" }); }}
                                data-testid={`button-activity-schedule-${idx}`}
                              >
                                <Calendar className="h-3 w-3 mr-1" />
                                Schedule
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Learning */}
          {(learningLoading || (learningData?.resources && learningData.resources.length > 0)) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                <h2 className="text-lg font-semibold">Learn Something</h2>
                {learningLoading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {learningData?.resources && (
                <div className="space-y-2">
                  {learningData.resources.map((resource: any, idx: number) => (
                    <Card
                      key={resource.id || idx}
                      className="card-modern overflow-hidden cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => isSafeExternalUrl(resource.url) && window.open(resource.url, "_blank", "noopener,noreferrer")}
                      data-testid={`card-learning-${idx}`}
                    >
                      <div className="aspect-[16/7] w-full overflow-hidden relative">
                        <img
                          src={getContentThumbnail(
                            resource.type === "video" ? "video"
                            : resource.type === "podcast" ? "intellectual"
                            : "article",
                            String(idx)
                          )}
                          alt={resource.title}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                        <div className="absolute top-2 left-2">
                          <Badge className="text-[10px] bg-black/50 text-white border-white/20 backdrop-blur-sm capitalize">
                            {resource.type === "video" ? "🎬 Video"
                             : resource.type === "podcast" ? "🎙️ Podcast"
                             : "📖 Article"}
                          </Badge>
                        </div>
                        {resource.duration && (
                          <div className="absolute bottom-2 right-2 bg-black/60 px-1.5 py-0.5 rounded text-white text-[10px]">
                            {resource.duration}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-3">
                        <div className="flex items-center gap-1.5 mb-1">
                          <Badge variant="outline" className="text-[10px] capitalize">{resource.source}</Badge>
                        </div>
                        <p className="font-semibold text-sm leading-snug mb-1 line-clamp-2">{resource.title}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2 mb-2">{resource.description}</p>
                        {resource.whyPicked && (
                          <p className="text-xs text-primary italic mb-2 line-clamp-1">"{resource.whyPicked}"</p>
                        )}
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 text-xs h-8"
                            onClick={(e) => { e.stopPropagation(); isSafeExternalUrl(resource.url) && window.open(resource.url, "_blank", "noopener,noreferrer"); }}
                            data-testid={`button-learning-open-${idx}`}
                          >
                            <ExternalLink className="h-3 w-3 mr-1.5" />
                            {resource.type === "video" ? "Watch" : resource.type === "podcast" ? "Listen" : "Read"}
                          </Button>
                          {resource.canAddToSchedule && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs h-8 px-2"
                              onClick={(e) => { e.stopPropagation(); handleAddToSchedule({ title: resource.title, url: resource.url || "", type: "learning" }); }}
                              data-testid={`button-learning-schedule-${idx}`}
                            >
                              <Calendar className="h-3 w-3 mr-1" />
                              Schedule
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── Music for Your Mood ── */}
          {(musicLoading || (musicData?.playlists && musicData.playlists.length > 0)) && (
            <div className="pt-4 pb-2 border-t border-border/30 mt-2">
              <div className="flex items-center gap-2 px-4 mb-3">
                <Music2 className="h-4 w-4 text-violet-500" />
                <h2 className="text-sm font-semibold">Music for Your Mood</h2>
                {musicLoading && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground ml-1" />}
                <span className="text-xs text-muted-foreground ml-auto">DW picked these for right now</span>
              </div>
              {musicData?.playlists && (
                <div className="flex gap-3 overflow-x-auto pb-2 px-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                  {musicData.playlists.map((pl: any, idx: number) => (
                    <div
                      key={idx}
                      className="shrink-0 w-44 snap-start"
                      data-testid={`card-music-${idx}`}
                    >
                      <div
                        className="w-44 h-44 rounded-xl overflow-hidden relative group cursor-pointer"
                        style={{ background: `hsl(${(idx * 47 + 200) % 360}, 60%, 45%)` }}
                        onClick={() => { if (isSafeExternalUrl(pl.spotifySearchUrl)) window.open(pl.spotifySearchUrl, "_blank", "noopener,noreferrer"); }}
                      >
                        <div className="absolute inset-0 flex flex-col items-center justify-center p-3">
                          <Music2 className="h-10 w-10 text-white/80 mb-2" />
                          <p className="text-white text-xs font-bold text-center leading-tight line-clamp-2">{pl.title}</p>
                          <p className="text-white/70 text-[10px] mt-1">{pl.genre}</p>
                        </div>
                        <div className="absolute bottom-0 inset-x-0 p-2 flex gap-1.5">
                          <button
                            className="flex-1 text-[10px] bg-green-500 hover:bg-green-400 text-white rounded-full px-1.5 py-0.5 font-medium truncate"
                            onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(pl.spotifySearchUrl)) window.open(pl.spotifySearchUrl, "_blank", "noopener,noreferrer"); }}
                            data-testid={`button-music-spotify-${idx}`}
                          >Spotify</button>
                          <button
                            className="flex-1 text-[10px] bg-red-500 hover:bg-red-400 text-white rounded-full px-1.5 py-0.5 font-medium truncate"
                            onClick={(e) => { e.stopPropagation(); if (isSafeExternalUrl(pl.youtubeSearchUrl)) window.open(pl.youtubeSearchUrl, "_blank", "noopener,noreferrer"); }}
                            data-testid={`button-music-youtube-${idx}`}
                          >YouTube</button>
                        </div>
                      </div>
                      <div className="mt-2 px-0.5">
                        <p className="text-xs font-semibold leading-tight line-clamp-1">{pl.mood}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{pl.why}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

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
                return (
                  <Card
                    key={item.id}
                    className="card-modern hover-lift cursor-pointer transition-all"
                    onClick={() => handleContentClick(item)}
                    data-testid={`card-foryou-${item.id}`}
                  >
                    <div className="aspect-video rounded-t-md overflow-hidden relative group">
                      <img
                        src={(item as any).thumbnailUrl || getContentThumbnail(item.category, item.id)}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                      <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
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
          </div>
        </main>
      )}

      {false && activeTab === "discover" && (() => {
        const bucketMeta = {
          for_you:  { label: "For You",         Icon: Sparkles,      color: "text-primary",     bg: "bg-primary/10"     },
          explore:  { label: "Explore",          Icon: Telescope,     color: "text-blue-500",    bg: "bg-blue-500/10"    },
          random:   { label: "Surprise",         Icon: Shuffle,       color: "text-orange-500",  bg: "bg-orange-500/10"  },
        } as const;
        const typeMeta = {
          article:  { Icon: FileText,            color: "text-sky-500"     },
          video:    { Icon: Play,                color: "text-red-500"     },
          quote:    { Icon: Quote,               color: "text-violet-500"  },
          fact:     { Icon: Zap,                 color: "text-yellow-500"  },
          spiritual:{ Icon: Star,                color: "text-purple-500"  },
          lesson:   { Icon: BookMarked,          color: "text-green-500"   },
        } as const;

        return (
          <main className="p-4 space-y-4 pb-28">
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold">Your AI Feed</h2>
                <p className="text-xs text-muted-foreground">Live content — personalized, exploratory, and surprising</p>
              </div>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={discoverFilterBucket !== "all" || discoverFilterType !== "all" || discoverFilterDimension !== "all" ? "default" : "outline"}
                  onClick={() => setDiscoverFilterOpen(true)}
                  data-testid="button-discover-filter"
                >
                  <Filter className="h-3.5 w-3.5 mr-1.5" />Filter
                  {(discoverFilterBucket !== "all" || discoverFilterType !== "all" || discoverFilterDimension !== "all") && (
                    <span className="ml-1 bg-white/20 rounded-full px-1.5 py-0.5 text-xs">
                      {[discoverFilterBucket, discoverFilterType, discoverFilterDimension].filter(v => v !== "all").length}
                    </span>
                  )}
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => { setDiscoverCards([]); setDiscoverPage(1); setDiscoverHasMore(true); fetchDiscoverPage(1); }}
                  disabled={discoverLoading}
                  data-testid="button-discover-refresh"
                >
                  <Shuffle className="h-3.5 w-3.5 mr-1.5" />Refresh
                </Button>
              </div>
            </div>

            {/* Filter drawer */}
            {discoverFilterOpen && (
              <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40 backdrop-blur-sm" onClick={() => setDiscoverFilterOpen(false)}>
                <div className="bg-background border-t rounded-t-2xl p-5 space-y-5 shadow-2xl w-full max-w-2xl mx-auto" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-base">Filter discover</h3>
                    <Button size="sm" variant="ghost" onClick={() => { setDiscoverFilterBucket("all"); setDiscoverFilterType("all"); setDiscoverFilterDimension("all"); }} data-testid="button-filter-clear">Clear all</Button>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Bucket</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "for_you", "explore", "random"] as const).map(b => (
                        <button
                          key={b}
                          onClick={() => setDiscoverFilterBucket(b)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${discoverFilterBucket === b ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"}`}
                          data-testid={`button-filter-bucket-${b}`}
                        >
                          {b === "all" ? "All" : b === "for_you" ? "For You" : b === "explore" ? "Explore" : "Surprise"}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Content type</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "article", "video", "quote", "fact", "spiritual", "lesson"] as const).map(t => (
                        <button
                          key={t}
                          onClick={() => setDiscoverFilterType(t)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${discoverFilterType === t ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"}`}
                          data-testid={`button-filter-type-${t}`}
                        >
                          {t === "all" ? "All types" : t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Wellness dimension</p>
                    <div className="flex gap-2 flex-wrap">
                      {(["all", "emotional", "physical", "financial", "spiritual", "intellectual", "social", "environmental", "purpose"] as const).map(d => (
                        <button
                          key={d}
                          onClick={() => setDiscoverFilterDimension(d)}
                          className={`px-3 py-1.5 rounded-full text-sm border transition-colors capitalize ${discoverFilterDimension === d ? "bg-primary text-primary-foreground border-primary" : "border-muted-foreground/30 text-muted-foreground hover:border-primary/50"}`}
                          data-testid={`button-filter-dim-${d}`}
                        >
                          {d === "all" ? "All dimensions" : d}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button className="w-full" onClick={() => setDiscoverFilterOpen(false)} data-testid="button-filter-apply">
                    Apply filters
                  </Button>
                </div>
              </div>
            )}

            {/* Bucket pills — active filter indicator */}
            <div className="flex gap-2 flex-wrap">
              {(["for_you", "explore", "random"] as const).map(b => {
                const m = bucketMeta[b];
                const isActive = discoverFilterBucket === b;
                return (
                  <button
                    key={b}
                    onClick={() => setDiscoverFilterBucket(discoverFilterBucket === b ? "all" : b)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full transition-colors ${isActive ? m.bg + " ring-1 ring-offset-1 ring-primary" : m.bg}`}
                    data-testid={`button-bucket-pill-${b}`}
                  >
                    <m.Icon className={`h-3 w-3 ${m.color}`} />
                    <span className={`text-xs font-medium ${m.color}`}>{m.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Initial loading skeleton */}
            {discoverLoading && discoverCards.length === 0 && (
              <div className="space-y-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="rounded-2xl border bg-card p-4 animate-pulse space-y-3">
                    <div className="h-3 bg-muted rounded w-1/4" />
                    <div className="h-4 bg-muted rounded w-5/6" />
                    <div className="h-3 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                ))}
                <p className="text-xs text-center text-muted-foreground pt-2">DW is curating your feed…</p>
              </div>
            )}

            {/* Card list */}
            <div className="space-y-3">
              {(discoverCards.filter(card => {
                if (discoverFilterBucket !== "all" && card.bucket !== discoverFilterBucket) return false;
                if (discoverFilterType !== "all" && card.type !== discoverFilterType) return false;
                if (discoverFilterDimension !== "all" && card.dimension !== discoverFilterDimension) return false;
                return true;
              })).map((card) => {
                const bm = bucketMeta[card.bucket] ?? bucketMeta.random;
                const tm = typeMeta[card.type as keyof typeof typeMeta] ?? typeMeta.article;
                const TypeIcon = tm.Icon;
                const BucketIcon = bm.Icon;
                return (
                  <Card
                    key={card.id}
                    className="card-modern cursor-pointer active:scale-[0.99] transition-transform"
                    onClick={() => setSelectedDiscoverCard(card)}
                    data-testid={`card-discover-${card.id}`}
                  >
                    <CardContent className="p-4">
                      {/* Top row: bucket + type badges */}
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bm.bg} ${bm.color}`}>
                          <BucketIcon className="h-3 w-3" />
                          {bm.label}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TypeIcon className={`h-3 w-3 ${tm.color}`} />
                          <span className="capitalize">{card.type}</span>
                        </div>
                        <span className="ml-auto text-xs text-muted-foreground">{card.source}</span>
                      </div>

                      {/* Title */}
                      <h3 className="font-semibold text-sm leading-snug mb-1.5">{card.title}</h3>

                      {/* Summary */}
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{card.summary}</p>

                      {/* Bottom row */}
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-border/40">
                        <span className="text-xs text-muted-foreground capitalize">{card.dimension} · {card.readTime}</span>
                        <div className="flex items-center gap-1 text-xs text-primary font-medium">
                          <span>See more</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Infinite scroll sentinel */}
            <div ref={discoverSentinelRef} className="h-10 flex items-center justify-center">
              {discoverLoading && discoverCards.length > 0 && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  Loading more…
                </div>
              )}
            </div>

            {/* Empty state */}
            {!discoverLoading && discoverCards.length === 0 && (
              <div className="flex flex-col items-center py-16 text-center space-y-4 px-8">
                <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
                  <Telescope className="h-7 w-7 text-primary/60" />
                </div>
                <div>
                  <h3 className="font-semibold">Nothing yet</h3>
                  <p className="text-sm text-muted-foreground mt-1">Tap Refresh to load your feed</p>
                </div>
                <Button onClick={() => fetchDiscoverPage(1)} data-testid="button-discover-load">
                  <Telescope className="h-4 w-4 mr-2" />Load Feed
                </Button>
              </div>
            )}

            {/* ── Card Expansion Sheet ── */}
            {selectedDiscoverCard && (() => {
              const card = selectedDiscoverCard;
              const bm = bucketMeta[card.bucket] ?? bucketMeta.random;
              const tm = typeMeta[card.type as keyof typeof typeMeta] ?? typeMeta.article;
              const TypeIcon = tm.Icon;
              return (
                <div
                  className="fixed inset-0 z-50 flex flex-col justify-end bg-black/50 backdrop-blur-sm"
                  onClick={(e) => { if (e.target === e.currentTarget) setSelectedDiscoverCard(null); }}
                  data-testid="overlay-discover-card"
                >
                  <div className="bg-background rounded-t-3xl max-h-[85vh] overflow-y-auto">
                    {/* Handle */}
                    <div className="flex justify-center pt-3 pb-1">
                      <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                    </div>

                    <div className="p-5 space-y-4">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${bm.bg} ${bm.color}`}>
                              <bm.Icon className="h-3 w-3" />
                              {bm.label}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              <TypeIcon className={`h-3 w-3 ${tm.color}`} />
                              <span className="capitalize">{card.type} · {card.source}</span>
                            </div>
                          </div>
                          <h2 className="text-base font-bold leading-snug">{card.title}</h2>
                        </div>
                        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setSelectedDiscoverCard(null)} data-testid="button-close-discover-card">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                      {/* Synopsis */}
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Synopsis</p>
                        <p className="text-sm leading-relaxed">{card.synopsis || card.summary}</p>
                      </div>

                      {/* DW connection */}
                      <div className="p-3 rounded-xl bg-primary/5 border border-primary/10 flex gap-3">
                        <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                          <Sparkles className="h-3.5 w-3.5 text-primary" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-primary mb-0.5">Why DW picked this</p>
                          <p className="text-xs text-muted-foreground leading-relaxed">{card.dwConnection}</p>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="flex flex-col gap-2 pt-1">
                        {card.url ? (
                          <Button
                            className="w-full"
                            onClick={() => window.open(card.url, "_blank", "noopener,noreferrer")}
                            data-testid="button-discover-open-content"
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            {card.type === "video" ? "Watch on " + card.source : "Read on " + card.source}
                          </Button>
                        ) : (
                          <div className="text-xs text-center text-muted-foreground py-2">
                            This is a self-contained insight — no external link needed.
                          </div>
                        )}
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => {
                            setSelectedDiscoverCard(null);
                            setLocation(`/talk?topic=${encodeURIComponent("Let's explore: " + card.title)}`);
                          }}
                          data-testid="button-discover-chat-dw"
                        >
                          <MessageCircle className="h-4 w-4 mr-2" />Talk to DW about this
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </main>
        );
      })()}

      {false && activeTab === "all" && (
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

      {false && activeTab === "all" && userProfile && (
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

      {false && activeTab === "all" && (
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
                  <div className={`aspect-video bg-gradient-to-br ${getCategoryGradient(item.category)} rounded-t-md flex items-center justify-center relative group overflow-hidden`}>
                    {"thumbnailUrl" in item && item.thumbnailUrl && (
                      <img
                        src={item.thumbnailUrl}
                        alt={item.title}
                        className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    )}
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/20 transition-colors" />
                    <CategoryIcon className="relative h-10 w-10 text-white/40 group-hover:scale-110 transition-transform" />
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

      {/* ── Explore Tab ── */}
      {activeTab === "explore" && (
        <main className="pb-28">
          <div className="px-4 pt-4 pb-3 border-b border-border/30">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search Explore Intelligence..."
                value={topicFilter}
                onChange={(e) => setTopicFilter(e.target.value)}
                className="pl-9 pr-9 rounded-full bg-muted/50 border-0 focus-visible:ring-1"
                data-testid="input-explore-search"
              />
              {topicFilter && (
                <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setTopicFilter("")}>
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              )}
            </div>
          </div>

          <div className="p-4 space-y-5">
            {exploreIntelligenceData?.mixWeights && (
              <Card className="border-border/40 bg-muted/30">
                <CardContent className="p-3 text-xs text-muted-foreground space-y-1">
                  <p className="font-medium text-foreground">Recommendation mix (adaptive)</p>
                  <p>
                    {Math.round(exploreIntelligenceData.mixWeights.strong)}% strong relevance ·{" "}
                    {Math.round(exploreIntelligenceData.mixWeights.adjacent)}% adjacent interests ·{" "}
                    {Math.round(exploreIntelligenceData.mixWeights.timely)}% timely context ·{" "}
                    {Math.round(exploreIntelligenceData.mixWeights.discovery)}% intentional discovery
                  </p>
                </CardContent>
              </Card>
            )}

            {exploreIntelligenceLoading && (
              <div className="space-y-3">
                {[1, 2, 3].map((item) => (
                  <div key={item} className="rounded-xl border p-4 animate-pulse space-y-2">
                    <div className="h-3 bg-muted rounded w-1/3" />
                    <div className="h-4 bg-muted rounded w-full" />
                    <div className="h-3 bg-muted rounded w-4/5" />
                  </div>
                ))}
              </div>
            )}

            {(exploreIntelligenceData?.sections || [])
              .map((section) => ({
                ...section,
                cards: section.cards.filter((card) => {
                  if (!topicFilter.trim()) return true;
                  const q = topicFilter.toLowerCase();
                  return (
                    card.title.toLowerCase().includes(q) ||
                    card.summary.toLowerCase().includes(q) ||
                    card.dimension.toLowerCase().includes(q) ||
                    card.explainLabel.toLowerCase().includes(q)
                  );
                }),
              }))
              .filter((section) => section.cards.length > 0)
              .map((section) => (
                <section key={section.key} className="space-y-2.5" data-testid={`explore-section-${section.key}`}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{section.title}</h3>
                    <span className="text-[11px] text-muted-foreground">{section.cards.length} picks</span>
                  </div>
                  <div className="space-y-2.5">
                    {section.cards.slice(0, section.key === "browse_topics" ? 8 : 4).map((card) => (
                      <Card key={card.id} className="border-border/40">
                        <CardContent className="p-3 space-y-2.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="capitalize text-[10px]">{card.dimension}</Badge>
                            <Badge variant="secondary" className="text-[10px]">{card.explainLabel}</Badge>
                            <Badge variant="outline" className="text-[10px]">{card.evidenceState}</Badge>
                            <Badge variant="outline" className="text-[10px] uppercase">{card.confidence}</Badge>
                            {card.lens === "symbolic" && (
                              <Badge className="text-[10px] bg-violet-500/10 text-violet-700 dark:text-violet-300 border border-violet-500/20">
                                Symbolic interpretation
                              </Badge>
                            )}
                          </div>

                          <div>
                            <p className="text-sm font-semibold leading-snug">{card.title}</p>
                            <p className="text-xs text-muted-foreground mt-1">{card.summary}</p>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                if (card.url && isSafeExternalUrl(card.url)) {
                                  window.open(card.url, "_blank", "noopener,noreferrer");
                                }
                                handleExploreInteraction(card, "open");
                              }}
                              data-testid={`button-explore-open-${card.id}`}
                            >
                              <ExternalLink className="h-3.5 w-3.5 mr-1.5" />
                              Open
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setExpandedWhyCardId((current) => (current === card.id ? null : card.id))}
                              data-testid={`button-explore-why-${card.id}`}
                            >
                              Ask why
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleExploreSave(card)}>Save</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleExploreInteraction(card, "more_like_this")}>More like this</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleExploreInteraction(card, "less_like_this")}>Less like this</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleNotInterested({ title: card.title, url: card.url || card.id, type: card.type, topic: card.dimension })}>Not interested</Button>
                            <Button size="sm" variant="ghost" onClick={() => handleRemindMeLater(card)}>Remind me later</Button>
                          </div>

                          {expandedWhyCardId === card.id && (
                            <div className="rounded-lg border bg-muted/40 p-2.5 text-xs text-muted-foreground space-y-1">
                              <p className="font-medium text-foreground">Explain connection</p>
                              <p>{card.explainConnection}</p>
                              {card.lens === "symbolic" && (
                                <p className="text-violet-700 dark:text-violet-300">
                                  This symbolic card is optional and separate from observed data.
                                </p>
                              )}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}

            {!exploreIntelligenceLoading && !exploreIntelligenceData?.sections?.length && (
              <div className="text-center py-10">
                <Telescope className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">Explore is keeping things quiet right now.</p>
              </div>
            )}
          </div>
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

          {/* ── Right now picks (Perplexity / time-aware) ── */}
          {forYouLoading ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Finding picks for you…</h2>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex gap-3 animate-pulse">
                  <div className="w-20 h-14 rounded-lg bg-muted shrink-0" />
                  <div className="flex-1 space-y-1.5 py-1">
                    <div className="h-3.5 bg-muted rounded w-3/4" />
                    <div className="h-3 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : forYouData?.videos && forYouData.videos.filter(v => !notInterestedUrls.has(v.url)).length > 0 ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h2 className="text-base font-semibold">Picks for {forYouData.timeLabel ?? timeSlotNow}</h2>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setSearchDialogType("youtube");
                    setSearchDialogOpen(true);
                    setExternalSearchQuery("");
                    setExternalSearchResults([]);
                  }}
                  className="text-xs h-7"
                  data-testid="button-video-search-youtube"
                >
                  <Youtube className="h-3.5 w-3.5 mr-1" />
                  Search
                </Button>
              </div>
              <div className="space-y-2">
                {forYouData.videos.filter(v => !notInterestedUrls.has(v.url)).map((video) => (
                  <Card key={video.id} className="card-modern hover-lift cursor-pointer" onClick={() => { if (isSafeExternalUrl(video.url)) window.open(video.url, "_blank", "noopener,noreferrer"); }} data-testid={`card-video-rec-${video.id}`}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <div className={`w-20 h-14 rounded-lg shrink-0 flex items-center justify-center bg-gradient-to-br ${getCategoryGradient(video.category)} relative overflow-hidden`}>
                        {(() => {
                          const yt = getYouTubeThumbnail(video.url);
                          return yt ? (
                            <img src={yt} alt={video.title} className="absolute inset-0 w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                          ) : null;
                        })()}
                        <Play className="relative h-5 w-5 text-white/70 drop-shadow" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm leading-snug line-clamp-2">{video.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">{video.channel}{video.duration ? ` · ${video.duration}` : ""}</p>
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
          ) : (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Youtube className="h-4 w-4 text-primary" />
                <h2 className="text-base font-semibold">Explore Videos</h2>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setSearchDialogType("youtube");
                  setSearchDialogOpen(true);
                  setExternalSearchQuery("");
                  setExternalSearchResults([]);
                }}
                className="text-xs h-7"
                data-testid="button-video-search-youtube-main"
              >
                <Youtube className="h-3.5 w-3.5 mr-1" />
                Search YouTube
              </Button>
            </div>
          )}

          {/* ── Curated Library — Explore by Wellness Dimension ── */}
          <div className="space-y-6 pb-6">
            <div className="flex items-center gap-2">
              <Compass className="h-4 w-4 text-primary" />
              <h2 className="text-base font-semibold">Explore by Dimension</h2>
            </div>
            {VIDEO_DIMENSIONS.map(({ key, label, emoji }) => {
              const videos = CURATED_VIDEO_LIBRARY.filter(v => v.dimension === key);
              if (videos.length === 0) return null;
              const isFiltered = topicFilter.trim().length > 0;
              const shown = isFiltered
                ? videos.filter(v => v.title.toLowerCase().includes(topicFilter.toLowerCase()) || v.channel.toLowerCase().includes(topicFilter.toLowerCase()))
                : videos;
              if (shown.length === 0) return null;
              return (
                <div key={key} className="space-y-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-base">{emoji}</span>
                    <h3 className="text-sm font-semibold">{label}</h3>
                  </div>
                  <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
                    {shown.map((v) => (
                      <button
                        key={v.id}
                        className="shrink-0 w-44 text-left group"
                        onClick={() => { if (isSafeExternalUrl(v.url)) window.open(v.url, "_blank", "noopener,noreferrer"); }}
                        data-testid={`card-curated-video-${v.id}`}
                      >
                        <div className="w-44 h-28 rounded-xl overflow-hidden relative bg-muted mb-1.5">
                          <img
                            src={v.thumb}
                            alt={v.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                          />
                          <div className="absolute inset-0 bg-black/20 group-hover:bg-black/30 transition-colors" />
                          <div className="absolute bottom-2 right-2 bg-black/60 rounded px-1.5 py-0.5">
                            <span className="text-white text-[10px] font-medium">{v.duration}</span>
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="bg-white/90 rounded-full p-2">
                              <Play className="h-4 w-4 text-gray-900 fill-gray-900" />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs font-medium line-clamp-2 leading-snug">{v.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">{v.channel}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
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
                    <div className="aspect-video w-full overflow-hidden rounded-t-lg relative">
                      <img
                        src={getContentThumbnail(article.category || "article", article.id)}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute top-2 right-2">
                        <Badge variant="secondary" className="text-[10px] bg-black/60 text-white border-0">
                          <Clock className="h-2.5 w-2.5 mr-1" />
                          {article.readTimeMinutes}m
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                        <h3 className="font-semibold text-sm leading-snug mb-1.5">{article.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">{article.synopsis}</p>
                        {article.whySuggested && (
                          <div className="flex items-start gap-1.5 text-xs text-primary bg-primary/5 rounded-md px-2 py-1.5 mb-2">
                            <Sparkles className="h-3 w-3 mt-0.5 shrink-0" />
                            <span>{article.whySuggested}</span>
                          </div>
                        )}
                          <div className="flex gap-2">
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
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ) : null}

          {!aiArticlesLoading && !(aiArticlesData?.articles?.length) && (
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
                  description: scheduleContent.description,
                  linkedRoute: getDwRouteForContent(scheduleContent.type, scheduleContent.title),
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-3xl max-h-[80vh] overflow-y-auto">
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
        <DialogContent className="w-[calc(100%-2rem)] max-w-2xl">
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
    </div>
  );
}
