-- Fix Storage for Clerk (Text IDs)
-- 1. Drop policies that use auth.uid() (which crashes with Clerk text IDs)
-- 2. Change owner column to TEXT
-- 3. Recreate policies using auth.jwt() ->> 'sub'

-- Drop existing policies on storage.objects that rely on auth.uid()
DROP POLICY IF EXISTS "Users can delete their own voice clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own voice clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload their own voice clips" ON storage.objects;
DROP POLICY IF EXISTS "Users can upload voice messages" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own voice clips" ON storage.objects;
DROP POLICY IF EXISTS "stories_delete" ON storage.objects;
DROP POLICY IF EXISTS "stories_update" ON storage.objects;
DROP POLICY IF EXISTS "videos delete own" ON storage.objects;
DROP POLICY IF EXISTS "videos update own" ON storage.objects;
DROP POLICY IF EXISTS "videos insert own" ON storage.objects;

-- Alter columns to TEXT to accept Clerk IDs
ALTER TABLE storage.objects ALTER COLUMN owner TYPE text USING owner::text;
ALTER TABLE storage.buckets ALTER COLUMN owner TYPE text USING owner::text;

-- Remove DEFAULT auth.uid() if it exists (it would crash)
ALTER TABLE storage.objects ALTER COLUMN owner DROP DEFAULT;
ALTER TABLE storage.buckets ALTER COLUMN owner DROP DEFAULT;

-- Recreate policies using auth.jwt() ->> 'sub' (Text ID)

-- Voice Clips
CREATE POLICY "Users can delete their own voice clips" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'voice-clips'::text) AND ((auth.jwt() ->> 'sub') = (storage.foldername(name))[1]));

CREATE POLICY "Users can update their own voice clips" ON storage.objects
  FOR UPDATE TO public
  USING ((bucket_id = 'voice-clips'::text) AND ((auth.jwt() ->> 'sub') = (storage.foldername(name))[1]));

CREATE POLICY "Users can upload their own voice clips" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'voice-clips'::text) AND ((auth.jwt() ->> 'sub') = (storage.foldername(name))[1]));

CREATE POLICY "Users can view their own voice clips" ON storage.objects
  FOR SELECT TO public
  USING ((bucket_id = 'voice-clips'::text) AND ((auth.jwt() ->> 'sub') = (storage.foldername(name))[1]));

-- Voice Messages
CREATE POLICY "Users can delete their own voice messages" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'voice-messages'::text) AND ((auth.jwt() ->> 'sub') IS NOT NULL));

CREATE POLICY "Users can upload voice messages" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'voice-messages'::text) AND ((auth.jwt() ->> 'sub') IS NOT NULL));

-- Stories
CREATE POLICY "stories_delete" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'stories'::text) AND (owner = (auth.jwt() ->> 'sub')));

CREATE POLICY "stories_update" ON storage.objects
  FOR UPDATE TO public
  USING ((bucket_id = 'stories'::text) AND (owner = (auth.jwt() ->> 'sub')));

-- Videos
CREATE POLICY "videos delete own" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'videos'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'sub')));

CREATE POLICY "videos update own" ON storage.objects
  FOR UPDATE TO public
  USING ((bucket_id = 'videos'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'sub')));

CREATE POLICY "videos insert own" ON storage.objects
  FOR INSERT TO public
  WITH CHECK ((bucket_id = 'videos'::text) AND ((storage.foldername(name))[1] = (auth.jwt() ->> 'sub')));
