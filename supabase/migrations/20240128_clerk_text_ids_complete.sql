-- ==============================================================================
-- COMPREHENSIVE MIGRATION: UUID -> TEXT for User IDs (Clerk Compatibility)
-- ==============================================================================

-- 1. DROP DEPENDENT VIEWS
-- ============================================
DROP VIEW IF EXISTS notification_counts;
DROP VIEW IF EXISTS follower_counts;
DROP VIEW IF EXISTS mutual_follows;
DROP VIEW IF EXISTS voice_clip_comment_counts;
DROP VIEW IF EXISTS voice_clip_like_counts;
DROP VIEW IF EXISTS voice_clip_validation_stats;

-- 2. DROP CONFLICTING POLICIES (ALL OF THEM)
-- ============================================

-- profiles
DROP POLICY IF EXISTS "Read profiles" ON profiles;
DROP POLICY IF EXISTS "Insert own profile" ON profiles;
DROP POLICY IF EXISTS "Update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view other profiles" ON profiles;

-- referral_stats
DROP POLICY IF EXISTS "Users view own referral stats" ON referral_stats;

-- live_messages
DROP POLICY IF EXISTS "Auth post chat" ON live_messages;
DROP POLICY IF EXISTS "Public read chat" ON live_messages;

-- live_streams
DROP POLICY IF EXISTS "Users can create their own streams" ON live_streams;
DROP POLICY IF EXISTS "Users can update their own streams" ON live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON live_streams;
DROP POLICY IF EXISTS "Public read streams" ON live_streams;

-- user_badges
DROP POLICY IF EXISTS "Public read user badges" ON user_badges;

-- voice_clips
DROP POLICY IF EXISTS "Users can view all voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can insert their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can update their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can delete their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_insert_own" ON voice_clips;

-- validations
DROP POLICY IF EXISTS "Users can update their own validations" ON validations;
DROP POLICY IF EXISTS "Users can delete their own validations" ON validations;
DROP POLICY IF EXISTS "Users can create validations for clips they didn't create" ON validations;
DROP POLICY IF EXISTS "Users can view all validations" ON validations;

-- transactions
DROP POLICY IF EXISTS "Users view own transactions" ON transactions;

-- notification_logs
DROP POLICY IF EXISTS "Users view own notifications" ON notification_logs;

-- clip_flags
DROP POLICY IF EXISTS "Users view own clip flags" ON clip_flags;

-- withdrawals
DROP POLICY IF EXISTS "Users view own withdrawals" ON withdrawals;

-- payout_requests
DROP POLICY IF EXISTS "Users view own payout requests" ON payout_requests;

-- reports
DROP POLICY IF EXISTS "Users can view their own reports" ON reports;
DROP POLICY IF EXISTS "Users can create reports" ON reports;
DROP POLICY IF EXISTS "Admins can view all reports" ON reports;
DROP POLICY IF EXISTS "Admins can update reports" ON reports;

-- conversation_members
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_delete" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
-- Try variations found in logs/previous
DROP POLICY IF EXISTS "conversation_members_insert" ON conversation_members;
DROP POLICY IF EXISTS "conversation_members_select" ON conversation_members;
DROP POLICY IF EXISTS "conversation_members_update" ON conversation_members;
DROP POLICY IF EXISTS "conversation_members_delete" ON conversation_members;

-- messages
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

-- conversations
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;

-- message_reads
DROP POLICY IF EXISTS "message_reads_insert" ON message_reads;
DROP POLICY IF EXISTS "message_reads_select" ON message_reads;

-- audit_logs
DROP POLICY IF EXISTS "admins_can_view_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "audit_logs_service_only" ON audit_logs;
DROP POLICY IF EXISTS "service_can_insert_audit_logs" ON audit_logs;

-- linked_bank_accounts
DROP POLICY IF EXISTS "linked_bank_accounts_user_select" ON linked_bank_accounts;
DROP POLICY IF EXISTS "linked_bank_accounts_user_insert" ON linked_bank_accounts;
DROP POLICY IF EXISTS "linked_bank_accounts_user_update" ON linked_bank_accounts;
DROP POLICY IF EXISTS "linked_bank_accounts_user_delete" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_view_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_insert_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_update_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "users_delete_own_bank_accounts" ON linked_bank_accounts;
DROP POLICY IF EXISTS "admins_view_all_bank_accounts" ON linked_bank_accounts;

-- notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications for users" ON notifications;

-- followers
DROP POLICY IF EXISTS "Users can view all follower relationships" ON followers;
DROP POLICY IF EXISTS "Users can create their own follow relationships" ON followers;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON followers;

