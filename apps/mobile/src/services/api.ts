/**
 * API client for DW.ai mobile app.
 * Handles authentication, request timeouts, and retries.
 */

import * as SecureStore from 'expo-secure-store';
import { Config } from '../config/env';

const SESSION_KEY = 'dw_session_token';
const REQUEST_TIMEOUT_MS = 15_000;
const MAX_RETRIES = 2;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class NetworkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NetworkError';
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

function buildHeaders(sessionToken?: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Client': 'dw-mobile/1.0',
  };
  if (sessionToken) {
    headers['Cookie'] = `connect.sid=${sessionToken}`;
  }
  return headers;
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs = REQUEST_TIMEOUT_MS,
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new NetworkError('Request timed out. Please check your connection and try again.');
    }
    throw new NetworkError('Network error. Please check your connection and try again.');
  } finally {
    clearTimeout(timeoutId);
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  retries = MAX_RETRIES,
): Promise<T> {
  const sessionToken = await getStoredSession();
  const url = `${Config.apiBaseUrl}${path}`;

  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...buildHeaders(sessionToken),
      ...(options.headers as Record<string, string> | undefined),
    },
    credentials: 'include',
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const response = await fetchWithTimeout(url, requestOptions);

      // Extract and store session cookie for subsequent requests
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        const match = setCookie.match(/connect\.sid=([^;]+)/);
        if (match?.[1]) {
          await storeSession(match[1]);
        }
      }

      if (response.status === 401) {
        await clearSession();
        throw new ApiError('Session expired. Please sign in again.', 401, 'UNAUTHORIZED');
      }

      if (!response.ok) {
        let message = `Request failed with status ${response.status}`;
        try {
          const body = await response.json() as { message?: string; error?: string };
          message = body.message ?? body.error ?? message;
        } catch {
          // Ignore JSON parse error
        }
        throw new ApiError(message, response.status);
      }

      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return undefined as unknown as T;
      }

      return (await response.json()) as T;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // Don't retry auth errors or client errors
      if (error instanceof ApiError && error.status < 500) {
        throw error;
      }

      // Wait before retry with exponential backoff
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, 1000 * Math.pow(2, attempt)));
      }
    }
  }

  throw lastError ?? new NetworkError('Request failed after multiple attempts.');
}

export const api = {
  get: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'GET' }),

  post: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'POST',
      body: JSON.stringify(body),
    }),

  put: <T>(path: string, body: unknown, options?: RequestInit) =>
    request<T>(path, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(body),
    }),

  delete: <T>(path: string, options?: RequestInit) =>
    request<T>(path, { ...options, method: 'DELETE' }),
};
