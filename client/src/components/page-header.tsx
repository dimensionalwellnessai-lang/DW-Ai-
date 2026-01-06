import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, GraduationCap, Clock, History } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { APP_VERSION } from "@/lib/routes";
import { useTutorial } from "@/contexts/tutorial-context";
import { useQuery } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  Sun, Sparkles, Heart, Dumbbell, Utensils, Wallet,
  Settings, Compass, Target, Calendar, LayoutGrid, ChevronDown,
  MessageCircle, MessageCircleHeart, HelpCircle, BookOpen
} from "lucide-react";

const MENU_ICON_MAP: Record<string, typeof Sun> = {
  "daily-schedule": Clock,
  "life-dashboard": LayoutGrid,
  "meditation": Heart,
  "workout": Dumbbell,
  "meal-prep": Utensils,
  "finances": Wallet,
  "routines": History,
  "settings": Settings,
  "browse": Compass,
  "challenges": Target,
  "calendar": Calendar,
  "astrology": Sparkles,
  "talk-it-out": MessageCircle,
  "feedback": MessageCircleHeart,
  "weekly-checkin": Calendar,
  "app-tour": HelpCircle,
  "journal": BookOpen,
};

interface PageHeaderProps {
  title: string;
  showBack?: boolean;
  backPath?: string;
  rightContent?: React.ReactNode;
}

export function PageHeader({ title, showBack = true, backPath, rightContent }: PageHeaderProps) {
  const [, setLocation] = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuFeatures = getMenuFeatures();
  const moreFeatures = getMoreMenuFeatures();
  const { 
    state: tutorialState, 
    startNavigationTutorial, 
    hasSeenNavigationTutorial,
    requiresMenuOpen,
    skipTutorial
  } = useTutorial();

  const { data: authData } = useQuery<{ user: any } | null>({ 
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const user = authData?.user;

  useEffect(() => {
    if (tutorialState.isActive && tutorialState.isNavigationTutorial && requiresMenuOpen && !menuOpen) {
      setMenuOpen(true);
    }
  }, [tutorialState.isActive, tutorialState.isNavigationTutorial, requiresMenuOpen, menuOpen]);

  const handleStartTutorial = () => {
    setMenuOpen(false);
    setTimeout(() => {
      startNavigationTutorial(true);
    }, 300);
  };

  const handleBack = () => {
    if (backPath) {
      setLocation(backPath);
    } else if (window.history.length > 1) {
      window.history.back();
    } else {
      setLocation("/");
    }
  };

  return (
    <>
      <header className="flex items-center gap-2 p-3 border-b dark:border-white/5 sticky top-0 bg-background glass-subtle z-50">
        <div className="flex items-center gap-1">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              data-testid="button-back"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMenuOpen(true)}
            data-testid="button-menu"
          >
            <Menu className="h-5 w-5 text-white" />
          </Button>
        </div>
        <h1 className="font-display text-lg font-medium flex-1" data-testid="text-page-title">
          {title}
        </h1>
        {rightContent}
      </header>

      <SwipeableDrawer 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        title="Menu"
      >
        <nav className="space-y-1 flex-1 overflow-y-auto min-h-0">
          {(() => {
            const regularFeatures = menuFeatures.filter(f => f.group !== "calendar");
            const calendarFeatures = menuFeatures.filter(f => f.group === "calendar");
            const lifeDashboard = regularFeatures.find(f => f.id === "life-dashboard");
            const otherFeatures = regularFeatures.filter(f => f.id !== "life-dashboard");
            
            return (
              <>
                {lifeDashboard && (
                  <Link key={lifeDashboard.path} href={lifeDashboard.path || "/"}>
                    <button
                      className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
                      onClick={() => setMenuOpen(false)}
                      data-testid={`menu-item-${lifeDashboard.id}`}
                    >
                      <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm">{lifeDashboard.name}</span>
                    </button>
                  </Link>
                )}
                
                {calendarFeatures.length > 0 && (
                  <details className="group">
                    <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none" data-testid="menu-calendar-dropdown">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1">Calendar</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-1 space-y-1 ml-4">
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
                      <Link href="/daily-schedule">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-schedule">
                          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm">Schedule</span>
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
                )}
                
                {otherFeatures.map((feature) => {
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
              </>
            );
          })()}
          
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
            onClick={handleStartTutorial}
            data-testid="button-start-tutorial"
          >
            <GraduationCap className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">App Tour</span>
          </button>
          {user ? (
            <div className="space-y-2">
              <div className="px-2 py-1 text-sm font-medium border-t pt-3">
                Hello, {user.firstName || user.email?.split('@')[0] || 'there'}
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
                Log out
              </Button>
            </div>
          ) : (
            <Link href="/login">
              <Button className="w-full" size="sm" data-testid="button-signin">
                Sign in / Sign up
              </Button>
            </Link>
          )}
        </div>
        <div className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">v{APP_VERSION}</p>
        </div>
      </SwipeableDrawer>
    </>
  );
}
