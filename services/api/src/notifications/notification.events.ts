// Notification event names
export const NOTIFICATION_EVENTS = {
    CLIP_APPROVED: 'clip.approved',
    CLIP_REJECTED: 'clip.rejected',
    REWARD_EARNED: 'reward.earned',
    ROYALTY_RECEIVED: 'royalty.received',
    NEW_MESSAGE: 'message.new',
    NEW_MENTION: 'mention.new',
    NEW_FOLLOWER: 'follower.new',
    VALIDATION_RECEIVED: 'validation.received',
    // Moderation events
    REPORT_SUBMITTED: 'moderation.report.submitted',
    REPORT_RESOLVED: 'moderation.report.resolved',
    // Badge events
    BADGE_EARNED: 'badge.earned',
    // Referral events
    REFERRAL_BONUS_EARNED: 'referral.bonus.earned',
    // Like events
    LIKE_RECEIVED: 'like.received',
    // Role Progression events
    USER_PROMOTED: 'user.promoted',
    USER_DEMOTED: 'user.demoted',
} as const;

// Event payloads
export interface ClipApprovedEvent {
    userId: string;
    clipId: string;
    rewardAmount?: string;
}

export interface ClipRejectedEvent {
    userId: string;
    clipId: string;
}

export interface RewardEarnedEvent {
    userId: string;
    amount: string;
    type: 'validation_correct' | 'clip_approved' | 'royalty';
    referenceId?: string;
}

export interface NewMessageEvent {
    recipientId: string;
    senderId: string;
    senderName: string;
    messagePreview: string;
    conversationId: string;
}

export interface NewMentionEvent {
    mentionedUserId: string;
    mentionerId: string;
    mentionerName: string;
    clipId: string;
    context: string;
}

export interface NewFollowerEvent {
    userId: string;
    followerId: string;
    followerName: string;
}

export interface ValidationReceivedEvent {
    clipOwnerId: string;
    clipId: string;
    validatorName: string;
    isApproved: boolean;
}

// Moderation event payloads
export interface ReportSubmittedEvent {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    reason: 'spam' | 'harassment' | 'inappropriate' | 'other';
    postId?: string;
}

export interface ReportResolvedEvent {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    action: 'dismiss' | 'warn' | 'hide_content' | 'ban_user';
    resolverId: string;
}

// Badge event payloads
export interface BadgeEarnedEvent {
    userId: string;
    badgeId: string;
    badgeName: string;
    badgeDescription: string;
    badgeImageUrl: string;
}

export interface LikeReceivedEvent {
    userId: string; // The owner of the liked item
    senderId: string; // The user who liked
    senderName: string;
    targetId: string; // The clip/comment ID
    targetType: 'voice_clip' | 'video_clip' | 'story' | 'comment';
}

// Deep link screens
export const DEEP_LINK_SCREENS = {
    CLIP_DETAIL: 'clip',
    CHAT: 'chat',
    REWARD_WALLET: 'wallet',
    PROFILE: 'profile',
    NOTIFICATIONS: 'notifications',
    MODERATION: 'moderation',
    BADGES: 'badges',
} as const;
