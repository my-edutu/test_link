-- 001_initial_schema.sql
-- Based on services/api/src/database/schema.ts

-- 1. Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY, -- Maps to Auth User ID
    email TEXT,
    username TEXT,
    full_name TEXT,
    avatar_url TEXT,
    has_completed_onboarding BOOLEAN DEFAULT false,
    interests JSONB,
    balance DECIMAL(10, 2) DEFAULT 0,
    total_earned DECIMAL(10, 2) DEFAULT 0,
    trust_score INTEGER DEFAULT 100,
    validator_tier TEXT DEFAULT 'bronze', -- 'bronze', 'silver', 'gold'
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Live Messages Table
CREATE TABLE IF NOT EXISTS public.live_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    room_name TEXT NOT NULL,
    user_id UUID NOT NULL,
    text TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Live Streams Table
CREATE TABLE IF NOT EXISTS public.live_streams (
    id TEXT PRIMARY KEY, -- Room ID
    streamer_id UUID NOT NULL,
    title TEXT NOT NULL,
    is_live BOOLEAN DEFAULT true,
    viewer_count TEXT DEFAULT '0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    ended_at TIMESTAMP WITH TIME ZONE
);

-- 4. Badges Table
CREATE TABLE IF NOT EXISTS public.badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL,
    image_url TEXT NOT NULL,
    category TEXT NOT NULL, -- 'contributor', 'validator', 'game', 'social'
    criteria JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. User Badges Table
CREATE TABLE IF NOT EXISTS public.user_badges (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    badge_id UUID NOT NULL,
    earned_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Voice Clips Table
CREATE TABLE IF NOT EXISTS public.voice_clips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    phrase TEXT,
    language TEXT,
    dialect TEXT,
    audio_url TEXT,
    likes_count INTEGER DEFAULT 0,
    comments_count INTEGER DEFAULT 0,
    validations_count INTEGER DEFAULT 0,
    duets_count INTEGER DEFAULT 0,
    parent_clip_id UUID, -- For Duets/Remixes
    root_clip_id UUID, -- Original source
    is_monetized BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Validations Table
CREATE TABLE IF NOT EXISTS public.validations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    voice_clip_id UUID NOT NULL,
    validator_id UUID NOT NULL,
    is_approved BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 8. Reward Rates Table
CREATE TABLE IF NOT EXISTS public.reward_rates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action_type TEXT NOT NULL, -- 'validate_correct', 'clip_approved', etc.
    amount DECIMAL(10, 4) NOT NULL,
    currency TEXT DEFAULT 'USD',
    is_active BOOLEAN DEFAULT true
);

-- 9. Transactions Table
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL, -- Changed to TEXT to match profiles.id if profiles.id is TEXT
    amount DECIMAL(10, 2) NOT NULL,
    type TEXT NOT NULL, -- 'earning', 'withdrawal', 'bonus', 'penalty', 'refund'
    category TEXT, -- 'reward', 'payout', 'royalty'
    reference_id UUID,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable Row Level Security (RLS) - Recommended
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.voice_clips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.validations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Examples - Customize as needed)
-- Profiles: Users can see all profiles, but only update their own
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid()::text = id);

-- Voice Clips: Public view, authenticated create
CREATE POLICY "Voice clips are viewable by everyone" ON public.voice_clips FOR SELECT USING (true);
CREATE POLICY "Authenticated users can upload clips" ON public.voice_clips FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- Validations: Public view, authenticated create
CREATE POLICY "Validations are viewable by everyone" ON public.validations FOR SELECT USING (true);
CREATE POLICY "Authenticated users can validate" ON public.validations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 10. Clip Flags Table (Dispute Resolution)
CREATE TABLE IF NOT EXISTS public.clip_flags (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "voice_clip_id" UUID NOT NULL,
    "flagged_by" TEXT NOT NULL, -- user_id who flagged
    "reason" TEXT NOT NULL, -- 'unclear_audio', 'dialect_dispute', 'inappropriate_content', 'other'
    "additional_notes" TEXT,
    "status" TEXT DEFAULT 'pending', -- 'pending', 'reviewed', 'resolved', 'dismissed'
    "resolved_by" TEXT, -- admin user_id
    "resolution" TEXT, -- admin's decision
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "resolved_at" TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.clip_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Clip flags are viewable by flaggers and admins" ON public.clip_flags FOR SELECT USING (auth.uid()::text = flagged_by);
CREATE POLICY "Authenticated users can flag clips" ON public.clip_flags FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- 11. Withdrawals Table
CREATE TABLE IF NOT EXISTS public.withdrawals (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10, 2) NOT NULL,
    "bank_code" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "account_name" TEXT NOT NULL,
    "status" TEXT DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
    "reference" TEXT UNIQUE, -- Paystack transfer reference
    "failure_reason" TEXT,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
    "completed_at" TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid()::text = user_id);
CREATE POLICY "Users can request withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid()::text = user_id);

-- 12. Notification Logs Table
CREATE TABLE IF NOT EXISTS public.notification_logs (
    "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "user_id" TEXT NOT NULL,
    "expo_push_token" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "category" TEXT, -- 'alert', 'social', 'reward'
    "status" TEXT DEFAULT 'pending', -- 'pending', 'sent', 'delivered', 'failed'
    "ticket_id" TEXT, -- Expo push ticket ID
    "receipt_id" TEXT, -- Expo receipt ID
    "error_message" TEXT,
    "sent_at" TIMESTAMP WITH TIME ZONE,
    "delivered_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add expo_push_token to profiles if not exists
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expo_push_token TEXT;
