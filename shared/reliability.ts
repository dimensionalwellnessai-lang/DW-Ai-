export type ReliabilityErrorKind =
  | 'timeout'
  | 'network'
  | 'unauthorized'
  | 'forbidden'
  | 'not_found'
  | 'rate_limited'
  | 'server'
  | 'client'
  | 'unknown';

export interface RetryDecisionInput {
  attempt: number;
  retries: number;
  method?: string;
  status?: number;
  retryable?: boolean;
}

const RETRYABLE_STATUS_CODES = new Set([408, 425, 429, 500, 502, 503, 504]);
const TELEMETRY_REDACTION_PATTERN =
  /(email|password|token|secret|cookie|authorization|session|message|content)/i;

export function buildCorrelationId(prefix = 'dw'): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function calculateBackoffDelay(
  attempt: number,
  baseDelayMs = 750,
  maxDelayMs = 5_000,
): number {
  return Math.min(baseDelayMs * 2 ** attempt, maxDelayMs);
}

export function shouldRetryRequest({
  attempt,
  retries,
  method = 'GET',
  status,
  retryable,
}: RetryDecisionInput): boolean {
  if (attempt >= retries) {
    return false;
  }

  if (retryable === false) {
    return false;
  }

  const normalizedMethod = method.toUpperCase();
  const isIdempotentMethod = ['GET', 'HEAD', 'OPTIONS'].includes(normalizedMethod);
  const canRetry = retryable === true || isIdempotentMethod;

  if (!canRetry) {
    return false;
  }

  if (status == null) {
    return true;
  }

  return RETRYABLE_STATUS_CODES.has(status);
}

export function classifyErrorKind(status?: number, code?: string): ReliabilityErrorKind {
  if (code === 'TIMEOUT') return 'timeout';
  if (code === 'NETWORK') return 'network';
  if (status === 401) return 'unauthorized';
  if (status === 403) return 'forbidden';
  if (status === 404) return 'not_found';
  if (status === 429) return 'rate_limited';
  if (status != null && status >= 500) return 'server';
  if (status != null && status >= 400) return 'client';
  return 'unknown';
}

export function resolveInitialRoute(hasUser: boolean): '/(tabs)' | '/auth/welcome' {
  return hasUser ? '/(tabs)' : '/auth/welcome';
}

export function sanitizeTelemetryProperties(
  properties?: Record<string, unknown>,
): Record<string, string | number | boolean | null> | undefined {
  if (!properties) {
    return undefined;
  }

  const sanitizedEntries = Object.entries(properties).map(([key, value]) => {
    if (TELEMETRY_REDACTION_PATTERN.test(key)) {
      return [key, '[redacted]'] as const;
    }

    if (
      value == null ||
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean'
    ) {
      return [key, value ?? null] as const;
    }

    if (value instanceof Error) {
      return [key, value.name] as const;
    }

    try {
      return [key, JSON.stringify(value)] as const;
    } catch {
      return [key, '[unserializable]'] as const;
    }
  });

  return Object.fromEntries(sanitizedEntries);
}
