/**
 * Deep Link Handler
 * Handles deep links from Siri, Google Assistant, and other sources
 */

export interface DeepLinkAction {
  action: string;
  params?: Record<string, string>;
}

type DeepLinkHandler = (action: DeepLinkAction) => void;

// Type definitions for Capacitor App plugin
interface URLOpenListenerEvent {
  url: string;
}

interface LaunchUrlResult {
  url?: string;
}

class DeepLinkService {
  private handlers: Map<string, DeepLinkHandler> = new Map();
  private isInitialized = false;
  private isCapacitorAvailable = false;

  constructor() {
    // Check if Capacitor is available
    if (typeof window !== 'undefined' && (window as any).Capacitor) {
      this.isCapacitorAvailable = true;
    }
  }

  /**
   * Initialize deep link listener
   */
  async initialize() {
    if (this.isInitialized) return;
    
    try {
      if (!this.isCapacitorAvailable) {
        console.log('Capacitor not available, deep links will not work in web mode');
        this.isInitialized = true;
        return;
      }

      // Dynamically import Capacitor App plugin
      // @ts-ignore - Capacitor App plugin may not be available in web builds
      const capacitorApp = await import('@capacitor/app').catch(() => null);
      if (!capacitorApp) {
        console.log('Capacitor App plugin not available');
        this.isInitialized = true;
        return;
      }

      const { App } = capacitorApp;
      
      // Listen for deep links
      App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.handleDeepLink(event.url);
      });

      // Check if app was opened with a URL
      const result: LaunchUrlResult = await App.getLaunchUrl();
      if (result?.url) {
        this.handleDeepLink(result.url);
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize deep link service:', error);
      this.isInitialized = true; // Mark as initialized even on error to prevent retries
    }
  }

  /**
   * Register a handler for a specific action
   */
  registerHandler(action: string, handler: DeepLinkHandler) {
    this.handlers.set(action, handler);
  }

  /**
   * Unregister a handler
   */
  unregisterHandler(action: string) {
    this.handlers.delete(action);
  }

  /**
   * Parse and handle a deep link URL
   * Supports formats like: dwai://action?type=chat&message=hello
   */
  private handleDeepLink(url: string) {
    try {
      console.log('Deep link received:', url);

      // Parse URL
      const urlObj = new URL(url);
      
      // Check if it's our scheme
      if (urlObj.protocol !== 'dwai:') {
        console.warn('Unknown URL scheme:', urlObj.protocol);
        return;
      }

      // Extract action from query parameter or path
      let action = urlObj.searchParams.get('type') || 'unknown';
      
      // If no type param, try to get from path (format: dwai://chat or dwai://action/chat)
      if (action === 'unknown') {
        const pathParts = urlObj.pathname.split('/').filter(Boolean);
        // Handle both dwai://chat and dwai://action/chat formats
        action = pathParts.length > 0 ? pathParts[pathParts.length - 1] : 'unknown';
      }
      
      // Extract query parameters
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        if (key !== 'type') { // Don't include type in params since it's the action
          params[key] = value;
        }
      });

      // Find and execute handler
      const handler = this.handlers.get(action);
      if (handler) {
        handler({ action, params });
      } else {
        console.warn('No handler registered for action:', action);
        // Default action - navigate to home
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
    } catch (error) {
      console.error('Failed to parse deep link:', error);
    }
  }

  /**
   * Generate a deep link URL
   * Format: dwai://action?type=actionName&param1=value1
   */
  generateDeepLink(action: string, params?: Record<string, string>): string {
    const url = new URL(`dwai://action`);
    url.searchParams.append('type', action);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, value);
      });
    }
    return url.toString();
  }
}

// Create singleton instance
export const deepLinkService = new DeepLinkService();

// Common deep link actions
export const DEEP_LINK_ACTIONS = {
  CHAT: 'chat',
  SCHEDULE: 'schedule',
  TASKS: 'tasks',
  MEDITATION: 'meditation',
  WORKOUT: 'workout',
  JOURNAL: 'journal',
  CHECK_IN: 'checkin',
} as const;

/**
 * Hook for using deep links in React components
 */
export function useDeepLinkHandler(action: string, handler: DeepLinkHandler) {
  // Note: This is a simplified hook. In a real React app, wrap this with useEffect:
  // useEffect(() => {
  //   deepLinkService.initialize();
  //   deepLinkService.registerHandler(action, handler);
  //   return () => deepLinkService.unregisterHandler(action);
  // }, [action, handler]);
  
  if (typeof window !== 'undefined') {
    deepLinkService.initialize();
    deepLinkService.registerHandler(action, handler);
  }
}
