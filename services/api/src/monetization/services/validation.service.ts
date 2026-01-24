import { Injectable, Inject, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import { SubmitValidationDto, ValidationResponseDto } from '../dto/validation.dto';
import { ConsensusService } from './consensus.service';
import { PayoutService } from './payout.service';
import {
    VALIDATION_COOLDOWN_MS,
    TRUST_SCORE_MIN,
    MONETIZATION_ERRORS,
} from '../constants';

@Injectable()
export class ValidationService {
    private readonly logger = new Logger(ValidationService.name);

    // In-memory rate limiter (for MVP - use Redis in production)
    private lastValidationTime: Map<string, number> = new Map();

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private consensusService: ConsensusService,
        private payoutService: PayoutService,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Submit a new validation for a voice clip.
     */
    async submitValidation(
        validatorId: string,
        dto: SubmitValidationDto,
    ): Promise<ValidationResponseDto> {
        const { voiceClipId, isApproved, feedback } = dto;

        // 1. Rate Limiting Check
        this.checkRateLimit(validatorId);

        // 2. Fetch the clip to validate
        const clip = await this.db
            .select()
            .from(schema.voiceClips)
            .where(eq(schema.voiceClips.id, voiceClipId))
            .limit(1);

        if (clip.length === 0) {
            throw new NotFoundException(MONETIZATION_ERRORS.CLIP_NOT_FOUND);
        }

        // 3. Cannot validate your own clip
        if (clip[0].userId === validatorId) {
            throw new ForbiddenException(MONETIZATION_ERRORS.CANNOT_VALIDATE_OWN_CLIP);
        }

        // 4. Check if already validated by this user
        const existingValidation = await this.db
            .select()
            .from(schema.validations)
            .where(
                and(
                    eq(schema.validations.voiceClipId, voiceClipId),
                    eq(schema.validations.validatorId, validatorId),
                ),
            )
            .limit(1);

        if (existingValidation.length > 0) {
            throw new BadRequestException(MONETIZATION_ERRORS.ALREADY_VALIDATED);
        }

        // 5. Check trust score eligibility
        const profile = await this.db
            .select({ trustScore: schema.profiles.trustScore })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, validatorId))
            .limit(1);

        if (profile.length > 0 && (profile[0].trustScore ?? 100) <= TRUST_SCORE_MIN) {
            throw new ForbiddenException(MONETIZATION_ERRORS.INSUFFICIENT_TRUST);
        }

        // 6. Insert the validation
        const [insertedValidation] = await this.db
            .insert(schema.validations)
            .values({
                voiceClipId,
                validatorId,
                isApproved,
            })
            .returning({ id: schema.validations.id });

        // 7. Update rate limiter
        this.lastValidationTime.set(validatorId, Date.now());

        // 8. Increment validations_count on the clip
        await this.db
            .update(schema.voiceClips)
            .set({
                validationsCount: (clip[0].validationsCount ?? 0) + 1,
            })
            .where(eq(schema.voiceClips.id, voiceClipId));

        // 9. Check for consensus
        const consensusResult = await this.consensusService.checkConsensus(voiceClipId);

        // 10. Emit validation.processed event for badge checking
        this.eventEmitter.emit('validation.processed', { validatorId });

        this.logger.log(`Validation ${insertedValidation.id} submitted by ${validatorId} for clip ${voiceClipId}`);

        return {
            success: true,
            validationId: insertedValidation.id,
            message: consensusResult.consensusReached
                ? `Validation recorded! Consensus reached: ${consensusResult.finalDecision ? 'Approved' : 'Rejected'}`
                : 'Validation recorded. Waiting for more validators.',
            consensusReached: consensusResult.consensusReached,
        };
    }

    /**
     * Check rate limiting for a validator.
     */
    private checkRateLimit(validatorId: string): void {
        const lastTime = this.lastValidationTime.get(validatorId);
        if (lastTime && Date.now() - lastTime < VALIDATION_COOLDOWN_MS) {
            throw new BadRequestException(MONETIZATION_ERRORS.RATE_LIMITED);
        }
    }

    /**
     * Get the validation queue for a user (clips they haven't validated yet).
     * Returns clips ordered by least validation count first.
     */
    async getValidationQueue(userId: string, limit: number = 10) {
        // This is a simplified version. In production, use a proper query
        // that excludes user's own clips AND already validated clips.
        const clips = await this.db
            .select()
            .from(schema.voiceClips)
            .where(and(
                // Not own clips
                // Status pending
            ))
            .orderBy(schema.voiceClips.validationsCount)
            .limit(limit);

        return clips;
    }

    /**
     * Get a user's validation history.
     */
    async getValidationHistory(validatorId: string, limit: number = 20) {
        const history = await this.db
            .select()
            .from(schema.validations)
            .where(eq(schema.validations.validatorId, validatorId))
            .orderBy(desc(schema.validations.createdAt))
            .limit(limit);

        return history;
    }
}
