-- Default badges for LinguaLink
-- Run this after creating the badges table

INSERT INTO badges (name, description, image_url, category, tier, requirement_type, requirement_value) VALUES
-- Content Creator Badges
('First Steps', 'Recorded your first approved voice clip', 'https://example.com/badges/first-steps.png', 'contributor', 'bronze', 'clips_approved', 1),
('Content Creator Bronze', 'Had 10 voice clips approved by the community', 'https://example.com/badges/content-creator-bronze.png', 'contributor', 'bronze', 'clips_approved', 10),
('Content Creator Silver', 'Had 50 voice clips approved by the community', 'https://example.com/badges/content-creator-silver.png', 'contributor', 'silver', 'clips_approved', 50),
('Content Creator Gold', 'Had 100 voice clips approved by the community', 'https://example.com/badges/content-creator-gold.png', 'contributor', 'gold', 'clips_approved', 100),

-- Validator Badges
('Validator Bronze', 'Validated 100 voice clips', 'https://example.com/badges/validator-bronze.png', 'validator', 'bronze', 'validations_count', 100),
('Validator Silver', 'Validated 500 voice clips', 'https://example.com/badges/validator-silver.png', 'validator', 'silver', 'validations_count', 500),
('Validator Gold', 'Validated 1000 voice clips', 'https://example.com/badges/validator-gold.png', 'validator', 'gold', 'validations_count', 1000),

-- Streak Badges
('Week Warrior', 'Maintained a 7-day contribution streak', 'https://example.com/badges/week-warrior.png', 'game', 'bronze', 'streak_days', 7),
('Month Master', 'Maintained a 30-day contribution streak', 'https://example.com/badges/month-master.png', 'game', 'silver', 'streak_days', 30),
('Dedication Champion', 'Maintained a 100-day contribution streak', 'https://example.com/badges/dedication-champion.png', 'game', 'gold', 'streak_days', 100),

-- Social Badges
('Community Starter', 'Gained 10 followers', 'https://example.com/badges/community-starter.png', 'social', 'bronze', 'followers_count', 10),
('Rising Star', 'Gained 100 followers', 'https://example.com/badges/rising-star.png', 'social', 'silver', 'followers_count', 100),
('Language Leader', 'Gained 1000 followers', 'https://example.com/badges/language-leader.png', 'social', 'gold', 'followers_count', 1000)

ON CONFLICT (name) DO NOTHING;
