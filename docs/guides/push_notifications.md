# Vibe-Coding Guide: Push Notifications

**Vibe**: "The Guardian calls."

## 1. The Strategy
We use **Expo Push Notifications**. Supabase triggers call an Edge Function, which talks to Expo's Push API.

## 2. Infrastructure
*   **Supabase Database**: Stores tokens (RLS protected).
*   **NestJS NotificationService**: Listening for events via Drizzle or a DB listener.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's hybridize notifications. Keep the `push_token` in the Supabase `profiles` table. In NestJS, create a listener that watches the `messages` table. When Drizzle sees a new message, have NestJS call the Expo Push API using `expo-server-sdk`. Iterate until I send a message in chat and receive a native notification triggered by the NestJS backend."

## 4. Key Checkpoints
- [ ] Permission popup shows on first login.
- [ ] Token saved in `profiles` table.
- [ ] Edge Function successfully fires on new message.
