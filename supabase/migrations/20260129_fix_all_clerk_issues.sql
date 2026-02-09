-- =====================================================
-- COMPREHENSIVE FIX FOR CLERK INTEGRATION ISSUES
-- Fixes: RLS infinite recursion, type mismatches, Clerk JWT compatibility
-- Run this in Supabase SQL Editor
-- =====================================================

-- =====================================================
-- 1. FIX INFINITE RECURSION IN CONVERSATION_MEMBERS RLS
-- =====================================================

-- Drop all problematic policies first
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;
DROP POLICY IF EXISTS "conv_members_delete" ON conversation_members;
DROP POLICY IF EXISTS "conversations_select" ON conversations;
DROP POLICY IF EXISTS "conversations_insert" ON conversations;
DROP POLICY IF EXISTS "conversations_update" ON conversations;
DROP POLICY IF EXISTS "messages_select" ON messages;
DROP POLICY IF EXISTS "messages_insert" ON messages;
DROP POLICY IF EXISTS "messages_update" ON messages;

-- Drop old policies that might exist with different names
DROP POLICY IF EXISTS "Users can view all follower relationships" ON followers;
DROP POLICY IF EXISTS "Users can create their own follow relationships" ON followers;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON followers;
DROP POLICY IF EXISTS "followers_select" ON followers;
DROP POLICY IF EXISTS "followers_insert" ON followers;
DROP POLICY IF EXISTS "followers_delete" ON followers;

-- Drop functions before redefining them (especially if return types change)
DROP FUNCTION IF EXISTS get_clerk_user_id() CASCADE;
DROP FUNCTION IF EXISTS is_conversation_member(uuid, text) CASCADE;
DROP FUNCTION IF EXISTS create_or_get_dm(text) CASCADE;
DROP FUNCTION IF EXISTS get_conversations_with_unread() CASCADE;
DROP FUNCTION IF EXISTS get_other_participant(uuid) CASCADE;
DROP FUNCTION IF EXISTS mark_messages_read(uuid) CASCADE;

-- =====================================================
-- 2. ENSURE ALL USER ID COLUMNS ARE TEXT TYPE (for Clerk IDs)
-- =====================================================

-- Alter followers table if needed
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'followers'
        AND column_name = 'follower_id' AND data_type = 'uuid'
    ) THEN
        -- Drop constraints first
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
        ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;
        -- Convert columns
        ALTER TABLE followers ALTER COLUMN follower_id TYPE text USING follower_id::text;
        ALTER TABLE followers ALTER COLUMN following_id TYPE text USING following_id::text;
    END IF;
END $$;

-- Ensure conversation_members user_id is text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conversation_members'
        AND column_name = 'user_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE conversation_members ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- Ensure conversations created_by is text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'conversations'
        AND column_name = 'created_by' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE conversations ALTER COLUMN created_by TYPE text USING created_by::text;
    END IF;
END $$;

-- Ensure messages sender_id is text
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'messages'
        AND column_name = 'sender_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
    END IF;
END $$;

-- =====================================================
-- 3. CREATE HELPER FUNCTION TO GET CLERK USER ID FROM JWT
-- =====================================================

CREATE OR REPLACE FUNCTION get_clerk_user_id()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    SELECT COALESCE(
        current_setting('request.jwt.claims', true)::json->>'sub',
        (current_setting('request.jwt.claims', true)::json->>'user_id')::text
    )
$$;

-- =====================================================
-- 4. CREATE NON-RECURSIVE RLS POLICIES FOR CONVERSATION_MEMBERS
-- =====================================================

-- Helper function to check if user is in a conversation (avoids RLS recursion)
CREATE OR REPLACE FUNCTION is_conversation_member(conv_id uuid, uid text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = conv_id AND user_id = uid
    )
$$;

-- Conversation members: Users can see all members of conversations they belong to
CREATE POLICY "conv_members_select" ON conversation_members
    FOR SELECT USING (
        is_conversation_member(conversation_id, get_clerk_user_id())
    );

-- Conversation members: Users can add members if they created the conversation or are adding themselves
CREATE POLICY "conv_members_insert" ON conversation_members
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND (
            -- User is adding themselves
            user_id = get_clerk_user_id()
            OR
            -- User is the creator of the conversation
            EXISTS (
                SELECT 1 FROM conversations c
                WHERE c.id = conversation_id
                AND c.created_by = get_clerk_user_id()
            )
        )
    );

