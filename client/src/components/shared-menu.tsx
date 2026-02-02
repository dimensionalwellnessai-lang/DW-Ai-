import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { APP_VERSION } from "@/lib/routes";
import { useTutorial } from "@/contexts/tutorial-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
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
  Activity,
  BarChart3,
  FileText,
  Settings,
  Map,
  MessageSquare,
  Lock,
} from "lucide-react";

const MENU_SECTIONS = [
  {
    items: [
      { id: "command-center", name: "⭐ Life Command Center", path: "/", icon: Zap },
      { id: "talk", name: "💬 Talk to DW", path: "/talk", icon: MessageCircle },
      { id: "calendar", name: "📅 Life Timeline", path: "/calendar", icon: Calendar },
    ]
  },
  {
    title: "MY IDENTITY",
    items: [
      { id: "life-blueprint", name: "📜 Life Blueprint", path: "/life-blueprint", icon: BookOpen },
      { id: "goals", name: "🎯 My Goals", path: "/goals", icon: Target },
      { id: "habits", name: "✅ My Habits", path: "/habits", icon: CheckSquare },
    ]
  },
  {
    title: "BODY & MIND",
    items: [
      { id: "workout", name: "🏋️ Workout", path: "/workout", icon: Dumbbell },
      { id: "meal-prep", name: "🍽️ Meal Prep", path: "/meal-prep", icon: Utensils },
      { id: "meditation", name: "🧘 Meditation", path: "/spiritual", icon: Heart },
      { id: "journal", name: "📓 Journal", path: "/journal", icon: Feather },
    ]
  },
  {
    title: "LIFE DIMENSIONS",
    items: [
      { id: "astrology", name: "✨ Astrology", path: "/astrology", icon: Sparkles },
      { id: "finances", name: "💰 Finances", path: "/finances", icon: Wallet },
      { id: "community", name: "👥 Community", path: "/community", icon: Users },
    ]
  },
  {
    title: "EXPLORE",
    items: [
      { id: "browse", name: "🔍 Browse", path: "/browse", icon: Search },
      { id: "challenges", name: "🎯 Challenges", path: "/challenges", icon: Award },
      { id: "recovery", name: "🔄 Recovery", path: "/recovery", icon: RefreshCw },
    ]
  },
  {
    title: "SYSTEMS",
    items: [
      { id: "switchboard", name: "⚡ Switch Training", path: "/switchboard", icon: Activity },
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

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const [, navigate] = useLocation();
  const { startNavigationTutorial, state: tutorialState, requiresMenuOpen } = useTutorial();

  const { data: authData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const user = authData?.user;

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
                {user.email?.[0]?.toUpperCase() || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground font-medium truncate">{user.email}</p>
            </div>
          </div>
        </div>
      )}
      
      <nav className="space-y-1 flex-1 overflow-y-auto min-h-0">
        {MENU_SECTIONS.map((section, sectionIndex) => (
          <div key={sectionIndex}>
            {section.title && (
              <div className="px-2 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mt-4">
                {section.title}
              </div>
            )}
            <div className="space-y-1">
              {section.items.map((item) => (
                <Link key={item.id} href={item.path}>
                  <button
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
                    onClick={onClose}
                    data-testid={`menu-item-${item.id}`}
                  >
                    <span className="text-sm text-foreground">{item.name}</span>
                  </button>
                </Link>
              ))}
            </div>
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
              await apiRequest("POST", "/api/auth/logout");
              queryClient.setQueryData(["/api/auth/me"], null);
              queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
              onClose();
              navigate("/login");
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
