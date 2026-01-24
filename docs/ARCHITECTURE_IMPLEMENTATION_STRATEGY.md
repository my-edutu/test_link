# LinguaLink Hybrid Implementation Strategy: Supabase + NestJS + Drizzle

This strategy outlines a **Hybrid Hub** approach, maintaining Supabase for core infrastructure while integrating a custom **NestJS + Drizzle** backend for complex business logic and monetization.

---

## 1. The Service Split: Who Handles What?

| Service | Responsibility | System |
| :--- | :--- | :--- |
| **Authentication** | User sessions, social logins, JWT generation. | **Supabase Auth** |
| **Asset Storage** | Recording files, video blobs, high-res images. | **Supabase Storage** |
| **Realtime Sync** | Chat unread updates, simple table listeners. | **Supabase Realtime** |
| **Database** | The source of truth (Postgres/Drizzle). | **Shared Postgres** |
| **Complex Logic** | Monetization splits, consensus algorithms, admin tools. | **NestJS** |
| **Secure Actions** | Payouts, sensitive settings, deep analytics. | **NestJS** |

---

## 2. Core Integration Architecture

### Shared Database Access
*   **Drizzle ORM** inside NestJS connects directly to the Supabase Postgres instance using the `connectionString`.
*   **RLS (Row Level Security)**: Remains active for client-side Supabase SDK calls. NestJS operates with a service role, bypassing RLS for heavy server-side processing.

### Authentication Bridge
*   NestJS uses a `SupabaseGuard`. It extracts the Bearer JWT from the incoming request and verifies it against Supabase's public key (or uses the Supabase Admin SDK to verify the session).
*   **Result**: The user ID (`sub`) is available in Every NestJS request context.

---

## 3. Feature Implementation Paths (Hybrid)

### Offline Mode & Background Sync
*   **Mobile**: Outbox stored in `expo-sqlite`.
*   **Backend**: NestJS receives the batch, Drizzle runs a transaction to commit to Postgres, and Supabase Realtime notifies other clients of the update.

### Push Notifications
*   **Flow**: NestJS `NotificationService` (using `expo-server-sdk`) listens for database events via **Drizzle hooks** or **NestJS EventEmitters** and sends prompts to the Expo Push API.

### WebRTC & Live Streaming
*   **Signaling**: Use Supabase Realtime for its simplicity in broadcasting signaling messages.
*   **Access Tokens**: NestJS generates LiveKit JWTs (using the secret key) when a user requests to join a room.

### Monetization & Rewards
*   **Integrity**: All money-related updates happen in NestJS using Drizzle's `db.transaction()`. This ensures that updating a balance and recording a transaction record are atomic.
*   **Payments**: Use NestJS Controllers for Paystack/Stripe webhooks to ensure maximum security.

---

## 4. Growth & Governance

### Analytics
*   **Mixed Model**: Use client-side PostHog for UI interactions and NestJS PostHog SDK for server-side event tracking (payouts, validations).

### Moderation
*   **Interceptors**: Use NestJS Interceptors to scan content metadata before it hits the DB. Content flagged by AI in NestJS stays hidden from the Supabase client-side feed.
