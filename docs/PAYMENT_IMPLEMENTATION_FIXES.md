# LinguaLink Payment System - Implementation Fixes Guide

**Priority Level:** High
**Target Completion:** 2 weeks

---

## Quick Wins (Can Be Done Today)

### Fix 1: WithdrawalScreen Syntax Error

**File:** `src/screens/WithdrawalScreen.tsx`
**Lines:** 281-283

**Current (Broken):**
```tsx
</View>
style={styles.amountInput}
placeholder="0.00"

<View style={styles.buttonRow}>
```

**Action:** Remove lines 282-283 (orphaned code fragments)

---

### Fix 2: Currency Consistency

**Problem:** Frontend shows ₦ (Naira) but backend processes USD

**File:** `src/screens/WithdrawalScreen.tsx`

**Changes needed:**

1. Line 127: Change minimum from ₦500 to $5
```tsx
// BEFORE
if (isNaN(amountNum) || amountNum < 500) {
    Alert.alert('Invalid Amount', 'Minimum withdrawal amount is ₦500.00');

// AFTER
if (isNaN(amountNum) || amountNum < 5) {
    Alert.alert('Invalid Amount', 'Minimum withdrawal amount is $5.00');
```

2. Lines 262, 318, 335: Change ₦ to $
```tsx
// Update all currency symbols from ₦ to $
<Text style={styles.balanceAmount}>
    ${balance?.availableBalance.toFixed(2) || '0.00'}
</Text>
```

3. Line 313: Update minimum display
```tsx
<Text style={styles.minWithdrawal}>Minimum withdrawal: $5.00</Text>
```

---

### Fix 3: Add Webhook IP Whitelist

**Create new file:** `services/api/src/common/guards/paystack-ip.guard.ts`

```typescript
import { Injectable, CanActivate, ExecutionContext, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

// Paystack's IP addresses (verify these are current)
const PAYSTACK_IP_WHITELIST = [
    '52.31.139.75',
    '52.49.173.169',
    '52.214.14.220',
];

@Injectable()
export class PaystackIpGuard implements CanActivate {
    private readonly logger = new Logger(PaystackIpGuard.name);

    constructor(private configService: ConfigService) {}

    canActivate(context: ExecutionContext): boolean {
        // Skip IP check in development
        if (this.configService.get('NODE_ENV') !== 'production') {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const clientIp = this.getClientIp(request);

        const isAllowed = PAYSTACK_IP_WHITELIST.some(ip =>
            clientIp === ip || clientIp.includes(ip)
        );

        if (!isAllowed) {
            this.logger.warn(`Webhook request from unauthorized IP: ${clientIp}`);
        }

        return isAllowed;
    }

    private getClientIp(request: any): string {
        return request.headers['x-forwarded-for']?.split(',')[0]?.trim()
            || request.ip
            || request.connection?.remoteAddress
            || '';
    }
}
```

**Apply to controller:**
```typescript
// services/api/src/payments/payment.controller.ts
import { PaystackIpGuard } from '../common/guards/paystack-ip.guard';

@Post('paystack')
@UseGuards(PaystackIpGuard)
@HttpCode(HttpStatus.OK)
async handlePaystackWebhook(...) {
    // ...
}
```

---

## Medium Priority Fixes (This Week)

### Fix 4: Secure Admin Password with Hashing

**File:** `services/api/src/admin/admin-payout.service.ts`

**Step 1: Add bcrypt dependency**
```bash
npm install bcrypt
npm install -D @types/bcrypt
```

**Step 2: Update password verification**
```typescript
import * as bcrypt from 'bcrypt';

// Add method to hash passwords (for setting up admins)
async hashPassword(plainPassword: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(plainPassword, saltRounds);
}

// Update verify method
async verifyAdminPassword(adminId: string, password: string): Promise<void> {
    if (!password) {
        throw new ForbiddenException('Admin password required for this action');
    }

    // Get admin profile
    const [admin] = await this.db
        .select({
            id: schema.profiles.id,
            email: schema.profiles.email,
            passwordHash: schema.profiles.adminPasswordHash, // Add this field
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

    // If admin has personal password hash, use that
    if (admin.passwordHash) {
        const isValid = await bcrypt.compare(password, admin.passwordHash);
        if (!isValid) {
            this.logger.warn(`Invalid admin password attempt by ${adminId}`);
            throw new ForbiddenException('Invalid admin password');
        }
        return;
    }

    // Fallback to master password (for migration period)
    const masterPassword = this.configService.get<string>('ADMIN_MASTER_PASSWORD');
    if (!masterPassword || password !== masterPassword) {
        this.logger.warn(`Invalid admin password attempt by ${adminId}`);
        throw new ForbiddenException('Invalid admin password');
    }
}
```

