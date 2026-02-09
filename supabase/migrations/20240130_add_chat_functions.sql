-- Migration: Add chat tables and RPC functions
-- Run this in Supabase SQL Editor

-- =====================================================
-- 0. Create Chat Tables (if they don't exist)
-- =====================================================

-- Conversations table
CREATE TABLE IF NOT EXISTS conversations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT,
    created_by TEXT NOT NULL,
    is_group BOOLEAN DEFAULT false,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation members table
CREATE TABLE IF NOT EXISTS conversation_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- 'admin', 'member'
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    last_read_at TIMESTAMPTZ,
    UNIQUE(conversation_id, user_id)
);

-- Messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
    sender_id TEXT NOT NULL,
    text TEXT,
    type TEXT DEFAULT 'text', -- 'text', 'voice', 'image'
    media_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Followers table (for mutual followers feature)
CREATE TABLE IF NOT EXISTS followers (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    follower_id TEXT NOT NULL,
    following_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(follower_id, following_id)
);

-- Enable RLS on followers
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- Followers policies
DROP POLICY IF EXISTS "followers_select" ON followers;
CREATE POLICY "followers_select" ON followers FOR SELECT USING (true);

DROP POLICY IF EXISTS "followers_insert" ON followers;
CREATE POLICY "followers_insert" ON followers FOR INSERT
WITH CHECK (auth.uid()::text = follower_id);

DROP POLICY IF EXISTS "followers_delete" ON followers;
CREATE POLICY "followers_delete" ON followers FOR DELETE
USING (auth.uid()::text = follower_id);

-- Followers indexes
CREATE INDEX IF NOT EXISTS idx_followers_follower ON followers(follower_id);
CREATE INDEX IF NOT EXISTS idx_followers_following ON followers(following_id);

-- Enable RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_conversation_members_user ON conversation_members(user_id);
CREATE INDEX IF NOT EXISTS idx_conversation_members_conv ON conversation_members(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at DESC);

-- RLS Policies for conversations
DROP POLICY IF EXISTS "conversations_select" ON conversations;
CREATE POLICY "conversations_select" ON conversations FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversations.id
        AND cm.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "conversations_insert" ON conversations;
CREATE POLICY "conversations_insert" ON conversations FOR INSERT
WITH CHECK (auth.uid()::text IS NOT NULL AND created_by = auth.uid()::text);

DROP POLICY IF EXISTS "conversations_update" ON conversations;
CREATE POLICY "conversations_update" ON conversations FOR UPDATE USING (
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversations.id
        AND cm.user_id = auth.uid()::text
    )
);

-- RLS Policies for conversation_members
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
CREATE POLICY "conv_members_select" ON conversation_members FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = conversation_members.conversation_id
        AND cm.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;
CREATE POLICY "conv_members_insert" ON conversation_members FOR INSERT
WITH CHECK (auth.uid()::text IS NOT NULL);

-- RLS Policies for messages
DROP POLICY IF EXISTS "messages_select" ON messages;
CREATE POLICY "messages_select" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "messages_insert" ON messages;
CREATE POLICY "messages_insert" ON messages FOR INSERT
WITH CHECK (
    auth.uid()::text IS NOT NULL
    AND sender_id = auth.uid()::text
    AND EXISTS (
        SELECT 1 FROM conversation_members cm
        WHERE cm.conversation_id = messages.conversation_id
        AND cm.user_id = auth.uid()::text
    )
);

DROP POLICY IF EXISTS "messages_update" ON messages;
CREATE POLICY "messages_update" ON messages FOR UPDATE
USING (sender_id = auth.uid()::text);

