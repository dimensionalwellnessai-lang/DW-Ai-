import { isFeatureEnabled, type FeatureFlags } from "@/config/featureFlags";

export const APP_VERSION = "0.1.0-beta";

export type RouteType = "page" | "generator" | "modal" | "dev";

export type LinkedType =
  | "workout"
  | "meal"
  | "routine"
  | "plan"
  | "task"
  | "chat"
  | "custom"
  | "none";

export type MenuSection = "primary" | "calendar" | "more" | "bottom" | "hidden";

export interface RouteAction {
  id: string;
  label: string;
  icon?: string;
  to?: string;
  handler?: string;
  requiresAuth?: boolean;
}

export interface RouteGuard {
  requiredData?: string[];
  fallbackTo?: string;
  fallbackHandler?: string;
}

export interface RouteRegistryItem {
  id: string;
  path: string;
  label: string;
  navLabel?: string;
  icon?: string;
  type: RouteType;
  description?: string;
  showInMenu?: boolean;
  menuSection?: MenuSection;
  menuOrder?: number;
  menuParentId?: string;
  supportsSelectedQuery?: boolean;
  linkedType?: LinkedType;
  guard?: RouteGuard;
  actions?: RouteAction[];
  enabled?: boolean;
  isPublic?: boolean;
  requiresAuth?: boolean;
  /** If set, this route is only shown/enabled when the named feature flag is on */
  requiredFlag?: string;
}

