/**
 * Analytics service for DW.ai mobile app.
 * Wraps PostHog for event tracking with graceful degradation.
 */

import * as Sentry from '@sentry/react-native';
import { Config } from '../config/env';
import { sanitizeTelemetryProperties } from '../lib/reliability';
import { getReleaseTag } from './monitoring';

type EventProperties = Record<string, string | number | boolean | null | undefined>;

/**
 * Canonical monetization funnel event names.
 * Use these constants everywhere — do not use ad-hoc string literals.
 */
export const ANALYTICS_EVENTS = {
  // Paywall lifecycle
  PAYWALL_VIEW: 'paywall_view',
  PLAN_SELECT: 'plan_select',

  // Purchase funnel
  PURCHASE_START: 'purchase_start',
  PURCHASE_SUCCESS: 'purchase_success',
  PURCHASE_FAIL: 'purchase_fail',
  PURCHASE_CANCEL: 'purchase_cancel',

  // Restore flow
  RESTORE_START: 'restore_start',
  RESTORE_SUCCESS: 'restore_success',
  RESTORE_FAIL: 'restore_fail',

  // Entitlement lifecycle
  ENTITLEMENT_STATE_CHANGED: 'entitlement_state_changed',

  // Auth
  AUTH_LOGIN_SUCCESS: 'auth_login_success',
  AUTH_LOGIN_FAILURE: 'auth_login_failure',
  AUTH_REGISTER_SUCCESS: 'auth_register_success',
  AUTH_REGISTER_FAILURE: 'auth_register_failure',
  AUTH_LOGOUT: 'auth_logout',
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

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
      const sanitizedProperties = sanitizeTelemetryProperties({
        ...properties,
        environment: Config.environment,
      });

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