-- Conversation members: Users can remove themselves
CREATE POLICY "conv_members_delete" ON conversation_members
    FOR DELETE USING (
        user_id = get_clerk_user_id()
    );

-- =====================================================
-- 5. FIX CONVERSATIONS POLICIES
-- =====================================================

-- Conversations: Users can see conversations they are members of
CREATE POLICY "conversations_select" ON conversations
    FOR SELECT USING (
        is_conversation_member(id, get_clerk_user_id())
    );

-- Conversations: Authenticated users can create conversations
CREATE POLICY "conversations_insert" ON conversations
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND created_by = get_clerk_user_id()
    );

-- Conversations: Members can update conversations
CREATE POLICY "conversations_update" ON conversations
    FOR UPDATE USING (
        is_conversation_member(id, get_clerk_user_id())
    );

-- =====================================================
-- 6. FIX MESSAGES POLICIES
-- =====================================================

-- Messages: Users can see messages in conversations they're members of
CREATE POLICY "messages_select" ON messages
    FOR SELECT USING (
        is_conversation_member(conversation_id, get_clerk_user_id())
    );

-- Messages: Users can send messages to conversations they're members of
CREATE POLICY "messages_insert" ON messages
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND sender_id = get_clerk_user_id()
        AND is_conversation_member(conversation_id, get_clerk_user_id())
    );

-- Messages: Users can update their own messages
CREATE POLICY "messages_update" ON messages
    FOR UPDATE USING (
        sender_id = get_clerk_user_id()
    );

-- =====================================================
-- 7. FIX FOLLOWERS POLICIES
-- =====================================================

-- Anyone can view follow relationships
CREATE POLICY "followers_select" ON followers
    FOR SELECT USING (true);

-- Users can create follow relationships where they are the follower
CREATE POLICY "followers_insert" ON followers
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND follower_id = get_clerk_user_id()
    );

-- Users can delete their own follow relationships
CREATE POLICY "followers_delete" ON followers
    FOR DELETE USING (
        follower_id = get_clerk_user_id()
    );

-- =====================================================
-- 8. FIX RPC FUNCTIONS TO USE CLERK USER ID
-- =====================================================

