-- Content Moderation Reports Table
-- This table stores user reports against content or other users

CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    reporter_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reported_user_id TEXT NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    post_id UUID REFERENCES voice_clips(id) ON DELETE SET NULL,
    reason TEXT NOT NULL CHECK (reason IN ('spam', 'harassment', 'inappropriate', 'other')),
    additional_details TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'reviewing', 'resolved', 'dismissed')),
    resolution_action TEXT CHECK (resolution_action IN ('dismiss', 'warn', 'hide_content', 'ban_user')),
    resolution_notes TEXT,
    resolver_id TEXT REFERENCES profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_reporter ON reports(reporter_id);
CREATE INDEX IF NOT EXISTS idx_reports_reported_user ON reports(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at DESC);

-- Row Level Security policies
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Users can view their own submitted reports
CREATE POLICY "Users can view their own reports"
    ON reports
    FOR SELECT
    USING (auth.uid()::text = reporter_id);

-- Users can create reports
CREATE POLICY "Users can create reports"
    ON reports
    FOR INSERT
    WITH CHECK (auth.uid()::text = reporter_id);

-- Admins can view all reports (requires admin role check)
-- Note: Implement proper admin check based on your roles system
CREATE POLICY "Admins can view all reports"
    ON reports
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND (validator_tier = 'admin' OR trust_score >= 500)
        )
    );

-- Admins can update reports
CREATE POLICY "Admins can update reports"
    ON reports
    FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid()::text 
            AND (validator_tier = 'admin' OR trust_score >= 500)
        )
    );

-- Add comments for documentation
COMMENT ON TABLE reports IS 'Stores user reports against content or other users for moderation';
COMMENT ON COLUMN reports.reason IS 'Report reason: spam, harassment, inappropriate, or other';
COMMENT ON COLUMN reports.status IS 'Report status: pending, reviewing, resolved, or dismissed';
COMMENT ON COLUMN reports.resolution_action IS 'Action taken: dismiss, warn, hide_content, or ban_user';
