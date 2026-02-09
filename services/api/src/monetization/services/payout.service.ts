import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import { REWARD_ACTIONS, TRANSACTION_TYPES } from '../constants';
import { LedgerService } from './ledger.service';

@Injectable()
export class PayoutService {
    private readonly logger = new Logger(PayoutService.name);
    private ratesCache: Map<string, number> = new Map();
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL_MS = 60000; // 1 minute cache

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private ledgerService: LedgerService,
    ) { }

    /**
     * Get the reward rate for an action type.
     * Throws error if configuration is missing.
     */
    async getRate(actionType: string): Promise<number> {
        // Check cache freshness
        if (Date.now() - this.cacheTimestamp > this.CACHE_TTL_MS) {
            await this.refreshRatesCache();
        }

        const rate = this.ratesCache.get(actionType);
        if (rate === undefined) {
            // Try one last fetch to be sure (maybe it's a new rate)
            await this.refreshRatesCache();
            const freshRate = this.ratesCache.get(actionType);
            if (freshRate === undefined) {
                this.logger.error(`CRITICAL: Missing reward rate configuration for '${actionType}'`);
                throw new Error(`Configuration Error: No reward rate defined for action '${actionType}'`);
            }
            return freshRate;
        }

        return rate;
    }

    /**
     * Refresh the rates cache from the database.
     */
    private async refreshRatesCache(): Promise<void> {
        try {
            const rates = await this.db
                .select()
                .from(schema.rewardRates)
                .where(eq(schema.rewardRates.isActive, true));

            this.ratesCache.clear();
            for (const rate of rates) {
                this.ratesCache.set(rate.actionType, parseFloat(rate.amount));
            }
            this.cacheTimestamp = Date.now();
            this.logger.debug(`Rates cache refreshed: ${this.ratesCache.size} active rates`);
        } catch (error) {
            this.logger.error('Failed to refresh rates cache', error);
        }
    }

    /**
     * Credit a validator for a correct validation.
     */
    async creditValidatorReward(
        validatorId: string,
        actionType: string,
        tx?: any
    ): Promise<number> {
        const executor = tx || this.db;

        // 1. Get base rate
        let amount = await this.getRate(actionType);

        // 2. Check user role for multipliers
        const [user] = await executor
            .select({ userRole: schema.profiles.userRole })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, validatorId))
            .limit(1);

        if (user) {
            if (user.userRole === 'validator') {
                amount = amount * 1.4; // +40% Bonus
            } else if (user.userRole === 'ambassador') {
                amount = amount * 1.5; // +50% Bonus
            }
        }

        // 3. Credit the user
        await this.ledgerService.creditUser(
            validatorId,
            amount,
            TRANSACTION_TYPES.EARNING,
            `Reward for ${actionType} (${user?.userRole || 'user'})`,
            undefined,
            executor
        );

        // Process referral kickback for validation
        // Pass the generic 'validation' category, or maybe detailed?
        await this.processReferralKickback(validatorId, amount, 'validation', executor);

        return amount;
    }

    /**
     * Credit a clip owner when their clip is approved.
     * Also checks for and credits any referrer (Ambassador Program).
     */
    async creditClipApprovalReward(
        userId: string,
        clipId: string,
        tx?: any
    ): Promise<number> {
        const executor = tx || this.db;
        const amount = await this.getRate(REWARD_ACTIONS.CLIP_APPROVED);

        // 1. Credit the user
        await this.ledgerService.creditUser(
            userId,
            amount,
            TRANSACTION_TYPES.EARNING,
            `Clip ${clipId.substring(0, 8)}... approved`,
            clipId,
            tx
        );

        // 2. Check for Ambassador/Referral
        await this.processReferralKickback(userId, amount, 'clip_approval', tx, clipId);

        return amount;
    }

    /**
     * Centralized logic to award a commission to referrers when a user earns.
     */
    private async processReferralKickback(
        userId: string,
        earningAmount: number,
        category: string,
        tx?: any,
        referenceId?: string
    ): Promise<void> {
        const executor = tx || this.db;
        try {
            const [userProfile] = await executor
                .select({ referredById: schema.profiles.referredById, username: schema.profiles.username })
                .from(schema.profiles)
                .where(eq(schema.profiles.id, userId))
                .limit(1);

            if (userProfile?.referredById) {
                // Calculate referral bonus (fixed 5% for now, can be made dynamic via reward_rates)
                const commissionRate = 0.05; // 5%
                const referralBonus = earningAmount * commissionRate;

                if (referralBonus > 0) {
                    await this.ledgerService.creditUser(
                        userProfile.referredById,
                        referralBonus,
                        TRANSACTION_TYPES.BONUS,
                        `Ambassador commission (${(commissionRate * 100).toFixed(0)}%) from @${userProfile.username}`,
                        referenceId,
                        tx
                    );

                    // Update ambassador stats
                    await executor.execute(sql`
                        UPDATE referral_stats
                        SET total_earnings = total_earnings + ${referralBonus},
                            updated_at = now()
                        WHERE ambassador_id = ${userProfile.referredById}
                    `);

                    this.logger.debug(`Awarded $${referralBonus} commission to ambassador ${userProfile.referredById}`);
                }
            }
        } catch (error) {
            this.logger.error(`Failed to process referral kickback for user ${userId}`, error);
        }
    }

    /**
     * Process remix royalties (split between remix creator and original creator).
     */
    async processRemixRoyalty(
        remixClipId: string,
        remixerId: string,
        originalOwnerId: string,
        totalReward: number,
        remixerShare: number = 0.7,
        tx?: any
    ): Promise<void> {
        const remixerAmount = totalReward * remixerShare;
        const originalAmount = totalReward * (1 - remixerShare);

        // Credit Remixer
        await this.ledgerService.creditUser(
            remixerId,
            remixerAmount,
            TRANSACTION_TYPES.EARNING,
            `Remix reward (${(remixerShare * 100).toFixed(0)}%)`,
            remixClipId,
            tx
        );

        // Credit Original Owner
        await this.ledgerService.creditUser(
            originalOwnerId,
            originalAmount,
            TRANSACTION_TYPES.EARNING,
            `Royalty from remix`,
            remixClipId,
            tx
        );

        this.logger.log(`Remix royalty processed: Remix ${remixClipId} - Creator ${remixerAmount}, Original ${originalAmount}`);
    }

    /**
     * Credit a user directly (proxy to ledger service).
     */
    async creditUser(
        userId: string,
        amount: number,
        type: string,
        description: string,
        referenceId?: string,
        tx?: any
    ): Promise<void> {
        return this.ledgerService.creditUser(userId, amount, type, description, referenceId, tx);
    }
}