-- Update create_or_get_dm to use Clerk user ID
CREATE OR REPLACE FUNCTION create_or_get_dm(target TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- Get current user ID from Clerk JWT
    current_user_id := get_clerk_user_id();

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

-- Update get_conversations_with_unread to use Clerk user ID
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
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := get_clerk_user_id();

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

-- Update get_other_participant to use Clerk user ID
CREATE OR REPLACE FUNCTION get_other_participant(p_conversation_id UUID)
RETURNS TABLE (
    user_id TEXT,
    full_name TEXT,
    username TEXT,
    avatar_url TEXT,
    primary_language TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := get_clerk_user_id();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    RETURN QUERY
    SELECT
        p.id AS user_id,
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

-- Update mark_messages_read to use Clerk user ID
CREATE OR REPLACE FUNCTION mark_messages_read(p_conversation_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    current_user_id TEXT;
BEGIN
    current_user_id := get_clerk_user_id();

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
-- 9. GRANT PERMISSIONS
-- =====================================================

GRANT EXECUTE ON FUNCTION get_clerk_user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION is_conversation_member(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION create_or_get_dm(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversations_with_unread() TO authenticated;
GRANT EXECUTE ON FUNCTION get_other_participant(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_messages_read(UUID) TO authenticated;

-- =====================================================
-- 10. FIX LIKES TABLE FOR CLERK
-- =====================================================

-- Drop old likes policies
DROP POLICY IF EXISTS "Users can view all likes" ON likes;
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "likes_select_all" ON likes;
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;

-- Ensure likes.user_id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'likes'
        AND column_name = 'user_id' AND data_type = 'uuid'
    ) THEN
        -- Drop foreign key if exists
        ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
        -- Convert to text
        ALTER TABLE likes ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- Enable RLS on likes
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;

-- Create new Clerk-compatible policies for likes
CREATE POLICY "likes_select" ON likes
    FOR SELECT USING (true);

CREATE POLICY "likes_insert" ON likes
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND user_id = get_clerk_user_id()
    );

CREATE POLICY "likes_delete" ON likes
    FOR DELETE USING (
        user_id = get_clerk_user_id()
    );

-- =====================================================
-- 11. FIX COMMENTS TABLE FOR CLERK
-- =====================================================

-- Drop old comments policies
DROP POLICY IF EXISTS "Users can view all comments" ON comments;
DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "comments_select" ON comments;
DROP POLICY IF EXISTS "comments_insert" ON comments;
DROP POLICY IF EXISTS "comments_update" ON comments;
DROP POLICY IF EXISTS "comments_delete" ON comments;

-- Ensure comments.user_id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'comments'
        AND column_name = 'user_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
        ALTER TABLE comments ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- Enable RLS on comments
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Create new Clerk-compatible policies for comments
CREATE POLICY "comments_select" ON comments
    FOR SELECT USING (true);

CREATE POLICY "comments_insert" ON comments
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND user_id = get_clerk_user_id()
    );

CREATE POLICY "comments_update" ON comments
    FOR UPDATE USING (
        user_id = get_clerk_user_id()
    );

CREATE POLICY "comments_delete" ON comments
    FOR DELETE USING (
        user_id = get_clerk_user_id()
    );

-- =====================================================
-- 12. FIX VOICE_CLIPS TABLE FOR CLERK
-- =====================================================

-- Drop old voice_clips policies
DROP POLICY IF EXISTS "Users can view all voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can create their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can update their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "Users can delete their own voice clips" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_select" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_insert" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_update" ON voice_clips;
DROP POLICY IF EXISTS "voice_clips_delete" ON voice_clips;

-- Ensure voice_clips.user_id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'voice_clips'
        AND column_name = 'user_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE voice_clips DROP CONSTRAINT IF EXISTS voice_clips_user_id_fkey;
        ALTER TABLE voice_clips ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- Enable RLS on voice_clips
ALTER TABLE voice_clips ENABLE ROW LEVEL SECURITY;

-- Create new Clerk-compatible policies for voice_clips
CREATE POLICY "voice_clips_select" ON voice_clips
    FOR SELECT USING (true);

CREATE POLICY "voice_clips_insert" ON voice_clips
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND user_id = get_clerk_user_id()
    );

CREATE POLICY "voice_clips_update" ON voice_clips
    FOR UPDATE USING (
        user_id = get_clerk_user_id()
    );

CREATE POLICY "voice_clips_delete" ON voice_clips
    FOR DELETE USING (
        user_id = get_clerk_user_id()
    );

-- =====================================================
-- 13. FIX PROFILES TABLE FOR CLERK
-- =====================================================

-- Drop old profiles policies
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profiles" ON profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_insert" ON profiles;
DROP POLICY IF EXISTS "profiles_update" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create new Clerk-compatible policies for profiles
CREATE POLICY "profiles_select" ON profiles
    FOR SELECT USING (true);

CREATE POLICY "profiles_insert" ON profiles
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND id = get_clerk_user_id()
    );

CREATE POLICY "profiles_update" ON profiles
    FOR UPDATE USING (
        id = get_clerk_user_id()
    );

-- =====================================================
-- 14. FIX STORIES TABLE FOR CLERK (if exists)
-- =====================================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'stories') THEN
        -- Drop old stories policies
        DROP POLICY IF EXISTS "stories_select" ON stories;
        DROP POLICY IF EXISTS "stories_insert" ON stories;
        DROP POLICY IF EXISTS "stories_delete" ON stories;
        DROP POLICY IF EXISTS "Users can view public stories" ON stories;
        DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
        DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;

        -- Ensure stories.user_id is text type
        IF EXISTS (
            SELECT 1 FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = 'stories'
            AND column_name = 'user_id' AND data_type = 'uuid'
        ) THEN
            ALTER TABLE stories DROP CONSTRAINT IF EXISTS stories_user_id_fkey;
            ALTER TABLE stories ALTER COLUMN user_id TYPE text USING user_id::text;
        END IF;

        -- Enable RLS
        ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

        -- Create policies
        EXECUTE 'CREATE POLICY "stories_select" ON stories FOR SELECT USING (true)';
        EXECUTE 'CREATE POLICY "stories_insert" ON stories FOR INSERT WITH CHECK (get_clerk_user_id() IS NOT NULL AND user_id = get_clerk_user_id())';
        EXECUTE 'CREATE POLICY "stories_delete" ON stories FOR DELETE USING (user_id = get_clerk_user_id())';
    END IF;
