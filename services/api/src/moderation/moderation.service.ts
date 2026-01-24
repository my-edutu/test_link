import { Injectable, Logger, Inject, BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq, and, desc } from 'drizzle-orm';
import * as schema from '../database/schema';
import { CreateReportDto, ResolveReportDto, ReportResponseDto } from './dto/report.dto';
import {
    REPORT_STATUS,
    RESOLUTION_ACTIONS,
    REPORT_REASONS,
    ReportReason,
    ResolutionAction,
} from './moderation.constants';
import { NOTIFICATION_EVENTS } from '../notifications/notification.events';

// Moderation events for notifications
export const MODERATION_EVENTS = {
    REPORT_SUBMITTED: 'moderation.report.submitted',
    REPORT_RESOLVED: 'moderation.report.resolved',
} as const;

// Event payload interfaces
export interface ReportSubmittedEvent {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    reason: ReportReason;
    postId?: string;
}

export interface ReportResolvedEvent {
    reportId: string;
    reporterId: string;
    reportedUserId: string;
    action: ResolutionAction;
    resolverId: string;
}

@Injectable()
export class ModerationService {
    private readonly logger = new Logger(ModerationService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private eventEmitter: EventEmitter2,
    ) { }

    /**
     * Validate report reason value
     */
    private isValidReason(reason: string): reason is ReportReason {
        return Object.values(REPORT_REASONS).includes(reason as ReportReason);
    }

    /**
     * Validate resolution action value
     */
    private isValidAction(action: string): action is ResolutionAction {
        return Object.values(RESOLUTION_ACTIONS).includes(action as ResolutionAction);
    }

    /**
     * Submit a new report
     */
    async createReport(reporterId: string, dto: CreateReportDto): Promise<ReportResponseDto> {
        // Validate reason
        if (!this.isValidReason(dto.reason)) {
            throw new BadRequestException(`Invalid reason. Must be one of: ${Object.values(REPORT_REASONS).join(', ')}`);
        }

        // Prevent self-reporting
        if (reporterId === dto.reportedUserId) {
            throw new BadRequestException('You cannot report yourself');
        }

        // Check for duplicate pending reports
        const existingReport = await this.db
            .select()
            .from(schema.reports)
            .where(
                and(
                    eq(schema.reports.reporterId, reporterId),
                    eq(schema.reports.reportedUserId, dto.reportedUserId),
                    eq(schema.reports.status, REPORT_STATUS.PENDING),
                )
            )
            .limit(1);

        if (existingReport.length > 0) {
            throw new BadRequestException('You already have a pending report for this user');
        }

        const [report] = await this.db
            .insert(schema.reports)
            .values({
                reporterId,
                reportedUserId: dto.reportedUserId,
                postId: dto.postId || null,
                reason: dto.reason,
                additionalDetails: dto.additionalDetails || null,
                status: REPORT_STATUS.PENDING,
            })
            .returning();

        this.logger.log(`Report ${report.id} submitted by ${reporterId} against ${dto.reportedUserId} for ${dto.reason}`);

        // Emit event for push notification to admins
        this.eventEmitter.emit(MODERATION_EVENTS.REPORT_SUBMITTED, {
            reportId: report.id,
            reporterId,
            reportedUserId: dto.reportedUserId,
            reason: dto.reason,
            postId: dto.postId,
        } as ReportSubmittedEvent);

        return report as ReportResponseDto;
    }

