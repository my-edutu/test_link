import { Injectable, Inject, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { eq, desc, and, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { PayoutService } from '../monetization/services/payout.service';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';
import { ClaimCodeDto } from './dto/claim-code.dto';

const REFERRAL_BONUS_AMOUNT = 0.50; // $0.50 per referral conversion

@Injectable()
export class AmbassadorService {
    private readonly logger = new Logger(AmbassadorService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private payoutService: PayoutService,
    ) { }

    async claimVanityCode(userId: string, dto: ClaimCodeDto) {
        const { code } = dto;

        // Check availability
        const existing = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.vanityCode, code),
        });

        if (existing) {
            throw new BadRequestException('Code is already taken');
        }

        // Check if user already has a code
        const user = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId),
        });

        if (user?.vanityCode) {
            throw new BadRequestException('You already have a referral code');
        }

        // Update profile
        await this.db
            .update(schema.profiles)
            .set({
                vanityCode: code,
                isAmbassador: true,
                updatedAt: new Date(),
            })
            .where(eq(schema.profiles.id, userId));

        // Initialize stats
        await this.db.insert(schema.referralStats).values({
            ambassadorId: userId,
        });

        return { success: true, code };
    }

    async getStats(userId: string) {
        const stats = await this.db.query.referralStats.findFirst({
            where: eq(schema.referralStats.ambassadorId, userId),
        });

        return stats || { totalReferrals: 0, totalConversions: 0, totalEarnings: 0 };
    }

    async getLeaderboard() {
        return this.db.query.referralStats.findMany({
            orderBy: [desc(schema.referralStats.totalConversions), desc(schema.referralStats.totalEarnings)],
            limit: 10,
            with: {
                // We don't have relation defined in schema.ts properly yet for 'with', doing manual join or separate fetch might be needed if dorelations not set.
                // Assuming simple query for now. Ideally we want ambassador name.
                // Let's rely on client to fetch user details or add join here.
            }
        });

        // Since we didn't define relations in schema.ts (just tables), we use raw join or select.
        // Let's generic select with join logic simulation for now via raw query or separate lookups if needed.
        // For MVP, returning the stats and IDs is okay, frontend can fetch names.
        // Better: join with profiles.

        /*
        const fullStats = await this.db.select({
            ambassadorId: schema.referralStats.ambassadorId,
            totalReferrals: schema.referralStats.totalReferrals,
            totalConversions: schema.referralStats.totalConversions,
            totalEarnings: schema.referralStats.totalEarnings,
            username: schema.profiles.username,
            avatarUrl: schema.profiles.avatarUrl,
        })
        .from(schema.referralStats)
        .leftJoin(schema.profiles, eq(schema.referralStats.ambassadorId, schema.profiles.id))
        .orderBy(desc(schema.referralStats.totalConversions))
        .limit(10);
        
        return fullStats;
        */
    }

    @OnEvent(NOTIFICATION_EVENTS.CLIP_APPROVED)
    async handleClipApproved(payload: { userId: string, clipId: string }) {
        const { userId, clipId } = payload;
        this.logger.log(`Checking referral bonus for user ${userId} (clip ${clipId})`);

        // 1. Get user to see if they were referred
        const user = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.id, userId),
            columns: { referredById: true },
        });

        if (!user?.referredById) return;

        // 2. Check if this is their first approved clip
        // We can count approved clips. If count == 1, this is the first one.
        // Or checks if we already paid a bonus for them (could track in separate table, but keeping it simple).
        const approvedClipsCount = await this.db.select({ count: sql<number>`count(*)` })
            .from(schema.voiceClips)
            .where(and(
                eq(schema.voiceClips.userId, userId),
                eq(schema.voiceClips.status, 'approved')
            ));

        const count = Number(approvedClipsCount[0].count);

        // If count is exactly 1, it means this implies the first approval just happened (or happened previously).
        // Since this event fires ON approval, count should include it.
        if (count === 1) {
            await this.awardReferralBonus(user.referredById, userId);
        }
    }

    private async awardReferralBonus(ambassadorId: string, referredUserId: string) {
        this.logger.log(`Awarding referral bonus to ${ambassadorId} for referring ${referredUserId}`);

        // Credit ambassador
        await this.payoutService.creditUser(
            ambassadorId,
            REFERRAL_BONUS_AMOUNT,
            'earning',
            'Referral Bonus',
            `ref_bonus_${referredUserId}`
        );

        // Update stats
        await this.db.execute(sql`
            UPDATE referral_stats
            SET total_conversions = total_conversions + 1,
                total_earnings = total_earnings + ${REFERRAL_BONUS_AMOUNT},
                updated_at = now()
            WHERE ambassador_id = ${ambassadorId}
        `);
    }

    // Called when a new user signs up with a code
    async trackReferral(newUserId: string, referralCode: string) {
        // Find ambassador
        const ambassador = await this.db.query.profiles.findFirst({
            where: eq(schema.profiles.vanityCode, referralCode),
        });

        if (ambassador) {
            // Link users
            await this.db.update(schema.profiles)
                .set({ referredById: ambassador.id })
                .where(eq(schema.profiles.id, newUserId));

            // Update stats (increment total referrals)
            // Check if stats row exists first
            const stats = await this.db.query.referralStats.findFirst({
                where: eq(schema.referralStats.ambassadorId, ambassador.id)
            });

            if (!stats) {
                await this.db.insert(schema.referralStats).values({
                    ambassadorId: ambassador.id,
                    totalReferrals: 1
                });
            } else {
                await this.db.execute(sql`
                    UPDATE referral_stats
                    SET total_referrals = total_referrals + 1,
                        updated_at = now()
                    WHERE ambassador_id = ${ambassador.id}
                `);
            }
        }
    }
}
