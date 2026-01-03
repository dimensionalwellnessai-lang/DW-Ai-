export const APP_VERSION = "0.1.0-beta";

export interface RouteConfig {
  path: string;
  name: string;
  enabled: boolean;
  requiresAuth?: boolean;
  isPublic?: boolean;
}

export const ROUTES: RouteConfig[] = [
  { path: "/", name: "AI Chat", enabled: true },
  { path: "/login", name: "Login", enabled: true, isPublic: true },
  { path: "/reset-password", name: "Reset Password", enabled: true, isPublic: true },
  { path: "/welcome", name: "Welcome", enabled: true },
  
  { path: "/life-dashboard", name: "Life Dashboard", enabled: true },
  { path: "/calendar", name: "Calendar", enabled: true },
  { path: "/daily-schedule", name: "Today", enabled: true },
  { path: "/workout", name: "Workout", enabled: true },
  { path: "/spiritual", name: "Meditation", enabled: true },
  { path: "/astrology", name: "Astrology", enabled: true },
  { path: "/browse", name: "Browse", enabled: true },
  
  { path: "/talk", name: "Talk It Out", enabled: true },
  { path: "/challenges", name: "Challenges", enabled: true },
  { path: "/routines", name: "Routines", enabled: true },
  { path: "/meal-prep", name: "Meal Prep", enabled: true },
  { path: "/finances", name: "Finances", enabled: true },
  { path: "/feedback", name: "Feedback", enabled: true },
  { path: "/settings", name: "Settings", enabled: true },
  
  { path: "/body-scan", name: "Body Scan", enabled: false },
  { path: "/blueprint", name: "Blueprint", enabled: false },
  { path: "/projects", name: "Projects", enabled: false },
  { path: "/community", name: "Community", enabled: false },
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
