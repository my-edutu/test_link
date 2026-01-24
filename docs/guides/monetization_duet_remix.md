# Vibe-Coding Guide: Duet & Remix Monetization

**Vibe**: "Braiding the heritage threads."

## 1. The Strategy
Share royalties between original creators and those who remix or duet their content.

## 2. Infrastructure
*   `duet_royalties`: 70/30 split logic.
*   `original_clip_id`: Link to the parent content.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build a Hybrid Remix economy. When a user creates a Duet, Supabase handles the media upload. Then, create a NestJS `RoyaltyService` that uses Drizzle to listen for engagement on that Duet. If a Duet earns a reward, NestJS should distribute 70% to the Duet creator and 30% to the original creator. Iterate until both users see 'Royalty Credited' in their Supabase-powered transaction history from a single NestJS event."

## 4. Key Checkpoints
- [ ] Parent-child relationship preserved in metadata.
- [ ] Split logic is handled server-side to prevent fraud.
- [ ] Original creators notified when they earn royalties from a duet.
