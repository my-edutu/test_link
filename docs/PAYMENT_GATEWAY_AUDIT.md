# LinguaLink Payment Gateway Audit & Implementation Guide

**Document Version:** 1.0
**Audit Date:** January 31, 2026
**Auditor:** Payment Gateway Architecture Review
**Status:** Comprehensive Assessment

---

## Executive Summary

LinguaLink has a **well-architected payment system** with Paystack integration. The core infrastructure is solid, but several critical components need attention before production deployment.

### Overall Health Score: **75/100**

| Category | Status | Score |
|----------|--------|-------|
| Backend Architecture | Excellent | 90/100 |
| Security Implementation | Good | 80/100 |
| Frontend Integration | Good | 75/100 |
| Webhook Handling | Excellent | 90/100 |
| Admin Panel | Good | 75/100 |
| Production Readiness | Needs Work | 55/100 |
| Testing Coverage | Critical Gap | 40/100 |

---

## Section 1: Current System Architecture

### 1.1 Payment Flow Overview

```
USER EARNINGS FLOW:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Task   │────▶│ Validation   │────▶│ Consensus   │
│ (Voice/etc) │     │ Submission   │     │ Check (3)   │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                    ┌──────────────┐             ▼
                    │ Transaction  │◀────┌─────────────┐
                    │ Log Created  │     │ Payout Svc  │
                    └──────────────┘     │ Credits $   │
                                         └──────┬──────┘
                                                │
                    ┌──────────────┐            ▼
                    │ Balance      │◀────┌─────────────┐
                    │ Updated      │     │ Ledger Svc  │
                    └──────────────┘     └─────────────┘

WITHDRAWAL FLOW:
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ User Request│────▶│ Bank Verify  │────▶│ Fund Lock   │
│ Withdrawal  │     │ via Paystack │     │ Balance-=X  │
└─────────────┘     └──────────────┘     │ Pending+=X  │
                                         └──────┬──────┘
                                                │
                    ┌──────────────┐            ▼
                    │ Admin Review │◀────┌─────────────┐
                    │ Panel        │     │ Payout Req  │
                    └──────┬───────┘     │ Created     │
                           │             └─────────────┘
         ┌─────────────────┼─────────────────┐
         ▼                 ▼                 ▼
┌─────────────┐   ┌──────────────┐   ┌─────────────┐
│ Auto        │   │ Manual       │   │ Reject      │
│ Paystack    │   │ Confirm      │   │ + Refund    │
│ Transfer    │   │              │   │             │
└──────┬──────┘   └──────┬───────┘   └──────┬──────┘
       │                 │                  │
       ▼                 ▼                  ▼
┌─────────────────────────────────────────────────┐
│             Webhook Handler                      │
│  transfer.success → Complete Payout              │
│  transfer.failed  → Refund User                  │
└─────────────────────────────────────────────────┘
```

### 1.2 Technology Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Backend | NestJS + TypeScript | API Server |
| Database | PostgreSQL + Drizzle ORM | Data Storage |
| Payment Gateway | Paystack | Payments |
| Frontend | React Native + Expo | Mobile App |
| Auth | Clerk | User Authentication |
| Encryption | AES-256-CBC | Sensitive Data |

---

## Section 2: Component Analysis

### 2.1 Backend Payment Services

#### PaymentService (`services/api/src/payments/payment.service.ts`)

**Status:** Fully Implemented

| Method | Status | Notes |
|--------|--------|-------|
| `initializeTopUp()` | Working | Paystack integration complete |
| `creditTopUp()` | Working | Idempotency checks in place |
| `requestWithdrawal()` | Working | Legacy method, still functional |
| `requestWithdrawalWithLocking()` | Working | Modern fund-locking approach |
| `checkDailyWithdrawalLimit()` | Working | $10/day limit enforced |
| `completePayoutRequest()` | Working | Webhook handler ready |
| `failPayoutRequest()` | Working | Auto-refund on failure |
| `getBalanceSummary()` | Working | Returns available + pending |

**Security Features:**
- Database transactions for atomicity
- Idempotency key prevents duplicates
- Account number encryption (AES-256-CBC)
- Row-level locking during balance updates

