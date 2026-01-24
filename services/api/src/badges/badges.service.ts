import { Injectable, Inject, Logger, NotFoundException, ConflictException } from '@nestjs/common';
import { eq, and, count } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

export type BadgeTier = 'bronze' | 'silver' | 'gold';

export interface BadgeDto {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    tier?: BadgeTier;
    requirementType?: string;
    requirementValue?: number;
    criteria?: Record<string, any>;
}

export interface UserBadgeDto {
    id: string;
    name: string;
    description: string;
    imageUrl: string;
    category: string;
    tier?: BadgeTier;
    earnedAt: Date;
}

@Injectable()
export class BadgesService {
    private readonly logger = new Logger(BadgesService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) {}

    /**
     * Get all available badges in the system.
     */
    async getAllBadges(): Promise<BadgeDto[]> {
        const badges = await this.db
            .select()
            .from(schema.badges)
            .orderBy(schema.badges.name);

        return badges.map(badge => ({
            id: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl,
            category: badge.category,
            tier: badge.tier as BadgeTier | undefined,
            requirementType: badge.requirementType ?? undefined,
            requirementValue: badge.requirementValue ?? undefined,
            criteria: badge.criteria as Record<string, any> | undefined,
        }));
    }

    /**
     * Get a specific badge by ID.
     */
    async getBadgeById(badgeId: string): Promise<BadgeDto | null> {
        const [badge] = await this.db
            .select()
            .from(schema.badges)
            .where(eq(schema.badges.id, badgeId))
            .limit(1);

        if (!badge) return null;

        return {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl,
            category: badge.category,
            tier: badge.tier as BadgeTier | undefined,
            requirementType: badge.requirementType ?? undefined,
            requirementValue: badge.requirementValue ?? undefined,
            criteria: badge.criteria as Record<string, any> | undefined,
        };
    }

    /**
     * Get a badge by name (used for awarding).
     */
    async getBadgeByName(name: string): Promise<BadgeDto | null> {
        const [badge] = await this.db
            .select()
            .from(schema.badges)
            .where(eq(schema.badges.name, name))
            .limit(1);

        if (!badge) return null;

        return {
            id: badge.id,
            name: badge.name,
            description: badge.description,
            imageUrl: badge.imageUrl,
            category: badge.category,
            tier: badge.tier as BadgeTier | undefined,
            requirementType: badge.requirementType ?? undefined,
            requirementValue: badge.requirementValue ?? undefined,
            criteria: badge.criteria as Record<string, any> | undefined,
        };
    }

    /**
     * Get all badges earned by a specific user.
     */
    async getUserBadges(userId: string): Promise<UserBadgeDto[]> {
        const userBadges = await this.db
            .select({
                id: schema.badges.id,
                name: schema.badges.name,
                description: schema.badges.description,
                imageUrl: schema.badges.imageUrl,
                category: schema.badges.category,
                tier: schema.badges.tier,
                earnedAt: schema.userBadges.earnedAt,
            })
            .from(schema.userBadges)
            .innerJoin(schema.badges, eq(schema.userBadges.badgeId, schema.badges.id))
            .where(eq(schema.userBadges.userId, userId))
            .orderBy(schema.userBadges.earnedAt);

        return userBadges.map(ub => ({
            id: ub.id,
            name: ub.name,
            description: ub.description,
            imageUrl: ub.imageUrl,
            category: ub.category,
            tier: ub.tier as BadgeTier | undefined,
            earnedAt: ub.earnedAt!,
        }));
    }

    /**
     * Check if a user already has a specific badge.
     */
    async userHasBadge(userId: string, badgeId: string): Promise<boolean> {
        const [existing] = await this.db
            .select({ id: schema.userBadges.id })
            .from(schema.userBadges)
            .where(
                and(
                    eq(schema.userBadges.userId, userId),
                    eq(schema.userBadges.badgeId, badgeId),
                ),
            )
            .limit(1);

        return !!existing;
    }

    /**
     * Award a badge to a user. Returns the user badge record.
     * Throws if badge doesn't exist or user already has it.
     */
    async awardBadge(
        userId: string,
        badgeId: string,
    ): Promise<{ userBadgeId: string; badge: BadgeDto }> {
        // Check badge exists
        const badge = await this.getBadgeById(badgeId);
        if (!badge) {
            throw new NotFoundException(`Badge with ID ${badgeId} not found`);
        }

        // Check user doesn't already have it
        const alreadyHas = await this.userHasBadge(userId, badgeId);
        if (alreadyHas) {
            throw new ConflictException(`User ${userId} already has badge ${badge.name}`);
        }

        // Award the badge
        const [userBadge] = await this.db
            .insert(schema.userBadges)
            .values({
                userId,
                badgeId,
            })
            .returning({ id: schema.userBadges.id });

        this.logger.log(`Awarded badge "${badge.name}" to user ${userId}`);

        return {
            userBadgeId: userBadge.id,
            badge,
        };
    }

    /**
     * Award a badge by name. Useful for event handlers.
     */
    async awardBadgeByName(
        userId: string,
        badgeName: string,
    ): Promise<{ userBadgeId: string; badge: BadgeDto } | null> {
        const badge = await this.getBadgeByName(badgeName);
        if (!badge) {
            this.logger.warn(`Badge "${badgeName}" not found, cannot award`);
            return null;
        }

        // Check if user already has it
        const alreadyHas = await this.userHasBadge(userId, badge.id);
        if (alreadyHas) {
            this.logger.debug(`User ${userId} already has badge "${badgeName}"`);
            return null;
        }

        return this.awardBadge(userId, badge.id);
    }

    /**
     * Get count of approved clips for a user.
     */
    async getApprovedClipsCount(userId: string): Promise<number> {
        const [result] = await this.db
            .select({ count: count() })
            .from(schema.voiceClips)
            .where(
                and(
                    eq(schema.voiceClips.userId, userId),
                    eq(schema.voiceClips.status, 'approved'),
                ),
            );

        return result?.count ?? 0;
    }

    /**
     * Get count of validations submitted by a user.
     */
    async getValidationsCount(userId: string): Promise<number> {
        const [result] = await this.db
            .select({ count: count() })
            .from(schema.validations)
            .where(eq(schema.validations.validatorId, userId));

        return result?.count ?? 0;
    }
}
