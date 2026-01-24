# Task List: Withdrawal & Payments

**Goal**: Secure bank payouts with anti-fraud verification.

## Phase 1: Bank Account Linking
- [ ] Build the "Link Bank Account" UI in the mobile app.
- [ ] Integrate Paystack "Resolve Account" API into a NestJS controller.
- [ ] Implement a NestJS endpoint to securely store masked bank details via Drizzle.
- [ ] Add a "Name Match" check (Bank account name vs. Profile name).

## Phase 2: The "Queue & Lock" Intake (Scale Ready)
- [ ] Implement high-speed POST `/withdraw/request` endpoint.
- [ ] Add Drizzle logic to "Lock" funds (subtract from `balance`, add to `pending_lock`).
- [ ] Prevent concurrent requests using DB row-level locking (`SELECT ... FOR UPDATE`).
- [ ] Create `payout_requests` audit trial.

## Phase 3: Bulk Dispatcher (NestJS Worker)
- [ ] Create `PayoutService` to aggregate pending requests.
- [ ] Integrate **Paystack Bulk Transfer API**.
- [ ] Implement "Idempotency Keys" for every batch to prevent double-payouts.
- [ ] Add webhook listeners to update status from `PENDING` to `COMPLETED/FAILED`.

## Phase 4: Verification
- [ ] Test resolving a bank account and verifying name matching.
- [ ] Verify that funds are "Locked" correctly after a payout request.
- [ ] Test an Admin approval and verify the external API call logs.
- [ ] Verify that a failed transfer correctly restores the user's balance.
