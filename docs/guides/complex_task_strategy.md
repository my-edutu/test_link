# Complexity Matrix & Complex Implementation Strategy

This document ranks the planned features by implementation difficulty and provides specialized safeguards for the "High Complexity" group.

---

## 1. Feature Complexity Matrix

| Complexity Level | Features | Requirements |
| :--- | :--- | :--- |
| **🟢 Easiest** | Ambassador Program, Badges (Phase 1), Moderation (User Reporting) | Purely internal logic/DB updates. No external APIs needed. |
| **🟡 Moderate** | Analytics (PostHog), Push Notifications (Expo), AI Moderation (OpenAI) | Standard API integration with excellent documentation. |
| **🔴 Complicated** | Payments (Paystack), Withdrawals, WebRTC, Live Streaming, All Monetization, Offline Sync | High security stakes, real-time media server orchestration, or atomic DB transactions. |

---

## 2. Agent Rules for Complex Tasks
*Rules for Antigravity when tackling Group 🔴 features:*

1.  **Mandatory Sandbox**: Before editing the main `src/db/schema.ts`, draft the Drizzle changes in a standalone file for review.
2.  **Atomic Verification**: Every transaction must use `db.transaction()`. I must write a verification script to test "Partial Failure" scenarios (e.g., "What happens if the balance updates but the transaction record fails?").
3.  **Security Audit**: Before finishing a monetization task, I must explicitly check for "Balance Overdraw" conditions and "Idempotency Keys" to prevent double payments.
4.  **No "Vibe-Only" Webhooks**: When building webhooks, I must implement cryptographic signature verification first, even in development.

---

## 3. User Implementation Guide (Complex Features)
*Checklist for the USER when working on Group 🔴 features with me:*

1.  **Environment Check**: Ensure your `.env` has the correct `SECRET_KEY` for the specific service (Paystack, LiveKit, etc.).
2.  **Database Mirroring**: Ensure your local NestJS / Drizzle instance is perfectly synced with your Supabase Postgres schema.
3.  **Step-by-Step Approval**: For features in this group, do not approve "Full Implementation" at once. Ask me to "Implement Phase 1 and Verify" before moving to Phase 2.
4.  **Edge Case Brainstorming**: When I present a complex implementation, ask: *"How does this handle a network drop specifically during the transaction?"*
5.  **Role Verification**: Ensure you are testing with a user account that has the correct `is_ambassador` or `trust_score` flags set in the DB.

---

## 4. Immediate Recommendations
*   **To start easily**: Tackle **Ambassador Program** or **Badges**. These are 100% internal and build your confidence in the Drizzle + Supabase hybrid model.
*   **To start with APIs**: Tackle **Analytics**. PostHog integrated with NestJS is very powerful and provides immediate visual feedback.
*   **To tackle complexity**: Start with **Payment Gateway**. It is the most critical to get right and settles the transaction patterns for all other monetization features.
