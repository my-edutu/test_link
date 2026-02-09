// src/services/calling.ts
// Service for managing LiveKit 1:1 video and voice calls

import { authFetch, parseResponse } from './authFetch';
import * as Network from 'expo-network';

export interface CallTokenResponse {
  token: string;
  serverUrl: string;
}

// Custom error class for call-related errors
export class CallError extends Error {
  public code: string;
  public isRetryable: boolean;

  constructor(message: string, code: string, isRetryable: boolean = true) {
    super(message);
    this.name = 'CallError';
    this.code = code;
    this.isRetryable = isRetryable;
  }
}

// Token request configuration
const TOKEN_REQUEST_TIMEOUT = 15000; // 15 seconds
const MAX_TOKEN_RETRIES = 3;
const RETRY_DELAY_BASE = 1000; // 1 second base for exponential backoff

/**
 * Request a LiveKit token for a 1:1 call with retry logic and timeout
 * @param callId - Unique identifier for the call (can be generated from contact IDs)
 * @param userId - The current user's ID
 * @param isHost - Whether this user initiated the call (default: false)
 * @param retryCount - Current retry attempt (internal use)
 * @returns Promise with token and server URL
 */
export async function requestCallToken(
  callId: string,
  userId: string,
  isHost: boolean = false,
  retryCount: number = 0
): Promise<CallTokenResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), TOKEN_REQUEST_TIMEOUT);

  try {
    // Check network connectivity first
    const netState = await Network.getNetworkStateAsync();
    if (!netState.isConnected || !netState.isInternetReachable) {
      throw new CallError(
        'No internet connection. Please check your network.',
        'NO_NETWORK',
        false
      );
    }

    console.log(`[Calling] Requesting token for call ${callId}, attempt ${retryCount + 1}`);

    const response = await authFetch('/live/token', {
      method: 'POST',
      body: JSON.stringify({
        roomName: callId,
        participantName: userId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        throw new CallError(
          'Session expired. Please log in again.',
          'AUTH_ERROR',
          false
        );
      } else if (response.status >= 500) {
        throw new CallError(
          'Call server is temporarily unavailable.',
          'SERVER_ERROR',
          true
        );
      } else if (response.status === 404) {
        throw new CallError(
          'Call service not found.',
          'NOT_FOUND',
          false
        );
      }
    }

    const result = await parseResponse<CallTokenResponse>(response);
    console.log('[Calling] Token received successfully');
    return result;
  } catch (error: any) {
    clearTimeout(timeoutId);

    // Handle abort/timeout
    if (error.name === 'AbortError') {
      const timeoutError = new CallError(
        'Connection timed out. Retrying...',
        'TIMEOUT',
        true
      );

      // Retry on timeout
      if (retryCount < MAX_TOKEN_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        console.log(`[Calling] Timeout, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return requestCallToken(callId, userId, isHost, retryCount + 1);
      }

      throw timeoutError;
    }

    // Re-throw CallError as-is
    if (error instanceof CallError) {
      // Retry retryable errors
      if (error.isRetryable && retryCount < MAX_TOKEN_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        console.log(`[Calling] ${error.code}, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return requestCallToken(callId, userId, isHost, retryCount + 1);
      }
      throw error;
    }

    // Handle network errors
    if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
      const networkError = new CallError(
        'Could not reach call server. Please check your connection.',
        'NETWORK_ERROR',
        true
      );

      if (retryCount < MAX_TOKEN_RETRIES) {
        const delay = RETRY_DELAY_BASE * Math.pow(2, retryCount);
        console.log(`[Calling] Network error, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return requestCallToken(callId, userId, isHost, retryCount + 1);
      }

      throw networkError;
    }

    // Wrap unknown errors
    throw new CallError(
      error.message || 'Failed to connect to call server.',
      'UNKNOWN_ERROR',
      false
    );
  }
}

/**
 * Generate a unique call ID from two user IDs
 * Creates a consistent ID regardless of who initiates the call
 */
export function generateCallId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}

// ==================== Call History Functions ====================

export interface CallHistoryRecord {
  id: string;
  callId: string;
  callerId: string;
  receiverId: string;
  callType: 'video' | 'voice' | 'group';
  status: string;
  startedAt: string;
  answeredAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endReason?: string;
}

// Queue for failed call history logs to retry later
let pendingCallLogs: Array<{ type: 'start' | 'answer' | 'end'; data: any; retries: number }> = [];

/**
 * Process pending call logs (retry failed logs)
 */
async function processPendingCallLogs(): Promise<void> {
  if (pendingCallLogs.length === 0) return;

  const logsToRetry = [...pendingCallLogs];
  pendingCallLogs = [];

  for (const log of logsToRetry) {
    if (log.retries >= 3) {
      console.warn('[Calling] Dropping call log after 3 retries:', log);
      continue;
    }

    try {
      if (log.type === 'start') {
        await logCallStart(log.data.callId, log.data.receiverId, log.data.callType, log.retries + 1);
      } else if (log.type === 'answer') {
        await logCallAnswered(log.data.callId, log.retries + 1);
      } else if (log.type === 'end') {
        await logCallEnd(log.data.callId, log.data.endReason, log.retries + 1);
      }
    } catch (error) {
      console.error('[Calling] Retry failed for call log:', log, error);
    }
  }
}

// Process pending logs every 30 seconds
setInterval(processPendingCallLogs, 30000);

/**
 * Log a call start to the backend with retry
 */
export async function logCallStart(
  callId: string,
  receiverId: string,
  callType: 'video' | 'voice' | 'group',
  retryCount: number = 0
): Promise<{ success: boolean; callHistoryId?: string }> {
  try {
    const response = await authFetch('/live/call/start', {
      method: 'POST',
      body: JSON.stringify({ callId, receiverId, callType }),
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[Calling] Failed to log call start:', error);

    // Queue for retry if first attempt
    if (retryCount === 0) {
      pendingCallLogs.push({
        type: 'start',
        data: { callId, receiverId, callType },
        retries: 0,
      });
    }

    return { success: false };
  }
}

/**
 * Log a call being answered with retry
 */
export async function logCallAnswered(
  callId: string,
  retryCount: number = 0
): Promise<{ success: boolean }> {
  try {
    const response = await authFetch('/live/call/answer', {
      method: 'POST',
      body: JSON.stringify({ callId }),
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[Calling] Failed to log call answered:', error);

    if (retryCount === 0) {
      pendingCallLogs.push({
        type: 'answer',
        data: { callId },
        retries: 0,
      });
    }

    return { success: false };
  }
}

/**
 * Log a call ending with retry
 */
export async function logCallEnd(
  callId: string,
  endReason: 'completed' | 'caller_ended' | 'receiver_ended' | 'missed' | 'declined' | 'failed',
  retryCount: number = 0
): Promise<{ success: boolean }> {
  try {
    const response = await authFetch('/live/call/end', {
      method: 'POST',
      body: JSON.stringify({ callId, endReason }),
    });
    return parseResponse(response);
  } catch (error) {
    console.error('[Calling] Failed to log call end:', error);

    if (retryCount === 0) {
      pendingCallLogs.push({
        type: 'end',
        data: { callId, endReason },
        retries: 0,
      });
    }

    return { success: false };
  }
}

/**
 * Get the current user's call history with timeout
 */
export async function getCallHistory(): Promise<CallHistoryRecord[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await authFetch('/live/call/history', {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    const data = await parseResponse<{ history: CallHistoryRecord[] }>(response);
    return data.history;
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[Calling] Failed to get call history:', error);
    return [];
  }
}
