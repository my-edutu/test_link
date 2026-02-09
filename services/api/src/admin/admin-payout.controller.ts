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
    UseGuards,
    ForbiddenException,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AdminPayoutService } from './admin-payout.service';
import { JwtAuthGuard, AdminGuard, CurrentUser, AuthUser } from '../auth';

/**
 * DTO for processing a payout
 */
class ProcessPayoutDto {
    payoutRequestId: string;
    adminPassword: string; // Re-authentication for sensitive action
}

/**
 * DTO for setting admin password
 */
class SetAdminPasswordDto {
    currentPassword: string; // Current password (master or personal)
    newPassword: string; // New personal password (min 12 chars)
}

/**
 * DTO for bulk processing
 */
class BulkProcessPayoutDto {
    payoutRequestIds: string[];
    adminPassword: string;
}

/**
 * Admin Payout Controller
 * 
 * SECURITY MEASURES:
 * 1. All endpoints require JWT authentication
 * 2. All endpoints require AdminGuard (role check)
 * 3. Sensitive operations require admin password re-authentication
 * 4. All actions are logged to audit trail
 * 5. Rate limited to prevent abuse
 * 6. Account numbers are encrypted at rest and in transit
 */
@Controller('admin/payouts')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminPayoutController {
    private readonly logger = new Logger(AdminPayoutController.name);

    constructor(private readonly adminPayoutService: AdminPayoutService) { }

    /**
     * Get all pending payout requests
     * GET /admin/payouts/pending
     */
    @Get('pending')
    @Throttle({ default: { limit: 30, ttl: 60000 } })
    async getPendingPayouts(
        @CurrentUser() admin: AuthUser,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
    ) {
        this.logger.log(`Admin ${admin.id} fetching pending payouts`);

        // Audit log
        await this.adminPayoutService.logAuditEvent(admin.id, 'VIEW_PENDING_PAYOUTS', {});

        return this.adminPayoutService.getPendingPayouts(page, limit);
    }

    /**
     * Get payout request details including decrypted account number
     * POST /admin/payouts/:id/details (POST for password verification)
     * 
     * Requires admin password re-authentication for security
     */
    @Post(':id/details')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // Strict rate limit for sensitive data access
    async getPayoutDetails(
        @Param('id') payoutId: string,
        @CurrentUser() admin: AuthUser,
        @Body('adminPassword') adminPassword: string,
    ) {
        this.logger.log(`Admin ${admin.id} requesting full details for payout ${payoutId}`);

        // Verify admin password before revealing sensitive data
        await this.adminPayoutService.verifyAdminPassword(admin.id, adminPassword);

        // Audit log
        await this.adminPayoutService.logAuditEvent(admin.id, 'VIEW_FULL_ACCOUNT_DETAILS', { payoutId });

        return this.adminPayoutService.getPayoutDetailsWithDecryptedAccount(payoutId);
    }

    /**
     * Process a single payout (manual bank transfer confirmation)
     * POST /admin/payouts/:id/process
     */
    @Post(':id/process')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 10, ttl: 60000 } })
    async processPayout(
        @Param('id') payoutId: string,
        @CurrentUser() admin: AuthUser,
        @Body() dto: ProcessPayoutDto,
    ) {
        this.logger.log(`Admin ${admin.id} processing payout ${payoutId}`);

        // Re-authenticate admin
        await this.adminPayoutService.verifyAdminPassword(admin.id, dto.adminPassword);

        // Process payout
        const result = await this.adminPayoutService.markPayoutAsProcessed(payoutId, admin.id);

        // Audit log
        await this.adminPayoutService.logAuditEvent(admin.id, 'PROCESS_PAYOUT', {
            payoutId,
            amount: result.amount,
            userId: result.userId,
        });

        return result;
    }

    /**
     * Process a payout via Paystack Transfer API (automated bank transfer)
     * POST /admin/payouts/:id/paystack-transfer
     */
    @Post(':id/paystack-transfer')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async processViaPaystack(
        @Param('id') payoutId: string,
        @CurrentUser() admin: AuthUser,
        @Body('adminPassword') adminPassword: string,
    ) {
        this.logger.log(`Admin ${admin.id} initiating Paystack transfer for payout ${payoutId}`);

        // Re-authenticate admin
        await this.adminPayoutService.verifyAdminPassword(admin.id, adminPassword);

        // Process via Paystack
        const result = await this.adminPayoutService.processPayoutViaPaystack(payoutId, admin.id);

        // Audit log
        await this.adminPayoutService.logAuditEvent(admin.id, 'PAYSTACK_TRANSFER_INITIATED', {
            payoutId,
            reference: result.reference,
            transferCode: result.transferCode,
            amountUSD: result.amountUSD,
            amountNGN: result.amountNGN,
        });

        return result;
    }

    /**
     * Mark a payout as completed (after bank confirmation)
     * POST /admin/payouts/:id/complete
     */
    @Post(':id/complete')
    @HttpCode(HttpStatus.OK)
    async completePayout(
        @Param('id') payoutId: string,
        @CurrentUser() admin: AuthUser,
        @Body('bankReference') bankReference: string,
    ) {
        this.logger.log(`Admin ${admin.id} completing payout ${payoutId}`);

        const result = await this.adminPayoutService.markPayoutAsCompleted(payoutId, admin.id, bankReference);

        await this.adminPayoutService.logAuditEvent(admin.id, 'COMPLETE_PAYOUT', {
            payoutId,
            bankReference,
        });

        return result;
    }

    /**
     * Reject/refund a payout
     * POST /admin/payouts/:id/reject
     */
    @Post(':id/reject')
    @HttpCode(HttpStatus.OK)
    async rejectPayout(
        @Param('id') payoutId: string,
        @CurrentUser() admin: AuthUser,
        @Body('reason') reason: string,
        @Body('adminPassword') adminPassword: string,
    ) {
        this.logger.log(`Admin ${admin.id} rejecting payout ${payoutId}`);

        // Re-authenticate admin
        await this.adminPayoutService.verifyAdminPassword(admin.id, adminPassword);

        const result = await this.adminPayoutService.rejectAndRefundPayout(payoutId, admin.id, reason);

        await this.adminPayoutService.logAuditEvent(admin.id, 'REJECT_PAYOUT', {
            payoutId,
            reason,
        });

        return result;
    }

    /**
     * Get audit log for payout actions
     * GET /admin/payouts/audit-log
     */
    @Get('audit-log')
    async getAuditLog(
        @CurrentUser() admin: AuthUser,
        @Query('days') days: number = 7,
    ) {
        this.logger.log(`Admin ${admin.id} viewing audit log`);
        return this.adminPayoutService.getAuditLog(days);
    }

    /**
     * Set admin's personal password (migrate from master password)
     * POST /admin/payouts/set-password
     *
     * This allows admins to set up their own secure passwords
     * instead of using the shared master password.
     *
     * Requirements:
     * - Must verify current password (master or existing personal)
     * - New password must be at least 12 characters
     */
    @Post('set-password')
    @HttpCode(HttpStatus.OK)
    @Throttle({ default: { limit: 3, ttl: 60000 } }) // Very strict rate limit
    async setAdminPassword(
        @CurrentUser() admin: AuthUser,
        @Body() dto: SetAdminPasswordDto,
    ) {
        this.logger.log(`Admin ${admin.id} setting personal password`);

        // Verify current password first
        await this.adminPayoutService.verifyAdminPassword(admin.id, dto.currentPassword);

        // Validate new password
        if (!dto.newPassword || dto.newPassword.length < 12) {
            throw new ForbiddenException('New password must be at least 12 characters');
        }

        // Set the new password
        await this.adminPayoutService.setAdminPassword(admin.id, dto.newPassword);

        // Audit log
        await this.adminPayoutService.logAuditEvent(admin.id, 'ADMIN_PASSWORD_CHANGED', {
            timestamp: new Date().toISOString(),
        });

        return {
            success: true,
            message: 'Admin password updated successfully. Please use your new password for future actions.',
        };
    }
}
