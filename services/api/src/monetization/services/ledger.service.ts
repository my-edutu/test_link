import { Injectable, Inject, Logger } from '@nestjs/common';
import { sql } from 'drizzle-orm';
import { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import * as schema from '../../database/schema';

type DrizzleTransaction = any; // We'll infer this type or use 'any' if complex generics

@Injectable()
export class LedgerService {
    private readonly logger = new Logger(LedgerService.name);

    constructor(
        @Inject('DRIZZLE') private db: PostgresJsDatabase<typeof schema>,
    ) { }

    /**
     * Credit a user's wallet.
     * @param tx Optional transaction object to ensure atomicity with caller.
     */
    async creditUser(
        userId: string,
        amount: number,
        type: string,
        description: string,
        referenceId?: string,
        tx?: DrizzleTransaction,
    ): Promise<void> {
        const executor = tx || this.db;

        // 1. Update balance atomically
        await executor.execute(sql`
            UPDATE profiles
            SET balance = COALESCE(balance, 0) + ${amount},
                total_earned = COALESCE(total_earned, 0) + ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 2. Log transaction
        await executor.insert(schema.transactions).values({
            userId,
            amount: amount.toString(),
            type,
            description,
            referenceId: referenceId ?? null,
        });

        this.logger.log(`Credited ${amount} to user ${userId} [${type}]: ${description}`);
    }

    /**
     * Debit a user's wallet.
     * @param tx Optional transaction object.
     */
    async debitUser(
        userId: string,
        amount: number,
        type: string,
        description: string,
        referenceId?: string,
        tx?: DrizzleTransaction,
    ): Promise<void> {
        const executor = tx || this.db;

        // 1. Update balance atomically (ensure non-negative check if needed, but simple subtraction for now)
        await executor.execute(sql`
            UPDATE profiles
            SET balance = COALESCE(balance, 0) - ${amount},
                updated_at = now()
            WHERE id = ${userId}
        `);

        // 2. Log transaction
        await executor.insert(schema.transactions).values({
            userId,
            amount: (-amount).toString(), // Store as negative for debit? Or positive with type='debit'? 
            // Often cleaner to store magnitude + type. Let's store negative amount for easier SUM() queries later.
            // But 'transactions.amount' schema is decimal. Let's stick to signed values.
            type,
            description,
            referenceId: referenceId ?? null,
        });

        this.logger.log(`Debited ${amount} from user ${userId} [${type}]: ${description}`);
    }
}
