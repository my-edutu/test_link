-- Migration: Add call_history table for tracking video/voice calls
-- Run this in Supabase SQL Editor

-- Create call_history table
CREATE TABLE IF NOT EXISTS call_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    call_id TEXT NOT NULL,
    caller_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    call_type TEXT NOT NULL CHECK (call_type IN ('video', 'voice', 'group')),
    status TEXT DEFAULT 'initiated' CHECK (status IN ('initiated', 'ringing', 'answered', 'ended', 'missed', 'declined')),
    started_at TIMESTAMPTZ DEFAULT NOW(),
    answered_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    duration_seconds INTEGER,
    end_reason TEXT CHECK (end_reason IN ('completed', 'caller_ended', 'receiver_ended', 'missed', 'declined', 'failed'))
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_call_history_caller ON call_history(caller_id);
CREATE INDEX IF NOT EXISTS idx_call_history_receiver ON call_history(receiver_id);
CREATE INDEX IF NOT EXISTS idx_call_history_call_id ON call_history(call_id);
CREATE INDEX IF NOT EXISTS idx_call_history_started_at ON call_history(started_at DESC);

-- Enable Row Level Security
ALTER TABLE call_history ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see calls they were part of
CREATE POLICY "Users can view their own calls" ON call_history
    FOR SELECT
    USING (auth.uid()::text = caller_id OR auth.uid()::text = receiver_id);

CREATE POLICY "Users can insert calls they initiate" ON call_history
    FOR INSERT
    WITH CHECK (auth.uid()::text = caller_id);

CREATE POLICY "Users can update calls they are part of" ON call_history
    FOR UPDATE
    USING (auth.uid()::text = caller_id OR auth.uid()::text = receiver_id);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON call_history TO authenticated;
GRANT SELECT, INSERT, UPDATE ON call_history TO service_role;
