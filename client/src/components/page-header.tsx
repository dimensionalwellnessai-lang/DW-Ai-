import { Button } from "@/components/ui/button";
import { ArrowLeft, Menu } from "lucide-react";
import { Link, useLocation } from "wouter";
import { useState } from "react";
import { SwipeableDrawer } from "@/components/swipeable-drawer";
import { getMenuFeatures, getMoreMenuFeatures } from "@/lib/feature-visibility";
import { APP_VERSION } from "@/lib/routes";
import { 
  Sun, Clock, Sparkles, Heart, Dumbbell, Utensils, Wallet, History, 
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
  "how-to-use": HelpCircle,
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
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setMenuOpen(true)}
            data-testid="button-menu"
          >
            <Menu className="h-5 w-5" />
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
          {menuFeatures.map((feature) => {
            const Icon = MENU_ICON_MAP[feature.id] || Sparkles;
            return (
              <Link key={feature.path} href={feature.path || "/"}>
                <button
                  className={`w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left ${feature.indent ? "ml-6" : ""}`}
                  onClick={() => setMenuOpen(false)}
                  data-testid={`menu-item-${feature.id}`}
                >
                  <Icon className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm">{feature.name}</span>
                </button>
              </Link>
            );
          })}
          
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
          <Link href="/login">
            <Button className="w-full" size="sm" data-testid="button-signup">
              Sign in
            </Button>
          </Link>
        </div>
        <div className="pt-4 text-center">
          <p className="text-sm text-muted-foreground">v{APP_VERSION}</p>
        </div>
      </SwipeableDrawer>
    </>
  );
}