#### AdminPayoutService (`services/api/src/admin/admin-payout.service.ts`)

**Status:** Fully Implemented

| Method | Status | Notes |
|--------|--------|-------|
| `getPendingPayouts()` | Working | Paginated, masked accounts |
| `getPayoutDetailsWithDecryptedAccount()` | Working | Password protected |
| `markPayoutAsProcessed()` | Working | Status update |
| `markPayoutAsCompleted()` | Working | Releases locked funds |
| `rejectAndRefundPayout()` | Working | Full refund flow |
| `processPayoutViaPaystack()` | Working | Automated bank transfer |
| `verifyAdminPassword()` | Working | Master password check |
| `logAuditEvent()` | Working | Compliance logging |

### 2.2 Webhook Handling

#### PaymentController (`services/api/src/payments/payment.controller.ts`)

**Status:** Fully Implemented

| Event | Handler | Status |
|-------|---------|--------|
| `charge.success` | `handleChargeSuccess()` | Working - Credits balance |
| `transfer.success` | `handleTransferSuccess()` | Working - Completes payout |
| `transfer.failed` | `handleTransferFailed()` | Working - Refunds user |
| `transfer.reversed` | `handleTransferReversed()` | Working - Refunds user |

**Security:**
- HMAC SHA512 signature verification
- Raw body parsing for accurate signature
- User ID extracted from metadata

### 2.3 Database Schema

**Status:** Comprehensive

| Table | Purpose | Status |
|-------|---------|--------|
| `profiles` | User balance, pending_balance, bank details | Complete |
| `transactions` | Full audit trail | Complete |
| `withdrawals` | Legacy withdrawal tracking | Complete |
| `payout_requests` | Modern withdrawal with idempotency | Complete |
| `linked_bank_accounts` | Encrypted bank storage | Complete |
| `audit_logs` | Admin action logging | Complete |
| `reward_rates` | Configurable reward amounts | Complete |

### 2.4 Frontend Screens

#### WithdrawalScreen (`src/screens/WithdrawalScreen.tsx`)

**Status:** Functional with minor issues

| Feature | Status | Notes |
|---------|--------|-------|
| Bank list fetching | Working | From Paystack API |
| Account verification | Working | Paystack resolve API |
| Linked bank display | Working | Shows masked account |
| Balance display | Working | Available + pending |
| Step-by-step flow | Working | Bank → Amount → Confirm |
| Withdrawal submission | Working | Creates payout request |

**Issues Found:**
- Line 282-283: Orphaned code fragments (syntax error)
- Currency symbol shows ₦ but backend uses USD
- Minimum amount validation inconsistent ($5 backend vs ₦500 frontend)

#### AdminPayoutScreen (`src/screens/AdminPayoutScreen.tsx`)

**Status:** Fully Functional

| Feature | Status |
|---------|--------|
| Pending payouts list | Working |
| View masked accounts | Working |
| Password-protected decrypt | Working |
| Auto Paystack transfer | Working |
| Manual process flow | Working |
| Reject with refund | Working |

---

## Section 3: Gap Analysis

### 3.1 Critical Gaps (Must Fix Before Production)

| # | Gap | Risk Level | Impact |
|---|-----|------------|--------|
| 1 | No webhook endpoint exposed publicly | Critical | Payments won't complete |
| 2 | Exchange rate service not tested | High | Currency conversion errors |
| 3 | Missing retry logic for failed Paystack calls | High | Lost transactions |
| 4 | No test mode toggle | High | Can't test without real money |
| 5 | Currency mismatch (USD vs NGN) in UI | High | User confusion |
| 6 | Admin password is plaintext comparison | Critical | Security vulnerability |
| 7 | No rate limiting on webhook endpoint | Medium | DoS vulnerability |

### 3.2 Missing Features

| # | Feature | Priority | Effort |
|---|---------|----------|--------|
| 1 | Email notifications on withdrawal status | High | Medium |
| 2 | Push notifications for payment events | High | Medium |
| 3 | Transaction export (CSV/PDF) | Medium | Low |
| 4 | Multi-currency support | Low | High |
| 5 | Recurring/scheduled payouts | Low | High |
| 6 | Analytics dashboard | Medium | Medium |
| 7 | Refund request from user side | Medium | Medium |