-- comments
DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;

-- likes
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "likes_select_all" ON likes;
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;

-- user_interests
DROP POLICY IF EXISTS "Users can view their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can insert their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can update their own interests" ON user_interests;
DROP POLICY IF EXISTS "Users can delete their own interests" ON user_interests;

-- video_clips
DROP POLICY IF EXISTS "video_clips_select_all" ON video_clips;
DROP POLICY IF EXISTS "video_clips_update_own" ON video_clips;
DROP POLICY IF EXISTS "video_clips_delete_own" ON video_clips;
DROP POLICY IF EXISTS "video_clips_insert_own" ON video_clips;

-- admin_actions
DROP POLICY IF EXISTS "Admins can view all admin actions" ON admin_actions;

-- notification_outbox
DROP POLICY IF EXISTS "Admins can view outbox" ON notification_outbox;


-- 3. DROP FOREIGN KEYS
-- ============================================

-- Important: Drop connection to auth.users for profiles using standard name
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drops for tables confirmed to have FKs
ALTER TABLE voice_clips DROP CONSTRAINT IF EXISTS voice_clips_user_id_fkey;
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;
ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_validator_id_fkey;
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_referred_by_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE user_interests DROP CONSTRAINT IF EXISTS user_interests_user_id_fkey;
ALTER TABLE referral_stats DROP CONSTRAINT IF EXISTS referral_stats_ambassador_id_fkey;
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_user_id_fkey;
ALTER TABLE video_clips DROP CONSTRAINT IF EXISTS video_clips_user_id_fkey;
ALTER TABLE live_streams DROP CONSTRAINT IF EXISTS live_streams_streamer_id_fkey;
ALTER TABLE notification_logs DROP CONSTRAINT IF EXISTS notification_logs_user_id_fkey;
ALTER TABLE clip_flags DROP CONSTRAINT IF EXISTS clip_flags_flagged_by_fkey;
ALTER TABLE clip_flags DROP CONSTRAINT IF EXISTS clip_flags_resolved_by_fkey;
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS withdrawals_user_id_fkey;
ALTER TABLE payout_requests DROP CONSTRAINT IF EXISTS payout_requests_user_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reporter_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_reported_user_id_fkey;
ALTER TABLE reports DROP CONSTRAINT IF EXISTS reports_resolver_id_fkey;
ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
ALTER TABLE live_messages DROP CONSTRAINT IF EXISTS live_messages_user_id_fkey;
ALTER TABLE conversation_members DROP CONSTRAINT IF EXISTS conversation_members_user_id_fkey;
ALTER TABLE messages DROP CONSTRAINT IF EXISTS messages_sender_id_fkey;
ALTER TABLE conversations DROP CONSTRAINT IF EXISTS conversations_created_by_fkey;
ALTER TABLE message_reads DROP CONSTRAINT IF EXISTS message_reads_user_id_fkey; -- Just in case

-- Speculative drops for others
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_admin_id_fkey;
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_target_id_fkey;
ALTER TABLE linked_bank_accounts DROP CONSTRAINT IF EXISTS linked_bank_accounts_user_id_fkey;


-- 4. ALTER COLUMNS TO TEXT
-- ============================================

ALTER TABLE profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE profiles ALTER COLUMN referred_by_id TYPE text USING referred_by_id::text;
ALTER TABLE referral_stats ALTER COLUMN ambassador_id TYPE text USING ambassador_id::text;
ALTER TABLE live_messages ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE live_streams ALTER COLUMN streamer_id TYPE text USING streamer_id::text;
ALTER TABLE user_badges ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE voice_clips ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE validations ALTER COLUMN validator_id TYPE text USING validator_id::text;
ALTER TABLE transactions ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE notification_logs ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE clip_flags ALTER COLUMN flagged_by TYPE text USING flagged_by::text;
ALTER TABLE clip_flags ALTER COLUMN resolved_by TYPE text USING resolved_by::text;
ALTER TABLE withdrawals ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE payout_requests ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE reports ALTER COLUMN reporter_id TYPE text USING reporter_id::text;
ALTER TABLE reports ALTER COLUMN reported_user_id TYPE text USING reported_user_id::text;
ALTER TABLE reports ALTER COLUMN resolver_id TYPE text USING resolver_id::text;
ALTER TABLE conversation_members ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
ALTER TABLE audit_logs ALTER COLUMN admin_id TYPE text USING admin_id::text;
ALTER TABLE audit_logs ALTER COLUMN target_id TYPE text USING target_id::text;
ALTER TABLE linked_bank_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE conversations ALTER COLUMN created_by TYPE text USING created_by::text;
ALTER TABLE message_reads ALTER COLUMN user_id TYPE text USING user_id::text;

