export type VisibilityLevel = "primary" | "secondary" | "dormant";

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
  { id: "life-systems", name: "Life Systems", path: "/systems", visibility: "primary", description: "Your personalized systems" },
  { id: "calendar", name: "Calendar", path: "/calendar", visibility: "primary", description: "Full schedule" },
  { id: "daily-schedule", name: "Today", path: "/daily-schedule", visibility: "primary", description: "Your day at a glance", indent: true },
  { id: "life-dashboard", name: "Life Dashboard", path: "/life-dashboard", visibility: "primary", description: "Wellness overview" },
  { id: "astrology", name: "Astrology", path: "/astrology", visibility: "primary", description: "Cosmic insights" },
  { id: "talk-it-out", name: "Talk It Out", path: "/talk", visibility: "secondary", description: "Process feelings" },
  { id: "ai-chat", name: "AI Chat", path: "/", visibility: "secondary", description: "Main conversation" },
  { id: "challenges", name: "Challenges", path: "/challenges", visibility: "secondary", description: "Growth challenges" },
  { id: "routines", name: "Routines", path: "/routines", visibility: "secondary", description: "Saved routines" },
  { id: "meditation", name: "Meditation", path: "/spiritual", visibility: "secondary", description: "Inner peace" },
  { id: "workout", name: "Workout", path: "/workout", visibility: "secondary", description: "Training" },
  { id: "meal-prep", name: "Meal Prep", path: "/meal-prep", visibility: "secondary", description: "Nutrition" },
  { id: "finances", name: "Finances", path: "/finances", visibility: "secondary", description: "Budget" },
  { id: "browse", name: "Browse", path: "/browse", visibility: "secondary", description: "Explore content" },
  { id: "settings", name: "Settings", path: "/settings", visibility: "secondary", description: "Preferences" },
  
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

export function getSecondaryFeatures(): FeatureConfig[] {
  return getFeaturesByVisibility("secondary");
}

export function getDormantFeatures(): FeatureConfig[] {
  return getFeaturesByVisibility("dormant");
}

export function getMenuFeatures(): FeatureConfig[] {
  return FEATURE_VISIBILITY.filter(f => 
    f.visibility === "primary" || f.visibility === "secondary"
  ).filter(f => f.path);
}

export function isFeatureVisible(featureId: string, userLevel: VisibilityLevel = "primary"): boolean {
  const feature = FEATURE_VISIBILITY.find(f => f.id === featureId);
  if (!feature) return false;
  
  const levels: VisibilityLevel[] = ["primary", "secondary", "dormant"];
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
