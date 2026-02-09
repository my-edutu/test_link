# Lingualink: Future Backend Developer Guide

This document serves as the "source of truth" for the hybrid architecture (Supabase + NestJS) used in Lingualink.

## 🏗️ Technical Architecture

Lingualink uses a **Hybrid Backend Approach** to balance speed of development with advanced business logic:

1.  **Supabase (BaaS)**:
    *   **Primary Data Store**: Postgres database.
    *   **Auth**: Handled via Supabase Auth (JWT).
    *   **Storage**: S3-compatible buckets for audio/video.
    *   **Realtime**: Subscription to `live_streams` and `live_messages`.
2.  **NestJS (Edge API)**:
    *   **Advanced Logic**: Consensus algorithms for rewards, monetization payouts.
    *   **Third-party Integration**: LiveKit (Stream tokens), Paystack (Payments).
    *   **Admin Tools**: Protected endpoints for moderation and user management.
    *   **ORM**: **Drizzle ORM** for type-safe, low-latency database access.

## 📦 Database & ORM Patterns

### Connecting to Postgres
The NestJS backend connects directly to the Supabase Postgres instance. 
- Use `DATABASE_URL` in `.env`.
- Drizzle schemas in `src/database/schema.ts` **must** match the SQL in `supabase/*.sql`.

### Querying with Drizzle
Always prioritize using Drizzle for complex joins or operations that require service-role bypass.
```typescript
// Example Join Pattern
const result = await db
  .select()
  .from(voiceClips)
  .leftJoin(profiles, eq(voiceClips.userId, profiles.id))
  .where(eq(voiceClips.status, 'pending'));
```

## 💰 Monetization & Rewards Flow

1.  **Contribution**: User uploads a `voice_clip`. Status: `pending`.
2.  **Validation**: Other users submit entries to the `validations` table.
3.  **Consensus**: The NestJS `MonetizationService` runs a background task/endpoint to evaluate consensus.
4.  **Payout**: If approved, both contributor and validators receive rewards added to their `profiles.balance` and a record is created in `transactions`.

## 🛡️ Moderation & Reporting

Users can flag inappropriate content which creates a record in the `reports` table.
- **Admin Access**: Only users with `is_admin: true` in `profiles` can access `/moderation` endpoints.
- **RLS**: Reports RLS policies allow users to see their own reports and admins to see all.

## 🚀 Best Practices

1.  **SQL First**: Any schema change **must** start with a SQL script in the `supabase/` directory.
2.  **RLS Awareness**: While NestJS uses a service role (bypassing RLS), the mobile app uses the `anon` key. Always verify RLS policies for client-facing tables.
3.  **Idempotency**: Use `idempotencyKey` for payout requests to prevent duplicate transactions.
4.  **Documentation**: Update `BACKEND_STATUS.md` and `FEATURE_CHANGELOG.md` for every major change.
