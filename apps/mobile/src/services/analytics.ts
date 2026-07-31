/**
 * Analytics service for DW.ai mobile app.
 * Wraps PostHog for event tracking with graceful degradation.
 */

import * as Sentry from '@sentry/react-native';
import { Config } from '../config/env';
import { sanitizeTelemetryProperties } from '../lib/reliability';
import { getReleaseTag } from './monitoring';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

class AnalyticsService {
  private userId?: string;
  private initialized = false;

  initialize(): void {
    try {
      this.initialized = true;

      if (!Config.posthogApiKey) {
        console.warn('[Analytics] PostHog API key not configured. Falling back to local observability only.');
      }
    } catch (error) {
      console.warn('[Analytics] Initialization failed', error);
    }
  }

  identify(userId: string, properties?: EventProperties): void {
    try {
      this.userId = userId;
      const sanitizedProperties = sanitizeTelemetryProperties(properties);
      Sentry.setTag('analytics_environment', Config.environment);
      Sentry.setTag('analytics_release', getReleaseTag());

      if (Config.environment === 'development') {
        console.log('[Analytics] identify:', userId, sanitizedProperties);
      }
    } catch (error) {
      console.warn('[Analytics] Identify failed', error);
    }
  }

  reset(): void {
    try {
      this.userId = undefined;
      if (Config.environment === 'development') {
        console.log('[Analytics] reset');
      }
    } catch (error) {
      console.warn('[Analytics] Reset failed', error);
    }
  }

  track(event: string, properties?: EventProperties): void {
    try {
      if (!this.initialized) {
        this.initialize();
      }

      const sanitizedProperties = sanitizeTelemetryProperties({
        ...properties,
        environment: Config.environment,
        release: getReleaseTag(),
      });

      Sentry.addBreadcrumb({
        category: 'analytics',
        type: 'info',
        message: event,
        level: 'info',
        data: sanitizedProperties,
      });

      if (Config.environment === 'development') {
        console.log('[Analytics] track:', event, sanitizedProperties);
      }

      // PostHog.capture would go here
    } catch (error) {
      console.warn('[Analytics] Track failed', error);
    }
  }

  screen(screenName: string, properties?: EventProperties): void {
    try {
      const sanitizedProperties = sanitizeTelemetryProperties(properties);

      Sentry.addBreadcrumb({
        category: 'screen',
        type: 'navigation',
        message: screenName,
        level: 'info',
        data: sanitizedProperties,
      });

      if (Config.environment === 'development') {
        console.log('[Analytics] screen:', screenName, sanitizedProperties);
      }
    } catch (error) {
      console.warn('[Analytics] Screen tracking failed', error);
    }
  }
}

export const analytics = new AnalyticsService();
