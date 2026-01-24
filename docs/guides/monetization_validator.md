# Vibe-Coding Guide: Validator Monetization

**Vibe**: "The Stewards of Truth."

## 1. The Strategy
Validators earn a fee for every clip they correctly review, ensuring the Vault's quality.

## 2. Infrastructure
*   `validations.fee_earned`: Fixed amount per review.
*   `stewards_level`: Tier system based on accuracy.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build a Hybrid Validator consensus system. Use Supabase to manage the validation queue and presence. In NestJS, create a `ConsensusService` that uses Drizzle to monitor the shared `validations` table. When 3 validators reach a consensus, NestJS should use `db.transaction()` to payout the fee to all 3. Iterate until submitting a 3rd matching validation triggers a NestJS payout that updates all three validator balances in the Supabase UI."

## 4. Key Checkpoints
- [ ] Consensus logic (3 validators) implemented in a DB function.
- [ ] Validator 'Trust Score' increases with correct validations.
- [ ] Earnings reflect only 'Finalized' validations.