    /**
     * Get pending reports (admin only)
     */
    async getPendingReports(): Promise<ReportResponseDto[]> {
        const reports = await this.db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.status, REPORT_STATUS.PENDING))
            .orderBy(desc(schema.reports.createdAt));

        return reports as ReportResponseDto[];
    }

    /**
     * Get all reports with optional status filter (admin only)
     */
    async getAllReports(status?: string): Promise<ReportResponseDto[]> {
        let query = this.db.select().from(schema.reports);

        if (status) {
            query = query.where(eq(schema.reports.status, status)) as any;
        }

        const reports = await query.orderBy(desc(schema.reports.createdAt));
        return reports as ReportResponseDto[];
    }

    /**
     * Get report by ID
     */
    async getReportById(reportId: string): Promise<ReportResponseDto | null> {
        const [report] = await this.db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.id, reportId))
            .limit(1);

        return report as ReportResponseDto | null;
    }

    /**
     * Resolve a report (admin action)
     */
    async resolveReport(
        reportId: string,
        resolverId: string,
        dto: ResolveReportDto,
    ): Promise<ReportResponseDto> {
        // Validate action
        if (!this.isValidAction(dto.action)) {
            throw new BadRequestException(`Invalid action. Must be one of: ${Object.values(RESOLUTION_ACTIONS).join(', ')}`);
        }

        // Get the report
        const existingReport = await this.getReportById(reportId);
        if (!existingReport) {
            throw new NotFoundException(`Report ${reportId} not found`);
        }

        if (existingReport.status === REPORT_STATUS.RESOLVED) {
            throw new BadRequestException('This report has already been resolved');
        }

        // Update the report
        const [updatedReport] = await this.db
            .update(schema.reports)
            .set({
                status: REPORT_STATUS.RESOLVED,
                resolutionAction: dto.action,
                resolutionNotes: dto.notes || null,
                resolverId,
                resolvedAt: new Date(),
            })
            .where(eq(schema.reports.id, reportId))
            .returning();

        this.logger.log(`Report ${reportId} resolved by ${resolverId} with action: ${dto.action}`);

        // Execute resolution action
        await this.executeResolutionAction(existingReport, dto.action);

        // Emit event for push notifications
        this.eventEmitter.emit(MODERATION_EVENTS.REPORT_RESOLVED, {
            reportId,
            reporterId: existingReport.reporterId,
            reportedUserId: existingReport.reportedUserId,
            action: dto.action,
            resolverId,
        } as ReportResolvedEvent);

        return updatedReport as ReportResponseDto;
    }

    /**
     * Execute the resolution action (hide content, warn user, ban user)
     */
    private async executeResolutionAction(report: ReportResponseDto, action: ResolutionAction): Promise<void> {
        switch (action) {
            case RESOLUTION_ACTIONS.HIDE_CONTENT:
                if (report.postId) {
                    // Mark the voice clip as hidden/rejected
                    await this.db
                        .update(schema.voiceClips)
                        .set({ status: 'rejected' })
                        .where(eq(schema.voiceClips.id, report.postId));
                    this.logger.log(`Hidden content: ${report.postId}`);
                }
                break;

            case RESOLUTION_ACTIONS.BAN_USER:
                // Update profile to indicate ban (you may want to add a 'banned' column)
                // For now, we'll set trust score to 0
                await this.db
                    .update(schema.profiles)
                    .set({ trustScore: 0 })
                    .where(eq(schema.profiles.id, report.reportedUserId));
                this.logger.log(`Banned user: ${report.reportedUserId}`);
                break;

            case RESOLUTION_ACTIONS.WARN:
                // Log the warning - could also send a push notification to the user
                this.logger.log(`Warning issued to user: ${report.reportedUserId}`);
                break;

            case RESOLUTION_ACTIONS.DISMISS:
                // No action needed for dismissal
                this.logger.log(`Report dismissed for user: ${report.reportedUserId}`);
                break;
        }
    }

    /**
     * Get reports submitted by a user
     */
    async getReportsByUser(userId: string): Promise<ReportResponseDto[]> {
        const reports = await this.db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.reporterId, userId))
            .orderBy(desc(schema.reports.createdAt));

        return reports as ReportResponseDto[];
    }

    /**
     * Get reports against a user (admin only)
     */
    async getReportsAgainstUser(userId: string): Promise<ReportResponseDto[]> {
        const reports = await this.db
            .select()
            .from(schema.reports)
            .where(eq(schema.reports.reportedUserId, userId))
            .orderBy(desc(schema.reports.createdAt));

        return reports as ReportResponseDto[];
    }
}
