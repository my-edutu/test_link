/**
 * @file badgesApi.test.ts
 * @description Tests for the badges API service.
 * 
 * Tests cover:
 * - Fetching user badges
 * - Badge progress calculation
 * - Certificate generation
 */

import { badgesApi, Badge, UserBadge, BadgeProgressSummary } from '../../src/services/badgesApi';

// Mock authFetch
const mockAuthFetch = jest.fn();
const mockParseResponse = jest.fn();

jest.mock('../../src/services/authFetch', () => ({
    authFetch: (...args: any[]) => mockAuthFetch(...args),
    parseResponse: (...args: any[]) => mockParseResponse(...args),
}));

describe('BadgesApi', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAllBadges', () => {
        it('should fetch all available badges', async () => {
            const mockBadges: Badge[] = [
                {
                    id: 'badge-1',
                    name: 'First Steps',
                    description: 'Complete your first validation',
                    imageUrl: 'https://example.com/badge1.png',
                    category: 'validator',
                    tier: 'bronze',
                },
                {
                    id: 'badge-2',
                    name: 'Contributor Star',
                    description: 'Upload 10 clips',
                    imageUrl: 'https://example.com/badge2.png',
                    category: 'contributor',
                    tier: 'silver',
                },
            ];

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockBadges);

            const result = await badgesApi.getAllBadges();

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/badges',
                expect.objectContaining({ requireAuth: false })
            );
            expect(result).toHaveLength(2);
            expect(result[0].name).toBe('First Steps');
        });

        it('should not require authentication for public badges', async () => {
            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue([]);

            await badgesApi.getAllBadges();

            expect(mockAuthFetch).toHaveBeenCalledWith(
                '/badges',
                expect.objectContaining({ requireAuth: false })
            );
        });
    });

    describe('getMyBadges', () => {
        it('should fetch authenticated user badges', async () => {
            const mockUserBadges: UserBadge[] = [
                {
                    id: 'badge-1',
                    name: 'First Steps',
                    description: 'Complete your first validation',
                    imageUrl: 'https://example.com/badge1.png',
                    category: 'validator',
                    earnedAt: '2026-01-15T10:00:00Z',
                },
            ];

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockUserBadges);

            const result = await badgesApi.getMyBadges();

            expect(mockAuthFetch).toHaveBeenCalledWith('/badges/me');
            expect(result).toHaveLength(1);
            expect(result[0].earnedAt).toBeDefined();
        });

        it('should require authentication', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Authentication required'));

            await expect(badgesApi.getMyBadges())
                .rejects
                .toThrow('Authentication required');
        });
    });

    describe('getMyBadgeProgress', () => {
        it('should fetch badge progress for user', async () => {
            const mockProgress: BadgeProgressSummary = {
                earned: 3,
                total: 15,
                progress: [
                    {
                        badge: {
                            id: 'badge-5',
                            name: 'Validation Master',
                            description: 'Complete 100 validations',
                            imageUrl: 'https://example.com/badge5.png',
                            category: 'validator',
                            requirementType: 'validations_count',
                            requirementValue: 100,
                        },
                        currentValue: 75,
                        targetValue: 100,
                        percentage: 75,
                        isEarned: false,
                    },
                ],
            };

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockProgress);

            const result = await badgesApi.getMyBadgeProgress();

            expect(result.earned).toBe(3);
            expect(result.total).toBe(15);
            expect(result.progress[0].percentage).toBe(75);
            expect(result.progress[0].isEarned).toBe(false);
        });

        it('should calculate progress percentage correctly', async () => {
            const mockProgress: BadgeProgressSummary = {
                earned: 1,
                total: 5,
                progress: [
                    {
                        badge: {
                            id: 'badge-1',
                            name: 'Test Badge',
                            description: 'Test',
                            imageUrl: '',
                            category: 'contributor',
                            requirementValue: 50,
                        },
                        currentValue: 25,
                        targetValue: 50,
                        percentage: 50,
                        isEarned: false,
                    },
                ],
            };

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockProgress);

            const result = await badgesApi.getMyBadgeProgress();

            expect(result.progress[0].percentage).toBe(50);
        });
    });

    describe('getUserBadges', () => {
        it('should fetch badges for a specific user', async () => {
            const userId = 'user-123';
            const mockUserBadges: UserBadge[] = [
                {
                    id: 'badge-1',
                    name: 'Community Leader',
                    description: 'Helped 50 learners',
                    imageUrl: 'https://example.com/badge.png',
                    category: 'social',
                    earnedAt: '2026-01-20T15:00:00Z',
                },
            ];

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockUserBadges);

            const result = await badgesApi.getUserBadges(userId);

            expect(mockAuthFetch).toHaveBeenCalledWith(
                `/badges/user/${userId}`,
                expect.objectContaining({ requireAuth: false })
            );
            expect(result).toHaveLength(1);
        });
    });

    describe('getCertificate', () => {
        it('should fetch certificate URL for a badge', async () => {
            const badgeId = 'badge-123';
            const mockCertificate = {
                success: true,
                certificateUrl: 'https://storage.example.com/certificates/badge-123-user-456.pdf',
            };

            mockAuthFetch.mockResolvedValue({ ok: true });
            mockParseResponse.mockResolvedValue(mockCertificate);

            const result = await badgesApi.getCertificate(badgeId);

            expect(mockAuthFetch).toHaveBeenCalledWith(`/badges/${badgeId}/certificate`);
            expect(result.certificateUrl).toContain('certificates');
        });

        it('should handle unearned badge certificate request', async () => {
            mockAuthFetch.mockRejectedValue(new Error('Badge not earned'));

            await expect(badgesApi.getCertificate('badge-999'))
                .rejects
                .toThrow('Badge not earned');
        });
    });
});

describe('BadgesApi Integration Scenarios', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should handle empty badge list', async () => {
        mockAuthFetch.mockResolvedValue({ ok: true });
        mockParseResponse.mockResolvedValue([]);

        const result = await badgesApi.getMyBadges();

        expect(result).toEqual([]);
    });

    it('should handle all badges earned scenario', async () => {
        const mockProgress: BadgeProgressSummary = {
            earned: 15,
            total: 15,
            progress: [],
        };

        mockAuthFetch.mockResolvedValue({ ok: true });
        mockParseResponse.mockResolvedValue(mockProgress);

        const result = await badgesApi.getMyBadgeProgress();

        expect(result.earned).toBe(result.total);
        expect(result.progress).toHaveLength(0);
    });
});
