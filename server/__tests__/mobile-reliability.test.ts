import { describe, expect, it } from 'vitest';
import {
  buildCorrelationId,
  calculateBackoffDelay,
  classifyErrorKind,
  resolveInitialRoute,
  sanitizeTelemetryProperties,
  shouldRetryRequest,
} from '../../shared/reliability';

describe('mobile reliability helpers', () => {
  it('retries transient idempotent failures only', () => {
    expect(
      shouldRetryRequest({ attempt: 0, retries: 2, method: 'GET', status: 503 }),
    ).toBe(true);
    expect(
      shouldRetryRequest({ attempt: 0, retries: 2, method: 'POST', status: 503 }),
    ).toBe(false);
    expect(
      shouldRetryRequest({ attempt: 2, retries: 2, method: 'GET', status: 503 }),
    ).toBe(false);
  });

  it('classifies timeout and auth errors consistently', () => {
    expect(classifyErrorKind(undefined, 'TIMEOUT')).toBe('timeout');
    expect(classifyErrorKind(401)).toBe('unauthorized');
    expect(classifyErrorKind(503)).toBe('server');
  });

  it('redacts sensitive telemetry fields', () => {
    expect(
      sanitizeTelemetryProperties({
        email: 'person@example.com',
        password: 'secret',
        source: 'bootstrap',
      }),
    ).toEqual({
      email: '[redacted]',
      password: '[redacted]',
      source: 'bootstrap',
    });
  });

  it('builds deterministic helpers for routing and backoff', () => {
    expect(resolveInitialRoute(true)).toBe('/(tabs)');
    expect(resolveInitialRoute(false)).toBe('/auth/welcome');
    expect(calculateBackoffDelay(0)).toBeLessThan(calculateBackoffDelay(1));
    expect(buildCorrelationId('test')).toMatch(/^test-/);
  });
});
