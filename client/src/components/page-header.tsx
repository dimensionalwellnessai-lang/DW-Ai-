import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu, GraduationCap, Clock, History } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState, useEffect } from "react";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { HamburgerMenu } from "@/components/hamburger-menu";
import { AllFeaturesView } from "@/components/all-features-view";
import { useNavigationStore } from "@/stores/useNavigationStore";
import { isFeatureEnabled } from "@/config/featureFlags";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { APP_VERSION } from "@/lib/routes";
import { useTutorial } from "@/contexts/tutorial-context";
import { useAuth } from "@/hooks/use-auth";
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
  const { menuOpen: navMenuOpen, allFeaturesOpen, toggleMenu, closeMenu, closeAllFeatures } = useNavigationStore();
  const useNewNavigation = isFeatureEnabled('NEW_NAVIGATION');
  const useAllFeaturesView = isFeatureEnabled('ALL_FEATURES_VIEW');
  const { user, logout } = useAuth();
  
  const menuFeatures = getMenuFeatures();
  const moreFeatures = getMoreMenuFeatures();
  const { 
    state: tutorialState, 
    startNavigationTutorial, 
    hasSeenNavigationTutorial,
    requiresMenuOpen,
  } = useTutorial();

  // Use the appropriate menu state based on feature flag
  const effectiveMenuOpen = useNewNavigation ? navMenuOpen : menuOpen;
  const setEffectiveMenuOpen = useNewNavigation 
    ? (open: boolean) => open ? toggleMenu() : closeMenu()
    : setMenuOpen;

  useEffect(() => {
    if (tutorialState.isActive && tutorialState.isNavigationTutorial && requiresMenuOpen && !effectiveMenuOpen) {
      if (useNewNavigation) {
        toggleMenu();
      } else {
        setMenuOpen(true);
      }
    }
  }, [tutorialState.isActive, tutorialState.isNavigationTutorial, requiresMenuOpen, effectiveMenuOpen, useNewNavigation, toggleMenu]);

  const handleStartTutorial = () => {
    const menuWasOpen = effectiveMenuOpen;
    if (useNewNavigation) {
      closeMenu();
    } else {
      setMenuOpen(false);
    }
    setTimeout(() => {
      startNavigationTutorial(true, menuWasOpen);
    }, 500);
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

  const handleMenuToggle = () => {
    if (useNewNavigation) {
      toggleMenu();
    } else {
      setMenuOpen(true);
    }
  };

  const handleMenuClose = () => {
    if (useNewNavigation) {
      closeMenu();
    } else {
      setMenuOpen(false);
    }
  };

  return (
    <>
      {/* Header - sticky at top of content, below safe area handled by app-shell */}
      <header className="page-header-fixed flex items-center gap-2 px-3 py-3">
        <div className="flex items-center gap-1">
          {showBack && (
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleBack}
              data-testid="button-back"
              aria-label="Go back"
            >
              <ArrowLeft className="h-6 w-6 text-foreground" aria-hidden="true" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={handleMenuToggle}
            data-testid="button-menu"
            aria-label={effectiveMenuOpen ? "Close menu" : "Open menu"}
            aria-expanded={effectiveMenuOpen}
          >
            <Menu className="h-6 w-6 text-foreground" aria-hidden="true" />
          </Button>
        </div>
        <h1 className="font-display text-xl font-medium flex-1 text-foreground" data-testid="text-page-title">
          {title}
        </h1>
        {rightContent}
      </header>

      {/* Use new navigation if feature flag is enabled */}
      {useNewNavigation ? (
        <>
          <HamburgerMenu open={navMenuOpen} onClose={handleMenuClose} />
          {useAllFeaturesView && (
            <AllFeaturesView open={allFeaturesOpen} onClose={closeAllFeatures} />
          )}
        </>
      ) : (
        // Legacy menu (old implementation)
        <SwipeableDrawer 
        open={menuOpen} 
        onClose={() => setMenuOpen(false)} 
        title="Menu"
        elevated={tutorialState.isActive && requiresMenuOpen}
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
                      <span className="text-sm text-foreground">{lifeDashboard.name}</span>
                    </button>
                  </Link>
                )}
                
                {calendarFeatures.length > 0 && (
                  <details className="group">
                    <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none" data-testid="menu-calendar-dropdown">
                      <Calendar className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm flex-1 text-foreground">Calendar</span>
                      <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                    </summary>
                    <div className="mt-1 space-y-1 ml-4">
                      <Link href="/daily-schedule">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-today">
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Today</span>
                        </button>
                      </Link>
                      <Link href="/calendar">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-month">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Month</span>
                        </button>
                      </Link>
                      <Link href="/calendar?view=week">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-week">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Week</span>
                        </button>
                      </Link>
                      <Link href="/daily-schedule">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-schedule">
                          <LayoutGrid className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Schedule</span>
                        </button>
                      </Link>
                      <Link href="/routines">
                        <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={() => setMenuOpen(false)} data-testid="menu-calendar-routines">
                          <History className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-foreground">Routines</span>
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
                        <span className="text-sm text-foreground">{feature.name}</span>
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
              <span className="text-sm flex-1 text-foreground">More</span>
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
                      <span className="text-sm text-foreground">{feature.name}</span>
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
            <span className="text-sm text-foreground">App Tour</span>
          </button>
          {user ? (
            <div className="space-y-2">
              <div className="px-2 py-1 text-sm font-medium text-foreground border-t pt-3">
                Hello, {user.firstName || user.email?.split('@')[0] || 'there'}
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                size="sm" 
                onClick={async () => {
                  await logout();
                  setMenuOpen(false);
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
      )}
    </>
  );
}