### 3.3 Security Improvements Needed

| # | Issue | Current State | Recommended |
|---|-------|---------------|-------------|
| 1 | Admin password | Plaintext in env | bcrypt hashed per-admin |
| 2 | Encryption key | Single key | Key rotation support |
| 3 | Webhook IP whitelist | Not implemented | Paystack IP range only |
| 4 | API rate limiting | Partial | Comprehensive rate limits |
| 5 | Audit log retention | 7 days | 90 days minimum |
| 6 | PCI compliance | Not assessed | Compliance audit |

---

## Section 4: Recommended Action Plan

### Phase 1: Production Readiness (Week 1-2)

#### 1.1 Fix Critical Issues

```typescript
// Issue: Admin password plaintext comparison
// File: services/api/src/admin/admin-payout.service.ts

// CURRENT (Line 68):
if (password !== masterAdminPassword) {
    throw new ForbiddenException('Invalid admin password');
}

// RECOMMENDED:
import * as bcrypt from 'bcrypt';

// Store hashed password per admin in database
const isValid = await bcrypt.compare(password, admin.passwordHash);
if (!isValid) {
    throw new ForbiddenException('Invalid admin password');
}
```

#### 1.2 Configure Webhook URL

```bash
# Paystack Dashboard > Settings > API Keys & Webhooks
# Set webhook URL to:
https://your-api-domain.com/webhooks/paystack

# Required environment variables:
PAYSTACK_SECRET_KEY=sk_live_xxxxx
PAYSTACK_PUBLIC_KEY=pk_live_xxxxx
PAYMENT_CALLBACK_URL=https://your-app.com/payment/callback
```

#### 1.3 Add Webhook IP Whitelist

```typescript
// Create middleware: services/api/src/common/paystack-ip.guard.ts

const PAYSTACK_IPS = [
    '52.31.139.75',
    '52.49.173.169',
    '52.214.14.220',
];

@Injectable()
export class PaystackIpGuard implements CanActivate {
    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const clientIp = request.ip || request.connection.remoteAddress;
        return PAYSTACK_IPS.includes(clientIp);
    }
}
```

### Phase 2: Currency & UI Fixes (Week 2-3)

#### 2.1 Standardize Currency Display

```typescript
// Create: src/utils/currency.ts

export const formatCurrency = (amount: number, currency: 'USD' | 'NGN' = 'USD') => {
    if (currency === 'USD') {
        return `$${amount.toFixed(2)}`;
    }
    return `₦${amount.toLocaleString('en-NG', { minimumFractionDigits: 2 })}`;
};

// Create live rate display component
export const CurrencyDisplay: React.FC<{ amountUSD: number }> = ({ amountUSD }) => {
    const [rateNGN, setRateNGN] = useState<number | null>(null);

    useEffect(() => {
        // Fetch live rate from backend
        monetizationApi.getAppConfig<number>('USD_NGN_RATE')
            .then(setRateNGN);
    }, []);

    return (
        <View>
            <Text style={styles.usdAmount}>${amountUSD.toFixed(2)}</Text>
            {rateNGN && (
                <Text style={styles.ngnEquivalent}>
                    ≈ ₦{(amountUSD * rateNGN).toLocaleString()}
                </Text>
            )}
        </View>
    );
};
```

#### 2.2 Fix WithdrawalScreen Syntax Error

```typescript
// File: src/screens/WithdrawalScreen.tsx
// Lines 281-283 contain orphaned code:

// CURRENT (broken):
</View>
style={styles.amountInput}
placeholder="0.00"

// REMOVE these orphaned lines (282-283)
```

### Phase 3: Notifications & Monitoring (Week 3-4)

#### 3.1 Add Payment Notifications

