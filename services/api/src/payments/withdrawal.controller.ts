import {
    Controller,
    Post,
    Get,
    Body,
    Query,
    HttpCode,
    HttpStatus,
    Logger,
    BadRequestException,
    UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PaymentService } from './payment.service';
import { BankService } from './bank.service';
import { JwtAuthGuard, CurrentUser, AuthUser } from '../auth';
import * as crypto from 'crypto';

interface WithdrawalRequestDto {
    amount: number;
    bankCode: string;
    accountNumber: string;
    accountName: string;
    idempotencyKey?: string; // Client-provided key for safe retries
}

interface WithdrawalFromLinkedBankDto {
    amount: number;
    idempotencyKey?: string;
}

/**
 * Withdrawal Controller
 * Handles user withdrawal requests with fund locking.
 * All endpoints require JWT authentication.
 */
@Controller('withdrawals')
@UseGuards(JwtAuthGuard)
export class WithdrawalController {
    private readonly logger = new Logger(WithdrawalController.name);

    constructor(
        private readonly paymentService: PaymentService,
        private readonly bankService: BankService,
    ) { }

    /**
     * Request a withdrawal with explicit bank details.
     * Uses fund locking and idempotency keys.
     * POST /withdrawals
     * Rate limited: 5 requests per minute (prevent abuse)
     */
    @Post()
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 per minute
    async requestWithdrawal(
        @Body() dto: WithdrawalRequestDto,
        @CurrentUser() user: AuthUser,
    ) {
        // Generate idempotency key if not provided
        const idempotencyKey = dto.idempotencyKey ||
            `${user.id}-${dto.amount}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        this.logger.log(`Withdrawal request from ${user.id}: $${dto.amount} (key: ${idempotencyKey})`);

        const result = await this.paymentService.requestWithdrawalWithLocking(
            user.id,
            dto.amount,
            dto.bankCode,
            dto.accountNumber,
            dto.accountName,
            idempotencyKey,
        );

        return {
            success: true,
            data: {
                payoutRequestId: result.payoutRequestId,
                reference: result.reference,
                status: result.status,
                amount: dto.amount,
                message: 'Withdrawal request submitted. Funds have been locked.',
            },
        };
    }

    /**
     * Request a withdrawal using linked bank account.
     * POST /withdrawals/linked
     */
    @Post('linked')
    @HttpCode(HttpStatus.CREATED)
    @Throttle({ default: { limit: 5, ttl: 60000 } })
    async requestWithdrawalFromLinkedBank(
        @Body() dto: WithdrawalFromLinkedBankDto,
        @CurrentUser() user: AuthUser,
    ) {
        // Get linked bank details
        const linkedBank = await this.bankService.getLinkedBank(user.id);

        if (!linkedBank || !linkedBank.bankCode) {
            throw new BadRequestException('No bank account linked. Please link a bank account first.');
        }

        // Generate idempotency key if not provided
        const idempotencyKey = dto.idempotencyKey ||
            `${user.id}-${dto.amount}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

        this.logger.log(`Withdrawal from linked bank for ${user.id}: $${dto.amount}`);

        // Note: For linked bank, we need the full account number which we don't store
        // In production, you'd either store encrypted full account number or require re-entry
        throw new BadRequestException(
            'For security, please enter your full account number for each withdrawal. ' +
            'Your linked bank details are shown for convenience.'
        );
    }

    /**
     * Get user's withdrawal/payout request history.
     * GET /withdrawals
     */
    @Get()
    async getWithdrawals(
        @CurrentUser() user: AuthUser,
        @Query('limit') limit?: number,
    ) {
        const parsedLimit = limit || 20;

        // Get both legacy withdrawals and new payout requests
        const [withdrawals, payoutRequests] = await Promise.all([
            this.paymentService.getWithdrawals(user.id, parsedLimit),
            this.paymentService.getPayoutRequests(user.id, parsedLimit),
        ]);

        return {
            success: true,
            data: {
                withdrawals,
                payoutRequests,
            },
        };
    }

    /**
     * Get user's balance summary.
     * GET /withdrawals/balance
     */
    @Get('balance')
    async getBalanceSummary(@CurrentUser() user: AuthUser) {
        const summary = await this.paymentService.getBalanceSummary(user.id);

        return {
            success: true,
            data: summary,
        };
    }
}
