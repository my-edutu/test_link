# Task List: Analytics & Tracking

**Goal**: Implement a Hybrid Analytics model using PostHog (Client-side & Server-side).
**Status**: ✅ **100% Complete**

## Phase 1: Client-side Instrumentation
- [x] Initialize PostHog React Native SDK in `App.tsx`.
- [x] Wrap navigation to track screen views automatically.
- [x] Implement `trackEvent` utility for manual event captures (Button clicks, UX flows).
- [x] Add user property identification after successful Supabase login.

## Phase 2: Server-side (NestJS) Tracking
- [x] Install PostHog Node.js SDK in the NestJS backend.
- [x] Implement a `LoggingInterceptor` to capture every API request metadata.
- [x] Add explicit server-side events for sensitive transactions (Payouts, Rewards).
- [x] Configure PostHog to link client and server events via the `user_id`.

## Phase 3: Dashboards & Funnels
- [ ] Set up "Onboarding Funnel" tracking (Landing -> Signup -> First Record).
- [ ] Create a "Retention Dashboard" based on recurring validations.
- [ ] Implementation of "Feature Flag" logic via PostHog for A/B testing.

## Phase 4: Verification
- [ ] Verify that real-time events appear in the PostHog debugger.
- [ ] Check if user properties (Language, Location) are correctly synced.
- [ ] Test event capture during offline sync (Buffering events).

---

## Implementation Summary (2026-01-21)

### Mobile Files:
- `src/services/analytics.ts` - Full PostHog wrapper with:
  - `initAnalytics()` - Initialize PostHog client
  - `trackEvent()` - Track custom events
  - `identifyUser()` - Link user identity
  - `resetUser()` - Logout cleanup
  - `trackScreenView()` - Manual screen tracking
  - `AnalyticsEvents` - Type-safe event constants

### Backend Files:
- `services/api/src/analytics/analytics.service.ts` - Server-side PostHog with:
  - `capture()` - Generic event capture
  - `trackPayoutCredited()` - Financial event
  - `trackWithdrawalCompleted()` - Financial event
  - `trackConsensusReached()` - Validation event
  - `trackApiRequest()` - API metrics
  - `trackApiError()` - Error tracking

### Event Constants:
**Client-side (AnalyticsEvents):**
- `CLIP_RECORDED`, `CLIP_UPLOADED`, `CLIP_DELETED`
- `VALIDATION_SUBMITTED`, `VALIDATION_SKIPPED`
- `WITHDRAWAL_REQUESTED`, `PAYOUT_RECEIVED`
- `LIVE_STREAM_STARTED`, `LIVE_STREAM_ENDED`, `LIVE_STREAM_JOINED`
- `VIDEO_CALL_STARTED`, `VIDEO_CALL_ENDED`
- `USER_SIGNED_UP`, `USER_LOGGED_IN`, `USER_LOGGED_OUT`

**Server-side (ServerAnalyticsEvents):**
- `PAYOUT_CREDITED`, `WITHDRAWAL_COMPLETED`, `WITHDRAWAL_REQUESTED`
- `CONSENSUS_REACHED`, `VALIDATION_PROCESSED`
- `CONTENT_FLAGGED`, `CONTENT_REVIEWED`
- `API_REQUEST`, `API_ERROR`

### Environment Variables:
```
POSTHOG_API_KEY=phc_xxxxx
POSTHOG_HOST=https://app.posthog.com  # Optional, defaults to this
```

### Remaining Work:
- [ ] PostHog dashboard configuration (funnels, retention)
- [ ] Feature flags setup
- [ ] End-to-end verification with real data
