import { Link } from "wouter";
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
  MessageCircle,
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
} from "lucide-react";

const MENU_SECTIONS: Array<{
  title?: string;
  collapsible?: boolean;
  items: Array<{
    id: string;
    name: string;
    path: string;
    icon: any;
    dimension?: string;
  }>;
}> = [
  {
    items: [
      { id: "command-center", name: "⭐ Life Command Center", path: "/command-center", icon: Zap },
      { id: "talk", name: "💬 Talk to DW", path: "/talk", icon: MessageCircle },
      { id: "calendar", name: "📅 Life Timeline", path: "/calendar", icon: Calendar },
    ]
  },
  {
    title: "MY IDENTITY",
    items: [
      { id: "life-blueprint", name: "📜 Life Blueprint", path: "/life-blueprint", icon: BookOpen, dimension: "time" },
      { id: "goals", name: "🎯 My Goals", path: "/goals", icon: Target, dimension: "time" },
      { id: "habits", name: "✅ My Habits", path: "/habits", icon: CheckSquare, dimension: "mind" },
    ]
  },
  {
    title: "BODY & MIND",
    items: [
      { id: "workout", name: "🏋️ Workout", path: "/workout", icon: Dumbbell, dimension: "body" },
      { id: "meal-prep", name: "🍽️ Meal Prep", path: "/meal-prep", icon: Utensils, dimension: "body" },
      { id: "meditation", name: "🧘 Meditation", path: "/spiritual", icon: Heart, dimension: "mind" },
      { id: "journal", name: "📓 Journal", path: "/journal", icon: Feather, dimension: "mind" },
    ]
  },
  {
    title: "LIFE DIMENSIONS",
    items: [
      { id: "cosmic", name: "🌌 Cosmic Hub", path: "/cosmic", icon: Sparkles, dimension: "mind" },
      { id: "finances", name: "💰 Finances", path: "/finances", icon: Wallet, dimension: "money" },
      { id: "community", name: "👥 Community", path: "/community", icon: Users, dimension: "community" },
    ]
  },
  {
    title: "EXPLORE",
    collapsible: true,
    items: [
      { id: "browse", name: "🔍 Browse", path: "/browse", icon: Search },
      { id: "challenges", name: "🎯 Challenges", path: "/challenges", icon: Award },
      { id: "recovery", name: "🔄 Recovery", path: "/recovery", icon: RefreshCw, dimension: "body" },
    ]
  },
  {
    title: "SYSTEMS",
    collapsible: true,
    items: [
      { id: "progress", name: "📊 My Progress", path: "/profile/progress", icon: BarChart3 },
      { id: "routines", name: "📝 Routines", path: "/routines", icon: FileText },
      { id: "tasks", name: "✅ Tasks", path: "/tasks", icon: CheckSquare },
    ]
  },
  {
    title: "SETTINGS",
    items: [
      { id: "settings", name: "⚙️ Settings", path: "/settings", icon: Settings },
      { id: "app-tour", name: "🗺️ App Tour", path: "/app-tour", icon: Map },
      { id: "feedback", name: "📋 Feedback", path: "/feedback", icon: MessageSquare },
      { id: "privacy", name: "🔒 Privacy & Terms", path: "/privacy-terms", icon: Lock },
    ]
  },
];

const DIMENSION_COLORS: Record<string, string> = {
  body: "text-green-500",
  mind: "text-blue-500",
  time: "text-yellow-500",
  money: "text-purple-500",
  community: "text-teal-500",
};

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const { startNavigationTutorial, state: tutorialState, requiresMenuOpen } = useTutorial();
  const [expandedSections, setExpandedSections] = React.useState<Set<string>>(new Set());
  const { user, logout } = useAuth();

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
                <CollapsibleTrigger className="w-full px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4 flex items-center justify-between hover:text-foreground transition-colors">
                  {section.title}
                  <ChevronDown className={`h-3 w-3 transition-transform ${section.title && expandedSections.has(section.title) ? 'rotate-180' : ''}`} />
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
                          <span className={`text-sm ${item.dimension ? DIMENSION_COLORS[item.dimension] : 'text-foreground'}`}>
                            {item.name}
                          </span>
                        </button>
                      </Link>
                    ))}
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
                        <span className={`text-sm ${item.dimension ? DIMENSION_COLORS[item.dimension] : 'text-foreground'}`}>
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
