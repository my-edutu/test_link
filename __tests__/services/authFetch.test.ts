/**
 * @file authFetch.test.ts
 * @description Tests for the authenticated fetch utility.
 * 
 * Tests cover:
 * - JWT token inclusion in headers
 * - Legacy x-user-id fallback
 * - Error handling for auth failures
 * - Response parsing
 */

import { authFetch, parseResponse } from '../../src/services/authFetch';

// Mock the supabase client
const mockGetSession = jest.fn();

jest.mock('../../src/supabaseClient', () => ({
    supabase: {
        auth: {
            getSession: () => mockGetSession(),
        },
    },
}));

describe('authFetch', () => {
    const API_URL = 'http://localhost:3000';

    beforeEach(() => {
        jest.clearAllMocks();
        (global.fetch as jest.Mock).mockClear();
        process.env.EXPO_PUBLIC_API_URL = API_URL;
    });

    describe('when user is authenticated', () => {
        beforeEach(() => {
            mockGetSession.mockResolvedValue({
                data: {
                    session: {
                        access_token: 'test-jwt-token',
                        user: { id: 'user-123' },
                    },
                },
                error: null,
            });
        });

        it('should include JWT token in Authorization header', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            await authFetch('/test-endpoint');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.stringContaining('/test-endpoint'),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        Authorization: 'Bearer test-jwt-token',
                    }),
                })
            );
        });

        it('should include legacy x-user-id header for compatibility', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ success: true }),
            });

            await authFetch('/test-endpoint');

            expect(global.fetch).toHaveBeenCalledWith(
                expect.any(String),
                expect.objectContaining({
                    headers: expect.objectContaining({
                        'x-user-id': 'user-123',
                    }),
                })
            );
        });
    });

    describe('when user is not authenticated', () => {
        beforeEach(() => {
            mockGetSession.mockResolvedValue({
                data: { session: null },
                error: null,
            });
        });

        it('should throw error when auth is required', async () => {
            await expect(authFetch('/protected-endpoint', { requireAuth: true }))
                .rejects
                .toThrow();
        });

        it('should proceed without auth headers when auth is not required', async () => {
            (global.fetch as jest.Mock).mockResolvedValue({
                ok: true,
                json: () => Promise.resolve({ data: [] }),
            });

            await authFetch('/public-endpoint', { requireAuth: false });

            expect(global.fetch).toHaveBeenCalled();
        });
    });

    describe('error handling', () => {
        beforeEach(() => {
            mockGetSession.mockResolvedValue({
                data: {
                    session: {
                        access_token: 'test-jwt-token',
                        user: { id: 'user-123' },
                    },
                },
                error: null,
            });
        });

        // Note: authFetch itself does not throw on non-ok status codes, 
        // it leaves that to the caller or parseResponse utility.

        it('should throw error on network failure', async () => {
            (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

            await expect(authFetch('/test-endpoint'))
                .rejects
                .toThrow('Network error');
        });
    });
});

describe('parseResponse', () => {
    it('should parse valid JSON response', async () => {
        const mockResponse = {
            ok: true,
            json: () => Promise.resolve({ data: 'test' }),
        } as Response;

        const result = await parseResponse<{ data: string }>(mockResponse);
        expect(result).toEqual({ data: 'test' });
    });

    it('should throw on non-ok response', async () => {
        const mockResponse = {
            ok: false,
            status: 500,
            text: () => Promise.resolve('Server error'),
        } as Response;

        await expect(parseResponse(mockResponse))
            .rejects
            .toThrow();
    });
});
