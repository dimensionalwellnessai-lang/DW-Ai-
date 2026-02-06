import { useState, useMemo } from 'react';
import { X, Search, Star, Calendar, Dumbbell, Heart, Home as HomeIcon, Wallet, BarChart3, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { SwipeableDrawer } from '@/components/swipeable-drawer';
import { FeatureTile } from '@/components/feature-tile';
import { CategoryHeader } from '@/components/category-header';
import { useAILearningStore } from '@/stores/useAILearningStore';
import { ROUTE_REGISTRY } from '@/routes/registry';

interface AllFeaturesViewProps {
  open: boolean;
  onClose: () => void;
}

// Feature categories with their routes
const FEATURE_CATEGORIES = {
  planning: {
    icon: Calendar,
    title: 'Planning & Organizing',
    features: ['today-hub', 'tasks', 'goals', 'calendar-root', 'routines'],
  },
  health: {
    icon: Dumbbell,
    title: 'Health & Fitness',
    features: ['workout', 'recovery', 'meal-prep', 'shopping-list'],
  },
  wellness: {
    icon: Heart,
    title: 'Wellness',
    features: ['meditation', 'journal', 'astrology', 'weekly-checkin'],
  },
  household: {
    icon: HomeIcon,
    title: 'Household',
    features: [], // Conditional - only if enabled
  },
  financial: {
    icon: Wallet,
    title: 'Financial',
    features: ['finances'],
  },
  insights: {
    icon: BarChart3,
    title: 'Insights & Tracking',
    features: ['tracking', 'my-progress', 'life-dashboard'],
  },
  settings: {
    icon: Settings,
    title: 'Settings & Tools',
    features: ['settings', 'app-tour', 'feedback', 'import'],
  },
};

export function AllFeaturesView({ open, onClose }: AllFeaturesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const { getMostUsed } = useAILearningStore();
  
  const mostUsedFeatureIds = getMostUsed(4);

  // Get all enabled routes
  const allFeatures = useMemo(() => {
    return ROUTE_REGISTRY.filter(
      (route) => route.enabled && route.showInMenu && route.type === 'page'
    );
  }, []);

  // Filter features based on search query
  const filteredFeatures = useMemo(() => {
    if (!searchQuery.trim()) return allFeatures;
    
    const query = searchQuery.toLowerCase();
    return allFeatures.filter(
      (feature) =>
        feature.label.toLowerCase().includes(query) ||
        feature.description?.toLowerCase().includes(query) ||
        feature.id.toLowerCase().includes(query)
    );
  }, [allFeatures, searchQuery]);

  // Get most used features
  const mostUsedFeatures = useMemo(() => {
    return mostUsedFeatureIds
      .map((id) => allFeatures.find((f) => f.id === id))
      .filter(Boolean);
  }, [mostUsedFeatureIds, allFeatures]);

  // Get features by category
  const getFeaturesByCategory = (categoryFeatureIds: string[]) => {
    return categoryFeatureIds
      .map((id) => filteredFeatures.find((f) => f.id === id))
      .filter(Boolean);
  };

  const hasResults = filteredFeatures.length > 0;

  return (
    <SwipeableDrawer
      open={open}
      onClose={onClose}
      title="All Features"
    >
      <div className="flex flex-col h-full">
        {/* Search bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search features..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="space-y-6 pb-6">
            {/* Most Used Section */}
            {!searchQuery && mostUsedFeatures.length > 0 && (
              <>
                <div>
                  <CategoryHeader
                    icon={Star}
                    title="Most Used"
                    subtitle="AI learns from your behavior"
                  />
                  <div className="grid grid-cols-4 gap-2">
                    {mostUsedFeatures.map((feature) => (
                      <FeatureTile
                        key={feature.id}
                        id={feature.id}
                        label={feature.navLabel || feature.label}
                        icon={feature.icon as any}
                        path={feature.path}
                        onClick={onClose}
                      />
                    ))}
                  </div>
                </div>
                <Separator />
              </>
            )}

            {/* Show results or categories */}
            {hasResults ? (
              <>
                {/* Planning & Organizing */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.planning.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.planning.icon}
                      title={FEATURE_CATEGORIES.planning.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.planning.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Health & Fitness */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.health.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.health.icon}
                      title={FEATURE_CATEGORIES.health.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.health.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Wellness */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.wellness.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.wellness.icon}
                      title={FEATURE_CATEGORIES.wellness.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.wellness.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Financial */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.financial.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.financial.icon}
                      title={FEATURE_CATEGORIES.financial.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.financial.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Insights & Tracking */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.insights.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.insights.icon}
                      title={FEATURE_CATEGORIES.insights.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.insights.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {/* Settings & Tools */}
                {getFeaturesByCategory(FEATURE_CATEGORIES.settings.features).length > 0 && (
                  <div>
                    <CategoryHeader
                      icon={FEATURE_CATEGORIES.settings.icon}
                      title={FEATURE_CATEGORIES.settings.title}
                    />
                    <div className="grid grid-cols-4 gap-2">
                      {getFeaturesByCategory(FEATURE_CATEGORIES.settings.features).map((feature) => (
                        <FeatureTile
                          key={feature.id}
                          id={feature.id}
                          label={feature.navLabel || feature.label}
                          icon={feature.icon as any}
                          path={feature.path}
                          onClick={onClose}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">
                  No features found matching "{searchQuery}"
                </p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    </SwipeableDrawer>
  );
}
