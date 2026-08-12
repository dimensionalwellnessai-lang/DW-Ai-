import { Link, useLocation } from "wouter";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { APP_VERSION } from "@/lib/routes";
import { useTutorial } from "@/contexts/tutorial-context";
import { useAuth } from "@/hooks/use-auth";
import { getRecentPages, addRecentPage } from "@/lib/recent-pages";
import {
  Zap,
  Calendar,
  BookOpen,
  Target,
  CheckSquare,
  Dumbbell,
  Utensils,
  Heart,
  Feather,
  Sparkles,
  Wallet,
  Users,
  Search,
  Award,
  RefreshCw,
  BarChart3,
  FileText,
  Settings,
  Map,
  MessageSquare,
  Lock,
  ChevronDown,
  Clock,
  LayoutDashboard,
  BarChart2,
  Activity,
  Brain,
  Layers,
  Home,
  Compass,
  MessageCircle,
  Sun,
  User,
  Moon,
  type LucideIcon,
} from "lucide-react";

// Dimension icon colors
const DIM_COLORS: Record<string, string> = {
  body: "text-green-500",
  mind: "text-blue-500",
  time: "text-amber-500",
  purpose: "text-violet-500",
  money: "text-emerald-500",
  relationships: "text-pink-500",
  environment: "text-cyan-500",
  identity: "text-indigo-500",
};

interface MenuItem {
  id: string;
  name: string;
  path: string;
  icon: LucideIcon;
  dimension?: string;
  isDWEntry?: boolean;
}

interface MenuSection {
  title?: string;
  collapsible?: boolean;
  dimensionKey?: string;
  items: MenuItem[];
  dwContextLabel?: string;
}