END $$;

-- =====================================================
-- 15. REMOVE PROBLEMATIC FOREIGN KEY CONSTRAINTS
-- These FKs can cause issues when user profiles aren't synced yet
-- =====================================================

-- Drop FK constraints that reference profiles (they cause issues with Clerk)
ALTER TABLE likes DROP CONSTRAINT IF EXISTS likes_user_id_fkey;
ALTER TABLE comments DROP CONSTRAINT IF EXISTS comments_user_id_fkey;
ALTER TABLE voice_clips DROP CONSTRAINT IF EXISTS voice_clips_user_id_fkey;
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_follower_id_fkey;
ALTER TABLE followers DROP CONSTRAINT IF EXISTS followers_following_id_fkey;

-- =====================================================
-- 16. FIX BADGES AND USER_BADGES TABLES
-- =====================================================

-- Ensure badges table has required columns (add tier, requirement_type, requirement_value if missing)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'tier') THEN
        ALTER TABLE badges ADD COLUMN tier TEXT DEFAULT 'bronze';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'requirement_type') THEN
        ALTER TABLE badges ADD COLUMN requirement_type TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'badges' AND column_name = 'requirement_value') THEN
        ALTER TABLE badges ADD COLUMN requirement_value INTEGER;
    END IF;
END $$;

-- Fix user_badges.user_id to be text type for Clerk IDs
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'user_badges'
        AND column_name = 'user_id' AND data_type = 'uuid'
    ) THEN
        -- Drop foreign key constraint if exists
        ALTER TABLE user_badges DROP CONSTRAINT IF EXISTS user_badges_user_id_fkey;
        -- Convert to text
        ALTER TABLE user_badges ALTER COLUMN user_id TYPE text USING user_id::text;
    END IF;
END $$;

-- Enable RLS on badges tables
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for badges
DROP POLICY IF EXISTS "Public read badges" ON badges;
DROP POLICY IF EXISTS "badges_select" ON badges;
CREATE POLICY "badges_select" ON badges FOR SELECT USING (true);

-- Drop and recreate policies for user_badges
DROP POLICY IF EXISTS "Public read user badges" ON user_badges;
DROP POLICY IF EXISTS "user_badges_select" ON user_badges;
DROP POLICY IF EXISTS "user_badges_insert" ON user_badges;

CREATE POLICY "user_badges_select" ON user_badges FOR SELECT USING (true);

-- Only allow server/admin to insert user badges (via service role)
CREATE POLICY "user_badges_insert" ON user_badges
    FOR INSERT WITH CHECK (true);

-- =====================================================
-- 17. FIX VALIDATIONS TABLE FOR CLERK
-- =====================================================

-- Drop old policies
DROP POLICY IF EXISTS "validations_select" ON validations;
DROP POLICY IF EXISTS "validations_insert" ON validations;
DROP POLICY IF EXISTS "Users can view all validations" ON validations;
DROP POLICY IF EXISTS "Users can create validations" ON validations;

-- Ensure validations.validator_id is text type
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'validations'
        AND column_name = 'validator_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_validator_id_fkey;
        ALTER TABLE validations ALTER COLUMN validator_id TYPE text USING validator_id::text;
    END IF;
END $$;

-- Enable RLS on validations
ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

-- Create Clerk-compatible policies
CREATE POLICY "validations_select" ON validations FOR SELECT USING (true);

CREATE POLICY "validations_insert" ON validations
    FOR INSERT WITH CHECK (
        get_clerk_user_id() IS NOT NULL
        AND validator_id = get_clerk_user_id()
    );

-- =====================================================
-- 18. ENSURE TABLES HAVE RLS ENABLED
-- =====================================================

ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE followers ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- MIGRATION COMPLETE
-- Run this in Supabase SQL Editor
-- =====================================================
