# Drizzle ORM Patterns & Best Practices

> **Purpose**: This guide documents proven patterns for using Drizzle ORM with NestJS and Supabase Postgres in the LinguaLink backend.

---

## 📚 Table of Contents

1. [Schema Definition Patterns](#1-schema-definition-patterns)
2. [Query Patterns](#2-query-patterns)
3. [Transaction Patterns](#3-transaction-patterns)
4. [Migration Best Practices](#4-migration-best-practices)
5. [Service Integration](#5-service-integration)

---

## 1. Schema Definition Patterns

### Basic Table with UUID Primary Key

```typescript
import { pgTable, uuid, text, timestamp, boolean } from 'drizzle-orm/pg-core';

/**
 * Entity description - what this table represents
 */
export const entityName = pgTable('entity_name', {
    /** Unique identifier */
    id: uuid('id').defaultRandom().primaryKey(),
    
    /** Required text field */
    name: text('name').notNull(),
    
    /** Optional text with default */
    status: text('status').default('pending'),
    
    /** Timestamps */
    createdAt: timestamp('created_at').defaultNow(),
    updatedAt: timestamp('updated_at').defaultNow(),
});
```

### Table with Foreign Key Reference

```typescript
export const validations = pgTable('validations', {
    id: uuid('id').defaultRandom().primaryKey(),
    
    // FK Pattern: Use uuid type with descriptive column name
    voiceClipId: uuid('voice_clip_id').notNull(),
    validatorId: uuid('validator_id').notNull(),
    
    isApproved: boolean('is_approved'),
    createdAt: timestamp('created_at').defaultNow(),
});

// Define relations separately for type safety
export const validationsRelations = relations(validations, ({ one }) => ({
    voiceClip: one(voiceClips, {
        fields: [validations.voiceClipId],
        references: [voiceClips.id],
    }),
    validator: one(profiles, {
        fields: [validations.validatorId],
        references: [profiles.id],
    }),
}));
```

### Table with Decimal/Money Fields

```typescript
export const transactions = pgTable('transactions', {
    id: uuid('id').defaultRandom().primaryKey(),
    userId: text('user_id').notNull(),
    
    // Money: Always use decimal with precision
    amount: decimal('amount', { precision: 10, scale: 2 }).notNull(),
    
    type: text('type').notNull(), // 'earning', 'withdrawal', etc.
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow(),
});
```

---

## 2. Query Patterns

### Basic Select

```typescript
// Select all from table
const allClips = await db.select().from(voiceClips);

// Select with conditions
const pendingClips = await db
    .select()
    .from(voiceClips)
    .where(eq(voiceClips.status, 'pending'));

// Select specific columns
const clipIds = await db
    .select({ id: voiceClips.id, status: voiceClips.status })
    .from(voiceClips);
```

### Select with Joins

```typescript
import { eq } from 'drizzle-orm';

// Inner join pattern
const clipsWithValidations = await db
    .select({
        clip: voiceClips,
        validation: validations,
    })
    .from(voiceClips)
    .innerJoin(validations, eq(voiceClips.id, validations.voiceClipId));

// Left join for optional relationships
const clipsWithOptionalBadges = await db
    .select()
    .from(voiceClips)
    .leftJoin(userBadges, eq(voiceClips.userId, userBadges.userId));
```

### Aggregations and Counting

```typescript
import { count, sum, eq } from 'drizzle-orm';

// Count validations per clip
const validationCounts = await db
    .select({
        clipId: validations.voiceClipId,
        totalVotes: count(),
        approvals: count(sql`CASE WHEN ${validations.isApproved} = true THEN 1 END`),
    })
    .from(validations)
    .groupBy(validations.voiceClipId);

// Sum user earnings
const userTotal = await db
    .select({ total: sum(transactions.amount) })
    .from(transactions)
    .where(eq(transactions.userId, userId));
```

### Insert Patterns

```typescript
// Single insert with returning
const [newValidation] = await db
    .insert(validations)
    .values({
        voiceClipId: clipId,
        validatorId: userId,
        isApproved: true,
    })
    .returning();

// Bulk insert
await db.insert(validations).values([
    { voiceClipId: clip1, validatorId: user1, isApproved: true },
    { voiceClipId: clip2, validatorId: user1, isApproved: false },
]);
```

### Update Patterns

```typescript
// Update with conditions
await db
    .update(voiceClips)
    .set({ status: 'approved', validationsCount: sql`${voiceClips.validationsCount} + 1` })
    .where(eq(voiceClips.id, clipId));

// Update with returning
const [updated] = await db
    .update(profiles)
    .set({ balance: sql`${profiles.balance} + ${amount}` })
    .where(eq(profiles.id, userId))
    .returning();
```

---

## 3. Transaction Patterns

### Basic Transaction

```typescript
// Always use transactions for multi-step operations
const result = await db.transaction(async (tx) => {
    // Step 1: Insert validation
    const [validation] = await tx
        .insert(validations)
        .values({ voiceClipId, validatorId, isApproved: true })
        .returning();
    
    // Step 2: Update clip count
    await tx
        .update(voiceClips)
        .set({ validationsCount: sql`${voiceClips.validationsCount} + 1` })
        .where(eq(voiceClips.id, voiceClipId));
    
    // Step 3: Award reward
    await tx
        .update(profiles)
        .set({ balance: sql`${profiles.balance} + 0.02` })
        .where(eq(profiles.id, validatorId));
    
    // Step 4: Record transaction
    await tx.insert(transactions).values({
        userId: validatorId,
        amount: '0.02',
        type: 'earning',
        description: 'Validation reward',
    });
    
    return validation;
});
```

### Transaction with Rollback Handling

```typescript
try {
    await db.transaction(async (tx) => {
        // Operations here...
        
        if (someConditionFails) {
            throw new Error('Operation failed, rolling back');
        }
    });
} catch (error) {
    // Transaction automatically rolled back
    console.error('Transaction failed:', error.message);
    throw error;
}
```

---

## 4. Migration Best Practices

### Naming Convention

```
supabase/sql/
├── 001_initial_schema.sql
├── 002_add_voice_clips.sql
├── 003_add_validations.sql
├── 004_add_monetization_tables.sql
└── ...
```

### Migration File Template

```sql
-- Migration: [short description]
-- Created: YYYY-MM-DD
-- Author: [name]

-- UP Migration
CREATE TABLE IF NOT EXISTS table_name (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    -- columns...
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_table_column ON table_name(column);

-- Enable RLS if client-facing
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;

-- RLS Policies (if needed)
CREATE POLICY "policy_name" ON table_name
    FOR SELECT USING (auth.uid() = user_id);

-- DOWN Migration (in comments for reference)
-- DROP TABLE IF EXISTS table_name;
```

### Keep Drizzle Schema in Sync

After applying a SQL migration:

1. Update `src/database/schema.ts` with matching table definition
2. Regenerate types if using `drizzle-kit generate`
3. Document in `FEATURE_CHANGELOG.md`

---

## 5. Service Integration

### NestJS Service Pattern

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { NodePgDatabase } from 'drizzle-orm/node-postgres';
import * as schema from '../database/schema';
import { eq, and } from 'drizzle-orm';

@Injectable()
export class MonetizationService {
    constructor(
        @Inject('DATABASE_CONNECTION')
        private db: NodePgDatabase<typeof schema>,
    ) {}

    async submitValidation(clipId: string, userId: string, isApproved: boolean) {
        return this.db.transaction(async (tx) => {
            // Check if already validated
            const existing = await tx
                .select()
                .from(schema.validations)
                .where(
                    and(
                        eq(schema.validations.voiceClipId, clipId),
                        eq(schema.validations.validatorId, userId),
                    ),
                )
                .limit(1);
            
            if (existing.length > 0) {
                throw new Error('Already validated');
            }
            
            // Insert and process...
        });
    }
}
```

### Error Handling Pattern

```typescript
import { BadRequestException, NotFoundException } from '@nestjs/common';

async getClipById(clipId: string) {
    const [clip] = await this.db
        .select()
        .from(voiceClips)
        .where(eq(voiceClips.id, clipId))
        .limit(1);
    
    if (!clip) {
        throw new NotFoundException(`Clip ${clipId} not found`);
    }
    
    return clip;
}
```

---

## 🔗 Related Resources

- [Drizzle ORM Documentation](https://orm.drizzle.team/)
- [Drizzle with PostgreSQL](https://orm.drizzle.team/docs/get-started-postgresql)
- [Supabase Postgres Connection](https://supabase.com/docs/guides/database/connecting-to-postgres)