export const ROUTE_REGISTRY: RouteRegistryItem[] = [
  {
    id: "home-ai",
    path: "/",
    label: "AI Chat",
    navLabel: "Home",
    icon: "home",
    type: "page",
    description: "Main assistant screen",
    showInMenu: false,
    menuSection: "primary",
    menuOrder: 0,
    enabled: true,
    actions: [
      { id: "make-plan", label: "Make a plan", handler: "startPlanBuilder", icon: "sparkles" },
      { id: "suggested-schedule", label: "Suggested schedule", handler: "openLatestDraftOrCreate", icon: "calendar" },
      { id: "talk-it-out", label: "Talk it out", to: "/talk", icon: "message" },
      { id: "challenges", label: "Challenges", to: "/challenges", icon: "trophy" },
      { id: "import-doc", label: "Import a document", to: "/import", icon: "upload" },
      { id: "continue", label: "Continue my progress", handler: "resumeLastFlow", icon: "history" },
    ],
  },
  {
    id: "login",
    path: "/login",
    label: "Login",
    icon: "user",
    type: "page",
    showInMenu: false,
    enabled: true,
    isPublic: true,
  },
  {
    id: "reset-password",
    path: "/reset-password",
    label: "Reset Password",
    icon: "key",
    type: "page",
    showInMenu: false,
    enabled: true,
    isPublic: true,
  },
  {
    id: "welcome",
    path: "/welcome",
    label: "Welcome",
    icon: "sparkles",
    type: "page",
    showInMenu: false,
    enabled: true,
  },
  {
    id: "voice-onboarding",
    path: "/voice-onboarding",
    label: "Voice Onboarding",
    icon: "mic",
    type: "page",
    description: "Voice-first onboarding conversation with DW",
    showInMenu: false,
    enabled: true,
    isPublic: true,
  },
  {
    id: "subscription",
    path: "/subscription",
    label: "Subscription",
    icon: "credit-card",
    type: "page",
    showInMenu: false,
    enabled: true,
    isPublic: true,
  },

  {
    id: "life-dashboard",
    path: "/life-dashboard",
    label: "Life Dashboard",
    icon: "layout-grid",
    type: "page",
    description: "Your wellness hub",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 1,
    enabled: true,
  },
  {
    id: "switchboard",
    path: "/switchboard",
    label: "Life Switchboard",
    navLabel: "Switchboard",
    icon: "zap",
    type: "page",
    description: "Your Life Switchboard - 8 dimensions of wellness",
    showInMenu: false, // Disabled for home consolidation (PR #2)
    menuSection: "primary",
    menuOrder: 2,
    enabled: false, // Disabled for home consolidation (PR #2)
  },
  {
    id: "weekly-plan",
    path: "/plan",
    label: "Weekly Plan",
    navLabel: "Plan",
    icon: "list-checks",
    type: "page",
    description: "Your weekly training plan",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 3,
    enabled: true,
  },
  {
    id: "my-progress",
    path: "/profile/progress",
    label: "My Progress",
    icon: "trending-up",
    type: "page",
    description: "Track your wellness progress",
    showInMenu: true,
    menuSection: "bottom",
    menuOrder: 1,
    enabled: true,
  },
  {
    id: "admin-analytics",
    path: "/admin/analytics",
    label: "Admin Analytics",
    icon: "bar-chart-3",
    type: "page",
    description: "Admin-only analytics dashboard",
    showInMenu: false,
    enabled: true,
    guard: {
      requiredData: ["admin"],
      fallbackTo: "/profile/progress",
    },
  },
  {
    id: "command-center",
    path: "/command-center",
    label: "Today",
    navLabel: "Home",
    icon: "sun",
    type: "page",
    description: "Your daily hub — schedule, routines, and energy",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 0,
    enabled: true,
  },
  {
    id: "life-blueprint",
    path: "/life-blueprint",
    label: "Life Blueprint",
    navLabel: "Life Blueprint",
    icon: "book-open",
    type: "page",
    description: "Define your values and vision for each dimension",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 1.5,
    enabled: true,
  },
  {
    id: "tracking",
    path: "/tracking",
    label: "Tracking",
    navLabel: "Tracking",
    icon: "activity",
    type: "page",
    description: "Track water, calories, habits, and more",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 1.6,
    enabled: true,
  },

  {
    id: "calendar-root",
    path: "/calendar/month",
    label: "Plan",
    navLabel: "Plan",
    icon: "calendar",
    type: "page",
    description: "Look ahead and plan your month",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 2,
    enabled: true,
  },
  {
    id: "week-schedule",
    path: "/week-schedule",
    label: "Week Overview",
    navLabel: "Week",
    icon: "calendar",
    type: "page",
    description: "7-day schedule overview with day drill-down",
    showInMenu: false,
    menuSection: "calendar",
    menuOrder: 9,
    menuParentId: "calendar-root",
    enabled: true,
  },
  {
    id: "daily-schedule",
    path: "/daily-schedule",
    label: "Daily Schedule",
    icon: "list",
    type: "page",
    description: "Manage your daily schedule blocks",
    showInMenu: false, // Sub-view, accessible from calendar
    menuSection: "calendar",
    menuOrder: 10,
    menuParentId: "calendar-root",
    enabled: true,
  },
  {
    id: "calendar-week",
    path: "/calendar",
    label: "Week",
    icon: "calendar",
    type: "page",
    description: "Week view calendar",
    showInMenu: false, // Sub-view, accessible from calendar (also in bottom nav)
    menuSection: "calendar",
    menuOrder: 11,
    menuParentId: "calendar-root",
    enabled: true,
  },
  {
    id: "calendar-schedule",
    path: "/calendar/schedule",
    label: "Schedule",
    icon: "list",
    type: "page",
    description: "All events list view",
    showInMenu: false, // Sub-view, accessible from calendar
    menuSection: "calendar",
    menuOrder: 13,
    menuParentId: "calendar-root",
    enabled: true,
  },

  {
    id: "workout",
    path: "/workout",
    label: "Workouts",
    icon: "dumbbell",
    type: "page",
    description: "Training programs",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 20,
    supportsSelectedQuery: true,
    linkedType: "workout",
    enabled: true,
    actions: [
      { id: "pick-workout", label: "Pick my workout", handler: "openPickWorkout", icon: "sparkles" },
    ],
  },
  {
    id: "recovery",
    path: "/recovery",
    label: "Recovery",
    icon: "moon",
    type: "page",
    description: "Rest & restore",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 21,
    enabled: true,
    actions: [
      { id: "pick-recovery", label: "Find recovery routine", handler: "openPickRecovery", icon: "sparkles" },
    ],
  },
  {
    id: "meal-prep",
    path: "/meal-prep",
    label: "Nutrition",
    icon: "utensils",
    type: "page",
    description: "Meal plans & recipes",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 30,
    supportsSelectedQuery: true,
    linkedType: "meal",
    enabled: true,
    actions: [
      { id: "suggest-meals", label: "Suggest meals", handler: "openSuggestMeals", icon: "sparkles" },
    ],
  },
  {
    id: "shopping-list",
    path: "/shopping-list",
    label: "Shopping List",
    icon: "shopping-cart",
    type: "page",
    description: "Manage shopping lists from meal plans",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 31,
    enabled: true,
  },
  {
    id: "cook-session",
    path: "/cook-session",
    label: "Cook Session",
    icon: "utensils",
    type: "page",
    description: "Guided step-by-step cooking with timers and substitutions",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 32,
    supportsSelectedQuery: false,
    linkedType: "meal",
    enabled: true,
    actions: [
      { id: "start-cooking", label: "Start cooking", handler: "openCookSession", icon: "utensils" },
    ],
  },
  {
    id: "routines",
    path: "/routines",
    label: "Routines",
    icon: "repeat",
    type: "page",
    description: "Saved routines",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 40,
    supportsSelectedQuery: true,
    linkedType: "routine",
    enabled: true,
  },
  {
    id: "action-center",
    path: "/action-center",
    label: "Action Center",
    navLabel: "Action Center",
    icon: "list-checks",
    type: "page",
    description: "Manage DW follow-up prompts — accept, snooze, dismiss, or mark answered",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 15,
    enabled: true,
  },
  {
    id: "journal",
    path: "/journal",
    label: "Journal",
    icon: "book-open",
    type: "page",
    description: "Daily reflections",
    showInMenu: false, // In bottom nav
    menuSection: "bottom",
    menuOrder: 45,
    enabled: true,
  },
  {
    id: "meditation",
    path: "/spiritual",
    label: "Meditation",
    icon: "heart",
    type: "page",
    description: "Inner peace",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 50,
    enabled: true,
  },
  {
    id: "browse",
    path: "/browse",
    label: "Browse",
    icon: "compass",
    type: "page",
    description: "Explore content",
    showInMenu: false, // In bottom nav
    menuSection: "bottom",
    menuOrder: 55,
    enabled: true,
  },

  {
    id: "plans",
    path: "/plans",
    label: "Plans",
    icon: "layers",
    type: "page",
    description: "Life System dashboard (Drafts/Active/Archived)",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 60,
    enabled: true,
    actions: [
      { id: "new-plan", label: "Create new plan", to: "/plan-builder", icon: "plus" },
    ],
  },
  {
    id: "plan-detail",
    path: "/plans/:planId",
    label: "Plan Detail",
    icon: "layers",
    type: "page",
    description: "View a plan and its items",
    showInMenu: false,
    guard: { requiredData: ["planId"], fallbackTo: "/plans" },
    enabled: true,
    actions: [
      { id: "edit-plan", label: "Edit plan", handler: "editPlan" },
      { id: "activate-plan", label: "Activate plan", handler: "activatePlanWizard" },
      { id: "export-plan", label: "Export", to: "/export/:planId" },
    ],
  },
  {
    id: "plan-builder",
    path: "/plan-builder",
    label: "Plan Builder",
    icon: "sparkles",
    type: "generator",
    description: "AI wizard that creates a draft schedule",
    showInMenu: false,
    enabled: true,
    actions: [
      { id: "create-draft", label: "Create draft schedule", handler: "createDraftSchedule" },
      { id: "cancel", label: "Cancel", to: "/" },
    ],
  },
  {
    id: "elevation-plan",
    path: "/elevation-plan",
    label: "Elevation Plan",
    icon: "trending-up",
    type: "page",
    description: "7-day elevation plan builder – draft, review, and activate",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 57,
    enabled: true,
    requiredFlag: "ELEVATION_PLAN",
    linkedType: "plan",
    actions: [
      { id: "view-plan", label: "View elevation plan", to: "/elevation-plan", icon: "trending-up" },
      { id: "view-history", label: "Plan history", to: "/plan-history", icon: "history" },
    ],
  },
  {
    id: "weekly-review",
    path: "/weekly-review",
    label: "Weekly Review",
    icon: "clipboard-list",
    type: "page",
    description: "Review last week's elevation plan – wins, friction, and next-week proposal",
    showInMenu: false,
    menuSection: "more",
    menuOrder: 58,
    enabled: true,
    requiredFlag: "WEEKLY_REVIEW",
    linkedType: "plan",
  },
  {
    id: "expand-my-week",
    path: "/expand-my-week",
    label: "Expand My Week",
    icon: "calendar-plus",
    type: "generator",
    description: "Conversational planner that builds your ideal week through adaptive Q&A",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 56,
    enabled: true,
    requiredFlag: "ELEVATION_PLAN",
  },
  {
    id: "schedule-review",
    path: "/schedule-review/:draftId",
    label: "Suggested Schedule",
    icon: "calendar-check",
    type: "page",
    description: "View/edit AI suggested schedule",
    showInMenu: false,
    guard: { requiredData: ["draftId"], fallbackHandler: "openLatestDraftOrCreate" },
    enabled: true,
    actions: [
      { id: "edit", label: "Edit", handler: "toggleEditMode", icon: "edit" },
      { id: "save-to-life-system", label: "Save to Life System", handler: "commitDraftToPlan", icon: "save" },
      { id: "add-selected-calendar", label: "Add selected to Calendar", handler: "confirmAddSelectedToCalendar", icon: "calendar-plus" },
      { id: "back-to-chat", label: "Back to chat", to: "/" },
    ],
  },
  {
    id: "tasks",
    path: "/tasks",
    label: "Tasks",
    icon: "check-square",
    type: "page",
    description: "To-dos linked to plans and schedule",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 65,
    enabled: true,
  },

  {
    id: "talk",
    path: "/talk",
    label: "Talk It Out",
    navLabel: "DW",
    icon: "message-circle",
    type: "page",
    description: "Emotion processing mode",
    showInMenu: false, // In bottom nav
    menuSection: "bottom",
    menuOrder: 70,
    enabled: true,
  },
  {
    id: "challenges",
    path: "/challenges",
    label: "Challenges",
    icon: "trophy",
    type: "page",
    description: "Growth challenges",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 75,
    enabled: true,
  },
  {
    id: "finances",
    path: "/finances",
    label: "Finances",
    icon: "wallet",
    type: "page",
    description: "Budget tracking",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 80,
    enabled: true,
  },
  {
    id: "astrology",
    path: "/cosmic-insights",
    label: "Cosmic Insights",
    icon: "sparkles",
    type: "page",
    description: "Cosmic insights",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 85,
    enabled: true,
  },
  {
    id: "cosmic",
    path: "/cosmic",
    label: "Cosmic Hub",
    icon: "star",
    type: "page",
    description: "Calendar, cosmic insights, numerology and more — all in one place",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 84,
    enabled: true,
  },
  {
    id: "systems",
    path: "/systems",
    label: "Systems Hub",
    icon: "settings-2",
    type: "page",
    description: "Manage your life systems",
    showInMenu: false, // Overlaps with other features, hiding from menu
    menuSection: "more",
    menuOrder: 86,
    enabled: true,
  },
  {
    id: "systems-training",
    path: "/systems/training",
    label: "Movement Practice",
    icon: "dumbbell",
    type: "page",
    description: "Workouts and exercise routines",
    showInMenu: false,
    menuParentId: "systems",
    enabled: true,
  },
  {
    id: "systems-wake-up",
    path: "/systems/wake-up",
    label: "Morning Anchor",
    icon: "sun",
    type: "page",
    description: "Morning routine and wake-up practices",
    showInMenu: false,
    menuParentId: "systems",
    enabled: true,
  },
  {
    id: "systems-wind-down",
    path: "/systems/wind-down",
    label: "Evening Transition",
    icon: "moon",
    type: "page",
    description: "Wind down and evening routine",
    showInMenu: false,
    menuParentId: "systems",
    enabled: true,
  },
  {
    id: "community",
    path: "/community",
    label: "Community",
    icon: "users",
    type: "page",
    description: "Connect and contribute",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 87,
    enabled: true,
  },
  {
    id: "blueprint",
    path: "/blueprint",
    label: "Blueprint",
    icon: "file-cog",
    type: "page",
    description: "Advanced wellness configuration",
    showInMenu: false,
    enabled: true,
  },

  {
    id: "import",
    path: "/import",
    label: "Import",
    icon: "upload",
    type: "page",
    description: "Document import flow",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 90,
    enabled: true,
  },
  {
    id: "export",
    path: "/export/:planId",
    label: "Export",
    icon: "download",
    type: "page",
    description: "Export plan as ICS/PDF",
    showInMenu: false,
    guard: { requiredData: ["planId"], fallbackTo: "/plans" },
    enabled: true,
  },

  {
    id: "weekly-checkin",
    path: "/weekly-checkin",
    label: "Beta Feedback",
    icon: "clipboard-list",
    type: "page",
    description: "Weekly beta check-in",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 91,
    enabled: true,
  },
  {
    id: "feedback",
    path: "/feedback",
    label: "Feedback",
    icon: "message-circle-heart",
    type: "page",
    description: "Share thoughts",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 92,
    enabled: true,
  },
  {
    id: "support-report",
    path: "/support/report",
    label: "Report a Problem",
    icon: "flag",
    type: "page",
    description: "Submit a consent-based support report",
    showInMenu: false,
    enabled: true,
    isPublic: true,
  },
  {
    id: "settings",
    path: "/settings",
    label: "Settings",
    icon: "settings",
    type: "page",
    description: "Preferences",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 95,
    enabled: true,
  },
  {
    id: "values-rules-profile",
    path: "/values-rules-profile",
    label: "Values & Rules",
    icon: "shield-check",
    type: "page",
    description: "Dietary, movement, belief and life constraints — single source of truth for personalization",
    showInMenu: false,
    enabled: true,
  },
  {
    id: "dw-learns",
    path: "/dw-learns",
    label: "What DW Learned",
    icon: "brain",
    type: "page",
    description: "View, edit, and reset DW's learned preferences for you",
    showInMenu: false,
    enabled: true,
  },
  {
    id: "app-tour",
    path: "/app-tour",
    label: "App Tour",
    icon: "help-circle",
    type: "page",
    description: "Re-run interactive tutorials",
    showInMenu: true, // Show in All Features (Settings & Tools category)
    menuSection: "more",
    menuOrder: 98,
    enabled: true,
  },

  {
    id: "dev-routes",
    path: "/dev/routes",
    label: "Route Audit",
    icon: "bug",
    type: "dev",
    description: "Lists all routes + nav/button targets; flags missing ones",
    showInMenu: false,
    enabled: true,
  },
  {
    id: "not-found",
    path: "/404",
    label: "Not Found",
    icon: "alert-triangle",
    type: "page",
    description: "Never blank. Shows navigation + feedback link.",
    showInMenu: false,
    enabled: true,
    actions: [
      { id: "go-home", label: "Go Home", to: "/" },
      { id: "feedback", label: "Report an issue", to: "/feedback" },
    ],
  },
];

