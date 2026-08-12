import {
  BookOpen,
  Target,
  CheckSquare,
  Dumbbell,
  Utensils,
  Heart,
  Feather,
  Sparkles,
  Wallet,
  Search,
  Award,
  RefreshCw,
  BarChart3,
  CheckCircle2,
  FileText,
  Settings,
  Map,
  MessageSquare,
  MessageCircle,
  Lock,
  Calendar,
  Clock,
  LayoutDashboard,
  BarChart2,
  Activity,
  Brain,
  Sun,
  Users,
  Heart as HeartIcon,
  Handshake,
  Compass,
  Wrench,
  Home,
  User,
  Moon,
  type LucideIcon,
} from "lucide-react";

/**
 * Single source of truth for the app's navigation surfaces.
 *
 * Consumed by:
 * - bottom-nav.tsx        (BOTTOM_NAV_ITEMS)
 * - hamburger-menu.tsx    (NAV_SECTIONS, SETTINGS_ITEMS)
 * - shared-menu.tsx       (NAV_SECTIONS, SETTINGS_ITEMS)
 * - home/command-center-orbit.tsx (ORBIT_MODULES)
 *
 * Labels use canonical names: Command Center, Talk to DW, Calendar,
 * Life Blueprint, My Plan.
 */

export interface NavMenuItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  dimension?: string;
}

export interface NavSection {
  title: string;
  dimensionKey?: string;
  dwContextLabel?: string;
  items: NavMenuItem[];
}

/** Dimension icon colors, keyed by dimensionKey. */
export const DIM_COLORS: Record<string, string> = {
  body: "text-green-500",
  mind: "text-blue-500",
  time: "text-amber-500",
  purpose: "text-violet-500",
  money: "text-emerald-500",
  people: "text-pink-500",
  environment: "text-cyan-500",
  identity: "text-indigo-500",
};

/**
 * The dimension section tree. Every path below is verified to exist in
 * client/src/App.tsx.
 */
export const NAV_SECTIONS: NavSection[] = [
  {
    title: "BODY",
    dimensionKey: "body",
    dwContextLabel: "Body",
    items: [
      { id: "workout", name: "🏋️ Workout", path: "/workout", icon: Dumbbell, dimension: "body" },
      { id: "workout-analytics", name: "📊 Workout Analytics", path: "/workout/analytics", icon: BarChart2, dimension: "body" },
      { id: "health-data", name: "❤️ Health Data", path: "/health-data", icon: Activity, dimension: "body" },
      { id: "wearable-manager", name: "⌚ Wearables & Screen Time", path: "/wearable-manager", icon: Activity, dimension: "body" },
      { id: "meal-prep", name: "🍽️ Meal Prep", path: "/meal-prep", icon: Utensils, dimension: "body" },
      { id: "shopping-list", name: "🛒 Shopping List", path: "/shopping-list", icon: CheckSquare, dimension: "body" },
      { id: "body-scan", name: "🔄 Body Scan", path: "/recovery", icon: RefreshCw, dimension: "body" },
    ],
  },
  {
    title: "MIND",
    dimensionKey: "mind",
    dwContextLabel: "Mind",
    items: [
      { id: "meditation", name: "🧘 Meditation", path: "/spiritual", icon: Heart, dimension: "mind" },
      { id: "journal", name: "📓 Journal", path: "/journal", icon: Feather, dimension: "mind" },
      { id: "insights", name: "💡 Insights", path: "/insights", icon: Brain, dimension: "mind" },
      { id: "mood", name: "🌤️ Mood", path: "/mood-tracker", icon: Sun, dimension: "mind" },
    ],
  },
  {
    title: "TIME & SCHEDULE",
    dimensionKey: "time",
    dwContextLabel: "Time & Schedule",
    items: [
      { id: "calendar-full", name: "📅 Calendar", path: "/calendar", icon: Calendar, dimension: "time" },
      { id: "daily-schedule", name: "⏰ Daily Schedule", path: "/daily-schedule", icon: Clock, dimension: "time" },
      { id: "routines", name: "📝 Routines", path: "/routines", icon: FileText, dimension: "time" },
      { id: "tasks", name: "✅ Tasks", path: "/tasks", icon: CheckSquare, dimension: "time" },
      { id: "weekly-review", name: "🔁 Weekly Review", path: "/weekly-review", icon: RefreshCw, dimension: "time" },
    ],
  },
  {
    title: "PURPOSE",
    dimensionKey: "purpose",
    dwContextLabel: "Purpose",
    items: [
      { id: "my-plan", name: "📋 My Plan", path: "/my-plan", icon: LayoutDashboard, dimension: "purpose" },
      { id: "plans", name: "🗂️ Plans", path: "/plans", icon: LayoutDashboard, dimension: "purpose" },
      { id: "goals", name: "🎯 Goals", path: "/goals", icon: Target, dimension: "purpose" },
      { id: "challenges", name: "🏆 Challenges", path: "/challenges", icon: Award, dimension: "purpose" },
      { id: "habits", name: "✅ Habits", path: "/habits", icon: CheckSquare, dimension: "purpose" },
    ],
  },
  {
    title: "MONEY",
    dimensionKey: "money",
    dwContextLabel: "Money",
    items: [
      { id: "finances", name: "💰 Finances", path: "/finances", icon: Wallet, dimension: "money" },
    ],
  },
  {
    title: "PEOPLE",
    dimensionKey: "people",
    dwContextLabel: "People",
    items: [
      { id: "community", name: "👥 Community", path: "/community", icon: Users, dimension: "people" },
      { id: "relationships", name: "💞 Relationships", path: "/relationships", icon: HeartIcon, dimension: "people" },
      { id: "accountability", name: "🤝 Accountability", path: "/accountability", icon: Handshake, dimension: "people" },
    ],
  },
  {
    title: "ENVIRONMENT",
    dimensionKey: "environment",
    dwContextLabel: "Environment",
    items: [
      { id: "browse", name: "🔍 Browse", path: "/browse", icon: Search, dimension: "environment" },
      { id: "library", name: "📚 Library", path: "/library", icon: BookOpen, dimension: "environment" },
    ],
  },
  {
    title: "IDENTITY",
    dimensionKey: "identity",
    dwContextLabel: "Identity",
    items: [
      { id: "life-blueprint", name: "📜 Life Blueprint", path: "/life-blueprint", icon: BookOpen, dimension: "identity" },
      { id: "cosmic", name: "🌌 Cosmic Hub", path: "/cosmic", icon: Sparkles, dimension: "identity" },
    ],
  },
];