const MENU_SECTIONS: MenuSection[] = [
  {
    items: [
      { id: "command-center", name: "⭐ Command Center", path: "/command-center", icon: Zap },
      { id: "calendar", name: "📅 Calendar", path: "/calendar", icon: Calendar },
    ]
  },
  {
    title: "BODY",
    collapsible: true,
    dimensionKey: "body",
    dwContextLabel: "Body",
    items: [
      { id: "workout", name: "🏋️ Workout", path: "/workout", icon: Dumbbell, dimension: "body" },
      { id: "workout-analytics", name: "📊 Workout Analytics", path: "/workout/analytics", icon: BarChart2, dimension: "body" },
      { id: "health-data", name: "❤️ Health Data", path: "/health-data", icon: Activity, dimension: "body" },
      { id: "meal-prep", name: "🍽️ Meal Prep", path: "/meal-prep", icon: Utensils, dimension: "body" },
      { id: "body-scan", name: "🔄 Body Scan", path: "/recovery", icon: RefreshCw, dimension: "body" },
    ]
  },
  {
    title: "MIND",
    collapsible: true,
    dimensionKey: "mind",
    dwContextLabel: "Mind",
    items: [
      { id: "meditation", name: "🧘 Meditation", path: "/spiritual", icon: Heart, dimension: "mind" },
      { id: "journal", name: "📓 Journal", path: "/journal", icon: Feather, dimension: "mind" },
      { id: "insights", name: "💡 Insights", path: "/insights", icon: Brain, dimension: "mind" },
      { id: "mood", name: "🌤️ Mood", path: "/mood-tracker", icon: Sun, dimension: "mind" },
    ]
  },
  {
    title: "TIME & SCHEDULE",
    collapsible: true,
    dimensionKey: "time",
    dwContextLabel: "Time & Schedule",
    items: [
      { id: "calendar-full", name: "📅 Calendar", path: "/calendar", icon: Calendar, dimension: "time" },
      { id: "daily-schedule", name: "⏰ Daily Schedule", path: "/daily-schedule", icon: Clock, dimension: "time" },
      { id: "routines", name: "📝 Routines", path: "/routines", icon: FileText, dimension: "time" },
      { id: "tasks", name: "✅ Tasks", path: "/tasks", icon: CheckSquare, dimension: "time" },
    ]
  },
  {
    title: "PURPOSE",
    collapsible: true,
    dimensionKey: "purpose",
    dwContextLabel: "Purpose",
    items: [
      { id: "my-plan", name: "📋 My Plan", path: "/my-plan", icon: LayoutDashboard, dimension: "purpose" },
      { id: "goals", name: "🎯 Goals", path: "/goals", icon: Target, dimension: "purpose" },
      { id: "challenges", name: "🏆 Challenges", path: "/challenges", icon: Award, dimension: "purpose" },
      { id: "habits", name: "✅ Habits", path: "/habits", icon: CheckSquare, dimension: "purpose" },
    ]
  },
  {
    title: "MONEY",
    collapsible: true,
    dimensionKey: "money",
    dwContextLabel: "Money",
    items: [
      { id: "finances", name: "💰 Finances", path: "/finances", icon: Wallet, dimension: "money" },
    ]
  },
  {
    title: "ENVIRONMENT",
    collapsible: true,
    dimensionKey: "environment",
    dwContextLabel: "Environment",
    items: [
      { id: "life-system-import", name: "📥 DW Smart Import", path: "/life-system-import", icon: Layers, dimension: "environment" },
      { id: "browse", name: "🔍 Browse", path: "/browse", icon: Search, dimension: "environment" },
    ]
  },
  {
    title: "IDENTITY",
    collapsible: true,
    dimensionKey: "identity",
    dwContextLabel: "Identity",
    items: [
      { id: "life-blueprint", name: "📜 Life Blueprint", path: "/life-blueprint", icon: BookOpen, dimension: "identity" },
      { id: "cosmic", name: "🌌 Cosmic Hub", path: "/cosmic", icon: Sparkles, dimension: "identity" },
      { id: "life-timeline", name: "📅 Calendar", path: "/calendar", icon: Calendar, dimension: "identity" },
    ]
  },
  {
    title: "SETTINGS",
    items: [
      { id: "progress", name: "📊 My Progress", path: "/profile/progress", icon: BarChart3 },
      { id: "settings", name: "⚙️ Settings", path: "/settings", icon: Settings },
      { id: "app-tour", name: "🗺️ App Tour", path: "/app-tour", icon: Map },
      { id: "feedback", name: "📋 Feedback", path: "/feedback", icon: MessageSquare },
      { id: "privacy", name: "🔒 Privacy & Terms", path: "/privacy-terms", icon: Lock },
    ]
  },
];

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const { startNavigationTutorial, state: tutorialState, requiresMenuOpen } = useTutorial();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const { user, logout } = useAuth();
  const [, navigate] = useLocation();

  const recentPages = React.useMemo(() => getRecentPages().slice(0, 3), [open]);

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) {
        next.delete(title);
      } else {
        next.add(title);
      }
      return next;
    });
  };

  const handleDWContextClick = (dimensionLabel: string) => {
    onClose();
    navigate(`/talk?context=dimension:${encodeURIComponent(dimensionLabel)}`);
  };

  return (
    <SwipeableDrawer 
      open={open} 
      onClose={onClose} 
      title="Menu"
      elevated={elevated || (tutorialState.isActive && requiresMenuOpen)}
    >
      {user && (
        <div className="mb-4 pb-3 border-b">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">
                {(user.firstName?.[0] || user.systemName?.[0] || user.username?.[0] || user.email?.[0] || 'U').toUpperCase()}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium truncate">{user.firstName || user.systemName || user.username || user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="space-y-1 flex-1 overflow-y-auto min-h-0">
        {recentPages.length > 0 && (
          <div className="mb-4">
            <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
              <Clock className="h-3 w-3" />
              Recently Visited
            </div>
            <div className="space-y-1">
              {recentPages.map((page) => (
                <Link key={page.path} href={page.path}>
                  <button
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
                    onClick={onClose}
                  >
                    <span className="text-sm text-foreground">{page.icon || "•"} {page.name}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        {MENU_SECTIONS.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && section.collapsible ? (
              <Collapsible
                open={expandedSections.has(section.title)}
                onOpenChange={() => section.title && toggleSection(section.title)}
              >
                <CollapsibleTrigger className="w-full px-2 py-2 text-xs font-semibold uppercase tracking-wider mt-4 flex items-center justify-between hover:text-foreground transition-colors">
                  <span className={section.dimensionKey ? DIM_COLORS[section.dimensionKey] : "text-muted-foreground"}>
                    {section.title}
                  </span>
                  <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${section.title && expandedSections.has(section.title) ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="space-y-1 mt-1">
                    {section.items.map((item) => (
                      <Link key={item.id} href={item.path}>
                        <button
                          className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors`}
                          onClick={() => {
                            addRecentPage({ 
                              id: item.id, 
                              name: item.name, 
                              path: item.path, 
                              icon: item.name.split(' ')[0] 
                            });
                            onClose();
                          }}
                          data-testid={`menu-item-${item.id}`}
                        >
                          <span className={`text-sm ${item.dimension ? DIM_COLORS[item.dimension] : 'text-foreground'}`}>
                            {item.name}
                          </span>
                        </button>
                      </Link>
                    ))}
                    {section.dwContextLabel && (
                      <button
                        className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left transition-colors hover:bg-primary/5"
                        onClick={() => handleDWContextClick(section.dwContextLabel!)}
                        data-testid={`menu-dw-${section.dimensionKey}`}
                      >
                        <MessageCircle className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                        <span className="text-xs text-primary/70 font-medium">
                          Ask DW about {section.dwContextLabel}
                        </span>
                      </button>
                    )}
                  </div>
                </CollapsibleContent>
              </Collapsible>
            ) : (
              <>
                {section.title && (
                  <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                    {section.title}
                  </div>
                )}
                <div className="space-y-1">
                  {section.items.map((item) => (
                    <Link key={item.id} href={item.path}>
                      <button
                        className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors`}
                        onClick={() => {
                          addRecentPage({ 
                            id: item.id, 
                            name: item.name, 
                            path: item.path, 
                            icon: item.name.split(' ')[0] 
                          });
                          onClose();
                        }}
                        data-testid={`menu-item-${item.id}`}
                      >
                        <span className={`text-sm ${item.dimension ? DIM_COLORS[item.dimension] : 'text-foreground'}`}>
                          {item.name}
                        </span>
                      </button>
                    </Link>
                  ))}
                </div>
              </>
            )}
          </div>
        ))}
      </nav>
      
      <div className="pt-4 space-y-2 border-t mt-4">
        {user ? (
          <Button 
            variant="outline" 
            className="w-full" 
            size="sm" 
            onClick={async () => {
              await logout();
              onClose();
            }}
            data-testid="button-signout"
          >
            Logout
          </Button>
        ) : (
          <Link href="/login">
            <Button className="w-full" size="sm" data-testid="button-signup">
              Sign in / Sign up
            </Button>
          </Link>
        )}
      </div>
      <div className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
      </div>
    </SwipeableDrawer>
  );
}
