import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { AmbassadorService } from './ambassador.service';
import { ClaimCodeDto } from './dto/claim-code.dto';
import { JwtAuthGuard, CurrentUser, Public, AuthUser } from '../auth';
import { IsString, MinLength, MaxLength } from 'class-validator';

/**
 * Validated DTO for tracking referrals
 */
class TrackReferralDto {
    @IsString()
    @MinLength(3)
    @MaxLength(20)
    code: string;
}

/**
 * Ambassador Controller
 * Handles ambassador program features.
 * All endpoints require JWT authentication except leaderboard.
 */
@Controller('ambassador')
@UseGuards(JwtAuthGuard)
export class AmbassadorController {
    constructor(private readonly ambassadorService: AmbassadorService) { }

    /**
     * Claim a vanity code for the ambassador program.
     * POST /ambassador/claim-code
     */
    @Post('claim-code')
    async claimCode(
        @CurrentUser() user: AuthUser,
        @Body() dto: ClaimCodeDto,
    ) {
        return this.ambassadorService.claimVanityCode(user.id, dto.code);
    }

    /**
     * Get ambassador stats for current user.
     * GET /ambassador/stats
     */
    @Get('stats')
    async getStats(@CurrentUser() user: AuthUser) {
        const stats = await this.ambassadorService.getStats(user.id);
        return { success: true, stats };
    }

    /**
     * Get ambassador leaderboard.
     * GET /ambassador/leaderboard
     * Public endpoint - no auth required.
     */
    @Get('leaderboard')
    @Public()
    async getLeaderboard() {
        const leaderboard = await this.ambassadorService.getLeaderboard();
        return { success: true, leaderboard };
    }

    /**
     * Track a referral.
     * POST /ambassador/referral
     */
    @Post('referral')
    async trackReferral(
        @CurrentUser() user: AuthUser,
        @Body() dto: TrackReferralDto,
    ) {
        await this.ambassadorService.trackReferral(user.id, dto.code);
        return { success: true };
    }
}