-- =====================================================
-- 1. Create or Get DM Conversation
-- =====================================================
-- This function finds an existing DM between two users or creates a new one
CREATE OR REPLACE FUNCTION create_or_get_dm(target TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- Get current user ID from auth
    current_user_id := auth.uid()::text;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    IF current_user_id = target THEN
        RAISE EXCEPTION 'Cannot create conversation with yourself';
    END IF;

    -- Check if a DM conversation already exists between these two users
    SELECT c.id INTO existing_conversation_id
    FROM conversations c
    WHERE c.is_group = false
      AND EXISTS (
          SELECT 1 FROM conversation_members cm1
          WHERE cm1.conversation_id = c.id AND cm1.user_id = current_user_id
      )
      AND EXISTS (
          SELECT 1 FROM conversation_members cm2
          WHERE cm2.conversation_id = c.id AND cm2.user_id = target
      )
      AND (
          SELECT COUNT(*) FROM conversation_members cm
          WHERE cm.conversation_id = c.id
      ) = 2
    LIMIT 1;

    -- If conversation exists, return it
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;

    -- Create new conversation
    INSERT INTO conversations (title, created_by, is_group, created_at, last_message_at)
    VALUES ('', current_user_id, false, NOW(), NOW())
    RETURNING id INTO new_conversation_id;

    -- Add both users as members
    INSERT INTO conversation_members (conversation_id, user_id, role, joined_at)
    VALUES
        (new_conversation_id, current_user_id, 'member', NOW()),
        (new_conversation_id, target, 'member', NOW());

    RETURN new_conversation_id;
END;
$$;

-- =====================================================
-- 2. Get Conversations With Unread Count
-- =====================================================
CREATE OR REPLACE FUNCTION get_conversations_with_unread()
RETURNS TABLE (
    id UUID,
    title TEXT,
    created_by TEXT,
    is_group BOOLEAN,
    last_message_at TIMESTAMPTZ,
    last_message_preview TEXT,
    created_at TIMESTAMPTZ,
    unread_count BIGINT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        c.id,
        c.title,
        c.created_by,
        c.is_group,
        c.last_message_at,
        c.last_message_preview,
        c.created_at,
        COALESCE(
            (SELECT COUNT(*)
             FROM messages m
             WHERE m.conversation_id = c.id
               AND m.sender_id != current_user_id
               AND m.created_at > COALESCE(cm.last_read_at, '1970-01-01'::timestamptz)
            ), 0
        ) AS unread_count
    FROM conversations c
    INNER JOIN conversation_members cm ON cm.conversation_id = c.id AND cm.user_id = current_user_id
    ORDER BY c.last_message_at DESC NULLS LAST;
END;
$$;

-- =====================================================
-- 3. Get Other Participant in DM
-- =====================================================
CREATE OR REPLACE FUNCTION get_other_participant(p_conversation_id UUID)
RETURNS TABLE (
    id TEXT,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    primary_language TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.id,
        p.full_name,
        p.username,
        p.avatar_url,
        p.primary_language
    FROM profiles p
    INNER JOIN conversation_members cm ON cm.user_id = p.id
    WHERE cm.conversation_id = p_conversation_id
      AND p.id != current_user_id
    LIMIT 1;
END;
$$;

-- =====================================================
-- 4. Get Mutual Followers Count
-- =====================================================
CREATE OR REPLACE FUNCTION get_mutual_followers_count(viewer TEXT, profile TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    mutual_count INTEGER;
BEGIN
    -- Count users who are followed by both viewer and profile
    SELECT COUNT(*)::INTEGER INTO mutual_count
    FROM followers f1
    INNER JOIN followers f2 ON f1.following_id = f2.following_id
    WHERE f1.follower_id = viewer
      AND f2.follower_id = profile
      AND f1.following_id != viewer
      AND f1.following_id != profile;

    RETURN mutual_count;
END;
$$;

-- =====================================================
-- 5. Mark Messages as Read
-- =====================================================
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := auth.uid()::text;

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    UPDATE conversation_members
    SET last_read_at = NOW()
    WHERE conversation_id = p_conversation_id
      AND user_id = current_user_id;
END;
$$;

-- =====================================================
-- Add last_read_at column if missing
-- =====================================================
ALTER TABLE conversation_members
ADD COLUMN IF NOT EXISTS last_read_at TIMESTAMPTZ;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION create_or_get_dm(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_with_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION get_other_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_mutual_followers_count(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;
