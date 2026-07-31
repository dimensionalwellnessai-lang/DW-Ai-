/**
 * Analytics service for DW.ai mobile app.
 * Wraps PostHog for event tracking with graceful degradation.
 */

import { Config } from '../config/env';

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

/** Shared context attached to every event. */
function buildBaseProperties(): EventProperties {
  return {
    environment: Config.environment,
  };
}

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
    const enriched: EventProperties = {
      ...buildBaseProperties(),
      ...properties,
    };

    if (Config.environment === 'development') {
      console.log('[Analytics] track:', event, enriched);
    }

    // PostHog.capture would go here
  }

  screen(screenName: string, properties?: EventProperties): void {
    const enriched: EventProperties = {
      ...buildBaseProperties(),
      ...properties,
    };

    if (Config.environment === 'development') {
      console.log('[Analytics] screen:', screenName, enriched);
    }
  }
}

export const analytics = new AnalyticsService();
