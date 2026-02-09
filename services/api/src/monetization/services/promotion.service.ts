import { Injectable, Inject, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { eq, and, gte, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';
import { NOTIFICATION_EVENTS } from '../../notifications/notification.events';

@Injectable()
export class PromotionService {
    private readonly logger = new Logger(PromotionService.name);

    // Promotion Criteria Constants
    private readonly VALIDATOR_MIN_VALIDATIONS = 200;
    private readonly VALIDATOR_MIN_ACCURACY = 90.0;
    private readonly VALIDATOR_MIN_ACTIVE_DAYS = 10;

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Check all users and promote those eligible for validator status.
     * Should be run via cron job daily.
     */
    async checkAndPromoteEligibleUsers(): Promise<number> {
        this.logger.log('Checking for eligible validator promotions...');

        // Find users eligible for validator promotion
        // Criteria: Role = 'user', Validations >= 200, Accuracy >= 90%, Active Days >= 10
        const eligibleUsers = await this.db
            .select()
            .from(schema.profiles)
            .where(
                and(
                    eq(schema.profiles.userRole, 'user'),
                    gte(schema.profiles.totalValidationsCount, this.VALIDATOR_MIN_VALIDATIONS),
                    gte(schema.profiles.accuracyRating, this.VALIDATOR_MIN_ACCURACY.toString()),
                    gte(schema.profiles.activeDaysCount, this.VALIDATOR_MIN_ACTIVE_DAYS)
                )
            );

        if (eligibleUsers.length === 0) {
            this.logger.log('No new users eligible for promotion.');
            return 0;
        }

        this.logger.log(`Found ${eligibleUsers.length} users eligible for promotion.`);

        let promotedCount = 0;

        // Promote each eligible user
        for (const user of eligibleUsers) {
            try {
                await this.promoteToValidator(user.id);
                promotedCount++;
            } catch (error) {
                this.logger.error(`Failed to promote user ${user.id}:`, error);
            }
        }

        return promotedCount;
    }

    /**
     * promote a single user to validator status.
     */
    private async promoteToValidator(userId: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            // Update role
            await tx
                .update(schema.profiles)
                .set({
                    userRole: 'validator',
                    promotedToValidatorAt: sql`now()`,
                })
                .where(eq(schema.profiles.id, userId));

            // Schedule notification
            await tx.insert(schema.notificationOutbox).values({
                eventType: NOTIFICATION_EVENTS.USER_PROMOTED,
                payload: {
                    userId,
                    newRole: 'validator',
                    title: 'Congratulations! You\'re now a Validator 🏅',
                    body: 'You\'ve unlocked higher rewards! You can now earn +40% bonus on validations.',
                },
            });

            this.logger.log(`Promoted user ${userId} to Validator`);
        });
    }

    /**
     * Check for auto-demotion if accuracy drops below threshold.
     * Threshold: < 85% accuracy
     */
    async checkAndDemoteValidators(): Promise<number> {
        const DEMOTION_THRESHOLD = 85.0;

        const atRiskValidators = await this.db
            .select()
            .from(schema.profiles)
            .where(
                and(
                    eq(schema.profiles.userRole, 'validator'),
                    // Only check if they have significant volume to avoid noise
                    gte(schema.profiles.totalValidationsCount, this.VALIDATOR_MIN_VALIDATIONS)
                )
            );

        let demotedCount = 0;

        for (const validator of atRiskValidators) {
            if (parseFloat(validator.accuracyRating as string) < DEMOTION_THRESHOLD) {
                await this.demoteToUser(validator.id);
                demotedCount++;
            }
        }

        return demotedCount;
    }

    private async demoteToUser(userId: string): Promise<void> {
        await this.db.transaction(async (tx) => {
            await tx
                .update(schema.profiles)
                .set({
                    userRole: 'user',
                    // Reset or keep promoted_at? Let's keep it for history but role changes back
                })
                .where(eq(schema.profiles.id, userId));

            await tx.insert(schema.notificationOutbox).values({
                eventType: NOTIFICATION_EVENTS.USER_DEMOTED,
                payload: {
                    userId,
                    items: {
                        accuracy: 'below 85%'
                    },
                    title: 'Validator Status Revoked ⚠️',
                    body: 'Your accuracy rating has dropped below 85%. You have been reverted to User status. Improve your accuracy to regain Validator status.',
                },
            });

            this.logger.warn(`Demoted validator ${userId} due to low accuracy`);
        });
    }
}
