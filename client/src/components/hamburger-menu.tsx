import { useEffect } from 'react';
import { Grid3x3, Home, MessageCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { SwipeableDrawer } from '@/components/swipeable-drawer';
import { TimeIcon } from '@/components/time-icon';
import { ContextualGreeting } from '@/components/contextual-greeting';
import { SuggestedActions } from '@/components/suggested-actions';
import { WarningBanner } from '@/components/warning-banner';
import { useNavigationStore } from '@/stores/useNavigationStore';
import { useOnboardingStore } from '@/stores/useOnboardingStore';
import { Link, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';

interface HamburgerMenuProps {
  open: boolean;
  onClose: () => void;
}

const CORE_ITEMS = [
  { id: 'home', label: 'Home', path: '/', icon: Home },
  { id: 'today', label: 'Today', path: '/today', icon: Home },
  { id: 'talk', label: 'Talk to DW', path: '/talk', icon: MessageCircle },
];

export function HamburgerMenu({ open, onClose }: HamburgerMenuProps) {
  const [location] = useLocation();
  const { timeOfDay, updateTimeOfDay, toggleAllFeatures } = useNavigationStore();
  const { completed: onboardingCompleted, completionPercentage } = useOnboardingStore();
  
  const { data: authData } = useQuery<{ user: any } | null>({
    queryKey: ["/api/auth/me"],
    retry: false
  });
  const user = authData?.user;

  // Update time of day when menu opens
  useEffect(() => {
    if (open) {
      updateTimeOfDay();
    }
  }, [open, updateTimeOfDay]);

  const showSetupBanner = !onboardingCompleted && completionPercentage > 0;

  const handleAllFeaturesClick = () => {
    toggleAllFeatures();
    onClose();
  };

  return (
    <SwipeableDrawer
      open={open}
      onClose={onClose}
      title="" // No title, we'll use custom header
    >
      <div className="flex flex-col h-full">
        {/* Header with greeting */}
        <div className="mb-4">
          <div className="flex items-center gap-3 mb-4">
            <TimeIcon timeOfDay={timeOfDay} className="h-6 w-6" />
            <ContextualGreeting 
              timeOfDay={timeOfDay} 
              userName={user?.email?.split('@')[0]}
            />
          </div>

          {/* Warning banners */}
          {showSetupBanner && (
            <div className="mb-3">
              <WarningBanner
                message={`Complete Your Setup - ${completionPercentage}% done`}
                actionLabel="Resume"
                actionPath="/enhanced-onboarding"
                variant="warning"
              />
            </div>
          )}
        </div>

        {/* Suggested actions */}
        <div className="mb-4">
          <SuggestedActions timeOfDay={timeOfDay} />
        </div>

        <Separator className="my-4" />

        {/* Core navigation items */}
        <div className="space-y-1 mb-4">
          <p className="text-xs text-muted-foreground px-1 mb-2">Core</p>
          {CORE_ITEMS.map((item) => {
            const isActive = location === item.path;
            return (
              <Link key={item.id} href={item.path}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start"
                  onClick={onClose}
                >
                  <item.icon className="h-4 w-4 mr-2" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </div>

        <Separator className="my-4" />

        {/* All Features button */}
        <Button
          variant="outline"
          className="w-full justify-between mb-4"
          onClick={handleAllFeaturesClick}
        >
          <span className="flex items-center">
            <Grid3x3 className="h-4 w-4 mr-2" />
            All Features
          </span>
          <span className="text-xs text-muted-foreground">▼</span>
        </Button>

        {/* Footer - Settings, Logout, etc. */}
        <div className="mt-auto pt-4 border-t space-y-2">
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start" onClick={onClose}>
              Settings
            </Button>
          </Link>
          {user && (
            <Link href="/profile/progress">
              <Button variant="ghost" className="w-full justify-start" onClick={onClose}>
                My Progress
              </Button>
            </Link>
          )}
        </div>
      </div>
    </SwipeableDrawer>
  );
}
