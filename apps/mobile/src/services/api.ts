/**
 * API client for DW.ai mobile app.
 * Handles secure session persistence, request timeouts, retries, and typed error normalization.
 */

import * as SecureStore from 'expo-secure-store';
import { Config } from '../config/env';
import {
  buildCorrelationId,
  calculateBackoffDelay,
  classifyErrorKind,
  shouldRetryRequest,
  type ReliabilityErrorKind,
} from '../lib/reliability';

const SESSION_KEY = 'dw_session_token';
const DEFAULT_TIMEOUT_MS = 15_000;
const AI_TIMEOUT_MS = 30_000;
const DEFAULT_RETRIES = 2;

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null;
  timeoutMs?: number;
  retries?: number;
  correlationId?: string;
  retryable?: boolean;
}

export interface ApiResponseMetadata {
  correlationId: string;
  requestId?: string;
}

interface ApiErrorPayload {
  error?: string;
  message?: string;
  code?: string;
  requestId?: string;
}

export class NormalizedApiError extends Error {
  constructor(
    message: string,
    public readonly kind: ReliabilityErrorKind,
    public readonly status?: number,
    public readonly code?: string,
    public readonly correlationId?: string,
    public readonly requestId?: string,
    public readonly retryable = false,
  ) {
    super(message);
    this.name = 'NormalizedApiError';
  }

  get isTimeout(): boolean {
    return this.kind === 'timeout';
  }

  get isNetworkError(): boolean {
    return this.kind === 'network' || this.kind === 'timeout';
  }
}

async function getStoredSession(): Promise<string | null> {
  try {
    return await SecureStore.getItemAsync(SESSION_KEY);
  } catch {
    return null;
  }
}

export async function storeSession(token: string): Promise<void> {
  await SecureStore.setItemAsync(SESSION_KEY, token);
}

export async function clearSession(): Promise<void> {
  await SecureStore.deleteItemAsync(SESSION_KEY);
}

export async function hasStoredSession(): Promise<boolean> {
  return (await getStoredSession()) != null;
}

function buildHeaders(
  sessionToken?: string | null,
  headers?: HeadersInit,
  correlationId?: string,
): Headers {
  const normalized = new Headers(headers);
  normalized.set('Content-Type', normalized.get('Content-Type') ?? 'application/json');
  normalized.set('X-Client', 'dw-mobile/1.0');

  if (correlationId) {
    normalized.set('X-Correlation-ID', correlationId);
  }

  if (sessionToken) {
    normalized.set('Cookie', `connect.sid=${sessionToken}`);
  }

  return normalized;
}

async function parseApiError(
  response: Response,
  metadata: ApiResponseMetadata,
  method?: string,
): Promise<NormalizedApiError> {
  let payload: ApiErrorPayload | undefined;

  try {
    payload = (await response.json()) as ApiErrorPayload;
  } catch {
    payload = undefined;
  }

  const status = response.status;
  const code = payload?.code ?? payload?.error;
  const kind = classifyErrorKind(status, code);
  const message =
    payload?.message ??
    payload?.error ??
    (status === 401
      ? 'Session expired. Please sign in again.'
      : `Request failed with status ${status}.`);

  return new NormalizedApiError(
    message,
    kind,
    status,
    code,
    metadata.correlationId,
    payload?.requestId ?? metadata.requestId,
    shouldRetryRequest({
      attempt: 0,
      retries: 1,
      method,
      status,
    }),
  );
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
  metadata: ApiResponseMetadata,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NormalizedApiError(
        'Request timed out. Please try again.',
        'timeout',
        undefined,
        'TIMEOUT',
        metadata.correlationId,
        metadata.requestId,
        true,
      );
    }

    throw new NormalizedApiError(
      'Network error. Please check your connection and try again.',
      'network',
      undefined,
      'NETWORK',
      metadata.correlationId,
      metadata.requestId,
      true,
    );
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const sessionToken = await getStoredSession();
  const url = `${Config.apiBaseUrl}${path}`;
  const correlationId = options.correlationId ?? buildCorrelationId('mobile');
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const retries = options.retries ?? DEFAULT_RETRIES;
  const metadata: ApiResponseMetadata = { correlationId };

  const requestOptions: RequestInit = {
    ...options,
    headers: buildHeaders(sessionToken, options.headers, correlationId),
    credentials: 'include',
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, requestOptions, timeoutMs, metadata);
      metadata.requestId = response.headers.get('x-request-id') ?? metadata.requestId;

      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/connect\.sid=([^;]+)/);
        if (match?.[1]) {
          await storeSession(match[1]);
        }
      }

      if (response.status === 401) {
        await clearSession();
      }

      if (!response.ok) {
        throw await parseApiError(response, metadata, requestOptions.method);
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return undefined as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      const normalizedError =
        error instanceof NormalizedApiError
          ? error
          : new NormalizedApiError(
              error instanceof Error ? error.message : 'Unknown error',
              'unknown',
              undefined,
              undefined,
              correlationId,
              metadata.requestId,
            );

      lastError = normalizedError;

      if (
        !shouldRetryRequest({
          attempt,
          retries,
          method: requestOptions.method,
          status: normalizedError.status,
          retryable: options.retryable,
        })
      ) {
        throw normalizedError;
      }

      await new Promise((resolve) =>
        setTimeout(resolve, calculateBackoffDelay(attempt)),
      );
    }
  }

  throw lastError ?? new NormalizedApiError('Request failed.', 'unknown', undefined, undefined, correlationId);
}

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};

export const apiTimeouts = {
  default: DEFAULT_TIMEOUT_MS,
  ai: AI_TIMEOUT_MS,
};
