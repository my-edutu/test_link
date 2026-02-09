-- Fix Chat Policies for Clerk (Allow 1-on-1 chats and member addition)

-- 1. Fix conversations_insert
-- Previous policy forced is_group=true, prohibiting DM creation.
DROP POLICY IF EXISTS "conversations_insert" ON conversations;

CREATE POLICY "conversations_insert" ON conversations
  FOR INSERT WITH CHECK (
    (auth.jwt() ->> 'sub') IS NOT NULL AND
    created_by = (auth.jwt() ->> 'sub')
  );

-- 2. Fix conversation_members_insert
-- Previous policy only allowed adding yourself. We need to allow creators to add others.
DROP POLICY IF EXISTS "conv_members_insert" ON conversation_members;

CREATE POLICY "conv_members_insert" ON conversation_members
  FOR INSERT WITH CHECK (
    -- User adds themselves
    user_id = (auth.jwt() ->> 'sub')
    OR
    -- OR user is the creator of the conversation
    EXISTS (
      SELECT 1 FROM conversations c
      WHERE c.id = conversation_members.conversation_id
      AND c.created_by = (auth.jwt() ->> 'sub')
    )
  );

-- 3. Ensure users can view members of conversations they are part of
-- (Existing conv_members_select might be too restrictive if it only allows seeing SELF)
DROP POLICY IF EXISTS "conv_members_select" ON conversation_members;

CREATE POLICY "conv_members_select" ON conversation_members
  FOR SELECT USING (
    -- User can see members if they are in the conversation
    EXISTS (
      SELECT 1 FROM conversation_members cm
      WHERE cm.conversation_id = conversation_members.conversation_id
      AND cm.user_id = (auth.jwt() ->> 'sub')
    )
  );
