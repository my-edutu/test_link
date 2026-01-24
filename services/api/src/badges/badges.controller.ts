import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
    NotFoundException,
    Res,
    UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { BadgesService } from './badges.service';
import { CertificateService } from './certificate.service';
import { JwtAuthGuard, AdminGuard, CurrentUser, Public, AuthUser } from '../auth';
import { IsString, IsUUID } from 'class-validator';

/**
 * Validated DTO for awarding badges
 */
class AwardBadgeDto {
    @IsString()
    @IsUUID()
    userId: string;

    @IsString()
    @IsUUID()
    badgeId: string;
}

/**
 * Badges Controller
 * Handles badge management and certificate generation.
 * Most endpoints require JWT authentication.
 */
@Controller('badges')
@UseGuards(JwtAuthGuard)
export class BadgesController {
    private readonly logger = new Logger(BadgesController.name);

    constructor(
        private readonly badgesService: BadgesService,
        private readonly certificateService: CertificateService,
    ) { }

    /**
     * Get all available badges.
     * GET /badges
     * Public endpoint - anyone can view available badges.
     */
    @Get()
    @Public()
    async getAllBadges() {
        return this.badgesService.getAllBadges();
    }

    /**
     * Get badges earned by a specific user.
     * GET /badges/user/:userId
     * Public endpoint - badges are public achievements.
     */
    @Get('user/:userId')
    @Public()
    async getUserBadges(@Param('userId') userId: string) {
        return this.badgesService.getUserBadges(userId);
    }

    /**
     * Get my badges (authenticated user).
     * GET /badges/me
     */
    @Get('me')
    async getMyBadges(@CurrentUser() user: AuthUser) {
        return this.badgesService.getUserBadges(user.id);
    }

    /**
     * Get my badge progress - shows which badges the user is close to earning.
     * GET /badges/me/progress
     */
    @Get('me/progress')
    async getMyBadgeProgress(@CurrentUser() user: AuthUser) {
        const [allBadges, userBadges, clipsCount, validationsCount] = await Promise.all([
            this.badgesService.getAllBadges(),
            this.badgesService.getUserBadges(user.id),
            this.badgesService.getApprovedClipsCount(user.id),
            this.badgesService.getValidationsCount(user.id),
        ]);

        const earnedBadgeIds = new Set(userBadges.map(b => b.id));

        const progress = allBadges
            .filter(badge => !earnedBadgeIds.has(badge.id))
            .map(badge => {
                let currentValue = 0;
                if (badge.requirementType === 'clips_approved') {
                    currentValue = clipsCount;
                } else if (badge.requirementType === 'validations_count') {
                    currentValue = validationsCount;
                }

                const targetValue = badge.requirementValue || 0;
                const percentage = targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0;

                return {
                    badge,
                    currentValue,
                    targetValue,
                    percentage,
                    isEarned: currentValue >= targetValue,
                };
            })
            .sort((a, b) => b.percentage - a.percentage);

        return {
            earned: userBadges.length,
            total: allBadges.length,
            progress,
        };
    }

    /**
     * Award a badge to a user (admin only).
     * POST /badges/award
     */
    @Post('award')
    @HttpCode(HttpStatus.CREATED)
    @UseGuards(AdminGuard)
    async awardBadge(
        @Body() dto: AwardBadgeDto,
        @CurrentUser() admin: AuthUser,
    ) {
        this.logger.log(`Admin ${admin.id} awarding badge ${dto.badgeId} to user ${dto.userId}`);

        const result = await this.badgesService.awardBadge(dto.userId, dto.badgeId);
        return {
            success: true,
            message: `Badge "${result.badge.name}" awarded successfully`,
            userBadgeId: result.userBadgeId,
            badge: result.badge,
        };
    }

    /**
     * Generate and download a PDF certificate for a badge.
     * GET /badges/:badgeId/certificate
     */
    @Get(':badgeId/certificate')
    async downloadCertificate(
        @Param('badgeId') badgeId: string,
        @CurrentUser() user: AuthUser,
        @Res() res: Response,
    ) {
        // Verify user has this badge
        const userBadges = await this.badgesService.getUserBadges(user.id);
        const userBadge = userBadges.find(b => b.id === badgeId);

        if (!userBadge) {
            throw new NotFoundException('You have not earned this badge');
        }

        this.logger.log(`Generating certificate for user ${user.id}, badge ${badgeId}`);

        const certificateUrl = await this.certificateService.generateCertificate(
            user.id,
            userBadge,
        );

        return res.json({
            success: true,
            certificateUrl,
        });
    }

    /**
     * Health check endpoint.
     * Public - no auth required.
     */
    @Get('health')
    @Public()
    healthCheck() {
        return { status: 'ok', module: 'badges', timestamp: new Date().toISOString() };
    }
}
