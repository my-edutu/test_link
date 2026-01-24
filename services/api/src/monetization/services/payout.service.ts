import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import { REWARD_ACTIONS, TRANSACTION_TYPES } from '../constants';

// Default rates if DB is empty (fallback for MVP)
const DEFAULT_RATES: Record<string, number> = {
    [REWARD_ACTIONS.VALIDATION_CORRECT]: 0.01, // $0.01 per correct validation
    [REWARD_ACTIONS.VALIDATION_INCORRECT]: 0.005, // $0.005 for flagging issues
    [REWARD_ACTIONS.CLIP_APPROVED]: 0.10, // $0.10 for approved clip
    [REWARD_ACTIONS.REMIX_ROYALTY]: 0.03, // $0.03 base royalty
};

@Injectable()
export class PayoutService {
    private readonly logger = new Logger(PayoutService.name);
    private ratesCache: Map<string, number> = new Map();
    private cacheTimestamp: number = 0;
    private readonly CACHE_TTL_MS = 60000; // 1 minute cache

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Get the reward rate for an action type.
     * Caches rates to reduce DB hits.
     */
    async getRate(actionType: string): Promise<number> {
        // Check cache freshness
        if (Date.now() - this.cacheTimestamp > this.CACHE_TTL_MS) {
            await this.refreshRatesCache();
        }

        return this.ratesCache.get(actionType) ?? DEFAULT_RATES[actionType] ?? 0;
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
            this.logger.warn('Failed to refresh rates cache, using defaults', error);
        }
    }

    /**
     * Credit a validator for a correct validation.
     */
    async creditValidatorReward(validatorId: string, actionType: string): Promise<number> {
        const amount = await this.getRate(actionType);
        if (amount <= 0) {
            this.logger.warn(`No reward configured for action: ${actionType}`);
            return 0;
        }

        await this.creditUser(validatorId, amount, TRANSACTION_TYPES.EARNING, `Reward for ${actionType}`);
        return amount;
    }

    /**
     * Credit a clip owner when their clip is approved.
     */
    async creditClipApprovalReward(userId: string, clipId: string): Promise<number> {
        const amount = await this.getRate(REWARD_ACTIONS.CLIP_APPROVED);
        if (amount <= 0) return 0;

        await this.creditUser(
            userId,
            amount,
            TRANSACTION_TYPES.EARNING,
            `Clip ${clipId.substring(0, 8)}... approved`,
            clipId,
        );
        return amount;
    }

    /**
     * Core method: Credit a user's balance and log the transaction.
     * This should ideally be wrapped in a DB transaction for atomicity.
     */
    async creditUser(
        userId: string,
        amount: number,
        type: string,
        description: string,
        referenceId?: string,
    ): Promise<void> {
        // 1. Update balance
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = COALESCE(balance, 0) + ${amount},
                total_earned = COALESCE(total_earned, 0) + ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 2. Log transaction
        await this.db.insert(schema.transactions).values({
            userId,
            amount: amount.toString(),
            type,
            description,
            referenceId: referenceId ?? null,
        });

        this.logger.log(`Credited ${amount} to user ${userId}: ${description}`);
    }

    /**
     * Process remix royalties (split between remix creator and original creator).
     * @param remixClipId The ID of the remix clip
     * @param totalReward The total reward to split
     * @param remixerShare Percentage for the remixer (e.g., 0.7 for 70%)
     */
    async processRemixRoyalty(
        remixClipId: string,
        remixerId: string,
        originalOwnerId: string,
        totalReward: number,
        remixerShare: number = 0.7,
    ): Promise<void> {
        const remixerAmount = totalReward * remixerShare;
        const originalAmount = totalReward * (1 - remixerShare);

        await this.creditUser(
            remixerId,
            remixerAmount,
            TRANSACTION_TYPES.EARNING,
            `Remix reward (${(remixerShare * 100).toFixed(0)}%)`,
            remixClipId,
        );

        await this.creditUser(
            originalOwnerId,
            originalAmount,
            TRANSACTION_TYPES.EARNING,
            `Royalty from remix`,
            remixClipId,
        );

        this.logger.log(`Remix royalty processed: Remix ${remixClipId} - Creator ${remixerAmount}, Original ${originalAmount}`);
    }
}