**Step 3: Add database field**
```typescript
// services/api/src/database/schema.ts
export const profiles = pgTable('profiles', {
    // ... existing fields ...
    adminPasswordHash: text('admin_password_hash'), // Add this
});
```

---

### Fix 5: Add Retry Logic for Paystack API Calls

**Create utility:** `services/api/src/common/utils/retry.ts`

```typescript
export async function withRetry<T>(
    fn: () => Promise<T>,
    options: {
        maxAttempts?: number;
        delayMs?: number;
        backoffMultiplier?: number;
        retryOn?: (error: any) => boolean;
    } = {}
): Promise<T> {
    const {
        maxAttempts = 3,
        delayMs = 1000,
        backoffMultiplier = 2,
        retryOn = (err) => err?.message?.includes('timeout') || err?.status >= 500,
    } = options;

    let lastError: any;
    let currentDelay = delayMs;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;

            if (attempt === maxAttempts || !retryOn(error)) {
                throw error;
            }

            await new Promise(resolve => setTimeout(resolve, currentDelay));
            currentDelay *= backoffMultiplier;
        }
    }

    throw lastError;
}
```

**Apply to Paystack calls:**
```typescript
// services/api/src/admin/admin-payout.service.ts
import { withRetry } from '../common/utils/retry';

private async createPaystackRecipient(
    accountNumber: string,
    bankCode: string,
    accountName: string,
): Promise<string> {
    return withRetry(async () => {
        const secretKey = this.configService.get<string>('PAYSTACK_SECRET_KEY');

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

        if (!response.ok && response.status >= 500) {
            throw new Error(`Paystack server error: ${response.status}`);
        }

        const data = await response.json();

        if (!data.status) {
            throw new BadRequestException(data.message || 'Failed to create recipient');
        }

        return data.data.recipient_code;
    }, {
        maxAttempts: 3,
        delayMs: 2000,
        retryOn: (err) => err?.message?.includes('server error'),
    });
}
```

---

### Fix 6: Add Webhook Event Logging

**Create table:** `services/api/src/database/schema.ts`

```typescript
export const webhookLogs = pgTable('webhook_logs', {
    id: uuid('id').defaultRandom().primaryKey(),
    provider: text('provider').notNull(), // 'paystack'
    eventType: text('event_type').notNull(),
    reference: text('reference'),
    rawPayload: jsonb('raw_payload'),
    status: text('status').default('received'), // 'received', 'processed', 'failed'
    errorMessage: text('error_message'),
    processedAt: timestamp('processed_at'),
    createdAt: timestamp('created_at').defaultNow(),
});
```

**Update webhook handler:**
```typescript
// services/api/src/payments/payment.controller.ts

@Post('paystack')
@HttpCode(HttpStatus.OK)
async handlePaystackWebhook(
    @Req() req: RawBodyRequest<Request>,
    @Headers('x-paystack-signature') signature: string,
    @Body() payload: PaystackWebhookPayload,
) {
    // Log webhook receipt
    const logEntry = await this.db.insert(schema.webhookLogs).values({
        provider: 'paystack',
        eventType: payload.event,
        reference: payload.data?.reference,
        rawPayload: payload,
    }).returning({ id: schema.webhookLogs.id });

    const logId = logEntry[0].id;

    try {
        // Verify signature
        if (!this.verifyPaystackSignature(req.rawBody, signature)) {
            await this.updateWebhookLog(logId, 'failed', 'Invalid signature');
            throw new UnauthorizedException('Invalid webhook signature');
        }

        // Process event
        const result = await this.processEvent(payload);

        // Mark as processed
        await this.updateWebhookLog(logId, 'processed');

        return result;
    } catch (error) {
        await this.updateWebhookLog(logId, 'failed', error.message);
        throw error;
    }
}

private async updateWebhookLog(id: string, status: string, errorMessage?: string) {
    await this.db.update(schema.webhookLogs)
        .set({
            status,
            errorMessage,
            processedAt: new Date()
        })
        .where(eq(schema.webhookLogs.id, id));
}
```

