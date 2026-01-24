/**
 * Moderation Constants
 * Defines report reasons, status values, and resolution actions.
 */

// Report reason types
export const REPORT_REASONS = {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    INAPPROPRIATE: 'inappropriate',
    OTHER: 'other',
} as const;

export type ReportReason = typeof REPORT_REASONS[keyof typeof REPORT_REASONS];

// Report status values
export const REPORT_STATUS = {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// Resolution actions
export const RESOLUTION_ACTIONS = {
    DISMISS: 'dismiss',
    WARN: 'warn',
    HIDE_CONTENT: 'hide_content',
    BAN_USER: 'ban_user',
} as const;

export type ResolutionAction = typeof RESOLUTION_ACTIONS[keyof typeof RESOLUTION_ACTIONS];
