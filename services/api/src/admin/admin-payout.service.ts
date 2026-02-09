import { Injectable, Inject, Logger, ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq, sql, desc, and } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as bcrypt from 'bcrypt';
import * as schema from '../database/schema';
import { EncryptionService } from '../common/encryption.service';
import { ExchangeRateService } from '../common/exchange-rate.service';

const BCRYPT_SALT_ROUNDS = 12;

const PAYOUT_STATUS = {
    PENDING: 'pending',
    PROCESSING: 'processing',
    COMPLETED: 'completed',
    FAILED: 'failed',
    REFUNDED: 'refunded',
} as const;

const TRANSACTION_TYPES = {
    REFUND: 'refund',
    FUND_UNLOCK: 'fund_unlock',
} as const;

@Injectable()
export class AdminPayoutService {
    private readonly logger = new Logger(AdminPayoutService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private encryptionService: EncryptionService,
        private configService: ConfigService,
        private exchangeRateService: ExchangeRateService,
    ) { }

    /**
     * Hash a plaintext password using bcrypt.
     * Use this when setting up new admin passwords.
     */
    async hashPassword(plainPassword: string): Promise<string> {
        return bcrypt.hash(plainPassword, BCRYPT_SALT_ROUNDS);
    }

    /**
     * Set or update an admin's password hash.
     * This should be called from a secure admin setup endpoint or CLI.
     */
    async setAdminPassword(adminId: string, newPassword: string): Promise<void> {
        // Verify the user is an admin
        const [admin] = await this.db
            .select({ id: schema.profiles.id, isAdmin: schema.profiles.isAdmin })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, adminId))
            .limit(1);

        if (!admin || !admin.isAdmin) {
            throw new ForbiddenException('User is not an admin');
        }

        // Validate password strength
        if (newPassword.length < 12) {
            throw new BadRequestException('Password must be at least 12 characters');
        }

        // Hash and store the password
        const passwordHash = await this.hashPassword(newPassword);

        await this.db
            .update(schema.profiles)
            .set({ adminPasswordHash: passwordHash })
            .where(eq(schema.profiles.id, adminId));

        this.logger.log(`Admin password updated for ${adminId}`);
    }

    /**
     * Verify admin password for sensitive operations.
     * Uses bcrypt comparison against stored password hash.
     * Falls back to master password during migration period.
     */
    async verifyAdminPassword(adminId: string, password: string): Promise<void> {
        if (!password) {
            throw new ForbiddenException('Admin password required for this action');
        }

        // Get admin profile with password hash
        const [admin] = await this.db
            .select({
                id: schema.profiles.id,
                email: schema.profiles.email,
                adminPasswordHash: schema.profiles.adminPasswordHash,
            })
            .from(schema.profiles)
            .where(and(
                eq(schema.profiles.id, adminId),
                eq(schema.profiles.isAdmin, true),
            ))
            .limit(1);

        if (!admin) {
            throw new ForbiddenException('Admin not found');
        }

        // If admin has a personal password hash, use bcrypt verification
        if (admin.adminPasswordHash) {
            const isValid = await bcrypt.compare(password, admin.adminPasswordHash);
            if (!isValid) {
                this.logger.warn(`Invalid admin password attempt by ${adminId} (bcrypt)`);
                await this.logAuditEvent(adminId, 'FAILED_PASSWORD_ATTEMPT', {
                    reason: 'Invalid bcrypt password',
                    timestamp: new Date().toISOString(),
                });
                throw new ForbiddenException('Invalid admin password');
            }
            return; // Password verified successfully
        }

        // Fallback to master password (for migration period)
        // This allows existing admins to work until they set up personal passwords
        const masterAdminPassword = this.configService.get<string>('ADMIN_MASTER_PASSWORD');

        if (!masterAdminPassword) {
            throw new Error('ADMIN_MASTER_PASSWORD not configured and no personal password set');
        }

        // Use timing-safe comparison for master password
        const masterPasswordBuffer = Buffer.from(masterAdminPassword);
        const providedPasswordBuffer = Buffer.from(password);

        // Ensure same length for timing-safe comparison
        if (masterPasswordBuffer.length !== providedPasswordBuffer.length) {
            this.logger.warn(`Invalid admin password attempt by ${adminId} (master - length mismatch)`);
            throw new ForbiddenException('Invalid admin password');
        }

        const isValidMaster = require('crypto').timingSafeEqual(masterPasswordBuffer, providedPasswordBuffer);

        if (!isValidMaster) {
            this.logger.warn(`Invalid admin password attempt by ${adminId} (master)`);
            await this.logAuditEvent(adminId, 'FAILED_PASSWORD_ATTEMPT', {
                reason: 'Invalid master password',
                timestamp: new Date().toISOString(),
            });
            throw new ForbiddenException('Invalid admin password');
        }

        // Log that master password was used (admin should migrate to personal password)
        this.logger.warn(`Admin ${adminId} using master password - should migrate to personal password`);
    }

    /**
     * Get all pending payout requests (masked account numbers by default)
     */
    async getPendingPayouts(page: number = 1, limit: number = 20) {
        const offset = (page - 1) * limit;

        const payouts = await this.db
            .select({
                id: schema.payoutRequests.id,
                userId: schema.payoutRequests.userId,
                amount: schema.payoutRequests.amount,
                bankCode: schema.payoutRequests.bankCode,
                accountNumber: schema.payoutRequests.accountNumber, // Masked version
                accountName: schema.payoutRequests.accountName,
                status: schema.payoutRequests.status,
                createdAt: schema.payoutRequests.createdAt,
            })
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.status, PAYOUT_STATUS.PENDING))
            .orderBy(desc(schema.payoutRequests.createdAt))
            .limit(limit)
            .offset(offset);

        // Get total count
        const countResult = await this.db.execute(sql`
            SELECT COUNT(*) as total FROM payout_requests WHERE status = 'pending'
        `);
        const total = parseInt((countResult[0] as any).total || '0');

        return {
            payouts,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    /**
     * Get full payout details including decrypted account number.
     * Only accessible after admin password verification.
     */
    async getPayoutDetailsWithDecryptedAccount(payoutId: string) {
        const [payout] = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.id, payoutId))
            .limit(1);

        if (!payout) {
            throw new NotFoundException('Payout request not found');
        }

        // Decrypt account number
        let decryptedAccountNumber = '';
        if (payout.encryptedAccountNumber) {
            decryptedAccountNumber = this.encryptionService.decrypt(payout.encryptedAccountNumber);
        }

        // Get user profile info
        const [user] = await this.db
            .select({
                username: schema.profiles.username,
                email: schema.profiles.email,
                fullName: schema.profiles.fullName,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, payout.userId))
            .limit(1);

        return {
            ...payout,
            fullAccountNumber: decryptedAccountNumber, // Only shown after password verification
            user,
        };
    }

    /**
     * Mark a payout as "processing" (admin has initiated bank transfer)
     */
    async markPayoutAsProcessed(payoutId: string, adminId: string) {
        const [payout] = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.id, payoutId))
            .limit(1);

        if (!payout) {
            throw new NotFoundException('Payout request not found');
        }

        if (payout.status !== PAYOUT_STATUS.PENDING) {
            throw new BadRequestException(`Payout is already ${payout.status}`);
        }

        await this.db
            .update(schema.payoutRequests)
            .set({
                status: PAYOUT_STATUS.PROCESSING,
                processedAt: new Date(),
            })
            .where(eq(schema.payoutRequests.id, payoutId));

        return {
            success: true,
            payoutId,
            amount: payout.amount,
            userId: payout.userId,
            status: PAYOUT_STATUS.PROCESSING,
        };
    }

    /**
     * Mark a payout as completed (bank transfer confirmed)
     */
    async markPayoutAsCompleted(payoutId: string, adminId: string, bankReference: string) {
        return await this.db.transaction(async (tx) => {
            const [payout] = await tx
                .select()
                .from(schema.payoutRequests)
                .where(eq(schema.payoutRequests.id, payoutId))
                .limit(1);

            if (!payout) {
                throw new NotFoundException('Payout request not found');
            }

            if (payout.status === PAYOUT_STATUS.COMPLETED) {
                throw new BadRequestException('Payout already completed');
            }

            // Update payout status
            await tx
                .update(schema.payoutRequests)
                .set({
                    status: PAYOUT_STATUS.COMPLETED,
                    paystackReference: bankReference,
                    completedAt: new Date(),
                })
                .where(eq(schema.payoutRequests.id, payoutId));

            // Release locked funds (reduce pending_balance)
            const lockedAmount = parseFloat(payout.lockedAmount || '0');
            await tx.execute(sql`
                UPDATE profiles
                SET pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${lockedAmount}),
                    updated_at = now()
                WHERE id = ${payout.userId}
            `);

            return {
                success: true,
                payoutId,
                bankReference,
                status: PAYOUT_STATUS.COMPLETED,
            };
        });
    }

    /**
     * Reject a payout and refund the user's balance
     */
    async rejectAndRefundPayout(payoutId: string, adminId: string, reason: string) {
        return await this.db.transaction(async (tx) => {
            const [payout] = await tx
                .select()
                .from(schema.payoutRequests)
                .where(eq(schema.payoutRequests.id, payoutId))
                .limit(1);

            if (!payout) {
                throw new NotFoundException('Payout request not found');
            }

            if (payout.status === PAYOUT_STATUS.COMPLETED) {
                throw new BadRequestException('Cannot refund a completed payout');
            }

            if (payout.status === PAYOUT_STATUS.REFUNDED) {
                throw new BadRequestException('Payout already refunded');
            }

            const refundAmount = parseFloat(payout.lockedAmount || payout.amount);

            // Update payout status
            await tx
                .update(schema.payoutRequests)
                .set({
                    status: PAYOUT_STATUS.REFUNDED,
                    failureReason: reason,
                })
                .where(eq(schema.payoutRequests.id, payoutId));

            // Refund to user's balance
            await tx.execute(sql`
                UPDATE profiles
                SET balance = balance + ${refundAmount},
                    pending_balance = GREATEST(0, COALESCE(pending_balance, 0) - ${refundAmount}),
                    updated_at = now()
                WHERE id = ${payout.userId}
            `);

            // Log refund transaction
            await tx.insert(schema.transactions).values({
                userId: payout.userId,
                amount: refundAmount.toString(),
                type: TRANSACTION_TYPES.REFUND,
                description: `Payout refunded: ${reason}`,
                referenceId: payout.id,
            });

            return {
                success: true,
                payoutId,
                refundAmount,
                reason,
                status: PAYOUT_STATUS.REFUNDED,
            };
        });
    }

    /**
     * Log an audit event for compliance and security tracking
     */
    async logAuditEvent(adminId: string, action: string, details: any) {
        try {
            await this.db.insert(schema.auditLogs).values({
                adminId,
                action,
                targetType: details.targetType || 'payout_request',
                targetId: details.payoutId || details.targetId || null,
                metadata: details,
            });
        } catch (error) {
            // Don't fail the main operation if audit logging fails
            this.logger.error(`Failed to log audit event: ${error}`);
        }
    }

    /**
     * Get audit log for admin actions
     */
    async getAuditLog(days: number = 7) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);

        const logs = await this.db
            .select()
            .from(schema.auditLogs)
            .where(sql`created_at >= ${cutoffDate}`)
            .orderBy(desc(schema.auditLogs.createdAt))
            .limit(100);

        return logs;
    }

    /**
     * Create a Paystack transfer recipient for a bank account
     */
    private async createPaystackRecipient(
        accountNumber: string,
        bankCode: string,
        accountName: string,
    ): Promise<string> {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        const response = await fetch('https://api.paystack.co/transferrecipient', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                type: 'nuban',
                name: accountName,
                account_number: accountNumber,
                bank_code: bankCode,
                currency: 'NGN',
            }),
        });

        const data = await response.json();

        if (!data.status) {
            this.logger.error(`Paystack recipient creation failed: ${data.message}`);
            throw new BadRequestException(data.message || 'Failed to create transfer recipient');
        }

        return data.data.recipient_code;
    }

    /**
     * Initiate a Paystack transfer to a recipient
     */
    private async initiatePaystackTransfer(
        recipientCode: string,
        amountKobo: number,
        reference: string,
        reason: string,
    ): Promise<{ transferCode: string; status: string }> {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('PAYSTACK_SECRET_KEY not configured');
        }

        const response = await fetch('https://api.paystack.co/transfer', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${secretKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                source: 'balance',
                amount: amountKobo,
                recipient: recipientCode,
                reason,
                reference,
            }),
        });

        const data = await response.json();

        if (!data.status) {
            this.logger.error(`Paystack transfer initiation failed: ${data.message}`);
            throw new BadRequestException(data.message || 'Failed to initiate transfer');
        }

        return {
            transferCode: data.data.transfer_code,
            status: data.data.status,
        };
    }

    /**
     * Process a payout via Paystack Transfer API (automated bank transfer)
     */
    async processPayoutViaPaystack(payoutId: string, adminId: string) {
        // 1. Get payout request
        const [payout] = await this.db
            .select()
            .from(schema.payoutRequests)
            .where(eq(schema.payoutRequests.id, payoutId))
            .limit(1);

        if (!payout) {
            throw new NotFoundException('Payout request not found');
        }

        if (payout.status !== PAYOUT_STATUS.PENDING && payout.status !== PAYOUT_STATUS.PROCESSING) {
            throw new BadRequestException(`Payout is already ${payout.status}`);
        }

        // 2. Decrypt account number
        if (!payout.encryptedAccountNumber) {
            throw new BadRequestException('No encrypted account number found');
        }

        const accountNumber = this.encryptionService.decrypt(payout.encryptedAccountNumber);
        if (!accountNumber) {
            throw new BadRequestException('Failed to decrypt account number');
        }

        // 3. Convert USD to NGN (kobo)
        const usdAmount = parseFloat(payout.amount);
        const amountKobo = await this.exchangeRateService.usdToKobo(usdAmount);

        // 4. Generate unique reference
        const reference = `PAYOUT-${payoutId.substring(0, 8)}-${Date.now()}`;

        try {
            // 5. Create transfer recipient
            this.logger.log(`Creating Paystack recipient for payout ${payoutId}`);
            const recipientCode = await this.createPaystackRecipient(
                accountNumber,
                payout.bankCode,
                payout.accountName,
            );

            // 6. Initiate transfer
            this.logger.log(`Initiating Paystack transfer: ${reference}`);
            const transfer = await this.initiatePaystackTransfer(
                recipientCode,
                amountKobo,
                reference,
                `LinguaLink Payout - ${payout.accountName}`,
            );

            // 7. Update payout request with transfer details
            await this.db
                .update(schema.payoutRequests)
                .set({
                    status: PAYOUT_STATUS.PROCESSING,
                    paystackTransferCode: transfer.transferCode,
                    paystackReference: reference,
                    processedAt: new Date(),
                })
                .where(eq(schema.payoutRequests.id, payoutId));

            this.logger.log(`Paystack transfer initiated: ${reference} - ${transfer.transferCode}`);

            return {
                success: true,
                payoutId,
                reference,
                transferCode: transfer.transferCode,
                status: transfer.status,
                amountNGN: amountKobo / 100,
                amountUSD: usdAmount,
                message: 'Transfer initiated. Status will be updated via webhook.',
            };
        } catch (error) {
            this.logger.error(`Paystack transfer failed for payout ${payoutId}: ${error}`);
            throw error;
        }
    }
}