-- Additional tables
ALTER TABLE notifications ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE followers ALTER COLUMN follower_id TYPE text USING follower_id::text;
ALTER TABLE followers ALTER COLUMN following_id TYPE text USING following_id::text;
ALTER TABLE comments ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE likes ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE user_interests ALTER COLUMN user_id TYPE text USING user_id::text;
ALTER TABLE video_clips ALTER COLUMN user_id TYPE text USING user_id::text;


-- 5. RECREATE FOREIGN KEYS
-- ============================================

ALTER TABLE voice_clips ADD CONSTRAINT voice_clips_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE followers ADD CONSTRAINT followers_follower_id_fkey FOREIGN KEY (follower_id) REFERENCES profiles(id);
ALTER TABLE followers ADD CONSTRAINT followers_following_id_fkey FOREIGN KEY (following_id) REFERENCES profiles(id);
ALTER TABLE validations ADD CONSTRAINT validations_validator_id_fkey FOREIGN KEY (validator_id) REFERENCES profiles(id);
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE profiles ADD CONSTRAINT profiles_referred_by_id_fkey FOREIGN KEY (referred_by_id) REFERENCES profiles(id);
ALTER TABLE comments ADD CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE likes ADD CONSTRAINT likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE user_interests ADD CONSTRAINT user_interests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE referral_stats ADD CONSTRAINT referral_stats_ambassador_id_fkey FOREIGN KEY (ambassador_id) REFERENCES profiles(id);
ALTER TABLE transactions ADD CONSTRAINT transactions_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE video_clips ADD CONSTRAINT video_clips_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE live_streams ADD CONSTRAINT live_streams_streamer_id_fkey FOREIGN KEY (streamer_id) REFERENCES profiles(id);
ALTER TABLE notification_logs ADD CONSTRAINT notification_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE clip_flags ADD CONSTRAINT clip_flags_flagged_by_fkey FOREIGN KEY (flagged_by) REFERENCES profiles(id);
ALTER TABLE clip_flags ADD CONSTRAINT clip_flags_resolved_by_fkey FOREIGN KEY (resolved_by) REFERENCES profiles(id);
ALTER TABLE withdrawals ADD CONSTRAINT withdrawals_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE payout_requests ADD CONSTRAINT payout_requests_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE reports ADD CONSTRAINT reports_reporter_id_fkey FOREIGN KEY (reporter_id) REFERENCES profiles(id);
ALTER TABLE reports ADD CONSTRAINT reports_reported_user_id_fkey FOREIGN KEY (reported_user_id) REFERENCES profiles(id);
ALTER TABLE reports ADD CONSTRAINT reports_resolver_id_fkey FOREIGN KEY (resolver_id) REFERENCES profiles(id);
ALTER TABLE conversations ADD CONSTRAINT conversations_created_by_fkey FOREIGN KEY (created_by) REFERENCES profiles(id);

-- Restored from previous iteration
ALTER TABLE user_badges ADD CONSTRAINT user_badges_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE live_messages ADD CONSTRAINT live_messages_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE conversation_members ADD CONSTRAINT conversation_members_user_id_fkey FOREIGN KEY (user_id) REFERENCES profiles(id);
ALTER TABLE messages ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES profiles(id);

-- 6. RECREATE POLICIES (with auth.uid()::text)
-- ============================================

-- profiles
CREATE POLICY "Insert own profile" ON profiles FOR INSERT WITH CHECK (auth.uid()::text = id);
CREATE POLICY "Update own profile" ON profiles FOR UPDATE USING (auth.uid()::text = id);
CREATE POLICY "Read profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users can view other profiles" ON profiles FOR SELECT USING (true);

-- live_streams
CREATE POLICY "Users can create their own streams" ON live_streams FOR INSERT WITH CHECK (auth.uid()::text = streamer_id);
CREATE POLICY "Users can update their own streams" ON live_streams FOR UPDATE USING (auth.uid()::text = streamer_id);
CREATE POLICY "Users can delete their own streams" ON live_streams FOR DELETE USING (auth.uid()::text = streamer_id);
CREATE POLICY "Public read streams" ON live_streams FOR SELECT USING (true);

-- live_messages
CREATE POLICY "Auth post chat" ON live_messages FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Public read chat" ON live_messages FOR SELECT USING (true);

-- user_badges
CREATE POLICY "Public read user badges" ON user_badges FOR SELECT USING (true);

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

