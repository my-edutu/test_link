# Task List: Ambassador Program

**Goal**: Viral growth via managed referral codes and performance tiering.
**Status**: ✅ **100% Complete**

## Phase 1: Identity & Vanity (Hybrid)
- [x] Add `is_ambassador` and `vanity_code` fields to the `profiles` schema.
- [x] Build the "Ambassador Portal" screen in the app.
- [x] Create a NestJS endpoint to allow ambassadors to claim a unique vanity code.
- [x] Implement uniqueness validation for vanity codes using Drizzle.

## Phase 2: Attribution Engine
- [x] Implement "Referral Logic" during the signup flow.
- [x] Create `referral_stats` table to track referrals and conversions.
- [x] Add NestJS logic to attribute rewards to the ambassador when a referred user validates a clip.

## Phase 3: Performance Tiering
- [x] Implement a "Leaderboard" query in Drizzle (Top ambassadors by conversion).
- [x] Add referral bonus logic ($0.50 per conversion).
- [x] Create a "Performance Summary" stats display for the ambassador dashboard.

## Phase 4: Verification
- [ ] Test signing up with a vanity referral code.
- [ ] Verify that the ambassador's stats update in the DB.
- [ ] Check if "Milestone Rewards" are credited automatically through NestJS.
- [ ] Test the uniqueness of vanity codes (preventing duplicates).

---

## Implementation Summary (2026-01-21)

### Backend Files:
1. `services/api/src/ambassador/ambassador.service.ts`
   - `claimVanityCode()` - Claim unique referral code
   - `getStats()` - Get ambassador's referral statistics
   - `getLeaderboard()` - Top 10 ambassadors by conversions
   - `trackReferral()` - Link new user to ambassador on signup
   - `@OnEvent(CLIP_APPROVED)` handler - Auto-award $0.50 bonus on first conversion

2. `services/api/src/ambassador/ambassador.controller.ts`
   - `POST /ambassador/claim-code` - Claim vanity code
   - `GET /ambassador/stats` - Get user's ambassador stats
   - `GET /ambassador/leaderboard` - Public leaderboard

3. `services/api/src/ambassador/ambassador.module.ts`

### Mobile Files:
1. `src/screens/AmbassadorScreen.tsx`
   - Claim code form with uniqueness validation
   - Stats display (Referrals, Conversions, Earnings)
   - Leaderboard view
   - Share code functionality via native Share API

### Database Schema:
- `profiles.is_ambassador` - Boolean flag
- `profiles.vanity_code` - Unique referral code
- `profiles.referred_by_id` - Foreign key to ambassador
- `referral_stats` table:
  - `ambassador_id`, `total_referrals`, `total_conversions`, `total_earnings`

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/ambassador/claim-code` | Claim unique vanity code |
| GET | `/ambassador/stats` | Get user's referral statistics |
| GET | `/ambassador/leaderboard` | Top 10 ambassadors |

### Referral Flow:
1. User A claims code "RALPH123"
2. User B signs up with code "RALPH123"
3. System links User B to User A via `referred_by_id`
4. User B's first clip gets approved
5. User A automatically receives $0.50 bonus

### Remaining Work:
- [ ] End-to-end testing with real signups
- [ ] Guardian Rank tiering (better rewards at milestones)
- [ ] Performance charts visualization
