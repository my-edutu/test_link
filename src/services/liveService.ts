import { authFetch, parseResponse } from './authFetch';

export interface LiveStream {
    id: string;
    title: string;
    viewerCount: string;
    streamerId: string;
    username: string | null;
    avatarUrl: string | null;
}

// Custom error class for live streaming errors
export class LiveStreamError extends Error {
    public code: string;
    public isRetryable: boolean;

    constructor(message: string, code: string, isRetryable: boolean = true) {
        super(message);
        this.name = 'LiveStreamError';
        this.code = code;
        this.isRetryable = isRetryable;
    }
}

class LiveService {
    /**
     * Get a token to join a room
     * Includes timeout and better error classification
     */
    async getJoinToken(roomName: string, participantName: string): Promise<{ token: string, serverUrl: string }> {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout

        try {
            const response = await authFetch('/live/token', {
                method: 'POST',
                body: JSON.stringify({ roomName, participantName }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                // Classify errors by status code
                if (response.status === 401 || response.status === 403) {
                    throw new LiveStreamError(
                        'Authentication required. Please log in again.',
                        'AUTH_ERROR',
                        false
                    );
                } else if (response.status >= 500) {
                    throw new LiveStreamError(
                        'Server is temporarily unavailable.',
                        'SERVER_ERROR',
                        true
                    );
                } else if (response.status === 404) {
                    throw new LiveStreamError(
                        'Live streaming service not found.',
                        'NOT_FOUND',
                        false
                    );
                }
            }

            return parseResponse<{ token: string, serverUrl: string }>(response);
        } catch (error: any) {
            clearTimeout(timeoutId);

            // Handle abort/timeout
            if (error.name === 'AbortError') {
                throw new LiveStreamError(
                    'Request timed out. Please check your connection.',
                    'TIMEOUT',
                    true
                );
            }

            // Handle network errors
            if (error.message?.includes('Network request failed') || error.message?.includes('fetch')) {
                throw new LiveStreamError(
                    'Could not reach server. Please check your internet connection.',
                    'NETWORK_ERROR',
                    true
                );
            }

            // Re-throw LiveStreamError as-is
            if (error instanceof LiveStreamError) {
                throw error;
            }

            // Wrap other errors
            throw new LiveStreamError(
                error.message || 'Failed to connect to live streaming server.',
                'UNKNOWN_ERROR',
                true
            );
        }
    }

    /**
     * Start a new stream
     */
    async startStream(title: string, language?: string): Promise<{ roomId: string }> {
        const response = await authFetch('/live/start', {
            method: 'POST',
            body: JSON.stringify({ title, language: language || 'English' }),
        });
        return parseResponse<{ roomId: string }>(response);
    }

    /**
     * End a stream
     */
    async endStream(roomId: string): Promise<void> {
        await authFetch('/live/end', {
            method: 'POST',
            body: JSON.stringify({ roomId }),
        });
    }

    /**
     * Get all active streams (public endpoint)
     */
    async getActiveStreams(): Promise<LiveStream[]> {
        const response = await authFetch('/live/discover');
        return parseResponse<LiveStream[]>(response);
    }
}

export const liveService = new LiveService();
