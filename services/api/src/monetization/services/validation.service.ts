import { Injectable, Inject, Logger, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, desc, ne, notExists, notInArray, sql } from 'drizzle-orm';
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

        // 5. Check trust score eligibility and fetch stats
        const [profile] = await this.db
            .select({
                id: schema.profiles.id,
                trustScore: schema.profiles.trustScore,
                dailyCount: schema.profiles.dailyValidationsCount,
                lastReset: schema.profiles.lastValidationReset,
                totalCount: schema.profiles.totalValidationsCount,
                activeDays: schema.profiles.activeDaysCount,
                lastActive: schema.profiles.lastActiveDate,
                interests: schema.profiles.interests,
                primaryLanguage: schema.profiles.primaryLanguage,
                verifiedDialects: schema.profiles.verifiedDialects,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, validatorId))
            .limit(1);

        if (profile && (profile.trustScore ?? 100) <= TRUST_SCORE_MIN) {
            throw new ForbiddenException(MONETIZATION_ERRORS.INSUFFICIENT_TRUST);
        }

        // 5b. Language Capability Check
        // Ensure user speaks the language of the clip
        const clipLanguage = clip[0].language;
        if (clipLanguage) {
            const userLanguages = new Set<string>();

            // Add primary language
            if (profile?.primaryLanguage) {
                userLanguages.add(profile.primaryLanguage.toLowerCase());
            }

            // Add verified dialects/languages
            if (Array.isArray(profile?.verifiedDialects)) {
                (profile.verifiedDialects as string[]).forEach(d => userLanguages.add(d.toLowerCase()));
            }

            // Add interests (self-declared languages from onboarding)
            if (Array.isArray(profile?.interests)) {
                (profile.interests as string[]).forEach(i => userLanguages.add(i.toLowerCase()));
            }

            // Check for match
            const isMatch = Array.from(userLanguages).some(userLang =>
                clipLanguage.toLowerCase().includes(userLang) ||
                userLang.includes(clipLanguage.toLowerCase())
            );

            if (!isMatch && userLanguages.size > 0) { // Only enforce if user has languages set
                throw new ForbiddenException(`You can only validate clips in languages you speak. Please add ${clipLanguage} to your profile interests.`);
            }
        }

        // 6. Insert the validation
        const [insertedValidation] = await this.db
            .insert(schema.validations)
            .values({
                voiceClipId: voiceClipId,
                validatorId: validatorId,
                isApproved: isApproved, // Ensure this maps correctly to schema boolean or text
            })
            .returning({ id: schema.validations.id });

        // 7. Update rate limiter and User Stats
        this.lastValidationTime.set(validatorId, Date.now());

        // Update User Progression Stats
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        let newDailyCount = (profile?.dailyCount || 0) + 1;
        let newActiveDays = profile?.activeDays || 0;
        let newLastActive = profile?.lastActive ? new Date(profile.lastActive) : null;

        // Check for daily reset
        if (!profile?.lastReset || new Date(profile.lastReset) < startOfToday) {
            newDailyCount = 1;
        }

        // Check for active day increment
        if (!newLastActive || newLastActive < startOfToday) {
            newActiveDays = (profile?.activeDays || 0) + 1;
            newLastActive = now;
        }

        await this.db.update(schema.profiles)
            .set({
                dailyValidationsCount: newDailyCount,
                lastValidationReset: now,
                totalValidationsCount: (profile?.totalCount || 0) + 1,
                activeDaysCount: newActiveDays,
                lastActiveDate: newLastActive
            })
            .where(eq(schema.profiles.id, validatorId));

        // 8. Increment validations_count on the clip
        await this.db
            .update(schema.voiceClips)
            .set({
                validationsCount: sql`${schema.voiceClips.validationsCount} + 1`,
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
        // 1. Get already validated IDs for this user
        const alreadyValidated = await this.db
            .select({ id: schema.validations.voiceClipId })
            .from(schema.validations)
            .where(eq(schema.validations.validatorId, userId));

        const validatedIds = alreadyValidated.map(v => v.id);

        // 2. Fetch pending clips from OTHER users
        let query = this.db
            .select()
            .from(schema.voiceClips)
            .where(
                and(
                    eq(schema.voiceClips.status, 'pending'),
                    ne(schema.voiceClips.userId, userId),
                    validatedIds.length > 0
                        ? notInArray(schema.voiceClips.id, validatedIds)
                        : sql`TRUE`
                )
            )
            .orderBy(schema.voiceClips.validationsCount)
            .limit(limit);

        return query;
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