```typescript
// services/api/src/payments/payment.service.ts

async creditTopUp(userId: string, amount: number, reference: string, currency: string) {
    // ... existing credit logic ...

    // Add notification trigger
    await this.notificationService.send(userId, {
        title: 'Wallet Top-Up Successful',
        body: `$${amount.toFixed(2)} has been added to your wallet`,
        data: { type: 'TOP_UP_SUCCESS', reference },
    });
}

async completePayoutRequest(reference: string) {
    // ... existing completion logic ...

    // Add notification
    await this.notificationService.send(payoutRequest.userId, {
        title: 'Withdrawal Completed',
        body: `$${amount.toFixed(2)} has been sent to your bank account`,
        data: { type: 'WITHDRAWAL_SUCCESS', reference },
    });
}

async failPayoutRequest(reference: string, reason: string) {
    // ... existing failure logic ...

    // Add notification
    await this.notificationService.send(payoutRequest.userId, {
        title: 'Withdrawal Failed',
        body: `Your withdrawal was refunded. Reason: ${reason}`,
        data: { type: 'WITHDRAWAL_FAILED', reference, reason },
    });
}
```

#### 3.2 Add Payment Analytics

```typescript
// services/api/src/analytics/payment-analytics.service.ts

@Injectable()
export class PaymentAnalyticsService {
    async getDailyStats(date: Date) {
        return {
            topUps: await this.countTopUps(date),
            withdrawals: await this.countWithdrawals(date),
            totalVolume: await this.calculateVolume(date),
            failureRate: await this.calculateFailureRate(date),
        };
    }

    async getMonthlyReport(year: number, month: number) {
        // Aggregate monthly payment data
    }
}
```

### Phase 4: Testing & Documentation (Week 4-5)

#### 4.1 Required Tests

```typescript
// services/api/src/payments/payment.service.spec.ts

describe('PaymentService', () => {
    describe('initializeTopUp', () => {
        it('should call Paystack with correct amount in kobo');
        it('should include user_id in metadata');
        it('should handle Paystack API errors gracefully');
    });

    describe('creditTopUp', () => {
        it('should prevent duplicate credits (idempotency)');
        it('should update balance atomically');
        it('should log transaction');
    });

    describe('requestWithdrawalWithLocking', () => {
        it('should enforce minimum withdrawal');
        it('should enforce daily limit');
        it('should lock funds in pending_balance');
        it('should reject duplicate idempotency keys');
    });

    describe('webhook handling', () => {
        it('should verify Paystack signature');
        it('should reject invalid signatures');
        it('should handle transfer.success');
        it('should handle transfer.failed with refund');
    });
});
```

#### 4.2 Test Mode Configuration

```typescript
// services/api/src/config/payment.config.ts

export const paymentConfig = () => ({
    paystack: {
        secretKey: process.env.PAYSTACK_SECRET_KEY,
        publicKey: process.env.PAYSTACK_PUBLIC_KEY,
        testMode: process.env.PAYSTACK_TEST_MODE === 'true',
        baseUrl: process.env.PAYSTACK_TEST_MODE === 'true'
            ? 'https://api.paystack.co' // Same URL, different keys
            : 'https://api.paystack.co',
    },
    limits: {
        minWithdrawal: 5.0,
        maxWithdrawal: 10000.0,
        dailyWithdrawalLimit: 10.0,
        minTopUp: 1.0,
        maxTopUp: 10000.0,
    },
});
```

---

## Section 5: Environment Variables

### 5.1 Required Variables

```bash
# ======================
# PAYSTACK CONFIGURATION
# ======================

# Test Keys (for development)
PAYSTACK_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxxx
PAYSTACK_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxxxxxxx

# Live Keys (for production)
# PAYSTACK_SECRET_KEY=sk_live_xxxxxxxxxxxxxxxxxxxxx
# PAYSTACK_PUBLIC_KEY=pk_live_xxxxxxxxxxxxxxxxxxxxx

# Toggle test mode
PAYSTACK_TEST_MODE=true

# Callback URL after payment
PAYMENT_CALLBACK_URL=https://your-app.com/payment/callback

# ======================
# ENCRYPTION
# ======================

# 32-byte hex string for AES-256 encryption
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
ENCRYPTION_KEY=your_64_character_hex_string_here

# ======================
# ADMIN SECURITY
# ======================

# Master admin password (temporary - migrate to per-admin passwords)
ADMIN_MASTER_PASSWORD=your_secure_password_here

# ======================
# EXCHANGE RATES
# ======================

# Fallback rate if API fails
USD_TO_NGN_RATE=1500

# Optional: Premium exchange rate API
EXCHANGE_RATE_API_KEY=your_api_key_here

# ======================
# DATABASE
# ======================

DATABASE_URL=postgresql://user:password@host:5432/lingualink
```

