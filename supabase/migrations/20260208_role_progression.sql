-- Role Progression System Migration
-- Adds support for User -> Validator -> Ambassador tiers

-- 1. Add role tracking and promotion metrics to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS user_role TEXT DEFAULT 'user', -- 'user', 'validator', 'ambassador'
ADD COLUMN IF NOT EXISTS total_validations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS active_days_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_active_date DATE,
ADD COLUMN IF NOT EXISTS promoted_to_validator_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS promoted_to_ambassador_at TIMESTAMP WITH TIME ZONE;

-- 2. Add ambassador-specific fields
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS ambassador_region TEXT,
ADD COLUMN IF NOT EXISTS ambassador_monthly_stipend DECIMAL(10, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS ambassador_approved_by TEXT; -- admin user_id who approved

-- 3. Add dialect/language tracking for validator assignment
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS verified_dialects JSONB DEFAULT '[]'::jsonb; -- ['yoruba', 'igbo']

-- 4. Create Ambassador Applications table
CREATE TABLE IF NOT EXISTS public.ambassador_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL REFERENCES public.profiles(id),
    region TEXT NOT NULL,
    motivation TEXT,
    experience_details TEXT,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by TEXT, -- admin user_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Add comments for documentation
COMMENT ON COLUMN profiles.user_role IS 'User progression: user -> validator -> ambassador';
COMMENT ON COLUMN profiles.total_validations_count IS 'Lifetime validations count (for promotion criteria)';
COMMENT ON COLUMN profiles.active_days_count IS 'Number of days user was active (for 10+ day requirement)';
COMMENT ON COLUMN profiles.verified_dialects IS 'Array of dialect/language codes user is verified to validate';
COMMENT ON TABLE public.ambassador_applications IS 'Applications for ambassador role';

-- 6. Create index for query optimization
CREATE INDEX IF NOT EXISTS idx_profiles_role_progression 
ON public.profiles(user_role, total_validations_count, accuracy_rating, active_days_count);

CREATE INDEX IF NOT EXISTS idx_profiles_ambassador_region
ON public.profiles(ambassador_region) WHERE user_role = 'ambassador';
