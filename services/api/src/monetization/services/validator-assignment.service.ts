import { Injectable, Inject, Logger } from '@nestjs/common';
import { eq, and, ne, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';

@Injectable()
export class ValidatorAssignmentService {
    private readonly logger = new Logger(ValidatorAssignmentService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Assigns 3 validators to a new voice clip based on:
     * 1. Dialect/Language Match (Mandatory, or fallback to similar)
     * 2. Load Balancing (Prioritize validators with fewer assignments today)
     * 3. Reputation (Weighted random selection favoring high-accuracy validators)
     */
    async assignValidators(
        clipId: string,
        dialect: string, // Language/Dialect code e.g. 'yo', 'ig'
        clipUserId: string
    ): Promise<string[]> {
        this.logger.log(`Assigning validators for clip ${clipId} (Dialect: ${dialect})`);

        // 1. Get all validators who speak this dialect
        // We use JSON containment operator @> to check if dialect is in verified_dialects array
        const availableValidators = await this.db
            .select()
            .from(schema.profiles)
            .where(
                and(
                    eq(schema.profiles.userRole, 'validator'),
                    sql`${schema.profiles.verifiedDialects}::jsonb @> ${JSON.stringify([dialect])}::jsonb`,
                    ne(schema.profiles.id, clipUserId) // Can't validate own clip
                )
            );

        let candidates = availableValidators;

        // Fallback: If < 3 dialect-specific validators, expand search to all validators
        if (candidates.length < 3) {
            this.logger.warn(`Not enough validators for dialect ${dialect}. Falling back to general pool.`);
            const fallbackValidators = await this.db
                .select()
                .from(schema.profiles)
                .where(
                    and(
                        eq(schema.profiles.userRole, 'validator'),
                        ne(schema.profiles.id, clipUserId)
                    )
                );
            candidates = fallbackValidators;
        }

        if (candidates.length === 0) {
            this.logger.error('No validators available in the system!');
            return [];
        }

        // 2. Load balance: get validation count for each validator today
        const validatorsWithMetrics = await Promise.all(
            candidates.map(async (validator) => {
                const [todayStats] = await this.db
                    .select({ count: sql<number>`count(*)` })
                    .from(schema.validations)
                    .where(
                        and(
                            eq(schema.validations.validatorId, validator.id),
                            sql`created_at > current_date`
                        )
                    );

                return {
                    ...validator,
                    todayLoad: Number(todayStats?.count || 0),
                    // Ensure numeric conversion for safe math
                    accuracy: Number(validator.accuracyRating || 0),
                    trust: Number(validator.trustScore || 0)
                };
            })
        );

        // 3. Reputation-weighted scoring
        // Score = (Accuracy * Trust) / (TodayLoad + 1)
        // This favors high-quality validators who aren't overloaded
        const scoredCandidates = validatorsWithMetrics.map(v => ({
            id: v.id,
            score: (v.accuracy * v.trust) / (v.todayLoad + 1)
        }));

        // Sort by score descending
        scoredCandidates.sort((a, b) => b.score - a.score);

        // Select top 3 unique validators
        const selectedValidatorIds = scoredCandidates
            .slice(0, 3)
            .map(v => v.id);

        this.logger.log(`Selected validators: ${selectedValidatorIds.join(', ')}`);

        // 4. Create validation queue entries
        if (selectedValidatorIds.length > 0) {
            await this.db.insert(schema.validationQueue).values(
                selectedValidatorIds.map(validatorId => ({
                    voiceClipId: clipId,
                    validatorId: validatorId,
                    status: 'pending',
                    priority: 1 // Default priority
                }))
            );
            this.logger.log(`Created ${selectedValidatorIds.length} validation queue entries.`);
        }

        return selectedValidatorIds;
    }
}