export function getRouteById(id: string): RouteRegistryItem | undefined {
  return ROUTE_REGISTRY.find(r => r.id === id);
}

export function getRouteByPath(path: string): RouteRegistryItem | undefined {
  const normalizedPath = path.split('?')[0];
  return ROUTE_REGISTRY.find(r => {
    if (r.path === normalizedPath) return true;
    if (r.path.includes(':')) {
      const pattern = r.path.replace(/:[^/]+/g, '[^/]+');
      const regex = new RegExp(`^${pattern}$`);
      return regex.test(normalizedPath);
    }
    return false;
  });
}

function isRouteFlagEnabled(route: RouteRegistryItem): boolean {
  if (!route.requiredFlag) return true;
  return isFeatureEnabled(route.requiredFlag as keyof FeatureFlags);
}

export function isRouteEnabled(path: string): boolean {
  const route = getRouteByPath(path);
  if (!route) return false;
  return (route.enabled ?? false) && isRouteFlagEnabled(route);
}

export function getEnabledRoutes(): RouteRegistryItem[] {
  return ROUTE_REGISTRY.filter(r => r.enabled && isRouteFlagEnabled(r));
}

export function getMenuRoutes(section?: MenuSection): RouteRegistryItem[] {
  return ROUTE_REGISTRY
    .filter(r => r.showInMenu && r.enabled !== false && isRouteFlagEnabled(r))
    .filter(r => !section || r.menuSection === section)
    .sort((a, b) => (a.menuOrder ?? 99) - (b.menuOrder ?? 99));
}

export function getPrimaryMenuRoutes(): RouteRegistryItem[] {
  return getMenuRoutes("primary");
}

export function getCalendarMenuRoutes(): RouteRegistryItem[] {
  return getMenuRoutes("calendar");
}

export function getMoreMenuRoutes(): RouteRegistryItem[] {
  return getMenuRoutes("more");
}

export function getBottomMenuRoutes(): RouteRegistryItem[] {
  return getMenuRoutes("bottom");
}

export function getAllRegisteredPaths(): string[] {
  return ROUTE_REGISTRY.map(r => r.path);
}

export function getRouteActions(routeId: string): RouteAction[] {
  const route = getRouteById(routeId);
  return route?.actions ?? [];
}

export function isValidRoute(path: string): boolean {
  return getRouteByPath(path) !== undefined;
}

export function getRouteGuard(path: string): RouteGuard | undefined {
  const route = getRouteByPath(path);
  return route?.guard;
}
