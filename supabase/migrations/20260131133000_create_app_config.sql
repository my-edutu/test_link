CREATE TABLE IF NOT EXISTS public.app_config (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default validation reward
INSERT INTO public.app_config (key, value, description)
VALUES ('validation_reward', '50'::jsonb, 'Amount in Naira awarded for a successful validation')
ON CONFLICT (key) DO NOTHING;

-- Enable RLS
ALTER TABLE public.app_config ENABLE ROW LEVEL SECURITY;

-- Allow read access to everyone
CREATE POLICY "Allow public read access" ON public.app_config
    FOR SELECT USING (true);
