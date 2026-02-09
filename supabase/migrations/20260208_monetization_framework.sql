-- Monetization Framework Migration
-- Adds columns and tables to support the monetization criteria

-- 1. Update profiles table with validator tracking
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS accuracy_rating DECIMAL(5, 2) DEFAULT 100.0,
ADD COLUMN IF NOT EXISTS daily_validations_count INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_validation_reset TIMESTAMP WITH TIME ZONE DEFAULT now();

-- 2. Update voice_clips table with quality metrics
ALTER TABLE public.voice_clips
ADD COLUMN IF NOT EXISTS duration_seconds INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS originality_score DECIMAL(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS clarity_score DECIMAL(5, 2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS is_monetization_unlocked BOOLEAN DEFAULT false;

-- 3. Create dataset_sales table for tracking enterprise purchases (optional)
CREATE TABLE IF NOT EXISTS public.dataset_sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    buyer_organization TEXT NOT NULL,
    buyer_contact_email TEXT NOT NULL,
    dataset_specification JSONB, -- What languages, dialects, volume
    price_usd DECIMAL(10, 2) NOT NULL,
    purchase_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    license_type TEXT DEFAULT 'one-time', -- 'one-time', 'subscription'
    ethical_use_agreement BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Add comments for documentation
COMMENT ON COLUMN profiles.accuracy_rating IS 'Validator accuracy percentage (0-100), used to determine trust and rewards';
COMMENT ON COLUMN profiles.daily_validations_count IS 'Number of validations performed today that count toward rewards';
COMMENT ON COLUMN profiles.last_validation_reset IS 'Timestamp of last daily validation counter reset';
COMMENT ON COLUMN voice_clips.duration_seconds IS 'Audio clip length in seconds (for 3-60s validation)';
COMMENT ON COLUMN voice_clips.originality_score IS 'AI or manual score for originality (0-100)';
COMMENT ON COLUMN voice_clips.clarity_score IS 'Audio clarity score (0-100)';
COMMENT ON COLUMN voice_clips.is_monetization_unlocked IS 'True when clip has met validation threshold and is eligible for payout';

-- 5. Create index for performance
CREATE INDEX IF NOT EXISTS idx_voice_clips_monetization ON public.voice_clips(is_monetization_unlocked, created_at);
CREATE INDEX IF NOT EXISTS idx_profiles_accuracy ON public.profiles(accuracy_rating DESC);
