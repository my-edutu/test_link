# Lingualink Migration & Architecture Guide

This guide outlines the major architectural shifts implemented during the Phase 1-5 Refactoring and provides steps for maintaining the new system.

## 🏗️ New Architecture Overview

The app has moved from a "Frontend-Direct" architecture to a **Service-Oriented BFF (Backend-For-Frontend)** pattern.

### 1. Data Flow
*   **Old**: `Screen -> Supabase RPC -> Screen State`
*   **New**: `Screen -> Custom Hook -> ChatService/MonetizationService -> API/Supabase -> Typed Models`

### 2. User Lifecycle Automation
*   **Old**: Mobile app manually created profiles and referrals on sign-in.
*   **New**: Supabase Auth triggers a Webhook to NestJS on user creation. NestJS atomically creates the profile, generates a referral code, and links any inviter.

---

## 🚀 Post-Refactor Setup Instructions

### 1. Database Schema Sync
The `schema.ts` in `services/api/src/database/` has been updated to include many missing fields and correct type inconsistencies (UUIDs).
**Action**: Run the following SQL in your Supabase SQL Editor if you haven't already:
```sql
-- Enable RLS on core tables
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Synchronize missing profile fields (if not already present)
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS bio text,
ADD COLUMN IF NOT EXISTS location text,
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS referral_count integer DEFAULT 0;
```

### 2. Configure Auth Automation (Critical)
To enable the backend profile creation:
1.  Go to **Supabase Dashboard -> Database -> Webhooks**.
2.  Create a new Webhook:
    *   **Name**: `sync_auth_profile`
    *   **Table**: `users` (Schema: `auth`)
    *   **Events**: `INSERT`
    *   **HTTP Method**: `POST`
    *   **URL**: `<YOUR_BACKEND_URL>/api/v1/webhooks/supabase/auth`
    *   **HTTP Headers**: 
        *   `x-supabase-webhook-secret`: (The secret you defined in `.env`)

### 3. Typography Migration
The `Typography` scale in `src/constants/Theme.ts` now includes `h3` and `h4`. 
*   Use `Typography.h3` for section headers (18px, Bold).
*   Use `Typography.h4` for secondary headers (16px, Semi-Bold).

---

## 👩‍💻 Developer Best Practices

### Adding a New API Feature
1.  **Define Types**: Add the response interface to `src/types/`.
2.  **Service Layer**: Add the fetching logic to a service in `src/services/`.
3.  **Custom Hook**: Create a hook in `src/hooks/` to handle state and caching (using React Query where applicable).
4.  **UI Component**: Use the hook and pass data to stateless components.

### Handling Errors
Use the new `ErrorBoundary` component to wrap any experimental features. Ensure all API calls use the `parseResponse` helper from `authFetch.ts` to get consistent error messages.

---

## 🔒 Security Checklist
- [ ] RLS is enabled on all tables in `schema.ts`.
- [ ] Backend endpoints use `JwtAuthGuard` unless explicitly `@Public()`.
- [ ] `referred_by_id` and other foreign keys use `uuid` type to prevent casting errors.