-- conversations
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM conversation_members m
    WHERE m.conversation_id = conversations.id 
    AND m.user_id = auth.uid()::text
  )
);
CREATE POLICY "conversations_insert" ON conversations FOR INSERT WITH CHECK (
  (auth.uid()::text IS NOT NULL) AND (created_by = auth.uid()::text) AND (is_group = true)
);
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
  EXISTS ( 
    SELECT 1 FROM conversation_members m
    WHERE m.conversation_id = conversations.id 
    AND m.user_id = auth.uid()::text
  )
);

-- message_reads
CREATE POLICY "message_reads_insert" ON message_reads FOR INSERT WITH CHECK (
  (user_id = auth.uid()::text) AND (EXISTS ( 
    SELECT 1 FROM messages ms
    JOIN conversation_members m ON ((m.conversation_id = ms.conversation_id) AND (m.user_id = auth.uid()::text))
    WHERE ms.id = message_reads.message_id
  ))
);
CREATE POLICY "message_reads_select" ON message_reads FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM messages ms
    JOIN conversation_members m ON ((m.conversation_id = ms.conversation_id) AND (m.user_id = auth.uid()::text))
    WHERE ms.id = message_reads.message_id
  )
);

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

-- notifications
CREATE POLICY "Users can view their own notifications" ON notifications FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own notifications" ON notifications FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "System can create notifications for users" ON notifications FOR INSERT WITH CHECK (true);

-- followers
CREATE POLICY "Users can view all follower relationships" ON followers FOR SELECT USING (true);
CREATE POLICY "Users can create their own follow relationships" ON followers FOR INSERT WITH CHECK (auth.uid()::text = follower_id);
CREATE POLICY "Users can delete their own follow relationships" ON followers FOR DELETE USING (auth.uid()::text = follower_id);

-- comments
CREATE POLICY "Users can create their own comments" ON comments FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can view all comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Users can update their own comments" ON comments FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own comments" ON comments FOR DELETE USING (auth.uid()::text = user_id);

-- likes
CREATE POLICY "Users can view all likes" ON likes FOR SELECT USING (true);
CREATE POLICY "Users can create their own likes" ON likes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own likes" ON likes FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "likes_select_all" ON likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own" ON likes FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "likes_delete_own" ON likes FOR DELETE USING (auth.uid()::text = user_id);

-- user_interests
CREATE POLICY "Users can view their own interests" ON user_interests FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can insert their own interests" ON user_interests FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can update their own interests" ON user_interests FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "Users can delete their own interests" ON user_interests FOR DELETE USING (auth.uid()::text = user_id);

-- video_clips
CREATE POLICY "video_clips_select_all" ON video_clips FOR SELECT USING (true);
CREATE POLICY "video_clips_update_own" ON video_clips FOR UPDATE USING (user_id = auth.uid()::text);
CREATE POLICY "video_clips_delete_own" ON video_clips FOR DELETE USING (user_id = auth.uid()::text);
CREATE POLICY "video_clips_insert_own" ON video_clips FOR INSERT WITH CHECK (auth.uid()::text = user_id);

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
CREATE POLICY "voice_clips_insert_own" ON voice_clips FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "Users can view all voice clips" ON voice_clips FOR SELECT USING (true);

-- validations
CREATE POLICY "Users can update their own validations" ON validations FOR UPDATE USING (auth.uid()::text = validator_id);
CREATE POLICY "Users can delete their own validations" ON validations FOR DELETE USING (auth.uid()::text = validator_id);
CREATE POLICY "Users can view all validations" ON validations FOR SELECT USING (true); 
CREATE POLICY "Users can create validations for clips they didn't create" ON validations FOR INSERT WITH CHECK (
  (auth.uid()::text = validator_id) AND (
    (EXISTS ( SELECT 1 FROM voice_clips WHERE ((voice_clips.id = validations.voice_clip_id) AND (voice_clips.user_id <> auth.uid()::text)))) 
    OR 
    (EXISTS ( SELECT 1 FROM video_clips WHERE ((video_clips.id = validations.voice_clip_id) AND (video_clips.user_id <> auth.uid()::text))))
  )
);

