import * as LucideIcons from 'lucide-react';
import { LucideIcon } from 'lucide-react';

// Map of string icon names to Lucide icon components
const ICON_MAP: Record<string, LucideIcon> = {
  home: LucideIcons.Home,
  sparkles: LucideIcons.Sparkles,
  message: LucideIcons.MessageCircle,
  trophy: LucideIcons.Trophy,
  upload: LucideIcons.Upload,
  history: LucideIcons.History,
  user: LucideIcons.User,
  key: LucideIcons.Key,
  'credit-card': LucideIcons.CreditCard,
  'layout-grid': LucideIcons.LayoutGrid,
  zap: LucideIcons.Zap,
  'list-checks': LucideIcons.ListChecks,
  'trending-up': LucideIcons.TrendingUp,
  'bar-chart-3': LucideIcons.BarChart3,
  sun: LucideIcons.Sun,
  calendar: LucideIcons.Calendar,
  list: LucideIcons.List,
  'calendar-days': LucideIcons.CalendarDays,
  dumbbell: LucideIcons.Dumbbell,
  moon: LucideIcons.Moon,
  utensils: LucideIcons.Utensils,
  'shopping-cart': LucideIcons.ShoppingCart,
  repeat: LucideIcons.Repeat,
  'book-open': LucideIcons.BookOpen,
  heart: LucideIcons.Heart,
  compass: LucideIcons.Compass,
  layers: LucideIcons.Layers,
  'check-square': LucideIcons.CheckSquare,
  'message-circle': LucideIcons.MessageCircle,
  wallet: LucideIcons.Wallet,
  'settings-2': LucideIcons.Settings2,
  users: LucideIcons.Users,
  'file-cog': LucideIcons.FileCog,
  download: LucideIcons.Download,
  'clipboard-list': LucideIcons.ClipboardList,
  'message-circle-heart': LucideIcons.MessageCircleHeart,
  settings: LucideIcons.Settings,
  'help-circle': LucideIcons.HelpCircle,
  bug: LucideIcons.Bug,
  'alert-triangle': LucideIcons.AlertTriangle,
  activity: LucideIcons.Activity,
  target: LucideIcons.Target,
  clock: LucideIcons.Clock,
  feather: LucideIcons.Feather,
  'refresh-cw': LucideIcons.RefreshCw,
  award: LucideIcons.Award,
  search: LucideIcons.Search,
  map: LucideIcons.Map,
  lock: LucideIcons.Lock,
  briefcase: LucideIcons.Briefcase,
  star: LucideIcons.Star,
};

/**
 * Get a Lucide icon component from a string icon name
 * Returns a fallback Sparkles icon if the name is not found
 */
export function getIcon(iconName: string | undefined): LucideIcon {
  if (!iconName) return LucideIcons.Sparkles;
  return ICON_MAP[iconName] || LucideIcons.Sparkles;
}

/**
 * Check if an icon name exists in the map
 */
export function hasIcon(iconName: string): boolean {
  return iconName in ICON_MAP;
}
