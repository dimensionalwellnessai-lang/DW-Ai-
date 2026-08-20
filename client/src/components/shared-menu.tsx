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
  Calendar,
  ChevronDown,
  Clock,
  Home,
  Import,
  Map,
  MessageCircle,
} from "lucide-react";
import {
  BOTTOM_NAV_ITEMS,
  NAV_SECTIONS,
  SETTINGS_ITEMS,
  DIM_COLORS,
  type NavMenuItem,
} from "@/config/navigation";

interface MenuItem extends NavMenuItem {
  isDWEntry?: boolean;
}

interface MenuSection {
  title?: string;
  collapsible?: boolean;
  dimensionKey?: string;
  items: MenuItem[];
  dwContextLabel?: string;
}

const PRIMARY_MENU_ITEMS: MenuItem[] = [
  { id: "command-center", name: "Today", path: "/command-center", icon: Home },
  { id: "talk", name: "Talk to DW", path: "/talk", icon: MessageCircle },
  { id: "my-life", name: "My Life", path: "/my-life", icon: Map },
  { id: "calendar", name: "Calendar", path: "/calendar", icon: Calendar },
  { id: "smart-import", name: "Smart Import", path: "/life-system-import", icon: Import },
];

const MENU_SECTIONS: MenuSection[] = [
  {
    items: PRIMARY_MENU_ITEMS,
  },
  ...NAV_SECTIONS.map((section): MenuSection => ({
    title: section.title,
    collapsible: true,
    dimensionKey: section.dimensionKey,
    dwContextLabel: section.dwContextLabel,
    items: section.items,
  })),
  {
    title: "SETTINGS",
    items: SETTINGS_ITEMS,
  },
];

interface SharedMenuProps {
  open: boolean;
  onClose: () => void;
  elevated?: boolean;
}

export function SharedMenu({ open, onClose, elevated }: SharedMenuProps) {
  const { state: tutorialState, requiresMenuOpen } = useTutorial();
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

  const renderMenuItem = (item: MenuItem, iconClassName = "text-muted-foreground") => {
    const Icon = item.icon;
    return (
      <Link key={item.id} href={item.path}>
        <button
          className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
          onClick={() => {
            addRecentPage({
              id: item.id,
              name: item.name,
              path: item.path,
            });
            onClose();
          }}
          data-testid={`menu-item-${item.id}`}
        >
          <Icon className={`h-4 w-4 shrink-0 ${iconClassName}`} />
          <span className="text-sm text-foreground">{item.name}</span>
        </button>
      </Link>
    );
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
                    <span className="text-sm text-foreground">{page.name}</span>
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
                    {section.items.map((item) =>
                      renderMenuItem(
                        item,
                        item.dimension ? DIM_COLORS[item.dimension] : "text-muted-foreground",
                      ),
                    )}
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
                  {section.items.map((item) => {
                    const isBottomNavItem = BOTTOM_NAV_ITEMS.some((navItem) => navItem.id === item.id);
                    const iconClassName = isBottomNavItem ? "text-foreground" : "text-muted-foreground";
                    return renderMenuItem(item, iconClassName);
                  })}
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
