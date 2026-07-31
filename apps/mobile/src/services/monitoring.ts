/**
 * Sentry error monitoring for DW.ai mobile app.
 */

import * as Sentry from '@sentry/react-native';
import { Config } from '../config/env';

export function initializeSentry(): void {
  if (!Config.sentryDsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: Config.sentryDsn,
    environment: Config.environment,
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: Config.environment === 'production' ? 0.2 : 1.0,
    debug: Config.environment === 'development',
  });
}

export function setUserContext(userId: string, email?: string): void {
  Sentry.setUser({ id: userId, email });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  if (error instanceof Error) {
    Sentry.captureException(error, context ? { extra: context } : undefined);
  } else {
    Sentry.captureMessage(String(error), 'error');
  }
}
