import { ReportReason, ResolutionAction } from '../moderation.constants';

/**
 * DTO for submitting a new report
 */
export interface CreateReportDto {
    reportedUserId: string;
    postId?: string;
    reason: ReportReason;
    additionalDetails?: string;
}

/**
 * DTO for resolving a report (admin action)
 */
export interface ResolveReportDto {
    action: ResolutionAction;
    notes?: string;
}

/**
 * Response DTO for report data
 */
export interface ReportResponseDto {
    id: string;
    reporterId: string;
    reportedUserId: string;
    postId: string | null;
    reason: string;
    additionalDetails: string | null;
    status: string;
    resolutionAction: string | null;
    resolutionNotes: string | null;
    resolverId: string | null;
    createdAt: Date | null;
    resolvedAt: Date | null;
}
