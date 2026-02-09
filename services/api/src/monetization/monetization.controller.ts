import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
    Inject,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { ValidationService } from './services/validation.service';
import { DisputeService } from './services/dispute.service';
import { RemixService, CreateRemixDto } from './services/remix.service';
import { SubmitValidationDto, ValidationResponseDto } from './dto/validation.dto';
import { FlagClipDto } from './dto/flag.dto';
import { JwtAuthGuard, AdminGuard, CurrentUser, Public, AuthUser } from '../auth';

import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiBody } from '@nestjs/swagger';

/**
 * Monetization Controller
 * Handles all monetary/validation-related endpoints.
 *
 * All endpoints are protected by JWT authentication.
 * Admin endpoints additionally require the AdminGuard.
 */
@ApiTags('Monetization')
@ApiBearerAuth()
@Controller('monetization')
@UseGuards(JwtAuthGuard) // Apply JWT auth to all endpoints in this controller
export class MonetizationController {
    private readonly logger = new Logger(MonetizationController.name);

    constructor(
        private readonly validationService: ValidationService,
        private readonly disputeService: DisputeService,
        private readonly remixService: RemixService,
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Submit a validation for a voice clip.
     * POST /monetization/validate
     * Rate limited: 30 requests per minute (prevent validation spam)
     */
    @Post('validate')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 30, ttl: 60000 } }) // 30 per minute
    @ApiOperation({ summary: 'Submit a validation for a voice clip' })
    @ApiResponse({ status: 200, description: 'Validation submitted successfully', type: ValidationResponseDto })
    async submitValidation(
        @Body() dto: SubmitValidationDto,
        @CurrentUser() user: AuthUser,
    ): Promise<ValidationResponseDto> {
        this.logger.log(`Validation request from user ${user.id} for clip ${dto.voiceClipId}`);
        return this.validationService.submitValidation(user.id, dto);
    }

    /**
     * Flag a clip for admin review (Dispute Resolution).
     * POST /monetization/flag
     */
    @Post('flag')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Flag a clip for admin review' })
    @ApiResponse({ status: 200, description: 'Clip flagged successfully' })
    async flagClip(
        @Body() dto: FlagClipDto,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Flag request from user ${user.id} for clip ${dto.voiceClipId}`);
        return this.disputeService.flagClip(user.id, dto);
    }

    /**
     * Register a remix/duet clip.
     * POST /monetization/remix
     */
    @Post('remix')
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Register a remix/duet clip' })
    @ApiResponse({ status: 201, description: 'Remix created successfully' })
    async createRemix(
        @Body() dto: CreateRemixDto,
        @CurrentUser() user: AuthUser,
    ) {
        this.logger.log(`Remix request from user ${user.id} for parent ${dto.parentClipId}`);
        return this.remixService.createRemix(user.id, dto);
    }

    /**
     * Get the remix chain for a clip (ancestors).
     * GET /monetization/remix/:clipId/chain
     */
    @Get('remix/:clipId/chain')
    @ApiOperation({ summary: 'Get remix ancestry chain' })
    async getRemixChain(
        @Param('clipId') clipId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.remixService.getRemixChain(clipId);
    }

    /**
     * Get all remixes of a clip.
     * GET /monetization/remix/:clipId/children
     */
    @Get('remix/:clipId/children')
    @ApiOperation({ summary: 'Get all remixes of a clip' })
    async getRemixesOf(
        @Param('clipId') clipId: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.remixService.getRemixesOf(clipId);
    }

    /**
     * Get user's remix stats.
     * GET /monetization/remix/stats
     */
    @Get('remix/stats')
    @ApiOperation({ summary: 'Get user remix statistics' })
    async getRemixStats(@CurrentUser() user: AuthUser) {
        return this.remixService.getUserRemixStats(user.id);
    }

    /**
     * Get the validation queue for the current user.
     * GET /monetization/queue
     */
    @Get('queue')
    @ApiOperation({ summary: 'Get validation queue for current user' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getValidationQueue(
        @CurrentUser() user: AuthUser,
        @Query('limit') limit?: number,
    ) {
        const parsedLimit = limit || 10;
        return this.validationService.getValidationQueue(user.id, parsedLimit);
    }

    /**
     * Get the current user's validation history.
     * GET /monetization/history
     */
    @Get('history')
    @ApiOperation({ summary: 'Get validation history for current user' })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    async getValidationHistory(
        @CurrentUser() user: AuthUser,
        @Query('limit') limit?: number,
    ) {
        const parsedLimit = limit || 20;
        return this.validationService.getValidationHistory(user.id, parsedLimit);
    }

    /**
     * Get user's earnings summary.
     * GET /monetization/earnings
     */
    @Get('earnings')
    @ApiOperation({ summary: 'Get user earnings summary' })
    async getEarnings(@CurrentUser() user: AuthUser) {
        const profile = await this.db
            .select({
                balance: schema.profiles.balance,
                totalEarned: schema.profiles.totalEarned,
                trustScore: schema.profiles.trustScore,
                validatorTier: schema.profiles.validatorTier,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, user.id))
            .limit(1);

        if (profile.length === 0) {
            return {
                balance: 0,
                totalEarned: 0,
                trustScore: 100,
                validatorTier: 'bronze',
            };
        }

        return {
            balance: parseFloat(profile[0].balance || '0'),
            totalEarned: parseFloat(profile[0].totalEarned || '0'),
            trustScore: profile[0].trustScore ?? 100,
            validatorTier: profile[0].validatorTier ?? 'bronze',
        };
    }

    // =====================================================
    // ADMIN ENDPOINTS
    // =====================================================

    /**
     * Get pending flags for admin review.
     * GET /monetization/admin/flags
     * Requires admin role.
     */
    @Get('admin/flags')
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Get pending flags (Admin only)' })
    async getPendingFlags(
        @CurrentUser() user: AuthUser,
        @Query('limit') limit?: number,
    ) {
        const parsedLimit = limit || 50;
        this.logger.log(`Admin ${user.id} fetching pending flags`);
        return this.disputeService.getPendingFlags(parsedLimit);
    }

    /**
     * Resolve a flag (Admin only).
     * POST /monetization/admin/flags/:flagId/resolve
     * Requires admin role.
     */
    @Post('admin/flags/:flagId/resolve')
    @HttpCode(HttpStatus.OK)
    @UseGuards(AdminGuard)
    @ApiOperation({ summary: 'Resolve a flag (Admin only)' })
    async resolveFlag(
        @Param('flagId') flagId: string,
        @CurrentUser() user: AuthUser,
        @Body() body: { resolution: string; status: 'resolved' | 'dismissed' },
    ) {
        this.logger.log(`Admin ${user.id} resolving flag ${flagId}`);
        return this.disputeService.resolveFlag(
            flagId,
            user.id,
            body.resolution,
            body.status,
        );
    }

    /**
     * Health check endpoint for the monetization module.
     * Public - no auth required.
     */
    @Get('health')
    @Public()
    @ApiOperation({ summary: 'Health check' })
    healthCheck() {
        return { status: 'ok', module: 'monetization', timestamp: new Date().toISOString() };
    }
}