### 5.2 Optional Variables

```bash
# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=30

# Audit log retention (days)
AUDIT_LOG_RETENTION_DAYS=90

# Webhook timeout (ms)
WEBHOOK_TIMEOUT_MS=30000
```

---

## Section 6: Paystack Dashboard Configuration

### 6.1 Webhook Setup

1. Log into [Paystack Dashboard](https://dashboard.paystack.com)
2. Navigate to **Settings** > **API Keys & Webhooks**
3. Set **Webhook URL**: `https://your-api.com/webhooks/paystack`
4. Ensure these events are enabled:
   - `charge.success`
   - `transfer.success`
   - `transfer.failed`
   - `transfer.reversed`

### 6.2 Transfer Settings

1. Go to **Settings** > **Preferences**
2. Enable **Bank Transfers**
3. Verify your business for higher limits

### 6.3 Test Mode

1. Toggle **Test Mode** in dashboard
2. Use test cards:
   - Success: `4084 0841 8411 1111`
   - Failure: `4084 0841 8411 1114`
   - PIN required: `5060 6666 6666 6666 666`

---

## Section 7: Monitoring & Alerts

### 7.1 Key Metrics to Monitor

| Metric | Threshold | Alert |
|--------|-----------|-------|
| Top-up success rate | < 95% | Warning |
| Withdrawal completion rate | < 90% | Critical |
| Webhook response time | > 5s | Warning |
| Daily withdrawal volume | > $10,000 | Info |
| Failed transactions | > 10/hour | Warning |
| Refund rate | > 5% | Critical |

### 7.2 Recommended Monitoring Tools

- **Sentry**: Error tracking
- **Datadog/Grafana**: Metrics dashboard
- **PagerDuty**: Alert management
- **Paystack Dashboard**: Transaction monitoring

---

## Section 8: Compliance Checklist

### 8.1 Before Launch

- [ ] PCI DSS self-assessment completed
- [ ] Privacy policy includes payment data handling
- [ ] Terms of service include refund policy
- [ ] Encryption key stored securely (not in repo)
- [ ] Webhook endpoint protected with signature verification
- [ ] Admin access requires strong authentication
- [ ] Audit logs enabled and retained
- [ ] Data backup strategy in place

### 8.2 Ongoing Requirements

- [ ] Monthly transaction reconciliation
- [ ] Quarterly security review
- [ ] Annual PCI compliance review
- [ ] Regular encryption key rotation
- [ ] Audit log review for suspicious activity

---

## Section 9: Troubleshooting Guide

### 9.1 Common Issues

#### Webhook Not Receiving Events

```bash
# Check if endpoint is accessible
curl -X POST https://your-api.com/webhooks/paystack \
  -H "Content-Type: application/json" \
  -d '{"event":"test"}'

# Expected: 401 Unauthorized (signature missing)
```

**Solutions:**
1. Verify URL in Paystack dashboard
2. Check HTTPS certificate
3. Ensure firewall allows Paystack IPs
4. Check server logs for errors

#### Balance Not Updating After Payment

1. Check webhook logs
2. Verify `user_id` in payment metadata
3. Check for idempotency key conflicts
4. Verify database transaction completed

#### Withdrawal Stuck in "Processing"

1. Check Paystack transfer status
2. Verify webhook received `transfer.success`
3. Check for matching reference in database
4. Manually complete if webhook missed

### 9.2 Debug Mode

```typescript
// Enable verbose logging for debugging
// services/api/src/payments/payment.controller.ts

@Post('paystack')
async handlePaystackWebhook(...) {
    this.logger.debug('Webhook received:', JSON.stringify(payload, null, 2));
    this.logger.debug('Signature:', signature);
    // ...
}
```

---

## Section 10: Future Roadmap

### 10.1 Short Term (3 months)

- [ ] Per-admin password hashing
- [ ] Email notifications on payment events
- [ ] Transaction export feature
- [ ] Mobile push notifications
- [ ] Enhanced analytics dashboard

### 10.2 Medium Term (6 months)

- [ ] Multi-gateway support (Flutterwave backup)
- [ ] Scheduled/recurring payouts
- [ ] Wallet-to-wallet transfers
- [ ] Virtual card generation
- [ ] Referral bonus automation

### 10.3 Long Term (12 months)

- [ ] Multi-currency support
- [ ] Crypto payment integration
- [ ] White-label payment solution
- [ ] AI fraud detection
- [ ] Real-time balance sync

---

## Appendix A: API Endpoint Reference

### Payment Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| POST | `/payments/top-up` | JWT | Initialize top-up |
| POST | `/webhooks/paystack` | Signature | Webhook handler |
| GET | `/withdrawals/balance` | JWT | Get balance summary |
| POST | `/withdrawals` | JWT | Request withdrawal |
| GET | `/withdrawals` | JWT | Get withdrawal history |

### Bank Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/bank/list` | None | List Nigerian banks |
| POST | `/bank/resolve` | JWT | Verify bank account |
| POST | `/bank/link` | JWT | Link bank account |
| GET | `/bank/linked` | JWT | Get linked bank |
| DELETE | `/bank/unlink` | JWT | Remove linked bank |

### Admin Endpoints

| Method | Endpoint | Auth | Purpose |
|--------|----------|------|---------|
| GET | `/admin/payouts/pending` | Admin | List pending payouts |
| POST | `/admin/payouts/:id/details` | Admin + Password | Get full account |
| POST | `/admin/payouts/:id/process` | Admin + Password | Mark processing |
| POST | `/admin/payouts/:id/complete` | Admin | Complete payout |
| POST | `/admin/payouts/:id/reject` | Admin + Password | Reject + refund |
| POST | `/admin/payouts/:id/paystack-transfer` | Admin + Password | Auto transfer |

---

## Appendix B: Database Schema Reference

### Core Tables

```sql
-- Profiles (balance tracking)
profiles (
    id TEXT PRIMARY KEY,
    balance DECIMAL(10,2) DEFAULT 0,
    pending_balance DECIMAL(10,2) DEFAULT 0,
    total_earned DECIMAL(10,2) DEFAULT 0,
    trust_score INTEGER DEFAULT 100,
    validator_tier TEXT DEFAULT 'bronze',
    bank_name TEXT,
    bank_code TEXT,
    account_number_last_4 TEXT,
    account_name TEXT,
    is_admin BOOLEAN DEFAULT false
)

-- Payout Requests
payout_requests (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    idempotency_key TEXT UNIQUE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    bank_code TEXT NOT NULL,
    account_number TEXT NOT NULL, -- Masked
    encrypted_account_number TEXT, -- Encrypted
    account_name TEXT NOT NULL,
    status TEXT DEFAULT 'pending',
    paystack_transfer_code TEXT,
    paystack_reference TEXT,
    failure_reason TEXT,
    locked_amount DECIMAL(10,2),
    created_at TIMESTAMP DEFAULT now(),
    processed_at TIMESTAMP,
    completed_at TIMESTAMP
)

-- Transactions
transactions (
    id UUID PRIMARY KEY,
    user_id TEXT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    type TEXT NOT NULL, -- 'earning', 'withdrawal', 'refund', 'fund_lock', 'fund_unlock'
    category TEXT,
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP DEFAULT now()
)

-- Audit Logs
audit_logs (
    id UUID PRIMARY KEY,
    admin_id TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT,
    target_id TEXT,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT now()
)
```

---

## Appendix C: Code Quality Issues Found

### Critical (Fix Immediately)

1. **WithdrawalScreen.tsx:282-283** - Orphaned code fragments causing syntax error
2. **admin-payout.service.ts:68** - Plaintext password comparison

### High Priority

1. **WithdrawalScreen.tsx** - Currency mismatch (shows ₦ but backend uses $)
2. **payment.controller.ts** - No rate limiting on webhook endpoint
3. **Missing tests** - No unit tests for payment flows

### Medium Priority

1. **No retry logic** - Paystack API calls have no retry mechanism
2. **No webhook logging** - Events not stored for debugging
3. **No IP whitelist** - Webhook accepts from any IP

---

**Document End**

*This document should be reviewed and updated quarterly or after any significant payment system changes.*
