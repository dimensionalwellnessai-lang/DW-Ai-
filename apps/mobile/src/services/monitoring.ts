/**
 * Sentry error monitoring for DW.ai mobile app.
 */

import * as Application from 'expo-application';
import * as Sentry from '@sentry/react-native';
import { Config } from '../config/env';
import { sanitizeTelemetryProperties } from '../lib/reliability';

export function getReleaseTag(): string {
  const version = Application.nativeApplicationVersion ?? 'dev';
  const build = Application.nativeBuildVersion ?? 'local';
  return `dw-ai-mobile@${version}+${build}`;
}

export function initializeSentry(): void {
  if (!Config.sentryDsn) {
    console.warn('[Sentry] DSN not configured. Error tracking disabled.');
    return;
  }

  Sentry.init({
    dsn: Config.sentryDsn,
    environment: Config.environment,
    release: getReleaseTag(),
    enableAutoSessionTracking: true,
    sessionTrackingIntervalMillis: 30000,
    tracesSampleRate: Config.environment === 'production' ? 0.2 : 1.0,
    debug: Config.environment === 'development',
  });

  Sentry.setTags({
    environment: Config.environment,
    release: getReleaseTag(),
    platform: 'mobile',
  });
}

export function setUserContext(userId: string): void {
  Sentry.setUser({ id: userId });
}

export function clearUserContext(): void {
  Sentry.setUser(null);
}

export function captureError(error: unknown, context?: Record<string, unknown>): void {
  const sanitizedContext = sanitizeTelemetryProperties(context);
  if (error instanceof Error) {
    Sentry.captureException(error, sanitizedContext ? { extra: sanitizedContext } : undefined);
  } else {
    Sentry.captureMessage(String(error), 'error');
  }
}

/**
 * Add a breadcrumb for richer error context around purchase and restore operations.
 * Breadcrumbs appear in the Sentry event timeline, helping trace the user's path
 * leading up to an error.
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, string | number | boolean | null | undefined>,
  level: Sentry.SeverityLevel = 'info',
): void {
  Sentry.addBreadcrumb({
    message,
    data,
    level,
    category: 'subscription',
  });
}
