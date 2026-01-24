# 🔍 LinguaLink Code Review Report

**Reviewer**: AI Code Reviewer  
**Date**: 2026-01-21  
**Scope**: Full codebase (Mobile App + NestJS Backend)  
**Overall Grade**: **B+** (Good with Notable Improvements Needed)

---

## 📊 Executive Summary

| Category | Rating | Notes |
|:---------|:------:|:------|
| **Architecture** | ⭐⭐⭐⭐ | Clean separation, hybrid Supabase/NestJS approach |
| **Security** | ⭐⭐⭐ | Good patterns but critical gaps in auth |
| **Code Quality** | ⭐⭐⭐⭐ | Consistent patterns, good TypeScript usage |
| **Error Handling** | ⭐⭐⭐ | Present but inconsistent |
| **Performance** | ⭐⭐⭐⭐ | Good caching, batching implemented |
| **Testing** | ⭐⭐ | Minimal test coverage |
| **Documentation** | ⭐⭐⭐⭐ | Excellent task docs and guides |

---

## 🔴 CRITICAL ISSUES (Must Fix Before Production)

### 1. **Security: `x-user-id` Header is Spoofable**
**Severity**: 🔴 CRITICAL  
**Location**: All NestJS controllers

**Problem**: The backend trusts the `x-user-id` header from the client without validating the JWT token.

```typescript
// ❌ CURRENT (INSECURE)
@Post('validate')
async submitValidation(
    @Headers('x-user-id') userId: string,  // Anyone can send any user ID!
    @Body() dto: SubmitValidationDto,
) {
    // ...
}
```

**Risk**: Any attacker can:
- Credit money to any user
- Submit validations as any user
- Access any user's data

**Fix**: 
```typescript
// ✅ SECURE: Extract user ID from verified JWT
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';

@Post('validate')
@UseGuards(JwtAuthGuard)
async submitValidation(
    @CurrentUser() user: User,  // Extracted from verified JWT
    @Body() dto: SubmitValidationDto,
) {
    const userId = user.id; // Trusted!
    // ...
}
```

**Files to Update**:
- `monetization.controller.ts` (12 endpoints)
- `withdrawal.controller.ts` (4 endpoints)
- `moderation.controller.ts` (6 endpoints)
- `ambassador.controller.ts` (3 endpoints)
- `admin.controller.ts` (5 endpoints)
- `bank.controller.ts` (4 endpoints)
- `top-up.controller.ts` (1 endpoint)

---

### 2. **Security: Missing Admin Role Verification**
**Severity**: 🔴 CRITICAL  
**Location**: `admin.controller.ts`, `moderation.controller.ts`

**Problem**: Admin endpoints don't verify the user has admin privileges.

```typescript
// ❌ CURRENT
@Post('rates')
async createRewardRate(
    @Headers('x-user-id') userId: string,  // Any user can create rates!
    @Body() dto: CreateRateDto,
) { }
```

**Fix**:
```typescript
// ✅ SECURE
@Post('rates')
@UseGuards(JwtAuthGuard, AdminGuard)
async createRewardRate(
    @CurrentUser() admin: AdminUser,
    @Body() dto: CreateRateDto,
) { }
```

---

### 3. **Security: Bank Account Number Stored in Plain Text**
**Severity**: 🟠 HIGH  
**Location**: `withdrawals` table, `payoutRequests` table

**Problem**: Full account numbers are stored, violating PCI-DSS-like principles.

```typescript
// schema.ts
accountNumber: text('account_number').notNull(), // Full number stored!
```

**Fix**: Only store last 4 digits + a tokenized reference from Paystack.
```typescript
accountNumberLast4: text('account_number_last_4'),
paystackRecipientCode: text('paystack_recipient_code'), // Use this for transfers
```

---

### 4. **Race Condition: Non-Atomic Consensus Processing**
**Severity**: 🟠 HIGH  
**Location**: `consensus.service.ts` lines 115-194

**Problem**: Database operations are not wrapped in a transaction.

```typescript
// ❌ CURRENT - Multiple separate operations
await this.db.update(schema.voiceClips).set({ status: 'approved' });  // Step 1
const clip = await this.db.select().from(schema.voiceClips);           // Step 2
for (const validatorId of agreers) {
    await this.payoutService.creditValidatorReward(validatorId);       // Step 3, 4, 5...
}
```

**Risk**: If any step fails, previous steps are not rolled back → inconsistent state.

**Fix**:
```typescript
// ✅ CORRECT - Wrap in transaction
await this.db.transaction(async (tx) => {
    await tx.update(schema.voiceClips).set({ status: 'approved' });
    // ... all operations inside transaction
});
```

---

## 🟠 HIGH PRIORITY ISSUES

### 5. **Missing Rate Limiting**
**Location**: All API endpoints

**Problem**: No rate limiting on any endpoint.

**Risk**:
- Brute force attacks on validation submissions
- DoS attacks
- Wallet balance manipulation attempts

**Fix**: Add global rate limiting
```typescript
// main.ts
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';

@Module({
  imports: [
    ThrottlerModule.forRoot({ ttl: 60, limit: 100 }),
  ],
})
export class AppModule {}
```

---

