export const APP_VERSION = "0.1.0-beta";

export interface RouteConfig {
  path: string;
  name: string;
  enabled: boolean;
  requiresAuth?: boolean;
  isPublic?: boolean;
}

export const ROUTES: RouteConfig[] = [
  { path: "/", name: "Home", enabled: true },
  { path: "/login", name: "Login", enabled: true, isPublic: true },
  { path: "/reset-password", name: "Reset Password", enabled: true, isPublic: true },
  { path: "/welcome", name: "Welcome", enabled: true },
  { path: "/subscription", name: "Subscription", enabled: true },
  
  { path: "/life-blueprint", name: "Life Blueprint", enabled: true },
  { path: "/calendar", name: "Calendar", enabled: true },
  { path: "/daily-schedule", name: "Today", enabled: true },
  { path: "/meal-prep", name: "Meal Plans", enabled: true },
  { path: "/shopping-list", name: "Shopping List", enabled: true },
  { path: "/weekly-review", name: "Weekly Review", enabled: true },
  { path: "/library", name: "Library", enabled: true },
  { path: "/relationships", name: "Relationships", enabled: true },
  { path: "/workout", name: "Workout", enabled: true },
  { path: "/recovery", name: "Recovery", enabled: true },
  { path: "/spiritual", name: "Meditation", enabled: true },
  { path: "/cosmic-insights", name: "Cosmic Insights", enabled: true },
  { path: "/browse", name: "Browse", enabled: true },
  
  { path: "/week-schedule", name: "Week Schedule", enabled: true },
  { path: "/plans", name: "Plans", enabled: true },
  { path: "/elevation-plan", name: "Elevation Plan", enabled: true },
  { path: "/action-center", name: "Follow-ups", enabled: true },
  { path: "/systems/training", name: "Switch Training", enabled: true },
  { path: "/systems/wake-up", name: "Wake-Up System", enabled: true },
  { path: "/systems/wind-down", name: "Wind-Down System", enabled: true },

  { path: "/talk", name: "Talk to DW", enabled: true },
  { path: "/challenges", name: "Challenges", enabled: true },
  { path: "/routines/templates/:templateId", name: "Routine Template", enabled: true },
  { path: "/routines/:id", name: "Routine Detail", enabled: true },
  { path: "/routines", name: "Routines", enabled: true },
  { path: "/finances", name: "Finances", enabled: true },
  { path: "/feedback", name: "Feedback", enabled: true },
  { path: "/weekly-checkin", name: "Weekly Check-In", enabled: true },
  { path: "/journal", name: "Journal", enabled: true },
  { path: "/settings", name: "Settings", enabled: true },
  { path: "/app-tour", name: "App Tour", enabled: true },
  
  { path: "/body-scan", name: "Body Scan", enabled: true },
  { path: "/blueprint", name: "Blueprint", enabled: false },
  { path: "/projects", name: "Projects", enabled: false },
  { path: "/systems", name: "Systems Hub", enabled: false },
];

export function isRouteEnabled(path: string): boolean {
  const route = ROUTES.find(r => r.path === path);
  return route?.enabled ?? false;
}

export function getEnabledRoutes(): RouteConfig[] {
  return ROUTES.filter(r => r.enabled);
}

export function getDisabledRoutes(): RouteConfig[] {
  return ROUTES.filter(r => !r.enabled);
}
