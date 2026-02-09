-- Migration: Add missing columns to badges table
-- These columns are defined in the Drizzle schema but missing from the database

-- Add tier column (bronze, silver, gold)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'bronze';

-- Add requirement_type column (clips_approved, validations_count, streak_days, etc.)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS requirement_type TEXT;

-- Add requirement_value column (number required to earn badge)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS requirement_value INTEGER;

-- Add criteria column (for complex badge requirements)
ALTER TABLE badges ADD COLUMN IF NOT EXISTS criteria JSONB;
