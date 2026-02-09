# Backend Feature Changelog

> This file tracks all changes to the NestJS backend. Update this file with every feature addition or modification.

---

## [2026-01-25] - Database Schema Synchronization

### Changed
- Synchronized Supabase database with NestJS Drizzle schema (`schema.ts`).
- Added missing columns to `profiles` table (financial, ambassador, push token).
- Standardized documentation in `BACKEND_STATUS.md`.

### Added
- Created `FUTURE_GUIDE.md` for backend development guidelines.
- Created `reports` table for content moderation.
- Created `referral_stats`, `reward_rates`, `transactions` tables.
- Created `notification_logs`, `clip_flags` tables.
- Created `withdrawals`, `payout_requests` tables.

### Migration Required
- [x] Yes
- Files: 
  - `supabase/reports.sql`
  - Inline migrations (financial & system tables) applied via MCP.

---

## [2026-01-21] - Monetization Module (Initial)

### Added
- Created `MonetizationModule` at `src/monetization/`
- Added `MonetizationController` with placeholder endpoints
- Added `ConsensusService` for 3-person validation logic
- Added `RewardService` for calculating and distributing rewards

### Drizzle Tables
- `validations` - Stores individual validation votes
- `transactions` - Records all balance changes
- `rewardRates` - Configurable reward amounts per action

### Endpoints
- `POST /monetization/validate` - Submit validation (in progress)

### Migration Required
- [x] Yes
- Files: 
  - `supabase/sql/XXX_create_validations.sql`
  - `supabase/sql/XXX_create_transactions.sql`

---

## [2026-01-20] - Live Streaming Module

### Added
- Created `LiveModule` at `src/live/`
- Added `LiveController` for stream management
- Added `LiveService` for LiveKit integration
- Implemented JWT token generation for LiveKit

### Endpoints
- `POST /live/token` - Generate participant token
- `POST /live/start` - Start new stream
- `POST /live/end` - End active stream

### Drizzle Tables
- `liveStreams` - Stream metadata and state
- `liveMessages` - Chat messages per stream

### Dependencies Added
- `livekit-server-sdk`

### Migration Required
- [x] Yes
- Files:
  - `supabase/sql/enable_realtime.sql`

---

## [2026-01-19] - Database Module Setup

### Added
- Initialized NestJS project in `services/api/`
- Created `DatabaseModule` with Drizzle configuration
- Added initial schemas:
  - `profiles`
  - `voiceClips`
  - `badges`
  - `userBadges`

### Configuration
- Drizzle connected to Supabase Postgres via `DATABASE_URL`
- Service role access (bypasses RLS)

---

## Template for Future Entries

```markdown
## [YYYY-MM-DD] - Feature Name

### Added
- New functionality descriptions

### Changed
- Modifications to existing features

### Fixed
- Bug fixes

### Removed
- Deprecated or removed functionality

### Breaking Changes
- Any changes that break existing functionality

### Drizzle Tables
- List affected tables

### Endpoints
- List new/modified endpoints

### Dependencies Added
- New packages

### Migration Required
- [ ] Yes / [x] No
- Files: List migration file paths
```
