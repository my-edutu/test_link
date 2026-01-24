# Vibe-Coding Guide: Analytics & Tracking

**Vibe**: "Seeing the threads of growth."

## 1. The Strategy
We use **PostHog** for product analytics. It's event-based and privacy-respecting.

## 2. Infrastructure
*   `src/utils/analytics.ts`: wrapper for PostHog client.
*   `App.tsx`: Initialize PostHog provider.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build Hybrid Analytics. Use the client-side PostHog SDK for UI clicks. For sensitive events like 'Withdrawal Started' or 'Validation Finalized', use the PostHog Node SDK inside your NestJS services. Use Drizzle to pull the relevant user context for these events. Iterate until I see a unified view of user behavior in PostHog from both the app and the NestJS server."

## 4. Key Checkpoints
- [ ] PostHog provider initialized in `App.tsx`.
- [ ] Recording success event tracked.
- [ ] Validation approval/rejection events tracked.
