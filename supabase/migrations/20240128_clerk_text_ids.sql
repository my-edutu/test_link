-- Migration: Change UUID user ID columns to TEXT for Clerk compatibility
-- Run this in your Supabase SQL Editor
-- IMPORTANT: Back up your data before running this migration!

-- ============================================
-- PROFILES TABLE (primary user table)
-- ============================================
ALTER TABLE profiles
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE profiles
  ALTER COLUMN referred_by_id TYPE text USING referred_by_id::text;

-- ============================================
-- REFERRAL_STATS TABLE
-- ============================================
ALTER TABLE referral_stats
  ALTER COLUMN ambassador_id TYPE text USING ambassador_id::text;

-- ============================================
-- LIVE_MESSAGES TABLE
-- ============================================
ALTER TABLE live_messages
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- LIVE_STREAMS TABLE
-- ============================================
ALTER TABLE live_streams
  ALTER COLUMN streamer_id TYPE text USING streamer_id::text;

-- ============================================
-- USER_BADGES TABLE
-- ============================================
ALTER TABLE user_badges
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- VOICE_CLIPS TABLE
-- ============================================
ALTER TABLE voice_clips
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- VALIDATIONS TABLE
-- ============================================
ALTER TABLE validations
  ALTER COLUMN validator_id TYPE text USING validator_id::text;

-- ============================================
-- TRANSACTIONS TABLE
-- ============================================
ALTER TABLE transactions
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- NOTIFICATION_LOGS TABLE
-- ============================================
ALTER TABLE notification_logs
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- CLIP_FLAGS TABLE
-- ============================================
ALTER TABLE clip_flags
  ALTER COLUMN flagged_by TYPE text USING flagged_by::text;

ALTER TABLE clip_flags
  ALTER COLUMN resolved_by TYPE text USING resolved_by::text;

-- ============================================
-- WITHDRAWALS TABLE
-- ============================================
ALTER TABLE withdrawals
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- PAYOUT_REQUESTS TABLE
-- ============================================
ALTER TABLE payout_requests
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- REPORTS TABLE
-- ============================================
ALTER TABLE reports
  ALTER COLUMN reporter_id TYPE text USING reporter_id::text;

ALTER TABLE reports
  ALTER COLUMN reported_user_id TYPE text USING reported_user_id::text;

ALTER TABLE reports
  ALTER COLUMN resolver_id TYPE text USING resolver_id::text;

-- ============================================
-- CONVERSATION_MEMBERS TABLE
-- ============================================
ALTER TABLE conversation_members
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- MESSAGES TABLE
-- ============================================
ALTER TABLE messages
  ALTER COLUMN sender_id TYPE text USING sender_id::text;

-- ============================================
-- AUDIT_LOGS TABLE
-- ============================================
ALTER TABLE audit_logs
  ALTER COLUMN admin_id TYPE text USING admin_id::text;

ALTER TABLE audit_logs
  ALTER COLUMN target_id TYPE text USING target_id::text;

-- ============================================
-- LINKED_BANK_ACCOUNTS TABLE
-- ============================================
ALTER TABLE linked_bank_accounts
  ALTER COLUMN user_id TYPE text USING user_id::text;

-- ============================================
-- UPDATE RLS POLICIES (if using auth.uid())
-- ============================================
-- Note: If you have RLS policies that use auth.uid()::uuid,
-- you'll need to update them to use auth.uid()::text or
-- update to use the Clerk JWT's sub claim.
--
-- Example of updating an RLS policy:
-- DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
-- CREATE POLICY "Users can view own profile" ON profiles
--   FOR SELECT USING (id = auth.jwt()->>'sub');

-- ============================================
-- DONE
-- ============================================
-- After running this migration:
-- 1. Set up JWT template "supabase" in Clerk Dashboard r
-- 2. Configure RLS policies to use Clerk's JWT sub claim
