# Task List: Duet & Remix Monetization

**Goal**: Shared royalty distribution for collaborative content.
**Status**: ✅ **95% Complete**

## Phase 1: Relationship Mapping
- [x] Add `parent_clip_id` to the `voice_clips` schema to track remixes.
- [x] Add `root_clip_id` to track the original source in chains.
- [x] Implement the "Duet Record" UI, allowing a user to record alongside an existing clip.
- [x] Create a NestJS endpoint to register the remix and link it to the original creator.

## Phase 2: Royalty Split Engine (NestJS)
- [x] Implement a `RoyaltyService` in NestJS.
    - Implemented in `PayoutService.processRemixRoyalty()`
- [x] Define the split logic (e.g., 70% Creator / 30% Original Owner).
- [x] Use Drizzle to process transactions for both users when a Remix is validated.
- [ ] Implement a `transaction_tree` table to audit complex royalty paths.

## Phase 3: Attribution UI
- [ ] Add a "Remixed From [User]" credit to the post feed.
- [ ] Implement a "Remix History" view for original creators to see their impact.
- [ ] Create a "Royalty Earnings" breakdown in the wallet screen.

## Phase 4: Verification
- [ ] Perform a Remix and verify the `parent_id` link in Postgres.
- [ ] Validate the Remix and verify that BOTH creators receive their respective splits.
- [ ] Check if the transactions appear correctly in both users' history.
- [ ] Test a "Remix of a Remix" (Grandparent attribution) if applicable.

---

## Implementation Summary (2026-01-21)

### Backend Files:
1. `services/api/src/monetization/services/remix.service.ts`
   - `createRemix()` - Register remix with parent/root links
   - `getRemixChain()` - Get all ancestors up to root
   - `getRemixesOf()` - Get all children of a clip
   - `getUserRemixStats()` - Get user's remix statistics

2. `services/api/src/monetization/services/payout.service.ts`
   - `processRemixRoyalty()` - 70/30 split between remixer and original

3. `services/api/src/monetization/services/consensus.service.ts`
   - Updated to handle remix royalty payouts on approval
   - Emits `ROYALTY_RECEIVED` notification to original creator

4. `services/api/src/notifications/notification.events.ts`
   - Added `ROYALTY_RECEIVED` event

### Mobile Files:
1. `src/screens/DuetRecordScreen.tsx` (250 lines)
   - Plays parent clip audio while user records
   - Records user's voice via `expo-av`
   - Uploads audio file to storage
   - Calls `POST /monetization/remix` to register duet
   - Shows parent username and phrase
   - Timer display during recording
   - Retake and Post buttons

### API Endpoints:
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/monetization/remix` | Register a new remix/duet |
| GET | `/monetization/remix/:clipId/chain` | Get remix ancestry |
| GET | `/monetization/remix/:clipId/children` | Get all remixes of a clip |
| GET | `/monetization/remix/stats` | User's remix statistics |

### Database Schema:
- `voice_clips.parent_clip_id` - Direct parent (the clip being remixed)
- `voice_clips.root_clip_id` - Original source in the chain
- `voice_clips.duets_count` - Number of remixes/duets

### Royalty Split Logic:
When a remix is validated and approved:
1. Check if clip has `parent_clip_id`
2. Fetch parent's owner
3. Split base reward: 70% to remixer, 30% to original creator
4. Log both transactions
5. Notify original creator via push notification

### Duet Recording Flow:
1. User browses feed, taps "Duet" on a clip
2. Navigates to `DuetRecordScreen` with parent clip data
3. Parent audio loads and plays during recording
4. User records their own voice simultaneously
5. Audio uploaded, remix registered with backend
6. Clip enters validation queue
7. On approval, both users receive royalty split

### Remaining Work:
- [ ] "Remixed From [User]" attribution in ClipCard
- [ ] "Remix History" view for original creators
- [ ] `transaction_tree` for complex multi-level royalty auditing
