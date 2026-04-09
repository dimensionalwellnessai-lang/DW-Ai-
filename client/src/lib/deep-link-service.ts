/**
 * Deep Link Handler
 * Handles deep links from Siri, Google Assistant, widgets, and other sources.
 * Scheme: dwai://action?type=<action>&source=<source>&autoVoice=1&...params
 */

export interface DeepLinkAction {
  action: string;
  params?: Record<string, string>;
}

type DeepLinkHandler = (action: DeepLinkAction) => void;

interface URLOpenListenerEvent { url: string; }
interface LaunchUrlResult { url?: string; }

// Action → route mapping used by the default navigation handler
const ACTION_ROUTES: Record<string, string> = {
  voice:         "/voice",
  day_start:     "/day/start",
  whats_next:    "/voice?topic=whats+next",
  mood_log:      "/mood-tracker",
  task_add:      "/tasks",
  workout_start: "/workout",
  meal_log:      "/meal-prep",
  open_app:      "/command-center",
  chat:          "/talk",
  schedule:      "/calendar",
  tasks:         "/tasks",
  meditation:    "/spiritual",
  workout:       "/workout",
  journal:       "/journal",
  checkin:       "/weekly-checkin",
};

class DeepLinkService {
  private handlers: Map<string, DeepLinkHandler> = new Map();
  private isInitialized = false;
  private isCapacitorAvailable = false;
  private navigateFn: ((path: string) => void) | null = null;

  constructor() {
    if (typeof window !== "undefined" && (window as any).Capacitor) {
      this.isCapacitorAvailable = true;
    }
  }

  /** Supply a navigation function (e.g. wouter's setLocation) so the default
   *  handler can route the user to the correct page. */
  setNavigator(fn: (path: string) => void) {
    this.navigateFn = fn;
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      if (!this.isCapacitorAvailable) {
        this.isInitialized = true;
        return;
      }

      const capacitorApp = await import("@capacitor/app").catch(() => null);
      if (!capacitorApp) { this.isInitialized = true; return; }

      const { App } = capacitorApp;
      App.addListener("appUrlOpen", (event: URLOpenListenerEvent) => {
        this.handleDeepLink(event.url);
      });

      const result: LaunchUrlResult = await App.getLaunchUrl();
      if (result?.url) {
        // Delay slightly so the React tree is mounted and navigator is ready
        setTimeout(() => this.handleDeepLink(result.url!), 800);
      }

      this.isInitialized = true;
    } catch {
      this.isInitialized = true;
    }
  }

  registerHandler(action: string, handler: DeepLinkHandler) {
    this.handlers.set(action, handler);
  }

  unregisterHandler(action: string) {
    this.handlers.delete(action);
  }

  private handleDeepLink(url: string) {
    try {
      console.log("[DeepLink] Received:", url);
      const urlObj = new URL(url);
      if (urlObj.protocol !== "dwai:") return;

      let action = urlObj.searchParams.get("type") ?? "unknown";
      if (action === "unknown") {
        const parts = urlObj.pathname.split("/").filter(Boolean);
        if (parts.length > 0) action = parts[parts.length - 1];
        // hostname is also valid: dwai://voice → hostname = "voice"
        if (action === "unknown" && urlObj.hostname && urlObj.hostname !== "action") {
          action = urlObj.hostname;
        }
      }

      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((v, k) => {
        if (k !== "type") params[k] = v;
      });

      // Custom handler wins
      const handler = this.handlers.get(action);
      if (handler) { handler({ action, params }); return; }

      // Default: navigate via mapped route
      const route = ACTION_ROUTES[action];
      if (route && this.navigateFn) {
        const sp = new URLSearchParams(params);
        // Append action + source so useAssistantLaunch can read them
        sp.set("action", action);
        const sep = route.includes("?") ? "&" : "?";
        this.navigateFn(`${route}${sep}${sp}`);
        return;
      }

      // Absolute fallback
      if (this.navigateFn) this.navigateFn("/command-center");
    } catch (err) {
      console.error("[DeepLink] Parse error:", err);
    }
  }

  generateDeepLink(action: string, params?: Record<string, string>): string {
    const url = new URL("dwai://action");
    url.searchParams.append("type", action);
    if (params) {
      Object.entries(params).forEach(([k, v]) => url.searchParams.append(k, v));
    }
    return url.toString();
  }
}

export const deepLinkService = new DeepLinkService();

export const DEEP_LINK_ACTIONS = {
  VOICE:          "voice",
  DAY_START:      "day_start",
  WHATS_NEXT:     "whats_next",
  MOOD_LOG:       "mood_log",
  TASK_ADD:       "task_add",
  WORKOUT_START:  "workout_start",
  MEAL_LOG:       "meal_log",
  OPEN_APP:       "open_app",
  CHAT:           "chat",
  SCHEDULE:       "schedule",
  TASKS:          "tasks",
  MEDITATION:     "meditation",
  WORKOUT:        "workout",
  JOURNAL:        "journal",
  CHECK_IN:       "checkin",
} as const;

export function useDeepLinkHandler(action: string, handler: DeepLinkHandler) {
  if (typeof window !== "undefined") {
    deepLinkService.registerHandler(action, handler);
  }
}
