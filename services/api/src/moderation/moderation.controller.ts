import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    HttpCode,
    HttpStatus,
    Logger,
    Inject,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ModerationService } from './moderation.service';
import { CreateReportDto, ResolveReportDto } from './dto/report.dto';
import { JwtAuthGuard, AdminGuard, CurrentUser, AuthUser } from '../auth';

/**
 * Moderation Controller
 * Handles report submission and admin moderation endpoints.
 * All endpoints require JWT authentication.
 * Admin endpoints additionally require AdminGuard.
 */
@Controller('moderation')
@UseGuards(JwtAuthGuard)
export class ModerationController {
    private readonly logger = new Logger(ModerationController.name);

    constructor(private readonly moderationService: ModerationService) { }

    /**
     * Submit a new report
     * POST /moderation/report
     * Rate limited: 10 reports per minute
     */
    @Post('report')
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 per minute
    async submitReport(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateReportDto,
    ) {
        this.logger.log(`User ${user.id} submitting report against ${dto.reportedUserId}`);
        return this.moderationService.createReport(user.id, dto);
    }

    /**
     * Get user's submitted reports
     * GET /moderation/my-reports
     */
    @Get('my-reports')
    async getMyReports(@CurrentUser() user: AuthUser) {
        return this.moderationService.getReportsByUser(user.id);
    }

    // =====================================================
    // ADMIN ENDPOINTS
    // =====================================================

    /**
     * Get all pending reports (admin only)
     * GET /moderation/admin/reports
     */
    @Get('admin/reports')
    @UseGuards(AdminGuard)
    async getPendingReports(
        @CurrentUser() user: AuthUser,
        @Query('status') status?: string,
    ) {
        this.logger.log(`Admin ${user.id} fetching reports`);

        if (status) {
            return this.moderationService.getAllReports(status);
        }

        return this.moderationService.getPendingReports();
    }

    /**
     * Get a specific report by ID (admin only)
     * GET /moderation/admin/reports/:id
     */
    @Get('admin/reports/:id')
    @UseGuards(AdminGuard)
    async getReportById(
        @Param('id') reportId: string,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Admin ${user.id} viewing report ${reportId}`);
        return this.moderationService.getReportById(reportId);
    }

    /**
     * Resolve a report (admin only)
     * POST /moderation/admin/reports/:id/resolve
     */
    @Post('admin/reports/:id/resolve')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AdminGuard)
    async resolveReport(
        @Param('id') reportId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: ResolveReportDto,
    ) {
        this.logger.log(`Admin ${user.id} resolving report ${reportId} with action: ${dto.action}`);
        return this.moderationService.resolveReport(reportId, user.id, dto);
    }

    /**
     * Get reports against a specific user (admin only)
     * GET /moderation/admin/users/:userId/reports
     */
    @Get('admin/users/:userId/reports')
    @UseGuards(AdminGuard)
    async getReportsAgainstUser(
        @Param('userId') targetUserId: string,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Admin ${user.id} viewing reports against user ${targetUserId}`);
        return this.moderationService.getReportsAgainstUser(targetUserId);
    }
}
