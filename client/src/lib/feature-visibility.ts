export type VisibilityLevel = "primary" | "more" | "dormant";

export interface FeatureConfig {
  id: string;
  name: string;
  path?: string;
  visibility: VisibilityLevel;
  aiUnlockable?: boolean;
  description?: string;
  indent?: boolean;
}

export const FEATURE_VISIBILITY: FeatureConfig[] = [
  { id: "life-dashboard", name: "Life Dashboard", path: "/life-dashboard", visibility: "primary", description: "Your wellness hub" },
  { id: "calendar", name: "Calendar", path: "/calendar", visibility: "primary", description: "Full schedule" },
  { id: "daily-schedule", name: "Today", path: "/daily-schedule", visibility: "primary", description: "Your day at a glance", indent: true },
  { id: "workout", name: "Workout", path: "/workout", visibility: "primary", description: "Training" },
  { id: "meditation", name: "Meditation", path: "/spiritual", visibility: "primary", description: "Inner peace" },
  { id: "astrology", name: "Astrology", path: "/astrology", visibility: "primary", description: "Cosmic insights" },
  { id: "browse", name: "Browse", path: "/browse", visibility: "primary", description: "Explore content" },
  
  { id: "ai-chat", name: "AI Chat", path: "/", visibility: "more", description: "Main conversation" },
  { id: "talk-it-out", name: "Talk It Out", path: "/talk", visibility: "more", description: "Process feelings" },
  { id: "challenges", name: "Challenges", path: "/challenges", visibility: "more", description: "Growth challenges" },
  { id: "routines", name: "Routines", path: "/routines", visibility: "more", description: "Saved routines" },
  { id: "meal-prep", name: "Meal Prep", path: "/meal-prep", visibility: "more", description: "Nutrition" },
  { id: "finances", name: "Finances", path: "/finances", visibility: "more", description: "Budget" },
  { id: "feedback", name: "Feedback", path: "/feedback", visibility: "more", description: "Share thoughts" },
  { id: "settings", name: "Settings", path: "/settings", visibility: "more", description: "Preferences" },
  
  { id: "body-scan", name: "Body Scan", visibility: "dormant", aiUnlockable: true, description: "Camera features" },
  { id: "advanced-challenges", name: "Advanced Challenges", visibility: "dormant", aiUnlockable: true },
  { id: "blueprint-edit", name: "Blueprint Editor", path: "/blueprint", visibility: "dormant", aiUnlockable: true },
  { id: "projects", name: "Projects", path: "/projects", visibility: "dormant", aiUnlockable: true },
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
    f.visibility === "primary"
  ).filter(f => f.path);
}

export function getMoreMenuFeatures(): FeatureConfig[] {
  return FEATURE_VISIBILITY.filter(f => 
    f.visibility === "more"
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
