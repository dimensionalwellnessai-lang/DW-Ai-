import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { APP_VERSION } from "@/lib/routes";
import { useTutorial } from "@/contexts/tutorial-context";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutGrid,
  Calendar,
  Clock,
  History,
  Sparkles,
  Heart,
  Dumbbell,
  Utensils,
  Wallet,
  Settings,
  Compass,
  Target,
  GraduationCap,
  BookOpen,
  MessageCircle,
  ChevronDown,
  HelpCircle,
} from "lucide-react";

const MENU_ICON_MAP: Record<string, typeof LayoutGrid> = {
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
  "feedback": Heart,
  "weekly-checkin": Calendar,
  "app-tour": GraduationCap,
  "journal": BookOpen,
  "recovery": Heart,
};

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const [, navigate] = useLocation();
  const { startNavigationTutorial, state: tutorialState, requiresMenuOpen } = useTutorial();
  const menuFeatures = getMenuFeatures();
  const moreFeatures = getMoreMenuFeatures();

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
      <nav className="space-y-1 flex-1 overflow-y-auto min-h-0">
        {menuFeatures.filter(f => f.group !== "calendar").map((feature) => {
          const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
          
          if (feature.id === "life-dashboard") {
            return (
              <div key="life-dashboard-group" className="space-y-1">
                <Link href={feature.path || "/"}>
                  <button
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
                    onClick={onClose}
                    data-testid={`menu-item-${feature.id}`}
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm">{feature.name}</span>
                  </button>
                </Link>
                <details className="group">
                  <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none" data-testid="menu-calendar-dropdown">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm flex-1">Calendar</span>
                    <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="mt-1 space-y-1 ml-4">
                    <Link href="/today">
                      <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={onClose} data-testid="menu-calendar-today">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Today</span>
                      </button>
                    </Link>
                    <Link href="/calendar">
                      <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={onClose} data-testid="menu-calendar-month">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Month</span>
                      </button>
                    </Link>
                    <Link href="/calendar?view=week">
                      <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={onClose} data-testid="menu-calendar-week">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Week</span>
                      </button>
                    </Link>
                    <Link href="/routines">
                      <button className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left" onClick={onClose} data-testid="menu-calendar-routines">
                        <History className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">Routines</span>
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
                className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left ${feature.indent ? "ml-6" : ""}`}
                onClick={onClose}
                data-testid={`menu-item-${feature.id}`}
              >
                <Icon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{feature.name}</span>
              </button>
            </Link>
          );
        })}
        
        <details className="group" data-testid="menu-more-details">
          <summary className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left cursor-pointer list-none" data-testid="menu-more-toggle">
            <LayoutGrid className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm flex-1">More</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <div className="mt-1 space-y-1 ml-4">
            {moreFeatures.map((feature) => {
              const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
              return (
                <Link key={feature.path} href={feature.path || "/"}>
                  <button
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left"
                    onClick={onClose}
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
          onClick={() => {
            onClose();
            setTimeout(() => {
              startNavigationTutorial(true);
            }, 300);
          }}
          data-testid="button-start-tutorial"
        >
          <HelpCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm">App Tour</span>
        </button>
        {user ? (
          <div className="space-y-2">
            <div className="px-2 py-1 text-xs text-muted-foreground truncate border-t pt-3">
              {user.email}
            </div>
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
      <div className="pt-4 text-center">
        <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
      </div>
    </SwipeableDrawer>
  );
}
