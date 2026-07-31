/**
 * Analytics service for DW.ai mobile app.
 * Wraps PostHog for event tracking with graceful degradation.
 */

import { Config } from '../config/env';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

class AnalyticsService {
  private userId?: string;
  private initialized = false;

  initialize(): void {
    if (!Config.posthogApiKey) {
      console.warn('[Analytics] PostHog API key not configured. Analytics disabled.');
      return;
    }
    // PostHog would be initialized here once posthog-react-native is added
    // For now we log in development
    this.initialized = true;
  }

  identify(userId: string, properties?: EventProperties): void {
    this.userId = userId;
    if (Config.environment === 'development') {
      console.log('[Analytics] identify:', userId, properties);
    }
  }

  reset(): void {
    this.userId = undefined;
    if (Config.environment === 'development') {
      console.log('[Analytics] reset');
    }
  }

  track(event: string, properties?: EventProperties): void {
    if (Config.environment === 'development') {
      console.log('[Analytics] track:', event, properties);
    }

    // PostHog.capture would go here
  }

  screen(screenName: string, properties?: EventProperties): void {
    if (Config.environment === 'development') {
      console.log('[Analytics] screen:', screenName, properties);
    }
  }
}

export const analytics = new AnalyticsService();
