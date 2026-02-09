/**
 * Authenticated API Client
 * Provides a wrapper for making authenticated API calls to the NestJS backend.
 * Uses Clerk for authentication tokens.
 */

import Constants from 'expo-constants';

import { API_BASE_URL } from '../config';

// const API_BASE_URL = getBaseUrl();

/**
 * Options for authenticated fetch requests
 */
interface AuthFetchOptions extends RequestInit {
    requireAuth?: boolean; // Default true - set to false for public endpoints
}

// Clerk token getter - set by AuthProvider when user signs in
let _getClerkToken: (() => Promise<string | null>) | null = null;
let _clerkUserId: string | null = null;

/**
 * Called by AuthProvider to set the Clerk token getter function
 */
export function setAuthTokenProvider(
    getToken: () => Promise<string | null>,
    userId: string | null
) {
    _getClerkToken = getToken;
    _clerkUserId = userId;
}

/**
 * Make an authenticated fetch request to the API.
 * Automatically includes the Clerk JWT token in the Authorization header.
 */
export async function authFetch(
    endpoint: string,
    options: AuthFetchOptions = {}
): Promise<Response> {
    const { requireAuth = true, headers = {}, ...restOptions } = options;

    // Build the full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    // Get token from Clerk
    let accessToken: string | null = null;
    if (_getClerkToken) {
        try {
            accessToken = await _getClerkToken();
        } catch (e) {
            console.warn('Failed to get Clerk token:', e);
        }
    }

    // Prepare headers
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers as Record<string, string>,
    };

    // Add Authorization header if token is available
    if (accessToken) {
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
        if (_clerkUserId) {
            requestHeaders['x-user-id'] = _clerkUserId;
        }
    } else if (requireAuth) {
        throw new Error('Authentication required. Please log in.');
    }

    return fetch(url, {
        ...restOptions,
        headers: requestHeaders,
    });
}

/**
 * Get the current Clerk user ID, or throw if not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
    if (!_clerkUserId) {
        throw new Error('User not authenticated');
    }
    return _clerkUserId;
}

/**
 * Get the current Clerk user ID, or null if not authenticated.
 * Useful for non-hook utility modules that previously relied on `supabase.auth.getUser()`.
 */
export function getOptionalCurrentUserId(): string | null {
    return _clerkUserId;
}

/**
 * Parse JSON response, handling errors appropriately
 */
export async function parseResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
        let errorMessage = 'Request failed';
        try {
            const errorData = await response.json();
            errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
            errorMessage = response.statusText || errorMessage;
        }
        throw new Error(errorMessage);
    }
    return response.json();
}

export { API_BASE_URL };
