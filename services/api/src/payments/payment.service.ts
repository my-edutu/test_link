
import { Injectable, Inject, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';
import { EncryptionService } from '../common/encryption.service';
import { ExchangeRateService } from '../common/exchange-rate.service';

export const WITHDRAWAL_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
} as const;

export const TRANSACTION_TYPES = {
    TOP_UP: 'top_up',
    WITHDRAWAL: 'withdrawal',
    EARNING: 'earning',
    REFUND: 'refund',
    FUND_LOCK: 'fund_lock',
    FUND_UNLOCK: 'fund_unlock',
} as const;

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly minWithdrawal: number = 5.0; // Minimum $5 withdrawal
    private readonly dailyWithdrawalLimit: number = 10.0; // Per day limit requested by user

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private configService: ConfigService,
        private encryptionService: EncryptionService,
        private exchangeRateService: ExchangeRateService,
    ) { }

    /**
     * Check if user has exceeded their daily withdrawal limit.
     */
    private async checkDailyWithdrawalLimit(userId: string, amount: number, tx: any): Promise<void> {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Sum up withdrawal requests created today (excluding failed ones)
        // We check 'payout_requests' table as it tracks the new flow
        const result = await tx.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
            FROM payout_requests
            WHERE user_id = ${userId}
            AND created_at >= ${today}
            AND status NOT IN ('failed', 'refunded')
        `);

        // Also check legacy withdrawals table just in case
        const legacyResult = await tx.execute(sql`
            SELECT COALESCE(SUM(CAST(amount AS DECIMAL)), 0) as total
            FROM withdrawals
            WHERE user_id = ${userId}
            AND created_at >= ${today}
            AND status NOT IN ('failed', 'refunded')
        `);

        const dailyTotal = parseFloat((result[0] as any).total || '0') +
            parseFloat((legacyResult[0] as any).total || '0');

        if (dailyTotal + amount > this.dailyWithdrawalLimit) {
            throw new BadRequestException(
                `Daily withdrawal limit of $${this.dailyWithdrawalLimit} exceeded. ` +
                `You have already requested $${dailyTotal.toFixed(2)} today. ` +
                `Remaining: $${Math.max(0, this.dailyWithdrawalLimit - dailyTotal).toFixed(2)}`
            );
        }
    }

    /**
     * Initialize a Paystack transaction for top-up.
     */
    async initializeTopUp(userId: string, amount: number, email: string) {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY is not configured');
        }

        // Get live exchange rate
        const rate = await this.exchangeRateService.getUsdToNgnRate();

        // Convert to kobo
        const amountKobo = await this.exchangeRateService.usdToKobo(amount);

        try {
            const response = await fetch('https://api.paystack.co/transaction/initialize', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email,
                    amount: amountKobo,
                    metadata: {
                        user_id: userId,
                        usd_amount: amount, // Store original USD amount
                        exchange_rate: rate, // Store rate used
                        custom_fields: [
                            {
                                display_name: "User ID",
                                variable_name: "user_id",
                                value: userId
                            }
                        ]
                    },
                    callback_url: this.configService.get<string>('PAYMENT_CALLBACK_URL') || 'https://lingualink-app.com/payment/callback',
                    channels: ['card', 'bank', 'ussd', 'qr', 'mobile_money', 'bank_transfer']
                }),
            });

            const data = await response.json();

            if (!data.status) {
                throw new Error(data.message || 'Paystack initialization failed');
            }

            return data.data; // { authorization_url, access_code, reference }
        } catch (error) {
            this.logger.error(`Paystack initialization error: ${error}`);
            throw new BadRequestException('Failed to initialize payment gateway');
        }
    }

    /**
     * Credit a user's balance after a successful top-up.
     * Uses database transaction for atomicity and includes idempotency check.
     */
    async creditTopUp(
        userId: string,
        amount: number,
        reference: string,
        currency: string,
    ): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                // 1. Idempotency check - has this reference already been processed?
                const existingTx = await tx
                    .select()
                    .from(schema.transactions)
                    .where(eq(schema.transactions.referenceId, reference))
                    .limit(1);

                if (existingTx.length > 0) {
                    this.logger.warn(`Duplicate top-up attempt blocked: ${reference}`);
                    return; // Already processed, skip
                }

                // 2. Update balance atomically within transaction
                await tx.execute(sql`
                    UPDATE profiles
                    SET balance = COALESCE(balance, 0) + ${amount},
                        updated_at = now()
                    WHERE id = ${userId}
                `);

                // 3. Log transaction - guaranteed to commit with balance update
                await tx.insert(schema.transactions).values({
                    userId,
                    amount: amount.toString(),
                    type: TRANSACTION_TYPES.TOP_UP,
                    description: `Top-up via ${currency}`,
                    referenceId: reference,
                });

                this.logger.log(`[TX] Credited ${amount} to ${userId} (ref: ${reference})`);
            });
        } catch (error) {
            this.logger.error(`[TX FAILED] creditTopUp for ${userId}, ref: ${reference}: ${error}`);
            throw error;
        }
    }

    /**
     * Initiate a withdrawal request (Legacy).
     * Now includes daily limits and encryption.
     */
    async requestWithdrawal(
        userId: string,
        amount: number,
        bankCode: string,
        accountNumber: string,
        accountName: string,
    ): Promise<{ withdrawalId: string; reference: string }> {
        // 1. Validate minimum amount
        if (amount < this.minWithdrawal) {
            throw new BadRequestException(`Minimum withdrawal is $${this.minWithdrawal}`);
        }

        try {
            return await this.db.transaction(async (tx) => {
                // 2. Check Daily Limit (New)
                await this.checkDailyWithdrawalLimit(userId, amount, tx);

                // 3. Lock user row and check balance
                const lockResult = await tx.execute(sql`
                    SELECT id, balance
                    FROM profiles
                    WHERE id = ${userId}
                    FOR UPDATE
                `);

                const profile = lockResult[0] as { id: string; balance: string } | undefined;

                if (!profile) {
                    throw new BadRequestException('User profile not found');
                }

                const currentBalance = parseFloat(profile.balance || '0');
                if (currentBalance < amount) {
                    throw new BadRequestException(`Insufficient balance. Available: $${currentBalance.toFixed(2)}`);
                }

                // 4. Generate unique reference
                const reference = `WD-${userId.substring(0, 8)}-${Date.now()}`;

                // 5. Encrypt account number (New)
                const encryptedAccountNumber = this.encryptionService.encrypt(accountNumber);
                const maskedAccountNumber = this.encryptionService.maskAccountNumber(accountNumber);

                // 6. Deduct balance atomically
                await tx.execute(sql`
                    UPDATE profiles
                    SET balance = balance - ${amount},
                        updated_at = now()
                    WHERE id = ${userId}
                `);

                // 7. Create withdrawal record with encrypted data
                const [withdrawal] = await tx
                    .insert(schema.withdrawals)
                    .values({
                        userId,
                        amount: amount.toString(),
                        bankCode,
                        accountNumber: maskedAccountNumber, // Store masked only
                        encryptedAccountNumber: encryptedAccountNumber, // Store encrypted full
                        accountName,
                        status: WITHDRAWAL_STATUS.PENDING,
                        reference,
                    })
                    .returning({ id: schema.withdrawals.id });

                // 8. Log transaction
                await tx.insert(schema.transactions).values({
                    userId,
                    amount: (-amount).toString(),
                    type: TRANSACTION_TYPES.WITHDRAWAL,
                    description: `Withdrawal request to ${bankCode} - ${maskedAccountNumber}`,
                    referenceId: withdrawal.id,
                });

                this.logger.log(`[TX] Withdrawal initiated: ${reference} - $${amount}`);

                return {
                    withdrawalId: withdrawal.id,
                    reference,
                };
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[TX FAILED] requestWithdrawal for ${userId}: ${error}`);
            throw error;
        }
    }

    /**
     * Request a withdrawal with idempotency key and fund locking.
     * Now includes daily limits and encryption.
     */
    async requestWithdrawalWithLocking(
        userId: string,
        amount: number,
        bankCode: string,
        accountNumber: string,
        accountName: string,
        idempotencyKey: string,
    ): Promise<{ payoutRequestId: string; reference: string; status: string }> {
        try {
            return await this.db.transaction(async (tx) => {
                // 1. Check for existing request (Idempotency)
                const existingRequest = await tx
                    .select()
                    .from(schema.payoutRequests)
                    .where(eq(schema.payoutRequests.idempotencyKey, idempotencyKey))
                    .limit(1);

                if (existingRequest.length > 0) {
                    this.logger.log(`Returning existing payout request: ${idempotencyKey}`);
                    return {
                        payoutRequestId: existingRequest[0].id,
                        reference: existingRequest[0].paystackReference || idempotencyKey,
                        status: existingRequest[0].status || 'pending',
                    };
                }

                // 2. Validate minimum amount
                if (amount < this.minWithdrawal) {
                    throw new BadRequestException(`Minimum withdrawal is $${this.minWithdrawal}`);
                }

                // 3. Check Daily Limit (New)
                await this.checkDailyWithdrawalLimit(userId, amount, tx);

                // 4. Lock row and check balance
                const lockResult = await tx.execute(sql`
                    SELECT id, balance, pending_balance
                    FROM profiles
                    WHERE id = ${userId}
                    FOR UPDATE
                `);

                const profile = lockResult[0] as { id: string; balance: string; pending_balance: string } | undefined;

                if (!profile) {
                    throw new BadRequestException('User profile not found');
                }

                const currentBalance = parseFloat(profile.balance || '0');
                const availableBalance = currentBalance;

                if (availableBalance < amount) {
                    throw new BadRequestException(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
                }

                // 5. Generate reference
                const reference = `WD-${userId.substring(0, 8)}-${Date.now()}`;

                // 6. Encrypt account number (New)
                const encryptedAccountNumber = this.encryptionService.encrypt(accountNumber);
                const maskedAccountNumber = this.encryptionService.maskAccountNumber(accountNumber);

                // 7. Lock funds
                await tx.execute(sql`
                    UPDATE profiles
                    SET balance = balance - ${amount},
                        pending_balance = COALESCE(pending_balance, 0) + ${amount},
                        updated_at = now()
                    WHERE id = ${userId}
                `);

                // 8. Create payout request with encrypted data
                const [payoutRequest] = await tx
                    .insert(schema.payoutRequests)
                    .values({
                        userId,
                        idempotencyKey,
                        amount: amount.toString(),
                        bankCode,
                        accountNumber: maskedAccountNumber,
                        encryptedAccountNumber: encryptedAccountNumber,
                        accountName,
                        status: WITHDRAWAL_STATUS.PENDING,
                        paystackReference: reference,
                        lockedAmount: amount.toString(),
                    })
                    .returning({ id: schema.payoutRequests.id });

                // 9. Log fund lock transaction
                await tx.insert(schema.transactions).values({
                    userId,
                    amount: (-amount).toString(),
                    type: TRANSACTION_TYPES.FUND_LOCK,
                    description: `Funds locked for withdrawal request`,
                    referenceId: payoutRequest.id,
                });

                this.logger.log(`[TX] Withdrawal initiated with fund lock: ${reference} - $${amount}`);

                return {
                    payoutRequestId: payoutRequest.id,
                    reference,
                    status: WITHDRAWAL_STATUS.PENDING,
                };
            });
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`[TX FAILED] requestWithdrawalWithLocking for ${userId}: ${error}`);
            throw error;
        }
    }

    /**
     * Mark a withdrawal as complete (called from webhook).
     */
    async markWithdrawalComplete(reference: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                const result = await tx
                    .update(schema.withdrawals)
                    .set({
                        status: WITHDRAWAL_STATUS.COMPLETED,
                        completedAt: new Date(),
                    })
                    .where(eq(schema.withdrawals.reference, reference))
                    .returning({ id: schema.withdrawals.id });

                if (result.length === 0) {
                    this.logger.warn(`Withdrawal not found for completion: ${reference}`);
                    return;
                }

                this.logger.log(`[TX] Withdrawal completed: ${reference}`);
            });
        } catch (error) {
            this.logger.error(`[TX FAILED] markWithdrawalComplete for ${reference}: ${error}`);
            throw error;
        }
    }

    /**
     * Mark a withdrawal as failed (called from webhook).
     * Refunds the user's balance within a database transaction.
     */
    async markWithdrawalFailed(reference: string, reason: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                const withdrawals = await tx
                    .select()
                    .from(schema.withdrawals)
                    .where(eq(schema.withdrawals.reference, reference))
                    .limit(1);

                const withdrawal = withdrawals[0];

                if (!withdrawal) {
                    this.logger.warn(`Withdrawal not found for failure: ${reference}`);
                    return;
                }

                if (withdrawal.status === WITHDRAWAL_STATUS.FAILED ||
                    withdrawal.status === WITHDRAWAL_STATUS.REFUNDED) {
                    this.logger.warn(`Withdrawal ${reference} already marked as ${withdrawal.status}`);
                    return;
                }

                await tx
                    .update(schema.withdrawals)
                    .set({
                        status: WITHDRAWAL_STATUS.FAILED,
                        failureReason: reason,
                    })
                    .where(eq(schema.withdrawals.reference, reference));

                const amount = parseFloat(withdrawal.amount);
                await tx.execute(sql`
                    UPDATE profiles
                    SET balance = balance + ${amount},
                        updated_at = now()
                    WHERE id = ${withdrawal.userId}
                `);

                await tx.insert(schema.transactions).values({
                    userId: withdrawal.userId,
                    amount: amount.toString(),
                    type: TRANSACTION_TYPES.REFUND,
                    description: `Withdrawal refund - ${reason}`,
                    referenceId: withdrawal.id,
                });

                this.logger.log(`[TX] Withdrawal failed and refunded: ${reference} - $${amount}`);
            });
        } catch (error) {
            this.logger.error(`[TX FAILED] markWithdrawalFailed for ${reference}: ${error}`);
            throw error;
        }
    }

    /**
     * Complete a payout request (called from webhook on transfer.success).
     */
    async completePayoutRequest(reference: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                const payoutRequests = await tx
                    .select()
                    .from(schema.payoutRequests)
                    .where(eq(schema.payoutRequests.paystackReference, reference))
                    .limit(1);

                const payoutRequest = payoutRequests[0];

                if (!payoutRequest) {
                    this.logger.log(`Payout request not found, trying legacy withdrawals: ${reference}`);
                    await this.markWithdrawalComplete(reference);
                    return;
                }

                if (payoutRequest.status === WITHDRAWAL_STATUS.COMPLETED) {
                    this.logger.warn(`Payout request ${reference} already completed`);
                    return;
                }

                const lockedAmount = parseFloat(payoutRequest.lockedAmount || '0');

                await tx
                    .update(schema.payoutRequests)
                    .set({
                        status: WITHDRAWAL_STATUS.COMPLETED,
                        completedAt: new Date(),
                    })
                    .where(eq(schema.payoutRequests.id, payoutRequest.id));

                await tx.execute(sql`
                    UPDATE profiles
                    SET pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${lockedAmount}),
                        updated_at = now()
                    WHERE id = ${payoutRequest.userId}
                `);

                this.logger.log(`[TX] Payout completed: ${reference} - $${lockedAmount}`);
            });
        } catch (error) {
            this.logger.error(`[TX FAILED] completePayoutRequest for ${reference}: ${error}`);
            throw error;
        }
    }

    /**
     * Fail a payout request (called from webhook on transfer.failed).
     */
    async failPayoutRequest(reference: string, reason: string): Promise<void> {
        try {
            await this.db.transaction(async (tx) => {
                const payoutRequests = await tx
                    .select()
                    .from(schema.payoutRequests)
                    .where(eq(schema.payoutRequests.paystackReference, reference))
                    .limit(1);

                const payoutRequest = payoutRequests[0];

                if (!payoutRequest) {
                    this.logger.log(`Payout request not found, trying legacy withdrawals: ${reference}`);
                    await this.markWithdrawalFailed(reference, reason);
                    return;
                }

                if (payoutRequest.status === WITHDRAWAL_STATUS.FAILED ||
                    payoutRequest.status === WITHDRAWAL_STATUS.REFUNDED) {
                    this.logger.warn(`Payout request ${reference} already marked as ${payoutRequest.status}`);
                    return;
                }

                const lockedAmount = parseFloat(payoutRequest.lockedAmount || '0');

                await tx
                    .update(schema.payoutRequests)
                    .set({
                        status: WITHDRAWAL_STATUS.FAILED,
                        failureReason: reason,
                    })
                    .where(eq(schema.payoutRequests.id, payoutRequest.id));

                await tx.execute(sql`
                    UPDATE profiles
                    SET balance = balance + ${lockedAmount},
                        pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${lockedAmount}),
                        updated_at = now()
                    WHERE id = ${payoutRequest.userId}
                `);

                await tx.insert(schema.transactions).values({
                    userId: payoutRequest.userId,
                    amount: lockedAmount.toString(),
                    type: TRANSACTION_TYPES.REFUND,
                    description: `Withdrawal refund - ${reason}`,
                    referenceId: payoutRequest.id,
                });

                this.logger.log(`[TX] Payout failed and refunded: ${reference} - $${lockedAmount} - ${reason}`);
            });
        } catch (error) {
            this.logger.error(`[TX FAILED] failPayoutRequest for ${reference}: ${error}`);
            throw error;
        }
    }

    async getBalanceSummary(userId: string): Promise<{
        availableBalance: number;
        pendingBalance: number;
        totalBalance: number;
    }> {
        const [profile] = await this.db
            .select({
                balance: schema.profiles.balance,
                pendingBalance: schema.profiles.pendingBalance,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        if (!profile) {
            return { availableBalance: 0, pendingBalance: 0, totalBalance: 0 };
        }

        const availableBalance = parseFloat(profile.balance || '0');
        const pendingBalance = parseFloat(profile.pendingBalance || '0');

        return {
            availableBalance,
            pendingBalance,
            totalBalance: availableBalance + pendingBalance,
        };
    }

    async getPayoutRequests(userId: string, limit: number = 20) {
        return this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.userId, userId))
            .orderBy(sql`created_at DESC`)
            .limit(limit);
    }

    async getWithdrawals(userId: string, limit: number = 20) {
        return this.db
            .select()
            .from(schema.withdrawals)
            .where(eq(schema.withdrawals.userId, userId))
            .orderBy(sql`created_at DESC`)
            .limit(limit);
    }
}
