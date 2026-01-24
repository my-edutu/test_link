import { Injectable, Inject, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { eq } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../database/schema';

export interface BankResolveResult {
    accountNumber: string;
    accountName: string;
    bankCode: string;
    bankName: string;
}

export interface NigerianBank {
    name: string;
    code: string;
    slug: string;
}

@Injectable()
export class BankService {
    private readonly logger = new Logger(BankService.name);
    private readonly paystackSecretKey: string;
    private readonly paystackBaseUrl = 'https://api.paystack.co';

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
        private configService: ConfigService,
    ) {
        this.paystackSecretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY') || '';
    }

    /**
     * Resolve bank account details using Paystack API.
     * Verifies that the account number exists and returns the account holder's name.
     */
    async resolveAccount(accountNumber: string, bankCode: string): Promise<BankResolveResult> {
        if (!this.paystackSecretKey) {
            throw new BadRequestException('Payment provider not configured');
        }

        // Validate input
        if (!accountNumber || accountNumber.length !== 10) {
            throw new BadRequestException('Account number must be 10 digits');
        }

        if (!bankCode) {
            throw new BadRequestException('Bank code is required');
        }

        try {
            const response = await fetch(
                `${this.paystackBaseUrl}/bank/resolve?account_number=${accountNumber}&bank_code=${bankCode}`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.paystackSecretKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const data = await response.json();

            if (!response.ok || !data.status) {
                this.logger.warn(`Bank resolve failed: ${data.message}`);
                throw new BadRequestException(data.message || 'Failed to verify bank account');
            }

            // Get bank name from the bank list
            const bankName = await this.getBankName(bankCode);

            return {
                accountNumber: data.data.account_number,
                accountName: data.data.account_name,
                bankCode,
                bankName,
            };
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Bank resolve error: ${error}`);
            throw new BadRequestException('Failed to verify bank account. Please try again.');
        }
    }

    /**
     * Get list of Nigerian banks from Paystack.
     */
    async getBankList(): Promise<NigerianBank[]> {
        if (!this.paystackSecretKey) {
            throw new BadRequestException('Payment provider not configured');
        }

        try {
            const response = await fetch(
                `${this.paystackBaseUrl}/bank?country=nigeria&perPage=100`,
                {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${this.paystackSecretKey}`,
                        'Content-Type': 'application/json',
                    },
                },
            );

            const data = await response.json();

            if (!response.ok || !data.status) {
                throw new BadRequestException('Failed to fetch bank list');
            }

            return data.data.map((bank: any) => ({
                name: bank.name,
                code: bank.code,
                slug: bank.slug,
            }));
        } catch (error) {
            if (error instanceof BadRequestException) {
                throw error;
            }
            this.logger.error(`Get bank list error: ${error}`);
            throw new BadRequestException('Failed to fetch bank list');
        }
    }

    /**
     * Get bank name by code.
     */
    async getBankName(bankCode: string): Promise<string> {
        const banks = await this.getBankList();
        const bank = banks.find(b => b.code === bankCode);
        return bank?.name || 'Unknown Bank';
    }

    /**
     * Link a verified bank account to a user's profile.
     * Stores only masked account details for security.
     */
    async linkBankAccount(
        userId: string,
        accountNumber: string,
        bankCode: string,
    ): Promise<{ success: boolean; accountName: string; bankName: string }> {
        // First, resolve the account to verify it exists
        const resolved = await this.resolveAccount(accountNumber, bankCode);

        // Store masked account details
        const last4Digits = accountNumber.slice(-4);

        await this.db
            .update(schema.profiles)
            .set({
                bankName: resolved.bankName,
                bankCode: bankCode,
                accountNumberLast4: last4Digits,
                accountName: resolved.accountName,
                updatedAt: new Date(),
            })
            .where(eq(schema.profiles.id, userId));

        this.logger.log(`Bank account linked for user ${userId}: ${resolved.bankName} ****${last4Digits}`);

        return {
            success: true,
            accountName: resolved.accountName,
            bankName: resolved.bankName,
        };
    }

    /**
     * Get user's linked bank account details.
     */
    async getLinkedBank(userId: string): Promise<{
        bankName: string | null;
        bankCode: string | null;
        accountNumberLast4: string | null;
        accountName: string | null;
    } | null> {
        const [profile] = await this.db
            .select({
                bankName: schema.profiles.bankName,
                bankCode: schema.profiles.bankCode,
                accountNumberLast4: schema.profiles.accountNumberLast4,
                accountName: schema.profiles.accountName,
            })
            .from(schema.profiles)
            .where(eq(schema.profiles.id, userId))
            .limit(1);

        if (!profile || !profile.bankCode) {
            return null;
        }

        return profile;
    }

    /**
     * Unlink bank account from profile.
     */
    async unlinkBankAccount(userId: string): Promise<void> {
        await this.db
            .update(schema.profiles)
            .set({
                bankName: null,
                bankCode: null,
                accountNumberLast4: null,
                accountName: null,
                updatedAt: new Date(),
            })
            .where(eq(schema.profiles.id, userId));

        this.logger.log(`Bank account unlinked for user ${userId}`);
    }
}