### 6. **Hardcoded Currency Conversion**
**Location**: `payment.service.ts` line 48, `payment.controller.ts` line 124

```typescript
// ❌ CURRENT
const amountKobo = Math.round(amount * 1500 * 100);  // 1 USD = 1500 NGN hardcoded
```

**Problem**: Exchange rates change daily.

**Fix**: Use a currency API or store rates in config/database.

---

### 7. **Missing Input Validation**
**Location**: Multiple controllers

**Problem**: DTOs exist but many endpoints don't validate input properly.

```typescript
// ❌ No validation on amount
async initializeTopUp(userId: string, amount: number, email: string) {
    // What if amount is negative? What if it's 1 billion?
}
```

**Fix**: Add proper validation decorators
```typescript
class InitializeTopUpDto {
    @IsNumber()
    @Min(1)
    @Max(10000)
    amount: number;

    @IsEmail()
    email: string;
}
```

---

### 8. **Potential Double-Spend on Remix Royalties**
**Location**: `consensus.service.ts` lines 160-176

**Problem**: If `processRemixRoyalty` is called twice for the same clip, royalties are paid twice.

**Fix**: Add idempotency check before processing royalties.

---

## 🟡 MEDIUM PRIORITY ISSUES

### 9. **Memory Leak: Supabase Channel Not Cleaned Up**
**Location**: `LiveStreamingScreen.tsx` line 198

```typescript
// ⚠️ May not clean up properly on fast unmount
return () => { supabase.removeChannel(channel); };
```

**Fix**: Store channel reference in ref and ensure cleanup.

---

### 10. **Missing Error Boundaries**
**Location**: Mobile app

**Problem**: No React error boundaries. Crashes show blank screen.

**Fix**: Add ErrorBoundary component wrapping main app.

---

### 11. **Console Logs in Production**
**Location**: Multiple files

```typescript
console.log('[Analytics] Event tracked:', eventName, properties);
console.error('MonetizationApi.submitValidation error:', error);
```

**Fix**: Use proper logging library with log levels (debug, info, warn, error).

---

### 12. **Inconsistent Error Messages**
**Location**: Various

Some errors expose internal details:
```typescript
throw new Error(`Server error: ${errText}`);  // May leak stack traces
```

**Fix**: Sanitize error messages for production.

---

## 🟢 GOOD PRACTICES OBSERVED ✅

### 1. **Excellent Webhook Security**
`payment.controller.ts` properly verifies Paystack webhooks with HMAC-SHA512.

```typescript
✅ private verifyPaystackSignature(rawBody: Buffer, signature: string): boolean {
    const hash = crypto.createHmac('sha512', this.paystackSecret).update(rawBody).digest('hex');
    return hash === signature;
}
```

### 2. **Idempotency in Payments**
`creditTopUp` checks for duplicate references before crediting.

```typescript
✅ const existingTx = await this.db.select().from(schema.transactions)
    .where(eq(schema.transactions.referenceId, reference));
if (existingTx.length > 0) return; // Skip duplicate
```

### 3. **Trust Score Bounds**
Trust scores are properly clamped to min/max values.

```typescript
✅ SET trust_score = LEAST(GREATEST(trust_score + delta, ${TRUST_SCORE_MIN}), ${TRUST_SCORE_MAX})
```

### 4. **Fund Locking Pattern**
`requestWithdrawalWithLocking` uses SELECT FOR UPDATE to prevent race conditions.

```typescript
✅ SELECT id, balance, pending_balance FROM profiles WHERE id = ${userId} FOR UPDATE
```

### 5. **Analytics Integration**
PostHog is properly integrated on both client and server with consistent event names.

### 6. **Clean Schema Design**
Drizzle schema is well-organized with proper types and defaults.

### 7. **Type Safety**
Good TypeScript usage throughout with interfaces and type annotations.

---

## 📋 Action Items Summary

| Priority | Issue | Effort | Impact |
|:---------|:------|:------:|:------:|
| 🔴 P0 | Replace x-user-id with JWT verification | 4h | Critical |
| 🔴 P0 | Add AdminGuard to admin endpoints | 2h | Critical |
| 🔴 P0 | Wrap consensus in transaction | 2h | Critical |
| 🟠 P1 | Encrypt/remove full account numbers | 2h | High |
| 🟠 P1 | Add rate limiting | 1h | High |
| 🟠 P1 | Fix currency conversion | 2h | High |
| 🟡 P2 | Add input validation | 3h | Medium |
| 🟡 P2 | Add error boundaries | 1h | Medium |
| 🟡 P2 | Remove console logs | 1h | Medium |
| 🟢 P3 | Add comprehensive tests | 8h+ | Long-term |

---

## 🎯 Recommended Next Steps

1. **Immediate** (Before any public testing):
   - Implement JWT-based authentication for all API endpoints
   - Add AdminGuard to admin routes
   - Wrap consensus logic in database transaction

2. **Before Beta**:
   - Add rate limiting
   - Fix currency conversion logic
   - Add input validation

3. **Before Production**:
   - Comprehensive test suite
   - Security audit by external firm
   - Error monitoring (Sentry)

---

*This review was conducted as of 2026-01-21. Code may have changed since.*
