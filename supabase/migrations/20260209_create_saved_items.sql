-- Create saved_items table
CREATE TABLE IF NOT EXISTS saved_items (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id TEXT NOT NULL, -- Matches profiles.id (Clerk/Supabase ID)
    item_type TEXT NOT NULL, -- e.g. 'voice_clip', 'video_clip', 'story', 'phrase', 'article'
    item_id UUID NOT NULL, -- Reference ID
    item_data JSONB DEFAULT '{}'::jsonb, -- Cache title, subtitle, creating redundancy for faster reads
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, item_type, item_id)
);

-- Enable RLS
ALTER TABLE saved_items ENABLE ROW LEVEL SECURITY;

-- Policies
DROP POLICY IF EXISTS "Users can view their own saved items" ON saved_items;
CREATE POLICY "Users can view their own saved items" ON saved_items
    FOR SELECT USING (auth.uid()::text = user_id OR (current_setting('request.jwt.claims', true)::json->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can insert their own saved items" ON saved_items;
CREATE POLICY "Users can insert their own saved items" ON saved_items
    FOR INSERT WITH CHECK (auth.uid()::text = user_id OR (current_setting('request.jwt.claims', true)::json->>'sub') = user_id);

DROP POLICY IF EXISTS "Users can delete their own saved items" ON saved_items;
CREATE POLICY "Users can delete their own saved items" ON saved_items
    FOR DELETE USING (auth.uid()::text = user_id OR (current_setting('request.jwt.claims', true)::json->>'sub') = user_id);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_saved_items_user ON saved_items(user_id);
