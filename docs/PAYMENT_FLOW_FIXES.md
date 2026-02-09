# Payment Flow Fixes - 2026-01-26

## Summary

This document details the critical fixes applied to the payment flow to ensure atomicity, idempotency, and data consistency.

## Issues Fixed

### 🔴 CRITICAL FIX 1: Database Transaction Wrapping

**Problem**: Multi-step financial operations could partially fail, leaving the database in an inconsistent state.

**Fixed Methods in `payment.service.ts`**:

| Method | Operations | Now Atomic |
|--------|-----------|------------|
| `creditTopUp()` | Balance update + Transaction log | ✅ |
| `requestWithdrawal()` | Balance check + Deduction + Withdrawal record + Transaction log | ✅ |
| `markWithdrawalComplete()` | Status update | ✅ |
| `markWithdrawalFailed()` | Status update + Balance refund + Transaction log | ✅ |
| `requestWithdrawalWithLocking()` | Balance check + Lock + Payout request + Transaction log | ✅ |
| `completePayoutRequest()` | Status update + Pending balance clear | ✅ |
| `failPayoutRequest()` | Status update + Balance refund + Transaction log | ✅ |

| `failPayoutRequest()` | Status update + Balance refund + Transaction log | ✅ |

### 🔒 SECURITY ENHANCEMENTS

**1. Encrypted Bank Details**
- **Service**: `EncryptionService` (AES-256-CBC)
- **Feature**: Encrypts bank account numbers before storing in DB.
- **Storage**: `encryptedAccountNumber` (Ciphertext) + `accountNumber` (Masked Last 4)

**2. Daily Withdrawal Limits**
- **Feature**: STRICT limit of **$10.00** per day per user.
- **Check**: Aggregates all withdrawal requests from the past 24 hours.

**3. Live Exchange Rates**
- **Service**: `ExchangeRateService`
- **Logic**: 
  1. Checks Cache (1 hour TTL)
  2. Fetches from Live APIs (exchangerate.host, etc.)
  3. Fallback to Env Variable (`USD_TO_NGN_RATE`)
  4. Final Fallback to hardcoded safe rate (1500)

### 🔴 CRITICAL FIX 2: SELECT FOR UPDATE Inside Transaction

**Problem**: The `SELECT FOR UPDATE` was not inside an actual database transaction, making the row lock meaningless.

**Fix**: Moved the entire `requestWithdrawalWithLocking()` operation into a `db.transaction()` block, ensuring the row lock is held for the duration of the transaction.

```typescript
// BEFORE (BROKEN)
const lockResult = await this.db.execute(sql`SELECT ... FOR UPDATE`);
// Lock released immediately!
await this.db.execute(sql`UPDATE profiles SET balance = ...`);

// AFTER (FIXED)
await this.db.transaction(async (tx) => {
    const lockResult = await tx.execute(sql`SELECT ... FOR UPDATE`);
    // Lock held for entire transaction!
    await tx.execute(sql`UPDATE profiles SET balance = ...`);
    await tx.insert(schema.transactions).values({...});
}); // Lock released only after commit
```

### 🟡 IMPROVEMENT: Enhanced Exchange Rate Handling

**Problem**: Hardcoded exchange rate in webhook handler inconsistent with initialization.

**Fix**: Updated `payment.controller.ts` to use the exchange rate stored in payment metadata during initialization.

```typescript
// Use stored rate for consistency
const exchangeRate = (data.metadata as any)?.exchange_rate || 1500;
const usdAmountFromMetadata = (data.metadata as any)?.usd_amount;

// Prefer original USD amount if stored
if (usdAmountFromMetadata) {
    amountUsd = usdAmountFromMetadata;
}
```

### 🟡 IMPROVEMENT: Callback URL from Environment

**Problem**: Hardcoded callback URL.

**Fix**: Now reads from `PAYMENT_CALLBACK_URL` environment variable with fallback.

```typescript
callback_url: this.configService.get<string>('PAYMENT_CALLBACK_URL') || 'https://lingualink-app.com/payment/callback',
```

## Idempotency Checks Added

All webhook handlers and financial operations now include idempotency checks **within the transaction**:

1. **Top-up**: Checks if reference already exists in transactions table
2. **Withdrawal with Locking**: Checks idempotency key before processing
3. **Complete Payout**: Checks if already marked as completed
4. **Fail Payout**: Checks if already marked as failed/refunded

## Logging Improvements

All transactional operations now use `[TX]` prefix for easier debugging:

```
[TX] Credited 10.00 to user-123 (ref: PAY_abc123)
[TX] Withdrawal initiated with fund lock: WD-abc12345-1706252285 - $50.00
[TX FAILED] creditTopUp for user-123, ref: PAY_abc123: Error: ...
```

## Testing Recommendations

1. **Test concurrent withdrawals**: Two simultaneous withdrawal requests for the same user should not both succeed if insufficient balance.

2. **Test duplicate webhooks**: Send the same Paystack webhook twice - only one should credit the user.

3. **Test partial failures**: Simulate database failure after balance update but before transaction log insert - the transaction should rollback entirely.

## Environment Variables

Ensure these are configured:

```env
# Payment Gateway
PAYSTACK_SECRET_KEY=sk_live_xxx
PAYMENT_CALLBACK_URL=https://your-app.com/payment/callback

# Exchange Rate
USD_TO_NGN_RATE=1500
```

## Next Steps (Remaining Issues)

1. **🟡 HIGH**: Encrypt bank account numbers at rest
2. **🟡 HIGH**: Implement daily withdrawal limits
3. **🟡 MEDIUM**: Add live exchange rate fetching
4. **🟢 LOW**: Remove unused `userId` parameter from frontend API calls
