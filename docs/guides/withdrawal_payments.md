# Vibe-Coding Guide: Withdrawal & Payments

**Vibe**: "Cashing out the cultural legacy."

## 1. The Strategy
Secure, verified payouts using regional payout APIs (Paystack/Flutterwave).

## 2. Infrastructure
*   `payout_requests`: Table for auditing.
*   `verified_banks`: Table to store user banking info (encrypted).
*   Edge Function: `process-payout` for secure bank transfer.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build a secure Hybrid Withdrawal flow. The user should link their bank account via a Supabase UI. For the actual withdrawal, create a NestJS endpoint. NestJS should use Drizzle to 'Lock' the funds in the `profiles` table, then communicate with the Paystack/Stripe Payout API. Iterate until a user can request a payout in the app and NestJS securely initiates the bank transfer while updating the status in our shared Postgres DB."

## 4. Key Checkpoints
- [ ] Bank account name matches user profile name (Fraud prevention).
- [ ] Double-entry bookkeeping: Balance is deducted before payout completes.
- [ ] Webhook tracking for payout status (Success/Failed).
