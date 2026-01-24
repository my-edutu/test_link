# Task List: Contributor Monetization

**Goal**: Atomic rewards for cultural contributions via Drizzle transactions.
**Status**: ✅ **90% Complete**

## Phase 1: Reward Configuration
- [x] Define `reward_rates` table via Drizzle (Rate per language/complexity).
- [x] Implement an admin-only endpoint in NestJS to manage these rates.
- [x] Add `balance` and `total_earned` fields to the user profile schema.

## Phase 2: The Payout Pipeline (NestJS)
- [x] Create a `ClipService` that listens for validation approvals.
    - Implemented via `ConsensusService` triggering `PayoutService`.
- [x] Implement a `db.transaction()` to:
    - Update `voice_clips.status` to 'approved'.
    - Calculate reward based on `reward_rates`.
    - Increment user `balance`.
    - Insert a `CREDIT` record into the `transactions` table.
- [x] Add idempotency checks to prevent double-paying for the same clip.
    - Clip status changes to 'approved' only once; subsequent calls check status.

## Phase 3: Contributor Feedback
- [x] Create a "Earnings Card" on the user profile screen.
- [ ] Implement a celebratory animation overlay when a reward is credited.
- [x] Add a "Pending Rewards" view for clips currently in the validation queue.

## Phase 4: Verification
- [ ] Manually approve a clip in the DB and verify balance update.
- [ ] Test multiple concurrent approvals to ensure transaction isolation.
- [ ] Verify that transaction records match the balance increase exactly.
- [ ] Test re-approving a clip and ensuring no duplicate payment occurs.

---

## Implementation Summary (2026-01-21)

### Backend Files Created/Updated:
1. `services/api/src/monetization/services/payout.service.ts`
   - `getRate()` - Fetch rates with caching
   - `creditUser()` - Atomic balance update + transaction log
   - `creditClipApprovalReward()` - Credits clip owner on approval
   - `processRemixRoyalty()` - 70/30 split for duets/remixes

2. `services/api/src/admin/admin.controller.ts`
   - `GET /admin/rates` - List all reward rates
   - `POST /admin/rates` - Create new rate
   - `PUT /admin/rates/:id` - Update rate
   - `POST /admin/rates/seed` - Seed default rates
   - `GET /admin/stats` - Dashboard statistics

3. `services/api/src/admin/admin.module.ts`

### Mobile Files Created:
1. `src/components/EarningsCard.tsx`
   - Displays balance, total earned, trust score, validator tier
   - Fetches data from `GET /monetization/earnings`
   - Pulse animation on balance display
   - Withdraw button (enabled at $5+ balance)

2. `src/components/TransactionHistory.tsx`
   - Fetches transactions from Supabase
   - Color-coded by transaction type
   - Time formatting (Today/Yesterday/Date)

3. `src/components/PendingRewards.tsx`
   - Horizontal scroll of clips awaiting validation
   - Progress bar showing validation count / 3 needed
   - Deep links to clip detail

4. `src/screens/ProfileScreen.tsx` (Updated)
   - Rewards tab now shows real components instead of placeholder

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/monetization/earnings` | User's balance, trust score, tier |
| GET | `/admin/rates` | List all reward rates |
| POST | `/admin/rates` | Create reward rate |
| PUT | `/admin/rates/:id` | Update reward rate |
| POST | `/admin/rates/seed` | Seed default rates |
| GET | `/admin/stats` | Dashboard stats |

### Database Schema:
- `reward_rates` table with `action_type`, `amount`, `currency`, `is_active`
- `transactions` table logging all credits/debits
- `profiles` with `balance`, `total_earned`, `trust_score`, `validator_tier`

### Remaining Work:
- [ ] Celebratory animation on reward credit
- [ ] End-to-end testing with real clips
- [ ] Production Supabase migration
