# Vibe-Coding Guide: Ambassador Program

**Vibe**: "Leading the Heritage Guardians."

## 1. The Strategy
Empower super-users with custom referral tools and bonus multipliers.

## 2. Infrastructure
*   `profiles.is_ambassador`: Boolean flag.
*   `referral_codes`: Table to track custom vanity codes (e.g. `IGBO-LEADER`).
*   `ambassador_stats`: Materialized view for real-time leaderboard.

## 3. Ralph Wiggum "Vibe & Iterate"
Ask Antigravity:
> "Antigravity, let's build the Hybrid 'Heritage Ambassador' dashboard. Use Supabase to pull high-level referral stats for the UI. For generating custom vanity codes, create a NestJS endpoint. NestJS should use Drizzle to verify the code's uniqueness in Postgres. Iterate until an Ambassador can set their 'IGBO-CHAMP' code via NestJS and see their live rank pulled from the shared DB."

## 4. Key Checkpoints
- [ ] Vanity code uniqueness checked in DB.
- [ ] Referral attribution working via deep-links.
- [ ] Ambassador-only UI elements visible.
