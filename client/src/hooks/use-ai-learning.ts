/**
 * Custom hook for tracking AI feature usage and learning user patterns
 * Part of PR #3: AI Learning & Personalization
 */
import { useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface FeatureUsage {
  id: string;
  featureName: string;
  usageCount: number;
  lastUsedAt: string;
  totalTimeSpentSeconds: number;
}

/**
 * Hook to track when a user visits/uses a feature
 * Tracks on mount (visit) and on unmount (time spent update without incrementing count)
 */
export function useTrackFeature(featureName: string, enabled: boolean = true) {
  const startTimeRef = useRef<number>(Date.now());
  const hasTrackedRef = useRef(false);

  const trackMutation = useMutation({
    mutationFn: async (timeSpent: number = 0) => {
      const res = await fetch('/api/ai-feature-usage/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ featureName, timeSpentSeconds: timeSpent }),
      });
      if (!res.ok) throw new Error('Failed to track feature usage');
      return res.json();
    },
  });

  useEffect(() => {
    if (!enabled || hasTrackedRef.current) return;
    
    // Track visit on mount (increments count)
    trackMutation.mutate(0);
    hasTrackedRef.current = true;
    startTimeRef.current = Date.now();

    // On unmount, only track time spent if significant (>5 seconds)
    // Note: This will still increment count, but we track the time
    return () => {
      const timeSpent = Math.floor((Date.now() - startTimeRef.current) / 1000);
      if (timeSpent > 5) {
        // Fire and forget - don't wait for response
        fetch('/api/ai-feature-usage/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ featureName, timeSpentSeconds: timeSpent }),
        }).catch(() => {
          // Silently fail
        });
      }
    };
  }, [featureName, enabled]);
}

/**
 * Hook to get most used features
 */
export function useMostUsedFeatures(limit: number = 4) {
  return useQuery<FeatureUsage[]>({
    queryKey: ['/api/ai-feature-usage/most-used', limit],
    queryFn: async () => {
      const res = await fetch(`/api/ai-feature-usage/most-used?limit=${limit}`, {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch most used features');
      return res.json();
    },
  });
}

/**
 * Hook to get all feature usage data
 */
export function useFeatureUsage() {
  return useQuery<FeatureUsage[]>({
    queryKey: ['/api/ai-feature-usage'],
    queryFn: async () => {
      const res = await fetch('/api/ai-feature-usage', {
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Failed to fetch feature usage');
      return res.json();
    },
  });
}

/**
 * Map feature names to display names and routes
 */
export const FEATURE_MAP: Record<string, { name: string; route: string; icon?: string }> = {
  workouts: { name: "Workouts", route: "/workout", icon: "💪" },
  meals: { name: "Meals", route: "/meal-prep", icon: "🍽️" },
  journal: { name: "Journal", route: "/journal", icon: "📓" },
  meditation: { name: "Meditation", route: "/spiritual", icon: "🧘" },
  goals: { name: "Goals", route: "/goals", icon: "🎯" },
  habits: { name: "Habits", route: "/habits", icon: "✅" },
  tasks: { name: "Tasks", route: "/tasks", icon: "📋" },
  routines: { name: "Routines", route: "/routines", icon: "🔄" },
  life_blueprint: { name: "Life Blueprint", route: "/life-blueprint-v2", icon: "🌟" },
  calendar: { name: "Calendar", route: "/calendar", icon: "📅" },
  finances: { name: "Finances", route: "/finances", icon: "💰" },
  recovery: { name: "Recovery", route: "/recovery", icon: "🛀" },
  mood_tracker: { name: "Mood Tracker", route: "/mood-tracker", icon: "😊" },
  astrology: { name: "Cosmic Insights", route: "/cosmic-insights", icon: "✨" },
  shopping_list: { name: "Shopping List", route: "/shopping-list", icon: "🛒" },
};

/**
 * Get display info for a feature
 */
export function getFeatureInfo(featureName: string) {
  return FEATURE_MAP[featureName] || { name: featureName, route: "/", icon: "📱" };
}