---

## Payment Notifications (Next Week)

### Fix 7: Add Push Notifications for Payment Events

**File:** `services/api/src/payments/payment.service.ts`

```typescript
import { NotificationService } from '../notifications/notification.service';

@Injectable()
export class PaymentService {
    constructor(
        // ... existing deps ...
        private notificationService: NotificationService,
    ) {}

    async creditTopUp(
        userId: string,
        amount: number,
        reference: string,
        currency: string,
    ): Promise<void> {
        // ... existing credit logic ...

        // Send push notification
        try {
            await this.notificationService.sendToUser(userId, {
                title: 'Wallet Top-Up Successful',
                body: `$${amount.toFixed(2)} has been added to your wallet`,
                data: {
                    type: 'TOP_UP_SUCCESS',
                    reference,
                    amount: amount.toString(),
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to send top-up notification: ${error}`);
            // Don't throw - notification failure shouldn't break the flow
        }
    }

    async completePayoutRequest(reference: string): Promise<void> {
        // ... existing completion logic ...

        // Send push notification
        try {
            await this.notificationService.sendToUser(payoutRequest.userId, {
                title: 'Withdrawal Completed',
                body: `$${lockedAmount.toFixed(2)} has been sent to your bank account`,
                data: {
                    type: 'WITHDRAWAL_SUCCESS',
                    reference,
                    amount: lockedAmount.toString(),
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to send withdrawal notification: ${error}`);
        }
    }

    async failPayoutRequest(reference: string, reason: string): Promise<void> {
        // ... existing failure logic ...

        // Send push notification
        try {
            await this.notificationService.sendToUser(payoutRequest.userId, {
                title: 'Withdrawal Failed',
                body: `Your withdrawal was refunded to your wallet`,
                data: {
                    type: 'WITHDRAWAL_FAILED',
                    reference,
                    reason,
                    refundAmount: lockedAmount.toString(),
                },
            });
        } catch (error) {
            this.logger.warn(`Failed to send failure notification: ${error}`);
        }
    }
}
```

---

## Testing Checklist

### Unit Tests Required

Create file: `services/api/src/payments/payment.service.spec.ts`

```typescript
import { Test, TestingModule } from '@nestjs/testing';
import { PaymentService } from './payment.service';

describe('PaymentService', () => {
    let service: PaymentService;
    let mockDb: any;

    beforeEach(async () => {
        mockDb = {
            transaction: jest.fn((fn) => fn(mockDb)),
            select: jest.fn().mockReturnThis(),
            from: jest.fn().mockReturnThis(),
            where: jest.fn().mockReturnThis(),
            limit: jest.fn().mockResolvedValue([]),
            insert: jest.fn().mockReturnThis(),
            values: jest.fn().mockReturnThis(),
            returning: jest.fn().mockResolvedValue([{ id: 'test-id' }]),
            update: jest.fn().mockReturnThis(),
            set: jest.fn().mockReturnThis(),
            execute: jest.fn().mockResolvedValue([{ balance: '100.00' }]),
        };

        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PaymentService,
                { provide: 'DRIZZLE', useValue: mockDb },
                { provide: ConfigService, useValue: { get: jest.fn() } },
                { provide: EncryptionService, useValue: { encrypt: jest.fn(), maskAccountNumber: jest.fn() } },
                { provide: ExchangeRateService, useValue: { getUsdToNgnRate: jest.fn().mockResolvedValue(1500) } },
            ],
        }).compile();

        service = module.get<PaymentService>(PaymentService);
    });

    describe('creditTopUp', () => {
        it('should prevent duplicate credits', async () => {
            // Mock existing transaction
            mockDb.limit.mockResolvedValueOnce([{ id: 'existing' }]);

            await service.creditTopUp('user1', 10, 'ref123', 'NGN');

            // Should not insert new transaction
            expect(mockDb.insert).not.toHaveBeenCalled();
        });

        it('should credit balance and log transaction', async () => {
            mockDb.limit.mockResolvedValueOnce([]); // No existing transaction

            await service.creditTopUp('user1', 10, 'ref123', 'NGN');

            expect(mockDb.execute).toHaveBeenCalled();
            expect(mockDb.insert).toHaveBeenCalled();
        });
    });

    describe('requestWithdrawalWithLocking', () => {
        it('should enforce minimum withdrawal amount', async () => {
            await expect(
                service.requestWithdrawalWithLocking('user1', 2, '044', '1234567890', 'John Doe', 'key1')
            ).rejects.toThrow('Minimum withdrawal is $5');
        });

        it('should enforce daily withdrawal limit', async () => {
            // Mock high daily total
            mockDb.execute.mockResolvedValueOnce([{ total: '9.00' }]); // payout_requests
            mockDb.execute.mockResolvedValueOnce([{ total: '0.00' }]); // withdrawals

            await expect(
                service.requestWithdrawalWithLocking('user1', 5, '044', '1234567890', 'John Doe', 'key1')
            ).rejects.toThrow('Daily withdrawal limit');
        });

        it('should return existing request for duplicate idempotency key', async () => {
            mockDb.limit.mockResolvedValueOnce([{
                id: 'existing-id',
                paystackReference: 'ref123',
                status: 'pending'
            }]);

            const result = await service.requestWithdrawalWithLocking(
                'user1', 10, '044', '1234567890', 'John Doe', 'duplicate-key'
            );

            expect(result.payoutRequestId).toBe('existing-id');
        });
    });
});
```

### Integration Test for Webhook

```typescript
// services/api/src/payments/payment.controller.spec.ts

describe('PaymentController Webhook', () => {
    it('should verify Paystack signature', async () => {
        const payload = { event: 'charge.success', data: {} };
        const rawBody = Buffer.from(JSON.stringify(payload));
        const secret = 'test-secret';

        const hash = crypto
            .createHmac('sha512', secret)
            .update(rawBody)
            .digest('hex');

        // Valid signature should pass
        expect(controller.verifyPaystackSignature(rawBody, hash)).toBe(true);

        // Invalid signature should fail
        expect(controller.verifyPaystackSignature(rawBody, 'invalid')).toBe(false);
    });

    it('should handle charge.success event', async () => {
        const payload = {
            event: 'charge.success',
            data: {
                reference: 'ref123',
                amount: 150000, // 1500 NGN in kobo
                currency: 'NGN',
                metadata: { user_id: 'user1', usd_amount: 1 },
            },
        };

        await controller.handlePaystackWebhook(req, validSignature, payload);

        expect(paymentService.creditTopUp).toHaveBeenCalledWith(
            'user1', 1, 'ref123', 'NGN'
        );
    });
});
```

---

## Environment Configuration for Testing

```bash
# .env.test
NODE_ENV=test
PAYSTACK_SECRET_KEY=sk_test_xxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxx
PAYSTACK_TEST_MODE=true

# Use test database
DATABASE_URL=postgresql://user:pass@localhost:5432/lingualink_test

# Mock encryption key
ENCRYPTION_KEY=0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef

# Test admin password
ADMIN_MASTER_PASSWORD=test_admin_password
```

---

## Deployment Checklist

Before deploying payment system updates:

- [ ] Run all unit tests: `npm run test:payments`
- [ ] Run integration tests: `npm run test:e2e`
- [ ] Verify Paystack test transactions work
- [ ] Test webhook locally with ngrok
- [ ] Backup database before migration
- [ ] Apply schema migrations
- [ ] Update environment variables
- [ ] Configure webhook URL in Paystack dashboard
- [ ] Test one real transaction in production (small amount)
- [ ] Monitor logs for first 24 hours
- [ ] Verify audit logs are capturing actions

---

**Document End**
