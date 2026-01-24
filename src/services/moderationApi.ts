/**
 * Moderation API Service
 * Client-side service for content moderation and reporting.
 */

import { API_BASE_URL } from '../config';

// Report reason types (matching backend)
export const REPORT_REASONS = {
    SPAM: 'spam',
    HARASSMENT: 'harassment',
    INAPPROPRIATE: 'inappropriate',
    OTHER: 'other',
} as const;

export type ReportReason = typeof REPORT_REASONS[keyof typeof REPORT_REASONS];

// Report status types
export const REPORT_STATUS = {
    PENDING: 'pending',
    REVIEWING: 'reviewing',
    RESOLVED: 'resolved',
    DISMISSED: 'dismissed',
} as const;

export type ReportStatus = typeof REPORT_STATUS[keyof typeof REPORT_STATUS];

// Report data interface
export interface Report {
    id: string;
    reporterId: string;
    reportedUserId: string;
    postId: string | null;
    reason: ReportReason;
    additionalDetails: string | null;
    status: ReportStatus;
    resolutionAction: string | null;
    resolutionNotes: string | null;
    resolverId: string | null;
    createdAt: string;
    resolvedAt: string | null;
}

// API Response types
interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Submit a report against a user or content.
 */
export async function submitReport(
    userId: string,
    reportedUserId: string,
    reason: ReportReason,
    postId?: string,
    additionalDetails?: string
): Promise<ApiResponse<Report>> {
    try {
        const response = await fetch(`${API_BASE_URL}/moderation/report`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-user-id': userId,
            },
            body: JSON.stringify({
                reportedUserId,
                postId,
                reason,
                additionalDetails,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.message || 'Failed to submit report',
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        console.error('Error submitting report:', error);
        return {
            success: false,
            error: error.message || 'Network error. Please try again.',
        };
    }
}

/**
 * Get reports submitted by the current user.
 */
export async function getMyReports(userId: string): Promise<ApiResponse<Report[]>> {
    try {
        const response = await fetch(`${API_BASE_URL}/moderation/my-reports`, {
            method: 'GET',
            headers: {
                'x-user-id': userId,
            },
        });

        if (!response.ok) {
            const errorData = await response.json();
            return {
                success: false,
                error: errorData.message || 'Failed to fetch reports',
            };
        }

        const data = await response.json();
        return { success: true, data };
    } catch (error: any) {
        console.error('Error fetching reports:', error);
        return {
            success: false,
            error: error.message || 'Network error. Please try again.',
        };
    }
}

/**
 * Helper function to get human-readable reason label.
 */
export function getReasonLabel(reason: ReportReason): string {
    switch (reason) {
        case REPORT_REASONS.SPAM:
            return 'Spam';
        case REPORT_REASONS.HARASSMENT:
            return 'Harassment';
        case REPORT_REASONS.INAPPROPRIATE:
            return 'Inappropriate Content';
        case REPORT_REASONS.OTHER:
            return 'Other';
        default:
            return reason;
    }
}

/**
 * Helper function to get human-readable status label.
 */
export function getStatusLabel(status: ReportStatus): string {
    switch (status) {
        case REPORT_STATUS.PENDING:
            return 'Pending Review';
        case REPORT_STATUS.REVIEWING:
            return 'Under Review';
        case REPORT_STATUS.RESOLVED:
            return 'Resolved';
        case REPORT_STATUS.DISMISSED:
            return 'Dismissed';
        default:
            return status;
    }
}
