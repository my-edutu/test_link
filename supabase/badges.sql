-- Create Badges Table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL, -- URL to the badge icon
    category TEXT NOT NULL CHECK (category IN ('contributor', 'validator', 'game', 'social')),
    criteria JSONB, -- Flexible criteria (e.g. {"clips_count": 10})
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create User Badges (Join Table)
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    badge_id UUID NOT NULL REFERENCES public.badges(id) ON DELETE CASCADE,
    earned_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, badge_id)
);

-- Enable RLS
ALTER TABLE public.badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public read badges" ON public.badges FOR SELECT USING (true);
CREATE POLICY "Public read user badges" ON public.user_badges FOR SELECT USING (true);

-- Insert Default Badges (Seed Data)
INSERT INTO public.badges (name, description, image_url, category) VALUES
('First Voice', 'Uploaded your first voice clip.', 'https://img.icons8.com/color/96/microphone.png', 'contributor'),
('Century Speaker', 'Uploaded 100 voice clips.', 'https://img.icons8.com/color/96/gold-medal.png', 'contributor'),
('Validator Scout', 'Validated 10 clips.', 'https://img.icons8.com/color/96/inspection.png', 'validator'),
('Guardian of Truth', 'Validated 100 clips with high accuracy.', 'https://img.icons8.com/color/96/shield.png', 'validator'),
('Social Butterfly', 'Followed 50 people.', 'https://img.icons8.com/color/96/group.png', 'social');
