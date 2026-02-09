-- ================================================
-- COMPLETE MIGRATION: UUID to TEXT for Clerk IDs
-- Run this in Supabase SQL Editor
-- ================================================

-- ================================================
-- STEP 1: DROP ALL RLS POLICIES ON ALL AFFECTED TABLES
-- ================================================

-- Function to drop all policies on a table
CREATE OR REPLACE FUNCTION drop_all_policies(target_table text) RETURNS void AS $$
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN
        SELECT policyname FROM pg_policies WHERE tablename = target_table
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, target_table);
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Drop policies on all tables we need to alter
SELECT drop_all_policies('profiles');
SELECT drop_all_policies('notifications');
SELECT drop_all_policies('follows');
SELECT drop_all_policies('voice_clips');
SELECT drop_all_policies('transactions');
SELECT drop_all_policies('messages');
SELECT drop_all_policies('conversation_members');
SELECT drop_all_policies('validations');
SELECT drop_all_policies('user_badges');
SELECT drop_all_policies('live_messages');
SELECT drop_all_policies('live_streams');
SELECT drop_all_policies('withdrawals');
SELECT drop_all_policies('notification_logs');
SELECT drop_all_policies('payout_requests');
SELECT drop_all_policies('linked_bank_accounts');
SELECT drop_all_policies('clip_flags');
SELECT drop_all_policies('reports');
SELECT drop_all_policies('audit_logs');
SELECT drop_all_policies('referral_stats');
SELECT drop_all_policies('stories');
SELECT drop_all_policies('story_views');
SELECT drop_all_policies('comments');
SELECT drop_all_policies('likes');
SELECT drop_all_policies('message_reads');
SELECT drop_all_policies('conversations');
SELECT drop_all_policies('groups');
SELECT drop_all_policies('group_members');

-- Clean up the helper function
DROP FUNCTION IF EXISTS drop_all_policies(text);

-- ================================================
-- STEP 2: DROP DEPENDENT VIEWS
-- ================================================
DROP VIEW IF EXISTS notification_counts CASCADE;
DROP VIEW IF EXISTS follower_counts CASCADE;

-- ================================================
-- STEP 3: ALTER PROFILES TABLE
-- ================================================
ALTER TABLE profiles ALTER COLUMN id TYPE text USING id::text;
ALTER TABLE profiles ALTER COLUMN referred_by_id TYPE text USING referred_by_id::text;

-- ================================================
-- STEP 4: ALTER OTHER TABLES (skip if not exists)
-- ================================================

-- Notifications
DO $$ BEGIN
    ALTER TABLE notifications ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Follows
DO $$ BEGIN
    ALTER TABLE follows ALTER COLUMN follower_id TYPE text USING follower_id::text;
    ALTER TABLE follows ALTER COLUMN following_id TYPE text USING following_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Voice clips
DO $$ BEGIN
    ALTER TABLE voice_clips ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Transactions
DO $$ BEGIN
    ALTER TABLE transactions ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Messages
DO $$ BEGIN
    ALTER TABLE messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Conversation members
DO $$ BEGIN
    ALTER TABLE conversation_members ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Validations
DO $$ BEGIN
    ALTER TABLE validations ALTER COLUMN validator_id TYPE text USING validator_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- User badges
DO $$ BEGIN
    ALTER TABLE user_badges ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Live messages
DO $$ BEGIN
    ALTER TABLE live_messages ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Live streams
DO $$ BEGIN
    ALTER TABLE live_streams ALTER COLUMN streamer_id TYPE text USING streamer_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Withdrawals
DO $$ BEGIN
    ALTER TABLE withdrawals ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Notification logs
DO $$ BEGIN
    ALTER TABLE notification_logs ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Payout requests
DO $$ BEGIN
    ALTER TABLE payout_requests ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Linked bank accounts
DO $$ BEGIN
    ALTER TABLE linked_bank_accounts ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Clip flags
DO $$ BEGIN
    ALTER TABLE clip_flags ALTER COLUMN flagged_by TYPE text USING flagged_by::text;
    ALTER TABLE clip_flags ALTER COLUMN resolved_by TYPE text USING resolved_by::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Reports
DO $$ BEGIN
    ALTER TABLE reports ALTER COLUMN reporter_id TYPE text USING reporter_id::text;
    ALTER TABLE reports ALTER COLUMN reported_user_id TYPE text USING reported_user_id::text;
    ALTER TABLE reports ALTER COLUMN resolver_id TYPE text USING resolver_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Audit logs
DO $$ BEGIN
    ALTER TABLE audit_logs ALTER COLUMN admin_id TYPE text USING admin_id::text;
    ALTER TABLE audit_logs ALTER COLUMN target_id TYPE text USING target_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Referral stats
DO $$ BEGIN
    ALTER TABLE referral_stats ALTER COLUMN ambassador_id TYPE text USING ambassador_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Stories
DO $$ BEGIN
    ALTER TABLE stories ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Story views
DO $$ BEGIN
    ALTER TABLE story_views ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Comments
DO $$ BEGIN
    ALTER TABLE comments ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Likes
DO $$ BEGIN
    ALTER TABLE likes ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- Message reads
DO $$ BEGIN
    ALTER TABLE message_reads ALTER COLUMN user_id TYPE text USING user_id::text;
EXCEPTION WHEN undefined_table THEN NULL; WHEN undefined_column THEN NULL;
END $$;

-- ================================================
-- STEP 5: RECREATE VIEWS
-- ================================================

-- Recreate notification_counts view
CREATE OR REPLACE VIEW notification_counts AS
SELECT p.id AS user_id,
    p.username,
    p.full_name,
    COALESCE(n.total_notifications, 0::bigint) AS total_notifications,
    COALESCE(n.unread_count, 0::bigint) AS unread_count
FROM profiles p
LEFT JOIN (
    SELECT notifications.user_id,
        count(*) AS total_notifications,
        count(CASE WHEN notifications.is_read = false THEN 1 ELSE NULL END) AS unread_count
    FROM notifications
    GROUP BY notifications.user_id
) n ON p.id = n.user_id;

-- Recreate follower_counts view
CREATE OR REPLACE VIEW follower_counts AS
SELECT p.id AS user_id,
    p.username,
    p.full_name,
    count(DISTINCT f1.follower_id) AS followers_count,
    count(DISTINCT f2.following_id) AS following_count
FROM profiles p
LEFT JOIN follows f1 ON p.id = f1.following_id
LEFT JOIN follows f2 ON p.id = f2.follower_id
GROUP BY p.id, p.username, p.full_name;

-- ================================================
-- STEP 6: RECREATE RLS POLICIES (using Clerk JWT sub claim)
-- ================================================

-- Enable RLS on profiles if not already enabled
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Allow users to view all profiles (public read)
CREATE POLICY "Public profiles are viewable by everyone"
ON profiles FOR SELECT
USING (true);

-- Allow users to insert their own profile
CREATE POLICY "Users can insert own profile"
ON profiles FOR INSERT
WITH CHECK (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- Allow users to update their own profile
CREATE POLICY "Users can update own profile"
ON profiles FOR UPDATE
USING (id = current_setting('request.jwt.claims', true)::json->>'sub')
WITH CHECK (id = current_setting('request.jwt.claims', true)::json->>'sub');

-- ================================================
-- DONE! Migration complete.
-- ================================================
SELECT 'Migration completed successfully!' AS status;
