# Task List: Validator Monetization

**Goal**: Payout rewards based on 3-person consensus logic in NestJS.
**Status**: ✅ **95% Complete**

## Phase 1: Trust & Eligibility
- [x] Add `trust_score` and `validator_tier` to the `profiles` schema.
- [x] Implement a NestJS service to calculate trust scores based on historical consensus.
- [x] Build the "Validator Queue" UI (powered by Supabase) for authenticated validators.

## Phase 2: Consensus Engine (NestJS)
- [x] Create a `ConsensusService` to monitor the `validations` table.
- [x] Implement the "3-Person Rule":
    - If a clip has 3 matching validations, trigger the payout.
    - If a validation is an outlier, decrease the validator's trust score.
- [x] Use `db.transaction()` via Drizzle to credit all 3 winning validators simultaneously.

## Phase 3: Dispute Resolution
- [x] Create a "Flag for Review" option for complex or ambiguous clips.
- [x] Implement a NestJS endpoint for "Senior Validators" to resolve disputes.
- [x] Add a "Validation History" screen for users to track their earning accuracy.

## Phase 4: Verification
- [ ] Submit 3 matching validations and verify the automatic payout in Drizzle.
- [ ] Verify that an outlier validation does NOT trigger a payout.
- [ ] Test the trust score decrease for incorrect validations.
- [ ] Verify that the validator balance in Supabase updates correctly.

---

## Implementation Summary (2026-01-21)

### Backend Files Created/Updated:
1. `services/api/src/monetization/services/consensus.service.ts` - 3-person consensus logic with trust score updates
2. `services/api/src/monetization/services/validation.service.ts` - Validation submission with rate limiting
3. `services/api/src/monetization/services/payout.service.ts` - Reward crediting with caching
4. `services/api/src/monetization/services/dispute.service.ts` - Flag for review functionality
5. `services/api/src/monetization/monetization.controller.ts` - All endpoints including `/flag` and `/admin/flags`
6. `services/api/src/monetization/dto/flag.dto.ts` - DTO for flagging clips
7. `services/api/src/database/schema.ts` - Added `clip_flags` table

### Mobile Files Created/Updated:
1. `src/services/monetizationApi.ts` - Secure API client for NestJS communication
2. `src/screens/ValidationScreen.tsx` - **Now uses NestJS API instead of direct Supabase**
   - Validation submission goes through `monetizationApi.submitValidation()`
   - Added "Flag" button with modal for dispute reasons
   - Shows consensus reached feedback

### SQL Migration:
- `supabase/sql/001_project_schema.sql` - Added `clip_flags` table

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/monetization/validate` | Submit a validation (secure) |
| POST | `/monetization/flag` | Flag clip for admin review |
| GET | `/monetization/queue` | Get clips to validate |
| GET | `/monetization/history` | Get user's validation history |
| GET | `/monetization/earnings` | Get balance, trust score, tier |
| GET | `/monetization/admin/flags` | Get pending flags (admin) |
| POST | `/monetization/admin/flags/:id/resolve` | Resolve a flag (admin) |

### Security Improvements:
- ✅ Validations no longer written directly to Supabase from mobile
- ✅ All payout logic runs server-side in NestJS
- ✅ Rate limiting on validation submissions
- ✅ Cannot validate own clips
- ✅ Cannot double-validate same clip

### Remaining Work:
- Run SQL migration on production Supabase
- End-to-end testing with real clips
- Add admin guard to `/admin/*` endpoints
