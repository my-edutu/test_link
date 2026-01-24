# Vibe-Coding Guide: Contributor Monetization

**Vibe**: "Your voice is cultural gold."

## 1. The Strategy
Enable users to earn rewards directly for contributing voice and video clips to the archive.

## 2. Infrastructure
*   `voice_clips.reward_amount`: Decimal field.
*   `transactions` table: Tracks the credit to user wallet.
*   PostgreSQL trigger on `voice_clips` validation status change.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's monetize cultural contributions. In NestJS, create a `ClipService` that handles status updates. When a clip is marked 'Approved', use Drizzle's `db.transaction()` to pay the contributor. The app's Wallet screen (powered by Supabase) will automatically reflect the new balance. Iterate until approving a clip via my NestJS API increases a user's balance visible in their mobile wallet."

## 4. Key Checkpoints
- [ ] Reward amount is configurable by admin.
- [ ] Transaction history shows 'Content Contribution' reward.
- [ ] Creator balance updates immediately upon validation.
