
import { Injectable, Inject, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

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

// Default exchange rate (fallback)
const DEFAULT_USD_TO_NGN_RATE = 1500;

@Injectable()
export class PaymentService {
    private readonly logger = new Logger(PaymentService.name);
    private readonly minWithdrawal: number = 5.0; // Minimum $5 withdrawal

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private configService: ConfigService,
    ) { }

    /**
     * Get the current USD to NGN exchange rate.
     * Uses environment variable or fallback.
     * 
     * TODO: For live rates, integrate with an exchange rate API:
     * - https://exchangerate.host/
     * - https://openexchangerates.org/
     * - https://fixer.io/
     * 
     * Example integration:
     * const apiKey = this.configService.get('CURRENCY_API_KEY');
     * const response = await fetch(`https://api.exchangerate.host/latest?base=USD&symbols=NGN&access_key=${apiKey}`);
     * return response.json().rates.NGN;
     */
    private getUsdToNgnRate(): number {
        const configuredRate = this.configService.get<number>('USD_TO_NGN_RATE');
        const rate = configuredRate || DEFAULT_USD_TO_NGN_RATE;

        if (!configuredRate) {
            this.logger.warn(`Using default USD to NGN rate: ${DEFAULT_USD_TO_NGN_RATE}. Set USD_TO_NGN_RATE in environment.`);
        }

        return rate;
    }

    /**
     * Convert USD to kobo (smallest NGN currency unit).
     * 1 NGN = 100 kobo
     */
    private usdToKobo(amountUsd: number): number {
        const exchangeRate = this.getUsdToNgnRate();
        const amountNgn = amountUsd * exchangeRate;
        const amountKobo = Math.round(amountNgn * 100);

        this.logger.debug(`Currency conversion: $${amountUsd} USD = ${amountKobo} kobo (rate: ${exchangeRate})`);

        return amountKobo;
    }

    /**
     * Initialize a Paystack transaction for top-up.
     */
    async initializeTopUp(userId: string, amount: number, email: string) {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY is not configured');
        }

        // Convert USD to kobo using configurable exchange rate
        const amountKobo = this.usdToKobo(amount);

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
                        exchange_rate: this.getUsdToNgnRate(), // Store rate used
                        custom_fields: [
                            {
                                display_name: "User ID",
                                variable_name: "user_id",
                                value: userId
                            }
                        ]
                    },
                    callback_url: 'https://lingualink-app.com/payment/callback', // Deep link or web callback
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
     * Includes idempotency check to prevent double-crediting.
     */
    async creditTopUp(
        userId: string,
        amount: number,
        reference: string,
        currency: string,
    ): Promise<void> {
        // 1. Idempotency check - has this reference already been processed?
        const existingTx = await this.db
            .select()
            .from(schema.transactions)
            .where(eq(schema.transactions.referenceId, reference))
            .limit(1);

        if (existingTx.length > 0) {
            this.logger.warn(`Duplicate top-up attempt: ${reference}`);
            return; // Already processed, skip
        }

        // 2. Update balance atomically
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = COALESCE(balance, 0) + ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 3. Log transaction
        await this.db.insert(schema.transactions).values({
            userId,
            amount: amount.toString(),
            type: TRANSACTION_TYPES.TOP_UP,
            description: `Top-up via ${currency}`,
            referenceId: reference,
        });

        this.logger.log(`Credited ${amount} to ${userId} (ref: ${reference})`);
    }

    /**
     * Initiate a withdrawal request.
     * Validates balance and creates a pending withdrawal.
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

        // 2. Check balance
        const profile = await this.db
            .select({ balance: schema.profiles.balance })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        if (profile.length === 0) {
            throw new BadRequestException('User profile not found');
        }

        const currentBalance = parseFloat(profile[0].balance || '0');
        if (currentBalance < amount) {
            throw new BadRequestException('Insufficient balance');
        }

        // 3. Generate unique reference
        const reference = `WD-${userId.substring(0, 8)}-${Date.now()}`;

        // 4. Deduct balance immediately (hold funds)
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = balance - ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 5. Create pending withdrawal record
        const [withdrawal] = await this.db
            .insert(schema.withdrawals)
            .values({
                userId,
                amount: amount.toString(),
                bankCode,
                accountNumber,
                accountName,
                status: WITHDRAWAL_STATUS.PENDING,
                reference,
            })
            .returning({ id: schema.withdrawals.id });

        // 6. Log transaction
        await this.db.insert(schema.transactions).values({
            userId,
            amount: (-amount).toString(),
            type: TRANSACTION_TYPES.WITHDRAWAL,
            description: `Withdrawal request to ${bankCode} - ${accountNumber}`,
            referenceId: withdrawal.id,
        });

        this.logger.log(`Withdrawal initiated: ${reference} - $${amount}`);

        return {
            withdrawalId: withdrawal.id,
            reference,
        };
    }

    /**
     * Mark a withdrawal as complete (called from webhook).
     */
    async markWithdrawalComplete(reference: string): Promise<void> {
        await this.db
            .update(schema.withdrawals)
            .set({
                status: WITHDRAWAL_STATUS.COMPLETED,
                completedAt: new Date(),
            })
            .where(eq(schema.withdrawals.reference, reference));

        this.logger.log(`Withdrawal completed: ${reference}`);
    }

    /**
     * Mark a withdrawal as failed (called from webhook).
     * Refunds the user's balance.
     */
    async markWithdrawalFailed(reference: string, reason: string): Promise<void> {
        // 1. Get withdrawal details
        const [withdrawal] = await this.db
            .select()
            .from(schema.withdrawals)
            .where(eq(schema.withdrawals.reference, reference))
            .limit(1);

        if (!withdrawal) {
            this.logger.warn(`Withdrawal not found: ${reference}`);
            return;
        }

        // 2. Update status
        await this.db
            .update(schema.withdrawals)
            .set({
                status: WITHDRAWAL_STATUS.FAILED,
                failureReason: reason,
            })
            .where(eq(schema.withdrawals.reference, reference));

        // 3. Refund balance
        const amount = parseFloat(withdrawal.amount);
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = balance + ${amount},
                updated_at = now()
            WHERE id = ${withdrawal.userId}
        `);

        // 4. Log refund
        await this.db.insert(schema.transactions).values({
            userId: withdrawal.userId,
            amount: amount.toString(),
            type: TRANSACTION_TYPES.REFUND,
            description: `Withdrawal refund - ${reason}`,
            referenceId: withdrawal.id,
        });

        this.logger.log(`Withdrawal failed and refunded: ${reference} - $${amount}`);
    }

    /**
     * Get user's withdrawal history.
     */
    async getWithdrawals(userId: string, limit: number = 20) {
        return this.db
            .select()
            .from(schema.withdrawals)
            .where(eq(schema.withdrawals.userId, userId))
            .orderBy(sql`created_at DESC`)
            .limit(limit);
    }

    /**
     * Request a withdrawal with idempotency key and fund locking.
     * Uses SELECT FOR UPDATE to prevent race conditions.
     */
    async requestWithdrawalWithLocking(
        userId: string,
        amount: number,
        bankCode: string,
        accountNumber: string,
        accountName: string,
        idempotencyKey: string,
    ): Promise<{ payoutRequestId: string; reference: string; status: string }> {
        // 1. Check for existing request with same idempotency key
        const existingRequest = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.idempotencyKey, idempotencyKey))
            .limit(1);

        if (existingRequest.length > 0) {
            // Return existing request (idempotent)
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

        // 3. Use SELECT FOR UPDATE to lock the row and prevent race conditions
        // This ensures no concurrent withdrawals can overdraw the balance
        const lockResult = await this.db.execute(sql`
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
        const pendingBalance = parseFloat(profile.pending_balance || '0');
        const availableBalance = currentBalance; // Available = balance (pending is already locked)

        if (availableBalance < amount) {
            throw new BadRequestException(`Insufficient balance. Available: $${availableBalance.toFixed(2)}`);
        }

        // 4. Generate unique reference
        const reference = `WD-${userId.substring(0, 8)}-${Date.now()}`;

        // 5. Lock funds: move from balance to pending_balance
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = balance - ${amount},
                pending_balance = COALESCE(pending_balance, 0) + ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 6. Create payout request record
        const [payoutRequest] = await this.db
            .insert(schema.payoutRequests)
            .values({
                userId,
                idempotencyKey,
                amount: amount.toString(),
                bankCode,
                accountNumber,
                accountName,
                status: WITHDRAWAL_STATUS.PENDING,
                paystackReference: reference,
                lockedAmount: amount.toString(),
            })
            .returning({ id: schema.payoutRequests.id });

        // 7. Log the fund lock transaction
        await this.db.insert(schema.transactions).values({
            userId,
            amount: (-amount).toString(),
            type: TRANSACTION_TYPES.FUND_LOCK,
            description: `Funds locked for withdrawal request`,
            referenceId: payoutRequest.id,
        });

        this.logger.log(`Withdrawal initiated with fund lock: ${reference} - $${amount}`);

        return {
            payoutRequestId: payoutRequest.id,
            reference,
            status: WITHDRAWAL_STATUS.PENDING,
        };
    }

    /**
     * Complete a payout request (called from webhook on transfer.success).
     * Clears the pending balance.
     */
    async completePayoutRequest(reference: string): Promise<void> {
        // Find the payout request
        const [payoutRequest] = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.paystackReference, reference))
            .limit(1);

        if (!payoutRequest) {
            // Try legacy withdrawals table
            await this.markWithdrawalComplete(reference);
            return;
        }

        const lockedAmount = parseFloat(payoutRequest.lockedAmount || '0');

        // Update payout request status
        await this.db
            .update(schema.payoutRequests)
            .set({
                status: WITHDRAWAL_STATUS.COMPLETED,
                completedAt: new Date(),
            })
            .where(eq(schema.payoutRequests.id, payoutRequest.id));

        // Clear the pending balance (funds have been transferred)
        await this.db.execute(sql`
            UPDATE profiles
            SET pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${lockedAmount}),
                updated_at = now()
            WHERE id = ${payoutRequest.userId}
        `);

        this.logger.log(`Payout completed: ${reference} - $${lockedAmount}`);
    }

    /**
     * Fail a payout request (called from webhook on transfer.failed).
     * Refunds the locked funds back to available balance.
     */
    async failPayoutRequest(reference: string, reason: string): Promise<void> {
        // Find the payout request
        const [payoutRequest] = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.paystackReference, reference))
            .limit(1);

        if (!payoutRequest) {
            // Try legacy withdrawals table
            await this.markWithdrawalFailed(reference, reason);
            return;
        }

        const lockedAmount = parseFloat(payoutRequest.lockedAmount || '0');

        // Update payout request status
        await this.db
            .update(schema.payoutRequests)
            .set({
                status: WITHDRAWAL_STATUS.FAILED,
                failureReason: reason,
            })
            .where(eq(schema.payoutRequests.id, payoutRequest.id));

        // Refund: move from pending_balance back to balance
        await this.db.execute(sql`
            UPDATE profiles
            SET balance = balance + ${lockedAmount},
                pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${lockedAmount}),
                updated_at = now()
            WHERE id = ${payoutRequest.userId}
        `);

        // Log the refund
        await this.db.insert(schema.transactions).values({
            userId: payoutRequest.userId,
            amount: lockedAmount.toString(),
            type: TRANSACTION_TYPES.REFUND,
            description: `Withdrawal refund - ${reason}`,
            referenceId: payoutRequest.id,
        });

        this.logger.log(`Payout failed and refunded: ${reference} - $${lockedAmount} - ${reason}`);
    }

    /**
     * Get user's balance summary including locked funds.
     */
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

    /**
     * Get user's payout request history.
     */
    async getPayoutRequests(userId: string, limit: number = 20) {
        return this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.userId, userId))
            .orderBy(sql`created_at DESC`)
            .limit(limit);
    }
}
