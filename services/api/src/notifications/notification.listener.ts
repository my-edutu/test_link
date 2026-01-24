import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { NotificationService } from './notification.service';
import {
    NOTIFICATION_EVENTS,
    ClipApprovedEvent,
    ClipRejectedEvent,
    RewardEarnedEvent,
    NewMessageEvent,
    NewMentionEvent,
    NewFollowerEvent,
    ValidationReceivedEvent,
    BadgeEarnedEvent,
    DEEP_LINK_SCREENS,
} from './notification.events';

@Injectable()
export class NotificationListener {
    private readonly logger = new Logger(NotificationListener.name);

    constructor(private notificationService: NotificationService) {}

    @OnEvent(NOTIFICATION_EVENTS.CLIP_APPROVED)
    async handleClipApproved(event: ClipApprovedEvent): Promise<void> {
        this.logger.log(`Clip approved event for user ${event.userId}`);

        await this.notificationService.sendToUser({
            userId: event.userId,
            title: 'Clip Approved! 🎉',
            body: event.rewardAmount
                ? `Your voice clip has been approved! You earned $${event.rewardAmount}.`
                : 'Your voice clip has been approved by the community!',
            data: {
                screen: DEEP_LINK_SCREENS.CLIP_DETAIL,
                clipId: event.clipId,
            },
            category: 'reward',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.CLIP_REJECTED)
    async handleClipRejected(event: ClipRejectedEvent): Promise<void> {
        this.logger.log(`Clip rejected event for user ${event.userId}`);

        await this.notificationService.sendToUser({
            userId: event.userId,
            title: 'Clip Not Approved',
            body: 'Your voice clip was not approved by the community. Try recording another one!',
            data: {
                screen: DEEP_LINK_SCREENS.CLIP_DETAIL,
                clipId: event.clipId,
            },
            category: 'alert',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.REWARD_EARNED)
    async handleRewardEarned(event: RewardEarnedEvent): Promise<void> {
        this.logger.log(`Reward earned event for user ${event.userId}: ${event.amount}`);

        const typeMessages: Record<string, string> = {
            validation_correct: 'for your validation',
            clip_approved: 'for your approved clip',
            royalty: 'in remix royalties',
        };

        await this.notificationService.sendToUser({
            userId: event.userId,
            title: 'Reward Earned! 💰',
            body: `You earned $${event.amount} ${typeMessages[event.type] || ''}`.trim(),
            data: {
                screen: DEEP_LINK_SCREENS.REWARD_WALLET,
            },
            category: 'reward',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.NEW_MESSAGE)
    async handleNewMessage(event: NewMessageEvent): Promise<void> {
        this.logger.log(`New message event for user ${event.recipientId}`);

        await this.notificationService.sendToUser({
            userId: event.recipientId,
            title: event.senderName,
            body: event.messagePreview.length > 100
                ? event.messagePreview.substring(0, 97) + '...'
                : event.messagePreview,
            data: {
                screen: DEEP_LINK_SCREENS.CHAT,
                conversationId: event.conversationId,
                senderId: event.senderId,
            },
            category: 'social',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.NEW_MENTION)
    async handleNewMention(event: NewMentionEvent): Promise<void> {
        this.logger.log(`New mention event for user ${event.mentionedUserId}`);

        await this.notificationService.sendToUser({
            userId: event.mentionedUserId,
            title: `${event.mentionerName} mentioned you`,
            body: event.context.length > 100
                ? event.context.substring(0, 97) + '...'
                : event.context,
            data: {
                screen: DEEP_LINK_SCREENS.CLIP_DETAIL,
                clipId: event.clipId,
            },
            category: 'social',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.NEW_FOLLOWER)
    async handleNewFollower(event: NewFollowerEvent): Promise<void> {
        this.logger.log(`New follower event for user ${event.userId}`);

        await this.notificationService.sendToUser({
            userId: event.userId,
            title: 'New Follower',
            body: `${event.followerName} started following you.`,
            data: {
                screen: DEEP_LINK_SCREENS.PROFILE,
                userId: event.followerId,
            },
            category: 'social',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.VALIDATION_RECEIVED)
    async handleValidationReceived(event: ValidationReceivedEvent): Promise<void> {
        this.logger.log(`Validation received event for user ${event.clipOwnerId}`);

        await this.notificationService.sendToUser({
            userId: event.clipOwnerId,
            title: 'New Validation',
            body: `${event.validatorName} ${event.isApproved ? 'approved' : 'reviewed'} your voice clip.`,
            data: {
                screen: DEEP_LINK_SCREENS.CLIP_DETAIL,
                clipId: event.clipId,
            },
            category: 'social',
        });
    }

    @OnEvent(NOTIFICATION_EVENTS.BADGE_EARNED)
    async handleBadgeEarned(event: BadgeEarnedEvent): Promise<void> {
        this.logger.log(`Badge earned event for user ${event.userId}: ${event.badgeName}`);

        await this.notificationService.sendToUser({
            userId: event.userId,
            title: 'New Badge Earned! 🏆',
            body: `Congratulations! You earned the "${event.badgeName}" badge!`,
            data: {
                screen: DEEP_LINK_SCREENS.BADGES,
                badgeId: event.badgeId,
            },
            category: 'reward',
        });
    }
}
