-- Add status column to voice_clips table
ALTER TABLE voice_clips
ADD COLUMN IF NOT EXISTS status text DEFAULT 'pending';

-- Update existing clips to have 'pending' status
UPDATE voice_clips
SET status = 'pending'
WHERE status IS NULL;
