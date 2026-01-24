// Badge event names
export const BADGE_EVENTS = {
    BADGE_EARNED: 'badge.earned',
} as const;

// Event payloads
export interface BadgeEarnedEvent {
    userId: string;
    badgeId: string;
    badgeName: string;
    badgeDescription: string;
    badgeImageUrl: string;
}
