-- 1. Drop conflicting functions (force drop to remove ambiguity)
DROP FUNCTION IF EXISTS public.create_or_get_dm(uuid);
DROP FUNCTION IF EXISTS public.create_or_get_dm(text);

-- 2. Drop get_mutual_followers_count variations to ensure clean state
DROP FUNCTION IF EXISTS public.get_mutual_followers_count(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_mutual_followers_count(text, text);

-- 3. Ensure followers table uses TEXT for IDs (Clerk compatibility)
DO $$
BEGIN
    -- Check and convert follower_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'followers' AND column_name = 'follower_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE followers ALTER COLUMN follower_id TYPE text USING follower_id::text;
    END IF;

    -- Check and convert following_id
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'followers' AND column_name = 'following_id' AND data_type = 'uuid'
    ) THEN
        ALTER TABLE followers ALTER COLUMN following_id TYPE text USING following_id::text;
    END IF;
END $$;

-- 4. Re-create create_or_get_dm with TEXT parameter
CREATE OR REPLACE FUNCTION public.create_or_get_dm(target text)
RETURNS uuid
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

-- 5. Re-create get_mutual_followers_count with TEXT parameters
CREATE OR REPLACE FUNCTION public.get_mutual_followers_count(viewer text, profile text)
RETURNS integer
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

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.create_or_get_dm(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_mutual_followers_count(text, text) TO authenticated;
