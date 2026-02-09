-- Drop conflicting functions (explicitly drop both variations to be safe)
DROP FUNCTION IF EXISTS public.send_message(uuid, text);
DROP FUNCTION IF EXISTS public.send_message(uuid, text, text);

-- Create unified function with DEFAULT NULL for media_url
CREATE OR REPLACE FUNCTION public.send_message(
    p_conversation_id uuid,
    p_text text,
    p_media_url text DEFAULT NULL
)
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
    message_type TEXT;
BEGIN
    -- Get current user ID
    current_user_id := get_clerk_user_id();

    IF current_user_id IS NULL THEN
        RAISE EXCEPTION 'Not authenticated';
    END IF;

    -- Determine message type
    IF p_media_url IS NOT NULL THEN
        -- Basic detection, can be refined if needed. Assuming voice for now as per app usage.
        message_type := 'voice'; 
    ELSE
        message_type := 'text';
    END IF;

    -- Insert
    INSERT INTO messages (conversation_id, sender_id, text, type, media_url, created_at)
    VALUES (p_conversation_id, current_user_id, p_text, message_type, p_media_url, NOW())
    RETURNING messages.id INTO new_message_id;

    -- Update conversation
    UPDATE conversations
    SET
        last_message_at = NOW(),
        last_message_preview = CASE 
            WHEN p_media_url IS NOT NULL THEN '[Media]' 
            ELSE LEFT(p_text, 100) 
        END
    WHERE conversations.id = p_conversation_id;

    -- Return result
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
GRANT EXECUTE ON FUNCTION public.send_message(uuid, text, text) TO authenticated;
