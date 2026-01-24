# Task List: Payment Gateway for Rewards

**Goal**: Seamless wallet top-ups via Paystack and secure NestJS webhook handling.
**Status**: ✅ **95% Complete**

## Phase 1: Frontend Wallet UI
- [x] Build the "Wallet" screen displaying the current balance (from Supabase).
    - Implemented in `EarningsCard.tsx` on Profile screen
- [x] Implement the "Top-up" modal with fixed price packages.
    - Implemented in `TopUpModal.tsx`
- [x] Integrate `expo-web-browser` to handle the Paystack payment URL.

## Phase 2: Secure Webhook Hub (NestJS)
- [x] Create `PaymentController` with a `POST /webhooks/paystack` endpoint.
- [x] Implement cryptographic signature verification (HMAC SHA512) to ensure authenticity.
- [x] Create `PaymentService` using Drizzle to handle balance updates.
- [x] Implement idempotency checks to prevent duplicate credits.

## Phase 3: Withdrawals
- [x] Create `WithdrawalController` with `POST /withdrawals` and `GET /withdrawals`.
- [x] Implement balance validation and minimum withdrawal ($5).
- [x] Create `withdrawals` table to track payout requests.
- [x] Handle webhook callbacks for transfer success/failure.
- [x] Automatic refund on failed withdrawals.

## Phase 4: Post-Payment UX
- [ ] Implement Supabase Realtime listener to update the wallet UI immediately on success.
- [x] Create a "Transaction History" list using the shared Postgres DB.
    - Implemented in `TransactionHistory.tsx`
- [ ] Add error handling for failed payments (Bank declines, timeouts).

## Phase 5: Verification
- [ ] Simulate a successful payment and verify the NestJS log entry.
- [ ] Verify that the user balance in Supabase increments correctly.
- [ ] Test webhook verification failure with an invalid signature.
- [ ] Verify that duplicate webhooks (idempotency) do not credit the user twice.

---

## Implementation Summary (2026-01-21)

### Backend Files:
1. `services/api/src/payments/payment.controller.ts`
   - `POST /webhooks/paystack` - Handle all Paystack webhook events
   - HMAC SHA512 signature verification
   - Event handlers: charge.success, transfer.success, transfer.failed

2. `services/api/src/payments/payment.service.ts`
   - `creditTopUp()` - Credit user after successful charge (idempotent)
   - `requestWithdrawal()` - Initiate withdrawal with balance validation
   - `markWithdrawalComplete()` - Called from webhook
   - `markWithdrawalFailed()` - Called from webhook, auto-refunds user

3. `services/api/src/payments/withdrawal.controller.ts`
   - `POST /withdrawals` - Request withdrawal
   - `GET /withdrawals` - Get user's withdrawal history

4. `services/api/src/payments/top-up.controller.ts`
   - `POST /payments/initialize` - Initialize Paystack transaction

5. `services/api/src/payments/payment.module.ts`

### Mobile Files:
1. `src/components/TopUpModal.tsx` (262 lines)
   - Amount input with preset buttons ($5, $10, $20, $50)
   - Paystack checkout via `expo-web-browser`
   - Loading states and error handling
   - "Secured by Paystack" badge

2. `src/components/EarningsCard.tsx`
   - Balance display with pulse animation
   - "Top Up" button opens TopUpModal
   - "Withdraw" button (enabled at $5+)

3. `src/components/TransactionHistory.tsx`
   - Fetches transactions from Supabase
   - Color-coded by type (CREDIT/DEBIT)

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/payments/initialize` | Initialize Paystack checkout |
| POST | `/webhooks/paystack` | Handle Paystack events |
| POST | `/withdrawals` | Request a withdrawal |
| GET | `/withdrawals` | User's withdrawal history |

### Security Features:
- ✅ HMAC SHA512 webhook signature verification
- ✅ Idempotency via transaction reference check
- ✅ Minimum withdrawal validation ($5)
- ✅ Balance check before withdrawal
- ✅ Automatic refund on failed transfers

### Environment Variables:
```
PAYSTACK_SECRET_KEY=sk_test_xxxxx
```

### Remaining Work:
- [ ] Supabase Realtime for instant balance updates
- [ ] Production testing with real Paystack account
