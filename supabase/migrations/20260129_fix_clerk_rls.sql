-- Fix RLS policies for Clerk compatibility (replace auth.uid() with auth.jwt() ->> 'sub')

-- COMMENTS TABLE
DROP POLICY IF EXISTS "Users can create their own comments" ON comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON comments;

CREATE POLICY "Users can create their own comments" ON comments
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own comments" ON comments
  FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can update their own comments" ON comments
  FOR UPDATE USING ((auth.jwt() ->> 'sub') = user_id);

-- FOLLOWERS TABLE
DROP POLICY IF EXISTS "Users can create their own follow relationships" ON followers;
DROP POLICY IF EXISTS "Users can delete their own follow relationships" ON followers;

CREATE POLICY "Users can create their own follow relationships" ON followers
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = follower_id);

CREATE POLICY "Users can delete their own follow relationships" ON followers
  FOR DELETE USING ((auth.jwt() ->> 'sub') = follower_id);

-- LIKES TABLE (Handle both naming conventions seen in previous output)
DROP POLICY IF EXISTS "Users can create their own likes" ON likes;
DROP POLICY IF EXISTS "Users can delete their own likes" ON likes;
DROP POLICY IF EXISTS "likes_insert_own" ON likes;
DROP POLICY IF EXISTS "likes_delete_own" ON likes;

CREATE POLICY "Users can create their own likes" ON likes
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own likes" ON likes
  FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);

-- STORIES TABLE (Check and fix just in case)
-- Assuming user_id column
DROP POLICY IF EXISTS "Users can create their own stories" ON stories;
DROP POLICY IF EXISTS "Users can delete their own stories" ON stories;

CREATE POLICY "Users can create their own stories" ON stories
  FOR INSERT WITH CHECK ((auth.jwt() ->> 'sub') = user_id);

CREATE POLICY "Users can delete their own stories" ON stories
  FOR DELETE USING ((auth.jwt() ->> 'sub') = user_id);
