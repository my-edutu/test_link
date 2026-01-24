-- Migration: Add is_admin column to profiles table
-- Date: 2026-01-24
-- Purpose: Enable admin role verification for protected endpoints

-- Add is_admin column to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Create an index for faster admin lookups
CREATE INDEX IF NOT EXISTS idx_profiles_is_admin ON profiles(is_admin) WHERE is_admin = TRUE;

-- Optional: Set initial admin users by email
-- Uncomment and modify the email addresses as needed
-- UPDATE profiles SET is_admin = TRUE WHERE email IN (
--     'admin1@lingualink.com',
--     'admin2@lingualink.com'
-- );

-- Verify the column was added
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'is_admin';
