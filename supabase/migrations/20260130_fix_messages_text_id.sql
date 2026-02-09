-- 1. Convert messages.sender_id to text if it's uuid
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'messages' AND column_name = 'sender_id' AND data_type = 'uuid'
    ) THEN
        -- Drop dependencies if any (none expected for simple FKs usually, but just in case)
        ALTER TABLE messages ALTER COLUMN sender_id TYPE text USING sender_id::text;
    END IF;
END $$;

-- 2. Drop and recreate send_message to accept TEXT (ensure no uuid version exists)
DROP FUNCTION IF EXISTS public.send_message(uuid, uuid);
DROP FUNCTION IF EXISTS public.send_message(uuid, text);

CREATE OR REPLACE FUNCTION public.send_message(p_conversation_id uuid, p_text text)
RETURNS TABLE (
    id uuid,
    conversation_id uuid,
    sender_id text,
    text text,
    type text,
    media_url text,
    created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
    new_message_id UUID;
BEGIN
    -- Get current user ID from Clerk JWT
    current_user_id := get_clerk_user_id();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Verify user is a member of the conversation
    IF NOT EXISTS (
        SELECT 1 FROM conversation_members
        WHERE conversation_id = p_conversation_id
        AND user_id = current_user_id
    ) THEN
        RAISE EXCEPTION 'User is not a member of this conversation';
    END IF;

    -- Insert the message
    INSERT INTO messages (conversation_id, sender_id, text, type, created_at)
    VALUES (p_conversation_id, current_user_id, p_text, 'text', NOW())
    RETURNING messages.id INTO new_message_id;

    -- Update conversation's last message info
    UPDATE conversations
    SET
        last_message_at = NOW(),
        last_message_preview = LEFT(p_text, 100)
    WHERE conversations.id = p_conversation_id;

    -- Return the new message
    RETURN QUERY
    SELECT
        m.id,
        m.conversation_id,
        m.sender_id,
        m.text,
        m.type,
        m.media_url,
        m.created_at
    FROM messages m
    WHERE m.id = new_message_id;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text) TO authenticated;