-- linked_bank_accounts
CREATE POLICY "linked_bank_accounts_user_update" ON linked_bank_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "linked_bank_accounts_user_delete" ON linked_bank_accounts FOR DELETE USING (auth.uid()::text = user_id);
CREATE POLICY "users_view_own_bank_accounts" ON linked_bank_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "users_insert_own_bank_accounts" ON linked_bank_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);
CREATE POLICY "users_update_own_bank_accounts" ON linked_bank_accounts FOR UPDATE USING (auth.uid()::text = user_id);
CREATE POLICY "linked_bank_accounts_user_select" ON linked_bank_accounts FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "linked_bank_accounts_user_insert" ON linked_bank_accounts FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- audit_logs
CREATE POLICY "audit_logs_service_only" ON audit_logs FOR ALL USING (false); -- Assuming service only
CREATE POLICY "admins_can_view_audit_logs" ON audit_logs FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text AND profiles.is_admin = true
  )
);
CREATE POLICY "service_can_insert_audit_logs" ON audit_logs FOR INSERT WITH CHECK (true); -- Assuming service role only needs access, simplistic recreation

-- admins_view_all_bank_accounts (on linked_bank_accounts)
CREATE POLICY "admins_view_all_bank_accounts" ON linked_bank_accounts FOR SELECT USING (
  EXISTS ( 
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()::text AND profiles.is_admin = true
  )
);

-- admin_actions
CREATE POLICY "Admins can view all admin actions" ON admin_actions FOR SELECT USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.admin_roles IS NOT NULL AND array_length(profiles.admin_roles, 1) > 0 )
);

-- notification_outbox
CREATE POLICY "Admins can view outbox" ON notification_outbox FOR SELECT USING (
  EXISTS ( SELECT 1 FROM profiles WHERE profiles.id = auth.uid()::text AND profiles.is_admin = true )
);

-- 7. RECREATE VIEWS
-- ============================================

CREATE VIEW notification_counts AS
 SELECT p.id AS user_id,
    p.username,
    p.full_name,
    COALESCE(n.total_notifications, (0)::bigint) AS total_notifications,
    COALESCE(n.unread_count, (0)::bigint) AS unread_count
   FROM (profiles p
     LEFT JOIN ( SELECT notifications.user_id,
            count(*) AS total_notifications,
            count(
                CASE
                    WHEN (notifications.is_read = false) THEN 1
                    ELSE NULL::integer
                END) AS unread_count
           FROM notifications
          GROUP BY notifications.user_id) n ON ((p.id = n.user_id)));

CREATE VIEW follower_counts AS
 SELECT p.id AS user_id,
    p.username,
    p.full_name,
    count(DISTINCT f1.follower_id) AS followers_count,
    count(DISTINCT f2.following_id) AS following_count
   FROM ((profiles p
     LEFT JOIN followers f1 ON ((p.id = f1.following_id)))
     LEFT JOIN followers f2 ON ((p.id = f2.follower_id)))
  GROUP BY p.id, p.username, p.full_name;

CREATE VIEW mutual_follows AS
 SELECT f1.follower_id AS user1_id,
    f1.following_id AS user2_id,
    f1.created_at AS follow_date
   FROM (followers f1
     JOIN followers f2 ON (((f1.follower_id = f2.following_id) AND (f1.following_id = f2.follower_id))))
  WHERE (f1.follower_id < f1.following_id);

CREATE VIEW voice_clip_comment_counts AS
 SELECT vc.id AS voice_clip_id,
    count(c.id) AS comments_count,
    count(DISTINCT c.user_id) AS unique_commenters_count
   FROM (voice_clips vc
     LEFT JOIN comments c ON (((vc.id = c.voice_clip_id) AND (c.parent_comment_id IS NULL))))
  GROUP BY vc.id;

CREATE VIEW voice_clip_like_counts AS
 SELECT vc.id AS voice_clip_id,
    count(l.id) AS likes_count
   FROM (voice_clips vc
     LEFT JOIN likes l ON (((vc.id = l.target_id) AND (l.target_type = 'voice_clip'::text))))
  GROUP BY vc.id;

CREATE VIEW voice_clip_validation_stats AS
 SELECT vc.id AS voice_clip_id,
    vc.phrase,
    vc.language,
    vc.user_id,
    count(v.id) AS total_validations,
    count(
        CASE
            WHEN (v.is_approved = true) THEN 1
            ELSE NULL::integer
        END) AS approved_validations,
    count(
        CASE
            WHEN (v.is_approved = false) THEN 1
            ELSE NULL::integer
        END) AS rejected_validations,
    avg(v.rating) AS average_rating,
        CASE
            WHEN ((count(v.id) >= 3) AND (avg(v.rating) >= 4.0)) THEN true
            ELSE false
        END AS is_validated,
    max(v.created_at) AS last_validation_date
   FROM (voice_clips vc
     LEFT JOIN validations v ON ((vc.id = v.voice_clip_id)))
  GROUP BY vc.id, vc.phrase, vc.language, vc.user_id;
