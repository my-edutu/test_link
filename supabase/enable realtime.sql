-- 1. Create live_streams table
CREATE TABLE IF NOT EXISTS public.live_streams (
    id TEXT PRIMARY KEY, -- Room ID
    streamer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    is_live BOOLEAN DEFAULT true,
    viewer_count TEXT DEFAULT '0',
    created_at TIMESTAMPTZ DEFAULT now(),
    ended_at TIMESTAMPTZ
);

-- 2. Create live_messages table
CREATE TABLE IF NOT EXISTS public.live_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL, 
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    text TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Enable RLS & Realtime
ALTER TABLE public.live_streams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.live_messages ENABLE ROW LEVEL SECURITY;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_streams;
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_messages;

-- 4. Simple Policies
CREATE POLICY "Public read" ON public.live_streams FOR SELECT USING (true);
CREATE POLICY "Public read chat" ON public.live_messages FOR SELECT USING (true);
CREATE POLICY "Auth post chat" ON public.live_messages FOR INSERT WITH CHECK (auth.uid() = user_id);