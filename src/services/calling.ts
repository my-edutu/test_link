// src/services/calling.ts
// Service for managing LiveKit 1:1 video and voice calls

const API_BASE_URL = 'http://localhost:3000';

export interface CallTokenResponse {
  token: string;
  serverUrl: string;
}

export interface RequestCallTokenParams {
  callId: string;
  userId: string;
  isHost?: boolean;
}

/**
 * Request a LiveKit token for a 1:1 call
 * @param callId - Unique identifier for the call (can be generated from contact IDs)
 * @param userId - The current user's ID
 * @param isHost - Whether this user initiated the call (default: false)
 * @returns Promise with token and server URL
 */
export async function requestCallToken(
  callId: string,
  userId: string,
  isHost: boolean = false
): Promise<CallTokenResponse> {
  const response = await fetch(`${API_BASE_URL}/live/call-token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      callId,
      participantId: userId,
      isHost,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get call token: ${response.status}`);
  }

  const data = await response.json();
  return {
    token: data.token,
    serverUrl: data.serverUrl,
  };
}

/**
 * Generate a unique call ID from two user IDs
 * Creates a consistent ID regardless of who initiates the call
 */
export function generateCallId(userId1: string, userId2: string): string {
  const sorted = [userId1, userId2].sort();
  return `${sorted[0]}_${sorted[1]}`;
}