/**
 * Settings / utility menu items. Guidance and Tools live here so they remain
 * reachable after leaving the bottom nav.
 */
export const SETTINGS_ITEMS: NavMenuItem[] = [
  { id: "guidance", name: "🧭 Guidance", path: "/guidance", icon: Compass },
  { id: "tools", name: "🧰 Tools", path: "/tools", icon: Wrench },
  { id: "progress", name: "📊 My Progress", path: "/profile/progress", icon: BarChart3 },
  { id: "settings", name: "⚙️ Settings", path: "/settings", icon: Settings },
  { id: "app-tour", name: "🗺️ App Tour", path: "/app-tour", icon: Map },
  { id: "feedback", name: "📋 Feedback", path: "/feedback", icon: MessageSquare },
  { id: "privacy", name: "🔒 Privacy & Terms", path: "/privacy-terms", icon: Lock },
];

export interface BottomNavItem {
  id: string;
  path: string;
  icon: LucideIcon;
  label: string;
  /** Destination paths reached after router redirects from `path`. */
  aliases?: string[];
}

/** Bottom navigation tabs. Labels use canonical names. */
export const BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { id: "my-life", path: "/my-life", icon: Map, label: "My Life" },
  {
    id: "calendar",
    path: "/calendar",
    icon: Calendar,
    label: "Calendar",
    aliases: ["/daily-schedule", "/week-schedule", "/calendar/*"],
  },
  { id: "command-center", path: "/command-center", icon: Home, label: "Command Center" },
  {
    id: "talk",
    path: "/talk",
    icon: MessageCircle,
    label: "Talk to DW",
    aliases: ["/chat"],
  },
  { id: "profile", path: "/profile", icon: User, label: "Profile" },
];

export interface OrbitModule {
  id: string;
  label: string;
  href: string;
  icon: LucideIcon;
  color: string;
  bg: string;
}

/**
 * Command center orbit modules. Structure (icons, colors, count) preserved
 * from the original component; only labels/routes aligned with canonical names.
 */
export const ORBIT_MODULES: OrbitModule[] = [
  { id: "insights", label: "Insights", href: "/insights", icon: BarChart3, color: "text-violet-500", bg: "bg-violet-500/10" },
  { id: "plan", label: "My Plan", href: "/my-plan", icon: Target, color: "text-amber-500", bg: "bg-amber-500/10" },
  { id: "habits", label: "Habits", href: "/habits", icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
  { id: "mood", label: "Mood", href: "/mood-tracker", icon: Brain, color: "text-rose-500", bg: "bg-rose-500/10" },
  { id: "cosmic", label: "Cosmic Hub", href: "/cosmic", icon: Moon, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  { id: "blueprint", label: "Life Blueprint", href: "/life-blueprint", icon: Compass, color: "text-sky-500", bg: "bg-sky-500/10" },
];
