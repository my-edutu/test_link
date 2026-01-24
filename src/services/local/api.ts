import { addToQueue, QueueRequestInput } from './queue';
import * as Network from 'expo-network';

export interface ApiResponse<T = unknown> {
  data: T | null;
  error: Error | null;
  isOffline: boolean;
  queuedRequestId?: string;
}

export interface RequestOptions {
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  skipQueue?: boolean; // Skip adding to queue if offline
  timeout?: number;
}

const DEFAULT_TIMEOUT = 30000; // 30 seconds

async function checkConnection(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected ?? false;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function offlineAwareRequest<T = unknown>(
  endpoint: string,
  method: QueueRequestInput['method'],
  options: RequestOptions = {}
): Promise<ApiResponse<T>> {
  const { headers = {}, body, skipQueue = false, timeout = DEFAULT_TIMEOUT } = options;

  const isConnected = await checkConnection();

  // If offline and it's a mutation (not GET), queue the request
  if (!isConnected && method !== 'GET' && !skipQueue) {
    const queuedRequestId = await addToQueue({
      endpoint,
      method,
      payload: body,
      headers,
    });

    console.log(`[API] Request queued (offline): ${method} ${endpoint}`);

    // Return a mock success response for optimistic UI
    return {
      data: null,
      error: null,
      isOffline: true,
      queuedRequestId,
    };
  }

  // If offline and it's a GET request, return error (can't fetch data offline)
  if (!isConnected && method === 'GET') {
    return {
      data: null,
      error: new Error('No internet connection'),
      isOffline: true,
    };
  }

  // Online: Make the actual request
  try {
    const response = await fetchWithTimeout(
      endpoint,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: body ? JSON.stringify(body) : undefined,
      },
      timeout
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const contentType = response.headers.get('content-type');
    let data: T | null = null;

    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    }

    return {
      data,
      error: null,
      isOffline: false,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));

    // If the request failed due to network issues, queue it for retry
    if (
      !skipQueue &&
      method !== 'GET' &&
      (err.name === 'AbortError' || err.message.includes('network') || err.message.includes('fetch'))
    ) {
      const queuedRequestId = await addToQueue({
        endpoint,
        method,
        payload: body,
        headers,
      });

      console.log(`[API] Request queued (network error): ${method} ${endpoint}`);

      return {
        data: null,
        error: err,
        isOffline: true,
        queuedRequestId,
      };
    }

    return {
      data: null,
      error: err,
      isOffline: false,
    };
  }
}

// Convenience methods
export const api = {
  get: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    offlineAwareRequest<T>(endpoint, 'GET', options),

  post: <T = unknown>(endpoint: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    offlineAwareRequest<T>(endpoint, 'POST', { ...options, body }),

  put: <T = unknown>(endpoint: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    offlineAwareRequest<T>(endpoint, 'PUT', { ...options, body }),

  patch: <T = unknown>(endpoint: string, body?: Record<string, unknown>, options?: RequestOptions) =>
    offlineAwareRequest<T>(endpoint, 'PATCH', { ...options, body }),

  delete: <T = unknown>(endpoint: string, options?: RequestOptions) =>
    offlineAwareRequest<T>(endpoint, 'DELETE', options),
};

export default api;
