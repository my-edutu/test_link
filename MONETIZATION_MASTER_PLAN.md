# Master Monetization Implementation Plan

This plan consolidates Contributor, Duet/Remix, and Validator monetization flows, ensuring a secure, scalable, and hybrid architecture (Supabase for reads, NestJS for critical business logic).

## 1. Database Schema Updates (Supabase & Drizzle)

We need to extend the current schema to support monetization, relationships, and trust scores.

### 1.1 New Tables & Fields

*   **Profiles (`profiles`)**:
    *   `balance` (decimal, default 0): Current wallet balance.
    *   `total_earned` (decimal, default 0): Lifetime earnings.
    *   `trust_score` (integer, default 100): For validators.
    *   `validator_tier` (text, default 'bronze'): 'bronze', 'silver', 'gold'.

*   **Voice Clips (`voice_clips`)**:
    *   `parent_clip_id` (uuid, FK to voice_clips): For Duets/Remixes.
    *   `root_clip_id` (uuid, FK to voice_clips): To track the original source in a chain.
    *   `is_monetized` (boolean, default false): If the clip is eligible for earning.
    *   `status` (text, default 'pending'): 'pending', 'approved', 'rejected'.

*   **Reward Rates (`reward_rates`)**: (New Table)
    *   `id`: uuid
    *   `action_type`: text (e.g., 'validate_correct', 'validate_incorrect', 'clip_approved')
    *   `amount`: decimal
    *   `currency`: text (default 'USD')
    *   `is_active`: boolean

*   **Transactions (`transactions`)**: (New Table)
    *   `id`: uuid
    *   `user_id`: uuid (FK to profiles)
    *   `amount`: decimal
    *   `type`: text ('credit', 'debit')
    *   `category`: text ('reward', 'payout', 'royalty')
    *   `reference_id`: uuid (e.g., clip_id or validation_id)
    *   `description`: text
    *   `created_at`: timestamp

*   **Royalty Splits (`royalty_splits`)**: (New Table - optional for MVP, but good for structure)
    *   `id`: uuid
    *   `clip_id`: uuid
    *   `shareholder_id`: uuid (user_id)
    *   `percentage`: decimal

## 2. Updated Task List

### Phase 1: Foundation (Schema & Configuration)
- [ ] **SQL Migration**: Apply `monetization_schema.sql` to Supabase.
- [ ] **Drizzle Schema**: Update `services/api/src/database/schema.ts` with new tables and fields.
- [ ] **Seed Data**: Insert initial `reward_rates` (e.g., $0.10 for clip approval, $0.01 for validation).

### Phase 2: Validator Flow (Security First)
- [ ] **Secure Endpoint**: Move `handleValidation` from client-side direct DB call to NestJS Endpoint (`POST /validations`).
    - *Why?* Prevents users from manipulating their own score or bypassing checks.
- [ ] **Consensus Service**: Implement `ConsensusService` in NestJS.
    - Logic: When a validation is received, check if 3 active validators agree.
    - If Consensus Reached: Trigger `PayoutService`.
    - Update `trust_score` for all participants (increase for agreeing with majority, decrease for outliers).

### Phase 3: Contributor & Payouts
- [ ] **Payout Service**: Implement `PayoutService` in NestJS.
    - `processClipApproval(clipId)`: Updates `voice_clips.status` -> 'approved'.
    - Credits original creator.
    - Records transaction.
- [ ] **Earnings UI**: Update `ProfileScreen` to show `balance` and `ValidationHistory`.

### Phase 4: Duet & Remix Monetization
- [ ] **Remix Linking**: Update `VoiceClip` creation endpoint to accept `parent_clip_id`.
- [ ] **Royalty Logic**: Update `PayoutService` to handle splits.
    - If `parent_clip_id` exists: Distribution (e.g., 70% to Remixer, 20% to Original, 10% Platform).

## 3. Implementation Plan (Hybrid Approach)

**Strategy**: "Read with Supabase, Write with NestJS."

1.  **Database**: Supabase (Postgres) is the single source of truth.
2.  **Reads**: The mobile app fetches feeds, profiles, and clips directly from Supabase via the client SDK for maximum speed.
3.  **Writes (Sensitive)**: Validations, Clip Uploads (metadata), and Payouts go through NestJS API.
    - *Client* -> *NestJS* -> *Drizzle/Postgres*.
    - This ensures business logic (consensus, money) is verified on the server.

## 4. Critique & Recommendations

### Critique of Current Direction
*   **Security Risk**: The current `ValidationScreen.tsx` implementation seems to insert validations directly into Supabase from the client. **Critique**: This is highly insecure for a system involving money. A bad actor could script fake "correct" validations to drain the reward pool or boost their trust score.
*   **Missing Logic**: There is no "backend brain" running the consensus logic yet.

### Recommendations for Scaling
1.  **Async Processing**: Use a Queue (e.g., BullMQ with Redis) in NestJS for processing validations.
    - User submits validation -> API pushes to Queue -> Worker processes consensus.
    - prevents database locking during high traffic.
2.  **Fraud Detection**:
    - Rate limits on how many clips one can validate per minute.
    - "Honeypot" clips (known status clips mixed in) to catch bots.

