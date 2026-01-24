import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { BadgesService } from './badges.service';
import {
    NOTIFICATION_EVENTS,
    ClipApprovedEvent,
} from '../notifications/notification.events';
import { BADGE_EVENTS, BadgeEarnedEvent } from './badge.events';

// Badge milestone thresholds
const CONTENT_CREATOR_MILESTONES = [
    { count: 1, badge: 'First Steps' },
    { count: 10, badge: 'Content Creator Bronze' },
    { count: 50, badge: 'Content Creator Silver' },
    { count: 100, badge: 'Content Creator Gold' },
];

const VALIDATOR_MILESTONES = [
    { count: 100, badge: 'Validator Bronze' },
    { count: 500, badge: 'Validator Silver' },
    { count: 1000, badge: 'Validator Gold' },
];

@Injectable()
export class BadgeAwarderService {
    private readonly logger = new Logger(BadgeAwarderService.name);

    constructor(
        private badgesService: BadgesService,
        private eventEmitter: EventEmitter2,
    ) {}

    /**
     * Handle clip approval events.
     * Check if user qualifies for Content Creator badges.
     */
    @OnEvent(NOTIFICATION_EVENTS.CLIP_APPROVED)
    async handleClipApproved(event: ClipApprovedEvent): Promise<void> {
        this.logger.log(`Checking badge eligibility for user ${event.userId} after clip approval`);

        try {
            const approvedCount = await this.badgesService.getApprovedClipsCount(event.userId);
            this.logger.debug(`User ${event.userId} has ${approvedCount} approved clips`);

            // Check each milestone
            for (const milestone of CONTENT_CREATOR_MILESTONES) {
                if (approvedCount >= milestone.count) {
                    const result = await this.badgesService.awardBadgeByName(
                        event.userId,
                        milestone.badge,
                    );

                    if (result) {
                        this.logger.log(`Awarded "${milestone.badge}" to user ${event.userId}`);
                        this.emitBadgeEarnedEvent(event.userId, result.badge);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error checking badge eligibility for clip approval:`, error);
        }
    }

    /**
     * Handle validation processed events.
     * Check if user qualifies for Validator badges.
     */
    @OnEvent('validation.processed')
    async handleValidationProcessed(event: { validatorId: string }): Promise<void> {
        this.logger.log(`Checking validator badge eligibility for user ${event.validatorId}`);

        try {
            const validationCount = await this.badgesService.getValidationsCount(event.validatorId);
            this.logger.debug(`User ${event.validatorId} has ${validationCount} validations`);

            // Check each milestone
            for (const milestone of VALIDATOR_MILESTONES) {
                if (validationCount >= milestone.count) {
                    const result = await this.badgesService.awardBadgeByName(
                        event.validatorId,
                        milestone.badge,
                    );

                    if (result) {
                        this.logger.log(`Awarded "${milestone.badge}" to user ${event.validatorId}`);
                        this.emitBadgeEarnedEvent(event.validatorId, result.badge);
                    }
                }
            }
        } catch (error) {
            this.logger.error(`Error checking badge eligibility for validation:`, error);
        }
    }

    /**
     * Emit BADGE_EARNED event for push notification.
     */
    private emitBadgeEarnedEvent(
        userId: string,
        badge: { id: string; name: string; description: string; imageUrl: string },
    ): void {
        const event: BadgeEarnedEvent = {
            userId,
            badgeId: badge.id,
            badgeName: badge.name,
            badgeDescription: badge.description,
            badgeImageUrl: badge.imageUrl,
        };

        this.eventEmitter.emit(BADGE_EVENTS.BADGE_EARNED, event);
    }
}
