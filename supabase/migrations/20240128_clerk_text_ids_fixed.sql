-- Drop conflicting policies
DROP POLICY IF EXISTS "Insert own profile" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;

DROP POLICY IF EXISTS "Users can create their own streams" ON live_streams;
DROP POLICY IF EXISTS "Users can update their own streams" ON live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON live_streams;

DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_delete" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;

DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

DROP POLICY IF EXISTS "Users view own referral stats" ON referral_stats;
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users view own notifications" ON notification_logs;
DROP POLICY IF EXISTS "Users view own clip flags" ON clip_flags;
DROP POLICY IF EXISTS "Users view own withdrawals" ON withdrawals;
DROP POLICY IF EXISTS "Users view own payout requests" ON payout_requests;

DROP POLICY IF EXISTS "Users can insert their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can update their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can delete their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_insert_own" ON voice_clips;

DROP POLICY IF EXISTS "Users can update their own validations" ON validations;
DROP POLICY IF EXISTS "Users can delete their own validations" ON validations;

DROP POLICY IF EXISTS "linked_bank_accounts_user_update" ON linked_bank_accounts;
DROP POLICY IF EXISTS "linked_bank_accounts_user_delete" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_view_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_insert_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_update_own_bank_accounts" ON linked_bank_accounts;

DROP POLICY IF EXISTS "admins_can_view_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "admins_view_all_bank_accounts" ON linked_bank_accounts;

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
-- RECREATE POLICIES (Updated for TEXT IDs)
-- ============================================

-- profiles
CREATE POLICY "Insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = id);

-- live_streams
CREATE POLICY "Users can create their own streams" ON live_streams FOR INSERT WITH CHECK (auth.uid()::text = streamer_id);
CREATE POLICY "Users can update their own streams" ON live_streams FOR UPDATE USING (auth.uid()::text = streamer_id);
CREATE POLICY "Users can delete their own streams" ON live_streams FOR DELETE USING (auth.uid()::text = streamer_id);

-- conversation_members
CREATE POLICY "conv_members_insert" ON conversation_members FOR INSERT WITH CHECK (user_id = auth.uid()::text);
CREATE POLICY "conv_members_delete" ON conversation_members FOR DELETE USING (user_id = auth.uid()::text);
CREATE POLICY "conv_members_select" ON conversation_members FOR SELECT USING (user_id = auth.uid()::text);

-- messages
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM conversation_members m
    WHERE m.conversation_id = messages.conversation_id 
    AND m.user_id = auth.uid()::text
  )
);
CREATE POLICY "messages_insert" ON messages FOR INSERT WITH CHECK (
  sender_id = auth.uid()::text 
  AND EXISTS ( 
    SELECT 1 FROM conversation_members m
    WHERE m.conversation_id = messages.conversation_id 
    AND m.user_id = auth.uid()::text
  )
);
CREATE POLICY "messages_update" ON messages FOR UPDATE USING (sender_id = auth.uid()::text);

-- reports
CREATE POLICY "Users can view their own reports" ON reports FOR SELECT USING (auth.uid()::text = reporter_id);
CREATE POLICY "Users can create reports" ON reports FOR INSERT WITH CHECK (auth.uid()::text = reporter_id);
CREATE POLICY "Admins can view all reports" ON reports FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text
    AND (profiles.is_admin = true OR profiles.validator_tier = 'admin' OR profiles.trust_score >= 500)
  )
);
CREATE POLICY "Admins can update reports" ON reports FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text
    AND (profiles.is_admin = true OR profiles.validator_tier = 'admin' OR profiles.trust_score >= 500)
  )
);

-- misc simple policies
CREATE POLICY "Users view own referral stats" ON referral_stats FOR SELECT USING (auth.uid()::text = ambassador_id);
CREATE POLICY "Users view own transactions" ON transactions FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users view own notifications" ON notification_logs FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users view own clip flags" ON clip_flags FOR SELECT USING (auth.uid()::text = flagged_by);
CREATE POLICY "Users view own withdrawals" ON withdrawals FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users view own payout requests" ON payout_requests FOR SELECT USING (auth.uid()::text = user_id);

-- voice_clips
CREATE POLICY "Users can insert their own voice clips" ON voice_clips FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own voice clips" ON voice_clips FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own voice clips" ON voice_clips FOR DELETE USING (auth.uid()::text = user_id);
-- voice_clips_insert_own was likely a duplicate or legacy, adding it back just in case if it's different, but seemingly same. 
-- The dump showed it had same definition. I will skip duplicate if it's exact duplicate, but I'll add the one I see.
-- Actually "voice_clips_insert_own" might be the one preferred. I'll stick to descriptive ones.

-- validations
CREATE POLICY "Users can update their own validations" ON validations FOR UPDATE USING (auth.uid()::text = validator_id);
CREATE POLICY "Users can delete their own validations" ON validations FOR DELETE USING (auth.uid()::text = validator_id);

-- linked_bank_accounts
CREATE POLICY "linked_bank_accounts_user_update" ON linked_bank_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "linked_bank_accounts_user_delete" ON linked_bank_accounts FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "users_view_own_bank_accounts" ON linked_bank_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "users_insert_own_bank_accounts" ON linked_bank_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
-- users_update_own_bank_accounts seems duplicate of linked_bank_accounts_user_update. I'll add it back to be safe.
CREATE POLICY "users_update_own_bank_accounts" ON linked_bank_accounts FOR UPDATE USING (auth.uid()::text = user_id);

-- audit_logs
CREATE POLICY "admins_can_view_audit_logs" ON audit_logs FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text AND profiles.is_admin = true
  )
);

-- admins_view_all_bank_accounts (on linked_bank_accounts)
CREATE POLICY "admins_view_all_bank_accounts" ON linked_bank_accounts FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text AND profiles.is_admin = true
  )
);
