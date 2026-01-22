/**
 * Deep Link Handler
 * Handles deep links from Siri, Google Assistant, and other sources
 */

import { App, URLOpenListenerEvent } from '@capacitor/app';

export interface DeepLinkAction {
  action: string;
  params?: Record<string, string>;
}

type DeepLinkHandler = (action: DeepLinkAction) => void;

class DeepLinkService {
  private handlers: Map<string, DeepLinkHandler> = new Map();
  private isInitialized = false;

  /**
   * Initialize deep link listener
   */
  initialize() {
    if (this.isInitialized) return;
    
    try {
      // Listen for deep links
      App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
        this.handleDeepLink(event.url);
      });

      // Check if app was opened with a URL
      App.getLaunchUrl().then((result) => {
        if (result?.url) {
          this.handleDeepLink(result.url);
        }
      });

      this.isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize deep link service:', error);
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
   * Supports formats like: dwai://action/chat?message=hello
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

      // Extract action from path
      const pathParts = urlObj.pathname.split('/').filter(Boolean);
      const action = pathParts[0] || 'unknown';
      
      // Extract query parameters
      const params: Record<string, string> = {};
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value;
      });

      // Find and execute handler
      const handler = this.handlers.get(action);
      if (handler) {
        handler({ action, params });
      } else {
        console.warn('No handler registered for action:', action);
        // Default action - navigate to home
        window.location.href = '/';
      }
    } catch (error) {
      console.error('Failed to parse deep link:', error);
    }
  }

  /**
   * Generate a deep link URL
   */
  generateDeepLink(action: string, params?: Record<string, string>): string {
    const url = new URL(`dwai://action/${action}`);
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
  if (typeof window !== 'undefined') {
    deepLinkService.initialize();
    deepLinkService.registerHandler(action, handler);
    
    return () => {
      deepLinkService.unregisterHandler(action);
    };
  }
}
