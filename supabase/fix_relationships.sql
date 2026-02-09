-- Fix missing foreign key relationships for Supabase PostgREST embedding

-- 1. Voice Clips: Add FKs for embedding user and parent clip
-- This fixes the error: "Searched for a foreign key relationship... but no matches were found"

DO $$ 
BEGIN
    -- Check and add constraint for user_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'voice_clips_user_id_fkey'
    ) THEN
        ALTER TABLE public.voice_clips
        ADD CONSTRAINT voice_clips_user_id_fkey
        FOREIGN KEY (user_id)
        REFERENCES public.profiles(id)
        ON DELETE CASCADE;
    END IF;

    -- Check and add constraint for parent_clip_id
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'voice_clips_parent_clip_id_fkey'
    ) THEN
        ALTER TABLE public.voice_clips
        ADD CONSTRAINT voice_clips_parent_clip_id_fkey
        FOREIGN KEY (parent_clip_id)
        REFERENCES public.voice_clips(id)
        ON DELETE SET NULL;
    END IF;
END $$;
