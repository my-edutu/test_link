-- Ensure get_clerk_user_id exists
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION get_clerk_user_id() TO authenticated;

-- Ensure create_or_get_dm exists and uses Clerk ID
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

-- Grant access to authenticated users
GRANT EXECUTE ON FUNCTION create_or_get_dm(TEXT) TO authenticated;
