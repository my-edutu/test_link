# Vibe-Coding Guide: Payment Gateway for Rewards

**Vibe**: "Fueling the Guardians."

## 1. The Strategy
Use **Paystack** or **Flutterwave** for regional optimization, or **Stripe** for global. Handle security via Supabase Edge Functions.

## 2. Infrastructure
*   **Supabase Client**: Standard fetch for UI.
*   **NestJS SyncController**: Atomic processing via Drizzle `db.transaction()`.
*   **SQLite Outbox**: Local storage in the app.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's monetize the heritage vault with a Hybrid Hub. Use Supabase to display the user's wallet UI. For actual payments, create a NestJS Controller to handle Paystack/Stripe webhooks. In the NestJS webhook handler, use Drizzle to update the user's balance in the shared Postgres DB. Iterate until I can simulate a payment that reflects in the Supabase UI immediately after NestJS processes the webhook."

## 4. Key Checkpoints
- [ ] Checkout URL opens correctly.
- [ ] Webhook signature verification implemented (Security!).
- [ ] Balance update is atomic (+1 transaction record).
