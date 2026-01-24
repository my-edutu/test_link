import {
    Controller,
    Get,
    Post,
    Put,
    Body,
    Param,
    HttpCode,
    HttpStatus,
    Logger,
    Inject,
    UseGuards,
} from '@nestjs/common';
import { eq, sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { JwtAuthGuard, AdminGuard, CurrentUser, AuthUser } from '../auth';
import { IsString, IsNumber, IsBoolean, IsOptional, Min } from 'class-validator';

/**
 * Validated DTO for creating reward rates
 */
class CreateRewardRateDto {
    @IsString()
    actionType: string;

    @IsNumber()
    @Min(0)
    amount: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/**
 * Validated DTO for updating reward rates
 */
class UpdateRewardRateDto {
    @IsOptional()
    @IsNumber()
    @Min(0)
    amount?: number;

    @IsOptional()
    @IsString()
    currency?: string;

    @IsOptional()
    @IsBoolean()
    isActive?: boolean;
}

/**
 * Admin Controller
 * Handles admin-only operations for monetization management.
 * All endpoints require both JWT authentication and admin role.
 */
@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
    private readonly logger = new Logger(AdminController.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Get all reward rates.
     * GET /admin/rates
     */
    @Get('rates')
    async getRewardRates(@CurrentUser() user: AuthUser) {
        this.logger.log(`Admin ${user.id} fetching reward rates`);

        const rates = await this.db
            .select()
            .from(schema.rewardRates)
            .orderBy(schema.rewardRates.actionType);

        return rates;
    }

    /**
     * Create a new reward rate.
     * POST /admin/rates
     */
    @Post('rates')
    @HttpCode(HttpStatus.CREATED)
    async createRewardRate(
        @CurrentUser() user: AuthUser,
        @Body() dto: CreateRewardRateDto,
    ) {
        const [created] = await this.db
            .insert(schema.rewardRates)
            .values({
                actionType: dto.actionType,
                amount: dto.amount.toString(),
                currency: dto.currency || 'USD',
                isActive: dto.isActive ?? true,
            })
            .returning();

        this.logger.log(`Reward rate created by ${user.id}: ${dto.actionType} = ${dto.amount}`);
        return created;
    }

    /**
     * Update a reward rate.
     * PUT /admin/rates/:id
     */
    @Put('rates/:id')
    async updateRewardRate(
        @Param('id') rateId: string,
        @CurrentUser() user: AuthUser,
        @Body() dto: UpdateRewardRateDto,
    ) {
        const updateData: any = {};
        if (dto.amount !== undefined) updateData.amount = dto.amount.toString();
        if (dto.currency !== undefined) updateData.currency = dto.currency;
        if (dto.isActive !== undefined) updateData.isActive = dto.isActive;

        const [updated] = await this.db
            .update(schema.rewardRates)
            .set(updateData)
            .where(eq(schema.rewardRates.id, rateId))
            .returning();

        this.logger.log(`Reward rate ${rateId} updated by ${user.id}`);
        return updated;
    }

    /**
     * Get dashboard stats for admin.
     * GET /admin/stats
     */
    @Get('stats')
    async getDashboardStats(@CurrentUser() user: AuthUser) {
        this.logger.log(`Admin ${user.id} fetching dashboard stats`);

        // Get totals from database
        const [profileStats] = await this.db.execute<any>(sql`
            SELECT 
                COALESCE(SUM(CAST(balance AS DECIMAL)), 0) as total_pending_balance,
                COALESCE(SUM(CAST(total_earned AS DECIMAL)), 0) as total_all_time_earned,
                COUNT(*) as total_users
            FROM profiles
        `);

        const [clipStats] = await this.db.execute<any>(sql`
            SELECT 
                COUNT(*) as total_clips,
                COUNT(*) FILTER (WHERE status = 'pending') as pending_clips,
                COUNT(*) FILTER (WHERE status = 'approved') as approved_clips
            FROM voice_clips
        `);

        const [validationStats] = await this.db.execute<any>(sql`
            SELECT COUNT(*) as total_validations
            FROM validations
        `);

        const [flagStats] = await this.db.execute<any>(sql`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'pending') as pending_flags
            FROM clip_flags
        `);

        return {
            finances: {
                pendingPayouts: parseFloat(profileStats?.total_pending_balance || 0),
                totalEarnings: parseFloat(profileStats?.total_all_time_earned || 0),
            },
            users: {
                total: parseInt(profileStats?.total_users || 0),
            },
            clips: {
                total: parseInt(clipStats?.total_clips || 0),
                pending: parseInt(clipStats?.pending_clips || 0),
                approved: parseInt(clipStats?.approved_clips || 0),
            },
            validations: {
                total: parseInt(validationStats?.total_validations || 0),
            },
            flags: {
                pending: parseInt(flagStats?.pending_flags || 0),
            },
        };
    }

    /**
     * Seed default reward rates (one-time setup).
     * POST /admin/rates/seed
     */
    @Post('rates/seed')
    @HttpCode(HttpStatus.OK)
    async seedDefaultRates(@CurrentUser() user: AuthUser) {
        const defaultRates = [
            { actionType: 'validation_correct', amount: '0.01', currency: 'USD' },
            { actionType: 'validation_incorrect', amount: '0.005', currency: 'USD' },
            { actionType: 'clip_approved', amount: '0.10', currency: 'USD' },
            { actionType: 'remix_royalty', amount: '0.03', currency: 'USD' },
        ];

        for (const rate of defaultRates) {
            // Upsert logic: check if exists, if not insert
            const existing = await this.db
                .select()
                .from(schema.rewardRates)
                .where(eq(schema.rewardRates.actionType, rate.actionType))
                .limit(1);

            if (existing.length === 0) {
                await this.db.insert(schema.rewardRates).values({
                    actionType: rate.actionType,
                    amount: rate.amount,
                    currency: rate.currency,
                    isActive: true,
                });
            }
        }

        this.logger.log(`Default reward rates seeded by ${user.id}`);
        return { success: true, message: 'Default rates seeded' };
    }
}
