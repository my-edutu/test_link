/**
 * Badges API Service
 * Provides secure communication with the badges backend endpoints.
 */

import { authFetch, parseResponse } from './authFetch';

export interface Badge {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: 'contributor' | 'validator' | 'game' | 'social';
    tier?: 'bronze' | 'silver' | 'gold';
    requirementType?: string;
    requirementValue?: number;
}

export interface UserBadge extends Badge {
    earnedAt: string;
}

export interface BadgeProgress {
    badge: Badge;
    currentValue: number;
    targetValue: number;
    percentage: number;
    isEarned: boolean;
}

export interface BadgeProgressSummary {
    earned: number;
    total: number;
    progress: BadgeProgress[];
}

class BadgesApi {
    /**
     * Get all available badges in the system.
     * Public endpoint.
     */
    async getAllBadges(): Promise<Badge[]> {
        try {
            const response = await authFetch('/badges', { requireAuth: false });
            return parseResponse<Badge[]>(response);
        } catch (error) {
            console.error('BadgesApi.getAllBadges error:', error);
            throw error;
        }
    }

    /**
     * Get badges earned by a specific user.
     * Public endpoint.
     */
    async getUserBadges(userId: string): Promise<UserBadge[]> {
        try {
            const response = await authFetch(`/badges/user/${userId}`, { requireAuth: false });
            return parseResponse<UserBadge[]>(response);
        } catch (error) {
            console.error('BadgesApi.getUserBadges error:', error);
            throw error;
        }
    }

    /**
     * Get the current authenticated user's badges.
     */
    async getMyBadges(): Promise<UserBadge[]> {
        try {
            const response = await authFetch('/badges/me');
            return parseResponse<UserBadge[]>(response);
        } catch (error) {
            console.error('BadgesApi.getMyBadges error:', error);
            throw error;
        }
    }

    /**
     * Get the current user's badge progress.
     * Shows which badges the user is close to earning.
     */
    async getMyBadgeProgress(): Promise<BadgeProgressSummary> {
        try {
            const response = await authFetch('/badges/me/progress');
            return parseResponse<BadgeProgressSummary>(response);
        } catch (error) {
            console.error('BadgesApi.getMyBadgeProgress error:', error);
            throw error;
        }
    }

    /**
     * Get a certificate URL for a badge.
     */
    async getCertificate(badgeId: string): Promise<{ certificateUrl: string }> {
        try {
            const response = await authFetch(`/badges/${badgeId}/certificate`);
            const data = await parseResponse<{ success: boolean; certificateUrl: string }>(response);
            return { certificateUrl: data.certificateUrl };
        } catch (error) {
            console.error('BadgesApi.getCertificate error:', error);
            throw error;
        }
    }
}

export const badgesApi = new BadgesApi();
