import { useEffect, useState } from 'react';
import { ChevronDown, MessageCircle, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SwipeableDrawer } from '@/components/swipeable-drawer';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { TimeIcon } from '@/components/time-icon';
import { ContextualGreeting } from '@/components/contextual-greeting';
import { SuggestedActions } from '@/components/suggested-actions';
import { WarningBanner } from '@/components/warning-banner';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { Link, useLocation } from 'wouter';
import { useAuth } from '@/hooks/use-auth';
import { getRecentPages, addRecentPage } from '@/lib/recent-pages';
import { cn } from '@/lib/utils';
import { APP_VERSION } from '@/lib/routes';
import { NAV_SECTIONS, SETTINGS_ITEMS, DIM_COLORS, type NavMenuItem } from '@/config/navigation';

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

const DIMENSION_SECTIONS = NAV_SECTIONS;

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const [location, navigate] = useLocation();
  const { timeOfDay, updateTimeOfDay } = useNavigationStore();
  const { completed: onboardingCompleted, completionPercentage } = useOnboardingStore();
  const { user, logout } = useAuth();
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const recentPages = getRecentPages().slice(0, 3);

  useEffect(() => {
    if (open) {
      updateTimeOfDay();
    }
  }, [open, updateTimeOfDay]);

  const showSetupBanner = !onboardingCompleted && completionPercentage > 0;

  const toggleSection = (title: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  const handleDWContextClick = (dimensionLabel: string) => {
    onClose();
    navigate(`/talk?context=dimension:${encodeURIComponent(dimensionLabel)}`);
  };

  const handleNavItem = (item: NavMenuItem) => {
    addRecentPage({
      id: item.id,
      name: item.name,
      path: item.path,
      icon: item.name.split(' ')[0]
    });
    onClose();
  };

  return (
    <SwipeableDrawer
      open={open}
      onClose={onClose}
      title=""
    >
      <div className="flex flex-col min-h-full">
        {/* Header with greeting */}
        <div className="mb-3">
          <div className="flex items-center gap-3 mb-3">
            <TimeIcon timeOfDay={timeOfDay} className="h-6 w-6" />
            <ContextualGreeting
              timeOfDay={timeOfDay}
              userName={user?.firstName || user?.systemName || undefined}
            />
          </div>

          {showSetupBanner && (
            <div className="mb-2">
              <WarningBanner
                message={`Complete Your Setup - ${completionPercentage}% done`}
                actionLabel="Resume"
                actionPath="/enhanced-onboarding"
                variant="warning"
              />
            </div>
          )}

          {/* Suggested actions */}
          <SuggestedActions timeOfDay={timeOfDay} />
        </div>

        <Separator className="mb-3" />

        {/* Top-level navigation */}
        <div className="space-y-0.5 mb-2">
          <Link href="/command-center">
            <button
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
              onClick={() => { addRecentPage({ id: 'command-center', name: '⭐ Command Center', path: '/command-center', icon: '⭐' }); onClose(); }}
              data-testid="menu-item-command-center"
            >
              <span className="text-sm text-foreground">⭐ Command Center</span>
            </button>
          </Link>
          <Link href="/calendar">
            <button
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
              onClick={() => { addRecentPage({ id: 'calendar', name: '📅 Calendar', path: '/calendar', icon: '📅' }); onClose(); }}
              data-testid="menu-item-calendar"
            >
              <span className="text-sm text-foreground">📅 Calendar</span>
            </button>
          </Link>
          <Link href="/life-system-import">
            <button
              className="w-full flex items-start gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
              onClick={() => { addRecentPage({ id: 'life-system-import', name: '📥 DW Smart Import', path: '/life-system-import', icon: '📥' }); onClose(); }}
              data-testid="menu-item-smart-import"
            >
              <span className="text-sm text-foreground flex-1">
                <span className="block">📥 DW Smart Import</span>
                <span className="block text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  Paste anything — meal plan, schedule, doc — and DW reads it. You can also paste straight into DW chat and it'll do the same thing.
                </span>
              </span>
            </button>
          </Link>
        </div>

        {/* Recent Pages */}
        {recentPages.length > 0 && (
          <div className="mb-2">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="h-3 w-3" />
              Recent
            </div>
            <div className="space-y-0.5">
              {recentPages.map((page) => (
                <Link key={page.path} href={page.path}>
                  <button
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover-elevate text-left transition-colors"
                    onClick={onClose}
                  >
                    <span className="text-sm text-foreground">{page.icon || "•"} {page.name}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        )}

        <Separator className="mb-1" />

        {/* Dimension sections - collapsible */}
        <div className="flex-1 space-y-0.5">
          {DIMENSION_SECTIONS.map((section) => (
            <Collapsible
              key={section.title}
              open={expandedSections.has(section.title!)}
              onOpenChange={() => toggleSection(section.title!)}
            >
              <CollapsibleTrigger className="w-full px-2 py-1.5 text-xs font-semibold uppercase tracking-wider flex items-center justify-between hover:text-foreground transition-colors">
                <span className={section.dimensionKey ? DIM_COLORS[section.dimensionKey] : "text-muted-foreground"}>
                  {section.title}
                </span>
                <ChevronDown className={`h-3 w-3 text-muted-foreground transition-transform ${expandedSections.has(section.title!) ? 'rotate-180' : ''}`} />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="space-y-0.5 mt-0.5">
                  {section.items.map((item) => (
                    <Link key={item.id} href={item.path}>
                      <button
                        className="w-full flex items-center gap-3 p-2.5 rounded-lg hover-elevate text-left transition-colors"
                        onClick={() => handleNavItem(item)}
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
          ))}

          {/* Settings section */}
          <div className="mt-2 pt-2 border-t">
            <div className="px-2 py-1.5 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Settings</div>
            <div className="space-y-0.5">
              {SETTINGS_ITEMS.map((item) => (
                <Link key={item.id} href={item.path}>
                  <button
                    className="w-full flex items-center gap-3 p-2 rounded-lg hover-elevate text-left transition-colors"
                    onClick={() => handleNavItem(item)}
                    data-testid={`menu-item-${item.id}`}
                  >
                    <span className="text-sm text-foreground">{item.name}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* Footer - auth actions */}
        <div className="pt-3 border-t space-y-2 shrink-0">
          {user ? (
            <>
              <div className="px-2 py-1 text-xs text-muted-foreground">
                {user.firstName || user.systemName || user.username || 'your account'}
              </div>
              <Button
                variant="outline"
                className="w-full"
                size="sm"
                onClick={async () => { await logout(); onClose(); }}
                data-testid="button-logout"
              >
                Log out
              </Button>
            </>
          ) : (
            <Link href="/login">
              <Button className="w-full" size="sm" onClick={onClose} data-testid="button-signin">
                Sign in / Sign up
              </Button>
            </Link>
          )}
        </div>
        <div className="pt-2 text-center">
          <p className="text-xs text-muted-foreground">v{APP_VERSION}</p>
        </div>
      </div>
    </SwipeableDrawer>
  );
}
