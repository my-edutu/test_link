-- Ensure followers table uses text IDs for Clerk compatibility
-- This migration is idempotent - safe to run multiple times

-- Check and alter follower_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'followers' 
        AND column_name = 'follower_id'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE followers ALTER COLUMN follower_id TYPE text USING follower_id::text;
    END IF;
END $$;

-- Check and alter following_id column
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'followers' 
        AND column_name = 'following_id'
        AND data_type != 'text'
    ) THEN
        ALTER TABLE followers ALTER COLUMN following_id TYPE text USING following_id::text;
    END IF;
END $$;
