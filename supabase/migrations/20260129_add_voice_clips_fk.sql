-- Migration: Add foreign key constraint from voice_clips.user_id to profiles.id
-- This is needed for Supabase PostgREST to join voice_clips with profiles

-- First, check if the foreign key already exists and only add if it doesn't
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'voice_clips_user_id_fkey'
        AND table_name = 'voice_clips'
    ) THEN
        ALTER TABLE voice_clips
        ADD CONSTRAINT voice_clips_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Also add FK for video_clips if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'video_clips_user_id_fkey'
        AND table_name = 'video_clips'
    ) THEN
        ALTER TABLE video_clips
        ADD CONSTRAINT video_clips_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
    END IF;
END $$;
