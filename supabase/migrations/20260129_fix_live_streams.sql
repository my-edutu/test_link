-- Fix live_streams table for Clerk text IDs
-- The id column should be TEXT (for room IDs like "room_user_xxx")
-- The streamer_id column should be TEXT (for Clerk user IDs like "user_xxx")

-- First, drop any foreign key constraints that might be causing issues
ALTER TABLE public.live_streams DROP CONSTRAINT IF EXISTS live_streams_streamer_id_fkey;

-- Ensure id column is TEXT (not UUID)
-- This handles the case where the table was created with UUID id
DO $$ 
BEGIN
    -- Check if id column is UUID type and convert to TEXT
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'live_streams' 
        AND column_name = 'id' 
        AND data_type = 'uuid'
    ) THEN
        -- Create a temporary column
        ALTER TABLE public.live_streams ADD COLUMN id_new TEXT;
        -- Copy data
        UPDATE public.live_streams SET id_new = id::text;
        -- Drop old primary key constraint
        ALTER TABLE public.live_streams DROP CONSTRAINT IF EXISTS live_streams_pkey;
        -- Drop old column
        ALTER TABLE public.live_streams DROP COLUMN id;
        -- Rename new column
        ALTER TABLE public.live_streams RENAME COLUMN id_new TO id;
        -- Add primary key constraint
        ALTER TABLE public.live_streams ADD PRIMARY KEY (id);
    END IF;
END $$;

-- Ensure streamer_id column is TEXT (not UUID)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'live_streams' 
        AND column_name = 'streamer_id' 
        AND data_type = 'uuid'
    ) THEN
        ALTER TABLE public.live_streams ALTER COLUMN streamer_id TYPE TEXT USING streamer_id::text;
    END IF;
END $$;

-- Re-add foreign key to profiles (which now uses TEXT ids for Clerk)
-- Only add if profiles table exists and has text id
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'profiles' 
        AND column_name = 'id' 
        AND data_type = 'text'
    ) THEN
        ALTER TABLE public.live_streams 
        ADD CONSTRAINT live_streams_streamer_id_fkey 
        FOREIGN KEY (streamer_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
    END IF;
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- Update RLS policies to use text comparison
DROP POLICY IF EXISTS "Users can create their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can update their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Users can delete their own streams" ON public.live_streams;
DROP POLICY IF EXISTS "Public read streams" ON public.live_streams;
DROP POLICY IF EXISTS "Public read" ON public.live_streams;

-- Recreate policies with text casting for auth.uid()
CREATE POLICY "Users can create their own streams" ON public.live_streams 
    FOR INSERT WITH CHECK (auth.uid()::text = streamer_id);

CREATE POLICY "Users can update their own streams" ON public.live_streams 
    FOR UPDATE USING (auth.uid()::text = streamer_id);

CREATE POLICY "Users can delete their own streams" ON public.live_streams 
    FOR DELETE USING (auth.uid()::text = streamer_id);

CREATE POLICY "Public read streams" ON public.live_streams 
    FOR SELECT USING (true);

-- Grant necessary permissions
GRANT ALL ON public.live_streams TO authenticated;
GRANT SELECT ON public.live_streams TO anon;
