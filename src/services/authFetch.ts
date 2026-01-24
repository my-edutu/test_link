/**
 * Authenticated API Client
 * Provides a wrapper for making authenticated API calls to the NestJS backend.
 * Automatically includes the Supabase JWT token in the Authorization header.
 */

import Constants from 'expo-constants';
import { supabase } from '../supabaseClient';

// API Configuration
const API_BASE_URL = Constants.expoConfig?.extra?.API_URL || 'http://localhost:3000';

/**
 * Options for authenticated fetch requests
 */
interface AuthFetchOptions extends RequestInit {
    requireAuth?: boolean; // Default true - set to false for public endpoints
}

/**
 * Get the current user's JWT access token from Supabase
 */
async function getAccessToken(): Promise<string | null> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        return session?.access_token || null;
    } catch (error) {
        console.error('Failed to get access token:', error);
        return null;
    }
}

/**
 * Make an authenticated fetch request to the API.
 * Automatically includes the JWT token in the Authorization header.
 * 
 * @param endpoint - The API endpoint (e.g., '/monetization/validate')
 * @param options - Fetch options including method, body, etc.
 * @returns The response from the API
 * @throws Error if the request fails or authentication is required but no token is available
 */
export async function authFetch(
    endpoint: string,
    options: AuthFetchOptions = {}
): Promise<Response> {
    const { requireAuth = true, headers = {}, ...restOptions } = options;

    // Build the full URL
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;

    // Get the access token
    const accessToken = await getAccessToken();

    // Prepare headers
    const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers as Record<string, string>,
    };

    // Add Authorization header if token is available
    if (accessToken) {
        requestHeaders['Authorization'] = `Bearer ${accessToken}`;
    } else if (requireAuth) {
        throw new Error('Authentication required. Please log in.');
    }

    // Also include x-user-id for backward compatibility during migration
    // This can be removed once the backend fully transitions to JWT
    if (accessToken) {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.id) {
                requestHeaders['x-user-id'] = user.id;
            }
        } catch {
            // Ignore errors getting user ID for legacy header
        }
    }

    return fetch(url, {
        ...restOptions,
        headers: requestHeaders,
    });
}

/**
 * Get the current user ID, or throw if not authenticated
 */
export async function getCurrentUserId(): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user?.id) {
        throw new Error('User not authenticated');
    }
    return user.id;
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
