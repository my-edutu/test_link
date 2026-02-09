-- Migration: Add missing chat RPC functions for sending messages
-- Run this in Supabase SQL Editor

-- =====================================================
-- 1. Send Message Function
-- =====================================================
CREATE OR REPLACE FUNCTION send_message(p_conversation_id UUID, p_text TEXT)
RETURNS TABLE (
    id UUID,
    conversation_id UUID,
    sender_id TEXT,
    text TEXT,
    type TEXT,
    media_url TEXT,
    created_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_user_id TEXT;
    new_message_id UUID;
BEGIN
    -- Get current user ID from auth
    current_user_id := auth.uid()::text;

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
    RETURNING id INTO new_message_id;

    -- Update conversation's last message info
    UPDATE conversations
    SET
        last_message_at = NOW(),
        last_message_preview = LEFT(p_text, 100)
    WHERE id = p_conversation_id;

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

-- =====================================================
-- 2. Mark Conversation as Read (alias for consistency)
-- =====================================================
CREATE OR REPLACE FUNCTION mark_conversation_read(p_conversation_id UUID)
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
-- 3. Get Conversation Recipient IDs (for push notifications)
-- =====================================================
CREATE OR REPLACE FUNCTION get_conversation_recipient_ids(p_conversation_id UUID)
RETURNS TABLE (user_id TEXT)
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

    -- Return all user IDs in the conversation except the current user
    RETURN QUERY
    SELECT cm.user_id
    FROM conversation_members cm
    WHERE cm.conversation_id = p_conversation_id
      AND cm.user_id != current_user_id;
END;
$$;

-- =====================================================
-- Grant permissions
-- =====================================================
GRANT EXECUTE ON FUNCTION send_message(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION mark_conversation_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversation_recipient_ids(UUID) TO authenticated;
