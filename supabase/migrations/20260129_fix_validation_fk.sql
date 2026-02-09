-- Fix Validations for Video Clips (Remove restrictive FK)

-- The current Foreign Key forces validation to be for a Voice Clip.
-- We need to support Video Clips too, as implied by the RLS policy.
-- The RLS policy already checks that the ID exists in either voice_clips or video_clips.

ALTER TABLE validations DROP CONSTRAINT IF EXISTS validations_voice_clip_id_fkey;

-- Also ensure RLS is robust
DROP POLICY IF EXISTS "Users can create validations for clips they didn't create" ON validations;

CREATE POLICY "Users can create validations for clips they didn't create" ON validations
  FOR INSERT WITH CHECK (
    -- Must be the authenticated user
    ((auth.jwt() ->> 'sub') = validator_id)
    AND
    (
      -- Clip must exist in Voice Clips AND not be owned by user
      (EXISTS (
        SELECT 1 FROM voice_clips
        WHERE voice_clips.id = validations.voice_clip_id
        AND voice_clips.user_id <> (auth.jwt() ->> 'sub')
      ))
      OR
      -- OR Clip must exist in Video Clips AND not be owned by user
      (EXISTS (
        SELECT 1 FROM video_clips
        WHERE video_clips.id = validations.voice_clip_id
        AND video_clips.user_id <> (auth.jwt() ->> 'sub')
      ))
    )
  );
