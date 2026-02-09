# Backend Refactoring & Improvement Plan

## 🎯 Objective
Address critical logic issues, improve type safety, and formalize architecture in the NestJS backend.

## 🔴 Phase 1: Critical Reliability (Financial & Data)

### 1. LedgerService Extraction
- **Goal**: Centralize "money movement" logic.
- **Task**: Create `src/monetization/services/ledger.service.ts`.
- **Functionality**: `creditUser`, `debitUser`, `transferFunds`.
- **Constraint**: ONLY this service should write to `profiles.balance` or `transactions`.

### 2. Transaction Consistency
- **Goal**: Ensure no money is created/lost during crashes.
- **Task**: Refactor `PayoutService` methods to accept a `drizzle-orm` Transaction object.
- **Implementation**: Wrap `balance update` + `transaction log` in `db.transaction()`.

### 3. Concurrency Safety
- **Goal**: Prevent race conditions on balance updates.
- **Task**: Ensure all balance updates use atomic SQL increments: `balance = balance + :amount`.
- **Alternate**: Use `FOR UPDATE` locking if reading balance before spending.

### 4. Configuration Validation
- **Goal**: Prevent "magic number" financial logic.
- **Task**: Remove `DEFAULT_RATES` fallback in `PayoutService`.
- **Implementation**: Throw clear `ConfigurationError` if rates are missing from DB.

## 🟡 Phase 2: Types & Safety

### 1. LiveService Logic
- **Goal**: Fix `as any` casting in `startStream`.
- **Task**:
  - defined strictly typed DTOs for `startStream`.
  - Validate `userId` is a UUID before passing to Drizzle.
  - Fix type definition in `schema.liveStreams.streamerId`.

## 🟢 Phase 3: Architecture

### 1. Transactional Outbox for Notifications
- **Goal**: Guarantee notification delivery after transaction commit.
- **Task**:
  - Create `notification_outbox` table (id, event, payload, status).
  - Modify `ConsensusService` to insert into `notification_outbox` instead of using in-memory queue.
  - Create a cron job/worker to process and send events from the outbox.

### 2. Consensus Strategy
- **Goal**: Allow flexible validation rules.
- **Task**: Extract "Majority Vote" logic into a `MajorityVoteStrategy` class implementing a `ConsensusStrategy` interface.

## 🔵 Phase 4: Features

### 1. Ambassador Integration
- **Goal**: Reward referrers.
- **Task**:
  - In `PayoutService.processRemixRoyalty` or `creditClipApprovalReward`:
  - Fetch `profile.referred_by_id`.
  - If exists, calculate referral bonus (e.g., 5% match) and credit referrer via `LedgerService` in the SAME transaction.
