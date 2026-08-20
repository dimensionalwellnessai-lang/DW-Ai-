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
  group?: string;
}

export const FEATURE_VISIBILITY: FeatureConfig[] = [
  // MY IDENTITY section
  { id: "command-center", name: "Today", path: "/", visibility: "primary", description: "Your day at a glance", enabled: true },
  { id: "life-blueprint", name: "📜 Life Blueprint", path: "/life-blueprint", visibility: "primary", description: "Define your values", enabled: true },
  { id: "goals", name: "🎯 My Goals", path: "/goals", visibility: "primary", description: "Track your goals", enabled: true },
  { id: "habits", name: "✅ My Habits", path: "/habits", visibility: "primary", description: "Daily habits", enabled: true },
  
  // BODY & MIND section
  { id: "workout", name: "🏋️ Workout", path: "/workout", visibility: "primary", description: "Training", enabled: true },
  { id: "meal-prep", name: "🍽️ Meal Prep", path: "/meal-prep", visibility: "primary", description: "Recipes & videos", enabled: true },
  { id: "meditation", name: "🧘 Meditation", path: "/spiritual", visibility: "primary", description: "Inner peace", enabled: true },
  { id: "journal", name: "📓 Journal", path: "/journal", visibility: "primary", description: "Daily reflections", enabled: true },
  
  // LIFE DIMENSIONS section
  { id: "astrology", name: "✨ Cosmic Insights", path: "/cosmic-insights", visibility: "primary", description: "Personal patterns", enabled: true },
  { id: "finances", name: "💰 Finances", path: "/finances", visibility: "primary", description: "Budget", enabled: true },
  
  // EXPLORE section
  { id: "browse", name: "🔍 Browse", path: "/browse", visibility: "primary", description: "Explore content", enabled: true },
  { id: "library", name: "🔖 Library", path: "/library", visibility: "primary", description: "Saved items", enabled: true },
  { id: "relationships", name: "💞 Relationships", path: "/relationships", visibility: "primary", description: "People in your life", enabled: true },
  { id: "challenges", name: "🎯 Challenges", path: "/challenges", visibility: "primary", description: "Growth challenges", enabled: true },
  { id: "recovery", name: "🔄 Recovery", path: "/recovery", visibility: "primary", description: "Rest & restore", enabled: true },
  
  // SYSTEMS section
  { id: "switchboard", name: "⚡ Switch Training", path: "/switchboard", visibility: "primary", description: "Life dimensions", enabled: true },
  { id: "progress", name: "📊 My Progress", path: "/profile/progress", visibility: "primary", description: "Track progress", enabled: true },
  { id: "routines", name: "📝 Routines", path: "/routines", visibility: "primary", description: "Saved routines", enabled: true },
  { id: "tasks", name: "✅ Tasks", path: "/tasks", visibility: "primary", description: "To-do list", enabled: true },
  
  // SETTINGS section
  { id: "settings", name: "⚙️ Settings", path: "/settings", visibility: "primary", description: "Preferences", enabled: true },
  { id: "app-tour", name: "🗺️ App Tour", path: "/app-tour", visibility: "primary", description: "App guide", enabled: true },
  { id: "feedback", name: "📋 Feedback", path: "/feedback", visibility: "primary", description: "Share thoughts", enabled: true },
  { id: "privacy", name: "🔒 Privacy & Terms", path: "/privacy-terms", visibility: "primary", description: "Legal info", enabled: true },
  
  // Hidden in menu but accessible via bottom nav
  { id: "talk", name: "💬 Talk to DW", path: "/talk", visibility: "primary", description: "AI assistant", enabled: true },
  { id: "calendar", name: "📅 Calendar", path: "/calendar", visibility: "primary", description: "Full schedule", enabled: true },
  { id: "tracking", name: "📊 Tracking", path: "/tracking", visibility: "primary", description: "Track daily metrics", enabled: true },
  { id: "daily-schedule", name: "Today", path: "/command-center", visibility: "primary", description: "Your day at a glance", enabled: true, group: "calendar" },
  
  // More/dormant features
  // (The former "life-dashboard" wellness-hub entry was a duplicate of the
  //  primary "life-blueprint" entry above; /life-dashboard now redirects to
  //  /life-blueprint, so the extra menu item was removed to avoid duplicates.)
  { id: "weekly-checkin", name: "Weekly Check-In", path: "/weekly-checkin", visibility: "more", description: "Weekly feedback", enabled: true },
  { id: "talk-it-out", name: "Talk to DW", path: "/talk", visibility: "more", description: "Process feelings", enabled: true },
  
  { id: "body-scan", name: "Body Scan", visibility: "dormant", aiUnlockable: true, description: "Camera features", enabled: false },
  { id: "advanced-challenges", name: "Advanced Challenges", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "blueprint-edit", name: "Blueprint Editor", path: "/blueprint", visibility: "dormant", aiUnlockable: true, enabled: false },
  { id: "projects", name: "Projects", path: "/projects", visibility: "dormant", aiUnlockable: true, enabled: false },
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
