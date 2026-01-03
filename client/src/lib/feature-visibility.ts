export type VisibilityLevel = "primary" | "more" | "dormant";

export interface FeatureConfig {
  id: string;
  name: string;
  path?: string;
  visibility: VisibilityLevel;
  aiUnlockable?: boolean;
  description?: string;
  indent?: boolean;
  enabled?: boolean;
}

export const FEATURE_VISIBILITY: FeatureConfig[] = [
  { id: "life-dashboard", name: "Life Dashboard", path: "/life-dashboard", visibility: "primary", description: "Your wellness hub", enabled: true },
  { id: "calendar", name: "Calendar", path: "/calendar", visibility: "primary", description: "Full schedule", enabled: true },
  { id: "daily-schedule", name: "Today", path: "/daily-schedule", visibility: "primary", description: "Your day at a glance", indent: true, enabled: true },
  { id: "workout", name: "Workout", path: "/workout", visibility: "primary", description: "Training", enabled: true },
  { id: "meditation", name: "Meditation", path: "/spiritual", visibility: "primary", description: "Inner peace", enabled: true },
  { id: "astrology", name: "Astrology", path: "/astrology", visibility: "primary", description: "Cosmic insights", enabled: true },
  { id: "browse", name: "Browse", path: "/browse", visibility: "primary", description: "Explore content", enabled: true },
  
  { id: "ai-chat", name: "AI Chat", path: "/", visibility: "more", description: "Main conversation", enabled: true },
  { id: "talk-it-out", name: "Talk It Out", path: "/talk", visibility: "more", description: "Process feelings", enabled: true },
  { id: "challenges", name: "Challenges", path: "/challenges", visibility: "more", description: "Growth challenges", enabled: true },
  { id: "routines", name: "Routines", path: "/routines", visibility: "more", description: "Saved routines", enabled: true },
  { id: "meal-prep", name: "Meal Prep", path: "/meal-prep", visibility: "more", description: "Nutrition", enabled: true },
  { id: "finances", name: "Finances", path: "/finances", visibility: "more", description: "Budget", enabled: true },
  { id: "feedback", name: "Feedback", path: "/feedback", visibility: "more", description: "Share thoughts", enabled: true },
  { id: "settings", name: "Settings", path: "/settings", visibility: "more", description: "Preferences", enabled: true },
  
  { id: "body-scan", name: "Body Scan", visibility: "dormant", aiUnlockable: true, description: "Camera features", enabled: false },
  { id: "advanced-challenges", name: "Advanced Challenges", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "blueprint-edit", name: "Blueprint Editor", path: "/blueprint", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "projects", name: "Projects", path: "/projects", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "community", name: "Community", path: "/community", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "systems", name: "Systems Hub", path: "/systems", visibility: "dormant", aiUnlockable: true, enabled: false },
];

export function getFeaturesByVisibility(level: VisibilityLevel): FeatureConfig[] {
  return FEATURE_VISIBILITY.filter(f => f.visibility === level);
}

export function getPrimaryFeatures(): FeatureConfig[] {
  return getFeaturesByVisibility("primary");
}

export function getMoreFeatures(): FeatureConfig[] {
  return getFeaturesByVisibility("more");
}

export function getDormantFeatures(): FeatureConfig[] {
  return getFeaturesByVisibility("dormant");
}

export function getMenuFeatures(): FeatureConfig[] {
  return FEATURE_VISIBILITY.filter(f => 
    f.visibility === "primary" && f.enabled !== false
  ).filter(f => f.path);
}

export function getMoreMenuFeatures(): FeatureConfig[] {
  return FEATURE_VISIBILITY.filter(f => 
    f.visibility === "more" && f.enabled !== false
  ).filter(f => f.path);
}

export function isFeatureVisible(featureId: string, userLevel: VisibilityLevel = "primary"): boolean {
  const feature = FEATURE_VISIBILITY.find(f => f.id === featureId);
  if (!feature) return false;
  
  const levels: VisibilityLevel[] = ["primary", "more", "dormant"];
  const userLevelIndex = levels.indexOf(userLevel);
  const featureLevelIndex = levels.indexOf(feature.visibility);
  
  return featureLevelIndex <= userLevelIndex;
}

const UNLOCKED_FEATURES_KEY = "dw_unlocked_features";

export function getUnlockedFeatures(): string[] {
  try {
    const stored = localStorage.getItem(UNLOCKED_FEATURES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function unlockFeature(featureId: string): void {
  const unlocked = getUnlockedFeatures();
  if (!unlocked.includes(featureId)) {
    unlocked.push(featureId);
    localStorage.setItem(UNLOCKED_FEATURES_KEY, JSON.stringify(unlocked));
  }
}

export function isFeatureUnlocked(featureId: string): boolean {
  const feature = FEATURE_VISIBILITY.find(f => f.id === featureId);
  if (!feature) return false;
  if (feature.visibility !== "dormant") return true;
  return getUnlockedFeatures().includes(featureId);
}
