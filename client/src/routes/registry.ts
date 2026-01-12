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
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 2,
    enabled: true,
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
    id: "today-hub",
    path: "/today",
    label: "Today",
    navLabel: "Today",
    icon: "sun",
    type: "page",
    description: "Your daily hub - schedule, routines, and energy",
    showInMenu: true,
    menuSection: "primary",
    menuOrder: 0,
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
    id: "daily-schedule",
    path: "/daily-schedule",
    label: "Daily Schedule",
    icon: "list",
    type: "page",
    description: "Manage your daily schedule blocks",
    showInMenu: true,
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
    showInMenu: true,
    menuSection: "calendar",
    menuOrder: 11,
    menuParentId: "calendar-root",
    enabled: true,
  },
  {
    id: "calendar-month",
    path: "/calendar/month",
    label: "Month",
    icon: "calendar-days",
    type: "page",
    description: "Month view calendar",
    showInMenu: true,
    menuSection: "calendar",
    menuOrder: 12,
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
    showInMenu: true,
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
    id: "journal",
    path: "/journal",
    label: "Journal",
    icon: "book-open",
    type: "page",
    description: "Daily reflections",
    showInMenu: true,
    menuSection: "primary",
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
    showInMenu: true,
    menuSection: "primary",
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
    icon: "message-circle",
    type: "page",
    description: "Emotion processing mode",
    showInMenu: true,
    menuSection: "more",
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
    path: "/astrology",
    label: "Astrology",
    icon: "sparkles",
    type: "page",
    description: "Cosmic insights",
    showInMenu: true,
    menuSection: "more",
    menuOrder: 85,
    enabled: true,
  },
  {
    id: "systems",
    path: "/systems",
    label: "Systems Hub",
    icon: "settings-2",
    type: "page",
    description: "Manage your life systems",
    showInMenu: true,
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
    id: "app-tour",
    path: "/app-tour",
    label: "App Tour",
    icon: "help-circle",
    type: "page",
    description: "Re-run interactive tutorials",
    showInMenu: false,
    menuSection: "bottom",
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

export function isRouteEnabled(path: string): boolean {
  const route = getRouteByPath(path);
  return route?.enabled ?? false;
}

export function getEnabledRoutes(): RouteRegistryItem[] {
  return ROUTE_REGISTRY.filter(r => r.enabled);
}

export function getMenuRoutes(section?: MenuSection): RouteRegistryItem[] {
  return ROUTE_REGISTRY
    .filter(r => r.showInMenu && r.enabled !== false)
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
