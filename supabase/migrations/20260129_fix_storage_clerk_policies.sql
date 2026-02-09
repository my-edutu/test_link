-- Fix Storage for Clerk (Text IDs) - Policy Only Approach
-- 1. Drop policies that use auth.uid() (which crashes with Clerk text IDs)
-- 2. Recreate policies using auth.jwt() ->> 'sub' and owner_id (Text)

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

-- Recreate policies using auth.jwt() ->> 'sub' (Text ID)
-- Note: We compare against 'owner_id' (Text) or path tokens, NOT 'owner' (UUID)

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
-- Use owner_id instead of owner (since owner is UUID)
CREATE POLICY "stories_delete" ON storage.objects
  FOR DELETE TO public
  USING ((bucket_id = 'stories'::text) AND (owner_id = (auth.jwt() ->> 'sub')));

CREATE POLICY "stories_update" ON storage.objects
  FOR UPDATE TO public
  USING ((bucket_id = 'stories'::text) AND (owner_id = (auth.jwt() ->> 'sub')));

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
