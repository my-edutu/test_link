import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import {
    CONSENSUS_THRESHOLD,
    TRUST_SCORE_INCREASE_CORRECT,
    TRUST_SCORE_DECREASE_WRONG,
    TRUST_SCORE_MAX,
    TRUST_SCORE_MIN,
    CLIP_STATUS,
} from '../constants';
import { PayoutService } from './payout.service';
import { NOTIFICATION_EVENTS } from '../../notifications/notification.events';

export interface ConsensusResult {
    consensusReached: boolean;
    finalDecision?: boolean; // true = approved, false = rejected
    validatorsToPay?: string[]; // IDs of validators who agreed
    outliersTopenalize?: string[]; // IDs of validators who disagreed
}

@Injectable()
export class ConsensusService {
    private readonly logger = new Logger(ConsensusService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private payoutService: PayoutService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Check if consensus has been reached for a clip.
     * If yes, trigger payouts and update clip status.
     */
    async checkConsensus(voiceClipId: string): Promise<ConsensusResult> {
        // 1. Fetch all validations for this clip
        const validations = await this.db
            .select()
            .from(schema.validations)
            .where(eq(schema.validations.voiceClipId, voiceClipId));

        if (validations.length < CONSENSUS_THRESHOLD) {
            this.logger.debug(`Clip ${voiceClipId}: Only ${validations.length} validations, need ${CONSENSUS_THRESHOLD}`);
            return { consensusReached: false };
        }

        // 2. Count approvals vs rejections
        const approvals = validations.filter(v => v.isApproved === true);
        const rejections = validations.filter(v => v.isApproved === false);

        // 3. Determine if we have consensus
        const majorityThreshold = Math.ceil(CONSENSUS_THRESHOLD / 2) + 1; // e.g., 2 out of 3

        let finalDecision: boolean | null = null;
        let validatorsToPay: string[] = [];
        let outliersTopenalize: string[] = [];

        if (approvals.length >= majorityThreshold) {
            finalDecision = true;
            validatorsToPay = approvals.map(v => v.validatorId);
            outliersTopenalize = rejections.map(v => v.validatorId);
        } else if (rejections.length >= majorityThreshold) {
            finalDecision = false;
            validatorsToPay = rejections.map(v => v.validatorId);
            outliersTopenalize = approvals.map(v => v.validatorId);
        }

        if (finalDecision === null) {
            this.logger.debug(`Clip ${voiceClipId}: No clear majority yet. A:${approvals.length} R:${rejections.length}`);
            return { consensusReached: false };
        }

        // 4. Consensus reached! Execute payout within a transaction
        this.logger.log(`Consensus reached for clip ${voiceClipId}: ${finalDecision ? 'APPROVED' : 'REJECTED'}`);

        try {
            await this.processConsensusOutcome(
                voiceClipId,
                finalDecision,
                validatorsToPay,
                outliersTopenalize,
            );
        } catch (error) {
            this.logger.error(`Failed to process consensus for ${voiceClipId}:`, error);
            throw error;
        }

        return {
            consensusReached: true,
            finalDecision,
            validatorsToPay,
            outliersTopenalize,
        };
    }

    /**
     * Process the outcome of consensus in a single database transaction.
     * All operations succeed or fail together - no partial updates.
     * 
     * - Update clip status
     * - Pay validators who agreed
     * - Pay the clip owner (if approved)
     * - Penalize outliers
     */
    private async processConsensusOutcome(
        voiceClipId: string,
        approved: boolean,
        agreers: string[],
        outliers: string[],
    ): Promise<void> {
        // Start transaction
        try {
            await this.db.execute(sql`BEGIN`);
            this.logger.debug(`Transaction started for clip ${voiceClipId}`);

            // IDEMPOTENCY CHECK: Verify clip hasn't already been processed
            const [currentClip] = await this.db
                .select({ status: schema.voiceClips.status })
                .from(schema.voiceClips)
                .where(eq(schema.voiceClips.id, voiceClipId))
                .limit(1);

            if (currentClip?.status === CLIP_STATUS.APPROVED || currentClip?.status === CLIP_STATUS.REJECTED) {
                this.logger.warn(`Clip ${voiceClipId} already processed (status: ${currentClip.status}). Skipping.`);
                await this.db.execute(sql`ROLLBACK`);
                return;
            }

            // 1. Update Clip Status
            await this.db
                .update(schema.voiceClips)
                .set({ status: approved ? CLIP_STATUS.APPROVED : CLIP_STATUS.REJECTED })
                .where(eq(schema.voiceClips.id, voiceClipId));

            // 2. Get clip details for payouts
            const [clip] = await this.db
                .select({
                    userId: schema.voiceClips.userId,
                    parentClipId: schema.voiceClips.parentClipId,
                })
                .from(schema.voiceClips)
                .where(eq(schema.voiceClips.id, voiceClipId))
                .limit(1);

            if (!clip) {
                throw new Error(`Clip ${voiceClipId} not found`);
            }

            // 3. Pay agreeing validators
            for (const validatorId of agreers) {
                await this.payoutService.creditValidatorReward(validatorId, 'validation_correct');
                await this.adjustTrustScoreInTransaction(validatorId, TRUST_SCORE_INCREASE_CORRECT);
            }

            // 4. Penalize outliers
            for (const validatorId of outliers) {
                await this.adjustTrustScoreInTransaction(validatorId, -TRUST_SCORE_DECREASE_WRONG);
            }

            // 5. If approved, pay the clip owner (and handle remix royalties)
            if (approved) {
                if (clip.parentClipId) {
                    // It's a remix - get parent owner and split royalty
                    const [parentClip] = await this.db
                        .select({ userId: schema.voiceClips.userId })
                        .from(schema.voiceClips)
                        .where(eq(schema.voiceClips.id, clip.parentClipId))
                        .limit(1);

                    if (parentClip) {
                        // 70% to remixer, 30% to original creator
                        const baseReward = await this.payoutService.getRate('clip_approved');
                        await this.payoutService.processRemixRoyalty(
                            voiceClipId,
                            clip.userId,
                            parentClip.userId,
                            baseReward,
                            0.7, // 70% to remixer
                        );

                        // Notify original creator about royalty (after commit)
                        // Store for later emission
                        this.scheduleNotification(NOTIFICATION_EVENTS.ROYALTY_RECEIVED, {
                            userId: parentClip.userId,
                            remixClipId: voiceClipId,
                            amount: (baseReward * 0.3).toFixed(2),
                        });
                    }
                } else {
                    // Regular clip - full reward to owner
                    const reward = await this.payoutService.creditClipApprovalReward(clip.userId, voiceClipId);

                    // Schedule notification for after commit
                    this.scheduleNotification(NOTIFICATION_EVENTS.CLIP_APPROVED, {
                        userId: clip.userId,
                        clipId: voiceClipId,
                        rewardAmount: reward?.toString(),
                    });
                }
            } else {
                // Clip rejected
                this.scheduleNotification(NOTIFICATION_EVENTS.CLIP_REJECTED, {
                    userId: clip.userId,
                    clipId: voiceClipId,
                });
            }

            // Commit transaction
            await this.db.execute(sql`COMMIT`);
            this.logger.log(`Transaction committed for clip ${voiceClipId}`);

            // Emit notifications after successful commit
            this.emitPendingNotifications();

        } catch (error) {
            // Rollback on any error
            this.logger.error(`Transaction failed for clip ${voiceClipId}, rolling back:`, error);
            try {
                await this.db.execute(sql`ROLLBACK`);
                this.logger.debug(`Transaction rolled back for clip ${voiceClipId}`);
            } catch (rollbackError) {
                this.logger.error(`Rollback also failed:`, rollbackError);
            }
            throw error;
        }
    }

    /**
     * Adjust a user's trust score within the current transaction.
     */
    private async adjustTrustScoreInTransaction(userId: string, delta: number): Promise<void> {
        await this.db.execute(sql`
            UPDATE profiles
            SET trust_score = LEAST(GREATEST(COALESCE(trust_score, 100) + ${delta}, ${TRUST_SCORE_MIN}), ${TRUST_SCORE_MAX}),
                updated_at = now()
            WHERE id = ${userId}
        `);
    }

    /**
     * Adjust a user's trust score, clamping to min/max bounds.
     * For use outside of transactions.
     */
    private async adjustTrustScore(userId: string, delta: number): Promise<void> {
        await this.db.execute(sql`
            UPDATE profiles
            SET trust_score = LEAST(GREATEST(COALESCE(trust_score, 100) + ${delta}, ${TRUST_SCORE_MIN}), ${TRUST_SCORE_MAX}),
                updated_at = now()
            WHERE id = ${userId}
        `);
    }

    // Pending notifications to emit after transaction commit
    private pendingNotifications: Array<{ event: string; payload: any }> = [];

    /**
     * Schedule a notification to be emitted after transaction commits.
     */
    private scheduleNotification(event: string, payload: any): void {
        this.pendingNotifications.push({ event, payload });
    }

    /**
     * Emit all pending notifications and clear the queue.
     */
    private emitPendingNotifications(): void {
        for (const { event, payload } of this.pendingNotifications) {
            this.eventEmitter.emit(event, payload);
        }
        this.pendingNotifications = [];
    }
}
